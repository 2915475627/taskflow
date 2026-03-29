package com.taskflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.entity.Tenant;
import com.taskflow.entity.Workflow;
import com.taskflow.entity.WorkflowRun;
import com.taskflow.entity.WorkflowRun.RunStatus;
import com.taskflow.entity.WorkflowStatus;
import com.taskflow.entity.WorkflowVersion;
import com.taskflow.executor.ExecutionContext;
import com.taskflow.executor.ExecutionResult;
import com.taskflow.executor.WorkflowExecutor;
import com.taskflow.model.NodeType;
import com.taskflow.model.WorkflowDefinition;
import com.taskflow.model.WorkflowDefinition.Edge;
import com.taskflow.model.WorkflowDefinition.Node;
import com.taskflow.model.WorkflowDefinition.Position;
import com.taskflow.repository.WorkflowRepository;
import com.taskflow.repository.WorkflowRunRepository;
import com.taskflow.repository.WorkflowVersionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ExecutionEngineService integration with WorkflowExecutor.
 * Verifies that the service correctly:
 * - Fetches workflow version definition
 * - Parses the JSON definition
 * - Delegates execution to WorkflowExecutor
 * - Stores execution results
 */
@ExtendWith(MockitoExtension.class)
class ExecutionEngineServiceIntegrationTest {

    @Mock
    private WorkflowRepository workflowRepository;

    @Mock
    private WorkflowRunRepository workflowRunRepository;

    @Mock
    private WorkflowVersionRepository workflowVersionRepository;

    @Mock
    private WebhookService webhookService;

    @Mock
    private WorkflowExecutor workflowExecutor;

    private ObjectMapper objectMapper;
    private ExecutionEngineService executionEngineService;

    private Tenant tenant;
    private Workflow workflow;
    private WorkflowRun run;
    private WorkflowVersion version;
    private WorkflowDefinition definition;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        executionEngineService = new ExecutionEngineService(
                workflowRepository,
                workflowRunRepository,
                workflowVersionRepository,
                webhookService,
                workflowExecutor,
                objectMapper
        );

        tenant = new Tenant();
        tenant.setId(1L);
        tenant.setName("Test Tenant");

        workflow = new Workflow();
        workflow.setId(100L);
        workflow.setTenant(tenant);
        workflow.setName("Test Workflow");
        workflow.setStatus(WorkflowStatus.PUBLISHED);
        workflow.setCurrentVersion(1);

        run = new WorkflowRun();
        run.setId(1L);
        run.setWorkflow(workflow);
        run.setWorkflowVersion(1);
        run.setExecutionId(UUID.randomUUID().toString());
        run.setTenant(tenant);
        run.setStatus(RunStatus.PENDING);
        run.setInputData("{\"key\": \"value\"}");
        run.setCreatedAt(Instant.now());

        // Create a simple workflow definition: Start -> Delay -> End
        Node startNode = new Node("start-1", NodeType.START, "Start", "Start node",
                Map.of("outputVariable", "input"), new Position(0, 0));
        Node delayNode = new Node("delay-1", NodeType.DELAY, "Wait", "Delay node",
                Map.of("duration", 1), new Position(0, 100));
        Node endNode = new Node("end-1", NodeType.END, "End", "End node",
                Map.of(), new Position(0, 200));

        Edge startToDelay = new Edge("e1", "start-1", "delay-1", "output", "input", null);
        Edge delayToEnd = new Edge("e2", "delay-1", "end-1", "output", "input", null);

        definition = new WorkflowDefinition(
                List.of(startNode, delayNode, endNode),
                List.of(startToDelay, delayToEnd)
        );
    }

    @Test
    void executeRun_shouldFetchVersionAndExecuteWorkflow() throws Exception {
        // Given
        String definitionJson = objectMapper.writeValueAsString(definition);

        version = new WorkflowVersion(workflow, 1, definitionJson);
        version.setId(1L);

        when(workflowRunRepository.findById(1L)).thenReturn(Optional.of(run));
        when(workflowRunRepository.save(any(WorkflowRun.class))).thenAnswer(inv -> inv.getArgument(0));
        when(workflowVersionRepository.findByWorkflowIdAndVersion(100L, 1, 1L))
                .thenReturn(Optional.of(version));

        Map<String, ExecutionResult> executorResults = Map.of(
                "start-1", ExecutionResult.success("start-1", Map.of("output", "data")),
                "delay-1", ExecutionResult.success("delay-1", Map.of("delayed", true)),
                "end-1", ExecutionResult.success("end-1", null)
        );
        when(workflowExecutor.execute(any(WorkflowDefinition.class), any(ExecutionContext.class)))
                .thenReturn(executorResults);

        // When
        WorkflowRun result = executionEngineService.executeRun(1L);

        // Then
        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertNotNull(result.getOutputData());
        assertNotNull(result.getFinishedAt());

        // Verify workflow version was fetched
        verify(workflowVersionRepository).findByWorkflowIdAndVersion(100L, 1, 1L);

        // Verify WorkflowExecutor was called with correct context
        ArgumentCaptor<ExecutionContext> contextCaptor = ArgumentCaptor.forClass(ExecutionContext.class);
        verify(workflowExecutor).execute(any(WorkflowDefinition.class), contextCaptor.capture());
        ExecutionContext capturedContext = contextCaptor.getValue();
        assertEquals(run.getExecutionId(), capturedContext.getExecutionId());
        assertEquals(run.getId(), capturedContext.getRunId());

        // Verify webhook was notified
        verify(webhookService).notifyWebhook(result);
    }

    @Test
    void executeRun_shouldHandleWorkflowVersionNotFound() {
        // Given
        when(workflowRunRepository.findById(1L)).thenReturn(Optional.of(run));
        when(workflowRunRepository.save(any(WorkflowRun.class))).thenAnswer(inv -> inv.getArgument(0));
        when(workflowVersionRepository.findByWorkflowIdAndVersion(100L, 1, 1L))
                .thenReturn(Optional.empty());

        // When/Then
        assertThrows(IllegalStateException.class, () -> executionEngineService.executeRun(1L));
    }

    @Test
    void executeRun_shouldHandleInvalidJsonDefinition() {
        // Given
        version = new WorkflowVersion(workflow, 1, "{ invalid json }");
        version.setId(1L);

        when(workflowRunRepository.findById(1L)).thenReturn(Optional.of(run));
        when(workflowRunRepository.save(any(WorkflowRun.class))).thenAnswer(inv -> inv.getArgument(0));
        when(workflowVersionRepository.findByWorkflowIdAndVersion(100L, 1, 1L))
                .thenReturn(Optional.of(version));

        // When/Then
        assertThrows(IllegalStateException.class, () -> executionEngineService.executeRun(1L));
    }

    @Test
    void executeRun_shouldHandleExecutorFailure() throws Exception {
        // Given
        String definitionJson = objectMapper.writeValueAsString(definition);

        version = new WorkflowVersion(workflow, 1, definitionJson);
        version.setId(1L);

        when(workflowRunRepository.findById(1L)).thenReturn(Optional.of(run));
        when(workflowRunRepository.save(any(WorkflowRun.class))).thenAnswer(inv -> inv.getArgument(0));
        when(workflowVersionRepository.findByWorkflowIdAndVersion(100L, 1, 1L))
                .thenReturn(Optional.of(version));

        RuntimeExecutorException executorException = new RuntimeExecutorException("Executor failed");
        when(workflowExecutor.execute(any(WorkflowDefinition.class), any(ExecutionContext.class)))
                .thenThrow(executorException);

        // When/Then
        assertThrows(RuntimeExecutorException.class, () -> executionEngineService.executeRun(1L));

        // Verify run was marked as failed
        ArgumentCaptor<WorkflowRun> runCaptor = ArgumentCaptor.forClass(WorkflowRun.class);
        verify(workflowRunRepository, atLeast(2)).save(runCaptor.capture());
        WorkflowRun failedRun = runCaptor.getAllValues().get(runCaptor.getAllValues().size() - 1);
        assertEquals(RunStatus.FAILED, failedRun.getStatus());
        assertEquals("Executor failed", failedRun.getErrorMessage());
    }

    @Test
    void executeRun_shouldNotifyWebhookOnFailure() throws Exception {
        // Given
        String definitionJson = objectMapper.writeValueAsString(definition);

        version = new WorkflowVersion(workflow, 1, definitionJson);
        version.setId(1L);

        when(workflowRunRepository.findById(1L)).thenReturn(Optional.of(run));
        when(workflowRunRepository.save(any(WorkflowRun.class))).thenAnswer(inv -> inv.getArgument(0));
        when(workflowVersionRepository.findByWorkflowIdAndVersion(100L, 1, 1L))
                .thenReturn(Optional.of(version));

        when(workflowExecutor.execute(any(WorkflowDefinition.class), any(ExecutionContext.class)))
                .thenThrow(new RuntimeExecutorException("Executor failed"));

        // When
        try {
            executionEngineService.executeRun(1L);
        } catch (RuntimeExecutorException ignored) {
        }

        // Then - webhook should be notified even on failure
        verify(webhookService, times(1)).notifyWebhook(any(WorkflowRun.class));
    }

    @Test
    void getRunStatus_shouldReturnCurrentStatus() {
        // Given
        when(workflowRunRepository.findById(1L)).thenReturn(Optional.of(run));

        // When
        RunStatus status = executionEngineService.getRunStatus(1L);

        // Then
        assertEquals(RunStatus.PENDING, status);
    }

    // Helper exception class for testing
    private static class RuntimeExecutorException extends RuntimeException {
        RuntimeExecutorException(String message) {
            super(message);
        }
    }
}
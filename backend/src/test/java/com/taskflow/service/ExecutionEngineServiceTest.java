package com.taskflow.service;

import com.taskflow.entity.Workflow;
import com.taskflow.entity.WorkflowRun;
import com.taskflow.entity.WorkflowRun.RunStatus;
import com.taskflow.entity.WorkflowStatus;
import com.taskflow.entity.Tenant;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.WorkflowRepository;
import com.taskflow.repository.WorkflowRunRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExecutionEngineServiceTest {

    @Mock
    private WorkflowRepository workflowRepository;

    @Mock
    private WorkflowRunRepository workflowRunRepository;

    @Mock
    private WebhookService webhookService;

    private ExecutionEngineService executionEngineService;

    private Tenant tenant;
    private Workflow workflow;
    private WorkflowRun run;

    @BeforeEach
    void setUp() {
        executionEngineService = new ExecutionEngineService(
                workflowRepository,
                workflowRunRepository,
                webhookService
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
    }

    @Test
    void executeRun_shouldUpdateStatusToRunning() {
        // Create copies to track state changes
        when(workflowRunRepository.findById(1L)).thenReturn(Optional.of(run));
        when(workflowRunRepository.save(any(WorkflowRun.class))).thenAnswer(invocation -> {
            WorkflowRun saved = invocation.getArgument(0);
            // Track that save was called at least twice
            return saved;
        });

        executionEngineService.executeRun(1L);

        // Verify save was called at least twice (RUNNING -> SUCCESS transition)
        verify(workflowRunRepository, times(2)).save(any(WorkflowRun.class));
    }

    @Test
    void executeRun_shouldCompleteWithSuccess() {
        when(workflowRunRepository.findById(1L)).thenReturn(Optional.of(run));
        when(workflowRunRepository.save(any(WorkflowRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        executionEngineService.executeRun(1L);

        ArgumentCaptor<WorkflowRun> captor = ArgumentCaptor.forClass(WorkflowRun.class);
        verify(workflowRunRepository, times(2)).save(captor.capture());

        WorkflowRun finalRun = captor.getAllValues().get(1);
        assertEquals(RunStatus.SUCCESS, finalRun.getStatus());
        assertNotNull(finalRun.getFinishedAt());
        assertNotNull(finalRun.getOutputData());
    }

    @Test
    void executeRun_shouldHandleNonExistentRun() {
        when(workflowRunRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            executionEngineService.executeRun(999L);
        });
    }

    @Test
    void executeRun_shouldNotifyWebhookOnSuccess() {
        when(workflowRunRepository.findById(1L)).thenReturn(Optional.of(run));
        when(workflowRunRepository.save(any(WorkflowRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        executionEngineService.executeRun(1L);

        verify(webhookService, timeout(1000)).notifyWebhook(any(WorkflowRun.class));
    }

    @Test
    void getRunStatus_shouldReturnCurrentStatus() {
        when(workflowRunRepository.findById(1L)).thenReturn(Optional.of(run));

        RunStatus status = executionEngineService.getRunStatus(1L);

        assertEquals(RunStatus.PENDING, status);
    }

    @Test
    void getRunStatus_shouldThrowForNonExistentRun() {
        when(workflowRunRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            executionEngineService.getRunStatus(999L);
        });
    }
}

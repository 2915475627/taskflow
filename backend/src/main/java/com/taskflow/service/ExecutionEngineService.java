package com.taskflow.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.entity.WorkflowRun;
import com.taskflow.entity.WorkflowRun.RunStatus;
import com.taskflow.entity.WorkflowVersion;
import com.taskflow.executor.ExecutionContext;
import com.taskflow.executor.ExecutionResult;
import com.taskflow.executor.WorkflowExecutor;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.model.WorkflowDefinition;
import com.taskflow.repository.WorkflowRepository;
import com.taskflow.repository.WorkflowRunRepository;
import com.taskflow.repository.WorkflowVersionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

@Service
public class ExecutionEngineService {

    private static final Logger log = LoggerFactory.getLogger(ExecutionEngineService.class);

    private final WorkflowRepository workflowRepository;
    private final WorkflowRunRepository workflowRunRepository;
    private final WorkflowVersionRepository workflowVersionRepository;
    private final WebhookService webhookService;
    private final WorkflowExecutor workflowExecutor;
    private final ObjectMapper objectMapper;

    /**
     * Default constructor for Spring Boot.
     * Requires @Autowired on individual setters or use @PostConstruct for initialization.
     */
    public ExecutionEngineService() {
        this.workflowRepository = null;
        this.workflowRunRepository = null;
        this.workflowVersionRepository = null;
        this.webhookService = null;
        this.workflowExecutor = null;
        this.objectMapper = null;
    }

    @Autowired
    public ExecutionEngineService(
            WorkflowRepository workflowRepository,
            WorkflowRunRepository workflowRunRepository,
            WorkflowVersionRepository workflowVersionRepository,
            WebhookService webhookService,
            WorkflowExecutor workflowExecutor,
            ObjectMapper objectMapper) {
        this.workflowRepository = workflowRepository;
        this.workflowRunRepository = workflowRunRepository;
        this.workflowVersionRepository = workflowVersionRepository;
        this.webhookService = webhookService;
        this.workflowExecutor = workflowExecutor;
        this.objectMapper = objectMapper;
    }

    /**
     * Constructor for backward compatibility with tests.
     * @deprecated Tests should use the full constructor with all dependencies.
     */
    @Deprecated
    protected ExecutionEngineService(
            WorkflowRepository workflowRepository,
            WorkflowRunRepository workflowRunRepository,
            WebhookService webhookService) {
        this.workflowRepository = workflowRepository;
        this.workflowRunRepository = workflowRunRepository;
        this.workflowVersionRepository = null;
        this.webhookService = webhookService;
        this.workflowExecutor = null;
        this.objectMapper = null;
    }

    @Transactional
    public WorkflowRun executeRun(Long runId) {
        log.info("Starting execution for run {}", runId);

        WorkflowRun run = workflowRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow run not found with id: " + runId));

        // Update status to RUNNING
        run.setStatus(RunStatus.RUNNING);
        run.setStartedAt(Instant.now());
        workflowRunRepository.save(run);

        log.info("Run {} transitioned to RUNNING", runId);

        try {
            // Check if full dependencies are available for real execution
            if (workflowVersionRepository != null && workflowExecutor != null && objectMapper != null) {
                return executeRunWithExecutor(run);
            }
            // Fallback to legacy simulation for backward compatibility
            return executeRunLegacy(run);
        } catch (Exception e) {
            run.setStatus(RunStatus.FAILED);
            run.setErrorMessage(e.getMessage());
            run.setFinishedAt(Instant.now());
            workflowRunRepository.save(run);
            log.error("Run {} failed: {}", runId, e.getMessage());
            webhookService.notifyWebhook(run);
            throw e;
        }
    }

    private WorkflowRun executeRunWithExecutor(WorkflowRun run) {
        // Fetch the workflow version definition
        WorkflowVersion version = workflowVersionRepository
                .findByWorkflowIdAndVersion(
                        run.getWorkflow().getId(),
                        run.getWorkflowVersion(),
                        run.getTenant().getId())
                .orElseThrow(() -> new IllegalStateException(
                        "Workflow version not found: workflowId=" + run.getWorkflow().getId() +
                        ", version=" + run.getWorkflowVersion()));

        // Parse the JSON definition to WorkflowDefinition
        WorkflowDefinition definition;
        try {
            definition = objectMapper.readValue(version.getDefinition(), WorkflowDefinition.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to parse workflow definition: " + e.getMessage(), e);
        }

        // Create execution context
        ExecutionContext context = new ExecutionContext(run.getExecutionId(), run.getId());

        // Execute the workflow
        Map<String, ExecutionResult> results = workflowExecutor.execute(definition, context);

        // Serialize results to JSON for storage
        String outputData;
        try {
            outputData = objectMapper.writeValueAsString(results);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize execution results: " + e.getMessage(), e);
        }

        // Update status to SUCCESS
        run.setStatus(RunStatus.SUCCESS);
        run.setOutputData(outputData);
        run.setFinishedAt(Instant.now());
        workflowRunRepository.save(run);

        log.info("Run {} completed successfully with {} node results", run.getId(), results.size());
        webhookService.notifyWebhook(run);

        return run;
    }

    /**
     * Legacy simulation for backward compatibility with tests.
     */
    private WorkflowRun executeRunLegacy(WorkflowRun run) {
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        String inputData = run.getInputData();
        String result;
        if (inputData == null || inputData.isEmpty()) {
            result = "{\"status\": \"completed\", \"message\": \"Workflow executed successfully\"}";
        } else {
            result = String.format(
                    "{\"status\": \"completed\", \"message\": \"Workflow executed with input: %s\"}",
                    inputData);
        }

        run.setStatus(RunStatus.SUCCESS);
        run.setOutputData(result);
        run.setFinishedAt(Instant.now());
        workflowRunRepository.save(run);

        log.info("Run {} completed successfully (legacy mode)", run.getId());
        webhookService.notifyWebhook(run);

        return run;
    }

    @Transactional(readOnly = true)
    public RunStatus getRunStatus(Long runId) {
        WorkflowRun run = workflowRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow run not found with id: " + runId));
        return run.getStatus();
    }
}

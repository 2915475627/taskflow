package com.taskflow.service;

import com.taskflow.entity.WorkflowRun;
import com.taskflow.entity.WorkflowRun.RunStatus;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.WorkflowRepository;
import com.taskflow.repository.WorkflowRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class ExecutionEngineService {

    private static final Logger log = LoggerFactory.getLogger(ExecutionEngineService.class);

    private final WorkflowRepository workflowRepository;
    private final WorkflowRunRepository workflowRunRepository;
    private final WebhookService webhookService;

    public ExecutionEngineService(
            WorkflowRepository workflowRepository,
            WorkflowRunRepository workflowRunRepository,
            WebhookService webhookService) {
        this.workflowRepository = workflowRepository;
        this.workflowRunRepository = workflowRunRepository;
        this.webhookService = webhookService;
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
            // Simulate workflow execution
            // In a real implementation, this would parse the workflow definition
            // and execute each node/step
            String result = simulateExecution(run);

            // Update status to SUCCESS
            run.setStatus(RunStatus.SUCCESS);
            run.setOutputData(result);
            run.setFinishedAt(Instant.now());
            workflowRunRepository.save(run);

            log.info("Run {} completed successfully", runId);

            // Notify webhooks
            webhookService.notifyWebhook(run);

            return run;

        } catch (Exception e) {
            // Update status to FAILED
            run.setStatus(RunStatus.FAILED);
            run.setErrorMessage(e.getMessage());
            run.setFinishedAt(Instant.now());
            workflowRunRepository.save(run);

            log.error("Run {} failed: {}", runId, e.getMessage());

            // Notify webhooks
            webhookService.notifyWebhook(run);

            throw e;
        }
    }

    @Transactional(readOnly = true)
    public RunStatus getRunStatus(Long runId) {
        WorkflowRun run = workflowRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow run not found with id: " + runId));
        return run.getStatus();
    }

    private String simulateExecution(WorkflowRun run) {
        // Simulate some processing time
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Build mock output based on input
        String inputData = run.getInputData();
        if (inputData == null || inputData.isEmpty()) {
            return "{\"status\": \"completed\", \"message\": \"Workflow executed successfully\"}";
        }

        return String.format(
                "{\"status\": \"completed\", \"message\": \"Workflow executed with input: %s\"}",
                inputData
        );
    }
}

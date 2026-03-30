package com.taskflow.controller;

import com.taskflow.dto.ApiResponse;
import com.taskflow.dto.WebhookCallbackRequest;
import com.taskflow.dto.WebhookConfigRequest;
import com.taskflow.dto.WebhookConfigResponse;
import com.taskflow.dto.WebhookTriggerRequest;
import com.taskflow.dto.WebhookTriggerResponse;
import com.taskflow.dto.ExecutionResponse;
import com.taskflow.entity.WorkflowRun.RunStatus;
import com.taskflow.security.TenantContext;
import com.taskflow.service.WebhookService;
import com.taskflow.service.WorkflowService;
import com.taskflow.repository.WorkflowRunRepository;
import com.taskflow.entity.WorkflowRun;
import com.taskflow.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final WebhookService webhookService;
    private final WorkflowService workflowService;
    private final WorkflowRunRepository workflowRunRepository;

    public WebhookController(
            WebhookService webhookService,
            WorkflowService workflowService,
            WorkflowRunRepository workflowRunRepository) {
        this.webhookService = webhookService;
        this.workflowService = workflowService;
        this.workflowRunRepository = workflowRunRepository;
    }

    // Webhook callback endpoint for external services to report execution results
    @PostMapping("/webhooks/callback")
    public ResponseEntity<ApiResponse<Void>> handleWebhookCallback(
            @RequestBody WebhookCallbackRequest request,
            @RequestHeader(value = "X-Webhook-Signature", required = false) String signature) {

        log.info("Received webhook callback for execution {}", request.executionId());

        WorkflowRun run = workflowRunRepository.findByExecutionId(request.executionId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Workflow run not found with executionId: " + request.executionId()));

        // Validate signature if provided
        // In production, you would verify the signature matches

        // Update run with callback data
        if (request.status() != null) {
            try {
                RunStatus status = RunStatus.valueOf(request.status().toUpperCase());
                run.setStatus(status);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status in webhook callback: {}", request.status());
            }
        }

        if (request.outputData() != null) {
            run.setOutputData(request.outputData());
        }

        if (request.errorMessage() != null) {
            run.setErrorMessage(request.errorMessage());
        }

        if (RunStatus.SUCCESS.name().equals(request.status()) ||
                RunStatus.FAILED.name().equals(request.status())) {
            run.setFinishedAt(Instant.now());
        }

        workflowRunRepository.save(run);

        log.info("Webhook callback processed for execution {}", request.executionId());

        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Configure webhook for a workflow
    @PostMapping("/workflows/{id}/webhooks")
    public ResponseEntity<ApiResponse<WebhookConfigResponse>> configureWebhook(
            @PathVariable Long id,
            @Valid @RequestBody WebhookConfigRequest request) {

        Long tenantId = TenantContext.getCurrentTenantId();
        log.info("Configuring webhook for workflow {} tenant {}", id, tenantId);

        WebhookConfigResponse config = workflowService.configureWebhook(id, request.callbackUrl(), request.secret());

        return ResponseEntity.ok(ApiResponse.success(config));
    }

    // Get webhook configuration for a workflow
    @GetMapping("/workflows/{id}/webhooks")
    public ResponseEntity<ApiResponse<WebhookConfigResponse>> getWebhookConfig(@PathVariable Long id) {
        Long tenantId = TenantContext.getCurrentTenantId();
        log.debug("Getting webhook config for workflow {} tenant {}", id, tenantId);

        WebhookConfigResponse config = workflowService.getWebhookConfig(id);

        return ResponseEntity.ok(ApiResponse.success(config));
    }

    // Trigger workflow execution via webhook
    @PostMapping("/webhooks/trigger/{workflowId}")
    public ResponseEntity<ApiResponse<WebhookTriggerResponse>> triggerWorkflow(
            @PathVariable Long workflowId,
            @RequestHeader("X-Webhook-Secret") String secret,
            @RequestBody WebhookTriggerRequest request) {

        log.info("Received webhook trigger for workflow {}", workflowId);

        ExecutionResponse response = workflowService.triggerWorkflowViaWebhook(
                workflowId, secret, request.inputData());

        WebhookTriggerResponse triggerResponse = new WebhookTriggerResponse(
                response.runId(),
                response.executionId(),
                response.status().name(),
                response.message()
        );

        return ResponseEntity.ok(ApiResponse.success(triggerResponse));
    }

    // Delete webhook configuration
    @DeleteMapping("/workflows/{id}/webhooks")
    public ResponseEntity<Void> deleteWebhookConfig(@PathVariable Long id) {
        Long tenantId = TenantContext.getCurrentTenantId();
        log.info("Deleting webhook config for workflow {} tenant {}", id, tenantId);

        workflowService.deleteWebhookConfig(id);

        return ResponseEntity.noContent().build();
    }
}

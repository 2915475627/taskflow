package com.taskflow.service;

import com.taskflow.entity.WebhookConfig;
import com.taskflow.entity.WorkflowRun;
import com.taskflow.repository.WebhookConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class WebhookService {

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);

    private final WebhookConfigRepository webhookConfigRepository;
    private final RestTemplate restTemplate;

    public WebhookService(WebhookConfigRepository webhookConfigRepository) {
        this.webhookConfigRepository = webhookConfigRepository;
        this.restTemplate = new RestTemplate();
    }

    @Async
    public void notifyWebhook(WorkflowRun run) {
        List<WebhookConfig> configs = webhookConfigRepository
                .findByWorkflowIdAndEnabled(run.getWorkflow().getId(), true);

        if (configs.isEmpty()) {
            log.debug("No webhook configs enabled for workflow {}", run.getWorkflow().getId());
            return;
        }

        for (WebhookConfig config : configs) {
            try {
                sendWebhookNotification(config, run);
            } catch (Exception e) {
                log.error("Failed to send webhook notification to {}: {}",
                        config.getCallbackUrl(), e.getMessage());
            }
        }
    }

    private void sendWebhookNotification(WebhookConfig config, WorkflowRun run) {
        String payload = buildPayload(run);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Webhook-Secret", config.getSecret());
        headers.set("X-Execution-Id", run.getExecutionId());
        headers.set("X-Workflow-Id", String.valueOf(run.getWorkflow().getId()));

        String signature = computeSignature(payload, config.getSecret());
        headers.set("X-Webhook-Signature", signature);

        HttpEntity<String> request = new HttpEntity<>(payload, headers);

        log.info("Sending webhook to {} for execution {}", config.getCallbackUrl(), run.getExecutionId());
        restTemplate.postForEntity(config.getCallbackUrl(), request, String.class);

        log.info("Webhook sent successfully to {}", config.getCallbackUrl());
    }

    private String buildPayload(WorkflowRun run) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("executionId", run.getExecutionId());
        payload.put("workflowId", run.getWorkflow().getId());
        payload.put("workflowVersion", run.getWorkflowVersion());
        payload.put("status", run.getStatus().name());
        payload.put("inputData", run.getInputData());
        payload.put("outputData", run.getOutputData());
        payload.put("errorMessage", run.getErrorMessage());
        payload.put("startedAt", run.getStartedAt() != null ? run.getStartedAt().toString() : null);
        payload.put("finishedAt", run.getFinishedAt() != null ? run.getFinishedAt().toString() : null);
        payload.put("timestamp", Instant.now().toString());

        return new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(payload).toString();
    }

    private String computeSignature(String payload, String secret) {
        try {
            String data = payload + secret;
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            log.warn("Failed to compute webhook signature", e);
            return "";
        }
    }
}

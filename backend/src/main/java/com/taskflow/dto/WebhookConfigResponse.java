package com.taskflow.dto;

import com.taskflow.entity.WebhookConfig;

import java.time.Instant;

public record WebhookConfigResponse(
        Long id,
        Long workflowId,
        String callbackUrl,
        boolean enabled,
        Instant createdAt
) {
    public static WebhookConfigResponse from(WebhookConfig entity) {
        return new WebhookConfigResponse(
                entity.getId(),
                entity.getWorkflow().getId(),
                entity.getCallbackUrl(),
                entity.isEnabled(),
                entity.getCreatedAt()
        );
    }
}

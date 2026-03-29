package com.taskflow.dto;

public record WebhookConfigRequest(
        String callbackUrl,
        String secret
) {}

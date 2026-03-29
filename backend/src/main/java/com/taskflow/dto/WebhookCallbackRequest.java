package com.taskflow.dto;

public record WebhookCallbackRequest(
        String executionId,
        String status,
        String outputData,
        String errorMessage
) {}

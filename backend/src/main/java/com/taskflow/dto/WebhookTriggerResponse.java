package com.taskflow.dto;

/**
 * Response for webhook-triggered workflow execution.
 */
public record WebhookTriggerResponse(
    Long runId,
    String executionId,
    String status,
    String message
) {}
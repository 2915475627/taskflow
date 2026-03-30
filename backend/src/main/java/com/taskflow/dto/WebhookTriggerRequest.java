package com.taskflow.dto;

/**
 * Request payload for webhook-triggered workflow execution.
 */
public record WebhookTriggerRequest(
    String inputData
) {}
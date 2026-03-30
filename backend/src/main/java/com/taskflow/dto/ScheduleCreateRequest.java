package com.taskflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request to create a new workflow schedule.
 */
public record ScheduleCreateRequest(
    @NotBlank(message = "Cron expression is required")
    String cronExpression,

    String timezone,

    String description,

    String inputData
) {
    public ScheduleCreateRequest {
        if (timezone == null || timezone.isBlank()) {
            timezone = "UTC";
        }
    }
}
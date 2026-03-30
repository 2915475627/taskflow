package com.taskflow.dto;

import com.taskflow.entity.WorkflowSchedule;

import java.time.Instant;

/**
 * Response for workflow schedule.
 */
public record ScheduleResponse(
    Long id,
    Long workflowId,
    String workflowName,
    String cronExpression,
    String timezone,
    boolean enabled,
    String description,
    String inputData,
    Instant lastTriggeredAt,
    Instant createdAt
) {
    public static ScheduleResponse from(WorkflowSchedule schedule) {
        return new ScheduleResponse(
            schedule.getId(),
            schedule.getWorkflow().getId(),
            schedule.getWorkflow().getName(),
            schedule.getCronExpression(),
            schedule.getTimezone(),
            schedule.isEnabled(),
            schedule.getDescription(),
            schedule.getInputData(),
            schedule.getLastTriggeredAt(),
            schedule.getCreatedAt()
        );
    }
}
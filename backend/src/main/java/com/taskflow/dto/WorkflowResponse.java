package com.taskflow.dto;

import com.taskflow.entity.Workflow;
import com.taskflow.entity.WorkflowStatus;

import java.time.Instant;

public record WorkflowResponse(
        Long id,
        Long tenantId,
        String name,
        String description,
        WorkflowStatus status,
        Integer currentVersion,
        Instant createdAt,
        Instant updatedAt
) {
    public static WorkflowResponse from(Workflow workflow) {
        return new WorkflowResponse(
                workflow.getId(),
                workflow.getTenant().getId(),
                workflow.getName(),
                workflow.getDescription(),
                workflow.getStatus(),
                workflow.getCurrentVersion(),
                workflow.getCreatedAt(),
                workflow.getUpdatedAt()
        );
    }
}

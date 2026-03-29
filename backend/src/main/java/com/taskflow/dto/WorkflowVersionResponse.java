package com.taskflow.dto;

import com.taskflow.entity.WorkflowVersion;

import java.time.Instant;

public record WorkflowVersionResponse(
        Long id,
        Long workflowId,
        Integer version,
        String definition,
        Instant createdAt
) {
    public static WorkflowVersionResponse from(WorkflowVersion entity) {
        return new WorkflowVersionResponse(
                entity.getId(),
                entity.getWorkflow().getId(),
                entity.getVersion(),
                entity.getDefinition(),
                entity.getCreatedAt()
        );
    }
}

package com.taskflow.dto;

import com.taskflow.entity.WorkflowRun;
import com.taskflow.entity.WorkflowRun.RunStatus;

import java.time.Instant;

public record WorkflowRunResponse(
        Long id,
        Long workflowId,
        Integer workflowVersion,
        String executionId,
        RunStatus status,
        String inputData,
        String outputData,
        String errorMessage,
        Instant startedAt,
        Instant finishedAt,
        Instant createdAt
) {
    public static WorkflowRunResponse from(WorkflowRun entity) {
        return new WorkflowRunResponse(
                entity.getId(),
                entity.getWorkflow().getId(),
                entity.getWorkflowVersion(),
                entity.getExecutionId(),
                entity.getStatus(),
                entity.getInputData(),
                entity.getOutputData(),
                entity.getErrorMessage(),
                entity.getStartedAt(),
                entity.getFinishedAt(),
                entity.getCreatedAt()
        );
    }
}

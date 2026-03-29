package com.taskflow.dto;

import com.taskflow.entity.WorkflowRun.RunStatus;

public record ExecutionResponse(
        Long runId,
        String executionId,
        RunStatus status,
        String message
) {}

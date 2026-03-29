package com.taskflow.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.taskflow.entity.WorkflowStatus;
import com.taskflow.entity.WorkflowStatusDeserializer;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WorkflowRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 255, message = "Name must not exceed 255 characters")
        String name,

        @Size(max = 5000, message = "Description must not exceed 5000 characters")
        String description,

        @JsonDeserialize(using = WorkflowStatusDeserializer.class)
        WorkflowStatus status,

        String definition
) {
}

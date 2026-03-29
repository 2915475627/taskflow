package com.taskflow.entity;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;

public class WorkflowStatusDeserializer extends JsonDeserializer<WorkflowStatus> {
    @Override
    public WorkflowStatus deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        String value = parser.getValueAsString();
        if (value == null) return null;
        try {
            return WorkflowStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            // Handle lowercase values from frontend
            for (WorkflowStatus status : WorkflowStatus.values()) {
                if (status.name().equalsIgnoreCase(value)) {
                    return status;
                }
            }
            throw new IllegalArgumentException("Unknown workflow status: " + value);
        }
    }
}

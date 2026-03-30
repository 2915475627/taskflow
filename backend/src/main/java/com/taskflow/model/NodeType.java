package com.taskflow.model;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Built-in node types for workflow builder.
 *
 * Each node type includes:
 * - value: the string identifier used in JSON definition
 * - description: human-readable documentation for developers
 */
public enum NodeType {
    START("start", "Workflow entry point. No input handles - this is where execution begins."),
    END("end", "Workflow exit point. Marks successful completion of a workflow branch."),
    HTTP_REQUEST("httpRequest", "Make HTTP calls with configurable method, URL, headers, and body."),
    MCP_CALL("mcpCall", "Call MCP (Model Context Protocol) tools with server name, tool name, and arguments."),
    CONDITION("condition", "Branch workflow based on conditions. Evaluates field comparisons with AND/OR logic."),
    TRANSFORM("transform", "Transform data using expressions. Maps input fields to output using expression templates."),
    DELAY("delay", "Pause execution for a specified duration before continuing to the next node.");

    private final String value;
    private final String description;

    NodeType(String value, String description) {
        this.value = value;
        this.description = description;
    }

    @JsonValue
    public String getValue() { return value; }
    public String getDescription() { return description; }

    public static NodeType fromValue(String value) {
        for (NodeType type : values()) {
            if (type.value.equals(value)) return type;
        }
        throw new IllegalArgumentException("Unknown node type: " + value);
    }
}

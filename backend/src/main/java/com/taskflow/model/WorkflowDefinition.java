package com.taskflow.model;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.List;
import java.util.Map;

/**
 * Represents the structure of a workflow graph.
 *
 * A workflow consists of nodes (steps) and edges (connections between steps).
 * Each node has a type, configuration, and position for visual display.
 */
public record WorkflowDefinition(
    List<Node> nodes,
    List<Edge> edges
) {
    /**
     * A node in the workflow graph.
     */
    public record Node(
        String id,
        @JsonDeserialize(using = NodeTypeDeserializer.class)
        NodeType type,
        String name,
        String description,
        Object config,
        Position position
    ) {}

    /**
     * An edge connecting two nodes.
     */
    public record Edge(
        String id,
        String source,
        String target,
        String sourceHandle,
        String targetHandle,
        String label
    ) {}

    /**
     * Position in the workflow canvas.
     */
    public record Position(double x, double y) {}
}

package com.taskflow.executor;

import com.taskflow.model.NodeType;
import java.util.Map;

/**
 * Interface for executing a specific node type.
 *
 * Each node type has a dedicated executor that:
 * 1. Parses the node configuration
 * 2. Executes the node logic
 * 3. Returns the result to be passed to subsequent nodes
 */
public interface NodeExecutor {
    /**
     * @return The node type this executor handles
     */
    NodeType getSupportedType();

    /**
     * Execute the node.
     *
     * @param nodeId ID of the node being executed
     * @param config Node-specific configuration (typically a Map from JSON)
     * @param inputData Data from previous nodes (keyed by source handle or "default")
     * @param context Execution context with variables
     * @return Execution result with output data
     */
    ExecutionResult execute(String nodeId, Object config, Map<String, Object> inputData, ExecutionContext context);
}

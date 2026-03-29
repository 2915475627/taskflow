package com.taskflow.executor;

import com.taskflow.model.NodeType;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Executes Start nodes.
 *
 * Start nodes are entry points with no input handles.
 * They store workflow input data to a variable for use by subsequent nodes.
 */
@Component
public class StartNodeExecutor implements NodeExecutor {

    @Override
    public NodeType getSupportedType() {
        return NodeType.START;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ExecutionResult execute(String nodeId, Object config, Map<String, Object> inputData, ExecutionContext context) {
        Map<String, Object> cfg = (Map<String, Object>) config;
        String outputVariable = (String) cfg.getOrDefault("outputVariable", "input");

        // Store input data to context variable
        context.setVariable(outputVariable, inputData);

        return ExecutionResult.success(nodeId, inputData);
    }
}

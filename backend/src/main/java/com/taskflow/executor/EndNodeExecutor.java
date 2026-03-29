package com.taskflow.executor;

import com.taskflow.model.NodeType;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Executes End nodes.
 *
 * End nodes mark the completion of a workflow branch.
 * They simply pass through the input data as output.
 */
@Component
public class EndNodeExecutor implements NodeExecutor {

    @Override
    public NodeType getSupportedType() {
        return NodeType.END;
    }

    @Override
    public ExecutionResult execute(String nodeId, Object config, Map<String, Object> inputData, ExecutionContext context) {
        // End nodes just pass through the data
        return ExecutionResult.success(nodeId, inputData);
    }
}

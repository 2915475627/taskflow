package com.taskflow.executor;

import org.springframework.stereotype.Service;

import com.taskflow.model.NodeType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Executes Delay nodes.
 *
 * Pauses workflow execution for a specified duration before
 * continuing to the next node.
 *
 * Example config:
 * {
 *   "duration": 5000  // milliseconds
 * }
 */
@Component
@Service
public class DelayNodeExecutor implements NodeExecutor {

    private static final Logger log = LoggerFactory.getLogger(DelayNodeExecutor.class);

    @Override
    public NodeType getSupportedType() {
        return NodeType.DELAY;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ExecutionResult execute(String nodeId, Object config, Map<String, Object> inputData, ExecutionContext context) {
        try {
            Map<String, Object> cfg = (Map<String, Object>) config;
            Integer duration = (Integer) cfg.getOrDefault("duration", 1000);

            log.info("Delay node {} pausing for {} ms", nodeId, duration);

            Thread.sleep(duration);

            return ExecutionResult.success(nodeId, Map.of("delayedMs", duration));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return ExecutionResult.failure(nodeId, "Delay interrupted");
        } catch (Exception e) {
            log.error("Delay failed for node {}: {}", nodeId, e.getMessage());
            return ExecutionResult.failure(nodeId, e.getMessage());
        }
    }
}

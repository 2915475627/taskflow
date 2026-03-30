package com.taskflow.executor;

import com.taskflow.model.NodeType;
import com.taskflow.service.ExpressionEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Executes Log nodes.
 *
 * Logs messages for debugging purposes during workflow execution.
 * Supports expression evaluation in messages.
 *
 * Example config:
 * {
 *   "message": "User ${input.name} logged in",
 *   "level": "INFO"
 * }
 */
@Component
public class LogNodeExecutor implements NodeExecutor {

    private static final Logger log = LoggerFactory.getLogger(LogNodeExecutor.class);

    private final ExpressionEngine expressionEngine;

    public LogNodeExecutor(ExpressionEngine expressionEngine) {
        this.expressionEngine = expressionEngine;
    }

    @Override
    public NodeType getSupportedType() {
        return NodeType.LOG;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ExecutionResult execute(String nodeId, Object config, Map<String, Object> inputData, ExecutionContext context) {
        try {
            Map<String, Object> cfg = (Map<String, Object>) config;

            String messageTemplate = (String) cfg.getOrDefault("message", "");
            String level = (String) cfg.getOrDefault("level", "INFO");

            // Validate level
            if (!isValidLevel(level)) {
                log.warn("Invalid log level '{}' for node {}, using INFO", level, nodeId);
                level = "INFO";
            }

            // Evaluate the message using expression engine
            var result = expressionEngine.evaluateTemplate(messageTemplate, inputData);
            String evaluatedMessage = result.success() && result.value() != null
                ? result.value().toString()
                : messageTemplate;

            // Log with appropriate logger level
            switch (level) {
                case "DEBUG" -> log.debug("{} [{}]: {}", nodeId, context.getExecutionId(), evaluatedMessage);
                case "WARN" -> log.warn("{} [{}]: {}", nodeId, context.getExecutionId(), evaluatedMessage);
                case "ERROR" -> log.error("{} [{}]: {}", nodeId, context.getExecutionId(), evaluatedMessage);
                default -> log.info("{} [{}]: {}", nodeId, context.getExecutionId(), evaluatedMessage);
            }

            // Return output with logged message details
            Map<String, Object> output = new HashMap<>();
            output.put("message", evaluatedMessage);
            output.put("level", level);
            output.put("nodeId", nodeId);

            return ExecutionResult.success(nodeId, output);
        } catch (Exception e) {
            log.error("Log node {} failed: {}", nodeId, e.getMessage());
            return ExecutionResult.failure(nodeId, e.getMessage());
        }
    }

    private boolean isValidLevel(String level) {
        return "DEBUG".equals(level) || "INFO".equals(level) ||
               "WARN".equals(level) || "ERROR".equals(level);
    }
}

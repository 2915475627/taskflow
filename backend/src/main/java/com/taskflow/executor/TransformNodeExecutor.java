package com.taskflow.executor;

import com.taskflow.model.NodeType;
import com.taskflow.service.ExpressionEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Executes Transform nodes.
 *
 * Transforms input data using expressions and outputs the result.
 * Supports field mapping with expression templates.
 *
 * Example config:
 * {
 *   "mappings": [
 *     {"outputField": "fullName", "expression": "${input.firstName} + ' ' + ${input.lastName}"},
 *     {"outputField": "isAdult", "expression": "${input.age} gt 18"},
 *     {"outputField": "greeting", "expression": "'Hello ' + ${input.name}"}
 *   ]
 * }
 */
@Component
public class TransformNodeExecutor implements NodeExecutor {

    private static final Logger log = LoggerFactory.getLogger(TransformNodeExecutor.class);

    private final ExpressionEngine expressionEngine;

    public TransformNodeExecutor(ExpressionEngine expressionEngine) {
        this.expressionEngine = expressionEngine;
    }

    @Override
    public NodeType getSupportedType() {
        return NodeType.TRANSFORM;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ExecutionResult execute(String nodeId, Object config, Map<String, Object> inputData, ExecutionContext context) {
        try {
            Map<String, Object> cfg = (Map<String, Object>) config;
            List<Map<String, Object>> mappings = (List<Map<String, Object>>) cfg.getOrDefault("mappings", List.of());

            log.info("Transforming {} mapping(s) for node {}", mappings.size(), nodeId);

            Map<String, Object> output = new HashMap<>();

            for (Map<String, Object> mapping : mappings) {
                String outputField = (String) mapping.getOrDefault("outputField", "");
                String expression = (String) mapping.getOrDefault("expression", "");

                if (outputField.isEmpty()) {
                    log.warn("Skipping mapping with empty outputField");
                    continue;
                }

                if (expression.isEmpty()) {
                    log.warn("Skipping mapping with empty expression for field: {}", outputField);
                    continue;
                }

                var result = expressionEngine.evaluate(expression, inputData);
                if (result.success()) {
                    output.put(outputField, result.value());
                    log.debug("Mapped {} = {}", outputField, result.value());
                } else {
                    log.warn("Expression failed for {}: {}", outputField, result.error());
                    // Store null or skip on failure - decide based on strict mode
                    output.put(outputField, null);
                }
            }

            log.info("Transform node {} completed with {} output fields", nodeId, output.size());

            return ExecutionResult.success(nodeId, output);
        } catch (Exception e) {
            log.error("Transform evaluation failed for node {}: {}", nodeId, e.getMessage());
            return ExecutionResult.failure(nodeId, e.getMessage());
        }
    }
}
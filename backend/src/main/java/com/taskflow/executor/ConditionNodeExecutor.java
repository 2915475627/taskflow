package com.taskflow.executor;

import com.taskflow.model.NodeType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Executes Condition nodes.
 *
 * Evaluates conditions against input data and determines which branch to take.
 * Supports AND/OR logic for multiple conditions.
 *
 * Example config:
 * {
 *   "conditions": [
 *     {"field": "data.status", "operator": "eq", "value": "active"},
 *     {"field": "data.count", "operator": "gt", "value": 0}
 *   ],
 *   "logic": "and"
 * }
 */
@Component
public class ConditionNodeExecutor implements NodeExecutor {

    private static final Logger log = LoggerFactory.getLogger(ConditionNodeExecutor.class);

    @Override
    public NodeType getSupportedType() {
        return NodeType.CONDITION;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ExecutionResult execute(String nodeId, Object config, Map<String, Object> inputData, ExecutionContext context) {
        try {
            Map<String, Object> cfg = (Map<String, Object>) config;
            List<Map<String, Object>> conditions = (List<Map<String, Object>>) cfg.getOrDefault("conditions", List.of());
            String logic = (String) cfg.getOrDefault("logic", "and");

            log.info("Evaluating {} condition(s) with {} logic for node {}",
                conditions.size(), logic, nodeId);

            boolean result = evaluateConditions(conditions, logic, inputData);
            String branch = result ? "true" : "false";

            log.info("Condition node {} evaluated to branch: {}", nodeId, branch);

            return ExecutionResult.success(nodeId, Map.of("result", result, "branch", branch), branch);
        } catch (Exception e) {
            log.error("Condition evaluation failed for node {}: {}", nodeId, e.getMessage());
            return ExecutionResult.failure(nodeId, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private boolean evaluateConditions(List<Map<String, Object>> conditions, String logic,
                                      Map<String, Object> inputData) {
        if (conditions.isEmpty()) return true;

        return conditions.stream()
            .map(condition -> evaluateSingleCondition(condition, inputData))
            .reduce((a, b) -> "or".equals(logic) ? a || b : a && b)
            .orElse(true);
    }

    @SuppressWarnings("unchecked")
    private boolean evaluateSingleCondition(Map<String, Object> condition, Map<String, Object> inputData) {
        String field = (String) condition.getOrDefault("field", "");
        String operator = (String) condition.getOrDefault("operator", "eq");
        Object expectedValue = condition.get("value");

        // Navigate nested field path (e.g., "data.status" -> inputData["data"]["status"])
        Object actualValue = inputData;
        for (String part : field.split("\\.")) {
            if (actualValue instanceof Map) {
                actualValue = ((Map<String, Object>) actualValue).get(part);
            } else {
                actualValue = null;
                break;
            }
        }

        return compareValues(actualValue, operator, expectedValue);
    }

    private boolean compareValues(Object actual, String operator, Object expected) {
        if (actual == null) return "neq".equals(operator);

        return switch (operator) {
            case "eq" -> Objects.equals(actual, expected);
            case "neq" -> !Objects.equals(actual, expected);
            case "gt" -> compareNumbers(actual, expected) > 0;
            case "lt" -> compareNumbers(actual, expected) < 0;
            case "gte" -> compareNumbers(actual, expected) >= 0;
            case "lte" -> compareNumbers(actual, expected) <= 0;
            case "contains" -> actual.toString().contains(expected.toString());
            case "startsWith" -> actual.toString().startsWith(expected.toString());
            case "endsWith" -> actual.toString().endsWith(expected.toString());
            default -> false;
        };
    }

    private int compareNumbers(Object a, Object b) {
        double numA = toDouble(a);
        double numB = toDouble(b);
        return Double.compare(numA, numB);
    }

    private double toDouble(Object value) {
        if (value instanceof Number) return ((Number) value).doubleValue();
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}

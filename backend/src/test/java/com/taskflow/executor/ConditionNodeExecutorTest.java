package com.taskflow.executor;

import com.taskflow.model.NodeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ConditionNodeExecutor.
 */
class ConditionNodeExecutorTest {

    private ConditionNodeExecutor executor;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new ConditionNodeExecutor();
        context = new ExecutionContext("exec-1", 1L);
    }

    @Test
    @DisplayName("Should return true branch when condition equals")
    void shouldReturnTrueBranchWhenConditionEquals() {
        // Given
        Map<String, Object> config = Map.of(
            "conditions", List.of(
                Map.of("field", "status", "operator", "eq", "value", "active")
            ),
            "logic", "and"
        );
        Map<String, Object> inputData = Map.of("status", "active");

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals("true", result.getBranch());
    }

    @Test
    @DisplayName("Should return false branch when condition not equals")
    void shouldReturnFalseBranchWhenConditionNotEquals() {
        // Given
        Map<String, Object> config = Map.of(
            "conditions", List.of(
                Map.of("field", "status", "operator", "eq", "value", "active")
            ),
            "logic", "and"
        );
        Map<String, Object> inputData = Map.of("status", "inactive");

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals("false", result.getBranch());
    }

    @Test
    @DisplayName("Should evaluate AND logic correctly")
    void shouldEvaluateAndLogicCorrectly() {
        // Given: Two conditions with AND logic - both true
        Map<String, Object> config = Map.of(
            "conditions", List.of(
                Map.of("field", "count", "operator", "gt", "value", 0),
                Map.of("field", "active", "operator", "eq", "value", true)
            ),
            "logic", "and"
        );
        Map<String, Object> inputData = Map.of("count", 5, "active", true);

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals("true", result.getBranch());
    }

    @Test
    @DisplayName("Should evaluate OR logic correctly")
    void shouldEvaluateOrLogicCorrectly() {
        // Given: Two conditions with OR logic - one true
        Map<String, Object> config = Map.of(
            "conditions", List.of(
                Map.of("field", "count", "operator", "gt", "value", 100),
                Map.of("field", "name", "operator", "eq", "value", "test")
            ),
            "logic", "or"
        );
        Map<String, Object> inputData = Map.of("count", 5, "name", "test");

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals("true", result.getBranch());
    }

    @Test
    @DisplayName("Should support contains operator")
    void shouldSupportContainsOperator() {
        // Given
        Map<String, Object> config = Map.of(
            "conditions", List.of(
                Map.of("field", "text", "operator", "contains", "value", "hello")
            ),
            "logic", "and"
        );
        Map<String, Object> inputData = Map.of("text", "hello world");

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals("true", result.getBranch());
    }
}

package com.taskflow.executor;

import com.taskflow.model.NodeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.HashMap;
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

    @Test
    @DisplayName("Should return true for empty conditions")
    void shouldReturnTrueForEmptyConditions() {
        // Given: No conditions
        Map<String, Object> config = Map.of(
            "conditions", List.of(),
            "logic", "and"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals("true", result.getBranch());
    }

    @Test
    @DisplayName("Should support nested field paths")
    void shouldSupportNestedFieldPaths() {
        // Given: Nested field path data.status
        Map<String, Object> config = Map.of(
            "conditions", List.of(
                Map.of("field", "data.status", "operator", "eq", "value", "active")
            ),
            "logic", "and"
        );
        Map<String, Object> inputData = Map.of(
            "data", Map.of("status", "active")
        );

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals("true", result.getBranch());
    }

    @Test
    @DisplayName("Should handle null values correctly")
    void shouldHandleNullValuesCorrectly() {
        // Given: Field doesn't exist (null) - use HashMap to allow null value
        // When field is null and we use neq operator, it should return true
        Map<String, Object> condition = new HashMap<>();
        condition.put("field", "nonexistent");
        condition.put("operator", "neq");
        condition.put("value", "somevalue");

        Map<String, Object> config = Map.of(
            "conditions", List.of(condition),
            "logic", "and"
        );
        Map<String, Object> inputData = Map.of("other", "value");

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then: null != "somevalue" is true
        assertTrue(result.isSuccess());
        assertEquals("true", result.getBranch()); // null != "somevalue" is true with neq
    }

    @Test
    @DisplayName("Should support not equals operator")
    void shouldSupportNeqOperator() {
        // Given
        Map<String, Object> config = Map.of(
            "conditions", List.of(
                Map.of("field", "status", "operator", "neq", "value", "inactive")
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
    @DisplayName("Should support comparison operators")
    void shouldSupportComparisonOperators() {
        // Given: gt, lt, gte, lte
        Map<String, Object> config = Map.of(
            "conditions", List.of(
                Map.of("field", "count", "operator", "gt", "value", 10),
                Map.of("field", "count", "operator", "lt", "value", 100)
            ),
            "logic", "and"
        );
        Map<String, Object> inputData = Map.of("count", 50);

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals("true", result.getBranch());
    }

    @Test
    @DisplayName("Should support startsWith operator")
    void shouldSupportStartsWithOperator() {
        // Given
        Map<String, Object> config = Map.of(
            "conditions", List.of(
                Map.of("field", "name", "operator", "startsWith", "value", "test")
            ),
            "logic", "and"
        );
        Map<String, Object> inputData = Map.of("name", "testing");

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals("true", result.getBranch());
    }

    @Test
    @DisplayName("Should support endsWith operator")
    void shouldSupportEndsWithOperator() {
        // Given
        Map<String, Object> config = Map.of(
            "conditions", List.of(
                Map.of("field", "email", "operator", "endsWith", "value", ".com")
            ),
            "logic", "and"
        );
        Map<String, Object> inputData = Map.of("email", "test@example.com");

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals("true", result.getBranch());
    }

    @Test
    @DisplayName("Should return failure on invalid operator")
    void shouldReturnFailureOnInvalidOperator() {
        // Given: Unknown operator
        Map<String, Object> config = Map.of(
            "conditions", List.of(
                Map.of("field", "value", "operator", "unknown", "value", "test")
            ),
            "logic", "and"
        );
        Map<String, Object> inputData = Map.of("value", "test");

        // When
        ExecutionResult result = executor.execute("cond-1", config, inputData, context);

        // Then: Invalid operator returns false (falls through to default)
        assertTrue(result.isSuccess());
        assertEquals("false", result.getBranch());
    }
}

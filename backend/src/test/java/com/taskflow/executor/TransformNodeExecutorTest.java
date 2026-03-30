package com.taskflow.executor;

import com.taskflow.model.NodeType;
import com.taskflow.service.ExpressionEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for TransformNodeExecutor.
 */
class TransformNodeExecutorTest {

    private TransformNodeExecutor executor;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        ExpressionEngine expressionEngine = new ExpressionEngine();
        executor = new TransformNodeExecutor(expressionEngine);
        context = new ExecutionContext("exec-1", 1L);
    }

    @Test
    @DisplayName("Should return correct supported node type")
    void shouldReturnCorrectSupportedType() {
        assertEquals(NodeType.TRANSFORM, executor.getSupportedType());
    }

    @Test
    @DisplayName("Should transform using string concatenation")
    void shouldTransformUsingStringConcatenation() {
        // Given
        Map<String, Object> config = Map.of(
            "mappings", List.of(
                Map.of("outputField", "fullName", "expression", "${input.firstName} + ' ' + ${input.lastName}")
            )
        );
        Map<String, Object> inputData = Map.of(
            "input", Map.of("firstName", "John", "lastName", "Doe")
        );

        // When
        ExecutionResult result = executor.execute("transform-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("John Doe", output.get("fullName"));
    }

    @Test
    @DisplayName("Should transform using math expression")
    void shouldTransformUsingMathExpression() {
        // Given
        Map<String, Object> config = Map.of(
            "mappings", List.of(
                Map.of("outputField", "doubled", "expression", "${input.count} * 2"),
                Map.of("outputField", "sum", "expression", "${input.a} + ${input.b}")
            )
        );
        Map<String, Object> inputData = Map.of(
            "input", Map.of("count", 5, "a", 10, "b", 20)
        );

        // When
        ExecutionResult result = executor.execute("transform-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals(10L, output.get("doubled"));
        assertEquals(30L, output.get("sum"));
    }

    @Test
    @DisplayName("Should transform using comparison expression")
    void shouldTransformUsingComparisonExpression() {
        // Given
        Map<String, Object> config = Map.of(
            "mappings", List.of(
                Map.of("outputField", "isAdult", "expression", "${input.age} gt 18")
            )
        );
        Map<String, Object> inputData = Map.of(
            "input", Map.of("age", 25)
        );

        // When
        ExecutionResult result = executor.execute("transform-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals(true, output.get("isAdult"));
    }

    @Test
    @DisplayName("Should handle multiple mappings")
    void shouldHandleMultipleMappings() {
        // Given
        Map<String, Object> config = Map.of(
            "mappings", List.of(
                Map.of("outputField", "name", "expression", "${input.user.name}"),
                Map.of("outputField", "status", "expression", "'active'"),
                Map.of("outputField", "score", "expression", "100")
            )
        );
        Map<String, Object> inputData = Map.of(
            "input", Map.of("user", Map.of("name", "Alice"))
        );

        // When
        ExecutionResult result = executor.execute("transform-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("Alice", output.get("name"));
        assertEquals("active", output.get("status"));
        assertEquals(100L, output.get("score"));
    }

    @Test
    @DisplayName("Should handle empty mappings")
    void shouldHandleEmptyMappings() {
        // Given
        Map<String, Object> config = Map.of("mappings", List.of());
        Map<String, Object> inputData = Map.of("key", "value");

        // When
        ExecutionResult result = executor.execute("transform-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertTrue(output.isEmpty());
    }

    @Test
    @DisplayName("Should handle missing outputField")
    void shouldHandleMissingOutputField() {
        // Given
        Map<String, Object> config = Map.of(
            "mappings", List.of(
                Map.of("expression", "${input.value}")  // Missing outputField
            )
        );
        Map<String, Object> inputData = Map.of("input", Map.of("value", "test"));

        // When
        ExecutionResult result = executor.execute("transform-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());  // Should succeed but skip the mapping
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertFalse(output.containsKey(""));  // Should not contain empty key
    }

    @Test
    @DisplayName("Should handle null result for failed expression")
    void shouldHandleNullResultForFailedExpression() {
        // Given
        Map<String, Object> config = Map.of(
            "mappings", List.of(
                Map.of("outputField", "result", "expression", "${nonexistent.field}")
            )
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("transform-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());  // Should succeed with null value
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertNull(output.get("result"));
    }

    @Test
    @DisplayName("Should use template evaluation for strings")
    void shouldUseTemplateEvaluationForStrings() {
        // Given
        Map<String, Object> config = Map.of(
            "mappings", List.of(
                Map.of("outputField", "greeting", "expression", "'Hello ${input.name}!'")
            )
        );
        Map<String, Object> inputData = Map.of(
            "input", Map.of("name", "World")
        );

        // When
        ExecutionResult result = executor.execute("transform-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("Hello World!", output.get("greeting"));
    }
}
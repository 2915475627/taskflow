package com.taskflow.executor;

import com.taskflow.model.NodeType;
import com.taskflow.service.ExpressionEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for LogNodeExecutor.
 */
class LogNodeExecutorTest {

    private LogNodeExecutor executor;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        ExpressionEngine expressionEngine = new ExpressionEngine();
        executor = new LogNodeExecutor(expressionEngine);
        context = new ExecutionContext("exec-1", 1L);
    }

    @Test
    @DisplayName("Should return correct supported node type")
    void shouldReturnCorrectSupportedType() {
        assertEquals(NodeType.LOG, executor.getSupportedType());
    }

    @Test
    @DisplayName("Should log simple message")
    void shouldLogSimpleMessage() {
        // Given
        Map<String, Object> config = Map.of(
            "message", "Hello World"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("log-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("Hello World", output.get("message"));
        assertEquals("INFO", output.get("level"));
    }

    @Test
    @DisplayName("Should log message with expression")
    void shouldLogMessageWithExpression() {
        // Given
        Map<String, Object> config = Map.of(
            "message", "Hello ${input.name}"
        );
        Map<String, Object> inputData = Map.of(
            "input", Map.of("name", "John")
        );

        // When
        ExecutionResult result = executor.execute("log-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("Hello John", output.get("message"));
    }

    @Test
    @DisplayName("Should log with DEBUG level")
    void shouldLogWithDebugLevel() {
        // Given
        Map<String, Object> config = Map.of(
            "message", "Debug message",
            "level", "DEBUG"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("log-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("DEBUG", output.get("level"));
    }

    @Test
    @DisplayName("Should log with ERROR level")
    void shouldLogWithErrorLevel() {
        // Given
        Map<String, Object> config = Map.of(
            "message", "Error message",
            "level", "ERROR"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("log-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("ERROR", output.get("level"));
    }

    @Test
    @DisplayName("Should use INFO as default level")
    void shouldUseInfoAsDefaultLevel() {
        // Given
        Map<String, Object> config = Map.of(
            "message", "Test message"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("log-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("INFO", output.get("level"));
    }

    @Test
    @DisplayName("Should log multiple values")
    void shouldLogMultipleValues() {
        // Given
        Map<String, Object> config = Map.of(
            "message", "User ${input.user.name} has status ${input.user.status}",
            "values", Map.of(
                "user", "${input.user}"
            )
        );
        Map<String, Object> inputData = Map.of(
            "input", Map.of(
                "user", Map.of("name", "Alice", "status", "active")
            )
        );

        // When
        ExecutionResult result = executor.execute("log-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("User Alice has status active", output.get("message"));
    }

    @Test
    @DisplayName("Should handle empty message")
    void shouldHandleEmptyMessage() {
        // Given
        Map<String, Object> config = Map.of(
            "message", ""
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("log-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("", output.get("message"));
    }

    @Test
    @DisplayName("Should pass through input data")
    void shouldPassThroughInputData() {
        // Given
        Map<String, Object> config = Map.of(
            "message", "Processing"
        );
        Map<String, Object> inputData = Map.of(
            "input", "data",
            "other", "value"
        );

        // When
        ExecutionResult result = executor.execute("log-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertNotNull(output.get("message"));
        assertNotNull(output.get("level"));
    }
}

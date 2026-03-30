package com.taskflow.executor;

import com.taskflow.model.NodeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for StartNodeExecutor.
 */
class StartNodeExecutorTest {

    private StartNodeExecutor executor;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new StartNodeExecutor();
        context = new ExecutionContext("exec-1", 1L);
    }

    @Test
    @DisplayName("Should return correct supported node type")
    void shouldReturnCorrectSupportedType() {
        assertEquals(NodeType.START, executor.getSupportedType());
    }

    @Test
    @DisplayName("Should store input data to context variable")
    void shouldStoreInputDataToContextVariable() {
        // Given
        Map<String, Object> config = Map.of("outputVariable", "input");
        Map<String, Object> inputData = Map.of("key", "value");

        // When
        ExecutionResult result = executor.execute("start-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals(inputData, result.getOutput());
        assertEquals(inputData, context.getVariable("input"));
    }

    @Test
    @DisplayName("Should use default variable name when not specified")
    void shouldUseDefaultVariableNameWhenNotSpecified() {
        // Given: No outputVariable specified
        Map<String, Object> config = Map.of();
        Map<String, Object> inputData = Map.of("data", "test");

        // When
        ExecutionResult result = executor.execute("start-1", config, inputData, context);

        // Then: Default is "input"
        assertTrue(result.isSuccess());
        assertEquals(inputData, context.getVariable("input"));
    }

    @Test
    @DisplayName("Should handle empty input data")
    void shouldHandleEmptyInputData() {
        // Given
        Map<String, Object> config = Map.of("outputVariable", "workflowInput");
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("start-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals(inputData, result.getOutput());
        assertEquals(inputData, context.getVariable("workflowInput"));
    }

    @Test
    @DisplayName("Should handle nested input data")
    void shouldHandleNestedInputData() {
        // Given
        Map<String, Object> config = Map.of("outputVariable", "startData");
        Map<String, Object> nestedInput = Map.of(
            "user", Map.of("name", "John", "age", 30),
            "items", java.util.List.of(1, 2, 3)
        );

        // When
        ExecutionResult result = executor.execute("start-1", config, nestedInput, context);

        // Then
        assertTrue(result.isSuccess());
        assertEquals(nestedInput, context.getVariable("startData"));
    }

    @Test
    @DisplayName("Should return input data as output")
    void shouldReturnInputDataAsOutput() {
        // Given
        Map<String, Object> config = Map.of("outputVariable", "input");
        Map<String, Object> inputData = Map.of("trigger", "webhook", "payload", Map.of("id", 123));

        // When
        ExecutionResult result = executor.execute("start-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertNotNull(result.getOutput());
        assertEquals(inputData, result.getOutput());
    }
}

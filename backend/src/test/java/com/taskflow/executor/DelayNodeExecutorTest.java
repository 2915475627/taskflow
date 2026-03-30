package com.taskflow.executor;

import com.taskflow.model.NodeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for DelayNodeExecutor.
 */
class DelayNodeExecutorTest {

    private DelayNodeExecutor executor;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new DelayNodeExecutor();
        context = new ExecutionContext("exec-1", 1L);
    }

    @Test
    @DisplayName("Should return correct supported node type")
    void shouldReturnCorrectSupportedType() {
        assertEquals(NodeType.DELAY, executor.getSupportedType());
    }

    @Test
    @DisplayName("Should delay for specified duration")
    void shouldDelayForSpecifiedDuration() {
        // Given: 100ms delay
        Map<String, Object> config = Map.of("duration", 100);
        Map<String, Object> inputData = Map.of();

        long startTime = System.currentTimeMillis();
        ExecutionResult result = executor.execute("delay-1", config, inputData, context);
        long elapsed = System.currentTimeMillis() - startTime;

        // Then
        assertTrue(result.isSuccess());
        assertTrue(elapsed >= 90); // Allow some tolerance
        assertTrue(elapsed < 200);

        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals(100, output.get("delayedMs"));
    }

    @Test
    @DisplayName("Should use default duration when not specified")
    void shouldUseDefaultDurationWhenNotSpecified() {
        // Given: No duration specified
        Map<String, Object> config = Map.of();
        Map<String, Object> inputData = Map.of();

        long startTime = System.currentTimeMillis();
        ExecutionResult result = executor.execute("delay-1", config, inputData, context);
        long elapsed = System.currentTimeMillis() - startTime;

        // Then: Default is 1000ms
        assertTrue(result.isSuccess());
        assertTrue(elapsed >= 900); // Allow some tolerance
        assertTrue(elapsed < 1500);
    }

    @Test
    @DisplayName("Should handle zero duration")
    void shouldHandleZeroDuration() {
        // Given
        Map<String, Object> config = Map.of("duration", 0);
        Map<String, Object> inputData = Map.of();

        long startTime = System.currentTimeMillis();
        ExecutionResult result = executor.execute("delay-1", config, inputData, context);
        long elapsed = System.currentTimeMillis() - startTime;

        // Then
        assertTrue(result.isSuccess());
        assertTrue(elapsed < 50); // Should be nearly instant
    }

    @Test
    @DisplayName("Should handle very short duration")
    void shouldHandleVeryShortDuration() {
        // Given: 1ms
        Map<String, Object> config = Map.of("duration", 1);
        Map<String, Object> inputData = Map.of();

        long startTime = System.currentTimeMillis();
        ExecutionResult result = executor.execute("delay-1", config, inputData, context);
        long elapsed = System.currentTimeMillis() - startTime;

        // Then
        assertTrue(result.isSuccess());
        assertTrue(elapsed < 50);
    }

    @Test
    @DisplayName("Should handle string duration")
    void shouldHandleStringDuration() {
        // Given: Duration as Integer (common case)
        Map<String, Object> config = Map.of("duration", Integer.valueOf(50));
        Map<String, Object> inputData = Map.of();

        long startTime = System.currentTimeMillis();
        ExecutionResult result = executor.execute("delay-1", config, inputData, context);
        long elapsed = System.currentTimeMillis() - startTime;

        // Then
        assertTrue(result.isSuccess());
        assertTrue(elapsed >= 40);
        assertTrue(elapsed < 150);
    }

    @Test
    @DisplayName("Should return output with delayedMs")
    void shouldReturnOutputWithDelayedMs() {
        // Given
        Map<String, Object> config = Map.of("duration", 100);
        Map<String, Object> inputData = Map.of("input", "value");

        // When
        ExecutionResult result = executor.execute("delay-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertNotNull(result.getOutput());
        assertTrue(result.getOutput() instanceof Map);

        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals(100, output.get("delayedMs"));
    }
}

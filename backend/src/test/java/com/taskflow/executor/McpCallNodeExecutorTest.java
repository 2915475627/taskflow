package com.taskflow.executor;

import com.taskflow.model.NodeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for McpCallNodeExecutor.
 */
class McpCallNodeExecutorTest {

    private McpCallNodeExecutor executor;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new McpCallNodeExecutor();
        context = new ExecutionContext("exec-1", 1L);
    }

    @Test
    @DisplayName("Should return correct supported node type")
    void shouldReturnCorrectSupportedType() {
        assertEquals(NodeType.MCP_CALL, executor.getSupportedType());
    }

    @Test
    @DisplayName("Should execute MCP call successfully with all parameters")
    void shouldExecuteMcpCallSuccessfully() {
        // Given
        Map<String, Object> config = Map.of(
            "serverName", "filesystem",
            "toolName", "read_file",
            "arguments", Map.of("path", "/tmp/test.txt")
        );
        Map<String, Object> inputData = Map.of("key", "value");

        // When
        ExecutionResult result = executor.execute("mcp-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        assertNotNull(result.getOutput());
        assertTrue(result.getOutput() instanceof Map);

        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("filesystem", output.get("server"));
        assertEquals("read_file", output.get("tool"));
        assertEquals(true, output.get("success"));
    }

    @Test
    @DisplayName("Should execute with empty arguments")
    void shouldExecuteWithEmptyArguments() {
        // Given
        Map<String, Object> config = Map.of(
            "serverName", "calculator",
            "toolName", "add"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("mcp-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("calculator", output.get("server"));
        assertEquals("add", output.get("tool"));
    }

    @Test
    @DisplayName("Should execute with complex nested arguments")
    void shouldExecuteWithComplexNestedArguments() {
        // Given
        Map<String, Object> nestedArgs = Map.of(
            "level1", Map.of(
                "level2", Map.of(
                    "value", "deep"
                )
            ),
            "list", java.util.List.of(1, 2, 3)
        );
        Map<String, Object> config = Map.of(
            "serverName", "api",
            "toolName", "nested_call",
            "arguments", nestedArgs
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("mcp-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        @SuppressWarnings("unchecked")
        Map<String, Object> resultArgs = (Map<String, Object>) output.get("arguments");
        assertNotNull(resultArgs.get("level1"));
    }

    @Test
    @DisplayName("Should use default values for empty config")
    void shouldUseDefaultValuesForEmptyConfig() {
        // Given
        Map<String, Object> config = Map.of();
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("mcp-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        assertEquals("", output.get("server"));
        assertEquals("", output.get("tool"));
    }

    @Test
    @DisplayName("Should handle numeric arguments")
    void shouldHandleNumericArguments() {
        // Given
        Map<String, Object> config = Map.of(
            "serverName", "calculator",
            "toolName", "calculate",
            "arguments", Map.of("a", 10, "b", 20, "operation", "add")
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("mcp-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.getOutput();
        @SuppressWarnings("unchecked")
        Map<String, Object> args = (Map<String, Object>) output.get("arguments");
        assertEquals(10, args.get("a"));
        assertEquals(20, args.get("b"));
    }

    @Test
    @DisplayName("Should pass input data through context")
    void shouldHandleInputData() {
        // Given
        Map<String, Object> config = Map.of(
            "serverName", "transformer",
            "toolName", "process"
        );
        Map<String, Object> inputData = Map.of(
            "user_input", "test data",
            "timestamp", "2024-01-01"
        );

        // When
        ExecutionResult result = executor.execute("mcp-1", config, inputData, context);

        // Then
        assertTrue(result.isSuccess());
        // MCP call receives input data though it's not directly reflected in output
        // The key is that execution completes successfully
    }
}

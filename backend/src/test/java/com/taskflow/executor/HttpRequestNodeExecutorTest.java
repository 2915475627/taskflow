package com.taskflow.executor;

import com.taskflow.model.NodeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for HttpRequestNodeExecutor.
 * Tests security validation and basic execution scenarios.
 */
class HttpRequestNodeExecutorTest {

    private HttpRequestNodeExecutor executor;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new HttpRequestNodeExecutor();
        context = new ExecutionContext("exec-1", 1L);
    }

    @Test
    @DisplayName("Should block localhost URL")
    void shouldBlockLocalhostUrl() {
        // Given
        Map<String, Object> config = Map.of(
            "method", "GET",
            "url", "http://localhost:8080/api"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("http-1", config, inputData, context);

        // Then
        assertFalse(result.isSuccess());
        assertTrue(result.getErrorMessage().contains("Blocked host"));
    }

    @Test
    @DisplayName("Should block 127.0.0.1 URL")
    void shouldBlock127Url() {
        // Given
        Map<String, Object> config = Map.of(
            "method", "GET",
            "url", "http://127.0.0.1:8080/api"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("http-1", config, inputData, context);

        // Then
        assertFalse(result.isSuccess());
        assertTrue(result.getErrorMessage().contains("Blocked"));
    }

    @Test
    @DisplayName("Should block private IP range 10.x.x.x")
    void shouldBlockPrivateIp10Range() {
        // Given
        Map<String, Object> config = Map.of(
            "method", "GET",
            "url", "http://10.0.0.1:8080/api"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("http-1", config, inputData, context);

        // Then
        assertFalse(result.isSuccess());
        assertTrue(result.getErrorMessage().contains("Blocked IP"));
    }

    @Test
    @DisplayName("Should block private IP range 192.168.x.x")
    void shouldBlockPrivateIp192Range() {
        // Given
        Map<String, Object> config = Map.of(
            "method", "GET",
            "url", "http://192.168.1.100:8080/api"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("http-1", config, inputData, context);

        // Then
        assertFalse(result.isSuccess());
        assertTrue(result.getErrorMessage().contains("Blocked IP"));
    }

    @Test
    @DisplayName("Should block private IP range 172.16-31.x.x")
    void shouldBlockPrivateIp172Range() {
        // Given
        Map<String, Object> config = Map.of(
            "method", "GET",
            "url", "http://172.16.0.1:8080/api"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("http-1", config, inputData, context);

        // Then
        assertFalse(result.isSuccess());
        assertTrue(result.getErrorMessage().contains("Blocked IP"));
    }

    @Test
    @DisplayName("Should block empty URL")
    void shouldBlockEmptyUrl() {
        // Given
        Map<String, Object> config = Map.of(
            "method", "GET",
            "url", ""
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("http-1", config, inputData, context);

        // Then
        assertFalse(result.isSuccess());
        assertTrue(result.getErrorMessage().contains("empty"));
    }

    @Test
    @DisplayName("Should block null URL")
    void shouldBlockNullUrl() {
        // Given: Use HashMap to allow null value
        Map<String, Object> config = new HashMap<>();
        config.put("method", "GET");
        config.put("url", null);
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("http-1", config, inputData, context);

        // Then
        assertFalse(result.isSuccess());
        assertTrue(result.getErrorMessage().contains("empty"));
    }

    @Test
    @DisplayName("Should accept valid public URL")
    void shouldAcceptValidPublicUrl() {
        // Given: Valid external URL (will fail at network level but pass security check)
        Map<String, Object> config = Map.of(
            "method", "GET",
            "url", "https://httpbin.org/status/200"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("http-1", config, inputData, context);

        // Note: This will fail due to network issues in test environment
        // The important thing is it passed security validation
        // So we check it didn't fail due to security reasons
        if (!result.isSuccess()) {
            String error = result.getErrorMessage();
            assertFalse(error.contains("Blocked"), "Should not be blocked for security");
            assertFalse(error.contains("Invalid URL"), "Should not be invalid URL");
        }
        // If it succeeds, that's fine too (network is available)
    }

    @Test
    @DisplayName("Should return correct supported node type")
    void shouldReturnCorrectSupportedType() {
        assertEquals(NodeType.HTTP_REQUEST, executor.getSupportedType());
    }

    @Test
    @DisplayName("Should handle missing URL gracefully")
    void shouldHandleMissingUrl() {
        // Given: Config without URL
        Map<String, Object> config = Map.of(
            "method", "GET"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("http-1", config, inputData, context);

        // Then
        assertFalse(result.isSuccess());
        assertTrue(result.getErrorMessage().contains("empty"));
    }

    @Test
    @DisplayName("Should handle invalid URL format")
    void shouldHandleInvalidUrlFormat() {
        // Given
        Map<String, Object> config = Map.of(
            "method", "GET",
            "url", "not-a-valid-url"
        );
        Map<String, Object> inputData = Map.of();

        // When
        ExecutionResult result = executor.execute("http-1", config, inputData, context);

        // Then
        assertFalse(result.isSuccess());
        assertTrue(result.getErrorMessage().contains("Invalid URL"));
    }
}

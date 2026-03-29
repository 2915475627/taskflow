package com.taskflow.executor;

import com.taskflow.model.NodeType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Executes MCP Call nodes.
 *
 * Calls MCP (Model Context Protocol) tools with the configured server name,
 * tool name, and arguments.
 *
 * Note: This is a simulated implementation. Production would integrate with
 * an actual MCP client library.
 *
 * Example config:
 * {
 *   "serverName": "filesystem",
 *   "toolName": "read_file",
 *   "arguments": {"path": "/tmp/test.txt"}
 * }
 */
@Component
public class McpCallNodeExecutor implements NodeExecutor {

    private static final Logger log = LoggerFactory.getLogger(McpCallNodeExecutor.class);

    @Override
    public NodeType getSupportedType() {
        return NodeType.MCP_CALL;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ExecutionResult execute(String nodeId, Object config, Map<String, Object> inputData, ExecutionContext context) {
        try {
            Map<String, Object> cfg = (Map<String, Object>) config;
            String serverName = (String) cfg.getOrDefault("serverName", "");
            String toolName = (String) cfg.getOrDefault("toolName", "");
            Map<String, Object> arguments = (Map<String, Object>) cfg.getOrDefault("arguments", Map.of());

            log.info("Executing MCP Call node {}: {}.{} with args {}",
                nodeId, serverName, toolName, arguments);

            // Simulate MCP call - in production, this would call actual MCP client
            // For now, return a mock result
            Map<String, Object> mockResult = Map.of(
                "server", serverName,
                "tool", toolName,
                "arguments", arguments,
                "result", "Mock MCP response - implement actual MCP client for production",
                "success", true
            );

            return ExecutionResult.success(nodeId, mockResult);
        } catch (Exception e) {
            log.error("MCP call failed for node {}: {}", nodeId, e.getMessage());
            return ExecutionResult.failure(nodeId, e.getMessage());
        }
    }
}

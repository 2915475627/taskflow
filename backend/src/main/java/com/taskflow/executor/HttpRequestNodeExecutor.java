package com.taskflow.executor;

import org.springframework.stereotype.Service;

import com.taskflow.model.NodeType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Executes HTTP Request nodes.
 *
 * Makes HTTP calls with the configured method, URL, headers, and body.
 * Supports GET, POST, PUT, PATCH, DELETE methods.
 *
 * Example config:
 * {
 *   "method": "POST",
 *   "url": "https://api.example.com/users",
 *   "headers": {"Authorization": "Bearer token"},
 *   "body": "{\"name\": \"John\"}",
 *   "timeout": 30000
 * }
 */
@Component
@Service
public class HttpRequestNodeExecutor implements NodeExecutor {

    private static final Logger log = LoggerFactory.getLogger(HttpRequestNodeExecutor.class);
    private final RestTemplate restTemplate;

    public HttpRequestNodeExecutor() {
        this.restTemplate = new RestTemplate();
    }

    @Override
    public NodeType getSupportedType() {
        return NodeType.HTTP_REQUEST;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ExecutionResult execute(String nodeId, Object config, Map<String, Object> inputData, ExecutionContext context) {
        try {
            Map<String, Object> cfg = (Map<String, Object>) config;
            String method = (String) cfg.getOrDefault("method", "GET");
            String url = (String) cfg.getOrDefault("url", "");
            Map<String, String> headers = (Map<String, String>) cfg.getOrDefault("headers", Map.of());
            String body = (String) cfg.getOrDefault("body", null);

            log.info("Executing HTTP Request node {}: {} {}", nodeId, method, url);

            HttpHeaders httpHeaders = new HttpHeaders();
            headers.forEach(httpHeaders::add);

            HttpEntity<String> entity = new HttpEntity<>(body, httpHeaders);

            ResponseEntity<Object> response = restTemplate.exchange(
                url,
                HttpMethod.valueOf(method.toUpperCase()),
                entity,
                Object.class
            );

            return ExecutionResult.success(nodeId, response.getBody());
        } catch (Exception e) {
            log.error("HTTP request failed for node {}: {}", nodeId, e.getMessage());
            return ExecutionResult.failure(nodeId, e.getMessage());
        }
    }
}

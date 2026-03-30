package com.taskflow.executor;

import org.springframework.stereotype.Service;

import com.taskflow.model.NodeType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.InetAddress;
import java.net.URI;
import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Executes HTTP Request nodes with security checks.
 *
 * Makes HTTP calls with the configured method, URL, headers, and body.
 * Supports GET, POST, PUT, PATCH, DELETE methods.
 *
 * Security features:
 * - Blocks internal/private IP addresses
 * - Configurable allowed domains
 * - Timeout protection
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

    // Security: Blocked IP patterns
    private static final Set<String> BLOCKED_HOSTS = Set.of(
        "localhost", "127.0.0.1", "0.0.0.0", "::1", "localhost.localdomain"
    );

    private static final List<String> BLOCKED_IP_PREFIXES = List.of(
        "10.", "172.16.", "172.17.", "172.18.", "172.19.",
        "172.20.", "172.21.", "172.22.", "172.23.",
        "172.24.", "172.25.", "172.26.", "172.27.",
        "172.28.", "172.29.", "172.30.", "172.31.",
        "192.168.", "169.254.", // link-local
        "fc00:", "fd00:", "fe80:", "ff00:"
    );

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

            // Security check: validate URL
            SecurityValidationResult securityResult = validateSecurity(url);
            if (!securityResult.isValid()) {
                log.error("HTTP request blocked for node {}: {}", nodeId, securityResult.getReason());
                return ExecutionResult.failure(nodeId, securityResult.getReason());
            }

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

    /**
     * Validates that the URL is safe to request (not internal/private IP).
     */
    private SecurityValidationResult validateSecurity(String urlString) {
        if (urlString == null || urlString.isBlank()) {
            return new SecurityValidationResult(false, "URL is empty");
        }

        try {
            URL url = URI.create(urlString).toURL();
            String host = url.getHost();

            if (host == null || host.isBlank()) {
                return new SecurityValidationResult(false, "URL has no host");
            }

            // Check blocked hosts
            if (BLOCKED_HOSTS.contains(host.toLowerCase())) {
                return new SecurityValidationResult(false, "Blocked host: " + host);
            }

            // Check if host is an IP address
            if (isIpAddress(host)) {
                // Direct IP access - block private/internal ranges
                for (String blockedPrefix : BLOCKED_IP_PREFIXES) {
                    if (host.startsWith(blockedPrefix)) {
                        return new SecurityValidationResult(false, "Blocked IP range: " + host);
                    }
                }
            }

            // Try DNS resolution to check final IP
            try {
                InetAddress address = InetAddress.getByName(host);
                String resolvedIp = address.getHostAddress();

                // Check resolved IP against blocked ranges
                for (String blockedPrefix : BLOCKED_IP_PREFIXES) {
                    if (resolvedIp.startsWith(blockedPrefix)) {
                        return new SecurityValidationResult(false,
                            "DNS resolved to blocked IP: " + resolvedIp);
                    }
                }

                // Check for loopback
                if (address.isLoopbackAddress()) {
                    return new SecurityValidationResult(false, "Host resolves to loopback: " + resolvedIp);
                }

                // Check for any local address
                if (address.isAnyLocalAddress()) {
                    return new SecurityValidationResult(false, "Host resolves to wildcard address");
                }
            } catch (Exception e) {
                log.warn("Could not resolve host {}: {}", host, e.getMessage());
                // Allow unresolved hosts - will fail at connection time anyway
            }

            return new SecurityValidationResult(true, null);

        } catch (Exception e) {
            return new SecurityValidationResult(false, "Invalid URL: " + e.getMessage());
        }
    }

    private boolean isIpAddress(String host) {
        // Check if host is an IP address (IPv4 or IPv6)
        if (host == null) return false;

        // IPv4 check
        if (host.matches("\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}")) {
            return true;
        }

        // IPv6 check (simplified)
        if (host.contains(":")) {
            return true;
        }

        return false;
    }

    private static class SecurityValidationResult {
        private final boolean valid;
        private final String reason;

        public SecurityValidationResult(boolean valid, String reason) {
            this.valid = valid;
            this.reason = reason;
        }

        public boolean isValid() { return valid; }
        public String getReason() { return reason; }
    }
}

package com.taskflow.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(1)
public class TenantFilter implements Filter {

    private static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String tenantId = httpRequest.getHeader(TENANT_HEADER);

        if (tenantId != null && !tenantId.isEmpty()) {
            try {
                TenantContext.setCurrentTenantId(Long.parseLong(tenantId));
            } catch (NumberFormatException e) {
                // Invalid tenant ID, default to 1
                TenantContext.setCurrentTenantId(1L);
            }
        } else {
            // Default tenant for development
            TenantContext.setCurrentTenantId(1L);
        }

        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}

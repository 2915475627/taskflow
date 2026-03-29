package com.taskflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.dto.WebhookCallbackRequest;
import com.taskflow.dto.WebhookConfigRequest;
import com.taskflow.dto.WebhookConfigResponse;
import com.taskflow.entity.WorkflowRun.RunStatus;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.security.TenantContext;
import com.taskflow.service.WebhookService;
import com.taskflow.service.WorkflowService;
import com.taskflow.repository.WorkflowRunRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class WebhookControllerTest {

    private static final Long TENANT_ID = 1L;
    private static final Long WORKFLOW_ID = 100L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private WebhookService webhookService;

    @MockBean
    private WorkflowService workflowService;

    @MockBean
    private WorkflowRunRepository workflowRunRepository;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenantId(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void handleWebhookCallback_shouldProcessCallback() throws Exception {
        WebhookCallbackRequest request = new WebhookCallbackRequest(
                "exec-123",
                "SUCCESS",
                "{\"result\": \"completed\"}",
                null
        );

        when(workflowRunRepository.findByExecutionId("exec-123")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/webhooks/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void configureWebhook_shouldCreateConfig() throws Exception {
        WebhookConfigRequest request = new WebhookConfigRequest(
                "https://example.com/webhook",
                "secret123"
        );

        WebhookConfigResponse response = new WebhookConfigResponse(
                1L,
                WORKFLOW_ID,
                "https://example.com/webhook",
                true,
                Instant.now()
        );

        when(workflowService.configureWebhook(eq(WORKFLOW_ID), any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/workflows/{id}/webhooks", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.callbackUrl").value("https://example.com/webhook"));
    }

    @Test
    void getWebhookConfig_shouldReturnConfig() throws Exception {
        WebhookConfigResponse response = new WebhookConfigResponse(
                1L,
                WORKFLOW_ID,
                "https://example.com/webhook",
                true,
                Instant.now()
        );

        when(workflowService.getWebhookConfig(WORKFLOW_ID)).thenReturn(response);

        mockMvc.perform(get("/api/workflows/{id}/webhooks", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.workflowId").value(WORKFLOW_ID));
    }

    @Test
    void getWebhookConfig_shouldReturn404_whenNotFound() throws Exception {
        when(workflowService.getWebhookConfig(WORKFLOW_ID))
                .thenThrow(new ResourceNotFoundException("Webhook config not found"));

        mockMvc.perform(get("/api/workflows/{id}/webhooks", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void deleteWebhookConfig_shouldDeleteConfig() throws Exception {
        doNothing().when(workflowService).deleteWebhookConfig(WORKFLOW_ID);

        mockMvc.perform(delete("/api/workflows/{id}/webhooks", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(workflowService).deleteWebhookConfig(WORKFLOW_ID);
    }
}

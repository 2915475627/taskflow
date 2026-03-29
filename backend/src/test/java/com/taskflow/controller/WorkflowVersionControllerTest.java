package com.taskflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.dto.WorkflowVersionResponse;
import com.taskflow.dto.WorkflowRunResponse;
import com.taskflow.dto.VersionCreateRequest;
import com.taskflow.dto.RunCreateRequest;
import com.taskflow.entity.WorkflowRun.RunStatus;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.security.TenantContext;
import com.taskflow.service.WorkflowService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class WorkflowVersionControllerTest {

    private static final Long TENANT_ID = 1L;
    private static final Long WORKFLOW_ID = 100L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private WorkflowService workflowService;

    private WorkflowVersionResponse versionResponse;
    private WorkflowRunResponse runResponse;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenantId(TENANT_ID);

        versionResponse = new WorkflowVersionResponse(
                1L,
                WORKFLOW_ID,
                1,
                "{}",
                Instant.now()
        );

        runResponse = new WorkflowRunResponse(
                1L,
                WORKFLOW_ID,
                1,
                UUID.randomUUID().toString(),
                RunStatus.PENDING,
                "{\"key\":\"value\"}",
                null,
                null,
                null,
                null,
                Instant.now()
        );
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // ==================== Version Endpoint Tests ====================

    @Test
    void listVersions_shouldReturnPageOfVersions() throws Exception {
        Page<WorkflowVersionResponse> page = new PageImpl<>(
                List.of(versionResponse), PageRequest.of(0, 20), 1);
        when(workflowService.listVersions(eq(WORKFLOW_ID), any())).thenReturn(page);

        mockMvc.perform(get("/api/workflows/{id}/versions", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].workflowId").value(WORKFLOW_ID))
                .andExpect(jsonPath("$.data[0].version").value(1))
                .andExpect(jsonPath("$.meta.total").value(1));
    }

    @Test
    void listVersions_shouldReturn404_whenWorkflowNotFound() throws Exception {
        when(workflowService.listVersions(eq(WORKFLOW_ID), any()))
                .thenThrow(new ResourceNotFoundException("Workflow not found"));

        mockMvc.perform(get("/api/workflows/{id}/versions", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void createVersion_shouldReturnCreatedVersion() throws Exception {
        VersionCreateRequest request = new VersionCreateRequest("{\"nodes\":[]}", "Initial version");
        WorkflowVersionResponse response = new WorkflowVersionResponse(
                2L, WORKFLOW_ID, 2, "{\"nodes\":[]}", Instant.now()
        );
        when(workflowService.createVersion(eq(WORKFLOW_ID), any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/workflows/{id}/versions", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.version").value(2));
    }

    // ==================== Run Endpoint Tests ====================

    @Test
    void listRuns_shouldReturnPageOfRuns() throws Exception {
        Page<WorkflowRunResponse> page = new PageImpl<>(
                List.of(runResponse), PageRequest.of(0, 20), 1);
        when(workflowService.listRuns(eq(WORKFLOW_ID), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/workflows/{id}/runs", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].workflowId").value(WORKFLOW_ID))
                .andExpect(jsonPath("$.data[0].status").value("PENDING"))
                .andExpect(jsonPath("$.meta.total").value(1));
    }

    @Test
    void listRuns_shouldFilterByStatus() throws Exception {
        Page<WorkflowRunResponse> page = new PageImpl<>(
                List.of(runResponse), PageRequest.of(0, 20), 1);
        when(workflowService.listRuns(eq(WORKFLOW_ID), eq(RunStatus.PENDING), any())).thenReturn(page);

        mockMvc.perform(get("/api/workflows/{id}/runs", WORKFLOW_ID)
                        .param("status", "PENDING")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].status").value("PENDING"));
    }

    @Test
    void listRuns_shouldReturn404_whenWorkflowNotFound() throws Exception {
        when(workflowService.listRuns(eq(WORKFLOW_ID), any(), any()))
                .thenThrow(new ResourceNotFoundException("Workflow not found"));

        mockMvc.perform(get("/api/workflows/{id}/runs", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void createRun_shouldReturnCreatedRun() throws Exception {
        RunCreateRequest request = new RunCreateRequest("{\"key\":\"value\"}");
        when(workflowService.createRun(eq(WORKFLOW_ID), any())).thenReturn(runResponse);

        mockMvc.perform(post("/api/workflows/{id}/runs", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.workflowId").value(WORKFLOW_ID))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    void getRunByExecutionId_shouldReturnRun() throws Exception {
        String executionId = runResponse.executionId();
        when(workflowService.getRunByExecutionId(executionId)).thenReturn(runResponse);

        mockMvc.perform(get("/api/workflows/runs/{executionId}", executionId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.executionId").value(executionId));
    }

    @Test
    void getRunByExecutionId_shouldReturn404_whenNotFound() throws Exception {
        String executionId = "non-existent";
        when(workflowService.getRunByExecutionId(executionId))
                .thenThrow(new ResourceNotFoundException("Workflow run not found"));

        mockMvc.perform(get("/api/workflows/runs/{executionId}", executionId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }
}

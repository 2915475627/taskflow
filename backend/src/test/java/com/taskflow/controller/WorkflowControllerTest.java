package com.taskflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.dto.WorkflowRequest;
import com.taskflow.dto.WorkflowResponse;
import com.taskflow.dto.WorkflowRunResponse;
import com.taskflow.dto.ExecutionResponse;
import com.taskflow.entity.WorkflowStatus;
import com.taskflow.entity.WorkflowRun.RunStatus;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.exception.ValidationException;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class WorkflowControllerTest {

    private static final Long TENANT_ID = 1L;
    private static final Long WORKFLOW_ID = 100L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private WorkflowService workflowService;

    private WorkflowResponse workflowResponse;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenantId(TENANT_ID);

        workflowResponse = new WorkflowResponse(
                WORKFLOW_ID,
                TENANT_ID,
                "Test Workflow",
                "Test Description",
                WorkflowStatus.DRAFT,
                1,
                Instant.now(),
                Instant.now()
        );
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void list_shouldReturnPageOfWorkflows() throws Exception {
        Page<WorkflowResponse> page = new PageImpl<>(List.of(workflowResponse), PageRequest.of(0, 20), 1);
        when(workflowService.list(any())).thenReturn(page);

        mockMvc.perform(get("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].name").value("Test Workflow"))
                .andExpect(jsonPath("$.meta.total").value(1));
    }

    @Test
    void list_shouldFilterByStatus() throws Exception {
        Page<WorkflowResponse> page = new PageImpl<>(List.of(workflowResponse), PageRequest.of(0, 20), 1);
        when(workflowService.listByStatus(eq(WorkflowStatus.DRAFT), any())).thenReturn(page);

        mockMvc.perform(get("/api/workflows")
                        .param("status", "DRAFT")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].status").value("DRAFT"));
    }

    @Test
    void getById_shouldReturnWorkflow() throws Exception {
        when(workflowService.getById(WORKFLOW_ID)).thenReturn(workflowResponse);

        mockMvc.perform(get("/api/workflows/{id}", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(WORKFLOW_ID))
                .andExpect(jsonPath("$.data.name").value("Test Workflow"));
    }

    @Test
    void getById_shouldReturn404_whenNotFound() throws Exception {
        when(workflowService.getById(WORKFLOW_ID))
                .thenThrow(new ResourceNotFoundException("Workflow not found"));

        mockMvc.perform(get("/api/workflows/{id}", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Workflow not found"));
    }

    @Test
    void create_shouldReturnCreatedWorkflow() throws Exception {
        WorkflowRequest request = new WorkflowRequest("New Workflow", "Description", null, null);
        WorkflowResponse response = new WorkflowResponse(
                101L, TENANT_ID, "New Workflow", "Description",
                WorkflowStatus.DRAFT, 1, Instant.now(), Instant.now()
        );
        when(workflowService.create(any(WorkflowRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("New Workflow"));
    }

    @Test
    void create_shouldReturn400_whenValidationFails() throws Exception {
        WorkflowRequest request = new WorkflowRequest("", "Description", null, null);

        mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void create_shouldReturn400_whenNameExists() throws Exception {
        WorkflowRequest request = new WorkflowRequest("Existing", "Description", null, null);
        when(workflowService.create(any(WorkflowRequest.class)))
                .thenThrow(new ValidationException("Workflow with name 'Existing' already exists"));

        mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Workflow with name 'Existing' already exists"));
    }

    @Test
    void update_shouldReturnUpdatedWorkflow() throws Exception {
        WorkflowRequest request = new WorkflowRequest("Updated", "Updated Desc", WorkflowStatus.PUBLISHED, null);
        WorkflowResponse response = new WorkflowResponse(
                WORKFLOW_ID, TENANT_ID, "Updated", "Updated Desc",
                WorkflowStatus.PUBLISHED, 1, Instant.now(), Instant.now()
        );
        when(workflowService.update(eq(WORKFLOW_ID), any(WorkflowRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/workflows/{id}", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Updated"))
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"));
    }

    @Test
    void update_shouldReturn404_whenNotFound() throws Exception {
        WorkflowRequest request = new WorkflowRequest("Updated", "Updated Desc", null, null);
        when(workflowService.update(eq(WORKFLOW_ID), any(WorkflowRequest.class)))
                .thenThrow(new ResourceNotFoundException("Workflow not found"));

        mockMvc.perform(put("/api/workflows/{id}", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void delete_shouldReturn204() throws Exception {
        doNothing().when(workflowService).delete(WORKFLOW_ID);

        mockMvc.perform(delete("/api/workflows/{id}", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_shouldReturn404_whenNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Workflow not found")).when(workflowService).delete(WORKFLOW_ID);

        mockMvc.perform(delete("/api/workflows/{id}", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== Execution Endpoint Tests ====================

    @Test
    void executeWorkflow_shouldStartExecution() throws Exception {
        String executionId = "test-execution-123";
        ExecutionResponse response = new ExecutionResponse(1L, executionId, RunStatus.PENDING, "Execution started");
        when(workflowService.executeWorkflow(eq(WORKFLOW_ID), any())).thenReturn(response);

        mockMvc.perform(post("/api/workflows/{id}/execute", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.executionId").value(executionId))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    void executeWorkflow_shouldReturn404_whenWorkflowNotFound() throws Exception {
        when(workflowService.executeWorkflow(eq(999L), any()))
                .thenThrow(new ResourceNotFoundException("Workflow not found"));

        mockMvc.perform(post("/api/workflows/{id}/execute", 999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }
}

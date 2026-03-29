package com.taskflow.service;

import com.taskflow.dto.WorkflowRequest;
import com.taskflow.dto.WorkflowResponse;
import com.taskflow.entity.Tenant;
import com.taskflow.entity.Workflow;
import com.taskflow.entity.WorkflowStatus;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.exception.ValidationException;
import com.taskflow.repository.WorkflowRepository;
import com.taskflow.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkflowServiceTest {

    private static final Long TENANT_ID = 1L;
    private static final Long WORKFLOW_ID = 100L;

    @Mock
    private WorkflowRepository workflowRepository;

    @InjectMocks
    private WorkflowService workflowService;

    private Tenant tenant;
    private Workflow workflow;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenantId(TENANT_ID);

        tenant = new Tenant("Test Tenant", "test-tenant");
        tenant.setId(TENANT_ID);

        workflow = new Workflow(tenant, "Test Workflow", "Test Description");
        workflow.setId(WORKFLOW_ID);
        workflow.setStatus(WorkflowStatus.DRAFT);
        workflow.setCurrentVersion(1);
        workflow.setCreatedAt(Instant.now());
        workflow.setUpdatedAt(Instant.now());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void list_shouldReturnPageOfWorkflows() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Workflow> workflowPage = new PageImpl<>(List.of(workflow), pageable, 1);
        when(workflowRepository.findByTenantId(TENANT_ID, pageable)).thenReturn(workflowPage);

        Page<WorkflowResponse> result = workflowService.list(pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).name()).isEqualTo("Test Workflow");
        verify(workflowRepository).findByTenantId(TENANT_ID, pageable);
    }

    @Test
    void listByStatus_shouldReturnFilteredWorkflows() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Workflow> workflowPage = new PageImpl<>(List.of(workflow), pageable, 1);
        when(workflowRepository.findByTenantIdAndStatus(TENANT_ID, WorkflowStatus.DRAFT, pageable))
                .thenReturn(workflowPage);

        Page<WorkflowResponse> result = workflowService.listByStatus(WorkflowStatus.DRAFT, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).status()).isEqualTo(WorkflowStatus.DRAFT);
        verify(workflowRepository).findByTenantIdAndStatus(TENANT_ID, WorkflowStatus.DRAFT, pageable);
    }

    @Test
    void getById_shouldReturnWorkflow_whenExists() {
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID))
                .thenReturn(Optional.of(workflow));

        WorkflowResponse result = workflowService.getById(WORKFLOW_ID);

        assertThat(result.id()).isEqualTo(WORKFLOW_ID);
        assertThat(result.name()).isEqualTo("Test Workflow");
        verify(workflowRepository).findByIdAndTenantId(WORKFLOW_ID, TENANT_ID);
    }

    @Test
    void getById_shouldThrowException_whenNotFound() {
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.getById(WORKFLOW_ID))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Workflow not found");
    }

    @Test
    void create_shouldSaveAndReturnWorkflow() {
        WorkflowRequest request = new WorkflowRequest("New Workflow", "New Description", null, null);
        when(workflowRepository.existsByTenantIdAndName(TENANT_ID, "New Workflow")).thenReturn(false);
        when(workflowRepository.save(any(Workflow.class))).thenAnswer(inv -> {
            Workflow w = inv.getArgument(0);
            w.setId(101L);
            w.setCreatedAt(Instant.now());
            w.setUpdatedAt(Instant.now());
            return w;
        });

        WorkflowResponse result = workflowService.create(request);

        assertThat(result.name()).isEqualTo("New Workflow");
        assertThat(result.description()).isEqualTo("New Description");
        assertThat(result.status()).isEqualTo(WorkflowStatus.DRAFT);
        verify(workflowRepository).existsByTenantIdAndName(TENANT_ID, "New Workflow");
        verify(workflowRepository).save(any(Workflow.class));
    }

    @Test
    void create_shouldThrowException_whenNameExists() {
        WorkflowRequest request = new WorkflowRequest("Existing Workflow", "Description", null, null);
        when(workflowRepository.existsByTenantIdAndName(TENANT_ID, "Existing Workflow")).thenReturn(true);

        assertThatThrownBy(() -> workflowService.create(request))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("already exists");

        verify(workflowRepository, never()).save(any());
    }

    @Test
    void update_shouldUpdateAndReturnWorkflow() {
        WorkflowRequest request = new WorkflowRequest("Updated Workflow", "Updated Description", WorkflowStatus.PUBLISHED, null);
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID)).thenReturn(Optional.of(workflow));
        when(workflowRepository.existsByTenantIdAndName(TENANT_ID, "Updated Workflow")).thenReturn(false);
        when(workflowRepository.save(any(Workflow.class))).thenReturn(workflow);

        WorkflowResponse result = workflowService.update(WORKFLOW_ID, request);

        assertThat(result).isNotNull();
        verify(workflowRepository).findByIdAndTenantId(WORKFLOW_ID, TENANT_ID);
        verify(workflowRepository).save(any(Workflow.class));
    }

    @Test
    void update_shouldThrowException_whenWorkflowNotFound() {
        WorkflowRequest request = new WorkflowRequest("Updated Workflow", "Updated Description", null, null);
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.update(WORKFLOW_ID, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Workflow not found");
    }

    @Test
    void update_shouldThrowException_whenNameExists() {
        WorkflowRequest request = new WorkflowRequest("Existing Workflow", "Description", null, null);
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID)).thenReturn(Optional.of(workflow));
        when(workflowRepository.existsByTenantIdAndName(TENANT_ID, "Existing Workflow")).thenReturn(true);

        assertThatThrownBy(() -> workflowService.update(WORKFLOW_ID, request))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void delete_shouldDeleteWorkflow_whenExists() {
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID)).thenReturn(Optional.of(workflow));
        doNothing().when(workflowRepository).delete(workflow);

        workflowService.delete(WORKFLOW_ID);

        verify(workflowRepository).findByIdAndTenantId(WORKFLOW_ID, TENANT_ID);
        verify(workflowRepository).delete(workflow);
    }

    @Test
    void delete_shouldThrowException_whenNotFound() {
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.delete(WORKFLOW_ID))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Workflow not found");
    }

    @Test
    void list_shouldThrowException_whenTenantContextNotSet() {
        TenantContext.clear();
        Pageable pageable = PageRequest.of(0, 20);

        assertThatThrownBy(() -> workflowService.list(pageable))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Tenant context not set");
    }
}

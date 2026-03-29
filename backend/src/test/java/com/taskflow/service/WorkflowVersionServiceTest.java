package com.taskflow.service;

import com.taskflow.dto.WorkflowVersionResponse;
import com.taskflow.dto.WorkflowRunResponse;
import com.taskflow.entity.Tenant;
import com.taskflow.entity.Workflow;
import com.taskflow.entity.WorkflowStatus;
import com.taskflow.entity.WorkflowVersion;
import com.taskflow.entity.WorkflowRun;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.WorkflowRepository;
import com.taskflow.repository.TenantRepository;
import com.taskflow.repository.WorkflowVersionRepository;
import com.taskflow.repository.WorkflowRunRepository;
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
class WorkflowVersionServiceTest {

    private static final Long TENANT_ID = 1L;
    private static final Long WORKFLOW_ID = 100L;

    @Mock
    private WorkflowRepository workflowRepository;

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private WorkflowVersionRepository workflowVersionRepository;

    @Mock
    private WorkflowRunRepository workflowRunRepository;

    @InjectMocks
    private WorkflowService workflowService;

    private Tenant tenant;
    private Workflow workflow;
    private WorkflowVersion version;

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

        version = new WorkflowVersion(workflow, 1, "{}");
        version.setId(1L);
        version.setCreatedAt(Instant.now());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void listVersions_shouldReturnPageOfVersions() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<WorkflowVersion> versionPage = new PageImpl<>(List.of(version), pageable, 1);

        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID))
                .thenReturn(Optional.of(workflow));
        when(workflowVersionRepository.findByWorkflowIdAndTenantId(WORKFLOW_ID, TENANT_ID, pageable))
                .thenReturn(versionPage);

        Page<WorkflowVersionResponse> result = workflowService.listVersions(WORKFLOW_ID, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).workflowId()).isEqualTo(WORKFLOW_ID);
        assertThat(result.getContent().get(0).version()).isEqualTo(1);
        verify(workflowVersionRepository).findByWorkflowIdAndTenantId(WORKFLOW_ID, TENANT_ID, pageable);
    }

    @Test
    void listVersions_shouldThrowException_whenWorkflowNotFound() {
        Pageable pageable = PageRequest.of(0, 20);
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.listVersions(WORKFLOW_ID, pageable))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Workflow not found");
    }

    @Test
    void createVersion_shouldCreateAndReturnVersion() {
        String definition = "{\"nodes\":[]}";
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID))
                .thenReturn(Optional.of(workflow));
        when(workflowVersionRepository.findMaxVersionByWorkflowId(WORKFLOW_ID))
                .thenReturn(1);
        when(workflowVersionRepository.save(any(WorkflowVersion.class))).thenAnswer(inv -> {
            WorkflowVersion v = inv.getArgument(0);
            v.setId(2L);
            v.setCreatedAt(Instant.now());
            return v;
        });
        when(workflowRepository.save(any(Workflow.class))).thenReturn(workflow);

        WorkflowVersionResponse result = workflowService.createVersion(WORKFLOW_ID, definition, null);

        assertThat(result.version()).isEqualTo(2);
        assertThat(result.definition()).isEqualTo(definition);
        verify(workflowVersionRepository).save(any(WorkflowVersion.class));
        verify(workflowRepository).save(any(Workflow.class));
    }

    @Test
    void createVersion_shouldThrowException_whenWorkflowNotFound() {
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.createVersion(WORKFLOW_ID, "{}", null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Workflow not found");
    }

    @Test
    void listRuns_shouldReturnPageOfRuns() {
        Pageable pageable = PageRequest.of(0, 20);
        WorkflowRun run = new WorkflowRun(workflow, 1, "exec-123", tenant);
        run.setId(1L);
        run.setStatus(WorkflowRun.RunStatus.PENDING);
        run.setCreatedAt(Instant.now());

        Page<WorkflowRun> runPage = new PageImpl<>(List.of(run), pageable, 1);

        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID))
                .thenReturn(Optional.of(workflow));
        when(workflowRunRepository.findByWorkflowIdAndTenantId(WORKFLOW_ID, TENANT_ID, pageable))
                .thenReturn(runPage);

        Page<WorkflowRunResponse> result = workflowService.listRuns(WORKFLOW_ID, null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).workflowId()).isEqualTo(WORKFLOW_ID);
        assertThat(result.getContent().get(0).executionId()).isEqualTo("exec-123");
        verify(workflowRunRepository).findByWorkflowIdAndTenantId(WORKFLOW_ID, TENANT_ID, pageable);
    }

    @Test
    void listRuns_shouldFilterByStatus() {
        Pageable pageable = PageRequest.of(0, 20);
        WorkflowRun run = new WorkflowRun(workflow, 1, "exec-123", tenant);
        run.setId(1L);
        run.setStatus(WorkflowRun.RunStatus.SUCCESS);
        run.setCreatedAt(Instant.now());

        Page<WorkflowRun> runPage = new PageImpl<>(List.of(run), pageable, 1);

        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID))
                .thenReturn(Optional.of(workflow));
        when(workflowRunRepository.findByWorkflowIdAndStatusAndTenantId(
                eq(WORKFLOW_ID), eq(WorkflowRun.RunStatus.SUCCESS), eq(TENANT_ID), any(Pageable.class)))
                .thenReturn(runPage);

        Page<WorkflowRunResponse> result = workflowService.listRuns(WORKFLOW_ID, WorkflowRun.RunStatus.SUCCESS, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).status()).isEqualTo(WorkflowRun.RunStatus.SUCCESS);
    }

    @Test
    void listRuns_shouldThrowException_whenWorkflowNotFound() {
        Pageable pageable = PageRequest.of(0, 20);
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.listRuns(WORKFLOW_ID, null, pageable))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Workflow not found");
    }

    @Test
    void createRun_shouldCreateAndReturnRun() {
        String inputData = "{\"key\":\"value\"}";
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID))
                .thenReturn(Optional.of(workflow));
        when(tenantRepository.findById(TENANT_ID))
                .thenReturn(Optional.of(tenant));
        when(workflowRunRepository.save(any(WorkflowRun.class))).thenAnswer(inv -> {
            WorkflowRun r = inv.getArgument(0);
            r.setId(1L);
            r.setCreatedAt(Instant.now());
            return r;
        });

        WorkflowRunResponse result = workflowService.createRun(WORKFLOW_ID, inputData);

        assertThat(result.workflowId()).isEqualTo(WORKFLOW_ID);
        assertThat(result.inputData()).isEqualTo(inputData);
        assertThat(result.status()).isEqualTo(WorkflowRun.RunStatus.PENDING);
        verify(workflowRunRepository).save(any(WorkflowRun.class));
    }

    @Test
    void createRun_shouldThrowException_whenWorkflowNotFound() {
        when(workflowRepository.findByIdAndTenantId(WORKFLOW_ID, TENANT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.createRun(WORKFLOW_ID, "{}"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Workflow not found");
    }

    @Test
    void getRunByExecutionId_shouldReturnRun() {
        String executionId = "exec-123";
        WorkflowRun run = new WorkflowRun(workflow, 1, executionId, tenant);
        run.setId(1L);
        run.setStatus(WorkflowRun.RunStatus.SUCCESS);
        run.setCreatedAt(Instant.now());

        when(workflowRunRepository.findByExecutionId(executionId))
                .thenReturn(Optional.of(run));

        WorkflowRunResponse result = workflowService.getRunByExecutionId(executionId);

        assertThat(result.executionId()).isEqualTo(executionId);
        assertThat(result.status()).isEqualTo(WorkflowRun.RunStatus.SUCCESS);
    }

    @Test
    void getRunByExecutionId_shouldThrowException_whenNotFound() {
        String executionId = "non-existent";
        when(workflowRunRepository.findByExecutionId(executionId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.getRunByExecutionId(executionId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Workflow run not found");
    }

    @Test
    void getRunByExecutionId_shouldThrowException_whenWrongTenant() {
        String executionId = "exec-123";
        Long otherTenantId = 999L;
        Tenant otherTenant = new Tenant("Other Tenant", "other-tenant");
        otherTenant.setId(otherTenantId);

        WorkflowRun run = new WorkflowRun(workflow, 1, executionId, otherTenant);
        run.setId(1L);
        run.setStatus(WorkflowRun.RunStatus.SUCCESS);
        run.setCreatedAt(Instant.now());

        when(workflowRunRepository.findByExecutionId(executionId))
                .thenReturn(Optional.of(run));

        assertThatThrownBy(() -> workflowService.getRunByExecutionId(executionId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Workflow run not found");
    }
}

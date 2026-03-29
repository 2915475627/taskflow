package com.taskflow.service;

import com.taskflow.dto.WorkflowRequest;
import com.taskflow.dto.WorkflowResponse;
import com.taskflow.dto.WorkflowVersionResponse;
import com.taskflow.dto.WorkflowRunResponse;
import com.taskflow.entity.Workflow;
import com.taskflow.entity.WorkflowStatus;
import com.taskflow.entity.WorkflowVersion;
import com.taskflow.entity.WorkflowRun;
import com.taskflow.entity.Tenant;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.exception.ValidationException;
import com.taskflow.repository.WorkflowRepository;
import com.taskflow.repository.TenantRepository;
import com.taskflow.repository.WorkflowVersionRepository;
import com.taskflow.repository.WorkflowRunRepository;
import com.taskflow.security.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WorkflowService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowService.class);

    private final WorkflowRepository workflowRepository;
    private final TenantRepository tenantRepository;
    private final WorkflowVersionRepository workflowVersionRepository;
    private final WorkflowRunRepository workflowRunRepository;

    public WorkflowService(
            WorkflowRepository workflowRepository,
            TenantRepository tenantRepository,
            WorkflowVersionRepository workflowVersionRepository,
            WorkflowRunRepository workflowRunRepository) {
        this.workflowRepository = workflowRepository;
        this.tenantRepository = tenantRepository;
        this.workflowVersionRepository = workflowVersionRepository;
        this.workflowRunRepository = workflowRunRepository;
    }

    @Transactional(readOnly = true)
    public Page<WorkflowResponse> list(Pageable pageable) {
        Long tenantId = getCurrentTenantId();
        log.debug("list_workflows tenantId={} page={}", tenantId, pageable.getPageNumber());

        return workflowRepository.findByTenantId(tenantId, pageable)
                .map(WorkflowResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<WorkflowResponse> listByStatus(WorkflowStatus status, Pageable pageable) {
        Long tenantId = getCurrentTenantId();
        log.debug("list_workflows_by_status tenantId={} status={} page={}", tenantId, status, pageable.getPageNumber());

        return workflowRepository.findByTenantIdAndStatus(tenantId, status, pageable)
                .map(WorkflowResponse::from);
    }

    @Transactional(readOnly = true)
    public WorkflowResponse getById(Long id) {
        Long tenantId = getCurrentTenantId();
        log.debug("get_workflow id={} tenantId={}", id, tenantId);

        Workflow workflow = workflowRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found with id: " + id));

        return WorkflowResponse.from(workflow);
    }

    public WorkflowResponse create(WorkflowRequest request) {
        Long tenantId = getCurrentTenantId();
        log.info("create_workflow name={} tenantId={}", request.name(), tenantId);

        if (workflowRepository.existsByTenantIdAndName(tenantId, request.name())) {
            throw new ValidationException("Workflow with name '" + request.name() + "' already exists");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with id: " + tenantId));

        Workflow workflow = new Workflow();
        workflow.setTenant(tenant);
        workflow.setName(request.name());
        workflow.setDescription(request.description());
        workflow.setStatus(request.status() != null ? request.status() : WorkflowStatus.DRAFT);

        Workflow saved = workflowRepository.save(workflow);
        log.info("workflow_created id={}", saved.getId());

        return WorkflowResponse.from(saved);
    }

    public WorkflowResponse update(Long id, WorkflowRequest request) {
        Long tenantId = getCurrentTenantId();
        log.info("update_workflow id={} tenantId={}", id, tenantId);

        Workflow workflow = workflowRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found with id: " + id));

        if (!workflow.getName().equals(request.name()) &&
                workflowRepository.existsByTenantIdAndName(tenantId, request.name())) {
            throw new ValidationException("Workflow with name '" + request.name() + "' already exists");
        }

        workflow.setName(request.name());
        workflow.setDescription(request.description());
        if (request.status() != null) {
            workflow.setStatus(request.status());
        }

        Workflow saved = workflowRepository.save(workflow);
        log.info("workflow_updated id={}", saved.getId());

        return WorkflowResponse.from(saved);
    }

    public void delete(Long id) {
        Long tenantId = getCurrentTenantId();
        log.info("delete_workflow id={} tenantId={}", id, tenantId);

        Workflow workflow = workflowRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found with id: " + id));

        workflowRepository.delete(workflow);
        log.info("workflow_deleted id={}", id);
    }

    // ==================== Version Management ====================

    @Transactional(readOnly = true)
    public Page<WorkflowVersionResponse> listVersions(Long workflowId, Pageable pageable) {
        Long tenantId = getCurrentTenantId();
        log.debug("list_versions workflowId={} tenantId={}", workflowId, tenantId);

        // Verify workflow exists and belongs to tenant
        workflowRepository.findByIdAndTenantId(workflowId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found with id: " + workflowId));

        return workflowVersionRepository.findByWorkflowIdAndTenantId(workflowId, tenantId, pageable)
                .map(WorkflowVersionResponse::from);
    }

    public WorkflowVersionResponse createVersion(Long workflowId, String definition, String changelog) {
        Long tenantId = getCurrentTenantId();
        log.info("create_version workflowId={} tenantId={}", workflowId, tenantId);

        Workflow workflow = workflowRepository.findByIdAndTenantId(workflowId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found with id: " + workflowId));

        Integer maxVersion = workflowVersionRepository.findMaxVersionByWorkflowId(workflowId);
        Integer newVersion = maxVersion + 1;

        WorkflowVersion version = new WorkflowVersion(workflow, newVersion, definition);
        version.setCreatedAt(java.time.Instant.now());

        WorkflowVersion saved = workflowVersionRepository.save(version);

        // Update workflow's current version
        workflow.setCurrentVersion(newVersion);
        workflowRepository.save(workflow);

        log.info("version_created workflowId={} version={}", workflowId, newVersion);
        return WorkflowVersionResponse.from(saved);
    }

    // ==================== Run Management ====================

    @Transactional(readOnly = true)
    public Page<WorkflowRunResponse> listRuns(Long workflowId, com.taskflow.entity.WorkflowRun.RunStatus status, Pageable pageable) {
        Long tenantId = getCurrentTenantId();
        log.debug("list_runs workflowId={} status={} tenantId={}", workflowId, status, tenantId);

        // Verify workflow exists and belongs to tenant
        workflowRepository.findByIdAndTenantId(workflowId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found with id: " + workflowId));

        Page<com.taskflow.entity.WorkflowRun> runs;
        if (status != null) {
            runs = workflowRunRepository.findByWorkflowIdAndStatusAndTenantId(workflowId, status, tenantId, pageable);
        } else {
            runs = workflowRunRepository.findByWorkflowIdAndTenantId(workflowId, tenantId, pageable);
        }

        return runs.map(WorkflowRunResponse::from);
    }

    public WorkflowRunResponse createRun(Long workflowId, String inputData) {
        Long tenantId = getCurrentTenantId();
        log.info("create_run workflowId={} tenantId={}", workflowId, tenantId);

        Workflow workflow = workflowRepository.findByIdAndTenantId(workflowId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found with id: " + workflowId));

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with id: " + tenantId));

        String executionId = java.util.UUID.randomUUID().toString();

        WorkflowRun run = new WorkflowRun(workflow, workflow.getCurrentVersion(), executionId, tenant);
        run.setInputData(inputData);
        run.setCreatedAt(java.time.Instant.now());

        WorkflowRun saved = workflowRunRepository.save(run);

        log.info("run_created workflowId={} executionId={}", workflowId, executionId);
        return WorkflowRunResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public WorkflowRunResponse getRunByExecutionId(String executionId) {
        Long tenantId = getCurrentTenantId();
        log.debug("get_run_by_execution_id executionId={} tenantId={}", executionId, tenantId);

        WorkflowRun run = workflowRunRepository.findByExecutionId(executionId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow run not found with executionId: " + executionId));

        if (!run.getTenant().getId().equals(tenantId)) {
            throw new ResourceNotFoundException("Workflow run not found with executionId: " + executionId);
        }

        return WorkflowRunResponse.from(run);
    }

    private Long getCurrentTenantId() {
        Long tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not set");
        }
        return tenantId;
    }
}

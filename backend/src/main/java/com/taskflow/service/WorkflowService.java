package com.taskflow.service;

import com.taskflow.dto.WorkflowRequest;
import com.taskflow.dto.WorkflowResponse;
import com.taskflow.entity.Workflow;
import com.taskflow.entity.WorkflowStatus;
import com.taskflow.entity.WorkflowVersion;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.exception.ValidationException;
import com.taskflow.repository.WorkflowRepository;
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

    public WorkflowService(WorkflowRepository workflowRepository) {
        this.workflowRepository = workflowRepository;
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

        Workflow workflow = new Workflow();
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

    private Long getCurrentTenantId() {
        Long tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not set");
        }
        return tenantId;
    }
}

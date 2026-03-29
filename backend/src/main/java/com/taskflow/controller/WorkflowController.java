package com.taskflow.controller;

import com.taskflow.dto.ApiResponse;
import com.taskflow.dto.WorkflowRequest;
import com.taskflow.dto.WorkflowResponse;
import com.taskflow.dto.WorkflowVersionResponse;
import com.taskflow.dto.WorkflowRunResponse;
import com.taskflow.dto.ExecutionResponse;
import com.taskflow.dto.VersionCreateRequest;
import com.taskflow.dto.RunCreateRequest;
import com.taskflow.entity.WorkflowStatus;
import com.taskflow.entity.WorkflowRun.RunStatus;
import com.taskflow.service.WorkflowService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workflows")
public class WorkflowController {

    private final WorkflowService workflowService;

    public WorkflowController(WorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<WorkflowResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) WorkflowStatus status,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, limit, sort);

        Page<WorkflowResponse> workflows = status != null
                ? workflowService.listByStatus(status, pageable)
                : workflowService.list(pageable);

        ApiResponse.Meta meta = new ApiResponse.Meta(
                (int) workflows.getTotalElements(),
                workflows.getNumber(),
                workflows.getSize()
        );

        return ResponseEntity.ok(ApiResponse.success(workflows.getContent(), meta));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WorkflowResponse>> getById(@PathVariable Long id) {
        WorkflowResponse workflow = workflowService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(workflow));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WorkflowResponse>> create(@Valid @RequestBody WorkflowRequest request) {
        WorkflowResponse workflow = workflowService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(workflow));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WorkflowResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody WorkflowRequest request
    ) {
        WorkflowResponse workflow = workflowService.update(id, request);
        return ResponseEntity.ok(ApiResponse.success(workflow));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        workflowService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Version Endpoints ====================

    @GetMapping("/{id}/versions")
    public ResponseEntity<ApiResponse<java.util.List<WorkflowVersionResponse>>> listVersions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit
    ) {
        Pageable pageable = PageRequest.of(page, limit, Sort.by("version").descending());
        Page<WorkflowVersionResponse> versions = workflowService.listVersions(id, pageable);

        ApiResponse.Meta meta = new ApiResponse.Meta(
                (int) versions.getTotalElements(),
                versions.getNumber(),
                versions.getSize()
        );

        return ResponseEntity.ok(ApiResponse.success(versions.getContent(), meta));
    }

    @PostMapping("/{id}/versions")
    public ResponseEntity<ApiResponse<WorkflowVersionResponse>> createVersion(
            @PathVariable Long id,
            @RequestBody VersionCreateRequest request
    ) {
        WorkflowVersionResponse version = workflowService.createVersion(id, request.definition(), request.changelog());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(version));
    }

    // ==================== Run Endpoints ====================

    @GetMapping("/{id}/runs")
    public ResponseEntity<ApiResponse<java.util.List<WorkflowRunResponse>>> listRuns(
            @PathVariable Long id,
            @RequestParam(required = false) RunStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit
    ) {
        Pageable pageable = PageRequest.of(page, limit, Sort.by("createdAt").descending());
        Page<WorkflowRunResponse> runs = workflowService.listRuns(id, status, pageable);

        ApiResponse.Meta meta = new ApiResponse.Meta(
                (int) runs.getTotalElements(),
                runs.getNumber(),
                runs.getSize()
        );

        return ResponseEntity.ok(ApiResponse.success(runs.getContent(), meta));
    }

    @PostMapping("/{id}/runs")
    public ResponseEntity<ApiResponse<WorkflowRunResponse>> createRun(
            @PathVariable Long id,
            @RequestBody RunCreateRequest request
    ) {
        WorkflowRunResponse run = workflowService.createRun(id, request.inputData());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(run));
    }

    @GetMapping("/runs/{executionId}")
    public ResponseEntity<ApiResponse<WorkflowRunResponse>> getRunByExecutionId(@PathVariable String executionId) {
        WorkflowRunResponse run = workflowService.getRunByExecutionId(executionId);
        return ResponseEntity.ok(ApiResponse.success(run));
    }

    // ==================== Execution Endpoint ====================

    @PostMapping("/{id}/execute")
    public ResponseEntity<ApiResponse<ExecutionResponse>> executeWorkflow(
            @PathVariable Long id,
            @RequestBody(required = false) RunCreateRequest request
    ) {
        ExecutionResponse response = workflowService.executeWorkflow(id, request != null ? request.inputData() : null);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}

package com.taskflow.controller;

import com.taskflow.dto.ApiResponse;
import com.taskflow.dto.WorkflowRequest;
import com.taskflow.dto.WorkflowResponse;
import com.taskflow.entity.WorkflowStatus;
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
    public ResponseEntity<ApiResponse<WorkflowResponse>> list(
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
}

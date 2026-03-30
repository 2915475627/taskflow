package com.taskflow.controller;

import com.taskflow.dto.ApiResponse;
import com.taskflow.dto.ScheduleCreateRequest;
import com.taskflow.dto.ScheduleResponse;
import com.taskflow.security.TenantContext;
import com.taskflow.service.ScheduleService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing workflow schedules.
 */
@RestController
@RequestMapping("/api")
public class ScheduleController {

    private static final Logger log = LoggerFactory.getLogger(ScheduleController.class);

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    /**
     * Create a new schedule for a workflow.
     */
    @PostMapping("/workflows/{workflowId}/schedules")
    public ResponseEntity<ApiResponse<ScheduleResponse>> createSchedule(
            @PathVariable Long workflowId,
            @Valid @RequestBody ScheduleCreateRequest request) {

        Long tenantId = TenantContext.getCurrentTenantId();
        log.info("Creating schedule for workflow {} tenant {}", workflowId, tenantId);

        ScheduleResponse response = scheduleService.createSchedule(workflowId, request);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Get a schedule by ID.
     */
    @GetMapping("/schedules/{scheduleId}")
    public ResponseEntity<ApiResponse<ScheduleResponse>> getSchedule(@PathVariable Long scheduleId) {

        Long tenantId = TenantContext.getCurrentTenantId();
        log.debug("Getting schedule {} tenant {}", scheduleId, tenantId);

        ScheduleResponse response = scheduleService.getSchedule(scheduleId);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * List all schedules for the current tenant.
     */
    @GetMapping("/schedules")
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> listSchedules() {

        Long tenantId = TenantContext.getCurrentTenantId();
        log.debug("Listing schedules for tenant {}", tenantId);

        List<ScheduleResponse> schedules = scheduleService.listSchedules();

        return ResponseEntity.ok(ApiResponse.success(schedules));
    }

    /**
     * List schedules for a specific workflow.
     */
    @GetMapping("/workflows/{workflowId}/schedules")
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> listWorkflowSchedules(
            @PathVariable Long workflowId) {

        Long tenantId = TenantContext.getCurrentTenantId();
        log.debug("Listing schedules for workflow {} tenant {}", workflowId, tenantId);

        List<ScheduleResponse> schedules = scheduleService.listSchedulesForWorkflow(workflowId);

        return ResponseEntity.ok(ApiResponse.success(schedules));
    }

    /**
     * Update a schedule.
     */
    @PutMapping("/schedules/{scheduleId}")
    public ResponseEntity<ApiResponse<ScheduleResponse>> updateSchedule(
            @PathVariable Long scheduleId,
            @Valid @RequestBody ScheduleCreateRequest request) {

        Long tenantId = TenantContext.getCurrentTenantId();
        log.info("Updating schedule {} tenant {}", scheduleId, tenantId);

        ScheduleResponse response = scheduleService.updateSchedule(scheduleId, request);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Enable or disable a schedule.
     */
    @PatchMapping("/schedules/{scheduleId}/enabled")
    public ResponseEntity<ApiResponse<ScheduleResponse>> setScheduleEnabled(
            @PathVariable Long scheduleId,
            @RequestParam boolean enabled) {

        Long tenantId = TenantContext.getCurrentTenantId();
        log.info("Setting schedule {} enabled={} tenant {}", scheduleId, enabled, tenantId);

        ScheduleResponse response = scheduleService.setScheduleEnabled(scheduleId, enabled);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Delete a schedule.
     */
    @DeleteMapping("/schedules/{scheduleId}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable Long scheduleId) {

        Long tenantId = TenantContext.getCurrentTenantId();
        log.info("Deleting schedule {} tenant {}", scheduleId, tenantId);

        scheduleService.deleteSchedule(scheduleId);

        return ResponseEntity.noContent().build();
    }
}
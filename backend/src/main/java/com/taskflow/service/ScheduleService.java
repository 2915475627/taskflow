package com.taskflow.service;

import com.taskflow.dto.ScheduleCreateRequest;
import com.taskflow.dto.ScheduleResponse;
import com.taskflow.entity.Workflow;
import com.taskflow.entity.WorkflowRun;
import com.taskflow.entity.WorkflowRun.RunStatus;
import com.taskflow.entity.WorkflowSchedule;
import com.taskflow.entity.Tenant;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.exception.ValidationException;
import com.taskflow.repository.WorkflowRepository;
import com.taskflow.repository.WorkflowRunRepository;
import com.taskflow.repository.WorkflowScheduleRepository;
import com.taskflow.repository.TenantRepository;
import com.taskflow.security.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing workflow schedules.
 */
@Service
@Transactional
public class ScheduleService {

    private static final Logger log = LoggerFactory.getLogger(ScheduleService.class);

    private final WorkflowScheduleRepository scheduleRepository;
    private final WorkflowRepository workflowRepository;
    private final WorkflowRunRepository workflowRunRepository;
    private final TenantRepository tenantRepository;
    private final ExecutionEngineService executionEngineService;

    public ScheduleService(
            WorkflowScheduleRepository scheduleRepository,
            WorkflowRepository workflowRepository,
            WorkflowRunRepository workflowRunRepository,
            TenantRepository tenantRepository,
            ExecutionEngineService executionEngineService) {
        this.scheduleRepository = scheduleRepository;
        this.workflowRepository = workflowRepository;
        this.workflowRunRepository = workflowRunRepository;
        this.tenantRepository = tenantRepository;
        this.executionEngineService = executionEngineService;
    }

    /**
     * Create a new schedule for a workflow.
     */
    public ScheduleResponse createSchedule(Long workflowId, ScheduleCreateRequest request) {
        Long tenantId = getCurrentTenantId();
        log.info("create_schedule workflowId={} tenantId={}", workflowId, tenantId);

        Workflow workflow = workflowRepository.findByIdAndTenantId(workflowId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + workflowId));

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found: " + tenantId));

        // Validate cron expression
        validateCronExpression(request.cronExpression());

        WorkflowSchedule schedule = new WorkflowSchedule(workflow, tenant, request.cronExpression());
        schedule.setTimezone(request.timezone());
        schedule.setDescription(request.description());
        schedule.setInputData(request.inputData());
        schedule.setEnabled(true);
        schedule.setCreatedAt(Instant.now());
        schedule.setUpdatedAt(Instant.now());

        WorkflowSchedule saved = scheduleRepository.save(schedule);

        log.info("schedule_created scheduleId={} workflowId={}", saved.getId(), workflowId);

        return ScheduleResponse.from(saved);
    }

    /**
     * Get a schedule by ID.
     */
    @Transactional(readOnly = true)
    public ScheduleResponse getSchedule(Long scheduleId) {
        Long tenantId = getCurrentTenantId();
        log.debug("get_schedule scheduleId={} tenantId={}", scheduleId, tenantId);

        WorkflowSchedule schedule = scheduleRepository.findByIdAndTenantId(scheduleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found: " + scheduleId));

        return ScheduleResponse.from(schedule);
    }

    /**
     * List all schedules for the current tenant.
     */
    @Transactional(readOnly = true)
    public List<ScheduleResponse> listSchedules() {
        Long tenantId = getCurrentTenantId();
        log.debug("list_schedules tenantId={}", tenantId);

        return scheduleRepository.findByTenantId(tenantId).stream()
                .map(ScheduleResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * List schedules for a specific workflow.
     */
    @Transactional(readOnly = true)
    public List<ScheduleResponse> listSchedulesForWorkflow(Long workflowId) {
        Long tenantId = getCurrentTenantId();
        log.debug("list_workflow_schedules workflowId={} tenantId={}", workflowId, tenantId);

        return scheduleRepository.findByWorkflowIdAndTenantId(workflowId, tenantId).stream()
                .map(ScheduleResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Update a schedule.
     */
    public ScheduleResponse updateSchedule(Long scheduleId, ScheduleCreateRequest request) {
        Long tenantId = getCurrentTenantId();
        log.info("update_schedule scheduleId={} tenantId={}", scheduleId, tenantId);

        WorkflowSchedule schedule = scheduleRepository.findByIdAndTenantId(scheduleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found: " + scheduleId));

        // Validate cron expression if changing
        if (request.cronExpression() != null && !request.cronExpression().equals(schedule.getCronExpression())) {
            validateCronExpression(request.cronExpression());
            schedule.setCronExpression(request.cronExpression());
        }

        if (request.timezone() != null) {
            schedule.setTimezone(request.timezone());
        }

        if (request.description() != null) {
            schedule.setDescription(request.description());
        }

        if (request.inputData() != null) {
            schedule.setInputData(request.inputData());
        }

        schedule.setUpdatedAt(Instant.now());

        WorkflowSchedule saved = scheduleRepository.save(schedule);

        log.info("schedule_updated scheduleId={}", scheduleId);

        return ScheduleResponse.from(saved);
    }

    /**
     * Enable or disable a schedule.
     */
    public ScheduleResponse setScheduleEnabled(Long scheduleId, boolean enabled) {
        Long tenantId = getCurrentTenantId();
        log.info("set_schedule_enabled scheduleId={} enabled={} tenantId={}", scheduleId, enabled, tenantId);

        WorkflowSchedule schedule = scheduleRepository.findByIdAndTenantId(scheduleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found: " + scheduleId));

        schedule.setEnabled(enabled);
        schedule.setUpdatedAt(Instant.now());

        WorkflowSchedule saved = scheduleRepository.save(schedule);

        log.info("schedule_enabled={} scheduleId={}", enabled, scheduleId);

        return ScheduleResponse.from(saved);
    }

    /**
     * Delete a schedule.
     */
    public void deleteSchedule(Long scheduleId) {
        Long tenantId = getCurrentTenantId();
        log.info("delete_schedule scheduleId={} tenantId={}", scheduleId, tenantId);

        WorkflowSchedule schedule = scheduleRepository.findByIdAndTenantId(scheduleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found: " + scheduleId));

        scheduleRepository.delete(schedule);

        log.info("schedule_deleted scheduleId={}", scheduleId);
    }

    /**
     * Trigger a scheduled workflow execution.
     * This method is called by the scheduler.
     */
    public WorkflowRun triggerScheduledExecution(WorkflowSchedule schedule) {
        log.info("trigger_scheduled scheduleId={} workflowId={}",
                schedule.getId(), schedule.getWorkflow().getId());

        String executionId = UUID.randomUUID().toString();

        WorkflowRun run = new WorkflowRun(
                schedule.getWorkflow(),
                schedule.getWorkflow().getCurrentVersion(),
                executionId,
                schedule.getTenant()
        );
        run.setInputData(schedule.getInputData());
        run.setStatus(RunStatus.PENDING);
        run.setCreatedAt(Instant.now());

        WorkflowRun saved = workflowRunRepository.save(run);

        // Update last triggered time
        schedule.setLastTriggeredAt(Instant.now());
        scheduleRepository.save(schedule);

        // Trigger execution
        try {
            executionEngineService.executeRun(saved.getId());
        } catch (Exception e) {
            log.error("Scheduled execution failed for run {}: {}", saved.getId(), e.getMessage());
        }

        log.info("scheduled_triggered scheduleId={} runId={}", schedule.getId(), saved.getId());

        return saved;
    }

    /**
     * Validate a cron expression.
     */
    private void validateCronExpression(String cronExpression) {
        if (cronExpression == null || cronExpression.isBlank()) {
            throw new ValidationException("Cron expression cannot be empty");
        }

        // Basic validation: cron expressions have 5-6 fields separated by spaces
        String[] parts = cronExpression.trim().split("\\s+");
        if (parts.length < 5 || parts.length > 6) {
            throw new ValidationException("Invalid cron expression: must have 5 or 6 fields");
        }

        // Additional validation could be added here using a cron library
        // For now, we just check the basic format
    }

    private Long getCurrentTenantId() {
        Long tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not set");
        }
        return tenantId;
    }
}
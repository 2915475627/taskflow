package com.taskflow.scheduler;

import com.taskflow.entity.WorkflowSchedule;
import com.taskflow.repository.WorkflowScheduleRepository;
import com.taskflow.service.ScheduleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Scheduler component that triggers workflow executions based on schedules.
 * Runs every minute and checks for schedules that should be triggered.
 */
@Component
public class WorkflowScheduler {

    private static final Logger log = LoggerFactory.getLogger(WorkflowScheduler.class);

    private final WorkflowScheduleRepository scheduleRepository;
    private final ScheduleService scheduleService;

    // Simple flag to prevent concurrent executions
    private final AtomicBoolean running = new AtomicBoolean(false);

    public WorkflowScheduler(
            WorkflowScheduleRepository scheduleRepository,
            ScheduleService scheduleService) {
        this.scheduleRepository = scheduleRepository;
        this.scheduleService = scheduleService;
    }

    /**
     * Check and trigger scheduled workflows every minute.
     * Uses fixedRate to ensure consistent timing regardless of execution duration.
     */
    @Scheduled(fixedRate = 60000) // Every 60 seconds
    public void checkScheduledWorkflows() {
        // Prevent concurrent executions
        if (!running.compareAndSet(false, true)) {
            log.debug("Scheduler already running, skipping this cycle");
            return;
        }

        try {
            log.debug("Checking for scheduled workflows to trigger");

            List<WorkflowSchedule> enabledSchedules = scheduleRepository.findByEnabledTrue();

            for (WorkflowSchedule schedule : enabledSchedules) {
                try {
                    if (shouldTrigger(schedule)) {
                        scheduleService.triggerScheduledExecution(schedule);
                    }
                } catch (Exception e) {
                    log.error("Failed to trigger schedule {}: {}", schedule.getId(), e.getMessage());
                }
            }

        } finally {
            running.set(false);
        }
    }

    /**
     * Determine if a schedule should be triggered at the current time.
     */
    private boolean shouldTrigger(WorkflowSchedule schedule) {
        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(schedule.getTimezone());
        } catch (Exception e) {
            log.warn("Invalid timezone {} for schedule {}, defaulting to UTC",
                    schedule.getTimezone(), schedule.getId());
            zoneId = ZoneId.of("UTC");
        }

        ZonedDateTime now = ZonedDateTime.now(zoneId);
        ZonedDateTime lastTriggered = schedule.getLastTriggeredAt() != null
                ? ZonedDateTime.ofInstant(schedule.getLastTriggeredAt(), zoneId)
                : null;

        // Simple cron matching for minute-level granularity
        // For production, consider using a proper cron library like cron-utils
        String[] parts = schedule.getCronExpression().trim().split("\\s+");

        // We support 5-field (minute granularity) and 6-field (second granularity) cron
        if (parts.length == 5) {
            // Format: minute hour day-of-month month day-of-week
            return matchesCron(now.getMinute(), parts[0]) &&
                   matchesCron(now.getHour(), parts[1]) &&
                   matchesCron(now.getDayOfMonth(), parts[2]) &&
                   matchesCron(now.getMonthValue(), parts[3]) &&
                   matchesCron(now.getDayOfWeek().getValue(), parts[4]);
        } else if (parts.length == 6) {
            // Format: second minute hour day-of-month month day-of-week
            return matchesCron(now.getSecond(), parts[0]) &&
                   matchesCron(now.getMinute(), parts[1]) &&
                   matchesCron(now.getHour(), parts[2]) &&
                   matchesCron(now.getDayOfMonth(), parts[3]) &&
                   matchesCron(now.getMonthValue(), parts[4]) &&
                   matchesCron(now.getDayOfWeek().getValue(), parts[5]);
        }

        return false;
    }

    /**
     * Check if a cron field matches the current value.
     * Supports: specific values, wildcards (asterisk), ranges (e.g., 1-5), steps (e.g., star-slash-5)
     */
    private boolean matchesCron(int currentValue, String field) {
        if (field.equals("*")) {
            return true;
        }

        if (field.startsWith("*/")) {
            // Step value, e.g., */5 means every 5
            int step = Integer.parseInt(field.substring(2));
            return currentValue % step == 0;
        }

        if (field.contains("-")) {
            // Range, e.g., 1-5 means 1,2,3,4,5
            String[] range = field.split("-");
            int start = Integer.parseInt(range[0]);
            int end = Integer.parseInt(range[1]);
            return currentValue >= start && currentValue <= end;
        }

        if (field.contains(",")) {
            // List, e.g., 1,3,5
            String[] values = field.split(",");
            for (String value : values) {
                if (Integer.parseInt(value.trim()) == currentValue) {
                    return true;
                }
            }
            return false;
        }

        // Single value
        return Integer.parseInt(field) == currentValue;
    }
}
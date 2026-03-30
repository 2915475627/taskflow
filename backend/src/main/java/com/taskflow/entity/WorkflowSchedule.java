package com.taskflow.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.ZoneId;

/**
 * Entity for scheduling workflow execution at recurring intervals.
 */
@Entity
@Table(name = "workflow_schedules")
public class WorkflowSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    /**
     * Cron expression for the schedule.
     * Format: "second minute hour day-of-month month day-of-week"
     * Examples: "0 0 * * * *" (every hour), "0 0 9 * * *" (every day at 9am)
     */
    @Column(name = "cron_expression", nullable = false)
    private String cronExpression;

    /**
     * Timezone for the cron schedule (e.g., "Asia/Shanghai", "UTC")
     */
    @Column(name = "timezone")
    private String timezone = "UTC";

    /**
     * Whether this schedule is currently enabled.
     */
    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    /**
     * Optional description for the schedule.
     */
    @Column(name = "description")
    private String description;

    /**
     * Input data to pass to the workflow when triggered.
     */
    @Column(name = "input_data", columnDefinition = "TEXT")
    private String inputData;

    /**
     * When this schedule was last triggered.
     */
    @Column(name = "last_triggered_at")
    private Instant lastTriggeredAt;

    /**
     * When this schedule was created.
     */
    @Column(name = "created_at")
    private Instant createdAt;

    /**
     * When this schedule was last updated.
     */
    @Column(name = "updated_at")
    private Instant updatedAt;

    public WorkflowSchedule() {
    }

    public WorkflowSchedule(Workflow workflow, Tenant tenant, String cronExpression) {
        this.workflow = workflow;
        this.tenant = tenant;
        this.cronExpression = cronExpression;
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Workflow getWorkflow() {
        return workflow;
    }

    public void setWorkflow(Workflow workflow) {
        this.workflow = workflow;
    }

    public Tenant getTenant() {
        return tenant;
    }

    public void setTenant(Tenant tenant) {
        this.tenant = tenant;
    }

    public String getCronExpression() {
        return cronExpression;
    }

    public void setCronExpression(String cronExpression) {
        this.cronExpression = cronExpression;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getInputData() {
        return inputData;
    }

    public void setInputData(String inputData) {
        this.inputData = inputData;
    }

    public Instant getLastTriggeredAt() {
        return lastTriggeredAt;
    }

    public void setLastTriggeredAt(Instant lastTriggeredAt) {
        this.lastTriggeredAt = lastTriggeredAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
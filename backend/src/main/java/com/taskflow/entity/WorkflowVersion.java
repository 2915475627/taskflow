package com.taskflow.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "workflow_versions")
public class WorkflowVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;

    @Column(nullable = false)
    private Integer version;

    @Column(columnDefinition = "jsonb", nullable = false)
    private String definition;

    @Column(name = "created_at")
    private Instant createdAt;

    public WorkflowVersion() {
    }

    public WorkflowVersion(Workflow workflow, Integer version, String definition) {
        this.workflow = workflow;
        this.version = version;
        this.definition = definition;
    }

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

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public String getDefinition() {
        return definition;
    }

    public void setDefinition(String definition) {
        this.definition = definition;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}

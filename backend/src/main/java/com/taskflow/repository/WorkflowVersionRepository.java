package com.taskflow.repository;

import com.taskflow.entity.WorkflowVersion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowVersionRepository extends JpaRepository<WorkflowVersion, Long> {

    List<WorkflowVersion> findByWorkflowIdOrderByVersionDesc(Long workflowId);

    Page<WorkflowVersion> findByWorkflowId(Long workflowId, Pageable pageable);

    @Query("SELECT wv FROM WorkflowVersion wv WHERE wv.workflow.id = :workflowId AND wv.workflow.tenant.id = :tenantId ORDER BY wv.version DESC")
    Page<WorkflowVersion> findByWorkflowIdAndTenantId(@Param("workflowId") Long workflowId, @Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT wv FROM WorkflowVersion wv WHERE wv.workflow.id = :workflowId AND wv.version = :version AND wv.workflow.tenant.id = :tenantId")
    Optional<WorkflowVersion> findByWorkflowIdAndVersion(@Param("workflowId") Long workflowId, @Param("version") Integer version, @Param("tenantId") Long tenantId);

    @Query("SELECT COALESCE(MAX(wv.version), 0) FROM WorkflowVersion wv WHERE wv.workflow.id = :workflowId")
    Integer findMaxVersionByWorkflowId(@Param("workflowId") Long workflowId);

    boolean existsByWorkflowIdAndVersion(Long workflowId, Integer version);
}

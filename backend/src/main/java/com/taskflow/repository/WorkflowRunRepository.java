package com.taskflow.repository;

import com.taskflow.entity.WorkflowRun;
import com.taskflow.entity.WorkflowRun.RunStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WorkflowRunRepository extends JpaRepository<WorkflowRun, Long> {

    Page<WorkflowRun> findByWorkflowId(Long workflowId, Pageable pageable);

    Page<WorkflowRun> findByWorkflowIdAndStatus(Long workflowId, RunStatus status, Pageable pageable);

    @Query("SELECT wr FROM WorkflowRun wr WHERE wr.workflow.id = :workflowId AND wr.tenant.id = :tenantId ORDER BY wr.createdAt DESC")
    Page<WorkflowRun> findByWorkflowIdAndTenantId(@Param("workflowId") Long workflowId, @Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT wr FROM WorkflowRun wr WHERE wr.workflow.id = :workflowId AND wr.status = :status AND wr.tenant.id = :tenantId ORDER BY wr.createdAt DESC")
    Page<WorkflowRun> findByWorkflowIdAndStatusAndTenantId(@Param("workflowId") Long workflowId, @Param("status") RunStatus status, @Param("tenantId") Long tenantId, Pageable pageable);

    Optional<WorkflowRun> findByExecutionId(String executionId);

    Optional<WorkflowRun> findByIdAndTenantId(Long id, Long tenantId);

    long countByWorkflowId(Long workflowId);

    @Query("SELECT COUNT(wr) FROM WorkflowRun wr WHERE wr.workflow.id = :workflowId AND wr.status = :status")
    long countByWorkflowIdAndStatus(@Param("workflowId") Long workflowId, @Param("status") RunStatus status);
}

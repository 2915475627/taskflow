package com.taskflow.repository;

import com.taskflow.entity.WorkflowSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowScheduleRepository extends JpaRepository<WorkflowSchedule, Long> {

    List<WorkflowSchedule> findByTenantId(Long tenantId);

    List<WorkflowSchedule> findByTenantIdAndEnabled(Long tenantId, boolean enabled);

    Optional<WorkflowSchedule> findByIdAndTenantId(Long id, Long tenantId);

    List<WorkflowSchedule> findByWorkflowIdAndTenantId(Long workflowId, Long tenantId);

    List<WorkflowSchedule> findByEnabledTrue();
}
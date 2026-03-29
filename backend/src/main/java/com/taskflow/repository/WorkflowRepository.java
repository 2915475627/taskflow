package com.taskflow.repository;

import com.taskflow.entity.Workflow;
import com.taskflow.entity.WorkflowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WorkflowRepository extends JpaRepository<Workflow, Long> {

    Page<Workflow> findByTenantId(Long tenantId, Pageable pageable);

    Page<Workflow> findByTenantIdAndStatus(Long tenantId, WorkflowStatus status, Pageable pageable);

    Optional<Workflow> findByIdAndTenantId(Long id, Long tenantId);

    @Query("SELECT w FROM Workflow w LEFT JOIN FETCH w.versions WHERE w.id = :id AND w.tenant.id = :tenantId")
    Optional<Workflow> findByIdAndTenantIdWithVersions(@Param("id") Long id, @Param("tenantId") Long tenantId);

    boolean existsByTenantIdAndName(Long tenantId, String name);

    long countByTenantId(Long tenantId);
}

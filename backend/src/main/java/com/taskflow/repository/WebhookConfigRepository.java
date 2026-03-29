package com.taskflow.repository;

import com.taskflow.entity.WebhookConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WebhookConfigRepository extends JpaRepository<WebhookConfig, Long> {

    List<WebhookConfig> findByWorkflowIdAndEnabled(Long workflowId, boolean enabled);

    Optional<WebhookConfig> findByWorkflowIdAndTenantId(Long workflowId, Long tenantId);

    List<WebhookConfig> findByTenantIdAndEnabled(Long tenantId, boolean enabled);
}

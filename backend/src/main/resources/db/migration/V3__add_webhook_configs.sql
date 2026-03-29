-- V3__add_webhook_configs.sql
-- Create webhook_configs table
CREATE TABLE webhook_configs (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    callback_url VARCHAR(2048) NOT NULL,
    secret VARCHAR(256) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_configs_workflow_id ON webhook_configs(workflow_id);
CREATE INDEX idx_webhook_configs_tenant_id ON webhook_configs(tenant_id);

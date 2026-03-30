import axios from 'axios';
import type { Workflow, WorkflowListItem } from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const workflowApi = {
  async getAll(): Promise<WorkflowListItem[]> {
    const response = await api.get<{ data: WorkflowListItem[] }>('/workflows');
    return response.data.data;
  },

  async getById(id: string): Promise<Workflow> {
    const response = await api.get<{ data: Workflow }>(`/workflows/${id}`);
    return response.data.data;
  },

  async create(workflow: Partial<Workflow>): Promise<Workflow> {
    const response = await api.post<{ data: Workflow }>('/workflows', workflow);
    return response.data.data;
  },

  async update(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    const response = await api.put<{ data: Workflow }>(`/workflows/${id}`, workflow);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },
};

export const triggerApi = {
  async deploy(workflowId: string): Promise<{ version: number; status: string; deployedAt: string }> {
    const response = await api.post<{ data: { version: number; status: string; deployedAt: string } }>(
      `/triggers/${workflowId}/deploy`
    );
    return response.data.data;
  },

  async undeploy(workflowId: string): Promise<{ status: string }> {
    const response = await api.post<{ data: { status: string } }>(
      `/triggers/${workflowId}/undeploy`
    );
    return response.data.data;
  },

  async getVersions(workflowId: string): Promise<Array<{ version: number; status: string; createdAt: string }>> {
    const response = await api.get<{ data: Array<{ version: number; status: string; createdAt: string }> }>(
      `/triggers/${workflowId}/versions`
    );
    return response.data.data;
  },
};

export interface WorkflowExecuteResponse {
  runId: number;
  executionId: string;
  status: string;
  message?: string;
}

export interface WorkflowRunStatus {
  runId: number;
  executionId: string;
  status: string;
  outputData?: Record<string, unknown>;
  nodeOutputs?: Record<string, unknown>;
}

export interface WorkflowVersionResponse {
  id: number;
  version: number;
  definition: string;
  changelog?: string;
  createdAt: string;
}

export const versionApi = {
  async create(
    workflowId: string,
    definition: string,
    changelog?: string
  ): Promise<WorkflowVersionResponse> {
    const response = await api.post<{ success: boolean; data: WorkflowVersionResponse }>(
      `/workflows/${workflowId}/versions`,
      { definition, changelog }
    );
    return response.data.data;
  },

  async list(workflowId: string): Promise<WorkflowVersionResponse[]> {
    const response = await api.get<{ success: boolean; data: WorkflowVersionResponse[] }>(
      `/workflows/${workflowId}/versions`
    );
    return response.data.data;
  },
};

export const executionApi = {
  async execute(workflowId: string): Promise<WorkflowExecuteResponse> {
    const response = await api.post<{ success: boolean; data: WorkflowExecuteResponse }>(
      `/workflows/${workflowId}/execute`
    );
    return response.data.data;
  },

  async getRunStatus(executionId: string): Promise<WorkflowRunStatus> {
    const response = await api.get<{ success: boolean; data: WorkflowRunStatus }>(
      `/workflows/runs/${executionId}`
    );
    return response.data.data;
  },
};

export interface WebhookTriggerRequest {
  payload?: Record<string, unknown>;
}

export interface WebhookTriggerResponse {
  runId: number;
  executionId: string;
  status: string;
  message?: string;
}

export const webhookApi = {
  async trigger(workflowId: string, request?: WebhookTriggerRequest): Promise<WebhookTriggerResponse> {
    const response = await api.post<{ success: boolean; data: WebhookTriggerResponse }>(
      `/webhooks/trigger/${workflowId}`,
      request || {}
    );
    return response.data.data;
  },
};

export interface ScheduleCreateRequest {
  cronExpression: string;
  timezone?: string;
  description?: string;
  inputData?: string;
}

export interface ScheduleResponse {
  id: number;
  workflowId: number;
  workflowName: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  description?: string;
  inputData?: string;
  lastTriggeredAt?: string;
  createdAt: string;
}

export const scheduleApi = {
  async create(workflowId: string, request: ScheduleCreateRequest): Promise<ScheduleResponse> {
    const response = await api.post<{ success: boolean; data: ScheduleResponse }>(
      `/workflows/${workflowId}/schedules`,
      request
    );
    return response.data.data;
  },

  async get(scheduleId: number): Promise<ScheduleResponse> {
    const response = await api.get<{ success: boolean; data: ScheduleResponse }>(
      `/schedules/${scheduleId}`
    );
    return response.data.data;
  },

  async list(): Promise<ScheduleResponse[]> {
    const response = await api.get<{ success: boolean; data: ScheduleResponse[] }>(
      '/schedules'
    );
    return response.data.data;
  },

  async listByWorkflow(workflowId: string): Promise<ScheduleResponse[]> {
    const response = await api.get<{ success: boolean; data: ScheduleResponse[] }>(
      `/workflows/${workflowId}/schedules`
    );
    return response.data.data;
  },

  async update(scheduleId: number, request: ScheduleCreateRequest): Promise<ScheduleResponse> {
    const response = await api.put<{ success: boolean; data: ScheduleResponse }>(
      `/schedules/${scheduleId}`,
      request
    );
    return response.data.data;
  },

  async setEnabled(scheduleId: number, enabled: boolean): Promise<ScheduleResponse> {
    const response = await api.patch<{ success: boolean; data: ScheduleResponse }>(
      `/schedules/${scheduleId}/enabled?enabled=${enabled}`
    );
    return response.data.data;
  },

  async delete(scheduleId: number): Promise<void> {
    await api.delete(`/schedules/${scheduleId}`);
  },
};

export { api };

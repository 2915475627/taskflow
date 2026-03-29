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

export { api };

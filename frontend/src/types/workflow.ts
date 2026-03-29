// Core workflow types

export type NodeType = 'trigger' | 'action' | 'condition';
export type WorkflowStatus = 'draft' | 'published' | 'disabled';

export interface Position {
  x: number;
  y: number;
}

export interface TriggerData {
  type: 'trigger';
  name: string;
  description?: string;
  config: TriggerConfig;
}

export interface TriggerConfig {
  event?: string;
  cron?: string;
  enabled?: boolean;
}

export interface ActionData {
  type: 'action';
  name: string;
  description?: string;
  config: ActionConfig;
}

export interface ActionConfig {
  service?: string;
  method?: string;
  params?: Record<string, unknown>;
}

export interface ConditionData {
  type: 'condition';
  name: string;
  description?: string;
  config: ConditionConfig;
}

export interface ConditionConfig {
  conditions?: ConditionRule[];
}

export interface ConditionRule {
  field?: string;
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value?: unknown;
}

export type WorkflowNodeData = TriggerData | ActionData | ConditionData;

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: WorkflowStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  version: number;
  updatedAt: string;
}

/**
 * Execution status for individual nodes.
 */
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * State of a single node during execution.
 */
export interface NodeExecutionState {
  nodeId: string;
  status: NodeExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: unknown;
}

/**
 * Overall state of a workflow execution.
 */
export interface WorkflowExecutionState {
  executionId: string;
  runId: number;
  nodeStates: Record<string, NodeExecutionState>;
}

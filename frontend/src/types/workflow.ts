// Core workflow types - Built-in Node Types

/**
 * Built-in node types for the workflow builder.
 *
 * Each type represents a specific function in a workflow:
 * - start: Entry point where workflow begins
 * - end: Exit point marking completion
 * - httpRequest: Make HTTP API calls
 * - mcpCall: Call MCP (Model Context Protocol) tools
 * - condition: Branch based on conditions
 * - delay: Pause for specified duration
 * - transform: Transform data using expressions
 * - log: Log messages for debugging
 */
export enum BuiltInNodeType {
  START = 'start',
  END = 'end',
  HTTP_REQUEST = 'httpRequest',
  MCP_CALL = 'mcpCall',
  CONDITION = 'condition',
  DELAY = 'delay',
  TRANSFORM = 'transform',
  LOG = 'log',
}

// Re-export for backwards compatibility
export type NodeType = BuiltInNodeType;

export type WorkflowStatus = 'draft' | 'published' | 'disabled';
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type EdgeType = 'default' | 'condition';

// ==================== Node Configurations ====================

/**
 * Configuration for Start nodes.
 * Start nodes are entry points with no input handles.
 */
export interface StartConfig {
  /** Variable name to store workflow input data */
  outputVariable?: string;
}

/**
 * Configuration for End nodes.
 * End nodes mark successful completion of a workflow branch.
 */
export interface EndConfig {
  // End nodes typically don't need configuration
}

/**
 * Configuration for HTTP Request nodes.
 * Makes HTTP calls with configurable method, URL, headers, and body.
 */
export interface HttpRequestConfig {
  /** HTTP method (GET, POST, PUT, PATCH, DELETE) */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Target URL for the request */
  url: string;
  /** Request headers as key-value pairs */
  headers?: Record<string, string>;
  /** Request body (typically JSON string) */
  body?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Configuration for MCP Call nodes.
 * Calls MCP (Model Context Protocol) tools.
 */
export interface McpCallConfig {
  /** Name of the MCP server to call */
  serverName: string;
  /** Name of the tool on the MCP server */
  toolName: string;
  /** Arguments to pass to the MCP tool */
  arguments?: Record<string, unknown>;
}

/**
 * A single condition rule for Condition nodes.
 */
export interface ConditionRule {
  /** JSON path to the field to evaluate (e.g., "data.status") */
  field: string;
  /** Comparison operator */
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  /** Value to compare against */
  value: unknown;
}

/**
 * Configuration for Condition nodes.
 * Evaluates conditions and branches workflow execution.
 */
export interface ConditionConfig {
  /** List of conditions to evaluate */
  conditions: ConditionRule[];
  /** How to combine conditions: "and" requires all, "or" requires any */
  logic: 'and' | 'or';
}

/**
 * Configuration for Delay nodes.
 * Pauses execution for a specified duration.
 */
export interface DelayConfig {
  /** Duration to delay in milliseconds */
  duration: number;
}

/**
 * Configuration for Log nodes.
 * Logs messages for debugging during workflow execution.
 */
export interface LogConfig {
  /** Message to log (supports ${variable.path} expressions) */
  message?: string;
  /** Log level: DEBUG, INFO, WARN, ERROR */
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

// Union type for all node configs
export type NodeConfig = StartConfig | EndConfig | HttpRequestConfig | McpCallConfig | ConditionConfig | DelayConfig | LogConfig;

// ==================== Node Data Types ====================

interface BaseNodeData {
  name: string;
  description?: string;
}

export interface StartNodeData extends BaseNodeData {
  type: BuiltInNodeType.START;
  config: StartConfig;
}

export interface EndNodeData extends BaseNodeData {
  type: BuiltInNodeType.END;
  config: EndConfig;
}

export interface HttpRequestNodeData extends BaseNodeData {
  type: BuiltInNodeType.HTTP_REQUEST;
  config: HttpRequestConfig;
}

export interface McpCallNodeData extends BaseNodeData {
  type: BuiltInNodeType.MCP_CALL;
  config: McpCallConfig;
}

export interface ConditionNodeData extends BaseNodeData {
  type: BuiltInNodeType.CONDITION;
  config: ConditionConfig;
}

export interface DelayNodeData extends BaseNodeData {
  type: BuiltInNodeType.DELAY;
  config: DelayConfig;
}

export interface LogNodeData extends BaseNodeData {
  type: BuiltInNodeType.LOG;
  config: LogConfig;
}

// Union of all node data types
export type WorkflowNodeData =
  | StartNodeData
  | EndNodeData
  | HttpRequestNodeData
  | McpCallNodeData
  | ConditionNodeData
  | DelayNodeData
  | LogNodeData;

// ==================== Workflow Graph Types ====================

export interface Position {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: BuiltInNodeType;
  position: Position;
  data: WorkflowNodeData;
  executionStatus?: NodeExecutionStatus;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
  edgeType?: EdgeType;
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

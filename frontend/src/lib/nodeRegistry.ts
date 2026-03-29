import { BuiltInNodeType, type NodeConfig } from '@/types';

// Re-export for convenience
export { BuiltInNodeType } from '@/types';

/**
 * Configuration for React Flow handles.
 * Handles are connection points on nodes.
 */
export interface NodeHandleConfig {
  inputs: { id: string; position: 'top' | 'left' | 'right' }[];
  outputs: { id: string; position: 'bottom' | 'left' | 'right'; condition?: 'true' | 'false' }[];
}

/**
 * Definition of a node type including metadata, icon, and defaults.
 */
export interface NodeDefinition {
  type: BuiltInNodeType;
  label: string;
  /** Human-readable description for UI tooltips and documentation */
  description: string;
  icon: string;
  category: 'trigger' | 'action' | 'logic' | 'control';
  defaultConfig: NodeConfig;
  handles: NodeHandleConfig;
}

/**
 * Registry of all built-in node types.
 * Maps node type to their definition including defaults and handle configuration.
 */
export const NODE_REGISTRY: Record<BuiltInNodeType, NodeDefinition> = {
  [BuiltInNodeType.START]: {
    type: BuiltInNodeType.START,
    label: 'Start',
    description: 'Workflow entry point. No input handles - this is where execution begins.',
    icon: '🚀',
    category: 'trigger',
    defaultConfig: { outputVariable: 'input' },
    handles: {
      inputs: [],
      outputs: [{ id: 'output', position: 'bottom' }],
    },
  },
  [BuiltInNodeType.END]: {
    type: BuiltInNodeType.END,
    label: 'End',
    description: 'Workflow exit point. Marks successful completion of a workflow branch.',
    icon: '🏁',
    category: 'trigger',
    defaultConfig: {},
    handles: {
      inputs: [{ id: 'input', position: 'top' }],
      outputs: [],
    },
  },
  [BuiltInNodeType.HTTP_REQUEST]: {
    type: BuiltInNodeType.HTTP_REQUEST,
    label: 'HTTP Request',
    description: 'Make HTTP calls with configurable method, URL, headers, and body.',
    icon: '🌐',
    category: 'action',
    defaultConfig: { method: 'GET', url: '', headers: {}, timeout: 30000 },
    handles: {
      inputs: [{ id: 'input', position: 'top' }],
      outputs: [{ id: 'response', position: 'bottom' }],
    },
  },
  [BuiltInNodeType.MCP_CALL]: {
    type: BuiltInNodeType.MCP_CALL,
    label: 'MCP Call',
    description: 'Call MCP (Model Context Protocol) tools with server name, tool name, and arguments.',
    icon: '🔧',
    category: 'action',
    defaultConfig: { serverName: '', toolName: '', arguments: {} },
    handles: {
      inputs: [{ id: 'input', position: 'top' }],
      outputs: [{ id: 'result', position: 'bottom' }],
    },
  },
  [BuiltInNodeType.CONDITION]: {
    type: BuiltInNodeType.CONDITION,
    label: 'Condition',
    description: 'Branch workflow based on conditions. Evaluates field comparisons with AND/OR logic.',
    icon: '🔀',
    category: 'logic',
    defaultConfig: { conditions: [], logic: 'and' },
    handles: {
      inputs: [{ id: 'input', position: 'top' }],
      outputs: [
        { id: 'true', position: 'left', condition: 'true' },
        { id: 'false', position: 'right', condition: 'false' },
      ],
    },
  },
  [BuiltInNodeType.DELAY]: {
    type: BuiltInNodeType.DELAY,
    label: 'Delay',
    description: 'Pause execution for a specified duration before continuing to the next node.',
    icon: '⏱️',
    category: 'control',
    defaultConfig: { duration: 1000 },
    handles: {
      inputs: [{ id: 'input', position: 'top' }],
      outputs: [{ id: 'output', position: 'bottom' }],
    },
  },
};

/**
 * Get the definition for a node type.
 */
export function getNodeDefinition(type: BuiltInNodeType): NodeDefinition {
  return NODE_REGISTRY[type];
}

/**
 * Create initial node data for a given type.
 * Used when adding a new node to the canvas.
 */
export function createNodeData(type: BuiltInNodeType): {
  type: BuiltInNodeType;
  name: string;
  description?: string;
  config: NodeConfig;
} {
  const definition = getNodeDefinition(type);
  return {
    type,
    name: `New ${definition.label}`,
    description: definition.description,
    config: { ...definition.defaultConfig },
  };
}

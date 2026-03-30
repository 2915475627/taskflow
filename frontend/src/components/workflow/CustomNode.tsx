import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import type { WorkflowNodeData, NodeExecutionStatus } from '@/types';

type CustomNodeData = WorkflowNodeData & {
  selected?: boolean;
  executionStatus?: NodeExecutionStatus;
  errorMessage?: string;
  hasBreakpoint?: boolean;
  onToggleBreakpoint?: (nodeId: string) => void;
};

const statusColors: Record<NodeExecutionStatus, string> = {
  pending: 'border-muted-foreground',
  running: 'border-yellow-500 animate-pulse',
  completed: 'border-green-500',
  failed: 'border-red-500',
  skipped: 'border-gray-400',
};

const statusBgColors: Record<NodeExecutionStatus, string> = {
  pending: 'bg-muted',
  running: 'bg-yellow-50',
  completed: 'bg-green-50',
  failed: 'bg-red-50',
  skipped: 'bg-gray-50',
};

const nodeTypeIcons: Record<string, string> = {
  trigger: '⚡',
  action: '🔧',
  condition: '🔀',
};

function CustomNode({ data, id }: NodeProps<CustomNodeData>) {
  const isSelected = data.selected;
  const executionStatus = data.executionStatus || 'pending';
  const nodeType = data.type;
  const hasBreakpoint = data.hasBreakpoint || false;

  const handleBreakpointClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onToggleBreakpoint) {
      data.onToggleBreakpoint(id);
    }
  };

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 min-w-[150px] transition-all relative',
        statusColors[executionStatus],
        statusBgColors[executionStatus],
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Breakpoint indicator */}
      <button
        onClick={handleBreakpointClick}
        className={cn(
          'absolute -top-2 -left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
          hasBreakpoint
            ? 'bg-red-500 border-red-600 hover:bg-red-600'
            : 'bg-gray-200 border-gray-300 hover:bg-red-200 hover:border-red-400'
        )}
        title={hasBreakpoint ? 'Remove breakpoint' : 'Add breakpoint'}
      >
        {hasBreakpoint && (
          <span className="text-white text-xs font-bold">●</span>
        )}
      </button>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{nodeTypeIcons[nodeType] || '📦'}</span>
        <span className="text-xs font-medium uppercase text-muted-foreground">
          {nodeType}
        </span>
        {executionStatus === 'running' && (
          <span className="ml-auto text-xs text-yellow-600 font-medium animate-pulse">
            Running
          </span>
        )}
        {executionStatus === 'completed' && (
          <span className="ml-auto text-xs text-green-600 font-medium">✓</span>
        )}
        {executionStatus === 'failed' && (
          <span className="ml-auto text-xs text-red-600 font-medium">✗</span>
        )}
        {data.errorMessage && executionStatus === 'failed' && (
          <div className="text-xs text-red-500 mt-1 truncate max-w-[200px]">
            {data.errorMessage}
          </div>
        )}
      </div>
      <div className="font-medium text-sm">{data.name || 'Unnamed'}</div>
      {data.description && (
        <div className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
          {data.description}
        </div>
      )}

      {/* Handles for connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary"
        id="top-handle"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary"
        id="bottom-handle"
      />

      {/* Additional handles for condition nodes */}
      {nodeType === 'condition' && (
        <>
          <Handle
            type="source"
            position={Position.Left}
            id="true-handle"
            className="!w-3 !h-3 !bg-green-500"
            style={{ left: -8 }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false-handle"
            className="!w-3 !h-3 !bg-red-500"
            style={{ right: -8 }}
          />
        </>
      )}
    </div>
  );
}

export default memo(CustomNode);

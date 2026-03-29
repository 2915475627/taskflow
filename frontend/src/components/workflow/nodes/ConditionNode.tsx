import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import type { ConditionNodeData } from '@/types';

function ConditionNode({ data }: NodeProps<ConditionNodeData & { selected?: boolean; executionStatus?: string }>) {
  const { config } = data;
  const conditionCount = config.conditions?.length || 0;

  return (
    <BaseNode
      data={{
        ...data,
        icon: '🔀',
        label: 'condition',
        type: 'condition',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-3 !h-3 !bg-primary"
      />
      <div className="mt-2 text-xs text-muted-foreground">
        {conditionCount} condition(s) • {config.logic?.toUpperCase() || 'AND'}
      </div>
      {/* True branch - left */}
      <Handle
        type="source"
        position={Position.Left}
        id="true"
        className="!w-3 !h-3 !bg-green-500"
        style={{ left: -8 }}
      />
      {/* False branch - right */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!w-3 !h-3 !bg-red-500"
        style={{ right: -8 }}
      />
    </BaseNode>
  );
}

export default memo(ConditionNode);

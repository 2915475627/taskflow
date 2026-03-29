import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import type { DelayNodeData } from '@/types';

function DelayNode({ data }: NodeProps<DelayNodeData & { selected?: boolean; executionStatus?: string }>) {
  const { config } = data;

  const formatDuration = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  return (
    <BaseNode
      data={{
        ...data,
        icon: '⏱️',
        label: 'delay',
        type: 'delay',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-3 !h-3 !bg-primary"
      />
      <div className="mt-2 text-xs font-mono bg-muted px-2 py-1 rounded">
        {formatDuration(config.duration || 1000)}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!w-3 !h-3 !bg-green-500"
      />
    </BaseNode>
  );
}

export default memo(DelayNode);

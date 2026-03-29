import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import type { HttpRequestNodeData } from '@/types';

function HttpRequestNode({ id, data }: NodeProps<HttpRequestNodeData & { selected?: boolean; executionStatus?: string }>) {
  const { config } = data;

  return (
    <BaseNode
      id={id}
      data={{
        ...data,
        icon: '🌐',
        type: 'http',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-3 !h-3 !bg-primary"
      />
      <div className="mt-2 text-xs font-mono bg-muted px-2 py-1 rounded">
        {config.method} {config.url || 'URL not set'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="response"
        className="!w-3 !h-3 !bg-green-500"
      />
    </BaseNode>
  );
}

export default memo(HttpRequestNode);

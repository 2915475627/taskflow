import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import type { StartNodeData } from '@/types';

function StartNode({ id, data }: NodeProps<StartNodeData & { selected?: boolean; executionStatus?: string }>) {
  return (
    <BaseNode
      id={id}
      data={{
        ...data,
        icon: '🚀',
        type: 'start',
      }}
    >
      {/* No input handle - this is the start */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!w-3 !h-3 !bg-green-500"
      />
    </BaseNode>
  );
}

export default memo(StartNode);

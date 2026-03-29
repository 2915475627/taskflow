import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import type { EndNodeData } from '@/types';

function EndNode({ id, data }: NodeProps<EndNodeData & { selected?: boolean; executionStatus?: string }>) {
  return (
    <BaseNode
      id={id}
      data={{
        ...data,
        icon: '🏁',
        type: 'end',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-3 !h-3 !bg-primary"
      />
    </BaseNode>
  );
}

export default memo(EndNode);

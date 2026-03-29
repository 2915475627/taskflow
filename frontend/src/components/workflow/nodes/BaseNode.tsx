import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { NodeExecutionStatus } from '@/types';

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

interface BaseNodeProps {
  id: string;
  data: {
    name: string;
    description?: string;
    selected?: boolean;
    executionStatus?: NodeExecutionStatus;
    icon: string;
    label: string;
    type: string;
  };
  children?: ReactNode;
  className?: string;
}

function StatusBadge({ status, className }: { status: NodeExecutionStatus; className?: string }) {
  switch (status) {
    case 'running':
      return <span className={cn('text-xs text-yellow-600 font-medium animate-pulse', className)}>Running</span>;
    case 'completed':
      return <span className={cn('text-xs text-green-600 font-medium', className)}>✓</span>;
    case 'failed':
      return <span className={cn('text-xs text-red-600 font-medium', className)}>✗</span>;
    case 'skipped':
      return <span className={cn('text-xs text-gray-500 font-medium', className)}>⊘</span>;
    default:
      return null;
  }
}

function BaseNode({ data, children, className }: BaseNodeProps) {
  const executionStatus = data.executionStatus || 'pending';
  const isSelected = data.selected;

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 min-w-[150px] transition-all',
        statusColors[executionStatus],
        statusBgColors[executionStatus],
        isSelected && 'ring-2 ring-primary ring-offset-2',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{data.icon}</span>
        <span className="text-xs font-medium uppercase text-muted-foreground">
          {data.type}
        </span>
        <StatusBadge status={executionStatus} className="ml-auto" />
      </div>
      <div className="font-medium text-sm">{data.name || 'Unnamed'}</div>
      {data.description && (
        <div className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
          {data.description}
        </div>
      )}
      {children}
    </div>
  );
}

export { BaseNode, StatusBadge };

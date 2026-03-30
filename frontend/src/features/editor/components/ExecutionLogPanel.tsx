import { useState } from 'react';
import { X, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface ExecutionLogEntry {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorMessage?: string;
  branch?: string;
  startTime?: number;
  endTime?: number;
  logs?: Array<{ level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'; message: string; timestamp: number }>;
}

export interface ExecutionLogPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionLogs: ExecutionLogEntry[];
  isExecuting?: boolean;
}

const statusColors = {
  pending: 'text-gray-400',
  running: 'text-yellow-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
  skipped: 'text-gray-400',
};

const levelColors = {
  DEBUG: 'text-gray-400',
  INFO: 'text-blue-400',
  WARN: 'text-yellow-500',
  ERROR: 'text-red-500',
};

export function ExecutionLogPanel({
  open,
  onOpenChange,
  executionLogs,
  isExecuting = false,
}: ExecutionLogPanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'>('ALL');

  if (!open) return null;

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const calculateDuration = (startTime?: number, endTime?: number): string => {
    if (!startTime || !endTime) return '-';
    return `${endTime - startTime}ms`;
  };

  const getStatusIcon = (status: ExecutionLogEntry['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className={cn('h-4 w-4', statusColors.completed)} />;
      case 'failed':
        return <AlertCircle className={cn('h-4 w-4', statusColors.failed)} />;
      case 'running':
        return <Loader2 className={cn('h-4 w-4 animate-spin', statusColors.running)} />;
      default:
        return <Clock className={cn('h-4 w-4', statusColors.pending)} />;
    }
  };

  const renderLogEntry = (log: ExecutionLogEntry) => {
    const isExpanded = expandedNodes.has(log.nodeId);
    const duration = calculateDuration(log.startTime, log.endTime);

    return (
      <div key={log.nodeId} className="border rounded-lg overflow-hidden mb-2">
        {/* Header - always visible */}
        <div
          className={cn(
            'flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50',
            log.status === 'failed' && 'bg-red-50'
          )}
          onClick={() => toggleNode(log.nodeId)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {getStatusIcon(log.status)}
          <span className="font-medium flex-1">{log.nodeName}</span>
          <span className="text-xs text-muted-foreground uppercase">{log.nodeType}</span>
          <span className="text-xs text-muted-foreground">{duration}</span>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-4 pb-3 space-y-3">
            {/* Status and error message */}
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-medium', statusColors[log.status])}>
                {log.status.toUpperCase()}
              </span>
              {log.branch && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  Branch: {log.branch}
                </span>
              )}
            </div>

            {log.errorMessage && (
              <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                {log.errorMessage}
              </div>
            )}

            {/* Input */}
            {log.input && Object.keys(log.input).length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">Input</span>
                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(log.input, null, 2)}
                </pre>
              </div>
            )}

            {/* Output */}
            {log.output && Object.keys(log.output).length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">Output</span>
                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(log.output, null, 2)}
                </pre>
              </div>
            )}

            {/* Logs from Log nodes */}
            {log.logs && log.logs.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">Logs</span>
                <div className="mt-1 space-y-1">
                  {/* Level filter */}
                  <div className="flex gap-1 mb-2">
                    {(['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR'] as const).map((level) => (
                      <Button
                        key={level}
                        size="sm"
                        variant={selectedLevel === level ? 'default' : 'outline'}
                        className="h-6 text-xs px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLevel(level);
                        }}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                  {/* Log entries */}
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {log.logs
                      .filter((l) => selectedLevel === 'ALL' || l.level === selectedLevel)
                      .map((logEntry, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className={cn('font-medium', levelColors[logEntry.level])}>
                            [{logEntry.level}]
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(logEntry.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="flex-1 break-all">{logEntry.message}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-96 border-l bg-background flex flex-col max-h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="font-medium">Execution Log</span>
          {isExecuting && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Executing...
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {executionLogs.length === 0 || executionLogs.every(log => log.status === 'pending' && !log.output) ? (
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No execution logs yet</p>
            <p className="text-xs mt-1">Run the workflow to see logs here</p>
          </div>
        ) : (
          <div>{executionLogs.map(renderLogEntry)}</div>
        )}
      </div>
    </div>
  );
}

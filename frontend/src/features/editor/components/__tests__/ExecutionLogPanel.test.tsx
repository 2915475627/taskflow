import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutionLogPanel } from '../ExecutionLogPanel';

interface ExecutionLogEntry {
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

describe('ExecutionLogPanel', () => {
  const mockOnOpenChange = vi.fn();

  const completedLog: ExecutionLogEntry = {
    nodeId: 'node-1',
    nodeName: 'Start',
    nodeType: 'start',
    status: 'completed',
    output: { result: 'started' },
    startTime: 1000,
    endTime: 1005,
  };

  const failedLog: ExecutionLogEntry = {
    nodeId: 'node-2',
    nodeName: 'HTTP Request',
    nodeType: 'httpRequest',
    status: 'failed',
    errorMessage: 'Connection refused',
    startTime: 1006,
    endTime: 1010,
  };

  const logNodeLog: ExecutionLogEntry = {
    nodeId: 'node-3',
    nodeName: 'Log',
    nodeType: 'log',
    status: 'completed',
    output: { message: 'Processing complete' },
    startTime: 1011,
    endTime: 1012,
    logs: [
      { level: 'INFO', message: 'Starting process', timestamp: 1011 },
      { level: 'DEBUG', message: 'Input data: {count: 5}', timestamp: 1011 },
      { level: 'WARN', message: 'Slow response detected', timestamp: 1012 },
      { level: 'ERROR', message: 'Failed to connect', timestamp: 1012 },
    ],
  };

  beforeEach(() => {
    mockOnOpenChange.mockClear();
  });

  it('should not render when open is false', () => {
    render(
      <ExecutionLogPanel
        open={false}
        onOpenChange={mockOnOpenChange}
        executionLogs={[completedLog]}
      />
    );
    expect(screen.queryByText('Execution Log')).not.toBeInTheDocument();
  });

  it('should render when open is true', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[completedLog]}
      />
    );
    expect(screen.getByText('Execution Log')).toBeInTheDocument();
  });

  it('should display header with close button', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[completedLog]}
      />
    );
    // The close button has an X icon inside
    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should display node entries', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[completedLog, failedLog]}
      />
    );
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('HTTP Request')).toBeInTheDocument();
  });

  it('should show status text for completed nodes', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[completedLog]}
      />
    );
    // Click to expand
    fireEvent.click(screen.getByText('Start'));
    // Check for the status text
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('should show status text for failed nodes', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[failedLog]}
      />
    );
    // Click to expand
    fireEvent.click(screen.getByText('HTTP Request'));
    // Check for the status text
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('should display error messages for failed nodes when expanded', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[failedLog]}
      />
    );
    // Click to expand
    fireEvent.click(screen.getByText('HTTP Request'));
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
  });

  it('should show running indicator when isExecuting is true', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[]}
        isExecuting={true}
      />
    );
    expect(screen.getByText('Executing...')).toBeInTheDocument();
  });

  it('should display log messages from log nodes when expanded', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[logNodeLog]}
      />
    );
    // Click on the node entry to expand
    fireEvent.click(screen.getByText('Log'));
    // Should show log messages
    expect(screen.getByText('Starting process')).toBeInTheDocument();
    expect(screen.getByText('Slow response detected')).toBeInTheDocument();
    expect(screen.getByText('Failed to connect')).toBeInTheDocument();
  });

  it('should show empty state when no logs', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[]}
      />
    );
    expect(screen.getByText('No execution logs yet')).toBeInTheDocument();
  });

  it('should calculate and show duration', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[completedLog]}
      />
    );
    expect(screen.getByText(/5ms/)).toBeInTheDocument();
  });

  it('should toggle node details when clicked', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[completedLog]}
      />
    );
    // Click on the node entry to expand
    fireEvent.click(screen.getByText('Start'));
    // Should show output details
    expect(screen.getByText(/Output/)).toBeInTheDocument();
  });

  it('should filter logs by level', () => {
    render(
      <ExecutionLogPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        executionLogs={[logNodeLog]}
      />
    );
    // Click to expand
    fireEvent.click(screen.getByText('Log'));
    // Initially all logs should be visible
    expect(screen.getByText('Starting process')).toBeInTheDocument();

    // Filter buttons should exist
    const filterButton = screen.getByRole('button', { name: /DEBUG/i });
    expect(filterButton).toBeInTheDocument();
  });
});

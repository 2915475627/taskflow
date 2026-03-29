import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CustomNode from '../CustomNode';
import type { NodeProps } from 'reactflow';

// Mock reactflow
vi.mock('reactflow', () => ({
  Handle: ({ type, position, id }: { type: string; position: string; id?: string }) => (
    <div data-testid={`handle-${id || type}`} data-position={position} />
  ),
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
}));

describe('CustomNode', () => {
  const defaultProps = {
    id: 'test-node',
    data: {
      type: 'trigger' as const,
      name: 'Test Node',
      description: 'Test description',
      config: {},
      selected: false,
      executionStatus: 'pending' as const,
    },
    type: 'custom',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render node name', () => {
    render(<CustomNode {...defaultProps} />);
    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });

  it('should render node type label', () => {
    render(<CustomNode {...defaultProps} />);
    expect(screen.getByText('trigger')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(<CustomNode {...defaultProps} />);
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    const propsWithoutDesc = {
      ...defaultProps,
      data: { ...defaultProps.data, description: undefined },
    };
    render(<CustomNode {...propsWithoutDesc} />);
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('should render Running indicator when executionStatus is running', () => {
    const runningProps = {
      ...defaultProps,
      data: { ...defaultProps.data, executionStatus: 'running' as const },
    };
    render(<CustomNode {...runningProps} />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('should render checkmark when executionStatus is completed', () => {
    const completedProps = {
      ...defaultProps,
      data: { ...defaultProps.data, executionStatus: 'completed' as const },
    };
    render(<CustomNode {...completedProps} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should render X mark when executionStatus is failed', () => {
    const failedProps = {
      ...defaultProps,
      data: { ...defaultProps.data, executionStatus: 'failed' as const },
    };
    render(<CustomNode {...failedProps} />);
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('should render action node type', () => {
    const actionProps = {
      ...defaultProps,
      data: { ...defaultProps.data, type: 'action' as const },
    };
    render(<CustomNode {...actionProps} />);
    expect(screen.getByText('action')).toBeInTheDocument();
  });

  it('should render condition node type', () => {
    const conditionProps = {
      ...defaultProps,
      data: { ...defaultProps.data, type: 'condition' as const },
    };
    render(<CustomNode {...conditionProps} />);
    expect(screen.getByText('condition')).toBeInTheDocument();
  });

  it('should render handles for connections', () => {
    render(<CustomNode {...defaultProps} />);
    expect(screen.getByTestId('handle-top-handle')).toBeInTheDocument();
    expect(screen.getByTestId('handle-bottom-handle')).toBeInTheDocument();
  });

  it('should render additional handles for condition nodes', () => {
    const conditionProps = {
      ...defaultProps,
      data: { ...defaultProps.data, type: 'condition' as const },
    };
    render(<CustomNode {...conditionProps} />);
    expect(screen.getByTestId('handle-true-handle')).toBeInTheDocument();
    expect(screen.getByTestId('handle-false-handle')).toBeInTheDocument();
  });

  it('should render Unnamed when name is not provided', () => {
    const propsWithoutName = {
      ...defaultProps,
      data: { ...defaultProps.data, name: '' },
    };
    render(<CustomNode {...propsWithoutName} />);
    expect(screen.getByText('Unnamed')).toBeInTheDocument();
  });
});

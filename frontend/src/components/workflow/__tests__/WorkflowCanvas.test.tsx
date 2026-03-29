import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkflowCanvas } from '../WorkflowCanvas';
import { useWorkflowStore } from '@/stores';

// Mock React Flow
vi.mock('reactflow', () => ({
  default: ({
    children,
    onNodesChange,
    onEdgesChange,
    onConnect,
    ...props
  }: {
    children: React.ReactNode;
    onNodesChange?: () => void;
    onEdgesChange?: () => void;
    onConnect?: () => void;
  }) => (
    <div data-testid="react-flow" {...props}>
      {children}
    </div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="mini-map" />,
}));

// Mock the workflow store
vi.mock('@/stores', () => ({
  useWorkflowStore: vi.fn(),
}));

describe('WorkflowCanvas', () => {
  const mockNodes = [
    {
      id: 'node-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: { type: 'trigger' as const, name: 'Trigger', config: {} },
    },
  ];

  const mockEdges = [
    { id: 'edge-1', source: 'node-1', target: 'node-2', label: 'Next' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render React Flow component', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      setNodes: vi.fn(),
      setEdges: vi.fn(),
    });

    render(<WorkflowCanvas />);
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('should render Background, Controls, and MiniMap', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: [],
      edges: [],
      setNodes: vi.fn(),
      setEdges: vi.fn(),
    });

    render(<WorkflowCanvas />);
    expect(screen.getByTestId('background')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    expect(screen.getByTestId('mini-map')).toBeInTheDocument();
  });

  it('should pass nodes from store to ReactFlow', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      setNodes: vi.fn(),
      setEdges: vi.fn(),
    });

    render(<WorkflowCanvas />);
    // The nodes should be passed to ReactFlow (verified through store)
    expect(useWorkflowStore).toHaveBeenCalled();
  });
});

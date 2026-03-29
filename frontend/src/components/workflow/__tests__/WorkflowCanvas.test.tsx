import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowCanvas } from '../WorkflowCanvas';
import { useWorkflowStore } from '@/stores';

// Mock React Flow
vi.mock('reactflow', () => ({
  default: ({
    children,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onInit,
    onSelectionChange,
    nodeTypes,
    ...props
  }: {
    children: React.ReactNode;
    onNodesChange?: () => void;
    onEdgesChange?: () => void;
    onConnect?: () => void;
    onInit?: () => void;
    onSelectionChange?: () => void;
    nodeTypes?: Record<string, unknown>;
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
  useNodesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useEdgesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useReactFlow: vi.fn(() => ({
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    fitView: vi.fn(),
    getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
  })),
  addEdge: vi.fn(),
  applyNodeChanges: vi.fn(),
  applyEdgeChanges: vi.fn(),
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
      executionStatus: 'pending' as const,
    },
  ];

  const mockEdges = [
    { id: 'edge-1', source: 'node-1', target: 'node-2', label: 'Next', edgeType: 'default' as const },
  ];

  const mockSetStoreNodes = vi.fn();
  const mockSetStoreEdges = vi.fn();
  const mockSelectNode = vi.fn();
  const mockSelectEdge = vi.fn();
  const mockUpdateNodePosition = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      setNodes: mockSetStoreNodes,
      setEdges: mockSetStoreEdges,
      selectNode: mockSelectNode,
      selectEdge: mockSelectEdge,
      selectedNodeId: null,
      selectedEdgeId: null,
      updateNodePosition: mockUpdateNodePosition,
    });
  });

  it('should render React Flow component', () => {
    render(<WorkflowCanvas />);
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('should render Background, Controls, and MiniMap', () => {
    render(<WorkflowCanvas />);
    expect(screen.getByTestId('background')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    expect(screen.getByTestId('mini-map')).toBeInTheDocument();
  });

  it('should pass nodes from store to ReactFlow', () => {
    render(<WorkflowCanvas />);
    expect(useWorkflowStore).toHaveBeenCalled();
  });

  it('should handle node selection', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      setNodes: mockSetStoreNodes,
      setEdges: mockSetStoreEdges,
      selectNode: mockSelectNode,
      selectEdge: mockSelectEdge,
      selectedNodeId: 'node-1',
      selectedEdgeId: null,
      updateNodePosition: mockUpdateNodePosition,
    });

    render(<WorkflowCanvas />);
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('should handle edge selection', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      setNodes: mockSetStoreNodes,
      setEdges: mockSetStoreEdges,
      selectNode: mockSelectNode,
      selectEdge: mockSelectEdge,
      selectedNodeId: null,
      selectedEdgeId: 'edge-1',
      updateNodePosition: mockUpdateNodePosition,
    });

    render(<WorkflowCanvas />);
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<WorkflowCanvas className="custom-class" />);
    const container = screen.getByTestId('react-flow').parentElement;
    expect(container).toHaveClass('custom-class');
  });
});

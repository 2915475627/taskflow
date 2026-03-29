import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWorkflow } from '../useWorkflow';
import { useWorkflowStore } from '@/stores';

// Mock the store
vi.mock('@/stores', () => ({
  useWorkflowStore: vi.fn(),
}));

describe('useWorkflow', () => {
  const mockAddNode = vi.fn();
  const mockUpdateNode = vi.fn();
  const mockUpdateNodePosition = vi.fn();
  const mockUpdateNodeExecutionStatus = vi.fn();
  const mockRemoveNode = vi.fn();
  const mockSetNodes = vi.fn();
  const mockSetEdges = vi.fn();
  const mockAddEdge = vi.fn();
  const mockUpdateEdge = vi.fn();
  const mockRemoveEdge = vi.fn();
  const mockSelectNode = vi.fn();
  const mockSelectEdge = vi.fn();
  const mockStartExecution = vi.fn();
  const mockStopExecution = vi.fn();
  const mockReset = vi.fn();

  const mockStore = {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    isDirty: false,
    isExecuting: false,
    currentExecutingNodeId: null,
    addNode: mockAddNode,
    updateNode: mockUpdateNode,
    updateNodePosition: mockUpdateNodePosition,
    updateNodeExecutionStatus: mockUpdateNodeExecutionStatus,
    removeNode: mockRemoveNode,
    setNodes: mockSetNodes,
    setEdges: mockSetEdges,
    addEdge: mockAddEdge,
    updateEdge: mockUpdateEdge,
    removeEdge: mockRemoveEdge,
    selectNode: mockSelectNode,
    selectEdge: mockSelectEdge,
    setDirty: vi.fn(),
    startExecution: mockStartExecution,
    stopExecution: mockStopExecution,
    reset: mockReset,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
  });

  it('should return store state', () => {
    const { result } = renderHook(() => useWorkflow());

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.selectedNodeId).toBeNull();
    expect(result.current.selectedEdgeId).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isExecuting).toBe(false);
  });

  it('should call addNode with correct parameters', () => {
    const { result } = renderHook(() => useWorkflow());
    const node = {
      id: 'node-1',
      type: 'trigger' as const,
      position: { x: 100, y: 100 },
      data: { type: 'trigger' as const, name: 'Test', config: {} },
    };

    act(() => {
      result.current.addNode(node);
    });

    expect(mockAddNode).toHaveBeenCalledWith(node);
  });

  it('should call updateNode with correct parameters', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.updateNode('node-1', { name: 'Updated' });
    });

    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { name: 'Updated' });
  });

  it('should call updateNodePosition with correct parameters', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.updateNodePosition('node-1', { x: 200, y: 300 });
    });

    expect(mockUpdateNodePosition).toHaveBeenCalledWith('node-1', { x: 200, y: 300 });
  });

  it('should call updateNodeExecutionStatus with correct parameters', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.updateNodeExecutionStatus('node-1', 'running');
    });

    expect(mockUpdateNodeExecutionStatus).toHaveBeenCalledWith('node-1', 'running');
  });

  it('should call removeNode with correct id', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.removeNode('node-1');
    });

    expect(mockRemoveNode).toHaveBeenCalledWith('node-1');
  });

  it('should call selectNode with correct id', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.selectNode('node-1');
    });

    expect(mockSelectNode).toHaveBeenCalledWith('node-1');
  });

  it('should call selectEdge with correct id', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.selectEdge('edge-1');
    });

    expect(mockSelectEdge).toHaveBeenCalledWith('edge-1');
  });

  it('should call addEdge with correct parameters', () => {
    const { result } = renderHook(() => useWorkflow());
    const edge = {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
    };

    act(() => {
      result.current.addEdge(edge);
    });

    expect(mockAddEdge).toHaveBeenCalledWith(edge);
  });

  it('should call updateEdge with correct parameters', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.updateEdge('edge-1', { label: 'New Label', edgeType: 'condition' });
    });

    expect(mockUpdateEdge).toHaveBeenCalledWith('edge-1', { label: 'New Label', edgeType: 'condition' });
  });

  it('should call removeEdge with correct id', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.removeEdge('edge-1');
    });

    expect(mockRemoveEdge).toHaveBeenCalledWith('edge-1');
  });

  it('should call startExecution', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.startExecution();
    });

    expect(mockStartExecution).toHaveBeenCalled();
  });

  it('should call stopExecution', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.stopExecution();
    });

    expect(mockStopExecution).toHaveBeenCalled();
  });

  it('should call reset', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.reset();
    });

    expect(mockReset).toHaveBeenCalled();
  });

  it('should return selected node when selectedNodeId is set', () => {
    const node = {
      id: 'node-1',
      type: 'trigger' as const,
      position: { x: 100, y: 100 },
      data: { type: 'trigger' as const, name: 'Test', config: {} },
    };

    (useWorkflowStore as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStore,
      nodes: [node],
      selectedNodeId: 'node-1',
    });

    const { result } = renderHook(() => useWorkflow());

    expect(result.current.selectedNode).toEqual(node);
  });

  it('should return selected edge when selectedEdgeId is set', () => {
    const edge = {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      label: 'Test',
    };

    (useWorkflowStore as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStore,
      edges: [edge],
      selectedEdgeId: 'edge-1',
    });

    const { result } = renderHook(() => useWorkflow());

    expect(result.current.selectedEdge).toEqual(edge);
  });

  it('should return null when no node is selected', () => {
    const { result } = renderHook(() => useWorkflow());

    expect(result.current.selectedNode).toBeNull();
  });

  it('should return null when no edge is selected', () => {
    const { result } = renderHook(() => useWorkflow());

    expect(result.current.selectedEdge).toBeNull();
  });

  it('should return null when selected node is not found', () => {
    (useWorkflowStore as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStore,
      selectedNodeId: 'non-existent',
    });

    const { result } = renderHook(() => useWorkflow());

    expect(result.current.selectedNode).toBeNull();
  });

  it('should return null when selected edge is not found', () => {
    (useWorkflowStore as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStore,
      selectedEdgeId: 'non-existent',
    });

    const { result } = renderHook(() => useWorkflow());

    expect(result.current.selectedEdge).toBeNull();
  });

  it('should return isExecuting state', () => {
    (useWorkflowStore as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStore,
      isExecuting: true,
    });

    const { result } = renderHook(() => useWorkflow());

    expect(result.current.isExecuting).toBe(true);
  });

  it('should return currentExecutingNodeId state', () => {
    (useWorkflowStore as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStore,
      currentExecutingNodeId: 'node-1',
    });

    const { result } = renderHook(() => useWorkflow());

    expect(result.current.currentExecutingNodeId).toBe('node-1');
  });
});

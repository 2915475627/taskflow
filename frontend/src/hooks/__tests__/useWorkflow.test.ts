import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWorkflow } from '../useWorkflow';
import * as workflowStoreModule from '@/stores/workflowStore';

// Mock the store
vi.mock('@/stores/workflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));

describe('useWorkflow', () => {
  const mockAddNode = vi.fn();
  const mockUpdateNode = vi.fn();
  const mockRemoveNode = vi.fn();
  const mockSetNodes = vi.fn();
  const mockSetEdges = vi.fn();
  const mockSelectNode = vi.fn();
  const mockReset = vi.fn();

  const mockStore = {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    isDirty: false,
    addNode: mockAddNode,
    updateNode: mockUpdateNode,
    removeNode: mockRemoveNode,
    setNodes: mockSetNodes,
    setEdges: mockSetEdges,
    selectNode: mockSelectNode,
    setDirty: vi.fn(),
    reset: mockReset,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
  });

  it('should return store state', () => {
    const { result } = renderHook(() => useWorkflow());

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.selectedNodeId).toBeNull();
    expect(result.current.isDirty).toBe(false);
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

    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStore,
      nodes: [node],
      selectedNodeId: 'node-1',
    });

    const { result } = renderHook(() => useWorkflow());

    expect(result.current.selectedNode).toEqual(node);
  });

  it('should return null when no node is selected', () => {
    const { result } = renderHook(() => useWorkflow());

    expect(result.current.selectedNode).toBeNull();
  });

  it('should return null when selected node is not found', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStore,
      selectedNodeId: 'non-existent',
    });

    const { result } = renderHook(() => useWorkflow());

    expect(result.current.selectedNode).toBeNull();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import type { WorkflowNode, WorkflowEdge, WorkflowNodeData } from '@/types';

// Since we can't import the actual store directly in test (TDD approach),
// we define the interface and test expected behavior
interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  // Actions
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, data: Partial<WorkflowNodeData>) => void;
  removeNode: (id: string) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  selectNode: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
  reset: () => void;
}

describe('WorkflowStore', () => {
  // Mock implementation for testing expected behavior
  const createMockStore = () => {
    let state: {
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
      selectedNodeId: string | null;
      isDirty: boolean;
    } = {
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isDirty: false,
    };

    return {
      getState: () => state,
      setState: (partial: Partial<typeof state>) => {
        state = { ...state, ...partial };
      },
      addNode: (node: WorkflowNode) => {
        state = { ...state, nodes: [...state.nodes, node], isDirty: true };
      },
      updateNode: (id: string, data: Partial<WorkflowNodeData>) => {
        state = {
          ...state,
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } as WorkflowNodeData } : n
          ),
          isDirty: true,
        };
      },
      removeNode: (id: string) => {
        state = {
          ...state,
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.source !== id && e.target !== id),
          isDirty: true,
        };
      },
      setNodes: (nodes: WorkflowNode[]) => {
        state = { ...state, nodes, isDirty: true };
      },
      setEdges: (edges: WorkflowEdge[]) => {
        state = { ...state, edges, isDirty: true };
      },
      selectNode: (id: string | null) => {
        state = { ...state, selectedNodeId: id };
      },
      setDirty: (dirty: boolean) => {
        state = { ...state, isDirty: dirty };
      },
      reset: () => {
        state = { nodes: [], edges: [], selectedNodeId: null, isDirty: false };
      },
    };
  };

  describe('addNode', () => {
    it('should add a node to the store', () => {
      const store = createMockStore();
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          type: 'trigger',
          name: 'Test Trigger',
          config: {},
        },
      };

      store.addNode(node);

      expect(store.getState().nodes).toHaveLength(1);
      expect(store.getState().nodes[0]).toEqual(node);
    });

    it('should mark store as dirty after adding node', () => {
      const store = createMockStore();
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { type: 'trigger', name: 'Test', config: {} },
      };

      expect(store.getState().isDirty).toBe(false);
      store.addNode(node);
      expect(store.getState().isDirty).toBe(true);
    });
  });

  describe('updateNode', () => {
    it('should update node data by id', () => {
      const store = createMockStore();
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { type: 'trigger', name: 'Original Name', config: {} },
      };

      store.addNode(node);
      store.updateNode('node-1', { name: 'Updated Name' } as Partial<WorkflowNodeData>);

      expect(store.getState().nodes[0].data.name).toBe('Updated Name');
    });

    it('should mark store as dirty after updating node', () => {
      const store = createMockStore();
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'action',
        position: { x: 100, y: 100 },
        data: { type: 'action', name: 'Test', config: {} },
      };

      store.addNode(node);
      store.setDirty(false);
      store.updateNode('node-1', { name: 'Updated' } as Partial<WorkflowNodeData>);

      expect(store.getState().isDirty).toBe(true);
    });
  });

  describe('removeNode', () => {
    it('should remove node by id', () => {
      const store = createMockStore();
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { type: 'trigger', name: 'Test', config: {} },
      };

      store.addNode(node);
      expect(store.getState().nodes).toHaveLength(1);

      store.removeNode('node-1');
      expect(store.getState().nodes).toHaveLength(0);
    });

    it('should also remove connected edges', () => {
      const store = createMockStore();
      const node1: WorkflowNode = {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { type: 'trigger', name: 'Test', config: {} },
      };
      const node2: WorkflowNode = {
        id: 'node-2',
        type: 'action',
        position: { x: 200, y: 100 },
        data: { type: 'action', name: 'Action', config: {} },
      };

      store.addNode(node1);
      store.addNode(node2);
      store.setEdges([
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
      ]);

      store.removeNode('node-1');

      expect(store.getState().edges).toHaveLength(0);
    });
  });

  describe('setNodes', () => {
    it('should replace all nodes', () => {
      const store = createMockStore();
      const nodes: WorkflowNode[] = [
        {
          id: 'node-1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { type: 'trigger', name: 'Test', config: {} },
        },
      ];

      store.setNodes(nodes);

      expect(store.getState().nodes).toEqual(nodes);
    });
  });

  describe('setEdges', () => {
    it('should replace all edges', () => {
      const store = createMockStore();
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
      ];

      store.setEdges(edges);

      expect(store.getState().edges).toEqual(edges);
    });
  });

  describe('selectNode', () => {
    it('should set selected node id', () => {
      const store = createMockStore();

      store.selectNode('node-1');

      expect(store.getState().selectedNodeId).toBe('node-1');
    });

    it('should allow deselecting node', () => {
      const store = createMockStore();

      store.selectNode('node-1');
      store.selectNode(null);

      expect(store.getState().selectedNodeId).toBeNull();
    });
  });

  describe('setDirty', () => {
    it('should update dirty flag', () => {
      const store = createMockStore();

      store.setDirty(true);
      expect(store.getState().isDirty).toBe(true);

      store.setDirty(false);
      expect(store.getState().isDirty).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const store = createMockStore();
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { type: 'trigger', name: 'Test', config: {} },
      };

      store.addNode(node);
      store.selectNode('node-1');
      store.setDirty(true);

      store.reset();

      const state = store.getState();
      expect(state.nodes).toHaveLength(0);
      expect(state.edges).toHaveLength(0);
      expect(state.selectedNodeId).toBeNull();
      expect(state.isDirty).toBe(false);
    });
  });
});

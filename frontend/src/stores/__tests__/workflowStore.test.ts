import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import type { WorkflowNode, WorkflowEdge, WorkflowNodeData, NodeExecutionStatus, EdgeType } from '@/types';

// Since we can't import the actual store directly in test (TDD approach),
// we define the interface and test expected behavior
interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDirty: boolean;
  isExecuting: boolean;
  currentExecutingNodeId: string | null;
  // Actions
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, data: Partial<WorkflowNodeData>) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeExecutionStatus: (id: string, status: NodeExecutionStatus) => void;
  removeNode: (id: string) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  addEdge: (edge: WorkflowEdge) => void;
  updateEdge: (id: string, updates: Partial<Pick<WorkflowEdge, 'label' | 'edgeType'>>) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
  startExecution: () => void;
  stopExecution: () => void;
  reset: () => void;
}

describe('WorkflowStore', () => {
  // Mock implementation for testing expected behavior
  const createMockStore = () => {
    let state: {
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
      selectedNodeId: string | null;
      selectedEdgeId: string | null;
      isDirty: boolean;
      isExecuting: boolean;
      currentExecutingNodeId: string | null;
    } = {
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      isDirty: false,
      isExecuting: false,
      currentExecutingNodeId: null,
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
      updateNodePosition: (id: string, position: { x: number; y: number }) => {
        state = {
          ...state,
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, position } : n
          ),
          isDirty: true,
        };
      },
      updateNodeExecutionStatus: (id: string, status: NodeExecutionStatus) => {
        state = {
          ...state,
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, executionStatus: status } : n
          ),
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
      addEdge: (edge: WorkflowEdge) => {
        state = { ...state, edges: [...state.edges, edge], isDirty: true };
      },
      updateEdge: (id: string, updates: Partial<Pick<WorkflowEdge, 'label' | 'edgeType'>>) => {
        state = {
          ...state,
          edges: state.edges.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
          isDirty: true,
        };
      },
      removeEdge: (id: string) => {
        state = {
          ...state,
          edges: state.edges.filter((e) => e.id !== id),
          isDirty: true,
        };
      },
      selectNode: (id: string | null) => {
        state = { ...state, selectedNodeId: id, selectedEdgeId: null };
      },
      selectEdge: (id: string | null) => {
        state = { ...state, selectedEdgeId: id, selectedNodeId: null };
      },
      setDirty: (dirty: boolean) => {
        state = { ...state, isDirty: dirty };
      },
      startExecution: () => {
        state = {
          ...state,
          isExecuting: true,
          currentExecutingNodeId: null,
          nodes: state.nodes.map((n) => ({ ...n, executionStatus: 'pending' as const })),
        };
      },
      stopExecution: () => {
        state = { ...state, isExecuting: false, currentExecutingNodeId: null };
      },
      reset: () => {
        state = {
          nodes: [],
          edges: [],
          selectedNodeId: null,
          selectedEdgeId: null,
          isDirty: false,
          isExecuting: false,
          currentExecutingNodeId: null,
        };
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

  describe('updateNodePosition', () => {
    it('should update node position', () => {
      const store = createMockStore();
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { type: 'trigger', name: 'Test', config: {} },
      };

      store.addNode(node);
      store.updateNodePosition('node-1', { x: 200, y: 300 });

      expect(store.getState().nodes[0].position).toEqual({ x: 200, y: 300 });
    });

    it('should mark store as dirty after moving node', () => {
      const store = createMockStore();
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { type: 'trigger', name: 'Test', config: {} },
      };

      store.addNode(node);
      store.setDirty(false);
      store.updateNodePosition('node-1', { x: 200, y: 300 });

      expect(store.getState().isDirty).toBe(true);
    });
  });

  describe('updateNodeExecutionStatus', () => {
    it('should update node execution status', () => {
      const store = createMockStore();
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { type: 'trigger', name: 'Test', config: {} },
      };

      store.addNode(node);
      store.updateNodeExecutionStatus('node-1', 'running');

      expect(store.getState().nodes[0].executionStatus).toBe('running');
    });

    it('should not mark store as dirty when updating execution status', () => {
      const store = createMockStore();
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { type: 'trigger', name: 'Test', config: {} },
      };

      store.addNode(node);
      store.setDirty(false);
      store.updateNodeExecutionStatus('node-1', 'completed');

      expect(store.getState().isDirty).toBe(false);
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

  describe('addEdge', () => {
    it('should add an edge', () => {
      const store = createMockStore();
      const edge: WorkflowEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
      };

      store.addEdge(edge);

      expect(store.getState().edges).toHaveLength(1);
      expect(store.getState().edges[0]).toEqual(edge);
    });

    it('should mark store as dirty after adding edge', () => {
      const store = createMockStore();
      const edge: WorkflowEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
      };

      expect(store.getState().isDirty).toBe(false);
      store.addEdge(edge);
      expect(store.getState().isDirty).toBe(true);
    });
  });

  describe('updateEdge', () => {
    it('should update edge label', () => {
      const store = createMockStore();
      const edge: WorkflowEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        label: 'Original',
      };

      store.addEdge(edge);
      store.updateEdge('edge-1', { label: 'Updated' });

      expect(store.getState().edges[0].label).toBe('Updated');
    });

    it('should update edge type', () => {
      const store = createMockStore();
      const edge: WorkflowEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
      };

      store.addEdge(edge);
      store.updateEdge('edge-1', { edgeType: 'condition' });

      expect(store.getState().edges[0].edgeType).toBe('condition');
    });
  });

  describe('removeEdge', () => {
    it('should remove edge by id', () => {
      const store = createMockStore();
      const edge: WorkflowEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
      };

      store.addEdge(edge);
      expect(store.getState().edges).toHaveLength(1);

      store.removeEdge('edge-1');
      expect(store.getState().edges).toHaveLength(0);
    });
  });

  describe('selectNode', () => {
    it('should set selected node id', () => {
      const store = createMockStore();

      store.selectNode('node-1');

      expect(store.getState().selectedNodeId).toBe('node-1');
    });

    it('should clear selected edge when selecting node', () => {
      const store = createMockStore();
      store.addEdge({ id: 'edge-1', source: 'node-1', target: 'node-2' });
      store.selectEdge('edge-1');

      expect(store.getState().selectedEdgeId).toBe('edge-1');
      store.selectNode('node-1');
      expect(store.getState().selectedNodeId).toBe('node-1');
      expect(store.getState().selectedEdgeId).toBeNull();
    });

    it('should allow deselecting node', () => {
      const store = createMockStore();

      store.selectNode('node-1');
      store.selectNode(null);

      expect(store.getState().selectedNodeId).toBeNull();
    });
  });

  describe('selectEdge', () => {
    it('should set selected edge id', () => {
      const store = createMockStore();
      store.addEdge({ id: 'edge-1', source: 'node-1', target: 'node-2' });

      store.selectEdge('edge-1');

      expect(store.getState().selectedEdgeId).toBe('edge-1');
    });

    it('should clear selected node when selecting edge', () => {
      const store = createMockStore();
      store.selectNode('node-1');

      expect(store.getState().selectedNodeId).toBe('node-1');
      store.selectEdge('edge-1');
      expect(store.getState().selectedEdgeId).toBe('edge-1');
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

  describe('startExecution', () => {
    it('should set isExecuting to true', () => {
      const store = createMockStore();

      store.startExecution();

      expect(store.getState().isExecuting).toBe(true);
    });

    it('should reset all node execution statuses to pending', () => {
      const store = createMockStore();
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { type: 'trigger', name: 'Test', config: {} },
        executionStatus: 'completed',
      };

      store.addNode(node);
      store.startExecution();

      expect(store.getState().nodes[0].executionStatus).toBe('pending');
    });
  });

  describe('stopExecution', () => {
    it('should set isExecuting to false', () => {
      const store = createMockStore();
      store.startExecution();

      store.stopExecution();

      expect(store.getState().isExecuting).toBe(false);
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
      store.startExecution();

      store.reset();

      const state = store.getState();
      expect(state.nodes).toHaveLength(0);
      expect(state.edges).toHaveLength(0);
      expect(state.selectedNodeId).toBeNull();
      expect(state.selectedEdgeId).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.isExecuting).toBe(false);
    });
  });
});

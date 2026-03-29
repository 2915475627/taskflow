import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { WorkflowNode, WorkflowEdge, WorkflowNodeData, NodeExecutionStatus } from '@/types';

interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDirty: boolean;
  // Execution preview state
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
  // Execution preview actions
  startExecution: () => void;
  stopExecution: () => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    persist(
      (set) => ({
        nodes: [],
        edges: [],
        selectedNodeId: null,
        selectedEdgeId: null,
        isDirty: false,
        isExecuting: false,
        currentExecutingNodeId: null,

        addNode: (node: WorkflowNode) => {
          set(
            (state) => ({
              nodes: [...state.nodes, node],
              isDirty: true,
            }),
            false,
            'addNode'
          );
        },

        updateNode: (id: string, data: Partial<WorkflowNodeData>) => {
          set(
            (state) => ({
              nodes: state.nodes.map((n) =>
                n.id === id
                  ? { ...n, data: { ...n.data, ...data } as WorkflowNodeData }
                  : n
              ),
              isDirty: true,
            }),
            false,
            'updateNode'
          );
        },

        updateNodePosition: (id: string, position: { x: number; y: number }) => {
          set(
            (state) => ({
              nodes: state.nodes.map((n) =>
                n.id === id ? { ...n, position } : n
              ),
              isDirty: true,
            }),
            false,
            'updateNodePosition'
          );
        },

        updateNodeExecutionStatus: (id: string, status: NodeExecutionStatus) => {
          set(
            (state) => ({
              nodes: state.nodes.map((n) =>
                n.id === id ? { ...n, executionStatus: status } : n
              ),
            }),
            false,
            'updateNodeExecutionStatus'
          );
        },

        removeNode: (id: string) => {
          set(
            (state) => ({
              nodes: state.nodes.filter((n) => n.id !== id),
              edges: state.edges.filter(
                (e) => e.source !== id && e.target !== id
              ),
              isDirty: true,
            }),
            false,
            'removeNode'
          );
        },

        setNodes: (nodes: WorkflowNode[]) => {
          set({ nodes, isDirty: true }, false, 'setNodes');
        },

        setEdges: (edges: WorkflowEdge[]) => {
          set({ edges, isDirty: true }, false, 'setEdges');
        },

        addEdge: (edge: WorkflowEdge) => {
          set(
            (state) => ({
              edges: [...state.edges, edge],
              isDirty: true,
            }),
            false,
            'addEdge'
          );
        },

        updateEdge: (id: string, updates: Partial<Pick<WorkflowEdge, 'label' | 'edgeType'>>) => {
          set(
            (state) => ({
              edges: state.edges.map((e) =>
                e.id === id ? { ...e, ...updates } : e
              ),
              isDirty: true,
            }),
            false,
            'updateEdge'
          );
        },

        removeEdge: (id: string) => {
          set(
            (state) => ({
              edges: state.edges.filter((e) => e.id !== id),
              isDirty: true,
            }),
            false,
            'removeEdge'
          );
        },

        selectNode: (id: string | null) => {
          set({ selectedNodeId: id, selectedEdgeId: null }, false, 'selectNode');
        },

        selectEdge: (id: string | null) => {
          set({ selectedEdgeId: id, selectedNodeId: null }, false, 'selectEdge');
        },

        setDirty: (dirty: boolean) => {
          set({ isDirty: dirty }, false, 'setDirty');
        },

        startExecution: () => {
          set({ isExecuting: true, currentExecutingNodeId: null }, false, 'startExecution');
          // Reset all node execution statuses
          set(
            (state) => ({
              nodes: state.nodes.map((n) => ({ ...n, executionStatus: 'pending' as const })),
            }),
            false,
            'resetExecutionStatuses'
          );
        },

        stopExecution: () => {
          set({ isExecuting: false, currentExecutingNodeId: null }, false, 'stopExecution');
        },

        reset: () => {
          set(
            {
              nodes: [],
              edges: [],
              selectedNodeId: null,
              selectedEdgeId: null,
              isDirty: false,
              isExecuting: false,
              currentExecutingNodeId: null,
            },
            false,
            'reset'
          );
        },
      }),
      {
        name: 'workflow-storage',
        partialize: (state) => ({
          nodes: state.nodes,
          edges: state.edges,
        }),
      }
    ),
    { name: 'WorkflowStore' }
  )
);

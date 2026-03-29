import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { WorkflowNode, WorkflowEdge, WorkflowNodeData } from '@/types';

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

export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    persist(
      (set) => ({
        nodes: [],
        edges: [],
        selectedNodeId: null,
        isDirty: false,

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

        selectNode: (id: string | null) => {
          set({ selectedNodeId: id }, false, 'selectNode');
        },

        setDirty: (dirty: boolean) => {
          set({ isDirty: dirty }, false, 'setDirty');
        },

        reset: () => {
          set(
            {
              nodes: [],
              edges: [],
              selectedNodeId: null,
              isDirty: false,
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

import { useCallback, useMemo } from 'react';
import { useWorkflowStore } from '@/stores';
import type { WorkflowNode, WorkflowNodeData } from '@/types';

export function useWorkflow() {
  const store = useWorkflowStore();

  const selectedNode = useMemo(() => {
    if (!store.selectedNodeId) return null;
    return store.nodes.find((node) => node.id === store.selectedNodeId) || null;
  }, [store.nodes, store.selectedNodeId]);

  const addNode = useCallback(
    (node: WorkflowNode) => {
      store.addNode(node);
    },
    [store]
  );

  const updateNode = useCallback(
    (id: string, data: Partial<WorkflowNodeData>) => {
      store.updateNode(id, data);
    },
    [store]
  );

  const removeNode = useCallback(
    (id: string) => {
      store.removeNode(id);
    },
    [store]
  );

  const setNodes = useCallback(
    (nodes: WorkflowNode[]) => {
      store.setNodes(nodes);
    },
    [store]
  );

  const setEdges = useCallback(
    (edges: import('@/types').WorkflowEdge[]) => {
      store.setEdges(edges);
    },
    [store]
  );

  const selectNode = useCallback(
    (id: string | null) => {
      store.selectNode(id);
    },
    [store]
  );

  const reset = useCallback(() => {
    store.reset();
  }, [store]);

  return {
    nodes: store.nodes,
    edges: store.edges,
    selectedNodeId: store.selectedNodeId,
    selectedNode,
    isDirty: store.isDirty,
    addNode,
    updateNode,
    removeNode,
    setNodes,
    setEdges,
    selectNode,
    reset,
  };
}

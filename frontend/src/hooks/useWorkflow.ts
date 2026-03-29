import { useCallback, useMemo } from 'react';
import { useWorkflowStore } from '@/stores';
import type { WorkflowNode, WorkflowNodeData, NodeExecutionStatus } from '@/types';

export function useWorkflow() {
  const store = useWorkflowStore();

  const selectedNode = useMemo(() => {
    if (!store.selectedNodeId) return null;
    return store.nodes.find((node) => node.id === store.selectedNodeId) || null;
  }, [store.nodes, store.selectedNodeId]);

  const selectedEdge = useMemo(() => {
    if (!store.selectedEdgeId) return null;
    return store.edges.find((edge) => edge.id === store.selectedEdgeId) || null;
  }, [store.edges, store.selectedEdgeId]);

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

  const updateNodePosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      store.updateNodePosition(id, position);
    },
    [store]
  );

  const updateNodeExecutionStatus = useCallback(
    (id: string, status: NodeExecutionStatus) => {
      store.updateNodeExecutionStatus(id, status);
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

  const addEdge = useCallback(
    (edge: import('@/types').WorkflowEdge) => {
      store.addEdge(edge);
    },
    [store]
  );

  const updateEdge = useCallback(
    (id: string, updates: Partial<Pick<import('@/types').WorkflowEdge, 'label' | 'edgeType'>>) => {
      store.updateEdge(id, updates);
    },
    [store]
  );

  const removeEdge = useCallback(
    (id: string) => {
      store.removeEdge(id);
    },
    [store]
  );

  const selectNode = useCallback(
    (id: string | null) => {
      store.selectNode(id);
    },
    [store]
  );

  const selectEdge = useCallback(
    (id: string | null) => {
      store.selectEdge(id);
    },
    [store]
  );

  const startExecution = useCallback(() => {
    store.startExecution();
  }, [store]);

  const stopExecution = useCallback(() => {
    store.stopExecution();
  }, [store]);

  const reset = useCallback(() => {
    store.reset();
  }, [store]);

  return {
    nodes: store.nodes,
    edges: store.edges,
    selectedNodeId: store.selectedNodeId,
    selectedEdgeId: store.selectedEdgeId,
    selectedNode,
    selectedEdge,
    isDirty: store.isDirty,
    isExecuting: store.isExecuting,
    currentExecutingNodeId: store.currentExecutingNodeId,
    addNode,
    updateNode,
    updateNodePosition,
    updateNodeExecutionStatus,
    removeNode,
    setNodes,
    setEdges,
    addEdge,
    updateEdge,
    removeEdge,
    selectNode,
    selectEdge,
    startExecution,
    stopExecution,
    reset,
  };
}

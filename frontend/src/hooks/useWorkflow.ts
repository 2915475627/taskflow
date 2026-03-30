import { useCallback, useMemo, useRef } from 'react';
import { useWorkflowStore } from '@/stores';
import { executionApi } from '@/services/api';
import type { WorkflowNode, WorkflowNodeData, NodeExecutionStatus } from '@/types';

const POLL_INTERVAL_MS = 1000;

export function useWorkflow() {
  const store = useWorkflowStore();
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const updateNodeOutput = useCallback(
    (id: string, output: unknown) => {
      store.updateNodeOutput(id, output);
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
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    store.stopExecution();
  }, [store]);

  const setCurrentExecutingNode = useCallback(
    (nodeId: string | null) => {
      store.setCurrentExecutingNode(nodeId);
    },
    [store]
  );

  const reset = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    store.reset();
  }, [store]);

  const setDirty = useCallback(
    (dirty: boolean) => {
      store.setDirty(dirty);
    },
    [store]
  );

  const executeWorkflow = useCallback(
    async (workflowId: string) => {
      try {
        startExecution();
        const response = await executionApi.execute(workflowId);
        if (response.executionId) {
          pollRunStatus(response.executionId);
        }
        return response;
      } catch (error) {
        stopExecution();
        throw error;
      }
    },
    [startExecution, stopExecution]
  );

  const pollRunStatus = useCallback(
    (executionId: string) => {
      pollIntervalRef.current = setInterval(async () => {
        if (!store.isExecuting) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          return;
        }

        try {
          const status = await executionApi.getRunStatus(executionId);
          if (status.nodeOutputs) {
            for (const [nodeId, output] of Object.entries(status.nodeOutputs)) {
              if (output && typeof output === 'object' && 'error' in (output as Record<string, unknown>)) {
                updateNodeExecutionStatus(nodeId, 'failed');
                updateNodeOutput(nodeId, (output as Record<string, unknown>).error);
              } else if (status.status === 'completed') {
                updateNodeExecutionStatus(nodeId, 'completed');
                updateNodeOutput(nodeId, output);
              }
            }
          }
          if (status.status === 'failed' || status.status === 'completed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            store.stopExecution();
          }
        } catch (error) {
          console.error('Error polling run status:', error);
        }
      }, POLL_INTERVAL_MS);
    },
    [store, updateNodeExecutionStatus, updateNodeOutput]
  );

  const toggleBreakpoint = useCallback(
    (nodeId: string) => {
      store.toggleBreakpoint(nodeId);
    },
    [store]
  );

  const addBreakpoint = useCallback(
    (nodeId: string) => {
      store.addBreakpoint(nodeId);
    },
    [store]
  );

  const removeBreakpoint = useCallback(
    (nodeId: string) => {
      store.removeBreakpoint(nodeId);
    },
    [store]
  );

  const pauseExecution = useCallback(() => {
    store.pauseExecution();
  }, [store]);

  const resumeExecution = useCallback(() => {
    store.resumeExecution();
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
    isPaused: store.isPaused,
    currentExecutingNodeId: store.currentExecutingNodeId,
    nodeStatuses: store.nodeStatuses,
    nodeOutputs: store.nodeOutputs,
    breakpoints: store.breakpoints,
    addNode,
    updateNode,
    updateNodePosition,
    updateNodeExecutionStatus,
    updateNodeOutput,
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
    pauseExecution,
    resumeExecution,
    setCurrentExecutingNode,
    executeWorkflow,
    pollRunStatus,
    reset,
    setDirty,
    toggleBreakpoint,
    addBreakpoint,
    removeBreakpoint,
  };
}

import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeChange,
  EdgeChange,
  OnSelectionChangeFunc,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '@/stores';
import { cn } from '@/lib/utils';
import { nodeTypes } from './nodes';
import { Toolbar } from './Toolbar';
import type { WorkflowEdge, EdgeType } from '@/types';

const edgeStyles: Record<EdgeType, { stroke: string; strokeDasharray?: string }> = {
  default: { stroke: '#888' },
  condition: { stroke: '#10b981', strokeDasharray: '5,5' },
};

interface WorkflowCanvasProps {
  className?: string;
  workflowId?: string;
}

export function WorkflowCanvas({ className, workflowId }: WorkflowCanvasProps) {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    selectNode,
    selectEdge,
    selectedNodeId,
    selectedEdgeId,
    updateNodePosition,
  } = useWorkflowStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  // Sync with store when store changes
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: WorkflowEdge = {
        id: `edge-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        edgeType: 'default',
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Handle node position changes during drag
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      // Update positions in store for nodes that were moved
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [onNodesChange, updateNodePosition]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Handle edge/node selection
  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      if (selectedNodes.length === 1) {
        selectNode(selectedNodes[0].id);
      } else if (selectedNodes.length === 0) {
        // Don't clear selection if edges are selected
        if (selectedEdges.length === 0) {
          selectNode(null);
        }
      }

      if (selectedEdges.length === 1) {
        selectEdge(selectedEdges[0].id);
      } else if (selectedEdges.length === 0) {
        // Don't clear if nodes are selected
        if (selectedNodes.length === 0) {
          selectEdge(null);
        }
      }
    },
    [selectNode, selectEdge]
  );

  // Sync selection state to node data for rendering
  const nodesWithSelection = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    }));
  }, [nodes, selectedNodeId]);

  // Convert store edges to ReactFlow edges with styling
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const edgeType = (edge as WorkflowEdge).edgeType || 'default';
      const style = edgeStyles[edgeType];
      return {
        ...edge,
        style: style,
        selected: edge.id === selectedEdgeId,
        label: (edge as WorkflowEdge).label,
      };
    });
  }, [edges, selectedEdgeId]);

  // Handle edge deletion on keydown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdgeId) {
        useWorkflowStore.getState().removeEdge(selectedEdgeId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId]);

  return (
    <div className={cn('w-full h-full relative', className)}>
      <ReactFlow
        nodes={nodesWithSelection}
        edges={styledEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={null}
        selectionKeyCode={null}
      >
        <Background />
        <Controls />
        <MiniMap />
        <Toolbar workflowId={workflowId} />
      </ReactFlow>
    </div>
  );
}

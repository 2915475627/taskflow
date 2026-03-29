import { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { Trash2 } from 'lucide-react';
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
    removeEdge,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
  } = useWorkflowStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const isInitialized = useRef(false);
  const setStoreNodesRef = useRef(setStoreNodes);
  const setStoreEdgesRef = useRef(setStoreEdges);

  // Keep refs updated
  useEffect(() => {
    setStoreNodesRef.current = setStoreNodes;
    setStoreEdgesRef.current = setStoreEdges;
  }, [setStoreNodes, setStoreEdges]);

  // Initialize from store only once
  useEffect(() => {
    if (!isInitialized.current && storeNodes.length > 0) {
      setNodes(storeNodes);
      isInitialized.current = true;
    }
  }, [storeNodes, setNodes]);

  useEffect(() => {
    if (!isInitialized.current) {
      setEdges(storeEdges);
    }
  }, [storeEdges, setEdges]);

  // Sync nodes back to store on changes
  useEffect(() => {
    if (isInitialized.current) {
      setStoreNodesRef.current(nodes);
    }
  }, [nodes]);

  useEffect(() => {
    if (isInitialized.current) {
      setStoreEdgesRef.current(edges);
    }
  }, [edges]);

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
        if (selectedEdges.length === 0) {
          selectNode(null);
        }
      }

      if (selectedEdges.length === 1) {
        selectEdge(selectedEdges[0].id);
      } else if (selectedEdges.length === 0) {
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
        removeEdge(selectedEdgeId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId, removeEdge]);

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

      {/* Trash drop zone */}
      <TrashDropZone />
    </div>
  );
}

// Trash drop zone component for deleting nodes by drag
import React, { useState } from 'react';

function TrashDropZone() {
  const [isHovering, setIsHovering] = useState(false);
  const { removeNode, selectNode } = useWorkflowStore();

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsHovering(false);
      const nodeId = e.dataTransfer.getData('application/reactflow');
      if (nodeId) {
        removeNode(nodeId);
        selectNode(null);
      }
    },
    [removeNode, selectNode]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  return (
    <div
      className={cn(
        'absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center w-16 h-32 rounded-lg border-2 border-dashed transition-all duration-200',
        isHovering
          ? 'border-red-500 bg-red-500/20 scale-105'
          : 'border-muted-foreground/30 bg-background/80'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Trash2 className={cn('h-6 w-6', isHovering ? 'text-red-500' : 'text-muted-foreground/50')} />
      <span className={cn('text-xs mt-1', isHovering ? 'text-red-500' : 'text-muted-foreground/50')}>
        {isHovering ? 'Drop to delete' : 'Drag here'}
      </span>
    </div>
  );
}

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
    removeNode,
    removeEdge,
    addEdge: addStoreEdge,
  } = useWorkflowStore();

  // Use local state that syncs with ReactFlow
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  // Sync store → local when store changes
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const newEdge: WorkflowEdge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        edgeType: 'default',
      };
      setEdges((eds) => addEdge(newEdge, eds));
      addStoreEdge(newEdge);
    },
    [setEdges, addStoreEdge]
  );

  // Handle node position changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      changes.forEach((change) => {
        if (change.type === 'position' && change.dragging === false && (change.position || change.positionAbsolute)) {
          updateNodePosition(change.id, change.position || change.positionAbsolute!);
        }
        if (change.type === 'remove') {
          removeNode(change.id);
        }
      });
    },
    [onNodesChange, updateNodePosition, removeNode]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      changes.forEach((change) => {
        if (change.type === 'remove') {
          removeEdge(change.id);
        }
      });
    },
    [onEdgesChange, removeEdge]
  );

  // Handle selection
  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      if (selectedNodes.length === 1) {
        selectNode(selectedNodes[0].id);
      } else if (selectedNodes.length === 0 && selectedEdges.length === 0) {
        selectNode(null);
        selectEdge(null);
      }

      if (selectedEdges.length === 1) {
        selectEdge(selectedEdges[0].id);
      }
    },
    [selectNode, selectEdge]
  );

  // Add selected state to nodes
  const nodesWithSelection = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    }));
  }, [nodes, selectedNodeId]);

  // Style edges
  const styledEdges = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      style: edgeStyles[(edge as WorkflowEdge).edgeType || 'default'],
      selected: edge.id === selectedEdgeId,
    }));
  }, [edges, selectedEdgeId]);

  // Delete key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          removeNode(selectedNodeId);
          selectNode(null);
        } else if (selectedEdgeId) {
          removeEdge(selectedEdgeId);
          selectEdge(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, removeNode, removeEdge, selectNode, selectEdge]);

  return (
    <div className={cn('w-full h-full relative', className)}>
      <ReactFlow
        nodes={nodesWithSelection}
        edges={styledEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeClick={(_, node) => selectNode(node.id)}
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

      {/* Delete button when node is selected */}
      {selectedNodeId && (
        <div className="absolute left-4 bottom-4 z-20">
          <button
            onClick={() => {
              removeNode(selectedNodeId);
              selectNode(null);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-sm font-medium">Delete Node</span>
          </button>
        </div>
      )}
    </div>
  );
}

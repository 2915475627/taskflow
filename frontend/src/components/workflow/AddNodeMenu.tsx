import { useState, useRef, useEffect, useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { Plus, Rocket, Flag, Globe, Wrench, GitBranch, Clock } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { NODE_REGISTRY } from '@/lib/nodeRegistry';
import {
  BuiltInNodeType,
  type WorkflowNode,
  type WorkflowNodeData,
  type StartConfig,
  type EndConfig,
  type HttpRequestConfig,
  type McpCallConfig,
  type ConditionConfig,
  type DelayConfig,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useWorkflowStore } from '@/stores';

const NODE_TYPE_ICONS: Record<BuiltInNodeType, typeof Rocket> = {
  [BuiltInNodeType.START]: Rocket,
  [BuiltInNodeType.END]: Flag,
  [BuiltInNodeType.HTTP_REQUEST]: Globe,
  [BuiltInNodeType.MCP_CALL]: Wrench,
  [BuiltInNodeType.CONDITION]: GitBranch,
  [BuiltInNodeType.DELAY]: Clock,
};

interface AddNodeMenuProps {
  className?: string;
}

function createNodeDataForType(type: BuiltInNodeType): WorkflowNodeData {
  const definition = NODE_REGISTRY[type];
  const baseData = {
    name: `New ${definition.label}`,
    description: definition.description,
  };

  switch (type) {
    case BuiltInNodeType.START:
      return { ...baseData, type, config: { ...definition.defaultConfig } as StartConfig };
    case BuiltInNodeType.END:
      return { ...baseData, type, config: { ...definition.defaultConfig } as EndConfig };
    case BuiltInNodeType.HTTP_REQUEST:
      return { ...baseData, type, config: { ...definition.defaultConfig } as HttpRequestConfig };
    case BuiltInNodeType.MCP_CALL:
      return { ...baseData, type, config: { ...definition.defaultConfig } as McpCallConfig };
    case BuiltInNodeType.CONDITION:
      return { ...baseData, type, config: { ...definition.defaultConfig } as ConditionConfig };
    case BuiltInNodeType.DELAY:
      return { ...baseData, type, config: { ...definition.defaultConfig } as DelayConfig };
  }
}

// Calculate a position that doesn't overlap with existing nodes
function calculateNewNodePosition(existingNodes: WorkflowNode[], viewport: { x: number; y: number; zoom: number }): { x: number; y: number } {
  const nodeWidth = 200;
  const nodeHeight = 80;
  const padding = 40;

  // Start from center of visible area
  const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
  const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;

  // Try positions in a grid pattern
  const positions: { x: number; y: number }[] = [];
  const gridOffsets = [
    { dx: 0, dy: 0 },
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
    { dx: 2, dy: 0 }, { dx: -2, dy: 0 }, { dx: 0, dy: 2 }, { dx: 0, dy: -2 },
  ];

  for (const offset of gridOffsets) {
    positions.push({
      x: centerX + offset.dx * (nodeWidth + padding),
      y: centerY + offset.dy * (nodeHeight + padding),
    });
  }

  // Find the first position that doesn't overlap with any existing node
  for (const pos of positions) {
    const hasOverlap = existingNodes.some((node) => {
      const dx = Math.abs(node.position.x - pos.x);
      const dy = Math.abs(node.position.y - pos.y);
      return dx < nodeWidth + padding && dy < nodeHeight + padding;
    });
    if (!hasOverlap) {
      return pos;
    }
  }

  // Fallback to last position if all overlap
  return positions[positions.length - 1];
}

export function AddNodeMenu({ className }: AddNodeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { getViewport } = useReactFlow();
  const { addNode, nodes } = useWorkflowStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddNode = useCallback((type: BuiltInNodeType) => {
    const viewport = getViewport();
    const position = calculateNewNodePosition(nodes as WorkflowNode[], viewport);

    const newNode: WorkflowNode = {
      id: uuidv4(),
      type,
      position,
      data: createNodeDataForType(type),
      executionStatus: 'pending',
    };

    addNode(newNode);
    setIsOpen(false);
  }, [getViewport, nodes, addNode]);

  // Start and End are special - typically only one of each
  const nodeTypesToAdd = [
    BuiltInNodeType.HTTP_REQUEST,
    BuiltInNodeType.MCP_CALL,
    BuiltInNodeType.CONDITION,
    BuiltInNodeType.DELAY,
  ];

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <Button
        variant="default"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsOpen(!isOpen)}
        title="Add node"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-background border rounded-md shadow-lg z-50">
          <div className="p-2">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">Add Node</p>
            {nodeTypesToAdd.map((type) => {
              const Icon = NODE_TYPE_ICONS[type];
              const definition = NODE_REGISTRY[type];
              return (
                <button
                  key={type}
                  onClick={() => handleAddNode(type)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{definition.label}</span>
                </button>
              );
            })}

            <div className="border-t my-2" />

            {/* Special nodes - Start */}
            <button
              onClick={() => handleAddNode(BuiltInNodeType.START)}
              className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-muted rounded-md transition-colors"
            >
              <Rocket className="h-4 w-4 text-green-500" />
              <span className="font-medium">Start</span>
            </button>

            {/* Special nodes - End */}
            <button
              onClick={() => handleAddNode(BuiltInNodeType.END)}
              className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-muted rounded-md transition-colors"
            >
              <Flag className="h-4 w-4 text-red-500" />
              <span className="font-medium">End</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

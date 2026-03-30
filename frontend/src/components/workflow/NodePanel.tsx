import { useWorkflowStore } from '@/stores';
import { BuiltInNodeType, NODE_REGISTRY } from '@/lib/nodeRegistry';
import { Button } from '@/components/ui';
import { X, Trash2 } from 'lucide-react';
import { HttpRequestConfigForm } from './config-forms/HttpRequestConfigForm';
import { McpCallConfigForm } from './config-forms/McpCallConfigForm';
import { ConditionConfigForm } from './config-forms/ConditionConfigForm';
import { DelayConfigForm } from './config-forms/DelayConfigForm';
import { LogConfigForm } from './config-forms/LogConfigForm';
import type {
  HttpRequestNodeData,
  McpCallNodeData,
  ConditionNodeData,
  DelayNodeData,
  LogNodeData
} from '@/types';

export function NodePanel() {
  const { selectedNodeId, nodes, selectNode, updateNode, removeNode } = useWorkflowStore();

  if (!selectedNodeId) {
    return (
      <div className="w-80 border-l bg-background p-4">
        <p className="text-sm text-muted-foreground">Select a node to configure</p>
      </div>
    );
  }

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) {
    return null;
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(node.id, { name: e.target.value } as never);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNode(node.id, { description: e.target.value } as never);
  };

  const renderTypeSpecificConfig = () => {
    switch (node.data.type) {
      case BuiltInNodeType.HTTP_REQUEST:
        return <HttpRequestConfigForm nodeId={node.id} data={node.data as HttpRequestNodeData} />;
      case BuiltInNodeType.MCP_CALL:
        return <McpCallConfigForm nodeId={node.id} data={node.data as McpCallNodeData} />;
      case BuiltInNodeType.CONDITION:
        return <ConditionConfigForm nodeId={node.id} data={node.data as ConditionNodeData} />;
      case BuiltInNodeType.DELAY:
        return <DelayConfigForm nodeId={node.id} data={node.data as DelayNodeData} />;
      case BuiltInNodeType.LOG:
        return <LogConfigForm nodeId={node.id} data={node.data as LogNodeData} />;
      case BuiltInNodeType.START:
      case BuiltInNodeType.END:
        return (
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              {node.data.type === BuiltInNodeType.START
                ? 'Start nodes are entry points with no input handles.'
                : 'End nodes mark the completion of a workflow branch.'}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const definition = NODE_REGISTRY[node.data.type];

  return (
    <div className="w-80 border-l bg-background flex flex-col max-h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-lg">{definition.icon}</span>
          <span className="font-medium">{definition.label}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => selectNode(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node type info */}
        <div className="text-xs text-muted-foreground">
          {definition.description}
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-medium block mb-1">Name</label>
          <input
            type="text"
            value={node.data.name || ''}
            onChange={handleNameChange}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            placeholder="Node name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium block mb-1">Description</label>
          <textarea
            value={node.data.description || ''}
            onChange={handleDescriptionChange}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background resize-none"
            rows={2}
            placeholder="Optional description"
          />
        </div>

        {/* Type-specific configuration */}
        {renderTypeSpecificConfig()}
      </div>

      {/* Footer with delete */}
      <div className="p-4 border-t">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => {
            removeNode(node.id);
            selectNode(null);
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Node
        </Button>
      </div>
    </div>
  );
}

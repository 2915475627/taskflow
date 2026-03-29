import { useWorkflowStore } from '@/stores';
import { Button } from '@/components/ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TriggerData, ActionData } from '@/types';

interface NodePanelProps {
  className?: string;
}

export function NodePanel({ className }: NodePanelProps) {
  const { nodes, selectedNodeId, selectNode } = useWorkflowStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return null;
  }

  const handleClose = () => {
    selectNode(null);
  };

  return (
    <div
      className={cn(
        'w-80 h-full border-l bg-background flex flex-col',
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Node Configuration</h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Node Type</label>
            <p className="text-sm text-muted-foreground capitalize">
              {selectedNode.type}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Node ID</label>
            <p className="text-sm text-muted-foreground font-mono">
              {selectedNode.id}
            </p>
          </div>

          <NodeConfig node={selectedNode} />
        </div>
      </div>
    </div>
  );
}

function NodeConfig({ node }: { node: ReturnType<typeof useWorkflowStore.getState>['nodes'][0] }) {
  const { updateNode } = useWorkflowStore();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(node.id, { name: e.target.value } as never);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNode(node.id, { description: e.target.value } as never);
  };

  return (
    <>
      <div>
        <label className="text-sm font-medium block mb-1">Name</label>
        <input
          type="text"
          value={node.data.name || ''}
          onChange={handleNameChange}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Node name"
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Description</label>
        <textarea
          value={node.data.description || ''}
          onChange={handleDescriptionChange}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Optional description..."
          rows={3}
        />
      </div>

      {node.type === 'trigger' && (
        <TriggerConfig node={node} />
      )}

      {node.type === 'action' && (
        <ActionConfig node={node} />
      )}

      {node.type === 'condition' && (
        <ConditionConfig />
      )}
    </>
  );
}

function TriggerConfig({ node }: { node: ReturnType<typeof useWorkflowStore.getState>['nodes'][0] }) {
  const { updateNode } = useWorkflowStore();
  const triggerData = node.data as TriggerData;

  const handleConfigChange = (key: string, value: string) => {
    const currentConfig = triggerData.config || {};
    updateNode(node.id, { config: { ...currentConfig, [key]: value } } as never);
  };

  return (
    <div className="space-y-3 pt-3 border-t">
      <h3 className="text-sm font-medium">Trigger Settings</h3>

      <div>
        <label className="text-sm block mb-1">Event</label>
        <input
          type="text"
          value={triggerData.config?.event || ''}
          onChange={(e) => handleConfigChange('event', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="e.g., webhook, schedule"
        />
      </div>

      <div>
        <label className="text-sm block mb-1">Cron Expression</label>
        <input
          type="text"
          value={triggerData.config?.cron || ''}
          onChange={(e) => handleConfigChange('cron', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="e.g., * * * * *"
        />
      </div>
    </div>
  );
}

function ActionConfig({ node }: { node: ReturnType<typeof useWorkflowStore.getState>['nodes'][0] }) {
  const { updateNode } = useWorkflowStore();
  const actionData = node.data as ActionData;

  const handleConfigChange = (key: string, value: string) => {
    const currentConfig = actionData.config || {};
    updateNode(node.id, { config: { ...currentConfig, [key]: value } } as never);
  };

  return (
    <div className="space-y-3 pt-3 border-t">
      <h3 className="text-sm font-medium">Action Settings</h3>

      <div>
        <label className="text-sm block mb-1">Service</label>
        <input
          type="text"
          value={actionData.config?.service || ''}
          onChange={(e) => handleConfigChange('service', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="e.g., github, slack"
        />
      </div>

      <div>
        <label className="text-sm block mb-1">Method</label>
        <input
          type="text"
          value={actionData.config?.method || ''}
          onChange={(e) => handleConfigChange('method', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="e.g., POST, GET"
        />
      </div>
    </div>
  );
}

function ConditionConfig() {
  return (
    <div className="space-y-3 pt-3 border-t">
      <h3 className="text-sm font-medium">Condition Settings</h3>
      <p className="text-xs text-muted-foreground">
        Configure conditions to branch workflow execution.
      </p>
    </div>
  );
}

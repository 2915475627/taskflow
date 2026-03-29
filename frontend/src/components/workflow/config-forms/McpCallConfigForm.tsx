import { useWorkflowStore } from '@/stores';
import type { McpCallNodeData } from '@/types';

interface Props {
  nodeId: string;
  data: McpCallNodeData;
}

export function McpCallConfigForm({ nodeId, data }: Props) {
  const { updateNode } = useWorkflowStore();

  const updateConfig = (key: keyof McpCallNodeData['config'], value: unknown) => {
    updateNode(nodeId, {
      config: { ...data.config, [key]: value },
    } as never);
  };

  const handleArgumentsChange = (text: string) => {
    try {
      updateConfig('arguments', JSON.parse(text));
    } catch {
      // Invalid JSON
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t">
      <h3 className="text-sm font-medium">MCP Call Settings</h3>

      <div>
        <label className="text-sm block mb-1">Server Name</label>
        <input
          type="text"
          value={data.config.serverName}
          onChange={(e) => updateConfig('serverName', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          placeholder="filesystem"
        />
      </div>

      <div>
        <label className="text-sm block mb-1">Tool Name</label>
        <input
          type="text"
          value={data.config.toolName}
          onChange={(e) => updateConfig('toolName', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          placeholder="read_file"
        />
      </div>

      <div>
        <label className="text-sm block mb-1">Arguments (JSON)</label>
        <textarea
          value={JSON.stringify(data.config.arguments || {}, null, 2)}
          onChange={(e) => handleArgumentsChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
          rows={3}
          placeholder='{&quot;path&quot;: &quot;/tmp/file.txt&quot;}'
        />
      </div>
    </div>
  );
}
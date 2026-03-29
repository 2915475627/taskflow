import { useWorkflowStore } from '@/stores';
import type { DelayNodeData } from '@/types';

interface Props {
  nodeId: string;
  data: DelayNodeData;
}

export function DelayConfigForm({ nodeId, data }: Props) {
  const { updateNode } = useWorkflowStore();

  const updateConfig = (key: keyof DelayNodeData['config'], value: unknown) => {
    updateNode(nodeId, {
      config: { ...data.config, [key]: value },
    } as never);
  };

  const duration = data.config.duration || 1000;

  return (
    <div className="space-y-3 pt-3 border-t">
      <h3 className="text-sm font-medium">Delay Settings</h3>

      <div>
        <label className="text-sm block mb-1">Duration (milliseconds)</label>
        <input
          type="number"
          value={duration}
          onChange={(e) => updateConfig('duration', parseInt(e.target.value) || 1000)}
          className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          min={100}
          max={600000}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {(duration / 1000).toFixed(1)} seconds
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => updateConfig('duration', 1000)}
          className="px-2 py-1 text-xs border rounded hover:bg-muted"
        >
          1s
        </button>
        <button
          onClick={() => updateConfig('duration', 5000)}
          className="px-2 py-1 text-xs border rounded hover:bg-muted"
        >
          5s
        </button>
        <button
          onClick={() => updateConfig('duration', 30000)}
          className="px-2 py-1 text-xs border rounded hover:bg-muted"
        >
          30s
        </button>
        <button
          onClick={() => updateConfig('duration', 60000)}
          className="px-2 py-1 text-xs border rounded hover:bg-muted"
        >
          1m
        </button>
      </div>
    </div>
  );
}
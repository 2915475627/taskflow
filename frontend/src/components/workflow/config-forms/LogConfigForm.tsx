import { useWorkflowStore } from '@/stores';
import type { LogNodeData } from '@/types';

interface Props {
  nodeId: string;
  data: LogNodeData;
}

const LOG_LEVELS = [
  { value: 'DEBUG', label: 'Debug' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARN', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
];

export function LogConfigForm({ nodeId, data }: Props) {
  const { updateNode } = useWorkflowStore();

  const updateConfig = (key: keyof LogNodeData['config'], value: unknown) => {
    updateNode(nodeId, {
      config: { ...data.config, [key]: value },
    } as never);
  };

  const message = data.config.message || '';
  const level = data.config.level || 'INFO';

  return (
    <div className="space-y-3 pt-3 border-t">
      <h3 className="text-sm font-medium">Log Settings</h3>

      <div>
        <label className="text-sm block mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => updateConfig('message', e.target.value)}
          placeholder="Log message with ${variables}"
          className="w-full px-3 py-2 border rounded-md text-sm bg-background font-mono"
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use {'${variable.path}'} for variable substitution
        </p>
      </div>

      <div>
        <label className="text-sm block mb-1">Log Level</label>
        <select
          value={level}
          onChange={(e) => updateConfig('level', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm bg-background"
        >
          {LOG_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {LOG_LEVELS.map((l) => (
          <button
            key={l.value}
            onClick={() => updateConfig('level', l.value)}
            className={`px-2 py-1 text-xs border rounded ${
              level === l.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

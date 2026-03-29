import { useWorkflowStore } from '@/stores';
import type { HttpRequestNodeData } from '@/types';
import { useState } from 'react';

interface Props {
  nodeId: string;
  data: HttpRequestNodeData;
}

export function HttpRequestConfigForm({ nodeId, data }: Props) {
  const { updateNode } = useWorkflowStore();
  const [headersText, setHeadersText] = useState(
    JSON.stringify(data.config.headers || {}, null, 2)
  );

  const updateConfig = (key: keyof HttpRequestNodeData['config'], value: unknown) => {
    updateNode(nodeId, {
      config: { ...data.config, [key]: value },
    } as never);
  };

  const handleHeadersChange = (text: string) => {
    setHeadersText(text);
    try {
      updateConfig('headers', JSON.parse(text));
    } catch {
      // Invalid JSON, don't update
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t">
      <h3 className="text-sm font-medium">HTTP Request Settings</h3>

      <div>
        <label className="text-sm block mb-1">Method</label>
        <select
          value={data.config.method}
          onChange={(e) => updateConfig('method', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div>
        <label className="text-sm block mb-1">URL</label>
        <input
          type="text"
          value={data.config.url}
          onChange={(e) => updateConfig('url', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
          placeholder="https://api.example.com/endpoint"
        />
      </div>

      <div>
        <label className="text-sm block mb-1">Headers (JSON)</label>
        <textarea
          value={headersText}
          onChange={(e) => handleHeadersChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
          rows={3}
          placeholder='{"Content-Type": "application/json"}'
        />
      </div>

      <div>
        <label className="text-sm block mb-1">Body</label>
        <textarea
          value={data.config.body || ''}
          onChange={(e) => updateConfig('body', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
          rows={4}
          placeholder='{"key": "value"}'
        />
      </div>

      <div>
        <label className="text-sm block mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={data.config.timeout || 30000}
          onChange={(e) => updateConfig('timeout', parseInt(e.target.value) || 30000)}
          className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          min={1000}
          max={300000}
        />
      </div>
    </div>
  );
}
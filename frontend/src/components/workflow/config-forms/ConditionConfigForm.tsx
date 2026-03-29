import { useWorkflowStore } from '@/stores';
import type { ConditionNodeData, ConditionRule } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface Props {
  nodeId: string;
  data: ConditionNodeData;
}

const OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'lt', label: 'Less Than' },
  { value: 'gte', label: 'Greater or Equal' },
  { value: 'lte', label: 'Less or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
];

export function ConditionConfigForm({ nodeId, data }: Props) {
  const { updateNode } = useWorkflowStore();

  const updateConfig = (key: keyof ConditionNodeData['config'], value: unknown) => {
    updateNode(nodeId, {
      config: { ...data.config, [key]: value },
    } as never);
  };

  const addCondition = () => {
    const newCondition: ConditionRule = { field: '', operator: 'eq', value: '' };
    updateConfig('conditions', [...data.config.conditions, newCondition]);
  };

  const updateCondition = (index: number, updates: Partial<ConditionRule>) => {
    const newConditions = data.config.conditions.map((c, i) =>
      i === index ? { ...c, ...updates } : c
    );
    updateConfig('conditions', newConditions);
  };

  const removeCondition = (index: number) => {
    updateConfig('conditions', data.config.conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 pt-3 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Condition Settings</h3>
        <Button variant="outline" size="sm" onClick={addCondition}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <div>
        <label className="text-sm block mb-1">Logic</label>
        <select
          value={data.config.logic}
          onChange={(e) => updateConfig('logic', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="and">All conditions must match (AND)</option>
          <option value="or">Any condition can match (OR)</option>
        </select>
      </div>

      {data.config.conditions.map((condition, index) => (
        <div key={index} className="bg-muted p-3 rounded-md space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium">Condition {index + 1}</span>
            <button
              onClick={() => removeCondition(index)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <input
            type="text"
            value={condition.field}
            onChange={(e) => updateCondition(index, { field: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm font-mono bg-background"
            placeholder="data.field"
          />

          <select
            value={condition.operator}
            onChange={(e) => updateCondition(index, { operator: e.target.value as ConditionRule['operator'] })}
            className="w-full px-2 py-1 border rounded text-sm bg-background"
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>

          <input
            type="text"
            value={String(condition.value ?? '')}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm font-mono bg-background"
            placeholder="value"
          />
        </div>
      ))}

      {data.config.conditions.length === 0 && (
        <p className="text-sm text-muted-foreground">No conditions. Click "Add" to create one.</p>
      )}
    </div>
  );
}
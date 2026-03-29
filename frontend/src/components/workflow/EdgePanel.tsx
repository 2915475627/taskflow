import { useWorkflowStore } from '@/stores';
import { Button } from '@/components/ui';
import { X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EdgeType } from '@/types';

interface EdgePanelProps {
  className?: string;
}

export function EdgePanel({ className }: EdgePanelProps) {
  const { edges, selectedEdgeId, selectEdge, updateEdge, removeEdge } = useWorkflowStore();
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  if (!selectedEdge) {
    return null;
  }

  const handleClose = () => {
    selectEdge(null);
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateEdge(selectedEdge.id, { label: e.target.value });
  };

  const handleEdgeTypeChange = (edgeType: EdgeType) => {
    updateEdge(selectedEdge.id, { edgeType });
  };

  const handleDelete = () => {
    removeEdge(selectedEdge.id);
    selectEdge(null);
  };

  return (
    <div
      className={cn(
        'w-72 h-full border-l bg-background flex flex-col',
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Edge Configuration</h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Edge ID</label>
            <p className="text-sm text-muted-foreground font-mono">
              {selectedEdge.id}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Connection</label>
            <p className="text-sm text-muted-foreground">
              {selectedEdge.source} → {selectedEdge.target}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Label</label>
            <input
              type="text"
              value={selectedEdge.label || ''}
              onChange={handleLabelChange}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="e.g., On success, If true"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Edge Type</label>
            <div className="flex gap-2">
              <Button
                variant={selectedEdge.edgeType === 'default' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleEdgeTypeChange('default')}
              >
                Default
              </Button>
              <Button
                variant={selectedEdge.edgeType === 'condition' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleEdgeTypeChange('condition')}
              >
                Condition
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Edge
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { WorkflowCanvas, NodePanel } from '@/components/workflow';
import { Button } from '@/components/ui';
import { useWorkflowStore, useUIStore } from '@/stores';
import { useWorkflow } from '@/hooks/useWorkflow';
import { ArrowLeft, Save, Play } from 'lucide-react';

export function WorkflowEditorPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const { nodes, edges, isDirty } = useWorkflow();
  const { selectedNodeId } = useWorkflowStore();
  const { openDeployDialog } = useUIStore();
  const { reset } = useWorkflowStore();

  const handleSave = async () => {
    // TODO: Implement save
    console.log('Saving workflow...', { nodes, edges });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            reset();
            navigate('/');
          }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">
            {workflowId ? 'Edit Workflow' : 'New Workflow'}
          </h1>
          {isDirty && (
            <span className="text-xs text-muted-foreground">(unsaved changes)</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={!isDirty}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button onClick={openDeployDialog}>
            <Play className="h-4 w-4 mr-2" />
            Deploy
          </Button>
        </div>
      </header>

      {/* Canvas with NodePanel */}
      <main className="flex-1 flex">
        <div className="flex-1">
          <WorkflowCanvas workflowId={workflowId} />
        </div>
        {selectedNodeId && <NodePanel />}
      </main>
    </div>
  );
}

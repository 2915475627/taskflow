import { useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkflowCanvas, NodePanel } from '@/components/workflow';
import { Button } from '@/components/ui';
import { useWorkflowStore, useUIStore } from '@/stores';
import { useWorkflow } from '@/hooks/useWorkflow';
import { ArrowLeft, Save, Play } from 'lucide-react';
import { workflowApi, versionApi } from '@/services/api';

export function WorkflowEditorPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const { nodes, edges, isDirty, setDirty } = useWorkflow();
  const { selectedNodeId } = useWorkflowStore();
  const { openDeployDialog } = useUIStore();
  const { reset } = useWorkflowStore();

  // Build workflow definition matching backend WorkflowDefinition format
  const buildDefinition = useCallback(() => {
    return {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        name: node.data.name,
        description: node.data.description || '',
        config: node.data.config,
        position: node.position,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
      })),
    };
  }, [nodes, edges]);

  const handleSave = useCallback(async () => {
    if (!workflowId) {
      // Create new workflow first
      try {
        const workflow = await workflowApi.create({
          name: 'New Workflow',
          description: '',
          status: 'draft',
        });
        const definition = buildDefinition();
        await versionApi.create(workflow.id, JSON.stringify(definition), 'Initial version');
        setDirty(false);
        navigate(`/workflow/${workflow.id}`, { replace: true });
      } catch (error) {
        console.error('Failed to create workflow:', error);
      }
    } else {
      // Save new version
      try {
        const definition = buildDefinition();
        await versionApi.create(workflowId, JSON.stringify(definition), 'Updated');
        setDirty(false);
      } catch (error) {
        console.error('Failed to save workflow:', error);
      }
    }
  }, [workflowId, buildDefinition, navigate, setDirty]);

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
          <Button variant="outline" onClick={handleSave} disabled={!isDirty && !!workflowId}>
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

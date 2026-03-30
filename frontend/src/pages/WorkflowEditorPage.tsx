import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkflowCanvas, NodePanel } from '@/components/workflow';
import { Button } from '@/components/ui';
import { useWorkflowStore, useUIStore } from '@/stores';
import { useWorkflow } from '@/hooks/useWorkflow';
import { ArrowLeft, Save, Play, Webhook as WebhookIcon } from 'lucide-react';
import { workflowApi, versionApi } from '@/services/api';
import { WebhookTriggerDialog } from '@/features/editor';
import type { WorkflowNode, WorkflowEdge } from '@/types';
import { BuiltInNodeType } from '@/types';

export function WorkflowEditorPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { nodes, edges, isDirty, setDirty } = useWorkflow();
  const { selectedNodeId, setNodes, setEdges } = useWorkflowStore();
  const { openDeployDialog } = useUIStore();
  const { reset } = useWorkflowStore();
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);

  // Load workflow version when workflowId changes
  useEffect(() => {
    if (!workflowId) return;

    const loadWorkflow = async () => {
      setIsLoading(true);
      try {
        // Fetch workflow details for name
        const workflow = await workflowApi.getById(workflowId);
        setWorkflowName(workflow.name);

        const versions = await versionApi.list(workflowId);
        if (versions.length > 0) {
          // Sort by version descending to get latest
          const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
          const latestVersion = sortedVersions[0];
          const definition = JSON.parse(latestVersion.definition);

          // Convert definition to WorkflowNode/WorkflowEdge
          const loadedNodes: WorkflowNode[] = definition.nodes.map((node: any) => ({
            id: node.id,
            type: node.type,
            position: { x: node.position?.x || 100, y: node.position?.y || 100 },
            data: {
              name: node.name,
              description: node.description || '',
              config: node.config || {},
            },
            executionStatus: 'pending' as const,
          }));

          const loadedEdges: WorkflowEdge[] = definition.edges.map((edge: any) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            edgeType: 'default' as const,
          }));

          setNodes(loadedNodes);
          setEdges(loadedEdges);
          setDirty(false);
        }
      } catch (error) {
        console.error('Failed to load workflow:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [workflowId]);

  // Debug useEffect
  useEffect(() => {
    console.log('isLoading changed to:', isLoading);
  }, [isLoading]);

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
        navigate(`/editor/${workflow.id}`, { replace: true });
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
            {isLoading && ' (loading...)'}
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
          {workflowId && (
            <Button variant="outline" onClick={() => setIsWebhookDialogOpen(true)}>
              <WebhookIcon className="h-4 w-4 mr-2" />
              Webhook
            </Button>
          )}
        </div>
      </header>

      {/* Canvas with NodePanel */}
      <main className="flex-1 flex">
        <div className="flex-1">
          <WorkflowCanvas workflowId={workflowId} />
        </div>
        {selectedNodeId && <NodePanel />}
      </main>

      {/* Webhook Trigger Dialog */}
      {workflowId && (
        <WebhookTriggerDialog
          open={isWebhookDialogOpen}
          onOpenChange={setIsWebhookDialogOpen}
          workflowId={workflowId}
          workflowName={workflowName}
        />
      )}
    </div>
  );
}

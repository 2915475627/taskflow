import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { WorkflowListItem, Workflow } from '@/types';

const TENANT_ID = '1';

async function fetchWorkflows(): Promise<WorkflowListItem[]> {
  const response = await fetch('/api/workflows', {
    headers: {
      'X-Tenant-ID': TENANT_ID,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch workflows');
  const { data } = await response.json();
  return data;
}

async function createWorkflow(name: string, description: string): Promise<Workflow> {
  const response = await fetch('/api/workflows', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT_ID,
    },
    body: JSON.stringify({ name, description }),
  });
  if (!response.ok) throw new Error('Failed to create workflow');
  const { data } = await response.json();
  return data;
}

async function deleteWorkflow(id: string): Promise<void> {
  const response = await fetch(`/api/workflows/${id}`, {
    method: 'DELETE',
    headers: {
      'X-Tenant-ID': TENANT_ID,
    },
  });
  if (!response.ok) throw new Error('Failed to delete workflow');
}

export function WorkflowListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: workflows, isLoading, error } = useQuery({
    queryKey: ['workflows'],
    queryFn: fetchWorkflows,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      createWorkflow(name, description),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setIsCreating(false);
      setNewName('');
      setNewDesc('');
      navigate(`/editor/${data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setDeleteConfirm(null);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      createMutation.mutate({ name: newName.trim(), description: newDesc.trim() });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading workflows...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-destructive">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Workflows</h1>
        <Button onClick={() => setIsCreating(true)}>Create New Workflow</Button>
      </div>

      {/* Create Workflow Modal */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Enter a name and optional description for your new workflow.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="My Workflow"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newName.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
            {createMutation.isError && (
              <p className="text-destructive text-sm mt-2">
                {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create'}
              </p>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {workflows?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No workflows yet</p>
          <Button onClick={() => setIsCreating(true)}>Create Your First Workflow</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows?.map((workflow) => (
            <div
              key={workflow.id}
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Link to={`/editor/${workflow.id}`} className="block">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">{workflow.name}</h2>
                  <StatusBadge status={workflow.status} />
                </div>
                {workflow.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {workflow.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  v{workflow.version} · Updated {workflow.updatedAt ? new Date(workflow.updatedAt).toLocaleDateString() : 'N/A'}
                </p>
              </Link>
              <div className="mt-3 pt-3 border-t flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/editor/${workflow.id}`)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirm(workflow.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-secondary text-secondary-foreground',
    published: 'bg-green-500 text-white',
    disabled: 'bg-muted text-muted-foreground',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded ${colors[status] || ''}`}>
      {status}
    </span>
  );
}

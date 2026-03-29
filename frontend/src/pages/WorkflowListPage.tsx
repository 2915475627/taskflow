import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import type { WorkflowListItem } from '@/types';

async function fetchWorkflows(): Promise<WorkflowListItem[]> {
  const response = await fetch('/api/workflows');
  if (!response.ok) throw new Error('Failed to fetch workflows');
  const { data } = await response.json();
  return data;
}

export function WorkflowListPage() {
  const { data: workflows, isLoading, error } = useQuery({
    queryKey: ['workflows'],
    queryFn: fetchWorkflows,
  });

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
        <Button asChild>
          <Link to="/editor">Create New Workflow</Link>
        </Button>
      </div>

      {workflows?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No workflows yet</p>
          <Button asChild>
            <Link to="/editor">Create Your First Workflow</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows?.map((workflow) => (
            <Link
              key={workflow.id}
              to={`/editor/${workflow.id}`}
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
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
                v{workflow.version} · Updated {new Date(workflow.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    draft: 'bg-secondary text-secondary-foreground',
    published: 'bg-green-500 text-white',
    disabled: 'bg-muted text-muted-foreground',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded ${colors[status as keyof typeof colors] || ''}`}>
      {status}
    </span>
  );
}

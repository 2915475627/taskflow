import { http, HttpResponse, delay } from 'msw';
import type { Workflow, WorkflowListItem } from '@/types';

const mockWorkflows: Workflow[] = [
  {
    id: 'workflow-1',
    name: 'Sample Workflow',
    description: 'A sample workflow for testing',
    nodes: [
      {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          type: 'trigger',
          name: 'Webhook Trigger',
          config: { event: 'push' },
        },
      },
      {
        id: 'node-2',
        type: 'action',
        position: { x: 300, y: 100 },
        data: {
          type: 'action',
          name: 'Send Email',
          config: { service: 'smtp', method: 'send' },
        },
      },
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2' },
    ],
    status: 'draft',
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

export const handlers = [
  // Get all workflows
  http.get('/api/workflows', async () => {
    await delay(200);
    const workflowList: WorkflowListItem[] = mockWorkflows.map(({ id, name, description, status, version, updatedAt }) => ({
      id,
      name,
      description,
      status,
      version,
      updatedAt,
    }));
    return HttpResponse.json({ data: workflowList });
  }),

  // Get workflow by id
  http.get('/api/workflows/:id', async ({ params }) => {
    await delay(200);
    const workflow = mockWorkflows.find((w) => w.id === params.id);
    if (!workflow) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ data: workflow });
  }),

  // Create workflow
  http.post('/api/workflows', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<Workflow>;
    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: body.name || 'New Workflow',
      description: body.description,
      nodes: body.nodes || [],
      edges: body.edges || [],
      status: 'draft',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockWorkflows.push(newWorkflow);
    return HttpResponse.json({ data: newWorkflow }, { status: 201 });
  }),

  // Update workflow
  http.put('/api/workflows/:id', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as Partial<Workflow>;
    const index = mockWorkflows.findIndex((w) => w.id === params.id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockWorkflows[index] = {
      ...mockWorkflows[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json({ data: mockWorkflows[index] });
  }),

  // Delete workflow
  http.delete('/api/workflows/:id', async ({ params }) => {
    await delay(200);
    const index = mockWorkflows.findIndex((w) => w.id === params.id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockWorkflows.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Deploy trigger
  http.post('/api/triggers/:workflowId/deploy', async ({ params }) => {
    await delay(500);
    const workflow = mockWorkflows.find((w) => w.id === params.workflowId);
    if (!workflow) {
      return new HttpResponse(null, { status: 404 });
    }
    workflow.status = 'published';
    workflow.version += 1;
    workflow.updatedAt = new Date().toISOString();
    return HttpResponse.json({
      data: {
        workflowId: workflow.id,
        version: workflow.version,
        status: 'deployed',
        deployedAt: new Date().toISOString(),
      },
    });
  }),

  // Undeploy trigger
  http.post('/api/triggers/:workflowId/undeploy', async ({ params }) => {
    await delay(300);
    const workflow = mockWorkflows.find((w) => w.id === params.workflowId);
    if (!workflow) {
      return new HttpResponse(null, { status: 404 });
    }
    workflow.status = 'disabled';
    workflow.updatedAt = new Date().toISOString();
    return HttpResponse.json({
      data: {
        workflowId: workflow.id,
        status: 'undeployed',
      },
    });
  }),

  // Get version history
  http.get('/api/triggers/:workflowId/versions', async ({ params }) => {
    await delay(200);
    const workflow = mockWorkflows.find((w) => w.id === params.workflowId);
    if (!workflow) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({
      data: [
        {
          version: workflow.version,
          status: workflow.status,
          createdAt: workflow.updatedAt,
        },
      ],
    });
  }),
];

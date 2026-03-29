import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { workflowApi, triggerApi } from '../api';

const server = setupServer(
  http.get('/api/workflows', () =>
    HttpResponse.json({
      data: [
        { id: '1', name: 'Workflow 1', status: 'draft', version: 1, updatedAt: '2024-01-01' },
      ],
    })
  ),
  http.get('/api/workflows/:id', ({ params }) =>
    HttpResponse.json({
      data: {
        id: params.id,
        name: 'Test Workflow',
        status: 'draft',
        version: 1,
        nodes: [],
        edges: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    })
  ),
  http.post('/api/workflows', async ({ request }) => {
    const body = await request.json() as { name?: string };
    return HttpResponse.json(
      { data: { id: 'new-id', name: body.name || 'New', status: 'draft', version: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01' } },
      { status: 201 }
    );
  }),
  http.put('/api/workflows/:id', async ({ params, request }) => {
    const body = await request.json() as { name?: string };
    return HttpResponse.json({
      data: { id: params.id, name: body.name, status: 'draft', version: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    });
  }),
  http.delete('/api/workflows/:id', () => new HttpResponse(null, { status: 204 })),
  http.post('/api/triggers/:workflowId/deploy', ({ params }) =>
    HttpResponse.json({
      data: { workflowId: params.workflowId, version: 2, status: 'deployed', deployedAt: '2024-01-01' },
    })
  ),
  http.post('/api/triggers/:workflowId/undeploy', ({ params }) =>
    HttpResponse.json({
      data: { workflowId: params.workflowId, status: 'undeployed' },
    })
  ),
  http.get('/api/triggers/:workflowId/versions', ({ params }) =>
    HttpResponse.json({
      data: [{ version: 1, status: 'published', createdAt: '2024-01-01' }],
    })
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('workflowApi', () => {
  describe('getAll', () => {
    it('should return list of workflows', async () => {
      const workflows = await workflowApi.getAll();
      expect(workflows).toHaveLength(1);
      expect(workflows[0].name).toBe('Workflow 1');
    });
  });

  describe('getById', () => {
    it('should return workflow by id', async () => {
      const workflow = await workflowApi.getById('1');
      expect(workflow.id).toBe('1');
      expect(workflow.name).toBe('Test Workflow');
    });
  });

  describe('create', () => {
    it('should create a new workflow', async () => {
      const workflow = await workflowApi.create({ name: 'New Workflow' });
      expect(workflow.id).toBe('new-id');
      expect(workflow.name).toBe('New Workflow');
    });
  });

  describe('update', () => {
    it('should update existing workflow', async () => {
      const workflow = await workflowApi.update('1', { name: 'Updated' });
      expect(workflow.name).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('should delete workflow', async () => {
      await expect(workflowApi.delete('1')).resolves.toBeUndefined();
    });
  });
});

describe('triggerApi', () => {
  describe('deploy', () => {
    it('should deploy trigger', async () => {
      const result = await triggerApi.deploy('1');
      expect(result.status).toBe('deployed');
      expect(result.version).toBe(2);
    });
  });

  describe('undeploy', () => {
    it('should undeploy trigger', async () => {
      const result = await triggerApi.undeploy('1');
      expect(result.status).toBe('undeployed');
    });
  });

  describe('getVersions', () => {
    it('should return version history', async () => {
      const versions = await triggerApi.getVersions('1');
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe(1);
    });
  });
});

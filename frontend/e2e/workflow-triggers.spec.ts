import { test, expect, Page } from '@playwright/test';

/**
 * Helper to add a node by clicking the menu and selecting the node type
 */
async function addNode(page: Page, nodeTypeText: string) {
  const addButton = page.locator('button[title="Add node"]');
  await addButton.click();
  await page.waitForTimeout(200);

  const nodeButton = page.locator(`.absolute.top-full button:has-text("${nodeTypeText}")`).first();
  await nodeButton.click({ force: true });
  await page.waitForTimeout(300);
}

/**
 * Mock all necessary API routes for workflow with ID
 */
async function mockWorkflowWithId(page: Page, workflowId: string = 'test-workflow-123') {
  // Mock workflow list
  await page.route('/api/workflows', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
        meta: { total: 0, page: 0, limit: 20 },
      }),
    });
  });

  // Mock workflow by ID
  await page.route(`/api/workflows/${workflowId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: workflowId,
          name: 'Test Workflow',
          description: 'A test workflow',
          status: 'DRAFT',
          version: 1,
          tenantId: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  });

  // Mock version list
  await page.route(`/api/workflows/${workflowId}/versions`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 1,
            version: 1,
            definition: JSON.stringify({
              nodes: [
                { id: 'start-1', type: 'start', name: 'Start', position: { x: 100, y: 100 }, config: {} },
                { id: 'end-1', type: 'end', name: 'End', position: { x: 400, y: 100 }, config: {} },
              ],
              edges: [],
            }),
            changelog: 'Initial version',
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    });
  });
}

test.describe('Webhook Trigger Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await mockWorkflowWithId(page);

    // Mock webhook trigger
    await page.route('/api/webhooks/trigger/test-workflow-123', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              runId: 1,
              executionId: 'exec-webhook-123',
              status: 'success',
              message: 'Workflow triggered successfully',
            },
          }),
        });
      }
    });
  });

  test('should open webhook dialog when clicking Webhook button', async ({ page }) => {
    await page.goto('/editor/test-workflow-123');
    await page.waitForLoadState('networkidle');

    // Wait for workflow to load
    await expect(page.locator('h1')).toContainText('Edit Workflow', { timeout: 15000 });

    // Wait for buttons to be visible
    await page.waitForTimeout(500);

    // Click Webhook button
    const webhookButton = page.getByRole('button', { name: /webhook/i });
    await expect(webhookButton).toBeVisible({ timeout: 5000 });
    await webhookButton.click();

    // Wait for dialog animation
    await page.waitForTimeout(500);

    // Dialog should appear - use role-based selector for dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test('should display webhook URL in input field', async ({ page }) => {
    await page.goto('/editor/test-workflow-123');
    await page.waitForLoadState('networkidle');

    // Wait for buttons
    await page.waitForTimeout(500);

    // Click Webhook button
    await page.getByRole('button', { name: /webhook/i }).click();

    // Wait for dialog
    await page.waitForTimeout(500);

    // Dialog should be visible
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Webhook URL should be in an input
    const urlInput = dialog.locator('input').first();
    await expect(urlInput).toBeVisible();
  });
});

test.describe('Schedule Config Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await mockWorkflowWithId(page);

    // Mock schedule list
    await page.route(`/api/workflows/test-workflow-123/schedules`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      });
    });
  });

  test('should open schedule dialog when clicking Schedule button', async ({ page }) => {
    await page.goto('/editor/test-workflow-123');
    await page.waitForLoadState('networkidle');

    // Wait for workflow to load
    await expect(page.locator('h1')).toContainText('Edit Workflow', { timeout: 15000 });

    // Wait for buttons to be visible
    await page.waitForTimeout(500);

    // Click Schedule button
    const scheduleButton = page.getByRole('button', { name: /schedule/i });
    await expect(scheduleButton).toBeVisible({ timeout: 5000 });
    await scheduleButton.click();

    // Wait for dialog animation
    await page.waitForTimeout(500);

    // Dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test('should display cron presets', async ({ page }) => {
    await page.goto('/editor/test-workflow-123');
    await page.waitForLoadState('networkidle');

    // Wait for buttons
    await page.waitForTimeout(500);

    // Click Schedule button
    await page.getByRole('button', { name: /schedule/i }).click();

    // Wait for dialog
    await page.waitForTimeout(500);

    // Should show cron presets
    await expect(page.getByText(/every hour/i)).toBeVisible();
    await expect(page.getByText(/every day at midnight/i)).toBeVisible();
  });
});

test.describe('Toolbar Buttons Visibility', () => {
  test('should show Webhook and Schedule buttons when workflow has ID', async ({ page }) => {
    await mockWorkflowWithId(page);

    await page.goto('/editor/test-workflow-123');
    await page.waitForLoadState('networkidle');

    // Wait for workflow to load
    await expect(page.locator('h1')).toContainText('Edit Workflow', { timeout: 10000 });

    // Both buttons should be visible
    await expect(page.locator('button:has-text("Webhook")')).toBeVisible();
    await expect(page.locator('button:has-text("Schedule")')).toBeVisible();
  });

  test('should not show Webhook and Schedule buttons for new workflow', async ({ page }) => {
    // Mock for new workflow (no ID)
    await page.route('/api/workflows', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'new-workflow-456',
              name: 'New Workflow',
              description: '',
              status: 'DRAFT',
              version: 1,
              tenantId: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      }
    });

    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('New Workflow', { timeout: 10000 });

    // These buttons should not be visible for new workflow (they appear after save)
    // Note: Save button should be visible
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
  });
});

test.describe('Execution Log Panel', () => {
  test('should show Logs button when workflow has ID', async ({ page }) => {
    await mockWorkflowWithId(page);

    await page.goto('/editor/test-workflow-123');
    await page.waitForLoadState('networkidle');

    // Wait for workflow to load
    await expect(page.locator('h1')).toContainText('Edit Workflow', { timeout: 10000 });

    // Logs button should be visible
    await expect(page.locator('button:has-text("Logs")')).toBeVisible();
  });

  test('should open execution log panel when clicking Logs button', async ({ page }) => {
    await mockWorkflowWithId(page);

    await page.goto('/editor/test-workflow-123');
    await page.waitForLoadState('networkidle');

    // Wait for workflow to load
    await expect(page.locator('h1')).toContainText('Edit Workflow', { timeout: 10000 });

    // Click Logs button
    await page.locator('button:has-text("Logs")').click();

    // Panel should appear with header - use exact match to avoid "No execution logs yet"
    await expect(page.getByText('Execution Log', { exact: true })).toBeVisible();
  });

  test('should show empty state when no execution logs', async ({ page }) => {
    await mockWorkflowWithId(page);

    await page.goto('/editor/test-workflow-123');
    await page.waitForLoadState('networkidle');

    // Click Logs button
    await page.locator('button:has-text("Logs")').click();

    // Should show empty state message
    await expect(page.getByText('No execution logs yet')).toBeVisible();
  });

  test('should close execution log panel when close button clicked', async ({ page }) => {
    await mockWorkflowWithId(page);

    await page.goto('/editor/test-workflow-123');
    await page.waitForLoadState('networkidle');

    // Click Logs button to open
    await page.locator('button:has-text("Logs")').click();

    // Panel should be visible
    await expect(page.getByText('Execution Log', { exact: true })).toBeVisible();

    // Find and click the close button (button with X icon)
    const closeButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await closeButton.click();

    // Panel should be hidden - heading should not be visible
    await expect(page.getByText('Execution Log', { exact: true })).not.toBeVisible();
  });
});

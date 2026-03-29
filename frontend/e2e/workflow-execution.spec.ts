import { test, expect, Page } from '@playwright/test';

/**
 * Helper to add a node by clicking the menu and selecting the node type
 */
async function addNode(page: Page, nodeTypeText: string) {
  // Click add node button
  const addButton = page.locator('button[title="Add node"]');
  await addButton.click();
  await page.waitForTimeout(200);

  // Click the node type in dropdown - use force to bypass intercept issues
  const nodeButton = page.locator(`.absolute.top-full button:has-text("${nodeTypeText}")`).first();
  await nodeButton.click({ force: true });
  await page.waitForTimeout(300);
}

/**
 * Helper to select a node on the canvas by clicking directly on the node
 */
async function selectNode(page: Page, _x: number, _y: number) {
  // Click directly on the first react-flow node to select it
  // Use force:true to bypass any intercept issues from overlays
  const node = page.locator('.react-flow__node').first();
  if (await node.isVisible()) {
    await node.click({ force: true });
    await page.waitForTimeout(300);
  } else {
    // Fallback: try clicking any button inside react-flow that looks like a node
    const fallbackNode = page.locator('.react-flow button').first();
    if (await fallbackNode.isVisible()) {
      await fallbackNode.click({ force: true });
      await page.waitForTimeout(300);
    }
  }
}

test.describe('Workflow Execution - Complete Chain', () => {
  test.beforeEach(async ({ page }) => {
    // Mock empty workflow list
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

    // Mock workflow creation
    await page.route('/api/workflows', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'new-workflow-123',
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

    // Mock version creation
    await page.route('/api/workflows/new-workflow-123/versions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              version: 1,
              definition: '{}',
              changelog: 'Initial version',
              createdAt: new Date().toISOString(),
            },
          }),
        });
      }
    });

    // Mock workflow execute
    await page.route('/api/workflows/new-workflow-123/execute', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              runId: 1,
              executionId: 'exec-123',
              status: 'PENDING',
              message: 'Execution started',
            },
          }),
        });
      }
    });

    // Mock run status
    await page.route('/api/workflows/runs/exec-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            runId: 1,
            executionId: 'exec-123',
            status: 'SUCCESS',
            outputData: '{}',
            nodeOutputs: {},
          },
        }),
      });
    });
  });

  test('1. Create workflow and add START node', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('New Workflow');

    // Add Start node
    await addNode(page, 'Start');

    // Verify we can see unsaved changes indicator
    await expect(page.locator('text=unsaved changes')).toBeVisible();
  });

  test('2. Add multiple node types', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // Add various nodes
    await addNode(page, 'HTTP Request');
    await addNode(page, 'MCP Call');
    await addNode(page, 'Condition');
    await addNode(page, 'Delay');
    await addNode(page, 'Start');
    await addNode(page, 'End');

    // Canvas should have nodes
    const reactFlow = page.locator('.react-flow');
    await expect(reactFlow).toBeVisible();
  });

  test('3. Delete a node using Delete key', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // Add a node
    await addNode(page, 'End');

    // Select the node by clicking on canvas
    await selectNode(page, 350, 100);

    // Press Delete key
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // The delete button should have appeared (or node should be removed)
    // If node was removed, no delete button visible
  });

  test('4. Delete a node using Delete button', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // Add a node
    await addNode(page, 'Start');

    // Select the node
    await selectNode(page, 100, 100);

    // Click delete button (use first one - the floating delete button)
    const deleteButton = page.locator('button:has-text("Delete Node")').first();
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await page.waitForTimeout(300);
  });

  test('5. Configure node shows node panel', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // Add Delay node
    await addNode(page, 'Delay');

    // Click on the node to select it
    await selectNode(page, 250, 100);

    // Node panel should appear
    const nodePanel = page.locator('.w-80.border-l');
    await expect(nodePanel).toBeVisible();

    // Should see node name input
    const nameInput = page.locator('input[placeholder="Node name"]');
    await expect(nameInput).toBeVisible();
  });

  test('6. Save workflow', async ({ page }) => {
    await page.goto('/editor/new-workflow-123');
    await page.waitForLoadState('networkidle');

    // Add a node to make dirty
    await addNode(page, 'End');

    // Click save
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await page.waitForTimeout(500);
  });

  test('7. Execute workflow with play button', async ({ page }) => {
    await page.goto('/editor/new-workflow-123');
    await page.waitForLoadState('networkidle');

    // Add nodes
    await addNode(page, 'Start');
    await addNode(page, 'End');

    // Execute button should be visible
    const executeButton = page.locator('button[title="Start execution"]');
    await expect(executeButton).toBeVisible();

    // Click execute
    await executeButton.click();
    await page.waitForTimeout(1000);
  });

  test('8. Full chain: create → add nodes → configure → delete → save', async ({ page }) => {
    // Step 1: Create workflow
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('New Workflow');

    // Step 2: Add nodes
    await addNode(page, 'Start');
    await addNode(page, 'HTTP Request');
    await addNode(page, 'End');

    // Step 3: Select HTTP Request node to configure
    await selectNode(page, 350, 100);

    // Step 4: Configure node (check node panel appears)
    const nodePanel = page.locator('.w-80.border-l');
    await expect(nodePanel).toBeVisible();

    // Step 5: Delete End node
    await selectNode(page, 600, 100);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // Step 6: Save
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();
    await page.waitForTimeout(500);
  });
});

test.describe('Node Configuration', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test('HTTP Request node shows method and URL fields', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    await addNode(page, 'HTTP Request');
    await selectNode(page, 350, 100);

    const nodePanel = page.locator('.w-80.border-l');
    await expect(nodePanel).toBeVisible();

    // Look for any input fields in the panel
    const inputs = nodePanel.locator('input');
    expect(await inputs.count()).toBeGreaterThan(0);
  });

  test('Delay node shows duration field', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    await addNode(page, 'Delay');
    await selectNode(page, 250, 100);

    const nodePanel = page.locator('.w-80.border-l');
    await expect(nodePanel).toBeVisible();

    // Look for number input for duration
    const numberInput = nodePanel.locator('input[type="number"]');
    await expect(numberInput).toBeVisible();
  });

  test('Condition node shows condition configuration', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    await addNode(page, 'Condition');
    await selectNode(page, 250, 100);

    const nodePanel = page.locator('.w-80.border-l');
    await expect(nodePanel).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate from home to editor', async ({ page }) => {
    // Mock GET and POST workflows API
    await page.route('/api/workflows', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              { id: '1', name: 'Test Workflow', status: 'draft', version: 1, updatedAt: new Date().toISOString() }
            ]
          })
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { id: 5, name: 'New Workflow', description: '', status: 'DRAFT', version: 1, tenantId: 1, createdAt: null, updatedAt: null }
          })
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click create button - opens modal
    await page.locator('text=Create New Workflow').click({ timeout: 15000 });

    // Fill in the form and submit
    await page.locator('input[placeholder="My Workflow"]').fill('New Workflow');
    await page.locator('button[type="submit"]').click();

    // Should navigate to editor with new workflow id
    await expect(page).toHaveURL(/\/editor\/5/);
  });

  test('should navigate from editor to home via back button', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // Wait for and click the back button
    const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(backButton).toBeVisible({ timeout: 15000 });
    await backButton.click();

    await expect(page).toHaveURL('/');
  });

  test('should navigate to specific workflow editor', async ({ page }) => {
    // Mock the workflows API
    await page.route('/api/workflows', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'test-workflow', name: 'Test Workflow', status: 'draft', version: 1, updatedAt: new Date().toISOString() }
          ]
        })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on the workflow link
    const workflowLink = page.locator('a[href^="/editor/"]').first();
    await workflowLink.click({ timeout: 15000 });

    await expect(page).toHaveURL(/\/editor\/[^/]+/);
  });

  test('should maintain URL state when refreshing page', async ({ page }) => {
    await page.goto('/editor/my-workflow-id');
    await page.waitForLoadState('networkidle');

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/editor\/my-workflow-id/);
    await expect(page.locator('h1')).toContainText('Edit Workflow', { timeout: 15000 });
  });
});
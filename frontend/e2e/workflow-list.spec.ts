import { test, expect } from '@playwright/test';

test.describe('Workflow List Page', () => {
  test('should load the workflow list page with heading', async ({ page }) => {
    // Mock the workflows API before navigation
    await page.route('/api/workflows', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: '1', name: 'Test Workflow', status: 'draft', version: 1, updatedAt: new Date().toISOString() }
          ]
        })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify page heading
    await expect(page.locator('h1')).toContainText('Workflows', { timeout: 15000 });
  });

  test('should display workflows after loading', async ({ page }) => {
    // Mock the workflows API
    await page.route('/api/workflows', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: '1', name: 'Test Workflow', status: 'draft', version: 1, updatedAt: new Date().toISOString() }
          ]
        })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for workflow cards to appear
    await expect(page.locator('h2:has-text("Test Workflow")')).toBeVisible({ timeout: 15000 });
  });

  test('should have a create new workflow button', async ({ page }) => {
    await page.route('/api/workflows', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: '1', name: 'Test Workflow', status: 'draft', version: 1, updatedAt: new Date().toISOString() }
          ]
        })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find the create button
    await expect(page.locator('text=Create New Workflow')).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to editor when clicking create button', async ({ page }) => {
    // Mock GET and POST workflows API
    await page.route('/api/workflows', async (route) => {
      const url = route.request().url();
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
            data: { id: 99, name: 'New Workflow', description: '', status: 'DRAFT', version: 1, tenantId: 1, createdAt: null, updatedAt: null }
          })
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click create button - opens modal
    await page.locator('text=Create New Workflow').click();

    // Fill in the form
    await page.locator('input[placeholder="My Workflow"]').fill('New Workflow');

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Should navigate to editor with new workflow id
    await expect(page).toHaveURL(/\/editor\/99/);
  });
});
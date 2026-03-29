import { test, expect } from '@playwright/test';

test.describe('Workflow Editor Page', () => {
  test('should load the workflow editor page', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // Verify the editor page loads with header
    await expect(page.locator('h1')).toContainText('New Workflow', { timeout: 15000 });
  });

  test('should display header with back button, save and deploy buttons', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });

    // Check for Save button
    await expect(page.locator('text=Save')).toBeVisible();

    // Check for Deploy button
    await expect(page.locator('text=Deploy')).toBeVisible();
  });

  test('should show "Edit Workflow" when workflowId is present', async ({ page }) => {
    await page.goto('/editor/test-workflow-id');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Edit Workflow', { timeout: 15000 });
  });

  test('should navigate back to list when clicking back button', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // Wait for the back button to be visible
    const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(backButton).toBeVisible({ timeout: 15000 });
    await backButton.click();

    await expect(page).toHaveURL('/');
  });

  test('should display the workflow canvas', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // ReactFlow canvas should be present
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
  });

  test('should display ReactFlow controls', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // ReactFlow controls
    await expect(page.locator('.react-flow__controls')).toBeVisible({ timeout: 15000 });
  });

  test('should display ReactFlow minimap', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // ReactFlow minimap
    await expect(page.locator('.react-flow__minimap')).toBeVisible({ timeout: 15000 });
  });
});
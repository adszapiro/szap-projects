import { test, expect } from '@playwright/test';

test.describe('Todo App', () => {
  test.use({ baseURL: 'http://localhost:3002' });

  test('main page loads', async ({ page }) => {
    await page.goto('/');
    
    // Check for todo app content
    await expect(page.locator('body')).toBeVisible();
  });

  test('can see todo list area', async ({ page }) => {
    await page.goto('/');
    
    // Should have some form of list or input
    const mainContent = page.locator('main, [class*="todo"], form');
    await expect(mainContent.first()).toBeVisible();
  });
});

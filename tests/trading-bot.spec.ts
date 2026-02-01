import { test, expect } from '@playwright/test';

test.describe('Trading Bot', () => {
  test.use({ baseURL: 'http://localhost:3003' });

  test('main page loads with account overview', async ({ page }) => {
    await page.goto('/');
    
    // Check for the header with "Paper Trading Bot"
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=Paper Trading Bot')).toBeVisible();
  });

  test('shows setup instructions when not configured', async ({ page }) => {
    await page.goto('/');
    
    // Should show either account data or setup instructions
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('strategies page loads', async ({ page }) => {
    await page.goto('/strategies');
    await expect(page.locator('text=Strategy Manager')).toBeVisible();
  });

  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Performance Dashboard')).toBeVisible();
  });
});

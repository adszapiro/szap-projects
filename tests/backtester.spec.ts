import { test, expect } from '@playwright/test';

test.describe('Backtester', () => {
  test.use({ baseURL: 'http://localhost:3001' });

  test('main page loads with chart', async ({ page }) => {
    await page.goto('/');
    
    // Check for the header
    await expect(page.locator('header')).toBeVisible();
    
    // Check for strategy panel or chart
    const mainContent = page.locator('main, [class*="chart"], [class*="Chart"]');
    await expect(mainContent.first()).toBeVisible();
  });

  test('screener page loads', async ({ page }) => {
    await page.goto('/screener');
    await expect(page.locator('body')).toBeVisible();
  });

  test('heatmap page loads', async ({ page }) => {
    await page.goto('/heatmap');
    await expect(page.locator('body')).toBeVisible();
  });

  test('risk page loads', async ({ page }) => {
    await page.goto('/risk');
    await expect(page.locator('body')).toBeVisible();
  });

  test('optimizer page loads', async ({ page }) => {
    await page.goto('/optimizer');
    await expect(page.locator('body')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Portfolio', () => {
  test('homepage loads and shows hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page has loaded
    await expect(page).toHaveTitle(/Alex Szapiro|Portfolio/i);
    
    // Check for main content
    const heroSection = page.locator('main').first();
    await expect(heroSection).toBeVisible();
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Check if navigation links exist
    const nav = page.locator('header nav, nav');
    await expect(nav.first()).toBeVisible();
  });

  test('resume page is accessible', async ({ page }) => {
    await page.goto('/resume');
    
    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();
  });
});

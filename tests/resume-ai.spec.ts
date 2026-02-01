import { test, expect } from '@playwright/test';

test.describe('ResumeAI', () => {
  test.use({ baseURL: 'http://localhost:3001' });

  test('homepage loads and shows main elements', async ({ page }) => {
    await page.goto('/');
    
    // Check page title/header
    await expect(page.locator('text=ResumeAI')).toBeVisible();
    
    // Check for main input areas
    await expect(page.locator('textarea').first()).toBeVisible();
    
    // Check for analyze button
    await expect(page.locator('button', { hasText: /analyze/i })).toBeVisible();
  });

  test('sample data button populates inputs', async ({ page }) => {
    await page.goto('/');
    
    // Click sample data button
    const sampleButton = page.locator('button', { hasText: /sample data/i });
    if (await sampleButton.isVisible()) {
      await sampleButton.click();
      
      // Check that textareas have content
      const textareas = page.locator('textarea');
      const firstTextarea = textareas.first();
      await expect(firstTextarea).not.toBeEmpty();
    }
  });

  test('shows error when trying to analyze empty inputs', async ({ page }) => {
    await page.goto('/');
    
    // Clear any existing content
    const textareas = page.locator('textarea');
    await textareas.first().fill('');
    await textareas.nth(1).fill('');
    
    // Try to analyze
    const analyzeButton = page.locator('button', { hasText: /analyze/i });
    await analyzeButton.click();
    
    // Should show error or button should be disabled
    const errorMessage = page.locator('text=/please provide|error/i');
    const buttonDisabled = await analyzeButton.isDisabled();
    
    expect(await errorMessage.isVisible() || buttonDisabled).toBeTruthy();
  });

  test('clear button removes inputs and results', async ({ page }) => {
    await page.goto('/');
    
    // Fill in some data
    const textareas = page.locator('textarea');
    await textareas.first().fill('Test resume content');
    await textareas.nth(1).fill('Test job description');
    
    // Click clear button if visible
    const clearButton = page.locator('button', { hasText: /clear/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
      
      // Inputs should be empty
      await expect(textareas.first()).toHaveValue('');
    }
  });

  test('accessibility: focusable elements', async ({ page }) => {
    await page.goto('/');
    
    // Tab through page and check focus is visible
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

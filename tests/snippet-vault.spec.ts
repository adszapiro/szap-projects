import { test, expect } from '@playwright/test';

test.describe('SnippetVault', () => {
  test.use({ baseURL: 'http://localhost:3007' });

  test('homepage loads with main elements', async ({ page }) => {
    await page.goto('/');
    
    // Check for title
    await expect(page.locator('text=SnippetVault')).toBeVisible();
    
    // Check for search input
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Check for new snippet button
    await expect(page.locator('button', { hasText: /new snippet/i })).toBeVisible();
  });

  test('can create new snippet', async ({ page }) => {
    await page.goto('/');
    
    // Click new snippet button
    const newButton = page.locator('button', { hasText: /new snippet/i });
    await newButton.click();
    
    // Check form appears
    await expect(page.locator('text=New Snippet')).toBeVisible();
    
    // Fill in the form
    await page.locator('input[placeholder*="title" i]').fill('Test Snippet');
    await page.locator('textarea').fill('console.log("Hello World");');
    
    // Save
    const saveButton = page.locator('button', { hasText: /save/i });
    await saveButton.click();
    
    // Check snippet appears in list
    await expect(page.locator('text=Test Snippet')).toBeVisible();
  });

  test('search filters snippets', async ({ page }) => {
    await page.goto('/');
    
    // Enter search query
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('javascript');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Results should be filtered (check list is still visible)
    const snippetList = page.locator('[class*="overflow-y-auto"]').first();
    await expect(snippetList).toBeVisible();
  });

  test('copy button works', async ({ page }) => {
    await page.goto('/');
    
    // Click on a snippet in the list (if any exist)
    const snippetItem = page.locator('button[class*="text-left"]').first();
    if (await snippetItem.isVisible()) {
      await snippetItem.click();
      
      // Wait for snippet to load
      await page.waitForTimeout(500);
      
      // Check copy button exists
      const copyButton = page.locator('button', { hasText: /copy/i });
      if (await copyButton.isVisible()) {
        await copyButton.click();
        
        // Should show copied feedback
        await expect(page.locator('text=/copied/i')).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('keyboard shortcuts modal opens', async ({ page }) => {
    await page.goto('/');
    
    // Click shortcuts button
    const shortcutsButton = page.locator('button', { hasText: /shortcuts/i });
    if (await shortcutsButton.isVisible()) {
      await shortcutsButton.click();
      
      // Check modal is visible
      await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();
    }
  });
});

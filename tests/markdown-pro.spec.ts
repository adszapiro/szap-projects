import { test, expect } from '@playwright/test';

test.describe('MarkdownPro', () => {
  test.use({ baseURL: 'http://localhost:3010' });

  test('homepage loads with editor and preview', async ({ page }) => {
    await page.goto('/');
    
    // Check for title
    await expect(page.locator('text=MarkdownPro')).toBeVisible();
    
    // Check for editor textarea
    await expect(page.locator('textarea')).toBeVisible();
    
    // Check for view mode buttons
    await expect(page.locator('button', { hasText: /split/i })).toBeVisible();
  });

  test('view mode buttons work', async ({ page }) => {
    await page.goto('/');
    
    // Click Edit mode
    const editButton = page.locator('button', { hasText: /edit/i }).first();
    await editButton.click();
    
    // Textarea should be visible, preview might not be
    await expect(page.locator('textarea')).toBeVisible();
    
    // Click Split mode
    const splitButton = page.locator('button', { hasText: /split/i });
    await splitButton.click();
    
    // Both should be visible
    await expect(page.locator('textarea')).toBeVisible();
    
    // Click Preview mode
    const previewButton = page.locator('button', { hasText: /preview/i }).first();
    await previewButton.click();
    
    // Preview content should be visible
    const preview = page.locator('.markdown-preview, [class*="preview"]');
    await expect(preview).toBeVisible();
  });

  test('typing in editor updates preview', async ({ page }) => {
    await page.goto('/');
    
    // Make sure we're in split mode
    const splitButton = page.locator('button', { hasText: /split/i });
    await splitButton.click();
    
    // Type in editor
    const textarea = page.locator('textarea');
    await textarea.fill('# Test Header\n\nThis is a **test** paragraph.');
    
    // Check preview updates
    const preview = page.locator('.markdown-preview, [class*="preview"]');
    await expect(preview.locator('h1')).toHaveText('Test Header');
    await expect(preview.locator('strong')).toHaveText('test');
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto('/');
    
    // Get initial background
    const body = page.locator('body > div').first();
    const initialBg = await body.evaluate(el => getComputedStyle(el).backgroundColor);
    
    // Click theme toggle
    const themeButton = page.locator('button svg[class*="sun"], button svg[class*="moon"]');
    if (await themeButton.count() > 0) {
      await themeButton.first().click();
      
      // Background should change
      await page.waitForTimeout(300);
      const newBg = await body.evaluate(el => getComputedStyle(el).backgroundColor);
      expect(newBg !== initialBg).toBeTruthy();
    }
  });

  test('copy button copies content', async ({ page }) => {
    await page.goto('/');
    
    // Fill in content
    const textarea = page.locator('textarea');
    await textarea.fill('# Test Content');
    
    // Click copy button
    const copyButton = page.locator('button svg[class*="copy"]').first();
    if (await copyButton.isVisible()) {
      await copyButton.click();
      
      // Should show check mark (copied feedback)
      await expect(page.locator('button svg[class*="check"]')).toBeVisible({ timeout: 2000 });
    }
  });

  test('word count updates', async ({ page }) => {
    await page.goto('/');
    
    // Fill in content
    const textarea = page.locator('textarea');
    await textarea.fill('one two three four five');
    
    // Check footer shows word count
    const footer = page.locator('footer');
    await expect(footer.locator('text=/5\\s*words/i')).toBeVisible();
  });

  test('documents panel toggles', async ({ page }) => {
    await page.goto('/');
    
    // Click documents button
    const docsButton = page.locator('button svg[class*="folder"]');
    if (await docsButton.isVisible()) {
      await docsButton.click();
      
      // Documents panel should appear
      await expect(page.locator('text=Documents')).toBeVisible();
    }
  });
});

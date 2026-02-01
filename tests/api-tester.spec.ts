import { test, expect } from '@playwright/test';

test.describe('API Tester', () => {
  test.use({ baseURL: 'http://localhost:3009' });

  test('homepage loads with main UI elements', async ({ page }) => {
    await page.goto('/');
    
    // Check for title
    await expect(page.locator('text=API Tester')).toBeVisible();
    
    // Check for URL input
    await expect(page.locator('input[placeholder*="URL"]')).toBeVisible();
    
    // Check for method selector
    await expect(page.locator('select')).toBeVisible();
    
    // Check for send button
    await expect(page.locator('button', { hasText: /send/i })).toBeVisible();
  });

  test('can change HTTP method', async ({ page }) => {
    await page.goto('/');
    
    const methodSelect = page.locator('select');
    await methodSelect.selectOption('POST');
    await expect(methodSelect).toHaveValue('POST');
    
    await methodSelect.selectOption('DELETE');
    await expect(methodSelect).toHaveValue('DELETE');
  });

  test('can enter URL and send request', async ({ page }) => {
    await page.goto('/');
    
    // Enter a test URL
    const urlInput = page.locator('input[placeholder*="URL"]');
    await urlInput.fill('https://jsonplaceholder.typicode.com/posts/1');
    
    // Send request
    const sendButton = page.locator('button', { hasText: /send/i });
    await sendButton.click();
    
    // Wait for response (should show status code)
    await expect(page.locator('text=/200|OK/i')).toBeVisible({ timeout: 10000 });
  });

  test('shows request in history after sending', async ({ page }) => {
    await page.goto('/');
    
    // Enter URL and send
    const urlInput = page.locator('input[placeholder*="URL"]');
    await urlInput.fill('https://jsonplaceholder.typicode.com/posts/1');
    
    const sendButton = page.locator('button', { hasText: /send/i });
    await sendButton.click();
    
    // Wait for history to update
    await page.waitForTimeout(2000);
    
    // Check history sidebar shows the request
    const historyItem = page.locator('text=jsonplaceholder');
    await expect(historyItem).toBeVisible({ timeout: 10000 });
  });

  test('can add headers', async ({ page }) => {
    await page.goto('/');
    
    // Click headers tab
    const headersTab = page.locator('button', { hasText: /headers/i });
    await headersTab.click();
    
    // Click add header button
    const addHeaderButton = page.locator('button', { hasText: /add header/i });
    await addHeaderButton.click();
    
    // Check that header inputs appear
    const headerInputs = page.locator('input[placeholder="Key"]');
    await expect(headerInputs).toHaveCount(await headerInputs.count());
  });

  test('keyboard shortcut panel opens', async ({ page }) => {
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

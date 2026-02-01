import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Test files organized by app:
 * - portfolio.spec.ts (port 3000)
 * - resume-ai.spec.ts (port 3001)
 * - api-tester.spec.ts (port 3009)
 * - snippet-vault.spec.ts (port 3007)
 * - markdown-pro.spec.ts (port 3010)
 * 
 * Run individual app tests with:
 * npx playwright test tests/portfolio.spec.ts
 * 
 * Run all tests (requires apps to be running):
 * npx playwright test
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  // Note: Web servers need to be started manually for full test suite
  // Each test file sets its own baseURL using test.use()
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run dev -w portfolio',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});

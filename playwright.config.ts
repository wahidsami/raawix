import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Raawi X Widget
 * 
 * Tests run against test sites at http://localhost:4173
 * - /good - Good accessibility page
 * - /messy - Messy accessibility page
 */
export default defineConfig({
  testDir: './tests/widget-e2e',
  outputDir: 'test-results/playwright-artifacts',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never', outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    ['./tests/widget-e2e/summary-reporter.ts'],
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:4173',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
  },

        /* Configure projects for major browsers */
        projects: [
          {
            name: 'chromium',
            testIgnore: '**/integration.spec.ts',
            use: { ...devices['Desktop Chrome'] },
          },
          {
            name: 'integration',
            testMatch: '**/integration.spec.ts',
            use: { ...devices['Desktop Chrome'] },
          },
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm --filter @raawi-x/test-sites dev -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});


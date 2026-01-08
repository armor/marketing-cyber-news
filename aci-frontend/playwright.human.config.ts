import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for human-like UI tests.
 * These tests run in headed mode with slower execution to simulate real user behavior.
 */
export default defineConfig({
  testDir: './tests/human',

  /* Longer timeout for human-like tests */
  timeout: 120 * 1000,

  /* Run tests sequentially */
  fullyParallel: false,

  /* No retries for human tests */
  retries: 0,

  /* Single worker */
  workers: 1,

  /* Reporter */
  reporter: [
    ['html', { outputFolder: 'tests/reports/human-html' }],
    ['list']
  ],

  /* Shared settings */
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    actionTimeout: 30000,
    /* Slow down actions for visibility */
    launchOptions: {
      slowMo: 100,
    },
  },

  /* Configure projects */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ],
          slowMo: 100,
        }
      },
    },
  ],

  /* Output directory */
  outputDir: 'tests/artifacts/human',

  /* Don't start dev server - assume it's already running for human tests */
  webServer: {
    command: 'npm run dev:e2e -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});

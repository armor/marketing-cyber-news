import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load backend test environment - ALWAYS use real backend
const envPath = resolve(__dirname, 'tests/.env.backend');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join('=');
      }
    }
  }
}

// Force real backend mode - no exceptions
process.env.USE_REAL_BACKEND = 'true';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * IMPORTANT: All E2E tests run against the LIVE backend.
 * MSW mocks are disabled. Tests require:
 * 1. Backend running on port 8080
 * 2. Database seeded with test data
 * 3. Test users created (see tests/.env.backend)
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Maximum time one test can run for - increased for real API calls */
  timeout: 90 * 1000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 15000,
  },

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : 1,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'tests/reports/playwright-html' }],
    ['json', { outputFile: 'tests/reports/playwright-results.json' }],
    ['list']
  ],

  /* Global setup - verify backend is running */
  globalSetup: './tests/helpers/global-setup.ts',

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Viewport */
    viewport: { width: 1920, height: 1080 },

    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,

    /* Network idle timeout - increased for real API */
    actionTimeout: 20000,

    /* Extra HTTP headers to identify test traffic */
    extraHTTPHeaders: {
      'X-Test-Mode': 'e2e-integration',
    },
  },

  /* Configure projects for major browsers and test suites */
  projects: [
    // Backend Integration - PRIMARY project for all tests
    // All tests run against the LIVE backend
    {
      name: 'backend-integration',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        },
        // Longer timeouts for real API calls
        actionTimeout: 30000,
        navigationTimeout: 60000,
      },
    },

    // Default chromium - alias for backend-integration
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        }
      },
    },

    // Integration tests - specifically for tests/e2e/integration/
    {
      name: 'integration',
      testDir: './tests/e2e/integration',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        },
        // Longer timeouts for complex integration scenarios
        actionTimeout: 45000,
        navigationTimeout: 90000,
      },
    },

    // Marketing Autopilot regression suite
    {
      name: 'marketing',
      testMatch: /marketing.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        }
      },
    },

    // Newsletter regression suite
    {
      name: 'newsletter',
      testMatch: /newsletter.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        }
      },
    },

    // Full regression suite (all tests)
    {
      name: 'regression',
      testMatch: /.*(regression|complete).*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        }
      },
    },

    // Smoke tests (quick sanity checks)
    {
      name: 'smoke',
      testMatch: /.*smoke.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        }
      },
    },

    // Mobile regression
    {
      name: 'mobile',
      testMatch: /.*(mobile|responsive).*\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'tests/artifacts',

  /* Run your local dev server before starting the tests - disabled for K8s testing */
  webServer: process.env.TEST_BASE_URL && !process.env.TEST_BASE_URL.includes('localhost')
    ? undefined
    : {
        command: 'npm run dev:e2e -- --port 5173',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});

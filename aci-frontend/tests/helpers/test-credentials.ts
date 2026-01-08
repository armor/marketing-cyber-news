/**
 * Test credentials management
 *
 * Supports both MSW mocks and real backend testing
 *
 * Environment variables (for real backend):
 * - USE_REAL_BACKEND=true
 * - TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 * - TEST_MARKETING_EMAIL, TEST_MARKETING_PASSWORD
 * - TEST_VIEWER_EMAIL, TEST_VIEWER_PASSWORD
 */

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export interface TestCredentials {
  readonly admin: Credentials;
  readonly marketing: Credentials;
  readonly viewer: Credentials;
}

export type TestMode = 'msw' | 'real';
export type UserRole = 'admin' | 'marketing' | 'viewer';

/**
 * Test mode is ALWAYS 'real' - no MSW mocks allowed
 *
 * All E2E tests run against the live backend with seeded test data.
 */
export const TEST_MODE: TestMode = 'real';

/**
 * Get test credentials based on environment
 *
 * IMPORTANT: MSW credentials must match fixtures in src/mocks/fixtures/users.ts
 */
export function getTestCredentials(): TestCredentials {
  if (TEST_MODE === 'real') {
    return getRealBackendCredentials();
  }

  return getMockCredentials();
}

/**
 * Get credentials for real backend testing
 *
 * Requires environment variables to be set
 */
function getRealBackendCredentials(): TestCredentials {
  return {
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'TestPass123!',
    },
    marketing: {
      email: process.env.TEST_MARKETING_EMAIL || 'marketing@test.com',
      password: process.env.TEST_MARKETING_PASSWORD || 'TestPass123!',
    },
    viewer: {
      email: process.env.TEST_VIEWER_EMAIL || 'test@example.com',
      password: process.env.TEST_VIEWER_PASSWORD || 'TestPass123!',
    },
  };
}

/**
 * Get credentials for MSW mock testing
 *
 * CRITICAL: These MUST match src/mocks/fixtures/users.ts
 */
function getMockCredentials(): TestCredentials {
  return {
    admin: {
      email: 'admin@test.com',
      password: 'TestPass123',
    },
    marketing: {
      email: 'marketing@test.com',
      password: 'TestPass123',
    },
    viewer: {
      email: 'test@example.com',
      password: 'TestPass123',
    },
  };
}

/**
 * Get credentials for a specific role
 */
export function getCredentialsForRole(role: UserRole): Credentials {
  const allCredentials = getTestCredentials();
  return allCredentials[role];
}

/**
 * Check if running against real backend
 */
export function isRealBackend(): boolean {
  return TEST_MODE === 'real';
}

/**
 * Check if running with MSW mocks
 */
export function isMockMode(): boolean {
  return TEST_MODE === 'msw';
}

/**
 * Get base URL based on test mode
 */
export function getBaseUrl(): string {
  if (TEST_MODE === 'real') {
    return process.env.TEST_BASE_URL || 'http://localhost:3001';
  }

  // MSW runs with Vite dev server
  return process.env.TEST_BASE_URL || 'http://localhost:5173';
}

/**
 * Get API base URL
 */
export function getApiBaseUrl(): string {
  if (TEST_MODE === 'real') {
    return process.env.TEST_API_URL || 'http://localhost:8080';
  }

  // MSW intercepts requests, but we still need a valid URL
  return process.env.TEST_API_URL || 'http://localhost:8080';
}

/**
 * Validate environment configuration for real backend testing
 *
 * Call this in beforeAll hook when USE_REAL_BACKEND=true
 */
export function validateRealBackendConfig(): void {
  if (TEST_MODE !== 'real') {
    return;
  }

  const requiredVars = [
    'TEST_ADMIN_EMAIL',
    'TEST_ADMIN_PASSWORD',
    'TEST_MARKETING_EMAIL',
    'TEST_MARKETING_PASSWORD',
    'TEST_VIEWER_EMAIL',
    'TEST_VIEWER_PASSWORD',
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.warn(
      `Warning: Missing environment variables for real backend testing:\n  ${missing.join('\n  ')}\n` +
        'Using default credentials. Create tests/.env file with real credentials.'
    );
  }
}

/**
 * Get timeout multiplier based on test mode
 *
 * Real backend may be slower, use longer timeouts
 */
export function getTimeoutMultiplier(): number {
  return TEST_MODE === 'real' ? 2 : 1;
}

/**
 * Get default test timeout
 */
export function getDefaultTimeout(): number {
  const baseTimeout = 30000; // 30 seconds
  return baseTimeout * getTimeoutMultiplier();
}

/**
 * Wait time for network operations
 */
export function getNetworkTimeout(): number {
  const baseTimeout = 5000; // 5 seconds
  return baseTimeout * getTimeoutMultiplier();
}

/**
 * Print test configuration (useful for debugging)
 */
export function printTestConfig(): void {
  console.log('\n=== Test Configuration ===');
  console.log(`Mode: ${TEST_MODE}`);
  console.log(`Base URL: ${getBaseUrl()}`);
  console.log(`API URL: ${getApiBaseUrl()}`);
  console.log(`Timeout Multiplier: ${getTimeoutMultiplier()}x`);
  console.log(`Default Timeout: ${getDefaultTimeout()}ms`);

  if (TEST_MODE === 'real') {
    console.log('\nReal Backend Credentials:');
    const creds = getTestCredentials();
    console.log(`  Admin: ${creds.admin.email}`);
    console.log(`  Marketing: ${creds.marketing.email}`);
    console.log(`  Viewer: ${creds.viewer.email}`);
  } else {
    console.log('\nMSW Mock Mode (using fixture credentials)');
  }

  console.log('==========================\n');
}

/**
 * Environment configuration object
 */
export const testConfig = {
  mode: TEST_MODE,
  baseUrl: getBaseUrl(),
  apiUrl: getApiBaseUrl(),
  timeout: getDefaultTimeout(),
  networkTimeout: getNetworkTimeout(),
  isRealBackend: isRealBackend(),
  isMockMode: isMockMode(),
} as const;

/**
 * Backend Authentication Helpers for E2E Tests
 *
 * These helpers are specifically designed for testing against the LIVE backend.
 * They use the test credentials from the seed data and provide role-based
 * authentication with deep verification.
 *
 * IMPORTANT: All tests run against the real backend - no MSW mocks.
 */

import { Page, expect, Response } from '@playwright/test';
import { selectors } from './selectors';
import { verifyApiCall } from './api-assertions';

// =============================================================================
// Types
// =============================================================================

export type BackendRole =
  | 'admin'
  | 'super_admin'
  | 'marketing'
  | 'branding'
  | 'soc_level_1'
  | 'soc_level_3'
  | 'ciso'
  | 'viewer';

export interface BackendCredentials {
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly role: BackendRole;
}

export interface AuthenticatedSession {
  readonly token: string;
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly role: string;
  };
  readonly response: Response;
}

// =============================================================================
// Backend Test Credentials
// =============================================================================

/**
 * Credentials that match the seed data in aci-backend/scripts/seed-test-data.sql
 *
 * Password for all test users: TestPass123 (bcrypt hashed in DB)
 */
const BACKEND_CREDENTIALS: Record<BackendRole, BackendCredentials> = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestPass123',
    name: 'Admin User',
    role: 'admin',
  },
  super_admin: {
    email: 'superadmin@test.com',
    password: 'TestPass123',
    name: 'Super Admin',
    role: 'super_admin',
  },
  marketing: {
    email: process.env.TEST_MARKETING_EMAIL || 'marketing@example.com',
    password: process.env.TEST_MARKETING_PASSWORD || 'TestPass123',
    name: 'Marketing User',
    role: 'marketing',
  },
  branding: {
    email: 'branding@test.com',
    password: 'TestPass123',
    name: 'Branding User',
    role: 'branding',
  },
  soc_level_1: {
    email: 'soc1@test.com',
    password: 'TestPass123',
    name: 'SOC Level 1',
    role: 'soc_level_1',
  },
  soc_level_3: {
    email: 'soc3@test.com',
    password: 'TestPass123',
    name: 'SOC Level 3',
    role: 'soc_level_3',
  },
  ciso: {
    email: 'ciso@test.com',
    password: 'TestPass123',
    name: 'CISO User',
    role: 'ciso',
  },
  viewer: {
    email: process.env.TEST_VIEWER_EMAIL || 'test@example.com',
    password: process.env.TEST_VIEWER_PASSWORD || 'TestPass123',
    name: 'Test Viewer',
    role: 'viewer',
  },
};

// Alias mappings for convenience
const ROLE_ALIASES: Record<string, BackendRole> = {
  admin: 'admin',
  administrator: 'admin',
  super_admin: 'super_admin',
  superadmin: 'super_admin',
  marketing: 'marketing',
  branding: 'branding',
  soc1: 'soc_level_1',
  soc_level_1: 'soc_level_1',
  soc3: 'soc_level_3',
  soc_level_3: 'soc_level_3',
  ciso: 'ciso',
  viewer: 'viewer',
  readonly: 'viewer',
};

// =============================================================================
// Core Authentication Functions
// =============================================================================

/**
 * Get credentials for a specific role
 */
export function getBackendCredentials(role: BackendRole | string): BackendCredentials {
  const normalizedRole = ROLE_ALIASES[role.toLowerCase()] || (role as BackendRole);
  const creds = BACKEND_CREDENTIALS[normalizedRole];

  if (!creds) {
    throw new Error(
      `Unknown role: ${role}. Valid roles: ${Object.keys(BACKEND_CREDENTIALS).join(', ')}`
    );
  }

  return creds;
}

/**
 * Authenticate against the real backend
 *
 * MANDATORY PATTERN: Verifies API call and token storage
 *
 * @example
 * const session = await authenticateBackend(page, 'marketing');
 * // User is now logged in as marketing user
 */
export async function authenticateBackend(
  page: Page,
  role: BackendRole | string
): Promise<AuthenticatedSession> {
  const creds = getBackendCredentials(role);

  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill credentials
  await page.locator(selectors.auth.emailInput).fill(creds.email);
  await page.locator(selectors.auth.passwordInput).fill(creds.password);

  // Submit and verify API call
  const response = await verifyApiCall(
    page,
    () => page.locator(selectors.auth.submitButton).click(),
    { method: 'POST', urlPattern: '/auth/login' }
  );

  // Verify token stored in localStorage
  const token = await page.evaluate(() => localStorage.getItem('aci_access_token'));
  expect(token, `Access token should be stored after login as ${role}`).toBeTruthy();

  // Verify user data stored
  const userJson = await page.evaluate(() => localStorage.getItem('aci_user'));
  expect(userJson, `User data should be stored after login as ${role}`).toBeTruthy();

  const user = userJson ? JSON.parse(userJson) : null;

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard|\/$/);
  await page.waitForLoadState('networkidle');

  return {
    token: token!,
    user,
    response,
  };
}

/**
 * Authenticate with specific email and password
 *
 * Use when testing with non-standard credentials
 */
export async function authenticateWithCredentials(
  page: Page,
  email: string,
  password: string
): Promise<AuthenticatedSession> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.locator(selectors.auth.emailInput).fill(email);
  await page.locator(selectors.auth.passwordInput).fill(password);

  const response = await verifyApiCall(
    page,
    () => page.locator(selectors.auth.submitButton).click(),
    { method: 'POST', urlPattern: '/auth/login' }
  );

  const token = await page.evaluate(() => localStorage.getItem('aci_access_token'));
  expect(token, 'Access token should be stored').toBeTruthy();

  const userJson = await page.evaluate(() => localStorage.getItem('aci_user'));
  const user = userJson ? JSON.parse(userJson) : null;

  await page.waitForURL(/dashboard|\/$/);
  await page.waitForLoadState('networkidle');

  return {
    token: token!,
    user,
    response,
  };
}

/**
 * Quick authentication using direct API call (faster than UI login)
 *
 * Use when you need to authenticate quickly and UI testing isn't the focus
 */
export async function authenticateViaApi(
  page: Page,
  role: BackendRole | string
): Promise<AuthenticatedSession> {
  const creds = getBackendCredentials(role);
  const apiUrl = process.env.TEST_API_URL || process.env.VITE_API_URL || 'http://localhost:8080';

  // Make direct API call
  const response = await page.request.post(`${apiUrl}/v1/auth/login`, {
    data: {
      email: creds.email,
      password: creds.password,
    },
  });

  expect(response.ok(), `Login API should succeed for ${role}`).toBe(true);

  const data = await response.json();

  // Store auth in localStorage
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('aci_access_token', token);
      localStorage.setItem('aci_user', JSON.stringify(user));
    },
    { token: data.token, user: data.user }
  );

  return {
    token: data.token,
    user: data.user,
    response: response as unknown as Response,
  };
}

// =============================================================================
// Session Management
// =============================================================================

/**
 * Logout current user
 */
export async function logoutBackend(page: Page): Promise<void> {
  // Try to call logout API if available
  try {
    const apiUrl = process.env.TEST_API_URL || process.env.VITE_API_URL || 'http://localhost:8080';
    const token = await page.evaluate(() => localStorage.getItem('aci_access_token'));

    if (token) {
      await page.request.post(`${apiUrl}/v1/auth/logout`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Logout API may not exist - continue with client-side cleanup
  }

  // Clear auth tokens
  await page.evaluate(() => {
    localStorage.removeItem('aci_access_token');
    localStorage.removeItem('aci_refresh_token');
    localStorage.removeItem('aci_user');
  });

  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
}

/**
 * Clear all authentication state
 */
export async function clearBackendAuthState(page: Page): Promise<void> {
  // Navigate to a page first to have access to localStorage
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Check if user is authenticated
 */
export async function isBackendAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('aci_access_token'));
  return !!token;
}

/**
 * Get current authenticated user
 */
export async function getCurrentBackendUser(page: Page): Promise<any | null> {
  const userJson = await page.evaluate(() => localStorage.getItem('aci_user'));
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Ensure user is logged in with specific role
 *
 * Use in beforeEach hooks for tests that need authentication
 */
export async function ensureBackendLoggedIn(
  page: Page,
  role: BackendRole | string = 'viewer'
): Promise<AuthenticatedSession | null> {
  const authenticated = await isBackendAuthenticated(page);

  if (!authenticated) {
    return await authenticateBackend(page, role);
  }

  // Return existing session info
  const token = await page.evaluate(() => localStorage.getItem('aci_access_token'));
  const userJson = await page.evaluate(() => localStorage.getItem('aci_user'));
  const user = userJson ? JSON.parse(userJson) : null;

  return {
    token: token!,
    user,
    response: null as unknown as Response,
  };
}

// =============================================================================
// Role Verification
// =============================================================================

/**
 * Verify current user has expected role
 */
export async function verifyUserRole(page: Page, expectedRole: BackendRole | string): Promise<void> {
  const user = await getCurrentBackendUser(page);
  expect(user, 'User should be logged in').toBeTruthy();

  const normalizedExpected = ROLE_ALIASES[expectedRole.toLowerCase()] || expectedRole;

  // Role might be stored differently - check common patterns
  const actualRole = user?.role?.toLowerCase() || user?.roles?.[0]?.toLowerCase();
  const normalizedActual = ROLE_ALIASES[actualRole] || actualRole;

  expect(
    normalizedActual,
    `Expected user role ${normalizedExpected}, got ${actualRole}`
  ).toBe(normalizedExpected);
}

/**
 * List all available test roles
 */
export function getAvailableRoles(): BackendRole[] {
  return Object.keys(BACKEND_CREDENTIALS) as BackendRole[];
}

/**
 * Get all test credentials (for iteration in tests)
 */
export function getAllBackendCredentials(): BackendCredentials[] {
  return Object.values(BACKEND_CREDENTIALS);
}

// =============================================================================
// Error Testing
// =============================================================================

/**
 * Attempt login with invalid credentials
 *
 * Verifies proper error handling
 */
export async function attemptInvalidBackendLogin(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.locator(selectors.auth.emailInput).fill(email);
  await page.locator(selectors.auth.passwordInput).fill(password);

  // Submit and expect error
  const response = await verifyApiCall(
    page,
    () => page.locator(selectors.auth.submitButton).click(),
    { method: 'POST', urlPattern: '/auth/login', expectedStatus: 401 }
  );

  // Verify error message shown
  await expect(page.locator(selectors.auth.errorAlert)).toBeVisible({
    timeout: 5000,
  });

  // Verify no token stored
  const token = await page.evaluate(() => localStorage.getItem('aci_access_token'));
  expect(token, 'No token should be stored on failed login').toBeNull();

  // Verify still on login page
  await expect(page).toHaveURL(/login/);
}

// =============================================================================
// Exports
// =============================================================================

export {
  BACKEND_CREDENTIALS,
  ROLE_ALIASES,
};

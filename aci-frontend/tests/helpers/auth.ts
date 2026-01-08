/**
 * Authentication helpers for E2E tests
 *
 * Provides reusable login/logout functions with deep verification
 */

import { Page, expect, Response } from '@playwright/test';
import { selectors } from './selectors';
import { getTestCredentials, type UserRole, testConfig } from './test-credentials';
import { verifyApiCall } from './api-assertions';

export interface LoginResult {
  readonly response: Response;
  readonly token: string;
  readonly user: any;
}

/**
 * Login as a specific role
 *
 * MANDATORY PATTERN: Verifies API call and token storage
 *
 * @example
 * await loginAs(page, 'admin');
 */
export async function loginAs(
  page: Page,
  role: UserRole
): Promise<LoginResult> {
  const creds = getTestCredentials()[role];

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
  const token = await page.evaluate(() =>
    localStorage.getItem('aci_access_token')
  );
  expect(token, 'Access token should be stored in localStorage').toBeTruthy();

  // Verify user data stored
  const userJson = await page.evaluate(() => localStorage.getItem('aci_user'));
  expect(userJson, 'User data should be stored in localStorage').toBeTruthy();

  const user = userJson ? JSON.parse(userJson) : null;

  // Wait for redirect to dashboard or home
  await page.waitForURL(/dashboard|\/$/);
  await page.waitForLoadState('networkidle');

  return {
    response,
    token: token!,
    user,
  };
}

/**
 * Login with custom credentials
 *
 * Use when testing with specific email/password combinations
 */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<LoginResult> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.locator(selectors.auth.emailInput).fill(email);
  await page.locator(selectors.auth.passwordInput).fill(password);

  const response = await verifyApiCall(
    page,
    () => page.locator(selectors.auth.submitButton).click(),
    { method: 'POST', urlPattern: '/auth/login' }
  );

  const token = await page.evaluate(() =>
    localStorage.getItem('aci_access_token')
  );
  expect(token, 'Access token should be stored').toBeTruthy();

  const userJson = await page.evaluate(() => localStorage.getItem('aci_user'));
  const user = userJson ? JSON.parse(userJson) : null;

  await page.waitForURL(/dashboard|\/$/);
  await page.waitForLoadState('networkidle');

  return {
    response,
    token: token!,
    user,
  };
}

/**
 * Logout current user
 *
 * Clears localStorage and navigates to login
 */
export async function logout(page: Page): Promise<void> {
  // Clear auth tokens
  await page.evaluate(() => {
    localStorage.removeItem('aci_access_token');
    localStorage.removeItem('aci_refresh_token');
    localStorage.removeItem('aci_user');
  });

  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Verify logged out
  const token = await page.evaluate(() =>
    localStorage.getItem('aci_access_token')
  );
  expect(token, 'Token should be cleared after logout').toBeNull();
}

/**
 * Clear all authentication state
 *
 * Use in beforeEach/afterEach to ensure clean state
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() =>
    localStorage.getItem('aci_access_token')
  );
  return !!token;
}

/**
 * Get current user from localStorage
 */
export async function getCurrentUser(page: Page): Promise<any | null> {
  const userJson = await page.evaluate(() => localStorage.getItem('aci_user'));
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Get current auth token
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('aci_access_token'));
}

/**
 * Set auth token directly (for testing)
 *
 * Use sparingly - prefer loginAs() for realistic flows
 */
export async function setAuthToken(
  page: Page,
  token: string,
  user?: any
): Promise<void> {
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('aci_access_token', token);
      if (user) {
        localStorage.setItem('aci_user', JSON.stringify(user));
      }
    },
    { token, user }
  );
}

/**
 * Attempt login with invalid credentials
 *
 * Verifies error handling
 */
export async function attemptInvalidLogin(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.locator(selectors.auth.emailInput).fill(email);
  await page.locator(selectors.auth.passwordInput).fill(password);

  // Submit and expect 401 or error
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
  const token = await page.evaluate(() =>
    localStorage.getItem('aci_access_token')
  );
  expect(token, 'No token should be stored on failed login').toBeNull();

  // Verify still on login page
  await expect(page).toHaveURL(/login/);
}

/**
 * Test validation on login form
 *
 * Verifies required fields block submission
 */
export async function testLoginValidation(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Track API calls
  let apiCalled = false;
  page.on('request', (request) => {
    if (request.url().includes('/auth/login')) {
      apiCalled = true;
    }
  });

  // Try to submit empty form
  await page.locator(selectors.auth.submitButton).click();
  await page.waitForTimeout(500);

  // Should NOT call API
  expect(apiCalled, 'Login API should not be called with empty form').toBe(
    false
  );

  // Should show validation errors
  const errorVisible = await page
    .locator('[role="alert"], .text-destructive')
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  expect(errorVisible, 'Validation error should be visible').toBe(true);
}

/**
 * Register new user (if registration enabled)
 */
export async function register(
  page: Page,
  email: string,
  password: string,
  name?: string
): Promise<LoginResult> {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  await page.locator(selectors.auth.emailInput).fill(email);
  await page.locator(selectors.auth.passwordInput).fill(password);

  if (name) {
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(name);
    }
  }

  const response = await verifyApiCall(
    page,
    () => page.locator(selectors.auth.submitButton).click(),
    { method: 'POST', urlPattern: '/auth/register' }
  );

  const token = await page.evaluate(() =>
    localStorage.getItem('aci_access_token')
  );
  expect(token, 'Access token should be stored after registration').toBeTruthy();

  const userJson = await page.evaluate(() => localStorage.getItem('aci_user'));
  const user = userJson ? JSON.parse(userJson) : null;

  await page.waitForURL(/dashboard|\/$/);

  return {
    response,
    token: token!,
    user,
  };
}

/**
 * Wait for user to be authenticated
 *
 * Polls localStorage for token
 */
export async function waitForAuthentication(
  page: Page,
  timeout: number = testConfig.timeout
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const authenticated = await isAuthenticated(page);
    if (authenticated) {
      return;
    }
    await page.waitForTimeout(100);
  }

  throw new Error('Timeout waiting for authentication');
}

/**
 * Ensure user is logged in before running test
 *
 * Use in beforeEach hooks
 */
export async function ensureLoggedIn(
  page: Page,
  role: UserRole = 'viewer'
): Promise<void> {
  const authenticated = await isAuthenticated(page);

  if (!authenticated) {
    await loginAs(page, role);
  }
}

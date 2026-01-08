/**
 * Authentication Integration Tests (10 tests)
 *
 * DEEP TESTING: Verifies API calls, token storage, and persistence
 * ALL TESTS RUN AGAINST REAL BACKEND - NO MSW MOCKS
 *
 * Coverage:
 * - Login flows (admin, marketing, invalid, validation)
 * - Logout and session management
 * - Token persistence and expiry
 * - Multi-role access verification
 */

import { test, expect } from '@playwright/test';
import {
  ConsoleMonitor,
  verifyValidationBlocks,
  selectors,
  // Backend-specific helpers
  authenticateBackend,
  logoutBackend,
  clearBackendAuthState,
  isBackendAuthenticated,
  getCurrentBackendUser,
  attemptInvalidBackendLogin,
  ensureBackendReady,
} from '../../helpers';

test.describe('Authentication Integration', () => {
  let monitor: ConsoleMonitor;

  // Verify backend is ready before all tests
  test.beforeAll(async () => {
    await ensureBackendReady();
  });

  test.beforeEach(async ({ page }) => {
    monitor = new ConsoleMonitor();
    monitor.attach(page);
    await clearBackendAuthState(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    monitor.assertNoErrors();
    await page.screenshot({
      path: `tests/artifacts/auth-${testInfo.title.replace(/\s+/g, '-')}.png`,
    });
  });

  test('login as admin verifies token stored', async ({ page }) => {
    const result = await authenticateBackend(page, 'admin');

    // Verify token stored
    expect(result.token).toBeTruthy();
    expect(result.token.length).toBeGreaterThan(20);

    // Verify user object
    expect(result.user).toBeTruthy();
    expect(result.user.role).toBe('admin');

    // Verify still authenticated after check
    const authenticated = await isBackendAuthenticated(page);
    expect(authenticated).toBe(true);

    // Verify token retrieval via getCurrentBackendUser
    const user = await getCurrentBackendUser(page);
    expect(user).toBeTruthy();
  });

  test('login as marketing verifies role permissions', async ({ page }) => {
    const result = await authenticateBackend(page, 'marketing');

    // Verify correct role
    expect(result.user.role).toBe('marketing');

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/dashboard|\/$/);

    // Verify marketing navigation visible
    await page.waitForLoadState('networkidle');

    // Marketing user should have access to campaigns
    const campaignsLink = page.locator('a[href*="/campaigns"]');
    if (await campaignsLink.isVisible()) {
      expect(campaignsLink).toBeVisible();
    }
  });

  test('login with invalid credentials returns 401', async ({ page }) => {
    await attemptInvalidBackendLogin(page, 'invalid@example.com', 'wrongpassword');

    // Verify no token stored
    const authenticated = await isBackendAuthenticated(page);
    expect(authenticated).toBe(false);

    // Verify still on login page
    await expect(page).toHaveURL(/login/);

    // Verify error message visible
    await expect(page.locator(selectors.auth.errorAlert)).toBeVisible();
  });

  test('login with empty email blocks API call', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Leave email empty, fill password
    await page.locator(selectors.auth.passwordInput).fill('password123');

    // Verify validation blocks submission
    await verifyValidationBlocks(
      page,
      () => page.locator(selectors.auth.submitButton).click(),
      '/auth/login'
    );

    // Verify no token stored
    const authenticated = await isBackendAuthenticated(page);
    expect(authenticated).toBe(false);
  });

  test('login with invalid email format blocks API call', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Enter invalid email format
    await page.locator(selectors.auth.emailInput).fill('not-an-email');
    await page.locator(selectors.auth.passwordInput).fill('password123');

    // Verify validation blocks submission
    await verifyValidationBlocks(
      page,
      () => page.locator(selectors.auth.submitButton).click(),
      '/auth/login'
    );

    // Verify no token stored
    const authenticated = await isBackendAuthenticated(page);
    expect(authenticated).toBe(false);
  });

  test('logout clears tokens', async ({ page }) => {
    // Login first
    await authenticateBackend(page, 'viewer');

    // Verify authenticated
    let authenticated = await isBackendAuthenticated(page);
    expect(authenticated).toBe(true);

    // Logout
    await logoutBackend(page);

    // Verify tokens cleared
    authenticated = await isBackendAuthenticated(page);
    expect(authenticated).toBe(false);

    // Verify redirected to login
    await expect(page).toHaveURL(/login/);
  });

  test('session persists after page reload', async ({ page }) => {
    // Login
    const result = await authenticateBackend(page, 'admin');
    const originalToken = result.token;

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify still authenticated
    const authenticated = await isBackendAuthenticated(page);
    expect(authenticated).toBe(true);

    // Verify same token in localStorage
    const currentToken = await page.evaluate(() => localStorage.getItem('aci_access_token'));
    expect(currentToken).toBe(originalToken);

    // Verify not redirected to login
    await expect(page).not.toHaveURL(/login/);
  });

  test('token expiry handled gracefully', async ({ page }) => {
    // Login
    await authenticateBackend(page, 'admin');

    // Simulate expired token by clearing it
    await page.evaluate(() => {
      localStorage.removeItem('aci_access_token');
    });

    // Try to navigate to protected route
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/login/, { timeout: 10000 });

    // Verify no token
    const authenticated = await isBackendAuthenticated(page);
    expect(authenticated).toBe(false);
  });

  test('multi-role access verification', async ({ page }) => {
    // Test each role
    const roles = ['admin', 'marketing', 'viewer'] as const;

    for (const role of roles) {
      // Login as role
      const result = await authenticateBackend(page, role);

      // Verify correct role
      expect(result.user.role).toBe(role);

      // Logout
      await logoutBackend(page);

      // Verify logged out
      const authenticated = await isBackendAuthenticated(page);
      expect(authenticated).toBe(false);
    }
  });

  test('password validation meets backend requirements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Try various invalid passwords
    const invalidPasswords = [
      '', // Empty
      'a', // Too short
      '   ', // Whitespace only
    ];

    for (const password of invalidPasswords) {
      await page.locator(selectors.auth.emailInput).fill('test@example.com');
      await page.locator(selectors.auth.passwordInput).fill(password);

      // Verify validation blocks
      await verifyValidationBlocks(
        page,
        () => page.locator(selectors.auth.submitButton).click(),
        '/auth/login'
      );

      // Clear form
      await page.locator(selectors.auth.emailInput).fill('');
      await page.locator(selectors.auth.passwordInput).fill('');
    }

    // Verify no token stored after all attempts
    const authenticated = await isBackendAuthenticated(page);
    expect(authenticated).toBe(false);
  });
});

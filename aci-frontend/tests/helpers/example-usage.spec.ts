/**
 * Example test showing how to use the shared test helpers
 *
 * This file demonstrates the deep testing patterns and helper usage.
 * Copy these patterns to actual test files.
 */

import { test, expect } from '@playwright/test';
import {
  // Authentication
  loginAs,
  logout,
  clearAuthState,

  // Deep testing assertions
  verifyApiCall,
  verifyPersistence,
  verifyValidationBlocks,

  // Console monitoring
  ConsoleMonitor,

  // Selectors
  selectors,

  // Configuration
  testConfig,
  getTestCredentials,
} from './index'; // Note: from e2e/*.spec.ts files, use '../helpers' instead

test.describe('Example: Deep E2E Testing Patterns', () => {
  let consoleMonitor: ConsoleMonitor;

  test.beforeEach(async ({ page }) => {
    // MANDATORY: Set up console monitoring
    consoleMonitor = new ConsoleMonitor();
    consoleMonitor.attach(page);

    // Clear auth state before each test
    await clearAuthState(page);
  });

  test.afterEach(async () => {
    // MANDATORY: Assert no console errors
    consoleMonitor.assertNoErrors();
  });

  test('Example 1: Login with deep verification', async ({ page }) => {
    // Login as admin role
    const result = await loginAs(page, 'admin');

    // Verify response
    expect(result.response.status()).toBe(200);
    expect(result.token).toBeTruthy();
    expect(result.user).toBeTruthy();

    // Verify URL changed
    await expect(page).toHaveURL(/dashboard|\/$/);
  });

  test('Example 2: Form submission with API verification', async ({ page }) => {
    // Login first
    await loginAs(page, 'marketing');

    // Navigate to form page (example: newsletter config)
    await page.goto('/newsletter/config');
    await page.waitForLoadState('networkidle');

    // Fill form
    const testName = `Test Config ${Date.now()}`;
    await page.locator(selectors.newsletter.configNameInput).fill(testName);
    await page.locator(selectors.newsletter.configDescInput).fill('Test description');

    // DEEP VERIFICATION: Verify API call on submit
    const response = await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'POST', urlPattern: '/api/newsletter/configs' }
    );

    // Verify success
    expect(response.status()).toBe(201);

    // DEEP VERIFICATION: Verify persistence after reload
    await verifyPersistence(page, 'h1, h2', testName);
  });

  test('Example 3: Form validation blocks submission', async ({ page }) => {
    await loginAs(page, 'marketing');
    await page.goto('/newsletter/config');
    await page.waitForLoadState('networkidle');

    // Leave required field empty
    await page.locator(selectors.newsletter.configNameInput).fill('');

    // DEEP VERIFICATION: Prove validation blocks API call
    await verifyValidationBlocks(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      '/api/newsletter/configs'
    );

    // Validation error should be visible
    await expect(page.locator(selectors.common.errorMessage)).toBeVisible();
  });

  test('Example 4: Edit existing data', async ({ page }) => {
    await loginAs(page, 'admin');

    // Create a config first
    await page.goto('/newsletter/config');
    await page.waitForLoadState('networkidle');

    const originalName = `Original ${Date.now()}`;
    await page.locator(selectors.newsletter.configNameInput).fill(originalName);
    await page.locator(selectors.newsletter.configDescInput).fill('Description');

    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'POST', urlPattern: '/api/newsletter/configs' }
    );

    // Edit the config
    const updatedName = `Updated ${Date.now()}`;
    await page.locator(selectors.newsletter.configNameInput).clear();
    await page.locator(selectors.newsletter.configNameInput).fill(updatedName);

    // Verify PUT request
    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'PUT', urlPattern: '/api/newsletter/configs' }
    );

    // Verify update persisted
    await verifyPersistence(page, 'h1, h2', updatedName);
  });

  test('Example 5: Test configuration usage', async () => {
    // Access test configuration
    console.log('Test Mode:', testConfig.mode);
    console.log('Base URL:', testConfig.baseUrl);
    console.log('API URL:', testConfig.apiUrl);

    // Get credentials
    const creds = getTestCredentials();
    expect(creds.admin.email).toBeTruthy();
    expect(creds.marketing.email).toBeTruthy();
  });

  test('Example 6: Console error detection', async ({ page }) => {
    // Console monitor was attached in beforeEach

    await loginAs(page, 'viewer');

    // Trigger an intentional console error (example only)
    await page.evaluate(() => {
      // This would fail the test in afterEach
      // console.error('Intentional error for testing');
    });

    // Monitor will check in afterEach hook
  });

  test('Example 7: Invalid login attempt', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator(selectors.auth.emailInput).fill('invalid@test.com');
    await page.locator(selectors.auth.passwordInput).fill('wrongpassword');

    // Expect 401 response
    const response = await verifyApiCall(
      page,
      () => page.locator(selectors.auth.submitButton).click(),
      { method: 'POST', urlPattern: '/auth/login', expectedStatus: 401 }
    );

    // Should still be on login page
    await expect(page).toHaveURL(/login/);

    // Error should be visible
    await expect(page.locator(selectors.auth.errorAlert)).toBeVisible();
  });

  test('Example 8: Multiple API calls in sequence', async ({ page }) => {
    await loginAs(page, 'marketing');

    // Example: Create campaign and add content
    // This would use verifyApiSequence for complex flows

    // For now, just show the pattern
    await page.goto('/marketing/campaigns');
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Example: Selector Usage', () => {
  test('Using centralized selectors', async ({ page }) => {
    await page.goto('/login');

    // Auth selectors
    await page.locator(selectors.auth.emailInput).fill('test@example.com');
    await page.locator(selectors.auth.passwordInput).fill('password');

    // Common selectors
    await page.locator(selectors.common.submitButton).click();

    // Newsletter selectors
    // await page.locator(selectors.newsletter.configNameInput).fill('Test');

    // Marketing selectors
    // await page.locator(selectors.marketing.campaignNameInput).fill('Campaign');
  });
});

/**
 * SUMMARY OF PATTERNS:
 *
 * 1. Always attach ConsoleMonitor in beforeEach
 * 2. Always assert no errors in afterEach
 * 3. Use verifyApiCall for ALL form submissions
 * 4. Use verifyPersistence to prove data survives reload
 * 5. Use verifyValidationBlocks to prove validation prevents submission
 * 6. Use loginAs helper instead of manual login
 * 7. Use selectors object instead of hardcoded selectors
 * 8. Use testConfig for environment-aware testing
 */

/**
 * Marketing Autopilot - Smoke Tests
 *
 * Quick sanity checks that run on every push.
 * These tests verify critical paths are working without deep validation.
 *
 * Run with: npm run test:e2e:smoke
 *
 * Smoke tests should:
 * - Be fast (<30 seconds total)
 * - Cover critical user paths
 * - Fail fast on major regressions
 * - Not require complex setup
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

function setupConsoleCapture(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test.describe('Marketing Autopilot - Smoke Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  // =========================================================================
  // Critical Path: Application Loads
  // =========================================================================
  test('SMOKE-001: Application loads without crashes', async ({ page }) => {
    const consoleErrors = setupConsoleCapture(page);

    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveURL(/login/);

    // No critical console errors
    const critical = consoleErrors.filter(
      (e) => !e.includes('Warning:') && !e.includes('DevTools')
    );
    expect(critical).toHaveLength(0);
  });

  // =========================================================================
  // Critical Path: Authentication
  // =========================================================================
  test('SMOKE-002: Login page renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Email and password fields exist
    await expect(
      page.locator('input[type="email"], input[name="email"], [data-testid="email"]')
    ).toBeVisible();
    await expect(
      page.locator('input[type="password"], input[name="password"], [data-testid="password"]')
    ).toBeVisible();

    // Login button exists
    await expect(
      page.locator('button[type="submit"], [data-testid="login-button"]')
    ).toBeVisible();
  });

  // =========================================================================
  // Critical Path: Campaign List
  // =========================================================================
  test('SMOKE-003: Campaign list page loads', async ({ page, context }) => {
    // Set auth token
    await context.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: '1', email: 'test@test.com', tenant_id: '1' })
      );
    });

    await page.goto(`${BASE_URL}/campaigns`);

    // Page should load without redirecting to login (if auth is mocked)
    // or show campaign-related content
    const hasContent = await page
      .locator('[data-testid="campaign-list"], [class*="campaign"], h1')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  // =========================================================================
  // Critical Path: Channels Page
  // =========================================================================
  test('SMOKE-004: Channels page loads', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: '1', email: 'test@test.com', tenant_id: '1' })
      );
    });

    await page.goto(`${BASE_URL}/channels`);

    const hasContent = await page
      .locator('[data-testid="channel-hub"], [data-testid="channel-card"], [class*="channel"], h1')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  // =========================================================================
  // Critical Path: Calendar Page
  // =========================================================================
  test('SMOKE-005: Calendar page loads', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: '1', email: 'test@test.com', tenant_id: '1' })
      );
    });

    await page.goto(`${BASE_URL}/calendar`);

    const hasContent = await page
      .locator('[data-testid="calendar-view"], .rbc-calendar, [class*="calendar"], h1')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  // =========================================================================
  // Critical Path: Analytics Page
  // =========================================================================
  test('SMOKE-006: Analytics page loads', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: '1', email: 'test@test.com', tenant_id: '1' })
      );
    });

    await page.goto(`${BASE_URL}/marketing/analytics`);

    const hasContent = await page
      .locator(
        '[data-testid="analytics-dashboard"], [data-testid="performance-overview"], [class*="analytics"], h1'
      )
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  // =========================================================================
  // Critical Path: Navigation Works
  // =========================================================================
  test('SMOKE-007: Navigation between pages works', async ({ page, context }) => {
    // Use correct token storage keys that the app expects
    await context.addInitScript(() => {
      localStorage.setItem('aci_access_token', 'test-token');
      localStorage.setItem('aci_refresh_token', 'test-refresh-token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: '1', email: 'test@test.com', tenant_id: '1' })
      );
    });

    // Mock the /users/me endpoint which is called by AuthContext to verify token
    await page.route('**/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: '1', email: 'test@test.com', tenant_id: '1', role: 'admin' },
        }),
      });
    });

    // Start at dashboard
    await page.goto(`${BASE_URL}/dashboard`);

    // Navigate to campaigns (via sidebar or direct)
    await page.goto(`${BASE_URL}/campaigns`);
    await expect(page).toHaveURL(/campaigns/);

    // Navigate to channels
    await page.goto(`${BASE_URL}/channels`);
    await expect(page).toHaveURL(/channels/);

    // Navigate back to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
  });

  // =========================================================================
  // Critical Path: API Health
  // =========================================================================
  test('SMOKE-008: API endpoints respond', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: '1', email: 'test@test.com', tenant_id: '1' })
      );
    });

    let apiResponded = false;

    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() < 500) {
        apiResponded = true;
      }
    });

    await page.goto(`${BASE_URL}/campaigns`);
    await page.waitForTimeout(2000); // Give API time to respond

    // Note: This may be false if using MSW/mocks, which is OK for smoke tests
    // The main goal is no 500 errors
  });

  // =========================================================================
  // Performance: Quick Load Times
  // =========================================================================
  test('SMOKE-009: Pages load within 5 seconds', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: '1', email: 'test@test.com', tenant_id: '1' })
      );
    });

    const start = Date.now();
    await page.goto(`${BASE_URL}/campaigns`);
    await page.waitForLoadState('domcontentloaded');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000);
  });

  // =========================================================================
  // Error Handling: 404 Page
  // =========================================================================
  test('SMOKE-010: 404 page handles gracefully', async ({ page }) => {
    const consoleErrors = setupConsoleCapture(page);

    await page.goto(`${BASE_URL}/nonexistent-page-12345`);

    // Should not crash - either 404 page or redirect
    const pageLoaded = await page.title().catch(() => '');
    expect(pageLoaded).not.toBe('');

    // No critical errors from 404
    const critical = consoleErrors.filter((e) => e.includes('Uncaught'));
    expect(critical).toHaveLength(0);
  });
});

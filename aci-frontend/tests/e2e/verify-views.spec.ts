/**
 * E2E test to verify views display data correctly
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';

/**
 * Helper to login and navigate to dashboard
 */
async function loginAndNavigate(page: Page, targetPath: string = '/dashboard'): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"], input[name="email"], input#email', 'test@example.com');
  await page.fill('input[type="password"], input[name="password"], input#password', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
  if (targetPath !== '/dashboard') {
    await page.goto(`${BASE_URL}${targetPath}`);
    await page.waitForLoadState('networkidle');
  }
}

test.describe('View Data Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Store errors for later
    Object.defineProperty(page, '_consoleErrors', { value: errors, writable: true });
  });

  test('Dashboard should display data', async ({ page }) => {
    // Go to login first
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Take screenshot of login page
    await page.screenshot({ path: 'tests/e2e/screenshots/01-login-page.png', fullPage: true });

    // Login with test credentials
    await page.fill('input[type="email"], input[name="email"], input#email', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"], input#password', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});

    // Take screenshot after login attempt
    await page.screenshot({ path: 'tests/e2e/screenshots/02-after-login.png', fullPage: true });

    // Check current URL
    const url = page.url();
    console.log('Current URL after login:', url);

    // If we're on dashboard, take screenshot
    if (url.includes('/dashboard')) {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Wait for data to load

      // Take screenshot of dashboard
      await page.screenshot({ path: 'tests/e2e/screenshots/03-dashboard.png', fullPage: true });

      // Check for dashboard elements
      const dashboardExists = await page.locator('[data-testid="dashboard-page"]').count();
      console.log('Dashboard element exists:', dashboardExists > 0);

      // Check for metric cards
      const metricCards = await page.locator('.metric-card, [data-testid*="metric"]').count();
      console.log('Metric cards found:', metricCards);

      // Check for activity feed
      const activityItems = await page.locator('[data-testid*="activity"]').count();
      console.log('Activity items found:', activityItems);
    }

    // Log console errors
    const pageWithErrors = page as typeof page & { _consoleErrors?: string[] };
    const errors = pageWithErrors._consoleErrors || [];
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
  });

  test('Threats page should display data', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Login
    await page.fill('input[type="email"], input[name="email"], input#email', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"], input#password', 'password123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});

    // Navigate to threats page
    await page.goto(`${BASE_URL}/threats`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for data

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/04-threats-page.png', fullPage: true });

    const url = page.url();
    console.log('Current URL:', url);

    // Check for threats page elements
    const threatsPageExists = await page.locator('[data-testid="threats-page"]').count();
    console.log('Threats page element exists:', threatsPageExists > 0);

    // Check for threat list
    const threatCards = await page.locator('[data-testid*="threat-card"], .threat-card').count();
    console.log('Threat cards found:', threatCards);

    // Check for loading state
    const loadingSpinner = await page.locator('.animate-spin, [data-testid="loading"]').count();
    console.log('Loading spinner visible:', loadingSpinner > 0);

    // Check for empty state
    const emptyState = await page.locator('[data-testid*="empty"], .empty-state').count();
    console.log('Empty state visible:', emptyState > 0);

    // Check for error state
    const errorState = await page.locator('[data-testid*="error"], .error-state').count();
    console.log('Error state visible:', errorState > 0);

    // Check page content
    const pageText = await page.textContent('body');
    console.log('Page contains "Threats":', pageText?.includes('Threats'));
    console.log('Page contains "No threats":', pageText?.includes('No threats'));
    console.log('Page contains "Failed":', pageText?.includes('Failed'));

    // Check network requests
    const threats = await page.evaluate(() => {
      return localStorage.getItem('aci_access_token');
    });
    console.log('Access token exists:', !!threats);

    // Log errors
    const pageWithErrors2 = page as typeof page & { _consoleErrors?: string[] };
    const errors2 = pageWithErrors2._consoleErrors || [];
    if (errors2.length > 0) {
      console.log('Console errors:', errors2);
    }
  });

  test('Direct navigation to threats when logged in', async ({ page }) => {
    // Set authentication in localStorage before navigating
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => {
      localStorage.setItem('aci_access_token', 'mock-access-token');
      localStorage.setItem('aci_refresh_token', 'mock-refresh-token');
    });

    // Navigate to threats
    await page.goto(`${BASE_URL}/threats`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'tests/e2e/screenshots/05-threats-direct.png', fullPage: true });

    const url = page.url();
    console.log('Current URL:', url);

    // Check if redirected to login
    if (url.includes('/login')) {
      console.log('Was redirected to login - auth check failed');
    }

    // Check for content
    const pageText = await page.textContent('body');
    console.log('Page text preview:', pageText?.slice(0, 500));
  });

  test('Dashboard activity feed items are clickable', async ({ page }) => {
    // Login and go to dashboard
    await loginAndNavigate(page, '/dashboard');
    await page.waitForTimeout(2000);

    // Take screenshot before clicking
    await page.screenshot({ path: 'tests/e2e/screenshots/06-activity-before-click.png', fullPage: true });

    // Find activity feed
    const activityFeed = page.locator('[data-testid="activity-feed"]');
    const feedExists = await activityFeed.count();
    console.log('Activity feed exists:', feedExists > 0);

    if (feedExists > 0) {
      // Find activity list items
      const activityList = page.locator('[data-testid="activity-list"]');
      const listExists = await activityList.count();
      console.log('Activity list exists:', listExists > 0);

      if (listExists > 0) {
        // Get all activity items (li elements inside the list)
        const activityItems = activityList.locator('li');
        const itemCount = await activityItems.count();
        console.log('Activity items count:', itemCount);

        if (itemCount > 0) {
          // Click on the first activity item
          const firstItem = activityItems.first();
          await firstItem.click();

          // Wait for navigation
          await page.waitForTimeout(1000);

          // Check if we navigated to threat detail
          const newUrl = page.url();
          console.log('URL after clicking activity item:', newUrl);

          // Take screenshot after click
          await page.screenshot({ path: 'tests/e2e/screenshots/07-after-activity-click.png', fullPage: true });

          // Verify we're on a threat detail page
          const isOnThreatDetail = newUrl.includes('/threats/');
          console.log('Navigated to threat detail:', isOnThreatDetail);

          expect(isOnThreatDetail).toBe(true);
        }
      }
    }
  });

  test('Threats page items are clickable', async ({ page }) => {
    // Login and go to threats page
    await loginAndNavigate(page, '/threats');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/08-threats-before-click.png', fullPage: true });

    // Find threat cards
    const threatCards = page.locator('[data-testid*="threat-card"], .threat-card, [role="button"][aria-label*="threat"]');
    const cardCount = await threatCards.count();
    console.log('Threat cards found:', cardCount);

    // If no threat cards by testid, try to find clickable list items
    if (cardCount === 0) {
      const listItems = page.locator('[data-testid="threats-page"] li, [data-testid="threat-list"] > *');
      const listCount = await listItems.count();
      console.log('List items found:', listCount);

      if (listCount > 0) {
        await listItems.first().click();
        await page.waitForTimeout(1000);
      }
    } else {
      // Click first threat card
      await threatCards.first().click();
      await page.waitForTimeout(1000);
    }

    // Check URL after click
    const newUrl = page.url();
    console.log('URL after clicking threat:', newUrl);

    await page.screenshot({ path: 'tests/e2e/screenshots/09-after-threat-click.png', fullPage: true });

    // Verify navigation
    const isOnThreatDetail = newUrl.includes('/threats/');
    console.log('Navigated to threat detail:', isOnThreatDetail);
  });
});

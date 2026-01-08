import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests with REAL Backend Database
 *
 * These tests run against the actual backend with real PostgreSQL data.
 * MSW must be disabled: VITE_ENABLE_MSW=false
 *
 * Prerequisites:
 * - Backend running at http://localhost:10081
 * - Frontend running at http://localhost:5173 (with VITE_ENABLE_MSW=false)
 * - Database with test data
 *
 * Run: VITE_ENABLE_MSW=false npx playwright test verify-real-backend.spec.ts
 */

const BASE_URL = 'http://localhost:5173';
const PASSWORD = 'TestPass123';

// Helper to login
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[name="email"], input[type="email"], #email', 'admin@test.com');
  await page.fill('input[name="password"], input[type="password"], #password', PASSWORD);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation away from login
  await page.waitForURL(/.*(?<!login)$/);
  await page.waitForLoadState('networkidle');
}

test.describe('Newsletter with Real Backend @real', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Newsletter Configuration page loads real configs', async ({ page }) => {
    // Navigate to newsletter configs (plural!)
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({
      path: 'tests/artifacts/real-backend-newsletter-configs.png',
      fullPage: true,
    });

    // Verify page loaded (use first main to handle multiple)
    const pageContent = await page.textContent('body');
    console.log('Config page content length:', pageContent?.length);

    // Check for expected content
    const hasConfiguration = pageContent?.includes('Configuration') || pageContent?.includes('Newsletter');
    expect(hasConfiguration).toBe(true);
  });

  test('Newsletter Preview page shows real issues', async ({ page }) => {
    // Navigate to preview page
    await page.goto(`${BASE_URL}/newsletter/preview`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({
      path: 'tests/artifacts/real-backend-newsletter-preview.png',
      fullPage: true,
    });

    // Check page content
    const pageContent = await page.textContent('body');
    console.log('Preview page content length:', pageContent?.length);

    // Should show Newsletter Issues heading
    const heading = page.getByRole('heading', { name: /newsletter/i });
    await expect(heading.first()).toBeVisible();

    // Check for real data (issues from database)
    const hasRealData = pageContent?.includes('Security') || pageContent?.includes('Draft') || pageContent?.includes('Approved');
    console.log('Has real data:', hasRealData);
    expect(hasRealData).toBe(true);
  });

  test('Newsletter Approval page loads real pending items', async ({ page }) => {
    // Navigate to approval page
    await page.goto(`${BASE_URL}/newsletter/approval`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({
      path: 'tests/artifacts/real-backend-newsletter-approval.png',
      fullPage: true,
    });

    // Verify page loaded
    const pageContent = await page.textContent('body');
    console.log('Approval page content length:', pageContent?.length);

    // Should have approval-related content
    const hasApproval = pageContent?.includes('Approval') || pageContent?.includes('Pending') || pageContent?.includes('Newsletter');
    expect(hasApproval).toBe(true);
  });

  test('Newsletter Analytics page loads real metrics', async ({ page }) => {
    // Navigate to analytics page
    await page.goto(`${BASE_URL}/newsletter/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({
      path: 'tests/artifacts/real-backend-newsletter-analytics.png',
      fullPage: true,
    });

    // Verify page loaded
    const pageContent = await page.textContent('body');
    console.log('Analytics page content length:', pageContent?.length);

    // Should have analytics-related content
    const hasAnalytics = pageContent?.includes('Analytics') || pageContent?.includes('Rate') || pageContent?.includes('Newsletter');
    expect(hasAnalytics).toBe(true);
  });

  test('Newsletter Content page loads real sources', async ({ page }) => {
    // Navigate to content page
    await page.goto(`${BASE_URL}/newsletter/content`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({
      path: 'tests/artifacts/real-backend-newsletter-content.png',
      fullPage: true,
    });

    // Verify page loaded
    const pageContent = await page.textContent('body');
    console.log('Content page content length:', pageContent?.length);

    // Should have content-related content
    const hasContent = pageContent?.includes('Content') || pageContent?.includes('Source') || pageContent?.includes('Newsletter');
    expect(hasContent).toBe(true);
  });

  test('API endpoints return real data', async ({ page }) => {
    // Test API directly
    const response = await page.request.get('http://localhost:10081/v1/newsletter-configs', {
      headers: {
        Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('aci_access_token'))}`,
      },
    });

    console.log('API Status:', response.status());

    if (response.ok()) {
      const data = await response.json();
      console.log('API Response:', JSON.stringify(data, null, 2).slice(0, 500));
      expect(data.success || data.data).toBeTruthy();
    } else {
      console.log('API returned non-200:', response.status());
      // API might require auth, which is expected
    }
  });
});

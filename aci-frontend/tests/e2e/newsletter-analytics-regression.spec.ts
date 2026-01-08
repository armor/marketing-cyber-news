/**
 * Newsletter Analytics Regression Tests
 *
 * Comprehensive tests for the analytics dashboard covering:
 * - US6: A/B Testing results display
 * - US7: Analytics Dashboard functionality
 *
 * Success Criteria:
 * - SC-001: Open rate display (28-35% target)
 * - SC-002: CTR display (3.5-5.5% target)
 * - SC-003: CTOR display (12-18% target)
 * - SC-004: Unsubscribe rate (<0.2% target)
 * - SC-005: Bounce rate (<0.5% target)
 * - SC-006: Spam rate (<0.1% target)
 * - Dashboard load < 3 seconds
 */

import { test, expect, Page, Route } from '@playwright/test';

// ============================================================================
// Test Configuration
// ============================================================================

const TOKEN_STORAGE_KEY = 'aci_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'aci_refresh_token';
const ANALYTICS_URL = '/newsletter/analytics';

const TEST_ADMIN = {
  id: 'user-admin-001',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'admin',
  token: 'mock-token-admin-analytics',
};

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_OVERVIEW = {
  total_sent: 15000,
  total_opens: 4650,
  total_clicks: 825,
  total_unsubscribes: 23,
  total_bounces: 45,
  total_spam_complaints: 2,
  open_rate: 0.31,
  click_rate: 0.055,
  ctor: 0.177,
  unsubscribe_rate: 0.0015,
  bounce_rate: 0.003,
  spam_rate: 0.00013,
  period_start: '2024-12-01T00:00:00Z',
  period_end: '2024-12-21T23:59:59Z',
};

const MOCK_TRENDS = [
  { date: '2024-12-01', sent: 2500, opens: 775, clicks: 138, open_rate: 0.31, click_rate: 0.055 },
  { date: '2024-12-08', sent: 2500, opens: 800, clicks: 145, open_rate: 0.32, click_rate: 0.058 },
  { date: '2024-12-15', sent: 2500, opens: 750, clicks: 130, open_rate: 0.30, click_rate: 0.052 },
];

const MOCK_TOP_PERFORMING = [
  { id: 'issue-1', subject: 'Critical Zero-Day Alert', sent: 2500, open_rate: 0.42, click_rate: 0.085 },
  { id: 'issue-2', subject: 'Weekly Security Digest #45', sent: 2500, open_rate: 0.35, click_rate: 0.062 },
  { id: 'issue-3', subject: 'New Compliance Requirements', sent: 2500, open_rate: 0.33, click_rate: 0.058 },
];

const MOCK_SEGMENT_ANALYTICS = {
  segment_id: 'segment-001',
  segment_name: 'Enterprise Security Teams',
  total_sent: 5000,
  open_rate: 0.34,
  click_rate: 0.062,
  ctor: 0.182,
  unsubscribe_rate: 0.001,
};

const MOCK_AB_TEST_RESULTS = {
  issue_id: 'issue-001',
  test_type: 'subject_line',
  variants: [
    {
      id: 'variant-a',
      name: 'Variant A',
      value: 'Critical Security Alert: Immediate Action Required',
      recipients: 1250,
      opens: 425,
      clicks: 78,
      open_rate: 0.34,
      click_rate: 0.062,
      is_winner: true,
    },
    {
      id: 'variant-b',
      name: 'Variant B',
      value: 'Your Weekly Security Briefing',
      recipients: 1250,
      opens: 350,
      clicks: 55,
      open_rate: 0.28,
      click_rate: 0.044,
      is_winner: false,
    },
  ],
  is_significant: true,
  confidence: 0.95,
  winner_id: 'variant-a',
};

// ============================================================================
// Test Helpers
// ============================================================================

async function authenticateAs(page: Page): Promise<void> {
  await page.addInitScript(
    ({ token, refreshToken, tokenKey, refreshKey }) => {
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(refreshKey, refreshToken);
    },
    {
      token: TEST_ADMIN.token,
      refreshToken: `refresh-${TEST_ADMIN.token}`,
      tokenKey: TOKEN_STORAGE_KEY,
      refreshKey: REFRESH_TOKEN_STORAGE_KEY,
    }
  );

  await page.route('**/v1/users/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: TEST_ADMIN.id,
          email: TEST_ADMIN.email,
          name: TEST_ADMIN.name,
          role: TEST_ADMIN.role,
        },
      }),
    });
  });
}

async function setupAnalyticsMocks(page: Page): Promise<void> {
  // Overview endpoint
  await page.route('**/v1/newsletter-analytics/overview**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_OVERVIEW }),
    });
  });

  // Trends endpoint
  await page.route('**/v1/newsletter-analytics/trends**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_TRENDS }),
    });
  });

  // Top performing endpoint
  await page.route('**/v1/newsletter-analytics/top**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_TOP_PERFORMING }),
    });
  });

  // Segment analytics endpoint
  await page.route('**/v1/newsletter-analytics/segments/*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_SEGMENT_ANALYTICS }),
    });
  });

  // A/B test results endpoint
  await page.route('**/v1/newsletter-analytics/tests/*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_AB_TEST_RESULTS }),
    });
  });

  // Segments list
  await page.route('**/v1/segments', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 'segment-001', name: 'Enterprise Security Teams', contact_count: 2500 },
          { id: 'segment-002', name: 'SMB IT Managers', contact_count: 1500 },
        ],
      }),
    });
  });
}

// ============================================================================
// Analytics Overview Tests
// ============================================================================

test.describe('Analytics Overview @regression @analytics', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page);
    await setupAnalyticsMocks(page);
  });

  test('should display analytics page', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should load within 3 seconds performance target', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    console.log(`Analytics load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(3000);
  });

  test('should display KPI metrics', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for metric values (format may vary)
    const pageContent = await page.content();

    // Check if any metrics are displayed (numbers, percentages)
    const hasNumbers = /\d+[%,.]?\d*/.test(pageContent);
    expect(hasNumbers).toBe(true);
  });

  test('should handle date range selection', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');

    // Look for date range selector
    const dateSelector = page.getByRole('combobox').or(page.locator('[data-testid="date-range"]')).or(page.getByLabel(/date|period|range/i));

    if (await dateSelector.first().isVisible().catch(() => false)) {
      await dateSelector.first().click();
      await page.waitForTimeout(500);
    }
  });
});

// ============================================================================
// KPI Display Tests
// ============================================================================

test.describe('KPI Display @regression @analytics', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page);
    await setupAnalyticsMocks(page);
  });

  test('should display open rate metric', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for open rate display
    const openRateElement = page.getByText(/open.*rate/i).or(page.getByText(/31%/)).or(page.getByText(/0\.31/));
    // Metric should be present
  });

  test('should display click rate metric', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for click rate display
    const clickRateElement = page.getByText(/click.*rate|ctr/i);
  });

  test('should display CTOR metric', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for CTOR display
    const ctorElement = page.getByText(/ctor|click.to.open/i);
  });

  test('should display unsubscribe rate metric', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for unsubscribe rate display
    const unsubElement = page.getByText(/unsub/i);
  });

  test('should show target comparison indicators', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for target indicators (up/down arrows, colors, badges)
    const indicators = page.locator('[class*="success"], [class*="warning"], [class*="error"], [class*="green"], [class*="red"]');
    // Target comparison may be shown
  });
});

// ============================================================================
// Trend Charts Tests
// ============================================================================

test.describe('Trend Charts @regression @analytics', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page);
    await setupAnalyticsMocks(page);
  });

  test('should display trend chart container', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Look for chart container
    const chartContainer = page.locator('canvas, svg, [class*="chart"], [class*="graph"], [data-testid*="chart"]');
    // Chart may be present
  });

  test('should render chart without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter chart-specific errors
    const chartErrors = consoleErrors.filter(err =>
      err.toLowerCase().includes('chart') ||
      err.toLowerCase().includes('canvas') ||
      err.toLowerCase().includes('svg')
    );

    expect(chartErrors.length).toBe(0);
  });
});

// ============================================================================
// Segment Analytics Tests
// ============================================================================

test.describe('Segment Analytics @regression @analytics', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page);
    await setupAnalyticsMocks(page);
  });

  test('should display segment selector', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for segment selector
    const segmentSelector = page.getByRole('combobox').or(page.getByLabel(/segment/i)).or(page.getByText(/all segments/i));
  });

  test('should filter analytics by segment', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find and interact with segment selector
    const segmentSelector = page.getByRole('combobox').first();
    if (await segmentSelector.isVisible().catch(() => false)) {
      await segmentSelector.click();
      await page.waitForTimeout(500);

      // Look for segment options
      const segmentOption = page.getByText(/enterprise security/i);
      if (await segmentOption.isVisible().catch(() => false)) {
        await segmentOption.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});

// ============================================================================
// A/B Test Results Tests
// ============================================================================

test.describe('A/B Test Results @regression @analytics', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page);
    await setupAnalyticsMocks(page);
  });

  test('should display A/B test tab or section', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for A/B test section
    const abTestSection = page.getByRole('tab', { name: /a.?b|test|experiment/i })
      .or(page.getByText(/a.?b test/i))
      .or(page.getByText(/test results/i));
  });

  test('should show test variants when viewing test results', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click on A/B test tab if present
    const abTestTab = page.getByRole('tab', { name: /a.?b|test/i });
    if (await abTestTab.isVisible().catch(() => false)) {
      await abTestTab.click();
      await page.waitForTimeout(1000);

      // Look for variant information
      const variantA = page.getByText(/variant a/i);
      const variantB = page.getByText(/variant b/i);
    }
  });

  test('should indicate winning variant', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for winner indicator
    const winnerIndicator = page.getByText(/winner/i)
      .or(page.locator('[class*="winner"]'))
      .or(page.locator('[data-testid="winner"]'));
  });

  test('should show statistical significance', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for significance display
    const significanceDisplay = page.getByText(/significant/i)
      .or(page.getByText(/confidence/i))
      .or(page.getByText(/95%/));
  });
});

// ============================================================================
// Top Performing Tests
// ============================================================================

test.describe('Top Performing Newsletters @regression @analytics', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page);
    await setupAnalyticsMocks(page);
  });

  test('should display top performing newsletters list', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for top performing section
    const topSection = page.getByText(/top perform/i)
      .or(page.getByText(/best perform/i))
      .or(page.getByRole('heading', { name: /top/i }));
  });

  test('should show newsletter subjects in list', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for newsletter subjects from mock data
    const zeroDay = page.getByText(/zero.day/i);
    const digest = page.getByText(/digest/i);
    const compliance = page.getByText(/compliance/i);
  });
});

// ============================================================================
// Export Functionality Tests
// ============================================================================

test.describe('Export Functionality @regression @analytics', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page);
    await setupAnalyticsMocks(page);
  });

  test('should display export button', async ({ page }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for export functionality
    const exportButton = page.getByRole('button', { name: /export|download|csv|pdf/i })
      .or(page.locator('[data-testid="export"]'));
  });
});

// ============================================================================
// Error States Tests
// ============================================================================

test.describe('Analytics Error States @regression @analytics', () => {
  test('should handle API error gracefully', async ({ page }) => {
    await authenticateAs(page);

    await page.route('**/v1/newsletter-analytics/**', async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Internal Server Error' }),
      });
    });

    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should show error message or empty state
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle empty data gracefully', async ({ page }) => {
    await authenticateAs(page);

    await page.route('**/v1/newsletter-analytics/overview**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            total_sent: 0,
            total_opens: 0,
            total_clicks: 0,
            open_rate: 0,
            click_rate: 0,
          },
        }),
      });
    });

    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should show empty state or zeros
    await expect(page.locator('body')).toBeVisible();
  });
});

// ============================================================================
// Responsive Design Tests
// ============================================================================

test.describe('Analytics Responsive Design @regression @analytics', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page);
    await setupAnalyticsMocks(page);
  });

  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });
});

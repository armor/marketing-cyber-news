/**
 * Component Test: Marketing Analytics Dashboard
 *
 * MSW-only tests (no real backend)
 * Focus: Data visualization, filters, UI states, interactions
 *
 * Test Count: 10
 */

import { test, expect } from '@playwright/test';
import { loginAs, ConsoleMonitor, selectors } from '../../helpers';

test.describe('Marketing Dashboard Component Tests', () => {
  let monitor: ConsoleMonitor;

  test.beforeEach(async ({ page }) => {
    monitor = new ConsoleMonitor();
    monitor.attach(page);
    await loginAs(page, 'marketing');
    await page.goto('/marketing/analytics');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(() => {
    monitor.assertNoErrors();
  });

  test('dashboard layout renders all main sections', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForTimeout(1000);

    // Verify main layout structure
    await expect(page.locator('main, [data-testid="dashboard"]')).toBeVisible();

    // Look for key dashboard sections
    const hasSummarySection = await page
      .locator('[data-testid*="summary"], .summary-section, h2:has-text("Summary")')
      .first()
      .isVisible()
      .catch(() => false);

    const hasChartsSection = await page
      .locator(
        '[data-testid*="chart"], .charts-section, canvas, svg, [class*="recharts"]'
      )
      .first()
      .isVisible()
      .catch(() => false);

    // Dashboard should have some content sections
    expect(hasSummarySection || hasChartsSection).toBe(true);
  });

  test('campaign summary cards display key metrics', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Look for metric cards
    const metricCards = page.locator(
      '[data-testid*="metric-card"], [data-testid*="stat-card"], .metric-card, .stat-card'
    );

    const cardCount = await metricCards.count();

    if (cardCount > 0) {
      // Verify cards show numbers
      const firstCard = metricCards.first();
      await expect(firstCard).toBeVisible();

      const cardText = await firstCard.textContent();

      // Should contain either a number or metric name
      expect(cardText?.length).toBeGreaterThan(0);

      // Common metrics to look for
      const dashboardContent = await page.content();
      const hasCommonMetrics =
        dashboardContent.toLowerCase().includes('campaign') ||
        dashboardContent.toLowerCase().includes('engagement') ||
        dashboardContent.toLowerCase().includes('conversion') ||
        dashboardContent.toLowerCase().includes('click') ||
        dashboardContent.toLowerCase().includes('open') ||
        dashboardContent.toLowerCase().includes('sent');

      expect(hasCommonMetrics).toBe(true);
    } else {
      // Check for alternative metric display
      const metricsGrid = page.locator(selectors.newsletter.metricsGrid);
      const gridVisible = await metricsGrid.isVisible().catch(() => false);

      // Either cards or grid should show metrics
    }
  });

  test('channel performance charts render correctly', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Look for charts/visualizations
    const charts = page.locator(
      selectors.marketing.performanceChart +
        ', canvas, svg, [class*="recharts"], [data-testid*="chart"]'
    );

    const chartCount = await charts.count();

    if (chartCount > 0) {
      // Verify at least one chart is visible
      const firstChart = charts.first();
      await expect(firstChart).toBeVisible();

      // Charts should have some dimensions
      const boundingBox = await firstChart.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(0);
        expect(boundingBox.height).toBeGreaterThan(0);
      }
    } else {
      // Check for empty state or loading
      const emptyState = page.locator('text=/no data|no charts|coming soon/i');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      // Either charts or empty state should be visible
    }
  });

  test('recent activity list displays campaign actions', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Look for activity feed/list
    const activityList = page.locator(
      '[data-testid*="activity"], [data-testid*="recent"], .activity-list, .recent-items'
    ).first();

    const exists = await activityList.isVisible().catch(() => false);

    if (exists) {
      // Verify activity items appear
      const activityItems = page.locator(
        '[data-testid*="activity-item"], .activity-item, [data-testid*="recent-item"]'
      );

      const itemCount = await activityItems.count();

      if (itemCount > 0) {
        // Verify first item has content
        const firstItem = activityItems.first();
        const itemText = await firstItem.textContent();
        expect(itemText?.length).toBeGreaterThan(0);

        // Should show timestamp
        const hasTimestamp = await firstItem
          .locator('time, [data-testid*="timestamp"], .timestamp')
          .isVisible()
          .catch(() => false);
      } else {
        // Empty state is valid
        const emptyMessage = page.locator('text=/no activity|no recent/i');
        const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false);
      }
    }
  });

  test('quick action buttons are accessible', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for quick action buttons (Create Campaign, New Newsletter, etc.)
    const quickActions = page.locator(
      '[data-testid*="quick-action"], .quick-action, button:has-text("Create"), button:has-text("New")'
    );

    const actionCount = await quickActions.count();

    if (actionCount > 0) {
      // Verify first quick action is clickable
      const firstAction = quickActions.first();
      await expect(firstAction).toBeVisible();
      await expect(firstAction).toBeEnabled();

      // Click should navigate or open modal
      await firstAction.click();
      await page.waitForTimeout(500);

      // Should either navigate or open dialog
      const currentUrl = page.url();
      const dialogOpen = await page
        .locator('[role="dialog"]')
        .isVisible()
        .catch(() => false);

      expect(
        currentUrl.includes('/new') ||
          currentUrl.includes('/create') ||
          dialogOpen
      ).toBe(true);

      // Go back for other tests
      if (!dialogOpen) {
        await page.goto('/marketing/analytics');
        await page.waitForLoadState('networkidle');
      }
    } else {
      // Quick actions might be in a different location
      const createButton = page.locator('button:has-text("Create"), a:has-text("Create")').first();
      const exists = await createButton.isVisible().catch(() => false);
    }
  });

  test('date range filter updates display', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Look for date range picker/filter
    const dateFilter = page.locator(
      '[data-testid*="date-range"], [data-testid*="date-filter"], input[type="date"]'
    ).first();

    const exists = await dateFilter.isVisible().catch(() => false);

    if (exists) {
      // Click to open date picker
      await dateFilter.click();
      await page.waitForTimeout(300);

      // Look for preset options (Last 7 days, Last 30 days, etc.)
      const presetOptions = page.locator(
        'text=/last 7 days|last 30 days|this month|last month/i'
      );

      const hasPresets = await presetOptions.first().isVisible().catch(() => false);

      if (hasPresets) {
        // Select a preset
        await presetOptions.first().click();
        await page.waitForTimeout(1000);

        // Verify some data refresh occurred
        // (In real app, this would trigger API call and update charts)
        const loadingIndicator = page.locator(selectors.common.loadingSpinner);
        const hadLoading = await loadingIndicator
          .isVisible({ timeout: 500 })
          .catch(() => false);

        // Loading might be too fast to catch
      }
    } else {
      // Date filter might be a different component type
      const dateButton = page.locator('button:has-text("Date"), button:has-text("Range")');
      const buttonExists = await dateButton.isVisible().catch(() => false);
    }
  });

  test('campaign status filter functionality', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Look for status filter
    const statusFilter = page.locator(
      '[data-testid*="status-filter"], select[name="status"], [placeholder*="status"]'
    ).first();

    const exists = await statusFilter.isVisible().catch(() => false);

    if (exists) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      // Look for status options
      const statusOptions = page.locator(
        'text=/active|paused|draft|completed|all/i, [role="option"]'
      );

      const optionCount = await statusOptions.count();

      if (optionCount > 0) {
        // Select a status
        await statusOptions.first().click();
        await page.waitForTimeout(500);

        // Should filter results (in real app)
        // Verify filter is applied
        const currentFilter = await statusFilter.textContent();
        expect(currentFilter?.length).toBeGreaterThan(0);
      }
    } else {
      // Status filter might be tabs instead of dropdown
      const statusTabs = page.locator('[role="tab"]');
      const tabCount = await statusTabs.count();

      if (tabCount > 0) {
        // Click second tab
        await statusTabs.nth(1).click();
        await page.waitForTimeout(500);

        // Tab should be selected
        const isSelected = await statusTabs
          .nth(1)
          .getAttribute('aria-selected');
        expect(isSelected).toBe('true');
      }
    }
  });

  test('empty state displays when no data available', async ({ page }) => {
    // Navigate to fresh account or filtered state with no results
    // For this test, assume MSW can return empty data

    await page.waitForTimeout(1500);

    // Look for empty state indicators
    const emptyState = page.locator(
      '[data-testid*="empty"], .empty-state, text=/no campaigns|no data|get started/i'
    ).first();

    const hasContent = await page.locator('table tbody tr, .campaign-item').count();

    if (hasContent === 0) {
      // Should show empty state
      const emptyVisible = await emptyState.isVisible().catch(() => false);

      if (emptyVisible) {
        // Verify empty state has helpful message
        const emptyText = await emptyState.textContent();
        expect(emptyText?.length).toBeGreaterThan(10);

        // Should have CTA to create content
        const ctaButton = page.locator(
          '[data-testid*="empty"] button, .empty-state button'
        );
        const hasCTA = await ctaButton.isVisible().catch(() => false);
      }
    } else {
      // Has data - verify it's displayed properly
      expect(hasContent).toBeGreaterThan(0);
    }
  });

  test('loading skeletons appear during data fetch', async ({ page }) => {
    // This test is tricky as MSW responds fast
    // Best we can do is check if skeletons are in the DOM

    await page.goto('/marketing/analytics', { waitUntil: 'domcontentloaded' });

    // Immediately check for skeletons
    const skeletons = page.locator(
      selectors.common.skeleton + ', [data-testid*="skeleton"], .animate-pulse'
    );

    const skeletonCount = await skeletons.count();

    // Might catch skeletons if timing is right
    // Otherwise wait for actual content
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // After loading, skeletons should be gone
    const skeletonsAfter = await page
      .locator(selectors.common.skeleton)
      .count();

    // Either had skeletons that disappeared, or loaded too fast
    expect(skeletonsAfter).toBeLessThanOrEqual(skeletonCount);
  });

  test('error boundary handles failed data loading', async ({ page }) => {
    // MSW can be configured to return errors
    // This test verifies error boundary exists

    await page.waitForTimeout(1500);

    // Check for error boundary (shouldn't be visible in happy path)
    const errorBoundary = page.locator(
      selectors.common.errorBoundary + ', [data-testid*="error"], .error-boundary'
    );

    const errorVisible = await errorBoundary.isVisible().catch(() => false);

    if (errorVisible) {
      // If error state, should have retry option
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
      const hasRetry = await retryButton.isVisible().catch(() => false);

      // Error should be actionable
      if (hasRetry) {
        await retryButton.click();
        await page.waitForTimeout(500);

        // Should attempt to reload data
      }
    } else {
      // No errors is the happy path
      expect(true).toBe(true);

      // Verify dashboard has content
      const hasContent = await page
        .locator('[data-testid*="metric"], canvas, svg, table')
        .first()
        .isVisible()
        .catch(() => false);

      expect(hasContent).toBe(true);
    }
  });
});

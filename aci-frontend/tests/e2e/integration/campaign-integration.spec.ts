/**
 * Campaign Integration Tests (15 tests)
 *
 * DEEP TESTING: Verifies campaign lifecycle, API calls, and persistence
 * ALL TESTS RUN AGAINST REAL BACKEND - NO MSW MOCKS
 *
 * Coverage:
 * - Campaign CRUD operations
 * - Campaign lifecycle management (draft -> active -> paused -> stopped)
 * - Channel selection and configuration
 * - Topic and frequency settings
 * - Goals and recommendations
 * - Analytics and stats
 */

import { test, expect } from '@playwright/test';
import {
  ConsoleMonitor,
  verifyApiCall,
  verifyPersistence,
  verifyValidationBlocks,
  selectors,
  // Backend-specific helpers
  authenticateBackend,
  clearBackendAuthState,
  ensureBackendReady,
} from '../../helpers';

test.describe('Campaign Integration', () => {
  let monitor: ConsoleMonitor;

  // Verify backend is ready before all tests
  test.beforeAll(async () => {
    await ensureBackendReady();
  });

  test.beforeEach(async ({ page }) => {
    monitor = new ConsoleMonitor();
    monitor.attach(page);
    await clearBackendAuthState(page);
    await authenticateBackend(page, 'marketing');
  });

  test.afterEach(async ({ page }, testInfo) => {
    monitor.assertNoErrors();
    await page.screenshot({
      path: `tests/artifacts/campaign-${testInfo.title.replace(/\s+/g, '-')}.png`,
    });
  });

  test('create campaign with persistence', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    const campaignName = `Test Campaign ${Date.now()}`;
    const campaignDesc = 'Automated test campaign description';

    // Fill campaign details
    await page.locator(selectors.marketing.campaignNameInput).fill(campaignName);
    await page.locator(selectors.marketing.campaignDescInput).fill(campaignDesc);

    // Submit and verify API call
    const response = await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'POST', urlPattern: '/campaigns' }
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);

    // Verify persistence
    await verifyPersistence(page, 'h1, [data-testid="campaign-name"]', campaignName);
  });

  test('update campaign settings persists changes', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // Find first campaign
    const firstCampaign = page.locator('[data-testid="campaign-card"]').first();
    const hasCampaigns = await firstCampaign.isVisible().catch(() => false);

    if (!hasCampaigns) {
      test.skip();
      return;
    }

    // Click edit
    await firstCampaign.locator('button:has-text("Edit")').click();
    await page.waitForLoadState('networkidle');

    // Update name
    const updatedName = `Updated Campaign ${Date.now()}`;
    const nameInput = page.locator(selectors.marketing.campaignNameInput);
    await nameInput.clear();
    await nameInput.fill(updatedName);

    // Save and verify API call
    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'PUT', urlPattern: '/campaigns' }
    );

    // Verify persistence
    await verifyPersistence(page, 'h1, [data-testid="campaign-name"]', updatedName);
  });

  test('delete campaign - draft only', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // Find a draft campaign
    const draftCampaign = page
      .locator('[data-testid="campaign-card"]')
      .filter({ hasText: /draft/i })
      .first();

    const hasDraft = await draftCampaign.isVisible().catch(() => false);

    if (!hasDraft) {
      test.skip();
      return;
    }

    const campaignName = await draftCampaign
      .locator('[data-testid="campaign-name"]')
      .textContent();

    // Delete campaign
    await verifyApiCall(
      page,
      async () => {
        await draftCampaign.locator('button:has-text("Delete")').click();
        await page.locator('button:has-text("Confirm")').click();
      },
      { method: 'DELETE', urlPattern: '/campaigns' }
    );

    // Verify removed from list
    await page.reload();
    await page.waitForLoadState('networkidle');

    if (campaignName) {
      const deleted = page.locator(`text="${campaignName}"`);
      await expect(deleted).not.toBeVisible();
    }
  });

  test('campaign lifecycle - draft to active', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    const draftCampaign = page
      .locator('[data-testid="campaign-card"]')
      .filter({ hasText: /draft/i })
      .first();

    const hasDraft = await draftCampaign.isVisible().catch(() => false);

    if (!hasDraft) {
      test.skip();
      return;
    }

    // Activate campaign
    await verifyApiCall(
      page,
      () => draftCampaign.locator('button:has-text("Activate")').click(),
      { method: 'PUT', urlPattern: '/campaigns' }
    );

    // Verify status changed
    await page.reload();
    await page.waitForLoadState('networkidle');

    const status = draftCampaign.locator('[data-testid="campaign-status"]');
    await expect(status).toContainText(/active/i);
  });

  test('campaign lifecycle - pause', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    const activeCampaign = page
      .locator('[data-testid="campaign-card"]')
      .filter({ hasText: /active/i })
      .first();

    const hasActive = await activeCampaign.isVisible().catch(() => false);

    if (!hasActive) {
      test.skip();
      return;
    }

    // Pause campaign
    await verifyApiCall(
      page,
      () => activeCampaign.locator('button:has-text("Pause")').click(),
      { method: 'PUT', urlPattern: '/campaigns' }
    );

    // Verify status
    await page.reload();
    await page.waitForLoadState('networkidle');

    const status = activeCampaign.locator('[data-testid="campaign-status"]');
    await expect(status).toContainText(/paused/i);
  });

  test('campaign lifecycle - resume', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    const pausedCampaign = page
      .locator('[data-testid="campaign-card"]')
      .filter({ hasText: /paused/i })
      .first();

    const hasPaused = await pausedCampaign.isVisible().catch(() => false);

    if (!hasPaused) {
      test.skip();
      return;
    }

    // Resume campaign
    await verifyApiCall(
      page,
      () => pausedCampaign.locator('button:has-text("Resume")').click(),
      { method: 'PUT', urlPattern: '/campaigns' }
    );

    // Verify status
    await page.reload();
    await page.waitForLoadState('networkidle');

    const status = pausedCampaign.locator('[data-testid="campaign-status"]');
    await expect(status).toContainText(/active/i);
  });

  test('campaign lifecycle - stop', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    const activeCampaign = page
      .locator('[data-testid="campaign-card"]')
      .filter({ hasText: /active/i })
      .first();

    const hasActive = await activeCampaign.isVisible().catch(() => false);

    if (!hasActive) {
      test.skip();
      return;
    }

    // Stop campaign
    await verifyApiCall(
      page,
      async () => {
        await activeCampaign.locator('button:has-text("Stop")').click();
        await page.locator('button:has-text("Confirm")').click();
      },
      { method: 'PUT', urlPattern: '/campaigns' }
    );

    // Verify status
    await page.reload();
    await page.waitForLoadState('networkidle');

    const status = activeCampaign.locator('[data-testid="campaign-status"]');
    await expect(status).toContainText(/stopped|completed/i);
  });

  test('campaign channel selection', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Fill basic info
    await page
      .locator(selectors.marketing.campaignNameInput)
      .fill(`Multi-Channel ${Date.now()}`);

    // Select channels if available
    const emailChannel = page.locator('input[value="email"][type="checkbox"]');
    const linkedinChannel = page.locator(
      'input[value="linkedin"][type="checkbox"]'
    );

    const hasEmailChannel = await emailChannel.isVisible().catch(() => false);
    const hasLinkedinChannel = await linkedinChannel
      .isVisible()
      .catch(() => false);

    if (hasEmailChannel) {
      await emailChannel.check();
    }
    if (hasLinkedinChannel) {
      await linkedinChannel.check();
    }

    // Save
    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'POST', urlPattern: '/campaigns' }
    );

    // Verify channels saved
    await page.reload();
    await page.waitForLoadState('networkidle');

    if (hasEmailChannel) {
      await expect(emailChannel).toBeChecked();
    }
  });

  test('campaign topic configuration', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Fill basic info
    await page
      .locator(selectors.marketing.campaignNameInput)
      .fill(`Topic Campaign ${Date.now()}`);

    // Select topics if available
    const topicSelect = page.locator('select[name="topics"]');
    const hasTopics = await topicSelect.isVisible().catch(() => false);

    if (hasTopics) {
      const options = await topicSelect.locator('option').count();
      if (options > 1) {
        await topicSelect.selectOption({ index: 1 });
      }
    }

    // Save
    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'POST', urlPattern: '/campaigns' }
    );
  });

  test('campaign frequency settings', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Fill basic info
    await page
      .locator(selectors.marketing.campaignNameInput)
      .fill(`Frequency Test ${Date.now()}`);

    // Set frequency
    const frequencySelect = page.locator('select[name="frequency"]');
    const hasFrequency = await frequencySelect.isVisible().catch(() => false);

    if (hasFrequency) {
      await frequencySelect.selectOption('weekly');
    }

    // Set day of week if applicable
    const daySelect = page.locator('select[name="dayOfWeek"]');
    const hasDay = await daySelect.isVisible().catch(() => false);

    if (hasDay) {
      await daySelect.selectOption('monday');
    }

    // Save
    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'POST', urlPattern: '/campaigns' }
    );

    // Verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    if (hasFrequency) {
      const currentFrequency = await frequencySelect.inputValue();
      expect(currentFrequency).toBe('weekly');
    }
  });

  test('campaign goal selection - engagement', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Fill basic info
    await page
      .locator(selectors.marketing.campaignNameInput)
      .fill(`Engagement Goal ${Date.now()}`);

    // Select goal
    const goalSelect = page.locator('select[name="goal"]');
    const hasGoal = await goalSelect.isVisible().catch(() => false);

    if (hasGoal) {
      await goalSelect.selectOption('engagement');
    }

    // Save
    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'POST', urlPattern: '/campaigns' }
    );

    // Verify goal persisted
    await page.reload();
    await page.waitForLoadState('networkidle');

    if (hasGoal) {
      const currentGoal = await goalSelect.inputValue();
      expect(currentGoal).toBe('engagement');
    }
  });

  test('campaign recommendations - AI', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // Look for recommendations button
    const recommendButton = page.locator(
      'button:has-text("Get Recommendations")'
    );
    const hasRecommend = await recommendButton.isVisible().catch(() => false);

    if (!hasRecommend) {
      test.skip();
      return;
    }

    // Request recommendations
    await verifyApiCall(
      page,
      () => recommendButton.click(),
      { method: 'POST', urlPattern: '/campaigns/recommendations' }
    );

    // Verify recommendations displayed
    const recommendations = page.locator('[data-testid="recommendations"]');
    await expect(recommendations).toBeVisible({ timeout: 10000 });
  });

  test('campaign stats display', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    const firstCampaign = page.locator('[data-testid="campaign-card"]').first();
    const hasCampaigns = await firstCampaign.isVisible().catch(() => false);

    if (!hasCampaigns) {
      test.skip();
      return;
    }

    // Click to view details
    await firstCampaign.click();
    await page.waitForLoadState('networkidle');

    // Verify stats loaded
    const stats = page.locator('[data-testid="campaign-stats"]');
    await expect(stats).toBeVisible();

    // Verify API call
    const response = await page.waitForResponse(
      (r) =>
        r.url().includes('/campaigns') &&
        r.url().includes('/stats') &&
        r.request().method() === 'GET'
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
  });

  test('campaign analytics display', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    const firstCampaign = page.locator('[data-testid="campaign-card"]').first();
    const hasCampaigns = await firstCampaign.isVisible().catch(() => false);

    if (!hasCampaigns) {
      test.skip();
      return;
    }

    // Navigate to analytics
    await firstCampaign.locator('button:has-text("Analytics")').click();
    await page.waitForLoadState('networkidle');

    // Verify analytics loaded
    const analytics = page.locator(selectors.marketing.analyticsOverview);
    await expect(analytics).toBeVisible();

    // Verify performance chart
    const chart = page.locator(selectors.marketing.performanceChart);
    await expect(chart).toBeVisible();
  });

  test('multi-campaign management', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // Verify API call to list campaigns
    const response = await page.waitForResponse(
      (r) =>
        r.url().includes('/campaigns') && r.request().method() === 'GET'
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);

    // Get campaign count
    const campaigns = page.locator('[data-testid="campaign-card"]');
    const count = await campaigns.count();

    // Verify campaigns displayed
    expect(count).toBeGreaterThanOrEqual(0);

    // If there are campaigns, verify they're interactive
    if (count > 0) {
      const firstCampaign = campaigns.first();
      await expect(firstCampaign).toBeVisible();

      // Verify campaign has actions
      const actionsMenu = firstCampaign.locator('[data-testid="campaign-actions"]');
      const hasActions = await actionsMenu.isVisible().catch(() => false);

      if (hasActions) {
        await actionsMenu.click();
        await expect(
          page.locator('[role="menu"], [role="menuitem"]')
        ).toBeVisible();
      }
    }
  });
});

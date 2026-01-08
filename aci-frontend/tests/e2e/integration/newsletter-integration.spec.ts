/**
 * Newsletter Integration Tests (15 tests)
 *
 * DEEP TESTING: Verifies API calls, persistence, and approval workflows
 * ALL TESTS RUN AGAINST REAL BACKEND - NO MSW MOCKS
 *
 * Coverage:
 * - Newsletter config CRUD operations
 * - Newsletter issue lifecycle
 * - Approval workflows (submit, approve, reject)
 * - Personalization and segmentation
 * - Analytics display
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

test.describe('Newsletter Integration', () => {
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
      path: `tests/artifacts/newsletter-${testInfo.title.replace(/\s+/g, '-')}.png`,
    });
  });

  test('create newsletter config with persistence', async ({ page }) => {
    await page.goto('/newsletter/configs/new');
    await page.waitForLoadState('networkidle');

    const configName = `Test Config ${Date.now()}`;
    const configDesc = 'Test description for newsletter config';

    // Fill form
    await page.locator(selectors.newsletter.configNameInput).fill(configName);
    await page.locator(selectors.newsletter.configDescInput).fill(configDesc);
    await page
      .locator(selectors.newsletter.senderNameInput)
      .fill('Test Sender');
    await page
      .locator(selectors.newsletter.senderEmailInput)
      .fill('sender@example.com');

    // Submit and verify API call
    const response = await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'POST', urlPattern: '/newsletter-configs' }
    );

    // Verify successful response
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);

    // Verify persistence after reload
    await verifyPersistence(page, 'h1, [data-testid="config-name"]', configName);
  });

  test('update newsletter config persists changes', async ({ page }) => {
    await page.goto('/newsletter/configs');
    await page.waitForLoadState('networkidle');

    // Find first config and click edit
    const firstConfig = page.locator('[data-testid="config-card"]').first();
    await firstConfig.locator('button:has-text("Edit")').click();
    await page.waitForLoadState('networkidle');

    // Update name
    const updatedName = `Updated Config ${Date.now()}`;
    const nameInput = page.locator(selectors.newsletter.configNameInput);
    await nameInput.clear();
    await nameInput.fill(updatedName);

    // Submit and verify API call
    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'PUT', urlPattern: '/newsletter-configs' }
    );

    // Verify persistence
    await verifyPersistence(page, 'h1, [data-testid="config-name"]', updatedName);
  });

  test('delete newsletter config', async ({ page }) => {
    await page.goto('/newsletter/configs');
    await page.waitForLoadState('networkidle');

    // Get initial count
    const initialCount = await page
      .locator('[data-testid="config-card"]')
      .count();

    if (initialCount === 0) {
      test.skip();
      return;
    }

    // Click delete on first config
    const firstConfig = page.locator('[data-testid="config-card"]').first();
    const configName = await firstConfig
      .locator('[data-testid="config-name"]')
      .textContent();

    // Verify DELETE API call
    await verifyApiCall(
      page,
      async () => {
        await firstConfig.locator('button:has-text("Delete")').click();
        // Confirm deletion
        await page.locator('button:has-text("Confirm")').click();
      },
      { method: 'DELETE', urlPattern: '/newsletter-configs' }
    );

    // Verify config removed from list
    await page.reload();
    await page.waitForLoadState('networkidle');

    if (configName) {
      const deletedConfig = page.locator(`text="${configName}"`);
      await expect(deletedConfig).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('list newsletter configs with pagination', async ({ page }) => {
    await page.goto('/newsletter/configs');
    await page.waitForLoadState('networkidle');

    // Verify API call to fetch configs
    const response = await page.waitForResponse(
      (r) =>
        r.url().includes('/newsletter-configs') &&
        r.request().method() === 'GET'
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);

    // Check if pagination exists
    const nextButton = page.locator(selectors.common.nextPageButton);
    const hasNextPage = await nextButton.isVisible().catch(() => false);

    if (hasNextPage) {
      // Click next page
      await verifyApiCall(
        page,
        () => nextButton.click(),
        { method: 'GET', urlPattern: '/newsletter-configs' }
      );
    }
  });

  test('newsletter config form validation - required fields', async ({
    page,
  }) => {
    await page.goto('/newsletter/configs/new');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    await verifyValidationBlocks(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      '/newsletter-configs'
    );

    // Verify error messages visible
    await expect(page.locator(selectors.common.errorMessage)).toBeVisible();
  });

  test('newsletter config form validation - invalid inputs', async ({
    page,
  }) => {
    await page.goto('/newsletter/configs/new');
    await page.waitForLoadState('networkidle');

    // Fill with invalid email
    await page.locator(selectors.newsletter.configNameInput).fill('Test');
    await page
      .locator(selectors.newsletter.senderEmailInput)
      .fill('not-an-email');

    // Verify validation blocks
    await verifyValidationBlocks(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      '/newsletter-configs'
    );
  });

  test('create newsletter issue as draft', async ({ page }) => {
    await page.goto('/newsletter/issues/new');
    await page.waitForLoadState('networkidle');

    const issueTitle = `Test Issue ${Date.now()}`;

    // Fill issue details
    await page.locator(selectors.newsletter.issueTitle).fill(issueTitle);
    await page
      .locator(selectors.newsletter.issueSubject)
      .fill('Test Subject');
    await page
      .locator(selectors.newsletter.issuePreheader)
      .fill('Test preheader text');

    // Save as draft
    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'POST', urlPattern: '/newsletter-issues' }
    );

    // Verify persistence
    await verifyPersistence(page, 'h1, [data-testid="issue-title"]', issueTitle);

    // Verify status is draft
    const status = page.locator('[data-testid="issue-status"]');
    await expect(status).toContainText(/draft/i);
  });

  test('edit newsletter issue content', async ({ page }) => {
    await page.goto('/newsletter/issues');
    await page.waitForLoadState('networkidle');

    // Find first draft issue
    const firstIssue = page.locator('[data-testid="issue-card"]').first();
    await firstIssue.locator('button:has-text("Edit")').click();
    await page.waitForLoadState('networkidle');

    // Update title
    const updatedTitle = `Updated Issue ${Date.now()}`;
    const titleInput = page.locator(selectors.newsletter.issueTitle);
    await titleInput.clear();
    await titleInput.fill(updatedTitle);

    // Save changes
    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'PUT', urlPattern: '/newsletter-issues' }
    );

    // Verify persistence
    await verifyPersistence(page, 'h1, [data-testid="issue-title"]', updatedTitle);
  });

  test('newsletter approval workflow - submit for review', async ({ page }) => {
    // Create a draft issue first
    await page.goto('/newsletter/issues/new');
    await page.waitForLoadState('networkidle');

    await page
      .locator(selectors.newsletter.issueTitle)
      .fill(`Issue ${Date.now()}`);
    await page.locator(selectors.newsletter.issueSubject).fill('Subject');

    // Save as draft
    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'POST', urlPattern: '/newsletter-issues' }
    );

    // Submit for review
    const submitButton = page.locator('button:has-text("Submit for Review")');
    if (await submitButton.isVisible()) {
      await verifyApiCall(
        page,
        () => submitButton.click(),
        { method: 'POST', urlPattern: '/approvals' }
      );

      // Verify status changed
      await page.reload();
      await page.waitForLoadState('networkidle');

      const status = page.locator('[data-testid="approval-status"]');
      await expect(status).toContainText(/pending|review/i);
    }
  });

  test('newsletter approval - approve as marketing', async ({ page }) => {
    // Navigate to approvals
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Find first pending approval
    const firstApproval = page.locator('[data-testid="approval-card"]').first();
    const hasApprovals = await firstApproval.isVisible().catch(() => false);

    if (!hasApprovals) {
      test.skip();
      return;
    }

    // Click approve
    await verifyApiCall(
      page,
      () =>
        firstApproval.locator(selectors.newsletter.approveButton).click(),
      { method: 'PUT', urlPattern: '/approvals' }
    );

    // Verify approval status updated
    await page.reload();
    await page.waitForLoadState('networkidle');

    const status = page.locator('[data-testid="approval-status"]').first();
    await expect(status).toContainText(/approved/i);
  });

  test('newsletter rejection with reason', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    const firstApproval = page.locator('[data-testid="approval-card"]').first();
    const hasApprovals = await firstApproval.isVisible().catch(() => false);

    if (!hasApprovals) {
      test.skip();
      return;
    }

    // Click reject
    await firstApproval.locator(selectors.newsletter.rejectButton).click();

    // Fill rejection reason
    const reasonInput = page.locator('textarea[name="reason"]');
    await reasonInput.fill('Content needs revision');

    // Submit rejection
    await verifyApiCall(
      page,
      () => page.locator('button:has-text("Confirm")').click(),
      { method: 'PUT', urlPattern: '/approvals' }
    );

    // Verify status
    await page.reload();
    await page.waitForLoadState('networkidle');

    const status = page.locator('[data-testid="approval-status"]').first();
    await expect(status).toContainText(/rejected/i);
  });

  test('newsletter preview generation', async ({ page }) => {
    await page.goto('/newsletter/issues');
    await page.waitForLoadState('networkidle');

    const firstIssue = page.locator('[data-testid="issue-card"]').first();
    const hasIssues = await firstIssue.isVisible().catch(() => false);

    if (!hasIssues) {
      test.skip();
      return;
    }

    // Click preview
    await firstIssue.locator('button:has-text("Preview")').click();
    await page.waitForLoadState('networkidle');

    // Verify preview loads
    const preview = page.locator('[data-testid="newsletter-preview"]');
    await expect(preview).toBeVisible();

    // Verify API call to generate preview
    const response = await page.waitForResponse(
      (r) =>
        r.url().includes('/newsletter-issues') &&
        r.url().includes('/preview')
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
  });

  test('newsletter segment assignment', async ({ page }) => {
    await page.goto('/newsletter/issues/new');
    await page.waitForLoadState('networkidle');

    // Fill basic details
    await page
      .locator(selectors.newsletter.issueTitle)
      .fill(`Segmented Issue ${Date.now()}`);

    // Select segment if available
    const segmentSelect = page.locator('select[name="segmentId"]');
    const hasSegments = await segmentSelect.isVisible().catch(() => false);

    if (hasSegments) {
      const options = await segmentSelect.locator('option').count();
      if (options > 1) {
        await segmentSelect.selectOption({ index: 1 });
      }
    }

    // Save
    await verifyApiCall(
      page,
      () => page.locator(selectors.newsletter.saveButton).click(),
      { method: 'POST', urlPattern: '/newsletter-issues' }
    );
  });

  test('newsletter personalization test', async ({ page }) => {
    await page.goto('/newsletter/issues');
    await page.waitForLoadState('networkidle');

    const firstIssue = page.locator('[data-testid="issue-card"]').first();
    const hasIssues = await firstIssue.isVisible().catch(() => false);

    if (!hasIssues) {
      test.skip();
      return;
    }

    // Click personalization test if available
    const testButton = page.locator('button:has-text("Test Personalization")');
    const hasTestButton = await testButton.isVisible().catch(() => false);

    if (hasTestButton) {
      await verifyApiCall(
        page,
        () => testButton.click(),
        { method: 'POST', urlPattern: '/personalization/test' }
      );

      // Verify preview with personalized content
      const preview = page.locator('[data-testid="personalized-preview"]');
      await expect(preview).toBeVisible({ timeout: 10000 });
    }
  });

  test('newsletter analytics display', async ({ page }) => {
    await page.goto('/newsletter/analytics');
    await page.waitForLoadState('networkidle');

    // Verify API call to fetch analytics
    const response = await page.waitForResponse(
      (r) =>
        r.url().includes('/newsletter') &&
        r.url().includes('/analytics') &&
        r.request().method() === 'GET'
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);

    // Verify metrics displayed
    const metricsGrid = page.locator(selectors.newsletter.metricsGrid);
    await expect(metricsGrid).toBeVisible();

    // Verify key metrics present
    const openRate = page.locator(selectors.newsletter.openRate);
    const clickRate = page.locator(selectors.newsletter.clickRate);

    const hasOpenRate = await openRate.isVisible().catch(() => false);
    const hasClickRate = await clickRate.isVisible().catch(() => false);

    // At least one metric should be visible
    expect(hasOpenRate || hasClickRate).toBe(true);
  });
});

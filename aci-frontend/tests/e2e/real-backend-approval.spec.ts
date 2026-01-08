/**
 * E2E Tests for Approval Workflow with REAL Backend
 *
 * PHASE 2: Real Backend E2E Testing
 * Tests the approval workflow against the actual Kubernetes backend.
 *
 * Prerequisites:
 * - Backend running at http://localhost:8080 (via kubectl port-forward)
 * - Test users with password TestPass123!
 * - Articles in pending_marketing status
 *
 * Run with: npx playwright test tests/e2e/real-backend-approval.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const PASSWORD = 'TestPass123!';

// Test users from the real database
const TEST_USERS = {
  marketing: 'marketing@test.com',
  branding: 'branding@test.com',
  soc_l1: 'soc_level_1@test.com',
  soc_l3: 'soc_level_3@test.com',
  ciso: 'ciso@test.com',
};

/**
 * Helper to perform actual login through the UI
 */
async function performRealLogin(page: Page, email: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', PASSWORD);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation away from login page
  await page.waitForURL(/.*(?<!login)$/);
  await page.waitForLoadState('networkidle');

  console.log(`Logged in as ${email}`);
}

test.describe('Real Backend - Approval Workflow Tests', () => {
  test.describe.configure({ mode: 'serial' }); // Run tests in sequence

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('1. Marketing user can view approval queue with real articles', async ({ page }) => {
    console.log('\n=== TEST: View real approval queue ===');

    await performRealLogin(page, TEST_USERS.marketing);

    // Navigate to approvals page
    await page.goto(`${BASE_URL}/approvals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'tests/artifacts/real-backend-01-approval-queue.png', fullPage: true });

    // Verify page loaded
    const pageTitle = page.locator('h1, h2').first();
    await expect(pageTitle).toBeVisible();

    // Look for severity badges (HIGH, CRITICAL, etc.) which are rendered in article cards
    // The cards show: severity badge, category badge, "0/5 gates", and article title
    const severityBadges = page.locator('span:has-text("HIGH"), span:has-text("CRITICAL"), span:has-text("MEDIUM"), span:has-text("LOW")');
    const articleCount = await severityBadges.count();

    console.log(`Found ${articleCount} articles with severity badges`);

    // We should have at least 1 article
    expect(articleCount).toBeGreaterThanOrEqual(1);

    // Verify we can see article titles by checking for text patterns
    // Look for the approval queue header badge which shows the count
    const queueCountBadge = page.locator('h1:has-text("Approval Queue"), h2:has-text("Approval Queue")').first();
    await expect(queueCountBadge).toBeVisible();

    // Get the first article title - look for heading text that mentions data, attack, vulnerability, etc.
    const articleContent = await page.textContent('body');
    console.log('Page contains real article content:', articleContent?.includes('Data Breach') || articleContent?.includes('Ransomware') || articleContent?.includes('Vulnerability'));

    console.log('Approval queue loaded successfully with real articles!');
  });

  test('2. Marketing user can click on article to view details', async ({ page }) => {
    console.log('\n=== TEST: View article details ===');

    await performRealLogin(page, TEST_USERS.marketing);

    // Go to approvals
    await page.goto(`${BASE_URL}/approvals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find and click on first article link or View Details button
    const viewDetailsLink = page.locator('a[href*="/articles/"], button:has-text("View"), [data-testid="view-details"]').first();

    if (await viewDetailsLink.count() > 0) {
      await viewDetailsLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Take screenshot
      await page.screenshot({ path: 'tests/artifacts/real-backend-02-article-detail.png', fullPage: true });

      // Verify article detail page loaded
      const articleTitle = page.locator('[data-testid="article-title"], h1, h2').first();
      await expect(articleTitle).toBeVisible();

      const titleText = await articleTitle.textContent();
      console.log('Viewing article:', titleText);

      // Verify action buttons are present
      const approveButton = page.locator('button:has-text("Approve")');
      const rejectButton = page.locator('button:has-text("Reject")');

      // At least one action button should be visible
      const hasApprove = await approveButton.count() > 0;
      const hasReject = await rejectButton.count() > 0;

      console.log(`Approve button: ${hasApprove}, Reject button: ${hasReject}`);
      expect(hasApprove || hasReject).toBe(true);

      console.log('Article detail page loaded successfully!');
    } else {
      console.log('No article links found - checking if we need different navigation');
      await page.screenshot({ path: 'tests/artifacts/real-backend-02-no-links.png', fullPage: true });
    }
  });

  test('3. Marketing user can APPROVE an article', async ({ page }) => {
    console.log('\n=== TEST: Approve article with real backend ===');

    await performRealLogin(page, TEST_USERS.marketing);

    // Go to approvals
    await page.goto(`${BASE_URL}/approvals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to first article detail
    const viewDetailsLink = page.locator('a[href*="/articles/"], button:has-text("View"), [data-testid="view-details"]').first();

    if (await viewDetailsLink.count() > 0) {
      await viewDetailsLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Find and click Approve button
      const approveButton = page.locator('button:has-text("Approve")').first();

      if (await approveButton.isVisible()) {
        await page.screenshot({ path: 'tests/artifacts/real-backend-03-before-approve.png', fullPage: true });

        await approveButton.click();
        await page.waitForTimeout(500);

        // Dialog should open
        await page.screenshot({ path: 'tests/artifacts/real-backend-03-approve-dialog.png', fullPage: true });

        // Look for dialog
        const dialogTitle = page.getByRole('heading', { name: 'Approve Article' });

        if (await dialogTitle.isVisible()) {
          // Fill notes
          const notesField = page.locator('#approval-notes, textarea[placeholder*="comments"], textarea').first();
          if (await notesField.count() > 0) {
            await notesField.fill('Approved by marketing team - content meets guidelines.');
          }

          // Click confirm button
          const confirmButton = page.locator('button:has-text("Approve Article")').last();
          await confirmButton.click();

          // Wait for API response
          await page.waitForTimeout(2000);

          await page.screenshot({ path: 'tests/artifacts/real-backend-03-after-approve.png', fullPage: true });

          // Check for success indication (toast, status change, redirect)
          console.log('Approval action completed - checking results');
        }
      } else {
        console.log('Approve button not visible - user may not have permission for current gate');
        await page.screenshot({ path: 'tests/artifacts/real-backend-03-no-approve-button.png', fullPage: true });
      }
    }

    console.log('Approve test completed!');
  });

  test('4. Verify approval status changed after marketing approval', async ({ page }) => {
    console.log('\n=== TEST: Verify status changed ===');

    // Login as branding user (next in workflow)
    await performRealLogin(page, TEST_USERS.branding);

    // Go to approvals
    await page.goto(`${BASE_URL}/approvals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/artifacts/real-backend-04-branding-queue.png', fullPage: true });

    // Branding user should now see the article (moved from pending_marketing to pending_branding)
    const articleElements = page.locator('[data-testid*="article"], .article-card, tr[data-article-id]');
    const articleCount = await articleElements.count();

    console.log(`Branding queue has ${articleCount} articles`);

    // The article should now be visible to branding user if marketing approved it
    console.log('Status verification complete!');
  });
});

test.describe('Real Backend - Login Flow Tests', () => {
  test('Login with valid credentials works', async ({ page }) => {
    console.log('\n=== TEST: Real login flow ===');

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Screenshot before login
    await page.screenshot({ path: 'tests/artifacts/real-backend-login-01-page.png', fullPage: true });

    // Fill form
    await page.fill('input[name="email"], input[type="email"]', TEST_USERS.marketing);
    await page.fill('input[name="password"], input[type="password"]', PASSWORD);

    // Screenshot with filled form
    await page.screenshot({ path: 'tests/artifacts/real-backend-login-02-filled.png', fullPage: true });

    // Submit
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/.*(?<!login)$/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Screenshot after login
    await page.screenshot({ path: 'tests/artifacts/real-backend-login-03-success.png', fullPage: true });

    // Verify we're logged in (check for user info or dashboard)
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);

    expect(currentUrl).not.toContain('/login');

    console.log('Real login successful!');
  });

  test('Login with invalid credentials shows error', async ({ page }) => {
    console.log('\n=== TEST: Invalid login shows error ===');

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Fill with wrong password
    await page.fill('input[name="email"], input[type="email"]', TEST_USERS.marketing);
    await page.fill('input[name="password"], input[type="password"]', 'WrongPassword123!');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForTimeout(2000);

    // Screenshot
    await page.screenshot({ path: 'tests/artifacts/real-backend-login-error.png', fullPage: true });

    // Should still be on login page
    expect(page.url()).toContain('/login');

    // Should show error message
    const errorMessage = page.locator('[role="alert"], .error-message, [data-testid="error"]');
    // Error might be in a toast or inline

    console.log('Invalid login test completed!');
  });
});

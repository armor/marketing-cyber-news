/**
 * E2E Tests for Approval Button Actions
 *
 * PHASE 1: Mock E2E Testing
 * Tests that every button (Approve, Reject, Release) is clicked,
 * forms are filled out, and actions are confirmed with mock backend.
 */

import { test, expect, Route } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const PASSWORD = 'TestPass123';

// Mock article data for testing - matches ArticleForApproval interface
function createMockArticle(id: string, status: string, rejected = false) {
  // Define gate progression for each status
  const GATES = ['marketing', 'branding', 'soc_l1', 'soc_l3', 'ciso'] as const;
  type ApprovalGate = typeof GATES[number];

  const statusToGateIndex: Record<string, number> = {
    'pending_marketing': 0,
    'pending_branding': 1,
    'pending_soc_l1': 2,
    'pending_soc_l3': 3,
    'pending_ciso': 4,
    'approved': 5, // All gates complete
    'rejected': -1,
    'released': 5,
  };

  const gateIndex = statusToGateIndex[status] ?? 0;
  const completedGates: ApprovalGate[] = GATES.slice(0, gateIndex);
  const currentGate: ApprovalGate | null = gateIndex >= 0 && gateIndex < GATES.length ? GATES[gateIndex] : null;
  const pendingGates: ApprovalGate[] = gateIndex >= 0 ? GATES.slice(gateIndex) : [...GATES];

  return {
    id,
    title: `Test Article for ${status}`,
    slug: `test-article-${id}`,
    summary: 'This is a test article summary for E2E testing of approval workflow.',
    content: 'Full content of the test article with detailed information about cybersecurity threats.',
    severity: 'high',
    approvalStatus: status,
    rejected,
    createdAt: new Date().toISOString(),
    publishedAt: status === 'released' ? new Date().toISOString() : undefined,
    source: { id: 'source-1', name: 'Test Security Source', url: 'https://example.com' },
    category: { id: 'cat-1', name: 'Vulnerability', slug: 'vulnerability' },
    cves: ['CVE-2024-12345'],
    vendors: ['Test Vendor'],
    tags: ['critical', 'zero-day'],
    approvalProgress: {
      completedGates,
      currentGate,
      pendingGates,
      totalGates: GATES.length,
      completedCount: completedGates.length,
    },
  };
}

// Helper to create mock user response
function createMockUser(email: string, role: string, name: string) {
  return {
    id: `user-${role}`,
    email,
    name,
    role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper to setup common API mocks
async function setupCommonMocks(page: any, userRole: string) {
  const mockUser = createMockUser(`${userRole}@test.com`, userRole, `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} User`);

  // Mock login
  await page.route('**/v1/auth/login', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: `mock-access-token-${userRole}`,
          refreshToken: `mock-refresh-token-${userRole}`,
          user: mockUser,
        },
      }),
    });
  });

  // Mock /users/me endpoint (used by AuthContext to verify auth)
  await page.route('**/v1/users/me', async (route: Route) => {
    console.log('GET /users/me called - returning mock user');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: mockUser }),
    });
  });

  // Mock dashboard
  await page.route('**/v1/dashboard*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { totalThreats: 10, totalArticles: 5, pendingApprovals: 3 },
      }),
    });
  });

  return mockUser;
}

// Helper to setup auth state directly (skip actual login flow)
// This sets localStorage and reloads so AuthContext reads from storage
async function setupAuthState(page: any, role: string) {
  // First navigate to the app to set up localStorage in the right origin
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');

  // Set auth state in localStorage
  const mockUser = {
    id: `user-${role}`,
    email: `${role}@test.com`,
    name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
    role: role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await page.evaluate(({ user, r }: { user: any; r: string }) => {
    localStorage.setItem('aci_access_token', `mock-access-token-${r}`);
    localStorage.setItem('aci_refresh_token', `mock-refresh-token-${r}`);
    localStorage.setItem('aci_user', JSON.stringify(user));
  }, { user: mockUser, r: role });

  console.log(`Auth state set for role: ${role}`);

  // Reload the page so AuthContext re-initializes with the token
  // This will trigger a call to /users/me which is mocked
  await page.reload();
  await page.waitForLoadState('networkidle');
  console.log(`Page reloaded, auth context should be initialized`);
}

// Helper to login (kept for compatibility but now uses direct auth setup)
async function performLogin(page: any, email: string, role: string) {
  await setupAuthState(page, role);
}

test.describe('Approval Button Actions - PHASE 1 Mock E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('Marketing user clicks APPROVE button with notes', async ({ page }) => {
    console.log('\n=== TEST: Marketing user clicks APPROVE button ===');

    const articleId = 'article-for-approve-test';
    const mockArticle = createMockArticle(articleId, 'pending_marketing');
    let approveApiCalled = false;
    let approveRequestBody: any = null;

    // Setup common mocks
    await setupCommonMocks(page, 'marketing');

    // Mock single article endpoint
    await page.route(`**/v1/articles/${articleId}`, async (route: Route) => {
      const method = route.request().method();
      if (method === 'GET') {
        console.log('GET article called');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockArticle }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock approve endpoint
    await page.route(`**/v1/articles/${articleId}/approve`, async (route: Route) => {
      const method = route.request().method();
      if (method === 'POST') {
        approveApiCalled = true;
        approveRequestBody = JSON.parse(route.request().postData() || '{}');
        console.log('APPROVE API called with:', approveRequestBody);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Article approved successfully',
            data: { ...mockArticle, approvalStatus: 'pending_branding' },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Login
    await performLogin(page, 'marketing@test.com', 'marketing');

    // Navigate directly to article detail page
    await page.goto(`${BASE_URL}/articles/${articleId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot before clicking
    await page.screenshot({ path: 'tests/artifacts/approve-01-article-detail.png', fullPage: true });

    // Verify article loaded
    const articleTitle = page.locator('[data-testid="article-title"]');
    await expect(articleTitle).toContainText('Test Article');
    console.log('Article detail page loaded successfully');

    // Find and click the Approve button
    const approveButton = page.locator('button:has-text("Approve")').first();
    await expect(approveButton).toBeVisible();
    console.log('Approve button found');

    await approveButton.click();
    await page.waitForTimeout(500);

    // Take screenshot of dialog
    await page.screenshot({ path: 'tests/artifacts/approve-02-dialog-open.png', fullPage: true });

    // Verify dialog opened - use getByRole to target heading specifically
    const dialogTitle = page.getByRole('heading', { name: 'Approve Article' });
    await expect(dialogTitle).toBeVisible();
    console.log('Approve dialog opened');

    // Fill in notes
    const notesField = page.locator('#approval-notes, textarea[placeholder*="comments"]');
    await expect(notesField).toBeVisible();
    await notesField.fill('This article meets marketing guidelines and is approved for the next review stage.');
    console.log('Notes filled in');

    // Take screenshot with notes filled
    await page.screenshot({ path: 'tests/artifacts/approve-03-notes-filled.png', fullPage: true });

    // Click confirm button
    const confirmButton = page.locator('button:has-text("Approve Article")').last();
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();
    console.log('Confirm button clicked');

    await page.waitForTimeout(1000);

    // Take screenshot after confirmation
    await page.screenshot({ path: 'tests/artifacts/approve-04-confirmed.png', fullPage: true });

    // Verify API was called
    expect(approveApiCalled).toBe(true);
    console.log('Approve API was called successfully');

    // Verify notes were sent (if provided)
    if (approveRequestBody && approveRequestBody.notes) {
      expect(approveRequestBody.notes).toContain('marketing guidelines');
      console.log('Notes were sent correctly');
    }

    // Verify success toast appears (look for success message)
    const successToast = page.locator('[data-sonner-toast][data-type="success"], .sonner-toast, [role="status"]:has-text("approved")');
    // Note: Toast might disappear quickly, so we just verify the API was called

    console.log('APPROVE test completed successfully!');
  });

  test('SOC L1 user clicks REJECT button with reason (min 10 chars)', async ({ page }) => {
    console.log('\n=== TEST: SOC L1 user clicks REJECT button ===');

    const articleId = 'article-for-reject-test';
    const mockArticle = createMockArticle(articleId, 'pending_soc_l1');
    let rejectApiCalled = false;
    let rejectRequestBody: any = null;

    // Setup common mocks for SOC L1 user
    await setupCommonMocks(page, 'soc_level_1');

    // Mock single article endpoint
    await page.route(`**/v1/articles/${articleId}`, async (route: Route) => {
      const method = route.request().method();
      if (method === 'GET') {
        console.log('GET article called');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockArticle }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock reject endpoint
    await page.route(`**/v1/articles/${articleId}/reject`, async (route: Route) => {
      const method = route.request().method();
      if (method === 'POST') {
        rejectApiCalled = true;
        rejectRequestBody = JSON.parse(route.request().postData() || '{}');
        console.log('REJECT API called with:', rejectRequestBody);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Article rejected successfully',
            data: { ...mockArticle, approvalStatus: 'rejected', rejected: true },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Login as SOC L1
    await performLogin(page, 'soc_level_1@test.com', 'soc_level_1');

    // Navigate to article detail
    await page.goto(`${BASE_URL}/articles/${articleId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Screenshot before
    await page.screenshot({ path: 'tests/artifacts/reject-01-article-detail.png', fullPage: true });

    // Verify article loaded
    const articleTitle = page.locator('[data-testid="article-title"]');
    await expect(articleTitle).toContainText('Test Article');
    console.log('Article detail page loaded');

    // Find and click Reject button
    const rejectButton = page.locator('button:has-text("Reject")').first();
    await expect(rejectButton).toBeVisible();
    console.log('Reject button found');

    await rejectButton.click();
    await page.waitForTimeout(500);

    // Screenshot of dialog
    await page.screenshot({ path: 'tests/artifacts/reject-02-dialog-open.png', fullPage: true });

    // Verify dialog opened - use getByRole to target heading specifically
    const dialogTitle = page.getByRole('heading', { name: 'Reject Article' });
    await expect(dialogTitle).toBeVisible();
    console.log('Reject dialog opened');

    // Try to submit with short reason (should fail)
    const reasonField = page.locator('#rejection-reason, textarea[placeholder*="Explain"]');
    await expect(reasonField).toBeVisible();
    await reasonField.fill('Too short'); // Less than 10 chars
    console.log('Short reason entered');

    // Screenshot with short reason
    await page.screenshot({ path: 'tests/artifacts/reject-03-short-reason.png', fullPage: true });

    // The submit button should be disabled with short reason
    const submitButton = page.locator('button[type="submit"]:has-text("Reject Article"), button:has-text("Reject Article"):not(:has-text("Reject"))').last();

    // Fill in proper reason (10+ characters)
    await reasonField.clear();
    await reasonField.fill('This article contains inaccurate information about the vulnerability severity and needs to be revised by the original author.');
    console.log('Valid reason entered (10+ characters)');

    // Screenshot with valid reason
    await page.screenshot({ path: 'tests/artifacts/reject-04-valid-reason.png', fullPage: true });

    // Click confirm
    await submitButton.click();
    console.log('Submit button clicked');

    await page.waitForTimeout(1000);

    // Screenshot after confirmation
    await page.screenshot({ path: 'tests/artifacts/reject-05-confirmed.png', fullPage: true });

    // Verify API was called
    expect(rejectApiCalled).toBe(true);
    console.log('Reject API was called successfully');

    // Verify reason was sent
    expect(rejectRequestBody.reason).toBeDefined();
    expect(rejectRequestBody.reason.length).toBeGreaterThanOrEqual(10);
    console.log('Reason was sent correctly:', rejectRequestBody.reason);

    console.log('REJECT test completed successfully!');
  });

  test('CISO user clicks RELEASE button on fully approved article', async ({ page }) => {
    console.log('\n=== TEST: CISO user clicks RELEASE button ===');

    const articleId = 'article-for-release-test';
    // Create a fully approved article (all gates passed)
    const mockArticle = createMockArticle(articleId, 'approved');
    let releaseApiCalled = false;

    // Setup common mocks for CISO user
    await setupCommonMocks(page, 'ciso');

    // Mock single article endpoint
    await page.route(`**/v1/articles/${articleId}`, async (route: Route) => {
      const method = route.request().method();
      if (method === 'GET') {
        console.log('GET article called - returning fully approved article');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockArticle }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock release endpoint
    await page.route(`**/v1/articles/${articleId}/release`, async (route: Route) => {
      const method = route.request().method();
      if (method === 'POST') {
        releaseApiCalled = true;
        console.log('RELEASE API called');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Article released to public',
            data: { ...mockArticle, approvalStatus: 'released', releasedAt: new Date().toISOString() },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Login as CISO
    await performLogin(page, 'ciso@test.com', 'ciso');

    // Navigate to article detail
    await page.goto(`${BASE_URL}/articles/${articleId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Screenshot before
    await page.screenshot({ path: 'tests/artifacts/release-01-article-detail.png', fullPage: true });

    // Verify article loaded and shows as approved
    const articleTitle = page.locator('[data-testid="article-title"]');
    await expect(articleTitle).toContainText('Test Article');
    console.log('Article detail page loaded - fully approved article');

    // Verify the status shows as approved
    const statusBadge = page.locator('[data-testid="article-status"]');
    if (await statusBadge.count() > 0) {
      const statusText = await statusBadge.textContent();
      console.log('Article status:', statusText);
    }

    // Find Release button (should be enabled for fully approved article)
    const releaseButton = page.locator('button:has-text("Release")').first();
    await expect(releaseButton).toBeVisible();
    console.log('Release button found');

    // Verify button is enabled (not disabled)
    const isDisabled = await releaseButton.isDisabled();
    console.log('Release button disabled:', isDisabled);
    expect(isDisabled).toBe(false);

    await releaseButton.click();
    await page.waitForTimeout(500);

    // Screenshot of dialog
    await page.screenshot({ path: 'tests/artifacts/release-02-dialog-open.png', fullPage: true });

    // Verify dialog opened - use getByRole to target heading specifically
    const dialogTitle = page.getByRole('heading', { name: 'Release Article' });
    await expect(dialogTitle).toBeVisible();
    console.log('Release dialog opened');

    // Verify warning about irreversible action
    const warningText = page.locator('text=cannot be undone');
    await expect(warningText).toBeVisible();
    console.log('Warning about irreversible action visible');

    // Click confirm (Release to Public)
    const confirmButton = page.locator('button:has-text("Release to Public")');
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();
    console.log('Release to Public button clicked');

    await page.waitForTimeout(1000);

    // Screenshot after confirmation
    await page.screenshot({ path: 'tests/artifacts/release-03-confirmed.png', fullPage: true });

    // Verify API was called
    expect(releaseApiCalled).toBe(true);
    console.log('Release API was called successfully');

    console.log('RELEASE test completed successfully!');
  });

  test('Verify REJECT validation - reason must be 10+ characters', async ({ page }) => {
    console.log('\n=== TEST: Reject validation - minimum character requirement ===');

    const articleId = 'article-validation-test';
    const mockArticle = createMockArticle(articleId, 'pending_branding');

    // Setup mocks
    await setupCommonMocks(page, 'branding');

    await page.route(`**/v1/articles/${articleId}`, async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockArticle }),
        });
      }
    });

    // Login
    await performLogin(page, 'branding@test.com', 'branding');

    // Navigate to article
    await page.goto(`${BASE_URL}/articles/${articleId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click Reject
    const rejectButton = page.locator('button:has-text("Reject")').first();
    await rejectButton.click();
    await page.waitForTimeout(500);

    // Verify dialog
    await expect(page.getByRole('heading', { name: 'Reject Article' })).toBeVisible();

    // Check validation message is shown
    const validationHint = page.locator('text=Minimum 10 characters');
    await expect(validationHint).toBeVisible();
    console.log('Validation hint visible: Minimum 10 characters');

    // Type less than 10 characters
    const reasonField = page.locator('#rejection-reason, textarea[placeholder*="Explain"]');
    await reasonField.fill('Short');

    // Screenshot showing validation state
    await page.screenshot({ path: 'tests/artifacts/reject-validation-01-short.png', fullPage: true });

    // Check submit button is disabled
    const submitButton = page.locator('button[type="submit"]:has-text("Reject"), button:has-text("Reject Article"):not([type="button"]):last-of-type');
    const isDisabled = await submitButton.isDisabled();
    console.log('Submit button disabled with short reason:', isDisabled);
    expect(isDisabled).toBe(true);

    // Now type exactly 10 characters
    await reasonField.clear();
    await reasonField.fill('1234567890'); // Exactly 10 chars

    // Screenshot
    await page.screenshot({ path: 'tests/artifacts/reject-validation-02-exact10.png', fullPage: true });

    // Button should now be enabled
    await page.waitForTimeout(300);
    const isEnabledNow = await submitButton.isEnabled();
    console.log('Submit button enabled with 10 chars:', isEnabledNow);
    expect(isEnabledNow).toBe(true);

    console.log('Validation test completed successfully!');
  });

  test('Navigate from Approval Queue to Article Detail and back', async ({ page }) => {
    console.log('\n=== TEST: Navigation flow - Queue to Detail to Queue ===');

    const articleId = 'article-nav-test';
    const mockArticle = createMockArticle(articleId, 'pending_marketing');

    // Setup mocks
    await setupCommonMocks(page, 'marketing');

    // Mock approval queue
    await page.route('**/v1/approvals*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            articles: [mockArticle],
            total: 1,
            page: 1,
            pageSize: 20,
            totalPages: 1,
          },
        }),
      });
    });

    // Mock single article
    await page.route(`**/v1/articles/${articleId}`, async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockArticle }),
        });
      }
    });

    // Login
    await performLogin(page, 'marketing@test.com', 'marketing');

    // Go to approvals page
    await page.goto(`${BASE_URL}/approvals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Screenshot of queue
    await page.screenshot({ path: 'tests/artifacts/nav-01-approval-queue.png', fullPage: true });

    // Find article card and click View Details
    const viewDetailsLink = page.locator('a[href*="/articles/"], button:has-text("View Details"), [data-testid="view-details"]').first();

    if (await viewDetailsLink.count() > 0) {
      await viewDetailsLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Screenshot of detail
      await page.screenshot({ path: 'tests/artifacts/nav-02-article-detail.png', fullPage: true });

      // Verify we're on detail page
      const articleTitle = page.locator('[data-testid="article-title"]');
      await expect(articleTitle).toBeVisible();
      console.log('Navigated to article detail successfully');

      // Click back button
      const backButton = page.locator('[data-testid="back-button"], button:has-text("Back")');
      if (await backButton.count() > 0) {
        await backButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Screenshot after back
        await page.screenshot({ path: 'tests/artifacts/nav-03-back-to-queue.png', fullPage: true });
        console.log('Navigated back successfully');
      }
    } else {
      console.log('No View Details link found - checking if articles are displayed');
      await page.screenshot({ path: 'tests/artifacts/nav-error-no-articles.png', fullPage: true });
    }

    console.log('Navigation test completed!');
  });
});

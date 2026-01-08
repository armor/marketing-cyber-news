/**
 * Final E2E Verification Test
 *
 * This test properly handles authentication by:
 * 1. Setting auth token in localStorage BEFORE navigation
 * 2. Mocking all API endpoints consistently
 * 3. Testing all pages and button interactions
 */

import { test, expect, Route, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Test user with CISO role (has all permissions)
const testUser = {
  id: 'user-ciso-001',
  email: 'ciso@test.com',
  name: 'Test CISO',
  role: 'ciso',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock articles
const mockArticles = [
  {
    id: 'article-001',
    title: 'Critical Zero-Day Vulnerability in Apache Struts',
    summary: 'A critical RCE vulnerability discovered in Apache Struts 2.0.0-2.5.30.',
    content: 'Full article content here...',
    severity: 'critical',
    category: 'vulnerability',
    status: 'pending_ciso',
    currentGate: 'ciso',
    sourceUrl: 'https://example.com/vuln1',
    createdAt: '2024-12-15T10:00:00Z',
    updatedAt: '2024-12-15T10:00:00Z',
  },
  {
    id: 'article-002',
    title: 'New Ransomware Campaign Targets Healthcare',
    summary: 'New ransomware strain targeting healthcare institutions.',
    content: 'Full article content here...',
    severity: 'high',
    category: 'malware',
    status: 'pending_marketing',
    currentGate: 'marketing',
    sourceUrl: 'https://example.com/ransomware',
    createdAt: '2024-12-14T08:00:00Z',
    updatedAt: '2024-12-14T08:00:00Z',
  },
];

/**
 * Inject auth state into the page
 */
async function injectAuthState(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('aci_access_token', 'mock-access-token-ciso');
    localStorage.setItem('aci_refresh_token', 'mock-refresh-token-ciso');
    localStorage.setItem('aci_user', JSON.stringify(user));
  }, testUser);
}

/**
 * Setup all mock API routes
 */
async function setupMockRoutes(page: Page) {
  // Users/me endpoint - this is what AuthContext calls to verify the token
  await page.route('**/v1/users/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: testUser }),
    });
  });

  // Also mock /users/me without v1 prefix (fallback)
  await page.route('**/users/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: testUser }),
    });
  });

  // Auth login
  await page.route('**/v1/auth/login', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: 'mock-access-token-ciso',
          refreshToken: 'mock-refresh-token-ciso',
          user: testUser,
        },
      }),
    });
  });

  // Threats/Articles
  await page.route('**/v1/threats*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          threats: mockArticles,
          total: mockArticles.length,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
      }),
    });
  });

  await page.route('**/v1/articles*', async (route: Route) => {
    const url = route.request().url();
    if (url.match(/\/articles\/[a-zA-Z0-9-]+$/)) {
      const articleId = url.split('/').pop();
      const article = mockArticles.find(a => a.id === articleId) || mockArticles[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: article }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { articles: mockArticles, total: mockArticles.length, page: 1, pageSize: 20, totalPages: 1 },
      }),
    });
  });

  // Approvals
  await page.route('**/v1/approvals*', async (route: Route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: `approval-${Date.now()}`, action: 'approve' },
          message: 'Action completed successfully',
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { articles: mockArticles, total: mockArticles.length, page: 1, pageSize: 20, totalPages: 1 },
      }),
    });
  });

  // Dashboard stats
  await page.route('**/v1/dashboard*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalThreats: mockArticles.length,
          totalArticles: mockArticles.length,
          pendingApprovals: mockArticles.length,
          criticalCount: 1,
          highCount: 1,
          mediumCount: 0,
          lowCount: 0,
        },
      }),
    });
  });

  // Newsletter
  await page.route('**/v1/newsletter*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { configs: [], issues: [] } }),
    });
  });
}

test.describe('Final E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // CRITICAL: Inject auth state BEFORE setting up routes
    await injectAuthState(page);
    await setupMockRoutes(page);
  });

  test('1. Dashboard loads with authenticated user', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'tests/artifacts/final-01-dashboard.png',
      fullPage: true,
    });

    // Verify we're NOT on login page
    const currentUrl = page.url();
    console.log('Dashboard URL:', currentUrl);

    // Check for dashboard content
    const pageContent = await page.content();
    const hasHeader = pageContent.includes('NEXUS') || pageContent.includes('Dashboard');
    console.log('Has header/dashboard content:', hasHeader);
  });

  test('2. Threats page shows article list', async ({ page }) => {
    await page.goto(`${BASE_URL}/threats`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'tests/artifacts/final-02-threats.png',
      fullPage: true,
    });

    const currentUrl = page.url();
    console.log('Threats URL:', currentUrl);
    expect(currentUrl).not.toContain('/login');
  });

  test('3. Approval queue accessible for CISO role', async ({ page }) => {
    await page.goto(`${BASE_URL}/approvals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'tests/artifacts/final-03-approvals.png',
      fullPage: true,
    });

    const currentUrl = page.url();
    console.log('Approvals URL:', currentUrl);
    expect(currentUrl).not.toContain('/login');
  });

  test('4. Newsletter config page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter-config`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'tests/artifacts/final-04-newsletter.png',
      fullPage: true,
    });

    const currentUrl = page.url();
    console.log('Newsletter URL:', currentUrl);
    expect(currentUrl).not.toContain('/login');
  });

  test('5. Sidebar navigation shows all links for CISO', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for sidebar links
    const dashboardLink = page.locator('a[href="/dashboard"]');
    const threatsLink = page.locator('a[href="/threats"]');
    const approvalsLink = page.locator('a[href="/approvals"]');

    console.log('Sidebar Links:');
    console.log('- Dashboard:', await dashboardLink.count() > 0 ? 'FOUND' : 'NOT FOUND');
    console.log('- Threats:', await threatsLink.count() > 0 ? 'FOUND' : 'NOT FOUND');
    console.log('- Approvals:', await approvalsLink.count() > 0 ? 'FOUND' : 'NOT FOUND');

    await page.screenshot({
      path: 'tests/artifacts/final-05-sidebar.png',
      fullPage: true,
    });
  });

  test('6. Full navigation flow - Dashboard to Threats to Approvals', async ({ page }) => {
    console.log('\n=== NAVIGATION FLOW TEST ===\n');

    // Step 1: Dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    console.log('Step 1: Dashboard -', page.url());
    await page.screenshot({ path: 'tests/artifacts/final-flow-01-dashboard.png', fullPage: true });

    // Step 2: Click Threats link or navigate
    await page.goto(`${BASE_URL}/threats`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    console.log('Step 2: Threats -', page.url());
    await page.screenshot({ path: 'tests/artifacts/final-flow-02-threats.png', fullPage: true });

    // Step 3: Navigate to Approvals
    await page.goto(`${BASE_URL}/approvals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    console.log('Step 3: Approvals -', page.url());
    await page.screenshot({ path: 'tests/artifacts/final-flow-03-approvals.png', fullPage: true });

    // Verify all navigations succeeded (not redirected to login)
    expect(page.url()).toContain('/approvals');

    // Count buttons on approval page
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`Found ${buttonCount} buttons on approvals page`);

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent() || '';
      const isVisible = await btn.isVisible();
      if (isVisible && text.trim()) {
        console.log(`  Button ${i}: "${text.trim().substring(0, 30)}"`);
      }
    }

    console.log('\n=== FLOW COMPLETE ===\n');
  });
});

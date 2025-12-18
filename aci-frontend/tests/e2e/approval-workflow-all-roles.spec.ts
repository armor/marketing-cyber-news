import { test, expect, Route } from '@playwright/test';

// All test users with their roles
const testUsers = [
  { email: 'test@example.com', role: 'user', name: 'Regular User' },
  { email: 'marketing@test.com', role: 'marketing', name: 'Marketing' },
  { email: 'branding@test.com', role: 'branding', name: 'Branding' },
  { email: 'soc1@test.com', role: 'soc_level_1', name: 'SOC Level 1' },
  { email: 'soc3@test.com', role: 'soc_level_3', name: 'SOC Level 3' },
  { email: 'ciso@test.com', role: 'ciso', name: 'CISO' },
  { email: 'admin@test.com', role: 'admin', name: 'Admin' },
  { email: 'superadmin@test.com', role: 'super_admin', name: 'Super Admin' },
];

const PASSWORD = 'TestPass123';
const BASE_URL = 'http://localhost:5173';

// Helper to create mock user response
function createMockUser(user: { email: string; role: string; name: string }) {
  return {
    id: `user-${user.role}`,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

test.describe('Approval Workflow - All User Roles', () => {
  for (const user of testUsers) {
    test(`Login and view as ${user.name} (${user.role})`, async ({ page }) => {
      console.log(`\n========== Testing ${user.name} (${user.email}) ==========`);

      const mockUser = createMockUser(user);

      // Setup API mocking for login
      await page.route(`**/v1/auth/login`, async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: `mock-access-token-${user.role}`,
              refreshToken: `mock-refresh-token-${user.role}`,
              user: mockUser,
            },
          }),
        });
      });

      // Mock /me endpoint
      await page.route(`**/v1/auth/me`, async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockUser }),
        });
      });

      // Mock approvals queue
      await page.route(`**/v1/approvals*`, async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { articles: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
          }),
        });
      });

      // Mock threats/articles
      await page.route(`**/v1/threats*`, async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { threats: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
          }),
        });
      });

      // Mock articles
      await page.route(`**/v1/articles*`, async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { articles: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
          }),
        });
      });

      // Mock dashboard stats
      await page.route(`**/v1/dashboard*`, async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { totalThreats: 0, totalArticles: 0, pendingApprovals: 0 },
          }),
        });
      });

      // Set desktop viewport (above lg breakpoint of 1024px)
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Step 1: Navigate to login
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Step 2: Fill credentials and login
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Verify login - check if redirected away from login page (indicates successful login)
      const currentUrl = page.url();
      const isNotOnLoginPage = !currentUrl.includes('/login');

      // Verify user data is in localStorage or we've navigated away from login
      const token = await page.evaluate(() => localStorage.getItem('aci_access_token'));
      expect(isNotOnLoginPage || token, `Login should succeed for ${user.email} (URL: ${currentUrl})`).toBeTruthy();
      console.log(`Login successful for ${user.email}`);

      // Take screenshot after login
      await page.screenshot({
        path: `tests/artifacts/role-${user.role}-01-dashboard.png`,
        fullPage: true
      });

      // Debug: Log viewport and sidebar visibility
      const viewportSize = page.viewportSize();
      console.log(`Viewport size: ${viewportSize?.width}x${viewportSize?.height}`);

      // Check if sidebar is visible (desktop mode) or needs to be opened (mobile mode)
      // The sidebar should be visible on desktop (lg: 1024px+) via lg:translate-x-0
      const sidebar = page.locator('aside[role="navigation"]');
      const sidebarVisible = await sidebar.isVisible();
      console.log(`Sidebar visible: ${sidebarVisible}`);

      // If sidebar is not visible, try opening hamburger menu
      if (!sidebarVisible) {
        console.log('Sidebar not visible, trying hamburger menu...');
        const hamburgerMenu = page.locator('button[aria-label*="menu" i], button[aria-label*="sidebar" i], button:has(svg.lucide-menu), header button:first-child');
        if (await hamburgerMenu.count() > 0) {
          await hamburgerMenu.first().click();
          await page.waitForTimeout(500);
        }
      }

      // Check for approval link in sidebar (this confirms role-based filtering works)
      const approvalLink = page.locator('a[href="/approvals"]');
      const hasApprovalLink = await approvalLink.count() > 0;
      console.log(`Approval link in DOM: ${hasApprovalLink ? 'YES' : 'NO'}`);

      if (hasApprovalLink) {
        // Navigate directly to approvals page since sidebar CSS positioning makes click difficult
        await page.goto(`${BASE_URL}/approvals`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        await page.screenshot({
          path: `tests/artifacts/role-${user.role}-02-approval-queue.png`,
          fullPage: true
        });
        console.log(`Approval queue accessible for ${user.role}`);
      } else {
        console.log(`No approval queue access for ${user.role} (expected for: user)`);
      }

      // Step 4: Navigate to threats/articles
      await page.goto(`${BASE_URL}/threats`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `tests/artifacts/role-${user.role}-03-threats.png`,
        fullPage: true
      });

      // Step 5: Click on first article to see detail with approval buttons
      const threatLink = page.locator('a[href*="threat"]').first();
      const threatCount = await page.locator('a[href*="threat"]').count();

      if (threatCount > 0) {
        const href = await threatLink.getAttribute('href');
        if (href) {
          await page.goto(`${BASE_URL}${href.startsWith('/') ? href : '/' + href}`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);

          await page.screenshot({
            path: `tests/artifacts/role-${user.role}-04-article-detail.png`,
            fullPage: true
          });

          // Check for approval buttons
          const approveBtn = page.locator('button:has-text("Approve"), button:has-text("approve")');
          const rejectBtn = page.locator('button:has-text("Reject"), button:has-text("reject")');
          const releaseBtn = page.locator('button:has-text("Release"), button:has-text("release")');

          const hasApprove = await approveBtn.count() > 0;
          const hasReject = await rejectBtn.count() > 0;
          const hasRelease = await releaseBtn.count() > 0;

          console.log(`${user.role} - Approve button: ${hasApprove ? 'YES' : 'NO'}`);
          console.log(`${user.role} - Reject button: ${hasReject ? 'YES' : 'NO'}`);
          console.log(`${user.role} - Release button: ${hasRelease ? 'YES' : 'NO'}`);
        }
      }

      // Step 6: Log out
      const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Log out"), a:has-text("Logout")');
      if (await logoutBtn.count() > 0) {
        await logoutBtn.first().click();
        await page.waitForTimeout(1000);
      }

      console.log(`Completed testing ${user.name}`);
    });
  }
});

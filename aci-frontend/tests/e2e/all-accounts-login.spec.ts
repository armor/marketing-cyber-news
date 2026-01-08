/**
 * All Accounts Login Test Suite
 *
 * Comprehensive E2E tests to verify login functionality for all test accounts.
 * Tests authentication, role verification, and role-based sidebar visibility.
 *
 * Run with: npx playwright test all-accounts-login.spec.ts --reporter=list
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// Test Configuration
// ============================================================================

const FRONTEND_URL = 'http://localhost:5173';
const TEST_PASSWORD = 'TestPass123';

interface TestAccount {
  email: string;
  role: string;
  displayName: string;
  expectedSidebarItems: string[];
  restrictedSidebarItems: string[];
}

// All test accounts with their expected permissions
const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: 'superadmin@test.com',
    role: 'super_admin',
    displayName: 'Super Admin',
    expectedSidebarItems: ['Dashboard', 'Threats', 'Bookmarks', 'Alerts', 'Approval Queue', 'Analytics', 'Newsletter Config', 'Admin'],
    restrictedSidebarItems: [],
  },
  {
    email: 'admin@test.com',
    role: 'admin',
    displayName: 'Admin',
    expectedSidebarItems: ['Dashboard', 'Threats', 'Bookmarks', 'Alerts', 'Approval Queue', 'Analytics', 'Newsletter Config', 'Admin'],
    restrictedSidebarItems: [],
  },
  {
    email: 'marketing@test.com',
    role: 'marketing',
    displayName: 'Marketing',
    expectedSidebarItems: ['Dashboard', 'Threats', 'Bookmarks', 'Alerts', 'Approval Queue', 'Analytics', 'Newsletter Config'],
    restrictedSidebarItems: ['Admin'],
  },
  {
    email: 'branding@test.com',
    role: 'branding',
    displayName: 'Branding',
    expectedSidebarItems: ['Dashboard', 'Threats', 'Bookmarks', 'Alerts', 'Approval Queue', 'Analytics', 'Newsletter Config'],
    restrictedSidebarItems: ['Admin'],
  },
  {
    email: 'soc1@test.com',
    role: 'soc_level_1',
    displayName: 'SOC Level 1',
    expectedSidebarItems: ['Dashboard', 'Threats', 'Bookmarks', 'Alerts', 'Approval Queue', 'Analytics'],
    restrictedSidebarItems: ['Admin', 'Newsletter Config'],
  },
  {
    email: 'soc3@test.com',
    role: 'soc_level_3',
    displayName: 'SOC Level 3',
    expectedSidebarItems: ['Dashboard', 'Threats', 'Bookmarks', 'Alerts', 'Approval Queue', 'Analytics', 'Newsletter Config'],
    restrictedSidebarItems: ['Admin'],
  },
  {
    email: 'ciso@test.com',
    role: 'ciso',
    displayName: 'CISO',
    expectedSidebarItems: ['Dashboard', 'Threats', 'Bookmarks', 'Alerts', 'Approval Queue', 'Analytics', 'Newsletter Config'],
    restrictedSidebarItems: ['Admin'],
  },
  {
    email: 'test@example.com',
    role: 'viewer',
    displayName: 'Viewer',
    expectedSidebarItems: ['Dashboard', 'Threats', 'Bookmarks', 'Alerts', 'Analytics'],
    restrictedSidebarItems: ['Admin', 'Newsletter Config', 'Approval Queue'],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function performLogin(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation or error
  await page.waitForTimeout(2000);

  // Check if login was successful by verifying token exists
  const accessToken = await page.evaluate(() => {
    return localStorage.getItem('aci_access_token');
  });

  return !!accessToken;
}

async function getVisibleSidebarItems(page: Page): Promise<string[]> {
  // Wait for sidebar to be visible
  await page.waitForSelector('[data-sidebar="sidebar"]', { timeout: 5000 }).catch(() => null);

  // Get all sidebar menu items
  const items = await page.locator('[data-sidebar="menu-button"] span').allTextContents();

  return items.filter(item => item.trim() !== '');
}

async function getUserInfoFromSidebar(page: Page): Promise<{ name: string; role: string } | null> {
  try {
    const userInfo = await page.locator('[data-sidebar="footer"] .text-xs').first();
    const name = await userInfo.locator('span.font-medium').textContent();
    const role = await userInfo.locator('span.capitalize').textContent();
    return { name: name || '', role: role || '' };
  } catch {
    return null;
  }
}

// ============================================================================
// Test Suites
// ============================================================================

test.describe('All Accounts Login Verification', () => {
  test.describe.configure({ mode: 'serial' });

  // Test each account login
  for (const account of TEST_ACCOUNTS) {
    test(`Login: ${account.displayName} (${account.email})`, async ({ page }) => {
      // Clear any existing auth state
      await page.goto(`${FRONTEND_URL}/login`);
      await clearAuthState(page);

      console.log(`\n--- Testing ${account.displayName} (${account.email}) ---`);

      // Perform login
      const loginSuccess = await performLogin(page, account.email, TEST_PASSWORD);

      // Verify login success
      expect(loginSuccess, `${account.email} should login successfully`).toBe(true);

      // Verify redirect to dashboard
      await page.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {
        // If not redirected, navigate manually
        return page.goto(`${FRONTEND_URL}/dashboard`);
      });

      const currentUrl = page.url();
      console.log(`  Current URL: ${currentUrl}`);
      expect(currentUrl).toContain('/dashboard');

      // Verify user role in localStorage or sidebar
      const storedUser = await page.evaluate(() => {
        const user = localStorage.getItem('aci_user');
        return user ? JSON.parse(user) : null;
      });

      if (storedUser) {
        console.log(`  Stored user role: ${storedUser.role}`);
        expect(storedUser.role).toBe(account.role);
      }

      console.log(`  Login: SUCCESS`);
    });
  }
});

test.describe('Role-Based Sidebar Visibility', () => {
  test.describe.configure({ mode: 'serial' });

  for (const account of TEST_ACCOUNTS) {
    test(`Sidebar Access: ${account.displayName} (${account.role})`, async ({ page }) => {
      // Clear and login
      await page.goto(`${FRONTEND_URL}/login`);
      await clearAuthState(page);
      await performLogin(page, account.email, TEST_PASSWORD);

      // Navigate to dashboard
      await page.goto(`${FRONTEND_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      console.log(`\n--- Checking sidebar for ${account.displayName} ---`);

      // Get visible sidebar items
      const visibleItems = await getVisibleSidebarItems(page);
      console.log(`  Visible items: ${visibleItems.join(', ')}`);

      // Verify expected items are visible
      for (const expectedItem of account.expectedSidebarItems) {
        const isVisible = visibleItems.some(item =>
          item.toLowerCase().includes(expectedItem.toLowerCase())
        );
        console.log(`  ${expectedItem}: ${isVisible ? 'VISIBLE' : 'MISSING'}`);
        expect(isVisible, `${expectedItem} should be visible for ${account.role}`).toBe(true);
      }

      // Verify restricted items are NOT visible
      for (const restrictedItem of account.restrictedSidebarItems) {
        const isVisible = visibleItems.some(item =>
          item.toLowerCase().includes(restrictedItem.toLowerCase())
        );
        console.log(`  ${restrictedItem}: ${isVisible ? 'INCORRECTLY VISIBLE' : 'CORRECTLY HIDDEN'}`);
        expect(isVisible, `${restrictedItem} should NOT be visible for ${account.role}`).toBe(false);
      }
    });
  }
});

test.describe('Invalid Login Attempts', () => {
  test('Should reject invalid password', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await clearAuthState(page);

    await page.fill('input[type="email"]', 'superadmin@test.com');
    await page.fill('input[type="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Should show error message
    const errorMessage = await page.locator('[style*="error"], [class*="error"], [role="alert"]').textContent().catch(() => '');
    const hasError = errorMessage !== '' || page.url().includes('/login');

    expect(hasError, 'Should show error or remain on login page').toBe(true);
  });

  test('Should reject non-existent user', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await clearAuthState(page);

    await page.fill('input[type="email"]', 'nonexistent@test.com');
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Should remain on login page
    expect(page.url()).toContain('/login');
  });
});

test.describe('Session Management', () => {
  test('Should persist session across page reload', async ({ page }) => {
    // Login
    await page.goto(`${FRONTEND_URL}/login`);
    await clearAuthState(page);
    await performLogin(page, 'superadmin@test.com', TEST_PASSWORD);

    // Navigate to dashboard
    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Verify we're on dashboard
    expect(page.url()).toContain('/dashboard');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on dashboard (session persisted)
    expect(page.url()).toContain('/dashboard');

    // Token should still exist
    const accessToken = await page.evaluate(() => {
      return localStorage.getItem('aci_access_token');
    });
    expect(accessToken).toBeTruthy();
  });

  test('Should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await clearAuthState(page);

    // Try to access dashboard without logging in
    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should be redirected to login
    expect(page.url()).toContain('/login');
  });

  test('Should clear session on logout', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}/login`);
    await clearAuthState(page);
    await performLogin(page, 'superadmin@test.com', TEST_PASSWORD);

    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), [data-sidebar="menu-button"]:has-text("Logout")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);

      // Should be redirected to login
      expect(page.url()).toContain('/login');

      // Token should be cleared
      const accessToken = await page.evaluate(() => {
        return localStorage.getItem('aci_access_token');
      });
      expect(accessToken).toBeFalsy();
    }
  });
});

test.describe('Login Summary Report', () => {
  test('Generate comprehensive login report', async ({ page }) => {
    const results: { email: string; role: string; status: string; sidebarItems: number }[] = [];

    console.log('\n========================================');
    console.log('     ALL ACCOUNTS LOGIN REPORT');
    console.log('========================================\n');

    for (const account of TEST_ACCOUNTS) {
      await page.goto(`${FRONTEND_URL}/login`);
      await clearAuthState(page);

      const loginSuccess = await performLogin(page, account.email, TEST_PASSWORD);

      if (loginSuccess) {
        await page.goto(`${FRONTEND_URL}/dashboard`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        const sidebarItems = await getVisibleSidebarItems(page);

        results.push({
          email: account.email,
          role: account.role,
          status: 'PASS',
          sidebarItems: sidebarItems.length,
        });
      } else {
        results.push({
          email: account.email,
          role: account.role,
          status: 'FAIL',
          sidebarItems: 0,
        });
      }
    }

    // Print summary table
    console.log('| Email                    | Role          | Status | Sidebar Items |');
    console.log('|--------------------------|---------------|--------|---------------|');

    for (const result of results) {
      const emailPad = result.email.padEnd(24);
      const rolePad = result.role.padEnd(13);
      const statusIcon = result.status === 'PASS' ? 'PASS' : 'FAIL';
      console.log(`| ${emailPad} | ${rolePad} | ${statusIcon}   | ${result.sidebarItems.toString().padStart(13)} |`);
    }

    console.log('\n========================================');

    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;

    console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log('========================================\n');

    // Assert all logins passed
    expect(failCount, 'All accounts should login successfully').toBe(0);
  });
});

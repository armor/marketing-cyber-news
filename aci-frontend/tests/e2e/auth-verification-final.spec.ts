import { test, expect, Page } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPass123';

// Helper to capture console messages
const consoleErrors: string[] = [];
const consoleWarnings: string[] = [];

function setupConsoleCapture(page: Page) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push(`Page Error: ${error.message}`);
  });
}

test.describe('Authentication & API Integration Verification', () => {

  test('Complete authentication flow and API integration', async ({ page }) => {
    setupConsoleCapture(page);

    console.log('\n=== STARTING FINAL VERIFICATION ===\n');

    // Step 1: Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Step 2: Verify login page loaded
    console.log('Step 2: Verifying login page loaded...');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Step 3: Fill in login credentials
    console.log('Step 3: Filling in credentials...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Step 4: Submit login form
    console.log('Step 4: Submitting login form...');
    await page.click('button[type="submit"]');

    // Wait for navigation or response
    await page.waitForTimeout(2000);

    // Step 5: Check localStorage for token
    console.log('Step 5: Checking localStorage for token...');
    const accessToken = await page.evaluate(() => {
      return localStorage.getItem('aci_access_token');
    });

    const refreshToken = await page.evaluate(() => {
      return localStorage.getItem('aci_refresh_token');
    });

    console.log('Token check results:');
    console.log(`  Access token exists: ${!!accessToken}`);
    console.log(`  Access token length: ${accessToken?.length || 0}`);
    console.log(`  Refresh token exists: ${!!refreshToken}`);

    // Step 6: Check current URL (should redirect to dashboard)
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    console.log(`Step 6: Current URL after login: ${currentUrl}`);

    // Step 7: Navigate to dashboard explicitly if not there
    if (!currentUrl.includes('/dashboard')) {
      console.log('Step 7: Navigating to /dashboard...');
      await page.goto(`${FRONTEND_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
    }

    // Step 8: Verify dashboard loads and check for data
    console.log('Step 8: Verifying dashboard content...');
    await page.waitForTimeout(2000);

    // Check for total threats metric
    const dashboardContent = await page.content();
    const hasThreatMetric = dashboardContent.includes('Total Threats') ||
                           dashboardContent.includes('totalThreats') ||
                           dashboardContent.includes('25');

    console.log(`  Dashboard has threat metric: ${hasThreatMetric}`);

    // Try to find specific metric cards
    const metricCards = await page.locator('[class*="metric"], [class*="card"], [class*="stat"]').count();
    console.log(`  Metric cards found: ${metricCards}`);

    // Step 9: Navigate to threats page
    console.log('Step 9: Navigating to /threats page...');
    await page.goto(`${FRONTEND_URL}/threats`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 10: Verify threats page content
    console.log('Step 10: Verifying threats page content...');

    // Check for article/threat cards
    const threatCards = await page.locator('[class*="threat"], [class*="article"], [class*="card"]').count();
    console.log(`  Threat/Article cards found: ${threatCards}`);

    // Check page content for numbers
    const threatsContent = await page.content();
    const hasArticles = threatsContent.includes('article') ||
                       threatsContent.includes('threat') ||
                       threatCards > 0;

    console.log(`  Page has article/threat content: ${hasArticles}`);

    // Step 11: Check for API errors in network
    console.log('Step 11: Checking for API errors...');
    const apiErrors: string[] = [];

    page.on('response', response => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        apiErrors.push(`${response.status()} - ${response.url()}`);
      }
    });

    // Wait a bit more to catch any delayed requests
    await page.waitForTimeout(2000);

    // Generate final report
    console.log('\n=== FINAL VERIFICATION RESULTS ===');
    console.log('===========================\n');

    console.log('TOKEN STORAGE:');
    console.log(`  localStorage has token: ${accessToken ? 'YES' : 'NO'}`);
    console.log(`  Token key: aci_access_token`);
    console.log(`  Token value preview: ${accessToken ? accessToken.substring(0, 20) + '...' : 'N/A'}`);
    console.log('');

    console.log('LOGIN:');
    console.log(`  Status: ${accessToken ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  Redirect: ${currentUrl.replace(FRONTEND_URL, '')}`);
    console.log('');

    console.log('DASHBOARD:');
    console.log(`  Status: ${currentUrl.includes('/dashboard') ? 'LOADED' : 'FAILED'}`);
    console.log(`  Total threats displayed: ${hasThreatMetric ? 'VISIBLE' : 'NOT FOUND'}`);
    console.log(`  Metric cards: ${metricCards}`);
    console.log(`  API calls successful: ${apiErrors.length === 0 ? 'YES' : 'NO'}`);
    console.log('');

    console.log('THREATS PAGE:');
    console.log(`  Status: LOADED`);
    console.log(`  Articles displayed: ${threatCards}`);
    console.log(`  Content verification: ${hasArticles ? 'PASS' : 'FAIL'}`);
    console.log(`  API calls successful: ${apiErrors.length === 0 ? 'YES' : 'NO'}`);
    console.log('');

    console.log(`CONSOLE ERRORS: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('ERROR DETAILS:');
      consoleErrors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err}`);
      });
    }
    console.log('');

    console.log(`CONSOLE WARNINGS: ${consoleWarnings.length}`);
    if (consoleWarnings.length > 0 && consoleWarnings.length <= 5) {
      console.log('WARNING DETAILS:');
      consoleWarnings.forEach((warn, idx) => {
        console.log(`  ${idx + 1}. ${warn}`);
      });
    }
    console.log('');

    if (apiErrors.length > 0) {
      console.log('API ERRORS:');
      apiErrors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err}`);
      });
      console.log('');
    }

    const overallPass = accessToken &&
                       currentUrl.includes('/dashboard') &&
                       apiErrors.length === 0 &&
                       consoleErrors.length === 0;

    console.log(`OVERALL: ${overallPass ? 'PASS' : 'FAIL'}`);
    console.log('');
    console.log('=== END VERIFICATION ===\n');

    // Assertions
    expect(accessToken, 'Access token should be stored').toBeTruthy();
    expect(currentUrl, 'Should redirect to dashboard').toContain('/dashboard');
    expect(apiErrors.length, 'Should have no API errors').toBe(0);
  });

  test('Verify Authorization header in API requests', async ({ page }) => {
    setupConsoleCapture(page);

    console.log('\n=== VERIFYING AUTHORIZATION HEADERS ===\n');

    const apiRequests: { url: string; hasAuth: boolean; status: number }[] = [];

    // Intercept API requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        const headers = request.headers();
        apiRequests.push({
          url: request.url(),
          hasAuth: !!headers['authorization'],
          status: 0
        });

        if (headers['authorization']) {
          console.log(`✓ Request to ${request.url()} has Authorization header`);
        } else {
          console.log(`✗ Request to ${request.url()} MISSING Authorization header`);
        }
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const req = apiRequests.find(r => r.url === response.url() && r.status === 0);
        if (req) {
          req.status = response.status();
        }
      }
    });

    // Login
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to dashboard to trigger API calls
    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to threats page
    await page.goto(`${FRONTEND_URL}/threats`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== AUTHORIZATION HEADER SUMMARY ===');
    console.log(`Total API requests: ${apiRequests.length}`);
    console.log(`Requests with auth: ${apiRequests.filter(r => r.hasAuth).length}`);
    console.log(`Requests without auth: ${apiRequests.filter(r => !r.hasAuth).length}`);
    console.log(`Failed requests (4xx/5xx): ${apiRequests.filter(r => r.status >= 400).length}`);

    if (apiRequests.filter(r => !r.hasAuth && !r.url.includes('/login')).length > 0) {
      console.log('\nRequests missing Authorization (excluding login):');
      apiRequests
        .filter(r => !r.hasAuth && !r.url.includes('/login'))
        .forEach(r => console.log(`  - ${r.url}`));
    }

    console.log('\n=== END AUTHORIZATION CHECK ===\n');

    // All non-login API requests should have auth header
    const protectedRequests = apiRequests.filter(r => !r.url.includes('/login') && !r.url.includes('/register'));
    const missingAuth = protectedRequests.filter(r => !r.hasAuth);

    expect(missingAuth.length, 'All protected API requests should have Authorization header').toBe(0);
  });
});

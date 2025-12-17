import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';
const TEST_EMAIL = 'testuser@example.com';
const TEST_PASSWORD = 'TestPass123!';

test.describe('Final API & Auth Verification', () => {

  test('Complete end-to-end verification', async ({ page }) => {
    const consoleErrors: string[] = [];
    const apiCalls: { url: string; method: string; status: number; hasAuth: boolean }[] = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    // Capture API requests to backend only
    page.on('request', request => {
      if (request.url().startsWith(BACKEND_URL)) {
        const headers = request.headers();
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          status: 0,
          hasAuth: !!headers['authorization']
        });
      }
    });

    // Capture API responses
    page.on('response', response => {
      if (response.url().startsWith(BACKEND_URL)) {
        const call = apiCalls.find(c => c.url === response.url() && c.status === 0);
        if (call) {
          call.status = response.status();
        }
      }
    });

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║        FINAL VERIFICATION TEST RESULTS                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // STEP 1: Navigate to login
    console.log('📍 STEP 1: Navigating to login page...');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');
    console.log('   ✓ Login page loaded\n');

    // STEP 2: Login
    console.log('🔐 STEP 2: Logging in...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // STEP 3: Verify token storage
    console.log('🔑 STEP 3: Checking token storage...');
    const accessToken = await page.evaluate(() => localStorage.getItem('aci_access_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('aci_refresh_token'));

    console.log(`   Access Token: ${accessToken ? '✓ PRESENT' : '✗ MISSING'}`);
    console.log(`   Token Length: ${accessToken?.length || 0} characters`);
    console.log(`   Refresh Token: ${refreshToken ? '✓ PRESENT' : '✗ MISSING'}`);
    console.log('');

    // STEP 4: Check redirect
    const currentUrl = page.url();
    console.log('📍 STEP 4: Navigation after login...');
    console.log(`   Current URL: ${currentUrl}`);
    console.log(`   Expected: ${FRONTEND_URL}/dashboard`);
    console.log(`   Status: ${currentUrl.includes('/dashboard') ? '✓ CORRECT' : '✗ WRONG'}`);
    console.log('');

    // STEP 5: Verify dashboard loads
    console.log('📊 STEP 5: Dashboard verification...');
    if (!currentUrl.includes('/dashboard')) {
      await page.goto(`${FRONTEND_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
    }
    await page.waitForTimeout(3000);

    // Check for dashboard content
    const dashboardText = await page.textContent('body');
    const hasDashboard = dashboardText?.includes('Dashboard') ||
                        dashboardText?.includes('Total Threats') ||
                        dashboardText?.includes('Critical');

    console.log(`   Dashboard Content: ${hasDashboard ? '✓ VISIBLE' : '✗ NOT FOUND'}`);

    // Count metric cards
    const metricCards = await page.locator('[class*="metric"], [class*="stat"], [class*="card"]').count();
    console.log(`   Metric Cards: ${metricCards} found`);
    console.log('');

    // STEP 6: Navigate to threats page
    console.log('⚠️  STEP 6: Threats page verification...');
    await page.goto(`${FRONTEND_URL}/threats`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const threatsText = await page.textContent('body');
    const hasThreats = threatsText?.includes('threat') ||
                      threatsText?.includes('article') ||
                      threatsText?.includes('Critical') ||
                      threatsText?.includes('High');

    console.log(`   Threats Content: ${hasThreats ? '✓ VISIBLE' : '✗ NOT FOUND'}`);

    // Try to count threat cards
    const threatCards = await page.locator('[data-testid*="threat"], [class*="threat-card"], [class*="article"]').count();
    console.log(`   Threat Cards: ${threatCards} found`);
    console.log('');

    // STEP 7: API calls analysis
    console.log('🌐 STEP 7: API Calls Analysis...');
    console.log(`   Total Backend API Calls: ${apiCalls.length}`);

    // Filter out login/register
    const protectedCalls = apiCalls.filter(c =>
      !c.url.includes('/login') &&
      !c.url.includes('/register')
    );

    const callsWithAuth = protectedCalls.filter(c => c.hasAuth);
    const callsWithoutAuth = protectedCalls.filter(c => !c.hasAuth);
    const failedCalls = apiCalls.filter(c => c.status >= 400);

    console.log(`   Protected API Calls: ${protectedCalls.length}`);
    console.log(`   With Authorization: ${callsWithAuth.length} ✓`);
    console.log(`   Without Authorization: ${callsWithoutAuth.length} ${callsWithoutAuth.length > 0 ? '✗' : '✓'}`);
    console.log(`   Failed Calls (4xx/5xx): ${failedCalls.length} ${failedCalls.length > 0 ? '✗' : '✓'}`);
    console.log('');

    if (apiCalls.length > 0) {
      console.log('   API Call Details:');
      apiCalls.forEach(call => {
        const authStatus = call.hasAuth ? '🔐' : '🔓';
        const statusEmoji = call.status >= 200 && call.status < 300 ? '✓' :
                           call.status >= 400 ? '✗' : '?';
        const endpoint = call.url.replace(BACKEND_URL, '');
        console.log(`     ${authStatus} ${statusEmoji} [${call.status}] ${call.method} ${endpoint}`);
      });
      console.log('');
    }

    if (callsWithoutAuth.length > 0) {
      console.log('   ⚠️  Calls Missing Authorization:');
      callsWithoutAuth.forEach(call => {
        console.log(`     - ${call.method} ${call.url.replace(BACKEND_URL, '')}`);
      });
      console.log('');
    }

    // STEP 8: Console errors
    console.log('🐛 STEP 8: Console Errors...');
    const relevantErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('.map') &&
      !err.includes('DevTools')
    );
    console.log(`   Total Console Errors: ${relevantErrors.length}`);

    if (relevantErrors.length > 0) {
      console.log('   Error Details:');
      relevantErrors.slice(0, 10).forEach((err, idx) => {
        console.log(`     ${idx + 1}. ${err.substring(0, 100)}${err.length > 100 ? '...' : ''}`);
      });
      console.log('');
    }

    // FINAL SUMMARY
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              FINAL VERIFICATION RESULTS                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('TOKEN STORAGE:');
    console.log(`  localStorage has token: ${accessToken ? 'YES ✓' : 'NO ✗'}`);
    console.log(`  Token key: aci_access_token`);
    console.log('');

    console.log('LOGIN:');
    console.log(`  Status: ${accessToken ? 'SUCCESS ✓' : 'FAILED ✗'}`);
    console.log(`  Redirect: ${currentUrl.replace(FRONTEND_URL, '') || '/'}`);
    console.log('');

    console.log('DASHBOARD:');
    console.log(`  Status: ${hasDashboard ? 'LOADED ✓' : 'FAILED ✗'}`);
    console.log(`  Total threats displayed: ${hasDashboard ? 'VISIBLE ✓' : 'NOT FOUND ✗'}`);
    console.log(`  API calls successful: ${failedCalls.length === 0 ? 'YES ✓' : 'NO ✗'}`);
    console.log('');

    console.log('THREATS PAGE:');
    console.log(`  Status: ${hasThreats ? 'LOADED ✓' : 'FAILED ✗'}`);
    console.log(`  Articles displayed: ${threatCards}`);
    console.log(`  API calls successful: ${failedCalls.length === 0 ? 'YES ✓' : 'NO ✗'}`);
    console.log('');

    console.log(`CONSOLE ERRORS: ${relevantErrors.length}`);
    if (relevantErrors.length > 0) {
      console.log('ERROR DETAILS:');
      relevantErrors.slice(0, 5).forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.substring(0, 80)}...`);
      });
    }
    console.log('');

    const allPassed = accessToken &&
                     currentUrl.includes('/dashboard') &&
                     callsWithoutAuth.length === 0 &&
                     failedCalls.length === 0 &&
                     relevantErrors.length === 0;

    console.log(`OVERALL: ${allPassed ? 'PASS ✓✓✓' : 'FAIL ✗✗✗'}`);
    console.log('');

    if (!allPassed) {
      console.log('ISSUES FOUND:');
      if (!accessToken) console.log('  - No access token stored');
      if (!currentUrl.includes('/dashboard')) console.log('  - Did not redirect to dashboard');
      if (callsWithoutAuth.length > 0) console.log(`  - ${callsWithoutAuth.length} API calls missing Authorization header`);
      if (failedCalls.length > 0) console.log(`  - ${failedCalls.length} failed API calls`);
      if (relevantErrors.length > 0) console.log(`  - ${relevantErrors.length} console errors`);
      console.log('');
    }

    // Assertions
    expect(accessToken, '✗ Access token not stored in localStorage').toBeTruthy();
    expect(currentUrl, '✗ Did not redirect to dashboard').toContain('/dashboard');

    // Only fail if there are actual backend API calls without auth
    if (protectedCalls.length > 0) {
      expect(callsWithoutAuth.length, '✗ Protected API calls missing Authorization header').toBe(0);
    }

    // Don't fail on API errors if none were made (might be using mock data)
    if (apiCalls.length > 0) {
      expect(failedCalls.length, '✗ Some API calls failed').toBe(0);
    }
  });
});

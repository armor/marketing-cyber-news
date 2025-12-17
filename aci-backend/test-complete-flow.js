const { chromium } = require('playwright');

async function runTests() {
  console.log('Starting comprehensive browser tests...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down to see what's happening
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Console message tracking
  const consoleLogs = [];
  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();

    if (type === 'error') {
      consoleErrors.push(text);
      console.log(`❌ Console Error: ${text}`);
    } else if (type === 'warning') {
      consoleWarnings.push(text);
      console.log(`⚠️  Console Warning: ${text}`);
    } else if (type === 'log') {
      consoleLogs.push(text);
    }
  });

  // Network errors
  page.on('pageerror', error => {
    consoleErrors.push(`Page Error: ${error.message}`);
    console.log(`❌ Page Error: ${error.message}`);
  });

  // Failed requests
  page.on('requestfailed', request => {
    consoleErrors.push(`Request Failed: ${request.url()}`);
    console.log(`❌ Request Failed: ${request.url()}`);
  });

  const results = {
    login: { status: 'PENDING', redirectTo: '', errors: 0 },
    dashboard: { status: 'PENDING', showsMetrics: false, summaryVisible: false, activityVisible: false, errors: 0 },
    threats: { status: 'PENDING', articlesCount: 0, errors: 0 }
  };

  try {
    // ========================================
    // TEST 1: LOGIN
    // ========================================
    console.log('\n=== TEST 1: LOGIN ===');
    console.log('Navigating to http://localhost:5174/login');

    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const loginErrorsBefore = consoleErrors.length;

    // Fill in login form
    console.log('Filling login form...');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');

    console.log('Clicking login button...');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/.*/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);

    results.login.redirectTo = currentUrl;
    results.login.errors = consoleErrors.length - loginErrorsBefore;

    if (currentUrl.includes('/dashboard')) {
      results.login.status = 'SUCCESS';
      console.log('✅ Login successful, redirected to dashboard');
    } else {
      results.login.status = 'FAILED';
      console.log(`❌ Login failed or wrong redirect: ${currentUrl}`);
    }

    // ========================================
    // TEST 2: DASHBOARD
    // ========================================
    console.log('\n=== TEST 2: DASHBOARD ===');

    const dashboardErrorsBefore = consoleErrors.length;

    // Wait for dashboard to load
    await page.waitForTimeout(3000);

    // Check for metrics/summary data
    console.log('Checking for dashboard content...');

    // Look for common dashboard elements
    const hasSummaryCard = await page.locator('text=/total.*threats/i').count() > 0 ||
                          await page.locator('text=/critical/i').count() > 0 ||
                          await page.locator('[class*="card"], [class*="Card"]').count() > 0;

    const hasMetrics = await page.locator('text=/threat/i').count() > 0;

    const hasRecentActivity = await page.locator('text=/recent/i, text=/activity/i').count() > 0;

    results.dashboard.summaryVisible = hasSummaryCard;
    results.dashboard.activityVisible = hasRecentActivity;
    results.dashboard.showsMetrics = hasMetrics;
    results.dashboard.errors = consoleErrors.length - dashboardErrorsBefore;

    if (hasSummaryCard || hasMetrics) {
      results.dashboard.status = 'LOADED';
      console.log('✅ Dashboard loaded with content');
      console.log(`   - Summary cards: ${hasSummaryCard ? 'YES' : 'NO'}`);
      console.log(`   - Metrics visible: ${hasMetrics ? 'YES' : 'NO'}`);
      console.log(`   - Recent activity: ${hasRecentActivity ? 'YES' : 'NO'}`);
    } else {
      results.dashboard.status = 'FAILED';
      console.log('❌ Dashboard loaded but no content visible');
    }

    // Take screenshot
    await page.screenshot({ path: '/Users/phillipboles/Development/n8n-cyber-news/aci-backend/dashboard-screenshot.png', fullPage: true });
    console.log('📸 Dashboard screenshot saved');

    // ========================================
    // TEST 3: THREATS PAGE
    // ========================================
    console.log('\n=== TEST 3: THREATS PAGE ===');

    const threatsErrorsBefore = consoleErrors.length;

    console.log('Navigating to /threats page...');
    await page.goto('http://localhost:5174/threats', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check for articles
    const articleCount = await page.locator('[class*="article"], [class*="threat"], [class*="card"]').count();
    console.log(`Found ${articleCount} article elements`);

    // Also check for "No data" or empty states
    const hasNoData = await page.locator('text=/no.*threats/i, text=/no.*data/i, text=/empty/i').count() > 0;

    results.threats.articlesCount = articleCount;
    results.threats.errors = consoleErrors.length - threatsErrorsBefore;

    if (articleCount > 0) {
      results.threats.status = 'LOADED';
      console.log(`✅ Threats page loaded with ${articleCount} articles`);
    } else if (hasNoData) {
      results.threats.status = 'LOADED';
      console.log('⚠️  Threats page loaded but shows "no data" state');
    } else {
      results.threats.status = 'FAILED';
      console.log('❌ Threats page loaded but no articles visible');
    }

    // Take screenshot
    await page.screenshot({ path: '/Users/phillipboles/Development/n8n-cyber-news/aci-backend/threats-screenshot.png', fullPage: true });
    console.log('📸 Threats page screenshot saved');

  } catch (error) {
    console.error(`\n❌ Test execution error: ${error.message}`);
    consoleErrors.push(`Test Error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // ========================================
  // RESULTS SUMMARY
  // ========================================
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('                    TEST RESULTS                       ');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('LOGIN:');
  console.log(`  Status: ${results.login.status}`);
  console.log(`  Redirect to: ${results.login.redirectTo}`);
  console.log(`  Errors: ${results.login.errors}\n`);

  console.log('DASHBOARD:');
  console.log(`  Status: ${results.dashboard.status}`);
  console.log(`  Shows metrics: ${results.dashboard.showsMetrics ? 'YES' : 'NO'}`);
  console.log(`  Summary data visible: ${results.dashboard.summaryVisible ? 'YES' : 'NO'}`);
  console.log(`  Recent activity visible: ${results.dashboard.activityVisible ? 'YES' : 'NO'}`);
  console.log(`  Console errors: ${results.dashboard.errors}\n`);

  console.log('THREATS PAGE:');
  console.log(`  Status: ${results.threats.status}`);
  console.log(`  Articles visible: ${results.threats.articlesCount}`);
  console.log(`  Console errors: ${results.threats.errors}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log(`TOTAL CONSOLE ERRORS: ${consoleErrors.length}`);
  console.log(`TOTAL CONSOLE WARNINGS: ${consoleWarnings.length}`);
  console.log(`TOTAL CONSOLE LOGS: ${consoleLogs.length}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (consoleErrors.length > 0) {
    console.log('ERROR DETAILS:');
    // Get unique errors
    const uniqueErrors = [...new Set(consoleErrors)];
    uniqueErrors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
    console.log('');
  }

  if (consoleWarnings.length > 0) {
    console.log('WARNING DETAILS:');
    const uniqueWarnings = [...new Set(consoleWarnings)];
    uniqueWarnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
    console.log('');
  }

  // Overall verification
  const allPassed = results.login.status === 'SUCCESS' &&
                   results.dashboard.status === 'LOADED' &&
                   results.threats.status === 'LOADED' &&
                   consoleErrors.length === 0;

  console.log('═══════════════════════════════════════════════════════');
  console.log(`VERIFICATION: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (!allPassed) {
    console.log('REMAINING ISSUES:');
    const issues = [];

    if (results.login.status !== 'SUCCESS') {
      issues.push('- Login failed or did not redirect to dashboard');
    }
    if (results.dashboard.status !== 'LOADED') {
      issues.push('- Dashboard did not load properly');
    }
    if (!results.dashboard.showsMetrics && !results.dashboard.summaryVisible) {
      issues.push('- Dashboard has no visible metrics or summary data');
    }
    if (results.threats.status !== 'LOADED') {
      issues.push('- Threats page did not load properly');
    }
    if (results.threats.articlesCount === 0) {
      issues.push('- Threats page has no visible articles');
    }
    if (consoleErrors.length > 0) {
      issues.push(`- ${consoleErrors.length} console errors detected`);
    }

    issues.forEach(issue => console.log(issue));
    console.log('');
  }

  console.log('Screenshots saved:');
  console.log('  - dashboard-screenshot.png');
  console.log('  - threats-screenshot.png');
  console.log('');
}

runTests().catch(console.error);

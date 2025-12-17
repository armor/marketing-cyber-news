import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface ConsoleLog {
  type: string;
  text: string;
  location: string;
  timestamp: Date;
}

interface TestResults {
  loginStatus: 'SUCCESS' | 'FAILED';
  loginErrors: string[];
  threatsPage: {
    status: 'LOADED' | 'FAILED';
    articlesVisible: number;
    consoleErrors: string[];
    consoleWarnings: string[];
  };
  dashboardPage: {
    status: 'LOADED' | 'FAILED' | 'NOT_FOUND';
    consoleErrors: string[];
    consoleWarnings: string[];
  };
  otherPagesTested: Array<{ page: string; status: string }>;
  allConsoleErrors: ConsoleLog[];
  allConsoleWarnings: ConsoleLog[];
  allConsoleLogs: ConsoleLog[];
  pageErrors: Array<{ message: string; stack?: string }>;
}

class ConsoleCollector {
  private logs: ConsoleLog[] = [];
  private errors: ConsoleLog[] = [];
  private warnings: ConsoleLog[] = [];
  private pageErrors: Array<{ message: string; stack?: string }> = [];

  setupListeners(page: Page) {
    // Collect console messages
    page.on('console', (msg: ConsoleMessage) => {
      const logEntry: ConsoleLog = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location().url || 'unknown',
        timestamp: new Date()
      };

      this.logs.push(logEntry);

      if (msg.type() === 'error') {
        this.errors.push(logEntry);
      } else if (msg.type() === 'warning') {
        this.warnings.push(logEntry);
      }
    });

    // Collect uncaught page errors
    page.on('pageerror', (error) => {
      this.pageErrors.push({
        message: error.message,
        stack: error.stack
      });

      // Also add to console errors
      this.errors.push({
        type: 'pageerror',
        text: error.message,
        location: 'uncaught exception',
        timestamp: new Date()
      });
    });

    // Collect failed requests
    page.on('requestfailed', (request) => {
      const failure = request.failure();
      this.errors.push({
        type: 'requestfailed',
        text: `Failed request: ${request.url()} - ${failure?.errorText || 'unknown error'}`,
        location: request.url(),
        timestamp: new Date()
      });
    });
  }

  getLogs() {
    return this.logs;
  }

  getErrors() {
    return this.errors;
  }

  getWarnings() {
    return this.warnings;
  }

  getPageErrors() {
    return this.pageErrors;
  }

  reset() {
    this.logs = [];
    this.errors = [];
    this.warnings = [];
    this.pageErrors = [];
  }
}

test.describe('Frontend Integration Tests', () => {
  let consoleCollector: ConsoleCollector;
  let testResults: TestResults;

  test.beforeEach(async ({ page }) => {
    consoleCollector = new ConsoleCollector();
    consoleCollector.setupListeners(page);

    testResults = {
      loginStatus: 'FAILED',
      loginErrors: [],
      threatsPage: {
        status: 'FAILED',
        articlesVisible: 0,
        consoleErrors: [],
        consoleWarnings: []
      },
      dashboardPage: {
        status: 'NOT_FOUND',
        consoleErrors: [],
        consoleWarnings: []
      },
      otherPagesTested: [],
      allConsoleErrors: [],
      allConsoleWarnings: [],
      allConsoleLogs: [],
      pageErrors: []
    };
  });

  test('Complete user flow with console monitoring', async ({ page }) => {
    const baseUrl = 'http://localhost:5173';
    const credentials = {
      email: 'testuser@example.com',
      password: 'TestPass123!'
    };

    // ========================================
    // STEP 1: Navigate to Login Page
    // ========================================
    console.log('\n🔹 STEP 1: Navigating to login page...');
    try {
      await page.goto(`${baseUrl}/login`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      console.log('✅ Login page loaded');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to load login page:', errorMsg);
      testResults.loginErrors.push(`Navigation failed: ${errorMsg}`);
      await generateReport(testResults);
      throw error;
    }

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Allow time for any dynamic content

    // ========================================
    // STEP 2: Perform Login
    // ========================================
    console.log('\n🔹 STEP 2: Attempting login...');
    try {
      // Find and fill email input
      const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill(credentials.email);
      console.log('✓ Email filled');

      // Find and fill password input
      const passwordInput = page.locator('input[type="password"], input[name="password"], input[id*="password"]').first();
      await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
      await passwordInput.fill(credentials.password);
      console.log('✓ Password filled');

      // Find and click submit button
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In")').first();
      await submitButton.waitFor({ state: 'visible', timeout: 10000 });

      // Click and wait for navigation
      await Promise.all([
        page.waitForURL(/\/(threats|dashboard|home)/, { timeout: 15000 }),
        submitButton.click()
      ]);

      console.log('✅ Login successful - redirected to:', page.url());
      testResults.loginStatus = 'SUCCESS';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Login failed:', errorMsg);
      testResults.loginErrors.push(`Login failed: ${errorMsg}`);

      // Capture screenshot on login failure
      await page.screenshot({
        path: '/Users/phillipboles/Development/n8n-cyber-news/tests/screenshots/login-failed.png',
        fullPage: true
      });

      testResults.loginErrors.push(...consoleCollector.getErrors().map(e => e.text));
      await generateReport(testResults);
      throw error;
    }

    // Wait after login
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ========================================
    // STEP 3: Navigate to Threats Page
    // ========================================
    console.log('\n🔹 STEP 3: Navigating to threats page...');
    const threatsPageErrorsBefore = consoleCollector.getErrors().length;
    const threatsPageWarningsBefore = consoleCollector.getWarnings().length;

    try {
      await page.goto(`${baseUrl}/threats`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for content to load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000); // Allow time for API calls

      console.log('✅ Threats page loaded');
      testResults.threatsPage.status = 'LOADED';

      // Count articles
      const articleSelectors = [
        '[data-testid="threat-card"]',
        '[data-testid="article-card"]',
        'article',
        '.threat-card',
        '.article-card',
        '[role="article"]'
      ];

      let articleCount = 0;
      for (const selector of articleSelectors) {
        const count = await page.locator(selector).count();
        if (count > articleCount) {
          articleCount = count;
        }
      }

      testResults.threatsPage.articlesVisible = articleCount;
      console.log(`📊 Articles visible: ${articleCount}`);

      // Capture screenshot
      await page.screenshot({
        path: '/Users/phillipboles/Development/n8n-cyber-news/tests/screenshots/threats-page.png',
        fullPage: true
      });

      // Collect errors/warnings from this page
      const errorsAfter = consoleCollector.getErrors().slice(threatsPageErrorsBefore);
      const warningsAfter = consoleCollector.getWarnings().slice(threatsPageWarningsBefore);

      testResults.threatsPage.consoleErrors = errorsAfter.map(e => e.text);
      testResults.threatsPage.consoleWarnings = warningsAfter.map(w => w.text);

      if (errorsAfter.length > 0) {
        console.log(`⚠️  Found ${errorsAfter.length} console errors on threats page`);
      }
      if (warningsAfter.length > 0) {
        console.log(`⚠️  Found ${warningsAfter.length} console warnings on threats page`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Threats page failed:', errorMsg);
      testResults.threatsPage.status = 'FAILED';
      testResults.threatsPage.consoleErrors.push(errorMsg);
    }

    // ========================================
    // STEP 4: Navigate to Dashboard Page
    // ========================================
    console.log('\n🔹 STEP 4: Navigating to dashboard page...');
    const dashboardErrorsBefore = consoleCollector.getErrors().length;
    const dashboardWarningsBefore = consoleCollector.getWarnings().length;

    try {
      await page.goto(`${baseUrl}/dashboard`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check if we got a 404 or error page
      const bodyText = await page.textContent('body');
      if (bodyText?.includes('404') || bodyText?.includes('Not Found')) {
        testResults.dashboardPage.status = 'NOT_FOUND';
        console.log('⚠️  Dashboard page not found (404)');
      } else {
        testResults.dashboardPage.status = 'LOADED';
        console.log('✅ Dashboard page loaded');

        await page.screenshot({
          path: '/Users/phillipboles/Development/n8n-cyber-news/tests/screenshots/dashboard-page.png',
          fullPage: true
        });
      }

      // Collect errors/warnings
      const errorsAfter = consoleCollector.getErrors().slice(dashboardErrorsBefore);
      const warningsAfter = consoleCollector.getWarnings().slice(dashboardWarningsBefore);

      testResults.dashboardPage.consoleErrors = errorsAfter.map(e => e.text);
      testResults.dashboardPage.consoleWarnings = warningsAfter.map(w => w.text);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Dashboard page failed:', errorMsg);
      testResults.dashboardPage.status = 'FAILED';
      testResults.dashboardPage.consoleErrors.push(errorMsg);
    }

    // ========================================
    // STEP 5: Test Other Pages
    // ========================================
    console.log('\n🔹 STEP 5: Testing other pages...');
    const otherPages = ['/admin', '/bookmarks', '/'];

    for (const pagePath of otherPages) {
      try {
        await page.goto(`${baseUrl}${pagePath}`, {
          waitUntil: 'networkidle',
          timeout: 15000
        });

        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        const bodyText = await page.textContent('body');
        let status = 'LOADED';

        if (bodyText?.includes('404') || bodyText?.includes('Not Found')) {
          status = 'NOT_FOUND';
        }

        testResults.otherPagesTested.push({ page: pagePath, status });
        console.log(`  ${status === 'LOADED' ? '✅' : '⚠️ '} ${pagePath}: ${status}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        testResults.otherPagesTested.push({
          page: pagePath,
          status: `FAILED: ${errorMsg}`
        });
        console.log(`  ❌ ${pagePath}: FAILED`);
      }
    }

    // ========================================
    // STEP 6: Compile Results
    // ========================================
    testResults.allConsoleErrors = consoleCollector.getErrors();
    testResults.allConsoleWarnings = consoleCollector.getWarnings();
    testResults.allConsoleLogs = consoleCollector.getLogs();
    testResults.pageErrors = consoleCollector.getPageErrors();

    // Generate and display report
    await generateReport(testResults);

    // Assert critical paths
    expect(testResults.loginStatus).toBe('SUCCESS');
    expect(testResults.threatsPage.status).toBe('LOADED');
    expect(testResults.threatsPage.articlesVisible).toBeGreaterThan(0);
  });
});

async function generateReport(results: TestResults): Promise<void> {
  const report = `
╔════════════════════════════════════════════════════════════════════════════╗
║                    FRONTEND INTEGRATION TEST REPORT                        ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─ LOGIN STATUS ─────────────────────────────────────────────────────────────┐
│ Status: ${results.loginStatus}
│ Errors: ${results.loginErrors.length > 0 ? '\n│   - ' + results.loginErrors.join('\n│   - ') : 'None'}
└────────────────────────────────────────────────────────────────────────────┘

┌─ THREATS PAGE ─────────────────────────────────────────────────────────────┐
│ Status: ${results.threatsPage.status}
│ Articles Visible: ${results.threatsPage.articlesVisible}
│ Console Errors: ${results.threatsPage.consoleErrors.length}
${results.threatsPage.consoleErrors.length > 0 ? '│   - ' + results.threatsPage.consoleErrors.slice(0, 5).join('\n│   - ') : ''}
${results.threatsPage.consoleErrors.length > 5 ? `│   ... and ${results.threatsPage.consoleErrors.length - 5} more` : ''}
│ Console Warnings: ${results.threatsPage.consoleWarnings.length}
${results.threatsPage.consoleWarnings.length > 0 ? '│   - ' + results.threatsPage.consoleWarnings.slice(0, 3).join('\n│   - ') : ''}
${results.threatsPage.consoleWarnings.length > 3 ? `│   ... and ${results.threatsPage.consoleWarnings.length - 3} more` : ''}
└────────────────────────────────────────────────────────────────────────────┘

┌─ DASHBOARD PAGE ───────────────────────────────────────────────────────────┐
│ Status: ${results.dashboardPage.status}
│ Console Errors: ${results.dashboardPage.consoleErrors.length}
${results.dashboardPage.consoleErrors.length > 0 ? '│   - ' + results.dashboardPage.consoleErrors.slice(0, 3).join('\n│   - ') : ''}
│ Console Warnings: ${results.dashboardPage.consoleWarnings.length}
└────────────────────────────────────────────────────────────────────────────┘

┌─ OTHER PAGES TESTED ───────────────────────────────────────────────────────┐
${results.otherPagesTested.map(p => `│ ${p.page}: ${p.status}`).join('\n')}
└────────────────────────────────────────────────────────────────────────────┘

┌─ ALL CONSOLE ERRORS (${results.allConsoleErrors.length}) ───────────────────────────────────────┐
${results.allConsoleErrors.length > 0
  ? results.allConsoleErrors.slice(0, 10).map((e, i) =>
      `│ ${i + 1}. [${e.type}] ${e.text.slice(0, 70)}${e.text.length > 70 ? '...' : ''}\n│    Location: ${e.location}`
    ).join('\n')
  : '│ None'}
${results.allConsoleErrors.length > 10 ? `│ ... and ${results.allConsoleErrors.length - 10} more errors` : ''}
└────────────────────────────────────────────────────────────────────────────┘

┌─ ALL CONSOLE WARNINGS (${results.allConsoleWarnings.length}) ─────────────────────────────────────┐
${results.allConsoleWarnings.length > 0
  ? results.allConsoleWarnings.slice(0, 5).map((w, i) =>
      `│ ${i + 1}. [${w.type}] ${w.text.slice(0, 70)}${w.text.length > 70 ? '...' : ''}`
    ).join('\n')
  : '│ None'}
${results.allConsoleWarnings.length > 5 ? `│ ... and ${results.allConsoleWarnings.length - 5} more warnings` : ''}
└────────────────────────────────────────────────────────────────────────────┘

┌─ RECOMMENDATIONS ──────────────────────────────────────────────────────────┐
${generateRecommendations(results).map(r => `│ ${r}`).join('\n')}
└────────────────────────────────────────────────────────────────────────────┘

╔════════════════════════════════════════════════════════════════════════════╗
║ Report generated: ${new Date().toISOString()}
╚════════════════════════════════════════════════════════════════════════════╝
`;

  console.log(report);

  // Also write to file
  const reportPath = '/Users/phillipboles/Development/n8n-cyber-news/aci-frontend/tests/reports/frontend-test-report.txt';
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, report);

  // Write detailed JSON report
  const jsonReportPath = '/Users/phillipboles/Development/n8n-cyber-news/tests/reports/frontend-test-report.json';
  fs.writeFileSync(jsonReportPath, JSON.stringify(results, null, 2));

  console.log(`\n📄 Reports saved to:\n  - ${reportPath}\n  - ${jsonReportPath}\n`);
}

function generateRecommendations(results: TestResults): string[] {
  const recommendations: string[] = [];

  if (results.loginStatus === 'FAILED') {
    recommendations.push('🔴 CRITICAL: Fix login functionality - application is not accessible');
  }

  if (results.threatsPage.status === 'FAILED') {
    recommendations.push('🔴 CRITICAL: Fix threats page - main content page is not loading');
  }

  if (results.threatsPage.articlesVisible === 0 && results.threatsPage.status === 'LOADED') {
    recommendations.push('🟡 WARNING: Threats page loaded but no articles visible - check API integration');
  }

  if (results.threatsPage.articlesVisible > 0 && results.threatsPage.articlesVisible < 10) {
    recommendations.push(`🟡 INFO: Only ${results.threatsPage.articlesVisible} articles visible - expected ~25 from backend`);
  }

  if (results.allConsoleErrors.length > 0) {
    recommendations.push(`🟡 WARNING: ${results.allConsoleErrors.length} console errors detected - review and fix`);
  }

  if (results.pageErrors.length > 0) {
    recommendations.push(`🔴 CRITICAL: ${results.pageErrors.length} uncaught exceptions detected - fix immediately`);
  }

  const criticalErrors = results.allConsoleErrors.filter(e =>
    e.text.includes('Failed to fetch') ||
    e.text.includes('Network') ||
    e.text.includes('CORS') ||
    e.text.includes('401') ||
    e.text.includes('403')
  );

  if (criticalErrors.length > 0) {
    recommendations.push('🔴 CRITICAL: API connectivity issues detected - check backend connection');
  }

  if (results.dashboardPage.status === 'NOT_FOUND') {
    recommendations.push('🟢 INFO: Dashboard page returns 404 - implement if needed');
  }

  if (recommendations.length === 0) {
    recommendations.push('🟢 SUCCESS: All critical tests passed - application is functioning correctly');
  }

  return recommendations;
}

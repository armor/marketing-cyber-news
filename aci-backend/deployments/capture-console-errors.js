const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  const errors = [];
  const warnings = [];
  const logs = [];

  // Listen to all console events
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const location = msg.location();

    const entry = {
      type,
      text,
      location: `${location.url}:${location.lineNumber}:${location.columnNumber}`
    };

    consoleMessages.push(entry);

    if (type === 'error') {
      errors.push(entry);
    } else if (type === 'warning') {
      warnings.push(entry);
    } else {
      logs.push(entry);
    }
  });

  // Listen to page errors
  page.on('pageerror', error => {
    errors.push({
      type: 'pageerror',
      text: error.toString(),
      stack: error.stack
    });
  });

  // Listen to request failures
  page.on('requestfailed', request => {
    errors.push({
      type: 'requestfailed',
      text: `Failed to load: ${request.url()}`,
      failure: request.failure()
    });
  });

  try {
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Page loaded. Waiting 5 seconds for any delayed errors...');
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({
      path: '/Users/phillipboles/Development/n8n-cyber-news/aci-backend/deployments/page-state.png',
      fullPage: true
    });

    console.log('\n=== CONSOLE CAPTURE COMPLETE ===\n');

    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    console.log(`Other logs: ${logs.length}`);

    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach((error, idx) => {
        console.log(`\n[ERROR ${idx + 1}]`);
        console.log(`Type: ${error.type}`);
        console.log(`Message: ${error.text}`);
        if (error.location) console.log(`Location: ${error.location}`);
        if (error.stack) console.log(`Stack: ${error.stack}`);
        if (error.failure) console.log(`Failure: ${JSON.stringify(error.failure, null, 2)}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n=== WARNINGS ===');
      warnings.forEach((warning, idx) => {
        console.log(`\n[WARNING ${idx + 1}]`);
        console.log(`Message: ${warning.text}`);
        if (warning.location) console.log(`Location: ${warning.location}`);
      });
    }

    if (logs.length > 0 && logs.length <= 20) {
      console.log('\n=== OTHER CONSOLE LOGS ===');
      logs.forEach((log, idx) => {
        console.log(`\n[LOG ${idx + 1}] (${log.type})`);
        console.log(`Message: ${log.text}`);
      });
    }

    console.log('\nScreenshot saved to: page-state.png');

  } catch (error) {
    console.error('Error during navigation:', error);
  } finally {
    await browser.close();
  }
})();

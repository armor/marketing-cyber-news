import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:5174...');
    await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForTimeout(2000);

    // Take full page screenshot
    console.log('\n=== Taking screenshots ===');
    await page.screenshot({ path: 'page-full.png', fullPage: true });
    console.log('Saved: page-full.png');

    // Get page HTML
    console.log('\n=== Page HTML (first 2000 chars) ===');
    const html = await page.content();
    console.log(html.substring(0, 2000));

    // Check for any element with nav, header, or banner role
    console.log('\n=== Looking for header elements ===');
    const headerElements = await page.evaluate(() => {
      const results = [];

      // Check for header tag
      const headers = document.querySelectorAll('header');
      results.push({ type: 'header tag', count: headers.length });

      // Check for nav tag
      const navs = document.querySelectorAll('nav');
      results.push({ type: 'nav tag', count: navs.length });

      // Check for elements with specific classes
      const headerClasses = document.querySelectorAll('[class*="header"]');
      results.push({ type: 'header class', count: headerClasses.length });

      const navClasses = document.querySelectorAll('[class*="nav"]');
      results.push({ type: 'nav class', count: navClasses.length });

      // Get all top-level children of body
      const bodyChildren = Array.from(document.body.children).map(el => ({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        firstChild: el.firstElementChild?.tagName
      }));
      results.push({ type: 'body children', data: bodyChildren });

      return results;
    });
    console.log(JSON.stringify(headerElements, null, 2));

    // Check for React root
    console.log('\n=== React Root ===');
    const reactRoot = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return 'No root found';

      return {
        innerHTML: root.innerHTML.substring(0, 1000),
        childCount: root.children.length,
        firstChildTag: root.firstElementChild?.tagName,
        firstChildClass: root.firstElementChild?.className
      };
    });
    console.log(JSON.stringify(reactRoot, null, 2));

    // Try to find elements by Tailwind classes commonly used in headers
    console.log('\n=== Searching for common header patterns ===');
    const commonPatterns = await page.evaluate(() => {
      const patterns = [];

      // Look for flex justify-between (common header pattern)
      const flexBetween = document.querySelectorAll('.justify-between');
      patterns.push({ pattern: 'justify-between', count: flexBetween.length });

      // Look for sticky or fixed positioning
      const sticky = document.querySelectorAll('.sticky, .fixed');
      patterns.push({ pattern: 'sticky/fixed', count: sticky.length });

      // Look for border-b (common header bottom border)
      const borderB = document.querySelectorAll('.border-b');
      patterns.push({ pattern: 'border-b', count: borderB.length });

      return patterns;
    });
    console.log(JSON.stringify(commonPatterns, null, 2));

    console.log('\n=== Waiting 5 seconds for visual inspection ===');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error during inspection:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.log('Error screenshot saved');
  } finally {
    await browser.close();
  }
})();

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:5174...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });

    // Wait for header to be visible
    await page.waitForSelector('header', { timeout: 10000 });

    // Take full page screenshot
    console.log('\n=== Taking screenshots ===');
    await page.screenshot({ path: 'header-full.png', fullPage: false });
    console.log('Saved: header-full.png');

    // Take header-specific screenshot
    const headerElement = await page.locator('header').first();
    await headerElement.screenshot({ path: 'header-only.png' });
    console.log('Saved: header-only.png');

    // Inspect header structure and styles
    console.log('\n=== Header Structure ===');
    const headerHTML = await page.evaluate(() => {
      const header = document.querySelector('header');
      return header ? header.outerHTML : 'Header not found';
    });
    console.log(headerHTML);

    // Get computed styles for header
    console.log('\n=== Header Computed Styles ===');
    const headerStyles = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return 'Header not found';

      const computed = window.getComputedStyle(header);
      return {
        display: computed.display,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        width: computed.width,
        padding: computed.padding,
        gap: computed.gap,
        className: header.className
      };
    });
    console.log(JSON.stringify(headerStyles, null, 2));

    // Get computed styles for the flex container inside header
    console.log('\n=== Inner Container Computed Styles ===');
    const containerStyles = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return 'Header not found';

      // Look for the first div inside header
      const container = header.querySelector('div');
      if (!container) return 'Container not found';

      const computed = window.getComputedStyle(container);
      return {
        display: computed.display,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        width: computed.width,
        maxWidth: computed.maxWidth,
        margin: computed.margin,
        padding: computed.padding,
        gap: computed.gap,
        className: container.className
      };
    });
    console.log(JSON.stringify(containerStyles, null, 2));

    // Get left section styles (logo area)
    console.log('\n=== Left Section Styles ===');
    const leftStyles = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return 'Header not found';

      // Find the left section (usually first div with logo)
      const leftSection = header.querySelector('div > div:first-child');
      if (!leftSection) return 'Left section not found';

      const computed = window.getComputedStyle(leftSection);
      return {
        display: computed.display,
        flexDirection: computed.flexDirection,
        alignItems: computed.alignItems,
        gap: computed.gap,
        width: computed.width,
        flexGrow: computed.flexGrow,
        flexShrink: computed.flexShrink,
        className: leftSection.className,
        innerHTML: leftSection.innerHTML.substring(0, 200)
      };
    });
    console.log(JSON.stringify(leftStyles, null, 2));

    // Get right section styles (alert bell + profile)
    console.log('\n=== Right Section Styles ===');
    const rightStyles = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return 'Header not found';

      // Find the right section (usually last div with icons)
      const rightSection = header.querySelector('div > div:last-child');
      if (!rightSection) return 'Right section not found';

      const computed = window.getComputedStyle(rightSection);
      return {
        display: computed.display,
        flexDirection: computed.flexDirection,
        alignItems: computed.alignItems,
        gap: computed.gap,
        width: computed.width,
        flexGrow: computed.flexGrow,
        flexShrink: computed.flexShrink,
        marginLeft: computed.marginLeft,
        className: rightSection.className,
        innerHTML: rightSection.innerHTML.substring(0, 200)
      };
    });
    console.log(JSON.stringify(rightStyles, null, 2));

    // Check for any overriding styles
    console.log('\n=== All Applied CSS Rules ===');
    const allRules = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return 'Header not found';

      const container = header.querySelector('div');
      if (!container) return 'Container not found';

      // Get all stylesheets
      const rules = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules || []) {
            if (rule.selectorText && rule.selectorText.includes('header')) {
              rules.push({
                selector: rule.selectorText,
                styles: rule.cssText
              });
            }
          }
        } catch (e) {
          // CORS or other errors
        }
      }
      return rules;
    });
    console.log(JSON.stringify(allRules, null, 2));

    // Get element positions
    console.log('\n=== Element Positions ===');
    const positions = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return 'Header not found';

      const container = header.querySelector('div');
      const leftSection = container?.querySelector('div:first-child');
      const rightSection = container?.querySelector('div:last-child');

      return {
        header: header.getBoundingClientRect(),
        container: container?.getBoundingClientRect(),
        leftSection: leftSection?.getBoundingClientRect(),
        rightSection: rightSection?.getBoundingClientRect()
      };
    });
    console.log(JSON.stringify(positions, null, 2));

    console.log('\n=== Inspection Complete ===');
    console.log('Check header-full.png and header-only.png for visual reference');

    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('Error during inspection:', error);
  } finally {
    await browser.close();
  }
})();

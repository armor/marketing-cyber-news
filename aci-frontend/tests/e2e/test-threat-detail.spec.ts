import { test, expect } from '@playwright/test';

test('test specific threat detail page', async ({ page }) => {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  // Login first
  await page.goto('http://localhost:5590/login');
  await page.locator('input[type="email"]').fill('test@example.com');
  await page.locator('input[type="password"]').fill('TestPass123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  
  // Navigate to the specific threat detail page
  console.log('Navigating to threat detail page...');
  await page.goto('http://localhost:5590/threats/e095cfc8-a5f5-45d3-b7fc-334a2bc79f24');
  await page.waitForTimeout(5000);
  
  console.log('Current URL:', page.url());
  
  // Get page content
  const html = await page.locator('#root').innerHTML().catch(() => 'FAILED');
  console.log('=== Page Content (first 1500 chars) ===');
  console.log(html.substring(0, 1500));
  
  // Check for errors
  console.log('\n=== Console Errors ===');
  errors.forEach(e => console.log(e));
  
  // Take screenshot
  await page.screenshot({ path: 'threat-detail.png', fullPage: true });
  
  // Verify we're not on login page
  expect(page.url()).not.toContain('/login');
});

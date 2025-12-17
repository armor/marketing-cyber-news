import { test } from '@playwright/test';

test('capture threat detail with enrichment', async ({ page }) => {
  // Login and set token
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'TestPass123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  // Navigate directly to a threat detail page
  // Using the article ID we know exists
  await page.goto('http://localhost:5173/threats/82b3868a-4496-4d7e-9a45-5710c019c403');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'tests/screenshots/05-threat-detail-enrichment.png', fullPage: true });
  console.log('Enrichment detail screenshot saved');
});

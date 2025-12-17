import { test } from '@playwright/test';

test('capture enrichment screenshot', async ({ page }) => {
  // Navigate to login
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1000);
  
  // Fill login
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'TestPass123');
  await page.screenshot({ path: 'tests/screenshots/01-login-form.png' });
  
  // Submit
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/screenshots/02-after-login.png' });
  
  // Go to threats
  await page.goto('http://localhost:5173/threats');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/03-threats-page.png' });
  
  // Click first threat
  const threatRow = await page.$('tr, [class*="card"], a[href*="threat"]');
  if (threatRow) {
    await threatRow.click();
    await page.waitForTimeout(2000);
  }
  
  await page.screenshot({ path: 'tests/screenshots/04-enrichment-detail.png', fullPage: true });
  console.log('Screenshots saved to tests/screenshots/');
});

import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage();

page.on('console', msg => {
  if (msg.type() === 'error') console.log('ERROR:', msg.text());
});

await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');

// Fill and submit
await page.fill('input[type="email"]', 'admin@test.com');
await page.fill('input[type="password"]', 'TestPass123');
await page.click('button[type="submit"]');

// Wait for redirect
await page.waitForURL('**/*', { timeout: 10000 });
await page.waitForTimeout(2000);

console.log('✓ Logged in! Current URL:', page.url());
console.log('Browser staying open for 2 minutes...');

await page.waitForTimeout(120000);
await browser.close();

import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');

// Fill login form
await page.fill('input[type="email"], input[name="email"]', 'admin@test.com');
await page.fill('input[type="password"], input[name="password"]', 'TestPass123');

// Click login button
await page.click('button[type="submit"]');

// Wait for navigation
await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});

console.log('Current URL:', page.url());
console.log('Browser will stay open for 120 seconds...');

// Keep browser open
await page.waitForTimeout(120000);
await browser.close();

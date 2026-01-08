import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage();

// Log ALL requests
page.on('request', r => {
  if (r.url().includes('api') || r.url().includes('auth')) {
    console.log('REQUEST:', r.method(), r.url());
  }
});
page.on('response', r => {
  if (r.url().includes('api') || r.url().includes('auth')) {
    console.log('RESPONSE:', r.status(), r.url());
  }
});
page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));

await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');

console.log('--- Filling form ---');
await page.fill('input[type="email"]', 'admin@test.com');
await page.fill('input[type="password"]', 'TestPass123');

console.log('--- Clicking submit ---');
await page.click('button[type="submit"]');

await page.waitForTimeout(5000);
console.log('FINAL URL:', page.url());
await page.screenshot({ path: '/tmp/debug-v2.png' });

await page.waitForTimeout(60000);
await browser.close();

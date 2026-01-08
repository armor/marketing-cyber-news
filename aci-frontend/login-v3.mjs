import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const page = await browser.newPage();

page.on('response', r => {
  if (r.url().includes('/auth/login')) {
    console.log('LOGIN:', r.status());
  }
});

await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');

await page.fill('input[type="email"]', 'admin@test.com');
await page.fill('input[type="password"]', 'TestPass123');
await page.click('button[type="submit"]');

await page.waitForTimeout(5000);
console.log('URL:', page.url());
await page.screenshot({ path: '/tmp/v3-result.png' });

await page.waitForTimeout(120000);
await browser.close();

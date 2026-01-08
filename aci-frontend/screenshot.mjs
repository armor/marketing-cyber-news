import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');
await page.fill('input[type="email"]', 'admin@test.com');
await page.fill('input[type="password"]', 'TestPass123');

// Wait for login response
const [response] = await Promise.all([
  page.waitForResponse(r => r.url().includes('/auth/login')),
  page.click('button[type="submit"]')
]);

console.log('Login API status:', response.status());
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/after-login.png', fullPage: true });
console.log('Screenshot saved to /tmp/after-login.png');
console.log('Final URL:', page.url());

await browser.close();

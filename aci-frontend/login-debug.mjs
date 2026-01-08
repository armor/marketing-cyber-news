import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 500 });
const page = await browser.newPage();

// Capture console and network
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
page.on('response', response => {
  if (response.url().includes('/auth/login')) {
    console.log('LOGIN RESPONSE:', response.status());
  }
});

await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');

// Screenshot before
await page.screenshot({ path: '/tmp/login-before.png' });

// Try to find email input
const emailInput = await page.locator('input[type="email"]').or(page.locator('input[name="email"]')).or(page.locator('#email'));
console.log('Email input found:', await emailInput.count());

if (await emailInput.count() > 0) {
  await emailInput.fill('admin@test.com');
  await page.locator('input[type="password"]').fill('TestPass123');
  
  // Screenshot after fill
  await page.screenshot({ path: '/tmp/login-filled.png' });
  
  // Find and click submit
  const submitBtn = page.locator('button[type="submit"]');
  console.log('Submit button found:', await submitBtn.count());
  await submitBtn.click();
  
  // Wait for response
  await page.waitForTimeout(3000);
  
  // Screenshot after click
  await page.screenshot({ path: '/tmp/login-after.png' });
}

console.log('Final URL:', page.url());
console.log('Browser staying open 90 seconds...');
await page.waitForTimeout(90000);
await browser.close();

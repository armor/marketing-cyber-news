import { test, expect } from '@playwright/test';

test('@smoke verify login with TestPass123', async ({ page }) => {
  console.log('Step 1: Navigate to login');
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  
  console.log('Step 2: Fill credentials');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'TestPass123');
  
  console.log('Step 3: Submit login');
  await page.click('button[type="submit"]');
  
  console.log('Step 4: Wait for redirect');
  await page.waitForTimeout(5000);
  
  const currentUrl = page.url();
  console.log('Current URL after login:', currentUrl);
  
  // Check localStorage for token
  const token = await page.evaluate(() => localStorage.getItem('aci_access_token'));
  console.log('Token stored:', token ? 'YES (length: ' + token.length + ')' : 'NO');
  
  await page.screenshot({ path: 'tests/artifacts/login-verified.png', fullPage: true });
  
  // VERIFICATION
  if (token) {
    console.log('✅ LOGIN SUCCESSFUL - Token stored');
  } else {
    console.log('❌ LOGIN FAILED - No token');
  }
  
  expect(token).toBeTruthy();
});

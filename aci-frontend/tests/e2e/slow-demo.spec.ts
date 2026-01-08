import { test, expect } from '@playwright/test';

test('Newsletter Flow Demo - Slow', async ({ page }) => {
  // Login
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  await page.locator('input[type="email"], input[placeholder*="email"]').first().fill('admin@test.com');
  await page.waitForTimeout(1000);
  await page.locator('input[type="password"]').fill('TestPass123');
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("Sign In")').click();

  // Wait for dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(3000);
  console.log('1. Dashboard loaded');

  // Navigate to Newsletter Config
  await page.click('text=Newsletter');
  await page.waitForTimeout(3000);
  console.log('2. Newsletter Config page');

  // Navigate to Preview
  await page.click('text=Preview');
  await page.waitForTimeout(3000);
  console.log('3. Preview List page');

  // Click Preview button on first issue
  const previewButton = page.locator('button:has-text("Preview")').first();
  if (await previewButton.isVisible()) {
    await previewButton.click();
    await page.waitForTimeout(3000);
    console.log('4. Preview Detail page');

    // Click Back
    const backButton = page.locator('button:has-text("Back")');
    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForTimeout(3000);
      console.log('5. Back to Preview List');
    }
  }

  // Navigate to Approval
  await page.locator('nav a:has-text("Approval"), aside a:has-text("Approval"), [data-sidebar] a:has-text("Approval")').first().click();
  await page.waitForTimeout(3000);
  console.log('6. Approval page');

  // Navigate to Analytics
  await page.locator('nav a:has-text("Analytics"), aside a:has-text("Analytics"), [data-sidebar] a:has-text("Analytics")').last().click();
  await page.waitForTimeout(3000);
  console.log('7. Analytics page - DONE!');
});

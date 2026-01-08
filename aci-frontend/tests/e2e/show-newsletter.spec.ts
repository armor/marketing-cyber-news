import { test, expect } from '@playwright/test';

test('show newsletter working - full end to end', async ({ page }) => {
  // Login first
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"], input[placeholder*="email"]').first().fill('admin@test.com');
  await page.locator('input[type="password"]').fill('TestPass123');
  await page.locator('button:has-text("Sign In")').click();

  // Wait for login to complete
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Navigate to Newsletter Config via sidebar
  await page.click('text=Newsletter');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/newsletter-config.png', fullPage: true });
  console.log('Screenshot saved: /tmp/newsletter-config.png');

  // Navigate to Preview page from sidebar (shows list of issues)
  await page.click('text=Preview');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/newsletter-preview-list.png', fullPage: true });
  console.log('Screenshot saved: /tmp/newsletter-preview-list.png');

  // Click on the first Preview button to view actual newsletter
  const previewButton = page.locator('button:has-text("Preview")').first();
  if (await previewButton.isVisible()) {
    console.log('Clicking Preview button on first issue...');
    await previewButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/newsletter-preview-detail.png', fullPage: true });
    console.log('Screenshot saved: /tmp/newsletter-preview-detail.png');

    // Go back to list
    const backButton = page.locator('button:has-text("Back")');
    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForTimeout(1000);
    }
  } else {
    console.log('No Preview button found - no issues exist');
  }

  // Navigate to Newsletter Approval page via sidebar (use more specific selector)
  // The sidebar has "Approval" link under Newsletter section
  await page.locator('nav a:has-text("Approval"), aside a:has-text("Approval"), [data-sidebar] a:has-text("Approval")').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/newsletter-approval.png', fullPage: true });
  console.log('Screenshot saved: /tmp/newsletter-approval.png');

  // Navigate to Newsletter Analytics page via sidebar
  await page.locator('nav a:has-text("Analytics"), aside a:has-text("Analytics"), [data-sidebar] a:has-text("Analytics")').last().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/newsletter-analytics.png', fullPage: true });
  console.log('Screenshot saved: /tmp/newsletter-analytics.png');
});

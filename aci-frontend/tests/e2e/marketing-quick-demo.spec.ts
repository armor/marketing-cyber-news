import { test, expect } from '@playwright/test';

/**
 * Marketing Autopilot Quick Demo
 * Fast verification that marketing pages load correctly
 */

test.describe('Marketing Autopilot Quick Demo', () => {
  test('Full marketing pages tour', async ({ page }) => {
    // Login with real backend credentials
    await page.goto('/login');
    await page.getByLabel('Email').fill('marketing@test.com');
    await page.getByLabel('Password').fill('TestPass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/.*(?!login)/, { timeout: 15000 });

    const pages = [
      { path: '/campaigns', name: 'Campaigns' },
      { path: '/channels', name: 'Channels' },
      { path: '/calendar', name: 'Calendar' },
      { path: '/marketing/analytics', name: 'Analytics' },
    ];

    for (const p of pages) {
      console.log(`\n📍 Visiting ${p.name}...`);
      await page.goto(p.path);
      await page.waitForLoadState('domcontentloaded');

      // Check for errors
      const error503 = page.locator('text=/503|service unavailable/i');
      const error500 = page.locator('text=/500|internal server/i');

      const has503 = await error503.count() > 0;
      const has500 = await error500.count() > 0;

      if (has503) {
        console.log(`  ❌ ${p.name}: 503 Service Unavailable`);
      } else if (has500) {
        console.log(`  ❌ ${p.name}: 500 Internal Server Error`);
      } else {
        console.log(`  ✅ ${p.name}: Loaded successfully`);
      }

      // Take screenshot
      await page.screenshot({
        path: `tests/artifacts/demo-${p.name.toLowerCase()}.png`,
        fullPage: true
      });

      expect(has503).toBe(false);
    }

    console.log('\n🎉 Marketing Autopilot Demo Complete!');
  });
});

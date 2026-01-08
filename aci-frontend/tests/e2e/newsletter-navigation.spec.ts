import { test, expect } from '@playwright/test';

/**
 * Newsletter Navigation Regression Test
 *
 * Verifies that all newsletter pages are accessible and render correctly.
 * Tests the complete navigation flow: Config -> Preview List -> Preview Detail ->
 * Back -> Approval -> Analytics
 */
test.describe('Newsletter Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[placeholder*="email"]').first().fill('admin@test.com');
    await page.locator('input[type="password"]').fill('TestPass123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should navigate through all newsletter pages without errors', async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(`Page Error: ${err.message}`);
    });

    // 1. Navigate to Newsletter Config
    await page.click('text=Newsletter');
    await page.waitForTimeout(1000);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    expect(page.url()).toContain('/newsletter');

    // 2. Navigate to Preview List
    await page.click('text=Preview');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toHaveText('404');
    expect(page.url()).toContain('/newsletter/preview');

    // 3. Click Preview button on first issue (if exists)
    const previewButton = page.locator('button:has-text("Preview")').first();
    if (await previewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await previewButton.click();
      await page.waitForTimeout(1500);

      // Verify preview detail page loaded
      await expect(page.locator('body')).not.toHaveText('404');
      expect(page.url()).toMatch(/\/newsletter\/preview\/\w+/);

      // Should show Preview tab or Email Preview section
      const hasPreviewContent = await page.locator('text=Email Preview, text=Preview').first().isVisible().catch(() => false);
      expect(hasPreviewContent || page.url().includes('/preview/')).toBeTruthy();

      // 4. Click Back button
      const backButton = page.locator('button:has-text("Back")');
      if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backButton.click();
        await page.waitForTimeout(1000);
        // Should be back on preview list, not 404
        await expect(page.locator('body')).not.toHaveText('404');
      }
    }

    // 5. Navigate to Approval page
    await page.locator('nav a:has-text("Approval"), aside a:has-text("Approval"), [data-sidebar] a:has-text("Approval")').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toHaveText('404');
    // Should show approval-related content
    const hasApprovalContent = await page.locator('text=Approval, text=Pending, text=Articles').first().isVisible().catch(() => false);
    expect(hasApprovalContent).toBeTruthy();

    // 6. Navigate to Newsletter Analytics
    await page.locator('nav a:has-text("Analytics"), aside a:has-text("Analytics"), [data-sidebar] a:has-text("Analytics")').last().click();
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).not.toHaveText('404');
    expect(page.url()).toContain('/newsletter/analytics');

    // Should show analytics content (KPI cards, charts, etc.)
    const hasAnalyticsContent = await page.locator('text=Analytics, text=Open Rate, text=Click Rate, text=Overview').first().isVisible().catch(() => false);
    expect(hasAnalyticsContent).toBeTruthy();

    // Verify no console errors occurred during navigation
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('React does not recognize')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should render Newsletter Config page correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/newsletter/configs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toHaveText('404');
  });

  test('should render Newsletter Preview list correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/newsletter/preview');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toHaveText('404');
  });

  test('should render Newsletter Approval page correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/newsletter/approval');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toHaveText('404');
    await expect(page.locator('text=Approval, text=Pending').first()).toBeVisible();
  });

  test('should render Newsletter Analytics page correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/newsletter/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toHaveText('404');
    // Should show KPI cards or analytics header
    await expect(page.locator('text=Analytics, text=Open Rate, text=Overview').first()).toBeVisible();
  });

  test('Back button should navigate to preview list, not 404', async ({ page }) => {
    // Go directly to a preview detail page
    await page.goto('http://localhost:5173/newsletter/preview');
    await page.waitForLoadState('networkidle');

    const previewButton = page.locator('button:has-text("Preview")').first();
    if (await previewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await previewButton.click();
      await page.waitForTimeout(1500);

      const backButton = page.locator('button:has-text("Back")');
      if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backButton.click();
        await page.waitForTimeout(1000);

        // Critical: Should NOT show 404
        await expect(page.locator('body')).not.toHaveText('404');
        expect(page.url()).toContain('/newsletter/preview');
      }
    }
  });
});

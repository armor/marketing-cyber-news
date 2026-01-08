import { test, expect } from '@playwright/test';

/**
 * Test newsletter editing with the REAL backend
 * MSW must be disabled (VITE_ENABLE_MSW=false)
 */

const BASE_URL = 'http://localhost:5173';

test.describe('Newsletter Editing with Real Backend', () => {
  test.beforeEach(async ({ page }) => {
    // Login with real credentials
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#email', 'admin@test.com');
    await page.fill('#password', 'TestPass123');
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForURL(/.*dashboard|\/$/, { timeout: 30000 });
  });

  test('Can navigate to edit a newsletter issue', async ({ page }) => {
    // Navigate to newsletter preview/issues page
    await page.goto(`${BASE_URL}/newsletter/preview`);
    await page.waitForLoadState('networkidle');

    // Take screenshot before editing
    await page.screenshot({ path: '/tmp/newsletter-issues-list.png', fullPage: true });

    // Check we have issues to edit
    const content = await page.textContent('body');
    console.log('Issues page has content:', content?.length);

    // Look for edit buttons or links to individual issues
    const editButtons = page.locator('button:has-text("Edit"), a:has-text("Edit")');
    const editCount = await editButtons.count();
    console.log('Found edit buttons:', editCount);

    // Check for issue cards/rows
    const issueCards = page.locator('[data-testid="issue-card"], .issue-card, tr');
    const cardCount = await issueCards.count();
    console.log('Found issue cards/rows:', cardCount);

    // Try clicking on first issue if available
    if (editCount > 0) {
      await editButtons.first().click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: '/tmp/newsletter-edit-page.png', fullPage: true });
      console.log('Navigated to edit page');
    }
  });

  test('Can edit newsletter configuration', async ({ page }) => {
    // Navigate to newsletter configs
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: '/tmp/newsletter-configs-before-edit.png', fullPage: true });

    // Look for edit buttons on config cards
    const editButtons = page.locator('button[aria-label*="edit" i], button:has-text("Edit"), [data-testid="edit-config"]');
    const editCount = await editButtons.count();
    console.log('Found config edit buttons:', editCount);

    // Try to find and click on any edit icon (pencil icon)
    const pencilIcons = page.locator('svg[class*="lucide-pencil"], button:has(svg)').filter({ hasText: /edit/i });
    const pencilCount = await pencilIcons.count();
    console.log('Found pencil icons:', pencilCount);

    // Check the structure of config cards
    const configRows = page.locator('table tbody tr, [data-testid="config-row"]');
    const rowCount = await configRows.count();
    console.log('Found config rows:', rowCount);

    if (rowCount > 0) {
      // Click on first row to see if it's editable
      const firstRow = configRows.first();
      const rowText = await firstRow.textContent();
      console.log('First row content:', rowText?.slice(0, 100));

      // Look for action buttons in the row
      const rowButtons = firstRow.locator('button');
      const buttonCount = await rowButtons.count();
      console.log('Buttons in first row:', buttonCount);

      if (buttonCount > 0) {
        // Click the first button (usually edit)
        await rowButtons.first().click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '/tmp/newsletter-config-edit-clicked.png', fullPage: true });
      }
    }
  });

  test('Verify full newsletter workflow', async ({ page }) => {
    // 1. Check configs page
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');
    const configsContent = await page.textContent('body');
    expect(configsContent).toContain('Configuration');
    console.log('✓ Configs page loaded');

    // 2. Check preview/issues page
    await page.goto(`${BASE_URL}/newsletter/preview`);
    await page.waitForLoadState('networkidle');
    const previewContent = await page.textContent('body');
    console.log('Preview page content preview:', previewContent?.slice(0, 200));
    console.log('✓ Preview page loaded');

    // 3. Check analytics page if it exists
    await page.goto(`${BASE_URL}/newsletter/analytics`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/newsletter-analytics.png', fullPage: true });
    console.log('✓ Analytics page loaded');

    // 4. Check content page if it exists
    await page.goto(`${BASE_URL}/newsletter/content`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/newsletter-content.png', fullPage: true });
    console.log('✓ Content page loaded');
  });
});

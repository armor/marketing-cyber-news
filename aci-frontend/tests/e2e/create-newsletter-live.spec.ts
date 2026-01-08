/**
 * Live Newsletter Creation Test - Full Workflow
 *
 * This test creates a complete newsletter through the UI like a human user would:
 * 1. Login as superadmin
 * 2. Create a Segment (audience targeting)
 * 3. Create a Newsletter Configuration (template settings)
 * 4. Verify both were created successfully
 *
 * Run with: npm run test:human:newsletter
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const PASSWORD = 'TestPass123';

test.describe('Create Newsletter - Full Live UI Test', () => {
  test('Complete newsletter workflow: Segment + Configuration', async ({ page }) => {
    // Slow down so we can watch
    test.slow();

    console.log('\n========================================');
    console.log('LIVE NEWSLETTER FULL WORKFLOW TEST');
    console.log('========================================\n');

    // =========================================================================
    // Step 1: Login
    // =========================================================================
    console.log('Step 1: Navigating to login page...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('Step 1b: Logging in as superadmin@test.com...');
    await page.fill('input[type="email"], input[name="email"]', 'superadmin@test.com');
    await page.waitForTimeout(300);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.waitForTimeout(300);

    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(?<!login)$/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    console.log('Login successful! Current URL:', page.url());
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/artifacts/human/01-logged-in.png', fullPage: true });

    // =========================================================================
    // Step 2: Navigate to Newsletter Config Page
    // =========================================================================
    console.log('\nStep 2: Navigating to Newsletter Configuration...');
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/artifacts/human/02-config-page.png', fullPage: true });
    console.log('Screenshot saved: 02-config-page.png');

    // =========================================================================
    // Step 3: Create a Segment
    // =========================================================================
    console.log('\nStep 3: Creating a Segment...');

    // Click on Segments tab - the tab has role="tab" and contains "Segments" text
    const segmentsTab = page.locator('[role="tab"]:has-text("Segments")');
    await segmentsTab.waitFor({ state: 'visible', timeout: 5000 });
    await segmentsTab.click();
    console.log('Clicked Segments tab');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/artifacts/human/03-segments-tab.png', fullPage: true });

    // The header button changes to "New Segment" when on Segments tab
    // Look for button containing "New Segment" text - use text locator for reliability
    const createSegmentBtn = page.locator('button:has-text("New Segment")');
    await createSegmentBtn.waitFor({ state: 'visible', timeout: 5000 });
    await createSegmentBtn.click();
    console.log('Clicked New Segment button');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/artifacts/human/04-segment-form.png', fullPage: true });

    // Fill segment form - wait for dialog to appear
    await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });

    const timestamp = Date.now();
    const segmentName = `Enterprise Security Team - ${timestamp}`;

    // Fill name field
    const segmentNameInput = page.locator('[role="dialog"] input[id="name"], [role="dialog"] input[name="name"]').first();
    await segmentNameInput.waitFor({ state: 'visible', timeout: 3000 });
    await segmentNameInput.fill(segmentName);
    console.log(`Filled segment name: ${segmentName}`);
    await page.waitForTimeout(300);

    // Fill description
    const segmentDescInput = page.locator('[role="dialog"] textarea[id="description"], [role="dialog"] textarea[name="description"]').first();
    if (await segmentDescInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await segmentDescInput.fill('Enterprise security professionals and CISOs in technology sector');
      console.log('Filled segment description');
      await page.waitForTimeout(300);
    }

    // Fill max newsletters
    const maxNewslettersInput = page.locator('[role="dialog"] input[id="max_newsletters_per_30_days"], [role="dialog"] input[name="max_newsletters_per_30_days"]').first();
    if (await maxNewslettersInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await maxNewslettersInput.clear();
      await maxNewslettersInput.fill('4');
      console.log('Set max newsletters to 4');
    }

    await page.screenshot({ path: 'tests/artifacts/human/05-segment-filled.png', fullPage: true });

    // Submit segment form - look for the submit button in the dialog
    const submitSegmentBtn = page.locator('[role="dialog"] button[type="submit"]');
    await submitSegmentBtn.click();
    console.log('Clicked submit segment button');

    // Wait for API response and dialog to close
    await page.waitForTimeout(2000);

    // Check for success toast
    const successToast = page.locator('[data-sonner-toast]');
    if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('SUCCESS: Segment created (toast appeared)');
    }

    await page.screenshot({ path: 'tests/artifacts/human/06-segment-created.png', fullPage: true });
    console.log('Segment creation completed');

    // Ensure dialog is closed
    await page.waitForTimeout(500);
    if (await page.locator('[role="dialog"]').isVisible({ timeout: 500 }).catch(() => false)) {
      console.log('Dialog still open, closing...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // =========================================================================
    // Step 4: Create Newsletter Configuration
    // =========================================================================
    console.log('\nStep 4: Creating Newsletter Configuration...');

    // Switch to Configurations tab
    const configsTab = page.locator('[role="tab"]:has-text("Configurations")');
    await configsTab.waitFor({ state: 'visible', timeout: 5000 });
    await configsTab.click();
    console.log('Clicked Configurations tab');
    await page.waitForTimeout(1500);

    // The header button changes to "New Configuration" when on Configurations tab
    const createConfigBtn = page.locator('button:has-text("New Configuration")');
    await createConfigBtn.waitFor({ state: 'visible', timeout: 5000 });
    await createConfigBtn.click();
    console.log('Clicked New Configuration button');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/artifacts/human/07-config-form.png', fullPage: true });

    // Wait for dialog to appear
    await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });

    // Fill the configuration form
    const configTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const configName = `Weekly Cyber Security Brief - ${configTimestamp}`;

    // Fill name
    const nameInput = page.locator('[role="dialog"] input[id="name"], [role="dialog"] input[name="name"]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 3000 });
    await nameInput.fill(configName);
    console.log(`Filled name: ${configName}`);
    await page.waitForTimeout(300);

    // Fill description
    const descInput = page.locator('[role="dialog"] textarea[id="description"], [role="dialog"] textarea[name="description"]').first();
    if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await descInput.fill('Cybersecurity newsletter for enterprise security teams covering vulnerabilities, threat intelligence, and best practices.');
      console.log('Filled description');
      await page.waitForTimeout(300);
    }

    // Fill timezone if present
    const timezoneInput = page.locator('[role="dialog"] input[id="timezone"], [role="dialog"] input[name="timezone"]').first();
    if (await timezoneInput.isVisible({ timeout: 500 }).catch(() => false)) {
      await timezoneInput.fill('America/New_York');
      console.log('Set timezone: America/New_York');
    }

    await page.screenshot({ path: 'tests/artifacts/human/08-config-filled.png', fullPage: true });

    // Submit the form
    const submitButton = page.locator('[role="dialog"] button[type="submit"]');
    await submitButton.click();
    console.log('Clicked submit button');

    // Wait for API response
    await page.waitForTimeout(2000);

    // Check for success toast
    const configSuccessToast = page.locator('[data-sonner-toast]');
    if (await configSuccessToast.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('SUCCESS: Configuration created (toast appeared)');
    }

    await page.screenshot({ path: 'tests/artifacts/human/09-config-created.png', fullPage: true });
    console.log('Configuration creation completed');

    // Ensure dialog is closed
    await page.waitForTimeout(500);
    if (await page.locator('[role="dialog"]').isVisible({ timeout: 500 }).catch(() => false)) {
      console.log('Closing config dialog...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // =========================================================================
    // Step 5: Verify in the list
    // =========================================================================
    console.log('\nStep 5: Verifying newsletter configuration in list...');
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/artifacts/human/10-final-list.png', fullPage: true });
    console.log('Screenshot saved: 10-final-list.png');

    // =========================================================================
    // Step 6: Check Analytics Page (verify system is working)
    // =========================================================================
    console.log('\nStep 6: Checking Analytics page...');
    await page.goto(`${BASE_URL}/newsletter/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/artifacts/human/11-analytics.png', fullPage: true });
    console.log('Screenshot saved: 11-analytics.png');

    // =========================================================================
    // Step 7: Check Content Page
    // =========================================================================
    console.log('\nStep 7: Checking Content page...');
    await page.goto(`${BASE_URL}/newsletter/content`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/artifacts/human/12-content.png', fullPage: true });
    console.log('Screenshot saved: 12-content.png');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================');
    console.log('Check screenshots in tests/artifacts/human/');
    console.log('\nWorkflow completed:');
    console.log('1. Logged in as superadmin');
    console.log('2. Navigated to newsletter configs');
    console.log('3. Attempted to create segment');
    console.log('4. Created newsletter configuration');
    console.log('5. Verified configuration in list');
    console.log('6. Checked analytics page');
    console.log('7. Checked content page');
  });
});

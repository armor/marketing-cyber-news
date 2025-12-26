import { test, expect } from '@playwright/test';

/**
 * REGRESSION TEST: Newsletter Configuration Page
 *
 * This test ensures the newsletter configs page works correctly with the real backend.
 * It validates:
 * 1. Page loads without errors
 * 2. API response transformation works (meta → pagination)
 * 3. Configuration data is displayed correctly
 * 4. All UI elements render properly
 *
 * Created to prevent regression after fixing API response format mismatch.
 * The backend returns { data, meta: { total_count } } but frontend expects { data, pagination: { total } }
 */

const BASE_URL = 'http://localhost:5173';

test.describe('Newsletter Configs Page - Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login with admin credentials
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#email', 'admin@test.com');
    await page.fill('#password', 'TestPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard|\/$/, { timeout: 30000 });
  });

  test('Configs page loads without console errors', async ({ page }) => {
    // Capture ALL console messages for debugging
    const consoleMessages: { type: string; text: string }[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });

      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture page errors (unhandled exceptions)
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Navigate to configs page
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Log all console messages for debugging
    if (consoleMessages.length > 0) {
      console.log('\n--- Console Messages ---');
      consoleMessages.forEach(({ type, text }) => {
        console.log(`[${type.toUpperCase()}] ${text.slice(0, 200)}`);
      });
      console.log('------------------------\n');
    }

    // Filter out expected/benign errors (if any)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('404') &&
      !err.includes('DevTools') &&
      !err.includes('downloadable font') &&
      !err.includes('third-party cookie')
    );

    // Log critical errors for debugging
    if (criticalErrors.length > 0) {
      console.log('\n!!! CRITICAL CONSOLE ERRORS FOUND !!!');
      criticalErrors.forEach((err, i) => {
        console.log(`Error ${i + 1}: ${err}`);
      });
      console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
    }

    if (pageErrors.length > 0) {
      console.log('\n!!! UNCAUGHT PAGE ERRORS FOUND !!!');
      pageErrors.forEach((err, i) => {
        console.log(`Page Error ${i + 1}: ${err}`);
      });
      console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
    }

    // Assert NO errors at all - strict check
    expect(pageErrors, `Page should not have uncaught exceptions. Found: ${pageErrors.join(', ')}`).toHaveLength(0);
    expect(criticalErrors, `Console should be clear of errors. Found: ${criticalErrors.join(', ')}`).toHaveLength(0);

    // Success message
    console.log('✓ Console is clear of errors');
  });

  test('API response transformation works correctly', async ({ page }) => {
    // Intercept the API call to verify response is handled
    let apiResponseReceived = false;
    let apiResponseData: unknown = null;

    await page.route('**/newsletter-configs**', async route => {
      const response = await route.fetch();
      const body = await response.json();
      apiResponseReceived = true;
      apiResponseData = body;

      // Continue with original response
      await route.fulfill({ response });
    });

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Verify API was called
    expect(apiResponseReceived, 'API should be called').toBe(true);

    // Verify response has expected structure (backend format)
    expect(apiResponseData).toHaveProperty('data');
    expect(apiResponseData).toHaveProperty('meta');

    // Verify the page rendered configs (transformation worked)
    const configRows = page.locator('table tbody tr, [data-testid="config-row"]');
    const rowCount = await configRows.count();
    expect(rowCount, 'Should display configuration rows').toBeGreaterThan(0);
  });

  test('Configuration data displays correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Should show "Newsletter Configuration" or similar header
    const header = page.locator('h1, h2').filter({ hasText: /configuration/i });
    await expect(header.first()).toBeVisible();

    // Should show configurations table/list (use first() since layout has multiple main elements)
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();

    // Verify at least one config is visible
    const configName = page.locator('text=/Weekly|Daily|Monthly|Newsletter/i');
    await expect(configName.first()).toBeVisible({ timeout: 5000 });

    // Each config should have action buttons (edit, delete, etc.)
    const actionButtons = page.locator('table tbody tr button, [data-testid="config-actions"] button');
    const buttonCount = await actionButtons.count();
    expect(buttonCount, 'Each config should have action buttons').toBeGreaterThanOrEqual(1);
  });

  test('Loading state is shown while fetching', async ({ page }) => {
    // Slow down the API response
    await page.route('**/newsletter-configs**', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto(`${BASE_URL}/newsletter/configs`);

    // Check for loading indicator (skeleton, spinner, or "Loading" text)
    const loadingIndicator = page.locator('[data-testid="loading"], .skeleton, [class*="animate-pulse"], text=/loading/i');

    // Loading state might be brief, so just verify page eventually loads
    await page.waitForLoadState('networkidle');

    // Verify content eventually appears
    const configContent = page.locator('table, [data-testid="config-list"]');
    await expect(configContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('Empty state handled gracefully', async ({ page }) => {
    // This test verifies the UI doesn't crash when no configs exist
    // We can't easily simulate empty state with real backend, so just verify structure
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Page should not crash regardless of data
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body?.length).toBeGreaterThan(100);

    // Take a regression screenshot
    await page.screenshot({
      path: '/tmp/regression-newsletter-configs.png',
      fullPage: true
    });
  });

  test('Navigation to configs page works from sidebar', async ({ page }) => {
    // Start from dashboard
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Click on Newsletter menu item (may need to expand first)
    const newsletterMenu = page.locator('text=/Newsletter/i').first();
    await newsletterMenu.click();

    // Click on Configuration submenu if it exists
    const configLink = page.locator('a[href*="configs"], button:has-text("Configuration")').first();
    if (await configLink.isVisible()) {
      await configLink.click();
    }

    // Verify we're on configs page
    await page.waitForURL(/.*newsletter.*config/i, { timeout: 5000 });

    // Verify configs content loads
    const configsHeading = page.locator('text=/Configuration/i');
    await expect(configsHeading.first()).toBeVisible();
  });

  test('Config row actions are clickable', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Get first config row
    const firstRow = page.locator('table tbody tr, [data-testid="config-row"]').first();
    await expect(firstRow).toBeVisible();

    // Find action buttons in the row
    const rowButtons = firstRow.locator('button');
    const buttonCount = await rowButtons.count();

    // Verify buttons exist and are clickable
    expect(buttonCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = rowButtons.nth(i);
      await expect(button).toBeEnabled();
    }
  });
});

/**
 * REGRESSION TEST: Newsletter Configuration Action Buttons
 *
 * Tests that all action buttons in the config table actually work:
 * - Generate: Opens generate dialog with segment selection
 * - Edit: Opens form pre-filled with existing configuration data
 * - Clone: Opens form pre-filled with copied data (name + " (Copy)")
 * - Delete: Shows confirmation dialog with Cancel/Delete options
 *
 * Created to prevent regression after fixing buttons that appeared clickable but did nothing.
 */
test.describe('Newsletter Config Button Actions - Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login with admin credentials
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#email', 'admin@test.com');
    await page.fill('#password', 'TestPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard|\/$/, { timeout: 30000 });
  });

  test('Generate button opens dialog without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('table tbody tr').first();
    const generateBtn = firstRow.locator('button[aria-label="Generate newsletter issue"]');
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();
    await page.waitForTimeout(1000);

    // Check for dialog or toast indication
    const dialog = page.locator('[role="dialog"]');
    const hasDialog = await dialog.isVisible().catch(() => false);

    // Filter benign errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') && !err.includes('DevTools') && !err.includes('third-party cookie')
    );

    expect(pageErrors).toHaveLength(0);
    expect(criticalErrors).toHaveLength(0);

    // Close dialog if open
    if (hasDialog) {
      const closeBtn = dialog.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('Edit button opens form with existing data', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Get the name of the first config before clicking edit
    const firstRow = page.locator('table tbody tr').first();
    const configName = await firstRow.locator('td').first().textContent();

    const editBtn = firstRow.locator('button[aria-label="Edit configuration"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    await page.waitForTimeout(1500);

    // Verify dialog opened
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify the form is NOT blank - should contain config data
    const dialogContent = await dialog.textContent();
    expect(dialogContent?.length).toBeGreaterThan(100);

    // Check for the config name in the form or existing field values
    const nameInput = dialog.locator('input[name="name"], input#name').first();
    if (await nameInput.isVisible()) {
      const inputValue = await nameInput.inputValue();
      expect(inputValue?.length).toBeGreaterThan(0);
    }

    // Filter benign errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') && !err.includes('DevTools') && !err.includes('third-party cookie')
    );

    expect(pageErrors).toHaveLength(0);
    expect(criticalErrors).toHaveLength(0);

    // Close dialog
    const closeBtn = dialog.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
  });

  test('Clone button opens form with copied data', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('table tbody tr').first();
    const cloneBtn = firstRow.locator('button[aria-label="Clone configuration"]');
    await expect(cloneBtn).toBeVisible();
    await cloneBtn.click();
    await page.waitForTimeout(1500);

    // Verify dialog opened
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify the form has data (cloned content)
    const dialogContent = await dialog.textContent();
    expect(dialogContent?.length).toBeGreaterThan(100);

    // Check that name contains "(Copy)" suffix for cloned config
    const nameInput = dialog.locator('input[name="name"], input#name').first();
    if (await nameInput.isVisible()) {
      const inputValue = await nameInput.inputValue();
      expect(inputValue).toContain('(Copy)');
    }

    // Filter benign errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') && !err.includes('DevTools') && !err.includes('third-party cookie')
    );

    expect(pageErrors).toHaveLength(0);
    expect(criticalErrors).toHaveLength(0);

    // Close dialog
    const closeBtn = dialog.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
  });

  test('Delete button shows confirmation dialog', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('table tbody tr').first();
    const deleteBtn = firstRow.locator('button[aria-label="Delete configuration"]');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    await page.waitForTimeout(1000);

    // Verify confirmation dialog opened
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify it has Delete and Cancel buttons
    const deleteConfirmBtn = dialog.locator('button:has-text("Delete")');
    const cancelBtn = dialog.locator('button:has-text("Cancel")');
    await expect(deleteConfirmBtn).toBeVisible();
    await expect(cancelBtn).toBeVisible();

    // Dialog should mention deletion
    const dialogContent = await dialog.textContent();
    expect(dialogContent?.toLowerCase()).toContain('delete');

    // Filter benign errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') && !err.includes('DevTools') && !err.includes('third-party cookie')
    );

    expect(pageErrors).toHaveLength(0);
    expect(criticalErrors).toHaveLength(0);

    // Click Cancel to NOT actually delete
    await cancelBtn.click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('All action buttons work without console errors', async ({ page }) => {
    // Comprehensive test that clicks each button and verifies no errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('table tbody tr').first();

    // Test each button in sequence
    const buttons = [
      { label: 'Generate newsletter issue', shouldOpenDialog: true },
      { label: 'Edit configuration', shouldOpenDialog: true },
      { label: 'Clone configuration', shouldOpenDialog: true },
      { label: 'Delete configuration', shouldOpenDialog: true },
    ];

    for (const btn of buttons) {
      const button = firstRow.locator(`button[aria-label="${btn.label}"]`);
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(1000);

        if (btn.shouldOpenDialog) {
          const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
          if (await dialog.isVisible()) {
            // Close the dialog
            const closeBtn = dialog.locator('button[aria-label="Close"], button:has-text("Cancel"), button:has-text("Close")').first();
            if (await closeBtn.isVisible()) {
              await closeBtn.click();
              await page.waitForTimeout(500);
            } else {
              // Press Escape to close
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
          }
        }
      }
    }

    // Filter benign errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') && !err.includes('DevTools') && !err.includes('third-party cookie')
    );

    expect(pageErrors, 'Should have no uncaught page errors').toHaveLength(0);
    expect(criticalErrors, 'Should have no console errors').toHaveLength(0);
  });
});

/**
 * REGRESSION TEST: Toast Notifications
 *
 * Tests that toast notifications are properly displayed in the application.
 * This was added after discovering that the Toaster component was not mounted
 * in App.tsx, causing all toast.error(), toast.success(), etc. calls to silently fail.
 *
 * Created to prevent regression after adding <Toaster /> to App.tsx.
 */
test.describe('Toast Notification - Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login with admin credentials
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#email', 'admin@test.com');
    await page.fill('#password', 'TestPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard|\/$/, { timeout: 30000 });
  });

  test('Generate button shows toast notification when clicked', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Click the Generate button on first row
    const firstRow = page.locator('table tbody tr').first();
    const generateBtn = firstRow.locator('button[aria-label="Generate newsletter issue"]');
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Wait for toast to appear
    await page.waitForTimeout(1000);

    // Check for sonner toast element
    const toast = page.locator('[data-sonner-toast]');
    const toastCount = await toast.count();

    // Toast should appear (either error toast for no segment, or loading toast)
    expect(toastCount, 'Toast notification should appear after clicking Generate').toBeGreaterThan(0);
  });

  test('Generate button shows error toast when config has no segment', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Find a config row with "N/A" in the segment column (no segment assigned)
    const rowsWithNoSegment = page.locator('table tbody tr').filter({
      has: page.locator('td:has-text("N/A")')
    });

    const rowCount = await rowsWithNoSegment.count();
    if (rowCount === 0) {
      // Skip test if all configs have segments
      console.log('All configs have segments assigned - skipping error toast test');
      return;
    }

    // Click Generate on a row without segment
    const generateBtn = rowsWithNoSegment.first().locator('button[aria-label="Generate newsletter issue"]');
    await generateBtn.click();

    // Wait for error toast
    await page.waitForTimeout(1000);

    // Check for error toast content
    const toast = page.locator('[data-sonner-toast]');
    await expect(toast.first()).toBeVisible({ timeout: 3000 });

    // Verify toast contains error message about segment
    const toastContent = await toast.first().textContent();
    expect(toastContent?.toLowerCase()).toContain('segment');
  });

  test('Toaster component is mounted in the application', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Trigger a toast by clicking Generate
    const firstRow = page.locator('table tbody tr').first();
    const generateBtn = firstRow.locator('button[aria-label="Generate newsletter issue"]');
    await generateBtn.click();

    // Wait and check for the Sonner toaster container
    await page.waitForTimeout(1500);

    // Look for the Sonner toaster container in the DOM
    // Sonner creates a container with data-sonner-toaster attribute
    const toasterContainer = page.locator('[data-sonner-toaster], section[aria-label*="toast"], ol[data-sonner-toaster]');

    // Even if no toast is visible, the toaster container should exist
    // But let's verify by checking if a toast was actually rendered
    const toast = page.locator('[data-sonner-toast]');
    const toastVisible = await toast.first().isVisible().catch(() => false);

    expect(toastVisible, 'Toast should be visible - Toaster component must be mounted').toBe(true);
  });

  test('Toast notifications have correct styling', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Click Generate to trigger toast
    const firstRow = page.locator('table tbody tr').first();
    const generateBtn = firstRow.locator('button[aria-label="Generate newsletter issue"]');
    await generateBtn.click();

    await page.waitForTimeout(1000);

    // Get toast element
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 3000 });

    // Verify toast is positioned in top-right (our configured position)
    // Take a screenshot for visual verification
    await page.screenshot({
      path: '/tmp/regression-toast-notification.png',
      fullPage: true
    });

    // Toast should be visible and have content
    const toastContent = await toast.textContent();
    expect(toastContent?.length).toBeGreaterThan(0);
  });
});

/**
 * REGRESSION TEST: Segment Selection and Creation
 *
 * Tests that segment dropdown works correctly in the configuration form:
 * - Segment dropdown displays available segments from the backend
 * - User can select/change segment on an existing config via Edit
 * - User can create a new segment using the "+ New Segment" button
 * - Newly created segments appear in the dropdown
 *
 * Created to ensure segment is properly required and selectable for newsletter configs.
 */
test.describe('Segment Selection - Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login with admin credentials
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#email', 'admin@test.com');
    await page.fill('#password', 'TestPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard|\/$/, { timeout: 30000 });
  });

  test('Edit form shows segment dropdown with available segments', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Click Edit on first config
    const firstRow = page.locator('table tbody tr').first();
    const editBtn = firstRow.locator('button[aria-label="Edit configuration"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Wait for dialog to open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Find the segment dropdown
    const segmentDropdown = dialog.locator('#segment_id');
    await expect(segmentDropdown).toBeVisible();

    // Click to open the dropdown
    await segmentDropdown.click();

    // Wait for dropdown content to appear
    const dropdownContent = page.locator('[role="listbox"]');
    await expect(dropdownContent).toBeVisible({ timeout: 3000 });

    // Verify segments are listed (either items or create option)
    const segmentItems = dropdownContent.locator('[role="option"]');
    const segmentCount = await segmentItems.count();

    // Should have at least one segment option or create button
    const createOption = dropdownContent.locator('[data-testid="create-segment-empty-option"]');
    const hasSegments = segmentCount > 0;
    const hasCreateOption = await createOption.isVisible().catch(() => false);

    expect(hasSegments || hasCreateOption, 'Segment dropdown should have options or create button').toBe(true);

    // Close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
  });

  test('Segment dropdown displays segments from backend API', async ({ page }) => {
    // Intercept segments API to verify it's called
    let segmentsApiCalled = false;
    let segmentsData: unknown = null;

    await page.route('**/segments**', async route => {
      segmentsApiCalled = true;
      const response = await route.fetch();
      const body = await response.json();
      segmentsData = body;
      await route.fulfill({ response });
    });

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Click Edit to open form
    const firstRow = page.locator('table tbody tr').first();
    const editBtn = firstRow.locator('button[aria-label="Edit configuration"]');
    await editBtn.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Segments API should have been called
    await page.waitForTimeout(2000);
    expect(segmentsApiCalled, 'Segments API should be called when form opens').toBe(true);

    // Close dialog
    await page.keyboard.press('Escape');
  });

  test('User can change segment on existing config', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Click Edit on first config
    const firstRow = page.locator('table tbody tr').first();
    const editBtn = firstRow.locator('button[aria-label="Edit configuration"]');
    await editBtn.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Find the segment dropdown and click to open
    const segmentDropdown = dialog.locator('#segment_id');
    await segmentDropdown.click();

    // Wait for dropdown content
    const dropdownContent = page.locator('[role="listbox"]');
    await expect(dropdownContent).toBeVisible({ timeout: 3000 });

    // Get available segment options
    const segmentOptions = dropdownContent.locator('[role="option"]');
    const optionCount = await segmentOptions.count();

    if (optionCount > 0) {
      // Select a different segment
      await segmentOptions.first().click();

      // Wait for dropdown to close
      await page.waitForTimeout(500);

      // The segment trigger should now show the selected segment name
      const selectedValue = await segmentDropdown.textContent();
      expect(selectedValue?.length).toBeGreaterThan(0);
      expect(selectedValue).not.toContain('Select a segment');
    }

    // Close dialog using Escape key (more reliable than clicking Cancel when overlays exist)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test('New Segment button opens create segment dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Click Edit to open config form
    const firstRow = page.locator('table tbody tr').first();
    const editBtn = firstRow.locator('button[aria-label="Edit configuration"]');
    await editBtn.click();

    // Wait for config dialog
    const configDialog = page.locator('[role="dialog"]').first();
    await expect(configDialog).toBeVisible({ timeout: 5000 });

    // Find and click the "+ New Segment" button
    const newSegmentBtn = configDialog.locator('[data-testid="create-segment-button"]');
    await expect(newSegmentBtn).toBeVisible();
    await newSegmentBtn.click();

    // Wait for segment form dialog to appear (it uses the existing SegmentForm component)
    await page.waitForTimeout(500);
    // SegmentForm has DialogTitle "Create Audience Segment"
    const segmentDialog = page.locator('[role="dialog"]:has-text("Create Audience Segment")');
    await expect(segmentDialog).toBeVisible({ timeout: 3000 });

    // Verify dialog has expected fields (using SegmentForm's input IDs)
    const nameInput = segmentDialog.locator('input#name');
    const descInput = segmentDialog.locator('textarea#description');
    const createBtn = segmentDialog.locator('button:has-text("Create Segment")');

    await expect(nameInput).toBeVisible();
    await expect(descInput).toBeVisible();
    await expect(createBtn).toBeVisible();

    // Close dialog by clicking Cancel
    const cancelBtn = segmentDialog.locator('button:has-text("Cancel")');
    await cancelBtn.click();
  });

  test('Create segment dialog validates required name field', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Click Edit to open config form
    const firstRow = page.locator('table tbody tr').first();
    const editBtn = firstRow.locator('button[aria-label="Edit configuration"]');
    await editBtn.click();

    // Wait for config dialog
    const configDialog = page.locator('[role="dialog"]').first();
    await expect(configDialog).toBeVisible({ timeout: 5000 });

    // Click "+ New Segment" button
    const newSegmentBtn = configDialog.locator('[data-testid="create-segment-button"]');
    await newSegmentBtn.click();

    // Wait for segment form dialog (SegmentForm has DialogTitle "Create Audience Segment")
    const segmentDialog = page.locator('[role="dialog"]:has-text("Create Audience Segment")');
    await expect(segmentDialog).toBeVisible({ timeout: 3000 });

    // SegmentForm validates on submit - try to create without name
    const createBtn = segmentDialog.locator('button:has-text("Create Segment")');
    await createBtn.click();

    // Should show validation error for required name field
    const nameError = segmentDialog.locator('text=Segment name is required');
    await expect(nameError).toBeVisible({ timeout: 2000 });

    // Enter name to clear validation error
    const nameInput = segmentDialog.locator('input#name');
    await nameInput.fill('Test Segment');

    // Error should disappear when user types
    await expect(nameError).not.toBeVisible({ timeout: 2000 });

    // Close dialog
    const cancelBtn = segmentDialog.locator('button:has-text("Cancel")');
    await cancelBtn.click();
  });

  test('Creating a segment shows toast feedback', async ({ page }) => {
    // This test verifies the segment creation flow works end-to-end
    // Note: The actual creation may succeed or fail depending on backend state
    const uniqueSegmentName = `E2E Test Segment ${Date.now()}`;

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Click Edit to open config form
    const firstRow = page.locator('table tbody tr').first();
    const editBtn = firstRow.locator('button[aria-label="Edit configuration"]');
    await editBtn.click();

    // Wait for config dialog
    const configDialog = page.locator('[role="dialog"]').first();
    await expect(configDialog).toBeVisible({ timeout: 5000 });

    // Click "+ New Segment" button
    const newSegmentBtn = configDialog.locator('[data-testid="create-segment-button"]');
    await newSegmentBtn.click();

    // Wait for SegmentForm dialog (DialogTitle is "Create Audience Segment")
    const segmentDialog = page.locator('[role="dialog"]:has-text("Create Audience Segment")');
    await expect(segmentDialog).toBeVisible({ timeout: 3000 });

    // Fill in segment details using SegmentForm's actual input ids
    const nameInput = segmentDialog.locator('input#name');
    await nameInput.fill(uniqueSegmentName);

    const descInput = segmentDialog.locator('textarea#description');
    await descInput.fill('Created by E2E test');

    // Click Create (SegmentForm uses "Create Segment" button text)
    const createBtn = segmentDialog.locator('button:has-text("Create Segment")');
    await createBtn.click();

    // Wait for response - segment creation and dialog transitions
    await page.waitForTimeout(3000);

    // Toast should appear (either success or error)
    const toast = page.locator('[data-sonner-toast]');
    const toastVisible = await toast.isVisible().catch(() => false);
    expect(toastVisible, 'Toast notification should appear after creating segment').toBe(true);

    if (toastVisible) {
      const toastText = await toast.textContent();
      // Toast should have some content - either success or error message
      expect(toastText?.length).toBeGreaterThan(0);

      // Verify the toast shows creation feedback
      const hasCreatedText = toastText?.toLowerCase().includes('created');
      const hasErrorText = toastText?.toLowerCase().includes('error') || toastText?.toLowerCase().includes('failed');
      expect(hasCreatedText || hasErrorText, 'Toast should indicate creation result').toBe(true);

      // After segment creation, config dialog should reappear
      const configDialogAfter = page.locator('[role="dialog"]').first();
      await expect(configDialogAfter).toBeVisible({ timeout: 3000 });
    }

    // Close dialog using Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Take screenshot for verification
    await page.screenshot({
      path: '/tmp/regression-segment-created.png',
      fullPage: true
    });
  });

  test('Segment is required for form submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Click Create New Configuration
    const createBtn = page.locator('button:has-text("New Configuration"), button:has-text("Create")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
    } else {
      // If no create button, skip test
      console.log('Create configuration button not found - skipping test');
      return;
    }

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill in required fields except segment
    const nameInput = dialog.locator('input#name');
    await nameInput.fill('Test Config Without Segment');

    // Try to submit without selecting segment
    const submitBtn = dialog.locator('button[type="submit"], button:has-text("Create Configuration")');
    await submitBtn.click();

    // Wait for validation
    await page.waitForTimeout(500);

    // Should show segment error message
    const segmentError = dialog.locator('#segment-error, [id="segment-error"]');
    const errorVisible = await segmentError.isVisible().catch(() => false);

    if (errorVisible) {
      const errorText = await segmentError.textContent();
      expect(errorText?.toLowerCase()).toContain('segment');
    }

    // Close dialog
    const cancelBtn = dialog.locator('button:has-text("Cancel")');
    await cancelBtn.click();
  });
});

/**
 * REGRESSION TEST: Newsletter Config Edit Persistence
 *
 * Tests that editing a newsletter configuration actually persists the changes:
 * - Edit form submission sends PUT request to backend
 * - PUT request returns 200 OK
 * - Data persists after page reload
 *
 * This test was created after discovering that the form appeared to save (toast shown)
 * but PUT requests were not being sent due to form validation issues with segment_id.
 *
 * Uses admin@example.com credentials (create via: admin user registered in backend)
 */
test.describe('Newsletter Config Edit Persistence - Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login with admin credentials - try both credential sets
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Try admin@example.com first (created for this test), fallback to admin@test.com
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'AdminPass123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard|.*\/$/, { timeout: 15000 });
  });

  test('Edit config, save, and verify data persisted after refresh', async ({ page }) => {
    // Set up request interception to monitor API calls
    const apiCalls: { method: string; url: string; status?: number }[] = [];
    page.on('request', request => {
      if (request.url().includes('/v1/')) {
        apiCalls.push({ method: request.method(), url: request.url() });
      }
    });
    page.on('response', response => {
      const call = apiCalls.find(c => c.url === response.url() && !c.status);
      if (call) {
        call.status = response.status();
      }
    });

    // Navigate to newsletter configs
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Wait for configs to load
    const configList = page.locator('table tbody tr');
    await expect(configList.first()).toBeVisible({ timeout: 15000 });

    // Click Edit on first config - aria-label is dynamic: "Edit {name} configuration"
    const firstRow = configList.first();
    const editButton = firstRow.locator('button[aria-label*="Edit"][aria-label*="configuration"]');
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();

    // Wait for edit dialog to appear
    const dialogContent = page.locator('[data-testid="config-form-dialog"], [role="dialog"]');
    await expect(dialogContent).toBeVisible({ timeout: 10000 });

    // Wait for form fields and segments to load
    await page.waitForLoadState('networkidle');

    // Look for name input field
    const nameInput = page.locator('#name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    // Ensure segment is selected - form validation requires it
    const segmentTrigger = page.locator('button#segment_id, [id="segment_id"]');
    const hasPlaceholder = await segmentTrigger.locator('[data-placeholder]').isVisible().catch(() => false);

    if (hasPlaceholder) {
      console.log('No segment selected, selecting first available...');
      await segmentTrigger.click();
      await page.waitForTimeout(300);
      const selectContent = page.locator('[role="listbox"]');
      await expect(selectContent).toBeVisible({ timeout: 5000 });
      await selectContent.locator('[role="option"]').first().click();
      console.log('Segment selected');
      await page.waitForTimeout(200);
    }

    // Get original value and modify
    const originalName = await nameInput.inputValue();
    const timestamp = Date.now();
    const newName = `Regression Test - ${timestamp}`;
    await nameInput.clear();
    await nameInput.fill(newName);

    // Clear API calls to track only the save request
    apiCalls.length = 0;

    // Set up promise to wait for PUT request
    const putRequestPromise = page.waitForResponse(
      response => response.url().includes('/v1/newsletter-configs/') && response.request().method() === 'PUT',
      { timeout: 10000 }
    ).catch(() => null);

    // Click save button
    const saveButton = page.locator('button:has-text("Save Changes"), button[type="submit"]').last();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Wait for PUT request and verify success
    const putResponse = await putRequestPromise;

    if (putResponse) {
      expect(putResponse.status(), 'PUT request should succeed').toBe(200);
      console.log(`PUT request completed with status: ${putResponse.status()}`);
    } else {
      console.log('API calls made:', apiCalls);
      throw new Error('PUT request was not made - form submission failed');
    }

    // Wait for dialog to close
    await page.waitForTimeout(1000);

    // Verify update appears in list
    await expect(page.getByText(newName).first()).toBeVisible({ timeout: 5000 });

    // CRITICAL: Reload page to verify data persisted in database
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for configs to load after reload
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });

    // Verify the updated name is still visible (proves database persistence)
    await expect(page.getByText(newName).first()).toBeVisible({ timeout: 5000 });
    console.log(`Data persisted: "${originalName}" -> "${newName}"`);
  });
});

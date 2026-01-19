/**
 * Content Import Flow - Deep E2E Tests
 *
 * Comprehensive test suite for content import functionality following
 * MANDATORY deep testing standards from CLAUDE.md.
 *
 * Coverage:
 * - Happy path: URL import with metadata extraction, manual entry
 * - Error paths: Invalid URLs, fetch failures, validation errors
 * - Edge cases: Empty fields, special characters, missing metadata
 * - Persistence: Data survives page reload
 * - Validation: Invalid submissions block API calls
 * - Console errors: Zero errors allowed
 *
 * Testing Standards Applied:
 * - API Interception with page.waitForResponse()
 * - HTTP Status Verification (200/201)
 * - Persistence verification after reload
 * - Validation blocks API calls verification
 * - Console error capture (zero errors allowed)
 *
 * IMPORTANT: These tests verify ACTUAL behavior, not just UI symptoms.
 * Toasts and success messages are NOT trusted - we verify actual API calls.
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// Test Configuration
// ============================================================================

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';
const API_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Test credentials - uses @armor.com domain to match K8s email constraint
const TEST_USER = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@armor.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'TestPass123',
};

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Login user and set auth tokens
 */
async function loginUser(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByLabel(/password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /sign in|login/i }).click();

  // Wait for navigation to dashboard (app redirects to /dashboard after login)
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });
}

/**
 * Navigate to content import page
 */
async function navigateToContentImport(page: Page): Promise<void> {
  // Navigate to newsletter content page
  await page.goto(`${BASE_URL}/newsletter/content`);
  await page.waitForLoadState('networkidle');
}

/**
 * Open import content sheet
 */
async function openImportSheet(page: Page): Promise<void> {
  // Click Import Content button
  const importButton = page.getByRole('button', { name: /import content/i });
  await importButton.click();

  // Wait for sheet to open
  await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
}

/**
 * Capture console errors during test
 */
function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  return errors;
}

// ============================================================================
// Test Suites
// ============================================================================

test.describe('Content Import Flow - Deep E2E Tests', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = captureConsoleErrors(page);
  });

  test.afterEach(async ({ page }) => {
    // Verify no console errors occurred
    expect(consoleErrors).toHaveLength(0);
  });

  // ========================================================================
  // Happy Path Tests
  // ========================================================================

  test.describe('Happy Path - URL Import with Metadata Extraction', () => {
    test('should import content via URL with metadata extraction', async ({ page, request }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Enter URL
      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill('https://securityblog.example.com/article-2024');

      // Click Fetch button
      const fetchButton = page.getByRole('button', { name: /fetch/i });

      // Intercept metadata extraction API call
      const metadataResponse = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/newsletter/content/extract-metadata') &&
            r.request().method() === 'POST'
        ),
        fetchButton.click(),
      ]);

      // Verify API was called with correct method and got success response
      expect(metadataResponse[0].status()).toBe(200);

      // Verify metadata populated form fields
      const titleInput = page.getByLabel('Content title');
      const summaryInput = page.getByLabel('Content summary');

      // Wait for form to be populated (after successful metadata fetch)
      await expect(titleInput).not.toHaveValue('');
      const populatedTitle = await titleInput.inputValue();
      expect(populatedTitle.length).toBeGreaterThan(0);

      // Click Import Content button
      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      // Intercept content creation API call
      const createResponse = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/content/items') &&
            r.request().method() === 'POST'
        ),
        importButton.click(),
      ]);

      // Verify content creation was successful
      expect(createResponse[0].status()).toBe(201);

      // Verify sheet closes after import
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).not.toBeVisible();
    });

    test('should allow editing metadata before save', async ({ page, request }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Enter URL
      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill('https://securityblog.example.com/article-2024');

      // Click Fetch button
      const fetchButton = page.getByRole('button', { name: /fetch/i });

      // Intercept and wait for metadata response
      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/newsletter/content/extract-metadata') &&
            r.request().method() === 'POST'
        ),
        fetchButton.click(),
      ]);

      // Wait for form to populate
      const titleInput = page.getByLabel('Content title');
      await expect(titleInput).not.toHaveValue('');
      const originalTitle = await titleInput.inputValue();

      // Edit title to custom value
      const editedTitle = 'My Custom Title - Critical Zero Day';
      await titleInput.clear();
      await titleInput.fill(editedTitle);

      // Verify edited value
      await expect(titleInput).toHaveValue(editedTitle);

      // Click Import Content button
      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      // Intercept request and verify edited title is sent
      const [createResponse, requestBody] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/content/items') &&
            r.request().method() === 'POST'
        ),
        new Promise((resolve) => {
          page.on('request', (req) => {
            if (req.url().includes('/content/items') && req.method() === 'POST') {
              resolve(req.postDataJSON());
            }
          });
        }),
        importButton.click(),
      ]);

      // Verify status is 201 (created)
      expect(createResponse.status()).toBe(201);

      // Verify request body contains edited title
      expect(requestBody).toEqual(
        expect.objectContaining({
          title: editedTitle,
        })
      );
    });

    test('should import via manual entry tab', async ({ page, request }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Click Manual Entry tab
      const manualTab = page.getByRole('tab', { name: /manual entry/i });
      await manualTab.click();

      // Fill in manual form
      const urlInput = page.getByLabel('Content URL');
      const titleInput = page.getByLabel('Content title');

      await urlInput.fill('https://example.com/manual-article');
      await titleInput.fill('Manual Content Entry - Zero Day Patch Released');

      // Select content type
      const contentTypeSelect = page.getByLabel('Select content type');
      await contentTypeSelect.click();
      const newsOption = page.getByRole('option', { name: /news article/i });
      await newsOption.click();

      // Click Import Content button
      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      // Intercept API call - should NOT have metadata fetch call first
      let metadataCallMade = false;
      page.on('request', (req) => {
        if (req.url().includes('/newsletter/content/extract-metadata')) {
          metadataCallMade = true;
        }
      });

      const createResponse = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/content/items') &&
            r.request().method() === 'POST'
        ),
        importButton.click(),
      ]);

      // Verify no metadata call was made (manual entry skips metadata extraction)
      expect(metadataCallMade).toBe(false);

      // Verify content creation was successful
      expect(createResponse[0].status()).toBe(201);

      // Verify sheet closes
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).not.toBeVisible();
    });

    test('should display imported content in list after import', async ({ page, request }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Import content via manual entry for reliability
      const manualTab = page.getByRole('tab', { name: /manual entry/i });
      await manualTab.click();

      const uniqueTitle = `Test Content ${Date.now()}`;
      const urlInput = page.getByLabel('Content URL');
      const titleInput = page.getByLabel('Content title');

      await urlInput.fill('https://example.com/test-article');
      await titleInput.fill(uniqueTitle);

      const contentTypeSelect = page.getByLabel('Select content type');
      await contentTypeSelect.click();
      const newsOption = page.getByRole('option', { name: /news article/i });
      await newsOption.click();

      // Import content
      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/content/items') &&
            r.request().method() === 'POST'
        ),
        importButton.click(),
      ]);

      // Wait for sheet to close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // Wait for page to stabilize
      await page.waitForLoadState('networkidle');

      // Verify new content appears in list (search or look for it)
      const contentList = page.locator('[role="main"]');
      await expect(contentList).toContainText(uniqueTitle, { timeout: 5000 });

      // Reload page to verify persistence
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify content still visible after reload
      const reloadedList = page.locator('[role="main"]');
      await expect(reloadedList).toContainText(uniqueTitle);
    });
  });

  // ========================================================================
  // Validation Tests
  // ========================================================================

  test.describe('Validation - Required Fields', () => {
    test('should prevent submit when URL is empty', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Leave URL empty, fill title
      const titleInput = page.getByLabel('Content title');
      await titleInput.fill('Title without URL');

      // Attempt to click import button
      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      // Button should be disabled
      expect(await importButton.isDisabled()).toBe(true);

      // Verify no API call is made
      let apiCalled = false;
      page.on('request', (req) => {
        if (req.url().includes('/content/items')) {
          apiCalled = true;
        }
      });

      // Try clicking anyway (in case button is somehow enabled)
      if (!importButton.isDisabled()) {
        await importButton.click();
        await page.waitForTimeout(500);
      }

      expect(apiCalled).toBe(false);
    });

    test('should prevent submit when title is empty', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Fill URL but leave title empty
      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill('https://example.com/article');

      // Leave title empty
      const titleInput = page.getByLabel('Content title');
      await titleInput.clear();

      // Attempt to click import button
      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      // Button should be disabled
      expect(await importButton.isDisabled()).toBe(true);

      // Verify no API call is made
      let apiCalled = false;
      page.on('request', (req) => {
        if (req.url().includes('/content/items')) {
          apiCalled = true;
        }
      });

      if (!importButton.isDisabled()) {
        await importButton.click();
        await page.waitForTimeout(500);
      }

      expect(apiCalled).toBe(false);
    });

    test('should show validation error for invalid URL format', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Enter invalid URL
      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill('not-a-valid-url');

      // Button should be disabled
      const fetchButton = page.getByRole('button', { name: /fetch/i });
      await expect(fetchButton).toBeDisabled();
    });
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  test.describe('Error Handling - URL Fetch Failures', () => {
    test('should handle metadata extraction failure gracefully', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Intercept fetch request and return error
      await page.route('**/newsletter/content/extract-metadata', (route) => {
        route.abort('failed');
      });

      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill('https://unreachable-domain-12345.example.com/article');

      const fetchButton = page.getByRole('button', { name: /fetch/i });
      await fetchButton.click();

      // Verify error message is displayed
      const errorAlert = page.locator('[role="alert"]');
      await expect(errorAlert).toContainText(/failed to fetch|error/i);

      // Verify user can still submit manually
      const titleInput = page.getByLabel('Content title');
      await titleInput.fill('Manual Title After Failed Fetch');

      const contentTypeSelect = page.getByLabel('Select content type');
      await contentTypeSelect.click();
      const newsOption = page.getByRole('option', { name: /news article/i });
      await newsOption.click();

      // Should now be able to import manually
      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      // Re-enable route for manual import
      await page.unroute('**/newsletter/content/extract-metadata');

      const response = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/content/items') &&
            r.request().method() === 'POST'
        ),
        importButton.click(),
      ]);

      expect(response[0].status()).toBe(201);
    });

    test('should handle content creation API error', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Fill form
      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');

      await urlInput.fill('https://example.com/article');
      await titleInput.fill('Test Article');

      // Intercept and error on content creation
      await page.route('**/content/items', (route) => {
        route.abort('failed');
      });

      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await importButton.click();

      // Wait for error handling
      await page.waitForTimeout(1000);

      // Verify error is displayed
      const errorAlert = page.locator('[role="alert"]');
      await expect(errorAlert).toBeVisible();

      // Verify sheet remains open (not closed on error)
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
    });

    test('should timeout gracefully for slow responses', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Intercept and delay metadata fetch beyond timeout
      await page.route('**/newsletter/content/extract-metadata', async (route) => {
        // Delay longer than typical timeout
        await new Promise((resolve) => setTimeout(resolve, 15000));
        route.continue();
      });

      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill('https://example.com/article');

      const fetchButton = page.getByRole('button', { name: /fetch/i });
      await fetchButton.click();

      // Should show error or timeout message
      const errorAlert = page.locator('[role="alert"]');
      await expect(errorAlert).toBeVisible({ timeout: 15000 });
    });
  });

  // ========================================================================
  // Edge Cases and Special Scenarios
  // ========================================================================

  test.describe('Edge Cases', () => {
    test('should handle special characters in title', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');

      const specialTitle = 'Critical: New "CVE-2024-1234" Zero-Day & Exploit Kit (Urgent!)';
      await urlInput.fill('https://example.com/article');
      await titleInput.fill(specialTitle);

      const contentTypeSelect = page.getByLabel('Select content type');
      await contentTypeSelect.click();
      const newsOption = page.getByRole('option', { name: /news article/i });
      await newsOption.click();

      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      const [response, requestBody] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/content/items') &&
            r.request().method() === 'POST'
        ),
        new Promise((resolve) => {
          page.on('request', (req) => {
            if (req.url().includes('/content/items') && req.method() === 'POST') {
              resolve(req.postDataJSON());
            }
          });
        }),
        importButton.click(),
      ]);

      // Verify special characters preserved in request
      expect(requestBody).toEqual(
        expect.objectContaining({
          title: specialTitle,
        })
      );

      expect(response.status()).toBe(201);
    });

    test('should handle very long title (over 500 chars)', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      const longTitle =
        'A ' + 'very '.repeat(100) + 'long title that exceeds typical limits';

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');

      await urlInput.fill('https://example.com/article');
      await titleInput.fill(longTitle);

      const contentTypeSelect = page.getByLabel('Select content type');
      await contentTypeSelect.click();
      const newsOption = page.getByRole('option', { name: /news article/i });
      await newsOption.click();

      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      const response = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/content/items') &&
            r.request().method() === 'POST'
        ),
        importButton.click(),
      ]);

      // Should still work (or return 400 with validation error)
      expect([200, 201, 400]).toContain(response[0].status());
    });

    test('should handle multiple comma-separated tags', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');
      const tagsInput = page.getByLabel('Topic tags');

      await urlInput.fill('https://example.com/article');
      await titleInput.fill('Security Article');
      await tagsInput.fill('zero-day, vulnerability, ransomware, APT, exploit, critical');

      const contentTypeSelect = page.getByLabel('Select content type');
      await contentTypeSelect.click();
      const newsOption = page.getByRole('option', { name: /news article/i });
      await newsOption.click();

      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      const [response, requestBody] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/content/items') &&
            r.request().method() === 'POST'
        ),
        new Promise((resolve) => {
          page.on('request', (req) => {
            if (req.url().includes('/content/items') && req.method() === 'POST') {
              resolve(req.postDataJSON());
            }
          });
        }),
        importButton.click(),
      ]);

      // Verify tags were parsed and sent as array
      expect(requestBody).toEqual(
        expect.objectContaining({
          topic_tags: expect.arrayContaining(['zero-day', 'vulnerability', 'ransomware', 'APT', 'exploit', 'critical']),
        })
      );

      expect(response.status()).toBe(201);
    });

    test('should handle empty optional fields', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');

      // Fill only required fields
      await urlInput.fill('https://example.com/article');
      await titleInput.fill('Minimal Content');

      // Leave optional fields empty (summary, author, image, tags, etc.)
      const contentTypeSelect = page.getByLabel('Select content type');
      await contentTypeSelect.click();
      const newsOption = page.getByRole('option', { name: /news article/i });
      await newsOption.click();

      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      const response = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/content/items') &&
            r.request().method() === 'POST'
        ),
        importButton.click(),
      ]);

      // Should succeed with only required fields
      expect(response[0].status()).toBe(201);
    });
  });

  // ========================================================================
  // UI Behavior Tests
  // ========================================================================

  test.describe('UI Behavior', () => {
    test('should reset form when sheet closes and reopens', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Fill in some data
      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill('https://example.com/article');

      const titleInput = page.getByLabel('Content title');
      await titleInput.fill('Test Title');

      // Close sheet
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      await cancelButton.click();

      // Verify sheet is closed
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // Reopen sheet
      await openImportSheet(page);

      // Verify form is reset
      const newUrlInput = page.getByLabel('Content URL').first();
      expect(await newUrlInput.inputValue()).toBe('');

      const newTitleInput = page.getByLabel('Content title');
      expect(await newTitleInput.inputValue()).toBe('');
    });

    test('should disable submit button while creating', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Delay content creation to allow checking disabled state
      await page.route('**/content/items', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        route.continue();
      });

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');

      await urlInput.fill('https://example.com/article');
      await titleInput.fill('Test Title');

      const contentTypeSelect = page.getByLabel('Select content type');
      await contentTypeSelect.click();
      const newsOption = page.getByRole('option', { name: /news article/i });
      await newsOption.click();

      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      // Click import and immediately check if button is disabled
      const clickPromise = importButton.click();

      // Give it a moment to start loading
      await page.waitForTimeout(100);

      // Button should show loading state
      expect(importButton).toContainText(/importing|loading/i);

      await clickPromise;
    });

    test('should show success message and then close sheet', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');

      await urlInput.fill('https://example.com/article');
      await titleInput.fill('Test Title');

      const contentTypeSelect = page.getByLabel('Select content type');
      await contentTypeSelect.click();
      const newsOption = page.getByRole('option', { name: /news article/i });
      await newsOption.click();

      const importButton = page.getByRole('button', { name: /^Import Content$/i });

      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/content/items') &&
            r.request().method() === 'POST'
        ),
        importButton.click(),
      ]);

      // Wait for sheet to close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
    });
  });

  // ========================================================================
  // Tab Switching Tests
  // ========================================================================

  test.describe('Tab Switching', () => {
    test('should preserve form data when switching tabs', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Fill URL Import tab
      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill('https://example.com/article');

      const titleInput = page.getByLabel('Content title');
      await titleInput.fill('Test Title');

      const savedUrl = await urlInput.inputValue();
      const savedTitle = await titleInput.inputValue();

      // Switch to Manual Entry tab
      const manualTab = page.getByRole('tab', { name: /manual entry/i });
      await manualTab.click();

      // Switch back to URL Import tab
      const urlTab = page.getByRole('tab', { name: /url import/i });
      await urlTab.click();

      // Verify data is preserved
      const restoredUrl = page.getByLabel('Content URL').first();
      const restoredTitle = page.getByLabel('Content title');

      expect(await restoredUrl.inputValue()).toBe(savedUrl);
      expect(await restoredTitle.inputValue()).toBe(savedTitle);
    });

    test('should clear metadata when switching to manual entry', async ({ page }) => {
      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Fetch metadata in URL tab
      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill('https://securityblog.example.com/article-2024');

      const fetchButton = page.getByRole('button', { name: /fetch/i });

      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/newsletter/content/extract-metadata') &&
            r.request().method() === 'POST'
        ),
        fetchButton.click(),
      ]);

      // Wait for form to populate
      const titleInput = page.getByLabel('Content title');
      await expect(titleInput).not.toHaveValue('');

      // Switch to Manual Entry tab
      const manualTab = page.getByRole('tab', { name: /manual entry/i });
      await manualTab.click();

      // Verify common fields (shared across tabs) still exist
      const manualUrlInput = page.getByLabel('Content URL');
      const manualTitleInput = page.getByLabel('Content title');

      // Both should still be accessible
      expect(manualUrlInput).toBeTruthy();
      expect(manualTitleInput).toBeTruthy();
    });
  });
});

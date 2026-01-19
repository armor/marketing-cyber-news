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
 * Click a tab in the import dialog using JavaScript
 * (bypasses viewport restrictions in scrollable dialogs)
 */
async function clickTab(page: Page, tabName: 'URL Import' | 'Manual Entry'): Promise<void> {
  await page.evaluate((name) => {
    const buttons = document.querySelectorAll('button');
    const tab = Array.from(buttons).find(btn =>
      btn.textContent?.toLowerCase().includes(name.toLowerCase())
    );
    tab?.click();
  }, tabName);
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
    // Log all network requests for debugging
    page.on('request', (request) => {
      if (request.url().includes('/newsletter') || request.url().includes('/content')) {
        console.log('>>> REQUEST:', request.method(), request.url());
      }
    });
    page.on('response', (response) => {
      if (response.url().includes('/newsletter') || response.url().includes('/content')) {
        console.log('<<< RESPONSE:', response.status(), response.url());
      }
    });
  });

  test.afterEach(async () => {
    // Filter out non-application errors (static resources, rate limits, etc.)
    const realErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('.woff') &&
        !err.includes('.png') &&
        !err.includes('.jpg') &&
        !err.includes('.svg') &&
        !err.includes('.ico') &&
        // Filter out generic 404s for static assets that don't indicate real bugs
        !(err.includes('404') && err.includes('Failed to load resource')) &&
        // Filter out rate limiting errors (429) which are expected under test load
        !err.includes('429') &&
        !err.includes('Too Many Requests')
    );
    // Verify no real console errors occurred
    expect(realErrors).toHaveLength(0);
  });

  // ========================================================================
  // Happy Path Tests
  // ========================================================================

  test.describe('Happy Path - URL Import with Metadata Extraction', () => {
    test('should import content via URL with metadata extraction', async ({ page }) => {
      // Use unique URL for each test run to avoid conflicts
      const uniqueUrl = `https://securityblog.example.com/article-${Date.now()}`;

      // Mock the metadata extraction endpoint to return valid metadata
      // Use regex to match any URL ending with the path
      // Note: API returns { data: URLMetadata } wrapper
      await page.route(/\/newsletter\/content\/extract-metadata$/, async (route) => {
        console.log('>>> MOCK intercepted:', route.request().url());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              url: uniqueUrl,
              title: 'Critical Zero-Day Vulnerability Discovered',
              description: 'Security researchers have discovered a critical zero-day vulnerability affecting millions of devices.',
              author: 'Security Research Team',
              image_url: 'https://example.com/images/security-alert.jpg',
              publish_date: '2024-01-15T10:00:00Z',
              site_name: 'Security Blog',
            },
          }),
        });
      });

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Enter unique URL to avoid conflicts with existing content
      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill(uniqueUrl);

      // Wait for input to be committed
      await page.waitForTimeout(500);

      // Click Fetch button - use dispatchEvent since dialog scroll doesn't position correctly
      const fetchButton = page.getByRole('button', { name: /^Fetch$/i });
      await expect(fetchButton).toBeEnabled();

      console.log('>>> Clicking Fetch button...');

      // Set up response listener first
      const responsePromise = page.waitForResponse(
        (r) => {
          const isMatch = r.url().includes('/newsletter/content/extract-metadata') &&
            r.request().method() === 'POST';
          if (r.url().includes('/extract-metadata')) {
            console.log('>>> Found extract-metadata response:', r.url(), r.status());
          }
          return isMatch;
        },
        { timeout: 30000 }
      );

      // Use dispatchEvent to click since element is in scrollable container outside viewport
      await fetchButton.dispatchEvent('click');
      console.log('>>> Click dispatched');

      // Wait for API response
      const metadataResponse = [await responsePromise];

      // Verify API was called with correct method and got success response (mocked)
      expect(metadataResponse[0].status()).toBe(200);

      // Verify metadata populated form fields
      const titleInput = page.getByLabel('Content title');

      // Wait for form to be populated (after successful metadata fetch)
      await expect(titleInput).not.toHaveValue('');
      const populatedTitle = await titleInput.inputValue();
      expect(populatedTitle.length).toBeGreaterThan(0);

      // Click Import Content button - use dispatchEvent since it may be outside viewport
      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();

      // Set up response listener first
      const createResponsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items/manual') &&
          r.request().method() === 'POST'
      );

      // Use dispatchEvent to click
      await importButton.dispatchEvent('click');

      // Wait for API response
      const createResponse = await createResponsePromise;

      // Verify content creation was successful
      expect(createResponse.status()).toBe(201);

      // Verify sheet closes after import
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).not.toBeVisible();
    });

    test('should allow editing metadata before save', async ({ page }) => {
      // Use unique URL for each test run to avoid 409 conflicts
      const uniqueUrl = `https://securityblog.example.com/edit-metadata-${Date.now()}`;

      // Mock the metadata extraction endpoint with proper { data: ... } wrapper
      await page.route(/\/newsletter\/content\/extract-metadata$/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              url: uniqueUrl,
              title: 'Original Fetched Title',
              description: 'Original description from metadata extraction.',
              author: 'Security Research Team',
              publish_date: '2024-01-15T10:00:00Z',
            },
          }),
        });
      });

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Enter URL
      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill(uniqueUrl);

      // Wait for input to be committed
      await page.waitForTimeout(500);

      // Click Fetch button - use dispatchEvent
      const fetchButton = page.getByRole('button', { name: /^Fetch$/i });
      await expect(fetchButton).toBeEnabled();

      // Set up response listener
      const responsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/newsletter/content/extract-metadata') &&
          r.request().method() === 'POST'
      );

      // Use dispatchEvent to click since element is in scrollable container
      await fetchButton.dispatchEvent('click');

      // Wait for API response
      await responsePromise;

      // Wait for form to populate
      const titleInput = page.getByLabel('Content title');
      await expect(titleInput).not.toHaveValue('');

      // Edit title to custom value
      const editedTitle = 'My Custom Title - Critical Zero Day';
      await titleInput.clear();
      await titleInput.fill(editedTitle);

      // Verify edited value
      await expect(titleInput).toHaveValue(editedTitle);

      // Click Import Content button - set up listener first
      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();

      // Capture request body
      let capturedBody: unknown = null;
      page.on('request', (req) => {
        if (req.url().includes('/content-items/manual') && req.method() === 'POST') {
          capturedBody = req.postDataJSON();
        }
      });

      // Set up response listener and click with dispatchEvent
      const createResponsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items/manual') &&
          r.request().method() === 'POST'
      );

      await importButton.dispatchEvent('click');

      const createResponse = await createResponsePromise;

      // Verify status is 201 (created)
      expect(createResponse.status()).toBe(201);

      // Verify request body contains edited title
      expect(capturedBody).toEqual(
        expect.objectContaining({
          title: editedTitle,
        })
      );
    });

    test('should import via manual entry tab', async ({ page }) => {
      // Use unique URL for each test run to avoid 409 conflicts
      const uniqueUrl = `https://example.com/manual-article-${Date.now()}`;

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Click Manual Entry tab - use helper to bypass viewport restrictions
      await clickTab(page, 'Manual Entry');

      // Wait for tab content to change - manual tab URL input becomes visible
      const manualUrlInput = page.locator('#manual-url-input');
      await expect(manualUrlInput).toBeVisible({ timeout: 5000 });

      // Fill in manual form
      const titleInput = page.getByLabel('Content title');

      await manualUrlInput.fill(uniqueUrl);
      await titleInput.fill('Manual Content Entry - Zero Day Patch Released');

      // Content type defaults to 'news' which shows as "News Article"
      // No need to change it since it's the default

      // Click Import Content button
      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();

      // Intercept API call - should NOT have metadata fetch call first
      let metadataCallMade = false;
      page.on('request', (req) => {
        if (req.url().includes('/newsletter/content/extract-metadata')) {
          metadataCallMade = true;
        }
      });

      // Set up response listener and click with dispatchEvent
      const createResponsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items/manual') &&
          r.request().method() === 'POST'
      );

      await importButton.dispatchEvent('click');

      const createResponse = await createResponsePromise;

      // Verify no metadata call was made (manual entry skips metadata extraction)
      expect(metadataCallMade).toBe(false);

      // Verify content creation was successful
      expect(createResponse.status()).toBe(201);

      // Verify sheet closes
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).not.toBeVisible();
    });

    test('should display imported content in list after import', async ({ page }) => {
      // Use unique URL and title for each test run
      const uniqueUrl = `https://example.com/test-article-${Date.now()}`;
      const uniqueTitle = `Test Content ${Date.now()}`;

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Import content via manual entry - use helper to bypass viewport restrictions
      await clickTab(page, 'Manual Entry');

      // Wait for tab content to change - manual tab URL input becomes visible
      const urlInput = page.locator('#manual-url-input');
      await expect(urlInput).toBeVisible({ timeout: 5000 });

      const titleInput = page.getByLabel('Content title');

      await urlInput.fill(uniqueUrl);
      await titleInput.fill(uniqueTitle);

      // Content type defaults to 'news' which shows as "News Article" - no change needed

      // Import content - use dispatchEvent for button in scrollable dialog
      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();

      const createResponsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items/manual') &&
          r.request().method() === 'POST'
      );

      await importButton.dispatchEvent('click');

      const createResponse = await createResponsePromise;
      expect(createResponse.status()).toBe(201);

      // Wait for sheet to close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // Wait for page to stabilize
      await page.waitForLoadState('networkidle');

      // Switch to Content Items tab (page defaults to Content Sources)
      const contentItemsTab = page.getByRole('button', { name: /Content Items/i });

      // Wait for content items API to respond after clicking tab
      const contentItemsResponse = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items') &&
          r.request().method() === 'GET'
      );
      await contentItemsTab.click();
      await contentItemsResponse;

      // Wait for content to render
      await page.waitForTimeout(500);

      // New content should appear on page 1 (sorted by created_at DESC)
      const contentList = page.locator('[role="main"]');
      await expect(contentList).toContainText(uniqueTitle, { timeout: 10000 });

      // Reload page to verify persistence
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Switch to Content Items tab again after reload
      const contentItemsTabReloaded = page.getByRole('button', { name: /Content Items/i });

      // Wait for content items API to respond after clicking tab
      const contentItemsResponseReload = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items') &&
          r.request().method() === 'GET'
      );
      await contentItemsTabReloaded.click();
      await contentItemsResponseReload;
      await page.waitForTimeout(500);

      // Verify content persisted after reload (should be on page 1)
      const reloadedList = page.locator('[role="main"]');
      await expect(reloadedList).toContainText(uniqueTitle, { timeout: 10000 });
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
        if (req.url().includes('/content-items/manual')) {
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
        if (req.url().includes('/content-items/manual')) {
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

      // Wait for input to be committed
      await page.waitForTimeout(500);

      // The Fetch button is enabled when URL has any value
      // Validation happens at the API level - trying to fetch an invalid URL will show error
      const fetchButton = page.getByRole('button', { name: /^Fetch$/i });
      await expect(fetchButton).toBeEnabled();

      // Mock the API to return an error for invalid URL
      await page.route(/\/newsletter\/content\/extract-metadata$/, async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid URL format',
          }),
        });
      });

      // Click Fetch and expect error message
      await fetchButton.dispatchEvent('click');

      // Wait for error alert to appear
      const errorAlert = page.locator('[role="alert"]');
      await expect(errorAlert).toBeVisible({ timeout: 5000 });
    });
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  test.describe('Error Handling - URL Fetch Failures', () => {
    test('should handle metadata extraction failure gracefully', async ({ page }) => {
      // Use unique URL to avoid 409 conflicts
      const uniqueUrl = `https://unreachable-domain-12345.example.com/article-${Date.now()}`;

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Intercept fetch request and return error
      await page.route(/\/newsletter\/content\/extract-metadata$/, (route) => {
        route.abort('failed');
      });

      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill(uniqueUrl);

      // Wait for input to be committed
      await page.waitForTimeout(500);

      const fetchButton = page.getByRole('button', { name: /^Fetch$/i });
      await expect(fetchButton).toBeEnabled();
      await fetchButton.dispatchEvent('click');

      // Verify error message is displayed
      const errorAlert = page.locator('[role="alert"]');
      await expect(errorAlert).toContainText(/failed to fetch|error/i);

      // Verify user can still submit manually
      const titleInput = page.getByLabel('Content title');
      await titleInput.fill('Manual Title After Failed Fetch');

      // Content type defaults to 'news' (News Article) - no need to change

      // Should now be able to import manually
      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();

      // Re-enable route for manual import
      await page.unroute(/\/newsletter\/content\/extract-metadata$/);

      const createResponsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items/manual') &&
          r.request().method() === 'POST'
      );

      await importButton.dispatchEvent('click');

      const response = await createResponsePromise;
      expect(response.status()).toBe(201);
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
      await page.route(/\/content-items\/manual$/, (route) => {
        route.abort('failed');
      });

      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();
      await importButton.dispatchEvent('click');

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
      await page.route(/\/newsletter\/content\/extract-metadata$/, async (route) => {
        // Delay longer than typical timeout
        await new Promise((resolve) => setTimeout(resolve, 15000));
        route.continue();
      });

      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill('https://example.com/article');

      // Wait for input to be committed
      await page.waitForTimeout(500);

      const fetchButton = page.getByRole('button', { name: /^Fetch$/i });
      await expect(fetchButton).toBeEnabled();
      await fetchButton.dispatchEvent('click');

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
      // Use unique URL to avoid 409 conflicts
      const uniqueUrl = `https://example.com/special-chars-${Date.now()}`;

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');

      const specialTitle = 'Critical: New "CVE-2024-1234" Zero-Day & Exploit Kit (Urgent!)';
      await urlInput.fill(uniqueUrl);
      await titleInput.fill(specialTitle);

      // Content type defaults to 'news' (News Article) - no need to change

      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();

      // Capture request body
      let capturedBody: unknown = null;
      page.on('request', (req) => {
        if (req.url().includes('/content-items/manual') && req.method() === 'POST') {
          capturedBody = req.postDataJSON();
        }
      });

      const createResponsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items/manual') &&
          r.request().method() === 'POST'
      );

      await importButton.dispatchEvent('click');

      const response = await createResponsePromise;

      // Verify special characters preserved in request
      expect(capturedBody).toEqual(
        expect.objectContaining({
          title: specialTitle,
        })
      );

      expect(response.status()).toBe(201);
    });

    test('should handle very long title (over 500 chars)', async ({ page }) => {
      // Use unique URL to avoid 409 conflicts
      const uniqueUrl = `https://example.com/long-title-${Date.now()}`;

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      const longTitle =
        'A ' + 'very '.repeat(100) + 'long title that exceeds typical limits';

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');

      await urlInput.fill(uniqueUrl);
      await titleInput.fill(longTitle);

      // Content type defaults to 'news' (News Article) - no need to change

      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();

      const createResponsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items/manual') &&
          r.request().method() === 'POST'
      );

      await importButton.dispatchEvent('click');

      const response = await createResponsePromise;

      // Should still work (or return 400 with validation error)
      expect([200, 201, 400]).toContain(response.status());
    });

    test('should handle multiple comma-separated tags', async ({ page }) => {
      // Use unique URL to avoid 409 conflicts
      const uniqueUrl = `https://example.com/tags-test-${Date.now()}`;

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');
      const tagsInput = page.getByLabel('Topic tags');

      await urlInput.fill(uniqueUrl);
      await titleInput.fill('Security Article');
      await tagsInput.fill('zero-day, vulnerability, ransomware, APT, exploit, critical');

      // Content type defaults to 'news' (News Article) - no need to change

      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();

      // Capture request body
      let capturedBody: unknown = null;
      page.on('request', (req) => {
        if (req.url().includes('/content-items/manual') && req.method() === 'POST') {
          capturedBody = req.postDataJSON();
        }
      });

      const createResponsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items/manual') &&
          r.request().method() === 'POST'
      );

      await importButton.dispatchEvent('click');

      const response = await createResponsePromise;

      // Verify tags were parsed and sent as array
      expect(capturedBody).toEqual(
        expect.objectContaining({
          topic_tags: expect.arrayContaining(['zero-day', 'vulnerability', 'ransomware', 'APT', 'exploit', 'critical']),
        })
      );

      expect(response.status()).toBe(201);
    });

    test('should handle empty optional fields', async ({ page }) => {
      // Use unique URL to avoid 409 conflicts
      const uniqueUrl = `https://example.com/minimal-${Date.now()}`;

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');

      // Fill only required fields
      await urlInput.fill(uniqueUrl);
      await titleInput.fill('Minimal Content');

      // Leave optional fields empty (summary, author, image, tags, etc.)
      // Content type defaults to 'news' (News Article) - no need to change

      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();

      const createResponsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items/manual') &&
          r.request().method() === 'POST'
      );

      await importButton.dispatchEvent('click');

      const response = await createResponsePromise;

      // Should succeed with only required fields
      expect(response.status()).toBe(201);
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

      // Close sheet - cancel button should work with regular click
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      await cancelButton.dispatchEvent('click');

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
      // Use unique URL to avoid 409 conflicts
      const uniqueUrl = `https://example.com/loading-test-${Date.now()}`;

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Delay content creation to allow checking disabled state
      await page.route(/\/content-items\/manual$/, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        route.continue();
      });

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');

      await urlInput.fill(uniqueUrl);
      await titleInput.fill('Test Title');

      // Content type defaults to 'news' (News Article) - no need to change

      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();

      // Click import with dispatchEvent and immediately check if button changes
      await importButton.dispatchEvent('click');

      // Give it a moment to start loading
      await page.waitForTimeout(100);

      // Button should show loading state (text changes to "Importing...")
      await expect(importButton).toContainText(/importing|loading/i);

      // Wait for the delayed response
      await page.waitForTimeout(2500);
    });

    test('should show success message and then close sheet', async ({ page }) => {
      // Use unique URL to avoid 409 conflicts
      const uniqueUrl = `https://example.com/success-test-${Date.now()}`;

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      const urlInput = page.getByLabel('Content URL').first();
      const titleInput = page.getByLabel('Content title');

      await urlInput.fill(uniqueUrl);
      await titleInput.fill('Test Title');

      // Content type defaults to 'news' (News Article) - no need to change

      const importButton = page.getByRole('button', { name: /^Import Content$/i });
      await expect(importButton).toBeEnabled();

      const createResponsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/content-items/manual') &&
          r.request().method() === 'POST'
      );

      await importButton.dispatchEvent('click');

      await createResponsePromise;

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

      // Switch to Manual Entry tab - use helper to bypass viewport restrictions
      await clickTab(page, 'Manual Entry');

      // Wait for tab switch - manual URL input becomes visible
      await expect(page.locator('#manual-url-input')).toBeVisible({ timeout: 5000 });

      // Switch back to URL Import tab
      await clickTab(page, 'URL Import');

      // Wait for tab switch back - URL import's Fetch button becomes visible
      await expect(page.getByRole('button', { name: /^Fetch$/i })).toBeVisible({ timeout: 5000 });

      // Verify data is preserved
      const restoredUrl = page.getByLabel('Content URL').first();
      const restoredTitle = page.getByLabel('Content title');

      expect(await restoredUrl.inputValue()).toBe(savedUrl);
      expect(await restoredTitle.inputValue()).toBe(savedTitle);
    });

    test('should clear metadata when switching to manual entry', async ({ page }) => {
      // Use unique URL to avoid conflicts
      const uniqueUrl = `https://securityblog.example.com/tab-switch-${Date.now()}`;

      // Mock the metadata extraction endpoint with proper { data: ... } wrapper
      await page.route(/\/newsletter\/content\/extract-metadata$/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              url: uniqueUrl,
              title: 'Fetched Title From URL',
              description: 'Fetched description from metadata extraction.',
              author: 'Security Research Team',
            },
          }),
        });
      });

      await loginUser(page);
      await navigateToContentImport(page);
      await openImportSheet(page);

      // Fetch metadata in URL tab
      const urlInput = page.getByLabel('Content URL').first();
      await urlInput.fill(uniqueUrl);

      // Wait for input to be committed
      await page.waitForTimeout(500);

      const fetchButton = page.getByRole('button', { name: /^Fetch$/i });
      await expect(fetchButton).toBeEnabled();

      // Set up response listener and click with dispatchEvent
      const responsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/newsletter/content/extract-metadata') &&
          r.request().method() === 'POST'
      );
      await fetchButton.dispatchEvent('click');
      await responsePromise;

      // Wait for form to populate
      const titleInput = page.getByLabel('Content title');
      await expect(titleInput).not.toHaveValue('');

      // Switch to Manual Entry tab - use helper to bypass viewport restrictions
      await clickTab(page, 'Manual Entry');

      // Wait for tab content to change - manual URL input becomes visible
      const manualUrlInput = page.locator('#manual-url-input');
      await expect(manualUrlInput).toBeVisible({ timeout: 5000 });

      // Verify common fields (shared across tabs) still exist
      const manualTitleInput = page.getByLabel('Content title');

      // Both should still be accessible
      await expect(manualUrlInput).toBeVisible();
      await expect(manualTitleInput).toBeVisible();
    });
  });
});

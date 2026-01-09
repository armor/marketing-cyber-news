/**
 * Claims Library CRUD E2E Tests
 *
 * MANDATORY: Deep testing that verifies actual behavior (API calls, persistence)
 *
 * Coverage:
 * - Happy path: CRUD operations with API verification
 * - Failure path: Invalid input handling
 * - Null/empty states: Empty list, missing required fields
 * - Edge cases: Boundary validation
 * - Data persistence: Reload verification
 */

import { test, expect } from '@playwright/test';
import { loginAs, clearAuthState } from '../helpers/auth';
import {
  verifyApiCall,
  verifyValidationBlocks,
  verifyPersistence,
} from '../helpers/api-assertions';
import { testConfig } from '../helpers/test-credentials';

const API_BASE_URL = testConfig.apiUrl || 'http://localhost:8080';

test.describe('Claims Library CRUD', () => {
  // Console error tracking
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await clearAuthState(page);
    await loginAs(page, 'admin');
  });

  test.afterEach(async () => {
    // MANDATORY: Zero console errors allowed
    expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test.describe('API Direct - CRUD Operations', () => {
    test('should create claim with valid data - verify API 201', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Industry-leading cybersecurity protection',
          claim_type: 'claim',
          category: 'Security',
          source_reference: 'https://example.com/whitepaper.pdf',
          tags: ['security', 'protection'],
          notes: 'Approved by legal team',
        },
      });

      // MANDATORY: Verify HTTP 201
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.claim_text).toBe('Industry-leading cybersecurity protection');
      expect(body.data.claim_type).toBe('claim');
      expect(body.data.category).toBe('Security');
      expect(body.data.approval_status).toBe('pending');
    });

    test('should create disclaimer claim type', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Results may vary based on configuration',
          claim_type: 'disclaimer',
          category: 'Legal',
        },
      });

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.data.claim_type).toBe('disclaimer');
    });

    test('should create do_not_say claim type', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Guaranteed 100% protection',
          claim_type: 'do_not_say',
          category: 'Compliance',
          notes: 'Cannot make guarantee claims',
        },
      });

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.data.claim_type).toBe('do_not_say');
    });

    test('should list claims with pagination', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/v1/claims?page=1&page_size=20`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
      expect(body.meta.page).toBe(1);
      expect(body.meta.page_size).toBe(20);
    });

    test('should filter claims by type', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/v1/claims?claim_type=do_not_say`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      // All returned claims should be do_not_say type
      for (const claim of body.data) {
        expect(claim.claim_type).toBe('do_not_say');
      }
    });

    test('should filter claims by approval status', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/v1/claims?approval_status=pending`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      for (const claim of body.data) {
        expect(claim.approval_status).toBe('pending');
      }
    });

    test('should get single claim by ID', async ({ request }) => {
      // Create claim first
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Test claim for GET operation',
          claim_type: 'claim',
          category: 'Test',
        },
      });

      const created = await createResp.json();
      const claimId = created.data.id;

      // Get by ID
      const getResp = await request.get(`${API_BASE_URL}/v1/claims/${claimId}`);

      expect(getResp.ok()).toBeTruthy();
      const body = await getResp.json();
      expect(body.data.id).toBe(claimId);
      expect(body.data.claim_text).toBe('Test claim for GET operation');
    });

    test('should update claim - verify API 200', async ({ request }) => {
      // Create claim first
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Original claim text',
          claim_type: 'claim',
          category: 'Original',
        },
      });

      const created = await createResp.json();
      const claimId = created.data.id;

      // Update
      const updateResp = await request.put(`${API_BASE_URL}/v1/claims/${claimId}`, {
        data: {
          claim_text: 'Updated claim text',
          claim_type: 'claim',
          category: 'Updated',
        },
      });

      // MANDATORY: Verify HTTP 200
      expect(updateResp.status()).toBe(200);

      const updated = await updateResp.json();
      expect(updated.data.claim_text).toBe('Updated claim text');
      expect(updated.data.category).toBe('Updated');
    });

    test('should delete claim - verify API 204', async ({ request }) => {
      // Create claim first
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Claim to be deleted',
          claim_type: 'claim',
          category: 'Delete Test',
        },
      });

      const created = await createResp.json();
      const claimId = created.data.id;

      // Delete
      const deleteResp = await request.delete(`${API_BASE_URL}/v1/claims/${claimId}`);

      // MANDATORY: Verify HTTP 204
      expect(deleteResp.status()).toBe(204);

      // Verify deleted
      const verifyResp = await request.get(`${API_BASE_URL}/v1/claims/${claimId}`);
      expect(verifyResp.status()).toBe(404);
    });

    test('should complete full CRUD lifecycle', async ({ request }) => {
      // CREATE
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'CRUD lifecycle test claim',
          claim_type: 'disclaimer',
          category: 'CRUD Test',
          tags: ['test'],
        },
      });
      expect(createResp.status()).toBe(201);
      const created = await createResp.json();
      const claimId = created.data.id;

      // READ
      const readResp = await request.get(`${API_BASE_URL}/v1/claims/${claimId}`);
      expect(readResp.ok()).toBeTruthy();
      const read = await readResp.json();
      expect(read.data.claim_text).toBe('CRUD lifecycle test claim');

      // UPDATE
      const updateResp = await request.put(`${API_BASE_URL}/v1/claims/${claimId}`, {
        data: {
          claim_text: 'Updated CRUD lifecycle claim',
          claim_type: 'disclaimer',
          category: 'CRUD Test Updated',
        },
      });
      expect(updateResp.ok()).toBeTruthy();
      const updated = await updateResp.json();
      expect(updated.data.claim_text).toBe('Updated CRUD lifecycle claim');

      // DELETE
      const deleteResp = await request.delete(`${API_BASE_URL}/v1/claims/${claimId}`);
      expect(deleteResp.status()).toBe(204);

      // VERIFY DELETED
      const verifyResp = await request.get(`${API_BASE_URL}/v1/claims/${claimId}`);
      expect(verifyResp.status()).toBe(404);
    });
  });

  test.describe('Validation - Invalid Input Rejection', () => {
    test('should reject claim with empty claim_text', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: '',
          claim_type: 'claim',
          category: 'Test',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject claim with missing required fields', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Test claim',
          // Missing claim_type and category
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject claim with invalid claim_type', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Test claim',
          claim_type: 'invalid_type',
          category: 'Test',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject update with empty claim_text', async ({ request }) => {
      // Create valid claim first
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Valid claim',
          claim_type: 'claim',
          category: 'Test',
        },
      });

      const created = await createResp.json();
      const claimId = created.data.id;

      // Try to update with empty text
      const updateResp = await request.put(`${API_BASE_URL}/v1/claims/${claimId}`, {
        data: {
          claim_text: '',
          claim_type: 'claim',
          category: 'Test',
        },
      });

      expect(updateResp.status()).toBe(400);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle very long claim text', async ({ request }) => {
      const longText = 'A'.repeat(5000);

      const response = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: longText,
          claim_type: 'claim',
          category: 'Edge Case',
        },
      });

      // Should either accept or reject gracefully (not 500)
      expect([201, 400]).toContain(response.status());
    });

    test('should handle special characters in claim text', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Test with special chars: <>&"\'{}[]',
          claim_type: 'claim',
          category: 'Special',
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.data.claim_text).toContain('<>&');
    });

    test('should handle unicode in claim text', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Unicode test: 日本語 中文 한국어 émojis: 🔒🛡️',
          claim_type: 'claim',
          category: 'Unicode',
        },
      });

      expect(response.status()).toBe(201);
    });

    test('should handle empty tags array', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Claim with empty tags',
          claim_type: 'claim',
          category: 'Empty Tags',
          tags: [],
        },
      });

      expect(response.status()).toBe(201);
    });

    test('should return 404 for non-existent claim ID', async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request.get(`${API_BASE_URL}/v1/claims/${fakeId}`);

      expect(response.status()).toBe(404);
    });
  });

  test.describe('Categories API', () => {
    test('should list claim categories', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/v1/claims/categories`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  test.describe('Search API', () => {
    test('should search claims by text', async ({ request }) => {
      // Create a claim with unique text
      const uniqueText = `SearchTest_${Date.now()}`;
      await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: uniqueText,
          claim_type: 'claim',
          category: 'Search Test',
        },
      });

      // Search for it
      const response = await request.get(
        `${API_BASE_URL}/v1/claims/search?q=${uniqueText}`
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].claim_text).toContain(uniqueText);
    });

    test('should return empty array for no matches', async ({ request }) => {
      const response = await request.get(
        `${API_BASE_URL}/v1/claims/search?q=xyznonexistentquery12345`
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data).toEqual([]);
    });
  });

  test.describe('UI - Create Flow with Deep Verification', () => {
    test('should create claim via UI - verify API call and persistence', async ({ page }) => {
      await page.goto('/newsletter/claims');
      await page.waitForLoadState('networkidle');

      // Click Add Claim button
      await page.click('button:has-text("Add Claim")');
      await page.waitForSelector('h2:has-text("Add New Claim")');

      // Fill form
      const uniqueText = `UI Test Claim ${Date.now()}`;
      await page.fill('textarea#claim_text', uniqueText);
      await page.selectOption('select:has-text("Select type")', 'claim');

      // Handle category - either select existing or enter new
      const newCategoryBtn = page.locator('button:has-text("New")');
      if (await newCategoryBtn.isVisible()) {
        await newCategoryBtn.click();
      }
      await page.fill('input#category', 'UI Test Category');

      // MANDATORY: Verify API call on submit
      const response = await verifyApiCall(
        page,
        () => page.click('button:has-text("Create Claim")'),
        { method: 'POST', urlPattern: '/claims' }
      );

      expect(response.status()).toBe(201);

      // Wait for dialog to close
      await page.waitForSelector('h2:has-text("Add New Claim")', { state: 'hidden' });

      // MANDATORY: Verify persistence after reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`text=${uniqueText}`)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('UI - Validation Blocking', () => {
    test('should block API call when form is invalid', async ({ page }) => {
      await page.goto('/newsletter/claims');
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("Add Claim")');
      await page.waitForSelector('h2:has-text("Add New Claim")');

      // Try to submit empty form
      // MANDATORY: Verify validation BLOCKS API call
      await verifyValidationBlocks(
        page,
        () => page.click('button:has-text("Create Claim")'),
        '/claims'
      );
    });
  });
});

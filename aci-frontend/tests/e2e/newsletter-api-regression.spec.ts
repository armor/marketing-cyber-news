/**
 * E2E API Regression Tests: Newsletter Configuration API
 *
 * Tests the newsletter configuration API against the REAL backend.
 * This test validates the full CRUD workflow for newsletter configurations.
 *
 * Prerequisites:
 * - Backend running at http://localhost:10081
 * - Test users with password TestPass123
 * - Newsletter migration applied (tables exist)
 *
 * Run with: npx playwright test tests/e2e/newsletter-api-regression.spec.ts
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE_URL = 'http://127.0.0.1:10081/v1';
const PASSWORD = 'TestPass123';

// Test user
const ADMIN_USER = {
  email: 'admin@test.com',
  password: PASSWORD,
};

let authToken: string | null = null;

/**
 * Helper to get auth token
 */
async function getAuthToken(request: APIRequestContext): Promise<string> {
  if (authToken) return authToken;

  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      email: ADMIN_USER.email,
      password: ADMIN_USER.password,
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  authToken = data.data.access_token;
  return authToken as string;
}

/**
 * Helper to clean up a config
 */
async function cleanupConfig(request: APIRequestContext, token: string, configId: string) {
  try {
    await request.delete(`${API_BASE_URL}/newsletter-configs/${configId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Ignore cleanup errors
  }
}

test.describe('Newsletter Configuration API - Regression Tests', () => {
  test.describe.configure({ mode: 'serial' }); // Run tests in sequence

  test('1. Auth: Can obtain valid JWT token', async ({ request }) => {
    console.log('\n=== TEST: Obtain auth token ===');

    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: ADMIN_USER.email,
        password: ADMIN_USER.password,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.data).toBeDefined();
    expect(data.data.access_token).toBeDefined();
    expect(typeof data.data.access_token).toBe('string');
    expect(data.data.access_token.length).toBeGreaterThan(50);

    authToken = data.data.access_token;
    console.log(`Auth token obtained (length: ${authToken?.length})`);
  });

  test('2. List: Can list newsletter configurations', async ({ request }) => {
    console.log('\n=== TEST: List newsletter configurations ===');

    const token = await getAuthToken(request);

    const response = await request.get(`${API_BASE_URL}/newsletter-configs?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBeTruthy();
    expect(data.meta).toBeDefined();
    expect(data.meta.total_count).toBeGreaterThanOrEqual(0);

    console.log(`Listed ${data.data.length} configurations (total: ${data.meta.total_count})`);
  });

  test('3. CRUD: Full create-read-update-delete workflow', async ({ request }) => {
    console.log('\n=== TEST: Full CRUD workflow ===');

    const token = await getAuthToken(request);

    // CREATE
    console.log('Step 1: CREATE');
    const configData = {
      name: `E2E Test Config ${Date.now()}`,
      description: 'Automated E2E test configuration',
      cadence: 'weekly',
      send_day_of_week: 1,
      send_time_utc: '2025-01-01T09:00:00Z',
      timezone: 'America/New_York',
      max_blocks: 5,
      education_ratio_min: 0.3,
      content_freshness_days: 7,
      hero_topic_priority: 'critical',
      framework_focus: 'NIST',
      subject_line_style: 'pain_first',
      max_metaphors: 2,
      banned_phrases: ['click here', 'urgent', 'act now'],
      approval_tier: 'tier1',
      risk_level: 'standard',
      ai_provider: 'anthropic',
      ai_model: 'claude-sonnet-4-20250514',
      prompt_version: 1,
      is_active: true,
    };

    const createResponse = await request.post(`${API_BASE_URL}/newsletter-configs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: configData,
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();

    expect(createData.data).toBeDefined();
    expect(createData.data.id).toBeDefined();
    expect(createData.data.name).toBe(configData.name);
    expect(createData.data.banned_phrases).toEqual(configData.banned_phrases);

    const configId = createData.data.id;
    console.log(`Created config: ${configId}`);

    // READ
    console.log('Step 2: READ');
    const readResponse = await request.get(`${API_BASE_URL}/newsletter-configs/${configId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(readResponse.ok()).toBeTruthy();
    const readData = await readResponse.json();

    expect(readData.data.id).toBe(configId);
    expect(readData.data.name).toBe(configData.name);
    expect(Array.isArray(readData.data.banned_phrases)).toBeTruthy();
    console.log(`Read config successfully, banned_phrases: ${JSON.stringify(readData.data.banned_phrases)}`);

    // UPDATE
    console.log('Step 3: UPDATE');
    const updateData = {
      ...configData,
      name: `E2E Test Config Updated ${Date.now()}`,
      description: 'Updated E2E test configuration',
      timezone: 'America/Chicago',
      max_blocks: 6,
      banned_phrases: ['updated phrase', 'test phrase'],
    };

    const updateResponse = await request.put(`${API_BASE_URL}/newsletter-configs/${configId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: updateData,
    });

    expect(updateResponse.ok()).toBeTruthy();
    const updatedData = await updateResponse.json();

    expect(updatedData.data.name).toBe(updateData.name);
    expect(updatedData.data.timezone).toBe(updateData.timezone);
    expect(updatedData.data.banned_phrases).toEqual(updateData.banned_phrases);
    console.log(`Updated config successfully, new banned_phrases: ${JSON.stringify(updatedData.data.banned_phrases)}`);

    // VERIFY IN LIST
    console.log('Step 4: VERIFY in list');
    const listResponse = await request.get(`${API_BASE_URL}/newsletter-configs?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    const foundConfig = listData.data.find((c: { id: string }) => c.id === configId);

    expect(foundConfig).toBeDefined();
    expect(foundConfig.name).toContain('Updated');
    console.log(`Found updated config in list`);

    // DELETE
    console.log('Step 5: DELETE');
    const deleteResponse = await request.delete(`${API_BASE_URL}/newsletter-configs/${configId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(deleteResponse.ok()).toBeTruthy();
    console.log(`Deleted config: ${configId}`);

    // VERIFY DELETED
    console.log('Step 6: VERIFY deleted');
    const verifyResponse = await request.get(`${API_BASE_URL}/newsletter-configs/${configId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(verifyResponse.status()).toBe(404);
    console.log('Verified config no longer exists');
  });

  test('4. TEXT[] Array: banned_phrases field correctly handles PostgreSQL TEXT[] array', async ({ request }) => {
    console.log('\n=== TEST: TEXT[] array handling for banned_phrases ===');

    const token = await getAuthToken(request);

    // Create with specific banned phrases to test TEXT[] handling
    const configData = {
      name: `TEXT Array Test ${Date.now()}`,
      description: 'Testing PostgreSQL TEXT[] handling',
      cadence: 'weekly',
      send_day_of_week: 1,
      send_time_utc: '2025-01-01T09:00:00Z',
      timezone: 'America/New_York',
      max_blocks: 5,
      education_ratio_min: 0.3,
      content_freshness_days: 7,
      subject_line_style: 'pain_first',
      max_metaphors: 2,
      banned_phrases: [
        'phrase with spaces',
        'special-chars!@#',
        'unicode: cafe',
        'multi word phrase here',
      ],
      approval_tier: 'tier1',
      risk_level: 'standard',
      ai_provider: 'anthropic',
      ai_model: 'claude-sonnet-4-20250514',
      prompt_version: 1,
      is_active: true,
    };

    // Create
    const createResponse = await request.post(`${API_BASE_URL}/newsletter-configs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: configData,
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const configId = createData.data.id;

    // Verify banned_phrases is returned as array
    expect(Array.isArray(createData.data.banned_phrases)).toBeTruthy();
    expect(createData.data.banned_phrases.length).toBe(4);
    console.log(`Created banned_phrases: ${JSON.stringify(createData.data.banned_phrases)}`);

    // Read back
    const readResponse = await request.get(`${API_BASE_URL}/newsletter-configs/${configId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(readResponse.ok()).toBeTruthy();
    const readData = await readResponse.json();

    // Verify it's still an array after read
    expect(Array.isArray(readData.data.banned_phrases)).toBeTruthy();
    expect(readData.data.banned_phrases).toContain('phrase with spaces');
    expect(readData.data.banned_phrases).toContain('special-chars!@#');
    console.log(`Read banned_phrases: ${JSON.stringify(readData.data.banned_phrases)}`);

    // List and verify
    const listResponse = await request.get(`${API_BASE_URL}/newsletter-configs?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    const found = listData.data.find((c: { id: string }) => c.id === configId);

    expect(found).toBeDefined();
    expect(Array.isArray(found.banned_phrases)).toBeTruthy();
    console.log(`List banned_phrases: ${JSON.stringify(found.banned_phrases)}`);

    // Cleanup
    await cleanupConfig(request, token, configId);
    console.log('TEXT[] array handling verified successfully!');
  });

  test('5. Error Handling: Create with invalid data returns error', async ({ request }) => {
    console.log('\n=== TEST: Error handling for invalid data ===');

    const token = await getAuthToken(request);

    // Missing required fields
    const invalidData = {
      name: 'Invalid Config',
      // Missing: cadence, timezone, max_blocks, etc.
    };

    const response = await request.post(`${API_BASE_URL}/newsletter-configs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: invalidData,
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 422, 500]).toContain(response.status());

    const data = await response.json();
    expect(data.error).toBeDefined();
    console.log(`Error response: ${data.error.code} - ${data.error.message}`);
  });

  test('6. Error Handling: Unauthorized request returns 401', async ({ request }) => {
    console.log('\n=== TEST: Unauthorized access ===');

    const response = await request.get(`${API_BASE_URL}/newsletter-configs`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });

    expect(response.status()).toBe(401);
    console.log('Unauthorized request correctly rejected');
  });

  test('7. Error Handling: Not found returns 404', async ({ request }) => {
    console.log('\n=== TEST: Not found handling ===');

    const token = await getAuthToken(request);
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const response = await request.get(`${API_BASE_URL}/newsletter-configs/${fakeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status()).toBe(404);
    console.log('Not found correctly returned');
  });
});

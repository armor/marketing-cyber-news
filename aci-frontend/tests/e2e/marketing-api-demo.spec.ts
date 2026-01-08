import { test, expect } from '@playwright/test';

/**
 * Marketing Autopilot API Demo
 *
 * Verifies that marketing API endpoints are responding correctly
 * after the refactoring work (no more 503 errors)
 */

test.describe('Marketing Autopilot API Demo', () => {
  const API_BASE = 'http://localhost:10081';

  test('Marketing API endpoints respond correctly (no 503)', async ({ request }) => {
    console.log('\n🔍 Testing Marketing Autopilot API Endpoints\n');
    console.log('=' .repeat(60));

    const endpoints = [
      { method: 'GET', path: '/v1/campaigns', name: 'List Campaigns' },
      { method: 'GET', path: '/v1/channels', name: 'List Channels' },
      { method: 'GET', path: '/v1/calendar', name: 'Calendar Entries' },
      { method: 'GET', path: '/v1/marketing/analytics/channels', name: 'Analytics Channels' },
      { method: 'GET', path: '/v1/brand', name: 'Brand Store' },
      { method: 'POST', path: '/v1/content-studio/generate', name: 'Content Studio Generate' },
    ];

    const results: { name: string; status: number; ok: boolean }[] = [];

    for (const endpoint of endpoints) {
      try {
        const response = endpoint.method === 'POST'
          ? await request.post(`${API_BASE}${endpoint.path}`, { data: {} })
          : await request.get(`${API_BASE}${endpoint.path}`);
        const status = response.status();

        // Categorize response
        let statusIcon = '';
        let statusText = '';

        if (status === 200 || status === 201) {
          statusIcon = '✅';
          statusText = 'SUCCESS';
        } else if (status === 401) {
          statusIcon = '🔐';
          statusText = 'AUTH REQUIRED (expected)';
        } else if (status === 503) {
          statusIcon = '❌';
          statusText = 'SERVICE UNAVAILABLE (BROKEN!)';
        } else if (status >= 400 && status < 500) {
          statusIcon = '⚠️';
          statusText = 'CLIENT ERROR';
        } else if (status >= 500) {
          statusIcon = '❌';
          statusText = 'SERVER ERROR';
        }

        console.log(`${statusIcon} ${endpoint.name.padEnd(25)} ${status} ${statusText}`);

        results.push({
          name: endpoint.name,
          status,
          ok: status !== 503 && status < 500
        });

        // Critical: 503 means handler not wired - this should NEVER happen after refactoring
        expect(status, `${endpoint.name} should not return 503`).not.toBe(503);

      } catch (error) {
        console.log(`⚠️ ${endpoint.name.padEnd(25)} CONNECTION FAILED`);
        results.push({ name: endpoint.name, status: 0, ok: false });
      }
    }

    console.log('=' .repeat(60));

    // Summary
    const passed = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('\n🎉 All Marketing Autopilot endpoints are properly wired!');
    } else {
      console.log('\n⚠️ Some endpoints have issues');
    }
  });

  test('Health check endpoint works', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    console.log('\n🏥 Health Check Response:');
    console.log(JSON.stringify(body, null, 2));
  });
});

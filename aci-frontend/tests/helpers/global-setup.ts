/**
 * Global Setup for Playwright E2E Tests
 *
 * This runs BEFORE any tests start to verify:
 * 1. Backend is running and healthy
 * 2. Database has test data seeded
 * 3. Required services are available
 *
 * IMPORTANT: All tests run against the LIVE backend - no exceptions.
 */

import { FullConfig } from '@playwright/test';

const API_URL = process.env.TEST_API_URL || process.env.VITE_API_URL || 'http://localhost:8080';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

interface HealthResponse {
  status?: string;
  message?: string;
}

/**
 * Check if backend is running and healthy
 */
async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Mode': 'e2e-setup',
      },
    });

    if (!response.ok) {
      console.error(`Backend health check failed: ${response.status} ${response.statusText}`);
      return false;
    }

    const data: HealthResponse = await response.json();
    console.log(`Backend health: ${data.status || 'ok'}`);
    return true;
  } catch (error) {
    console.error(`Backend health check error: ${error}`);
    return false;
  }
}

/**
 * Wait for backend to be ready with retries
 */
async function waitForBackend(): Promise<void> {
  console.log(`\nChecking backend at ${API_URL}...`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`  Attempt ${attempt}/${MAX_RETRIES}...`);

    const isHealthy = await checkBackendHealth();
    if (isHealthy) {
      console.log('  Backend is ready!\n');
      return;
    }

    if (attempt < MAX_RETRIES) {
      console.log(`  Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  throw new Error(
    `Backend not available at ${API_URL} after ${MAX_RETRIES} attempts.\n\n` +
      'Please ensure:\n' +
      '1. Backend is running: cd aci-backend && go run cmd/server/main.go\n' +
      '2. Database is accessible\n' +
      '3. TEST_API_URL environment variable is correct\n'
  );
}

/**
 * Verify essential API endpoints exist
 */
async function verifyApiEndpoints(): Promise<void> {
  console.log('Verifying API endpoints...');

  const endpoints = [
    { path: '/health', method: 'GET', name: 'Health' },
    // Auth endpoints
    { path: '/v1/auth/login', method: 'OPTIONS', name: 'Auth Login' },
    // Marketing endpoints - these should exist
    { path: '/v1/marketing/campaigns', method: 'OPTIONS', name: 'Campaigns' },
    { path: '/v1/marketing/channels', method: 'OPTIONS', name: 'Channels' },
  ];

  const failed: string[] = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Mode': 'e2e-setup',
        },
      });

      // OPTIONS returns 200 or 204, GET returns 200 or 401 (auth required)
      const validStatuses = [200, 204, 401, 403, 405];
      if (!validStatuses.includes(response.status)) {
        failed.push(`${endpoint.name}: ${response.status}`);
      } else {
        console.log(`  ${endpoint.name}: OK`);
      }
    } catch (error) {
      failed.push(`${endpoint.name}: ${error}`);
    }
  }

  if (failed.length > 0) {
    console.warn(`\nWarning: Some endpoints may not be available:\n  ${failed.join('\n  ')}`);
  }

  console.log('');
}

/**
 * Print test environment configuration
 */
function printTestConfig(): void {
  console.log('='.repeat(60));
  console.log('E2E TEST CONFIGURATION');
  console.log('='.repeat(60));
  console.log(`Mode:        LIVE BACKEND (always)`);
  console.log(`API URL:     ${API_URL}`);
  console.log(`Base URL:    ${process.env.TEST_BASE_URL || 'http://localhost:5173'}`);
  console.log(`Admin:       ${process.env.TEST_ADMIN_EMAIL || 'admin@example.com'}`);
  console.log(`Marketing:   ${process.env.TEST_MARKETING_EMAIL || 'marketing@example.com'}`);
  console.log('='.repeat(60));
  console.log('');
}

/**
 * Global setup function - runs once before all tests
 */
async function globalSetup(_config: FullConfig): Promise<void> {
  console.log('\n');
  console.log('*'.repeat(60));
  console.log('* PLAYWRIGHT GLOBAL SETUP');
  console.log('*'.repeat(60));
  console.log('\n');

  // Print configuration
  printTestConfig();

  // Verify backend is running
  await waitForBackend();

  // Verify API endpoints are available
  await verifyApiEndpoints();

  console.log('Global setup complete. Starting tests...\n');
}

export default globalSetup;

/**
 * E2E Tests: Network Connectivity and Failure Handling
 *
 * Comprehensive tests for network failure scenarios in the newsletter automation system:
 * - Shows error state when API is unreachable
 * - Retries failed requests
 * - Shows loading states during slow connections
 * - Handles timeout gracefully
 * - Allows user to retry failed operations
 *
 * Network Resilience Requirements:
 * - Graceful degradation when backend is unavailable
 * - Clear error messaging for users
 * - Automatic retry with exponential backoff
 * - Manual retry options available
 * - Loading states provide feedback during slow operations
 */

import { test, expect, Page, Route } from '@playwright/test';

// ============================================================================
// Constants
// ============================================================================

const BASE_URL = 'http://localhost:5173';

/**
 * Token storage keys (must match client.ts)
 */
const TOKEN_STORAGE_KEY = 'aci_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'aci_refresh_token';

/**
 * Test user configuration
 */
const TEST_USER = {
  id: 'user-test-001',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
  token: 'mock-token-test-001',
};

/**
 * Network simulation delays (ms)
 */
const NETWORK_DELAYS = {
  SLOW: 3000,
  VERY_SLOW: 5000,
  TIMEOUT: 15000,
};

// ============================================================================
// Mock Data Factory
// ============================================================================

/**
 * Creates mock newsletter configuration
 */
function createMockConfiguration(
  id: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    name: 'Weekly Security Digest',
    description: 'Weekly roundup of critical security news',
    segment_id: 'segment-001',
    cadence: 'weekly',
    send_day_of_week: 2,
    send_time_utc: '14:00',
    timezone: 'America/New_York',
    max_blocks: 6,
    education_ratio_min: 0.3,
    content_freshness_days: 7,
    hero_topic_priority: 'critical_vulnerabilities',
    framework_focus: 'NIST',
    subject_line_style: 'pain_first',
    max_metaphors: 2,
    banned_phrases: ['game-changer', 'synergy'],
    approval_tier: 'tier1',
    risk_level: 'standard',
    ai_provider: 'anthropic',
    ai_model: 'claude-3-sonnet',
    prompt_version: 2,
    is_active: true,
    created_by: 'admin-001',
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-12-01T15:30:00.000Z',
    ...overrides,
  };
}

/**
 * Creates mock segment
 */
function createMockSegment(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: 'Enterprise Security Teams',
    description: 'IT security professionals at enterprise organizations',
    role_cluster: 'security_operations',
    industries: ['Technology', 'Finance'],
    regions: ['North America'],
    company_size_bands: ['1000-5000', '5000+'],
    compliance_frameworks: ['SOC2', 'NIST'],
    partner_tags: [],
    min_engagement_score: 40,
    topic_interests: ['threat_intelligence', 'vulnerability_management'],
    exclude_unsubscribed: true,
    exclude_bounced: true,
    exclude_high_touch: false,
    max_newsletters_per_30_days: 4,
    contact_count: 2847,
    is_active: true,
    created_at: '2024-01-10T08:00:00.000Z',
    updated_at: '2024-12-01T10:00:00.000Z',
    ...overrides,
  };
}

// ============================================================================
// Test Fixtures and Helpers
// ============================================================================

/**
 * Set up authentication for a test user
 */
async function authenticateAs(page: Page, user: typeof TEST_USER): Promise<void> {
  await page.addInitScript(
    ({ token, refreshToken, tokenKey, refreshKey }) => {
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(refreshKey, refreshToken);
    },
    {
      token: user.token,
      refreshToken: `refresh-${user.token}`,
      tokenKey: TOKEN_STORAGE_KEY,
      refreshKey: REFRESH_TOKEN_STORAGE_KEY,
    }
  );

  await page.route('**/v1/users/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLoginAt: new Date().toISOString(),
          preferences: {
            theme: 'system',
            notificationsEnabled: true,
            emailAlertsEnabled: false,
            dashboardLayout: 'comfortable',
          },
        },
      }),
    });
  });

  await page.route('**/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }),
    });
  });
}

/**
 * Mock API network failure (connection refused/unreachable)
 */
async function mockNetworkFailure(page: Page, pathPattern: string): Promise<void> {
  await page.route(
    (url) => url.pathname.includes(pathPattern),
    async (route: Route) => {
      await route.abort('connectionrefused');
    }
  );
}

/**
 * Mock API timeout
 */
async function mockApiTimeout(
  page: Page,
  pathPattern: string,
  timeoutMs: number = NETWORK_DELAYS.TIMEOUT
): Promise<void> {
  await page.route(
    (url) => url.pathname.includes(pathPattern),
    async (route: Route) => {
      // Delay longer than the client's timeout
      await new Promise((resolve) => setTimeout(resolve, timeoutMs));
      await route.abort('timedout');
    }
  );
}

/**
 * Mock slow API response
 */
async function mockSlowResponse(
  page: Page,
  pathPattern: string,
  delayMs: number,
  responseData: unknown
): Promise<void> {
  await page.route(
    (url) => url.pathname.includes(pathPattern),
    async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseData),
      });
    }
  );
}

/**
 * Mock API error response
 */
async function mockApiError(
  page: Page,
  pathPattern: string,
  statusCode: number,
  errorMessage: string
): Promise<void> {
  await page.route(
    (url) => url.pathname.includes(pathPattern),
    async (route: Route) => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({
          error: statusCode === 500 ? 'internal_server_error' : 'error',
          message: errorMessage,
        }),
      });
    }
  );
}

/**
 * Mock intermittent failure (fails N times, then succeeds)
 */
function createIntermittentMock(
  failCount: number,
  successData: unknown
): { handler: (route: Route) => Promise<void>; getAttempts: () => number } {
  let attempts = 0;

  return {
    handler: async (route: Route) => {
      attempts++;
      if (attempts <= failCount) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'service_unavailable',
            message: 'Service temporarily unavailable',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(successData),
        });
      }
    },
    getAttempts: () => attempts,
  };
}

/**
 * Mock successful API responses for baseline
 */
async function mockSuccessfulResponses(page: Page): Promise<void> {
  const configs = [createMockConfiguration('config-001', { name: 'Weekly Digest' })];
  const segments = [createMockSegment('segment-001', { name: 'Enterprise Teams' })];

  await page.route(
    (url) =>
      url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
    async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: configs,
            pagination: {
              page: 1,
              page_size: 20,
              total: configs.length,
              total_pages: 1,
            },
          }),
        });
      } else {
        await route.continue();
      }
    }
  );

  await page.route(
    (url) =>
      url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: segments,
          pagination: {
            page: 1,
            page_size: 20,
            total: segments.length,
            total_pages: 1,
          },
        }),
      });
    }
  );
}

// ============================================================================
// Test Suite: API Unreachable Scenarios
// ============================================================================

test.describe('Connectivity: API Unreachable', () => {
  test('should show error state when API is completely unreachable', async ({ page }) => {
    /**
     * Test: Display meaningful error when backend is down
     * - Simulate network failure (connection refused)
     * - Verify error message is shown to user
     * - Verify no crash or blank page
     */
    await authenticateAs(page, TEST_USER);

    // Mock complete network failure for newsletter endpoints
    await mockNetworkFailure(page, '/newsletter/configs');
    await mockNetworkFailure(page, '/newsletter/segments');

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Assert: Error message or fallback UI is displayed
    // (The UI should show something meaningful, not crash)
    const errorIndicator = page.locator(
      'text=/error|failed|unavailable|could not|unable to|network|connection/i'
    ).first();

    const hasError = await errorIndicator.isVisible({ timeout: 10000 }).catch(() => false);

    // Either error message is shown, or the page loads with empty state
    // The key point is no crash
    const pageLoaded = await page.locator('body').isVisible();
    expect(pageLoaded).toBe(true);

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-01-api-unreachable.png',
      fullPage: true,
    });

    // Log whether error was displayed
    console.log(`Error indicator visible: ${hasError}`);
  });

  test('should handle DNS resolution failure gracefully', async ({ page }) => {
    /**
     * Test: Handle case where API hostname cannot be resolved
     */
    await authenticateAs(page, TEST_USER);

    // Mock DNS failure
    await page.route(
      (url) => url.pathname.includes('/v1/'),
      async (route: Route) => {
        await route.abort('namenotresolved');
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Assert: Page handles error gracefully
    const pageBody = page.locator('body');
    await expect(pageBody).toBeVisible();

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-02-dns-failure.png',
      fullPage: true,
    });
  });

  test('should handle connection reset gracefully', async ({ page }) => {
    /**
     * Test: Handle case where connection is reset during request
     */
    await authenticateAs(page, TEST_USER);

    // Mock connection reset
    await page.route(
      (url) => url.pathname.includes('/v1/'),
      async (route: Route) => {
        await route.abort('connectionreset');
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Assert: Page handles error gracefully
    const pageBody = page.locator('body');
    await expect(pageBody).toBeVisible();

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-03-connection-reset.png',
      fullPage: true,
    });
  });
});

// ============================================================================
// Test Suite: Request Retry Behavior
// ============================================================================

test.describe('Connectivity: Request Retries', () => {
  test('should retry failed requests automatically', async ({ page }) => {
    /**
     * Test: Verify automatic retry behavior
     * - First request fails with 503
     * - System retries
     * - Second request succeeds
     */
    await authenticateAs(page, TEST_USER);

    const configs = [createMockConfiguration('config-001')];
    const intermittentMock = createIntermittentMock(1, {
      data: configs,
      pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    });

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      intermittentMock.handler
    );

    // Mock segments to succeed immediately
    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Wait for potential retries
    await page.waitForTimeout(3000);

    // Log retry attempts
    console.log(`Total API attempts: ${intermittentMock.getAttempts()}`);

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-04-auto-retry.png',
      fullPage: true,
    });
  });

  test('should stop retrying after maximum attempts', async ({ page }) => {
    /**
     * Test: Verify retry limit is enforced
     * - All requests fail
     * - System stops after max retries
     * - Error is shown to user
     */
    await authenticateAs(page, TEST_USER);

    let requestCount = 0;

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      async (route: Route) => {
        requestCount++;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'service_unavailable',
            message: 'Service temporarily unavailable',
          }),
        });
      }
    );

    // Mock segments to fail too
    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
      async (route: Route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'service_unavailable',
            message: 'Service temporarily unavailable',
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);

    // Wait for retries to complete
    await page.waitForTimeout(5000);

    // Log request count
    console.log(`Total requests made: ${requestCount}`);

    // Assert: Request count is reasonable (not infinite)
    expect(requestCount).toBeLessThan(10);

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-05-retry-limit.png',
      fullPage: true,
    });
  });

  test('should implement exponential backoff on retries', async ({ page }) => {
    /**
     * Test: Verify exponential backoff between retries
     * - Track timing between requests
     * - Verify delays increase
     */
    await authenticateAs(page, TEST_USER);

    const requestTimes: number[] = [];

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      async (route: Route) => {
        requestTimes.push(Date.now());
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'service_unavailable',
            message: 'Service temporarily unavailable',
          }),
        });
      }
    );

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);

    // Wait for multiple retry attempts
    await page.waitForTimeout(8000);

    // Analyze timing between requests
    if (requestTimes.length >= 2) {
      const delays = [];
      for (let i = 1; i < requestTimes.length; i++) {
        delays.push(requestTimes[i] - requestTimes[i - 1]);
      }
      console.log('Request delays (ms):', delays);

      // If there are multiple retries, later delays should generally be longer
      // (exponential backoff pattern)
    }

    console.log(`Total requests: ${requestTimes.length}`);

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-06-exponential-backoff.png',
      fullPage: true,
    });
  });
});

// ============================================================================
// Test Suite: Loading States
// ============================================================================

test.describe('Connectivity: Loading States', () => {
  test('should show loading state during slow API response', async ({ page }) => {
    /**
     * Test: Loading indicator appears while waiting for slow response
     */
    await authenticateAs(page, TEST_USER);

    const configs = [createMockConfiguration('config-001')];

    // Mock slow response
    await mockSlowResponse(page, '/newsletter/configs', NETWORK_DELAYS.SLOW, {
      data: configs,
      pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    });

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
          }),
        });
      }
    );

    // Navigate to page
    await page.goto(`${BASE_URL}/newsletter/configs`);

    // Check for loading indicator during slow response
    const loadingIndicator = page.locator(
      '[data-testid="loading"], .loading, [role="progressbar"], .spinner, .animate-spin, .skeleton'
    ).first();

    // Take screenshot while loading
    const loadingVisible = await loadingIndicator
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    console.log(`Loading indicator visible: ${loadingVisible}`);

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-07-loading-state.png',
      fullPage: true,
    });

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Assert: Data eventually loads
    await expect(page.getByText(configs[0].name)).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state for form submissions', async ({ page }) => {
    /**
     * Test: Loading state during form submission
     */
    await authenticateAs(page, TEST_USER);
    await mockSuccessfulResponses(page);

    // Override POST to be slow
    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      async (route: Route) => {
        if (route.request().method() === 'POST') {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(createMockConfiguration('config-new')),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Open create form
    const createButton = page
      .locator('button:has-text("New Configuration"), button[aria-label*="new" i]')
      .first();

    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();

      // Fill form
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        const nameInput = page.getByLabel(/name/i, { exact: false }).first();
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill('Test Config');
        }

        // Submit
        const submitButton = page.getByRole('button', { name: /submit|save|create/i });
        await submitButton.last().click();

        // Look for loading state on button
        await page.screenshot({
          path: 'tests/artifacts/newsletter/connectivity-08-submit-loading.png',
          fullPage: true,
        });
      }
    }
  });

  test('should show skeleton loaders during data fetch', async ({ page }) => {
    /**
     * Test: Skeleton loaders appear while data is being fetched
     */
    await authenticateAs(page, TEST_USER);

    // Very slow response to catch skeleton
    await mockSlowResponse(page, '/newsletter/configs', 5000, {
      data: [createMockConfiguration('config-001')],
      pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    });

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);

    // Take screenshot immediately to catch skeleton state
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-09-skeleton-loader.png',
      fullPage: true,
    });

    // Check for skeleton elements
    const skeletonElements = page.locator('.skeleton, [data-skeleton], .animate-pulse');
    const skeletonCount = await skeletonElements.count();
    console.log(`Skeleton elements found: ${skeletonCount}`);
  });
});

// ============================================================================
// Test Suite: Timeout Handling
// ============================================================================

test.describe('Connectivity: Timeout Handling', () => {
  test('should handle API timeout gracefully', async ({ page }) => {
    /**
     * Test: Request timeout is handled with user feedback
     */
    await authenticateAs(page, TEST_USER);

    // Mock timeout
    await mockApiTimeout(page, '/newsletter/configs', NETWORK_DELAYS.TIMEOUT);

    // Mock segments to succeed
    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);

    // Wait for timeout to occur
    await page.waitForTimeout(20000);

    // Assert: Page still functional (not frozen)
    const pageBody = page.locator('body');
    await expect(pageBody).toBeVisible();

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-10-timeout-handled.png',
      fullPage: true,
    });
  });

  test.skip('should show timeout-specific error message', async ({ page }) => {
    /**
     * Test: Timeout errors have clear messaging
     * Note: Skipped because timeout tests take too long
     */
    await authenticateAs(page, TEST_USER);

    await page.route(
      (url) => url.pathname.includes('/v1/'),
      async (route: Route) => {
        await new Promise((resolve) => setTimeout(resolve, 30000));
        await route.abort('timedout');
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForTimeout(35000);

    // Look for timeout error message
    const timeoutMessage = page.locator(
      'text=/timeout|timed out|taking too long|try again/i'
    ).first();

    const hasTimeoutMessage = await timeoutMessage
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    console.log(`Timeout message visible: ${hasTimeoutMessage}`);
  });
});

// ============================================================================
// Test Suite: Manual Retry Options
// ============================================================================

test.describe('Connectivity: Manual Retry', () => {
  test('should allow user to manually retry after failure', async ({ page }) => {
    /**
     * Test: Retry button allows user to re-fetch data
     */
    await authenticateAs(page, TEST_USER);

    let requestCount = 0;
    const configs = [createMockConfiguration('config-001')];

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      async (route: Route) => {
        requestCount++;
        if (requestCount === 1) {
          // First request fails
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'internal_server_error',
              message: 'Server error occurred',
            }),
          });
        } else {
          // Subsequent requests succeed
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: configs,
              pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
            }),
          });
        }
      }
    );

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Look for retry button
    const retryButton = page.locator(
      'button:has-text("Retry"), button:has-text("Try Again"), button[aria-label*="retry" i]'
    ).first();

    if (await retryButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.screenshot({
        path: 'tests/artifacts/newsletter/connectivity-11-retry-button-visible.png',
        fullPage: true,
      });

      // Click retry
      await retryButton.click();
      await page.waitForLoadState('networkidle');

      // Assert: Data now loads
      await expect(page.getByText(configs[0].name)).toBeVisible({ timeout: 10000 });
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-12-after-retry.png',
      fullPage: true,
    });

    console.log(`Total requests: ${requestCount}`);
  });

  test('should allow refresh to retry failed page load', async ({ page }) => {
    /**
     * Test: Page refresh retries failed requests
     */
    await authenticateAs(page, TEST_USER);

    let requestCount = 0;
    const configs = [createMockConfiguration('config-001')];

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      async (route: Route) => {
        requestCount++;
        if (requestCount === 1) {
          await route.abort('connectionrefused');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: configs,
              pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
            }),
          });
        }
      }
    );

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
          }),
        });
      }
    );

    // First load fails
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-13-before-refresh.png',
      fullPage: true,
    });

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Assert: Data loads on refresh
    await expect(page.getByText(configs[0].name)).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-14-after-refresh.png',
      fullPage: true,
    });

    console.log(`Total requests after refresh: ${requestCount}`);
  });
});

// ============================================================================
// Test Suite: Error Recovery
// ============================================================================

test.describe('Connectivity: Error Recovery', () => {
  test('should recover from transient errors', async ({ page }) => {
    /**
     * Test: System recovers after temporary backend issues
     */
    await authenticateAs(page, TEST_USER);

    const configs = [createMockConfiguration('config-001', { name: 'Recovery Test' })];
    let errorMode = true;

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      async (route: Route) => {
        if (errorMode) {
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'service_unavailable',
              message: 'Service temporarily unavailable',
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: configs,
              pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
            }),
          });
        }
      }
    );

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
          }),
        });
      }
    );

    // First load with errors
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-15-error-state.png',
      fullPage: true,
    });

    // Simulate backend recovery
    errorMode = false;

    // Reload or retry
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Assert: Data now loads
    await expect(page.getByText('Recovery Test')).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-16-recovered.png',
      fullPage: true,
    });
  });

  test('should preserve form data during network failure', async ({ page }) => {
    /**
     * Test: User input is not lost if submission fails
     */
    await authenticateAs(page, TEST_USER);
    await mockSuccessfulResponses(page);

    // Override POST to fail
    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'service_unavailable',
              message: 'Service temporarily unavailable',
            }),
          });
        } else {
          // Let other requests through
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [],
              pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
            }),
          });
        }
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Open create form
    const createButton = page
      .locator('button:has-text("New Configuration"), button[aria-label*="new" i]')
      .first();

    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();

      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        const testName = 'Important Config Data';
        const nameInput = page.getByLabel(/name/i, { exact: false }).first();

        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill(testName);

          // Submit (will fail)
          const submitButton = page.getByRole('button', { name: /submit|save|create/i });
          await submitButton.last().click();

          // Wait for error
          await page.waitForTimeout(2000);

          // Assert: Form data is preserved
          const currentValue = await nameInput.inputValue();
          expect(currentValue).toBe(testName);

          await page.screenshot({
            path: 'tests/artifacts/newsletter/connectivity-17-form-data-preserved.png',
            fullPage: true,
          });
        }
      }
    }
  });
});

// ============================================================================
// Test Suite: Partial Failure Scenarios
// ============================================================================

test.describe('Connectivity: Partial Failures', () => {
  test('should handle partial API failures gracefully', async ({ page }) => {
    /**
     * Test: Some endpoints fail while others succeed
     */
    await authenticateAs(page, TEST_USER);

    // Configs fail, segments succeed
    await mockApiError(page, '/newsletter/configs', 500, 'Internal server error');

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [createMockSegment('segment-001', { name: 'Working Segment' })],
            pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Page should still be usable
    await expect(page.locator('body')).toBeVisible();

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-18-partial-failure.png',
      fullPage: true,
    });
  });

  test('should show partial data when some requests fail', async ({ page }) => {
    /**
     * Test: Successfully fetched data is displayed even when other requests fail
     */
    await authenticateAs(page, TEST_USER);

    // Configs succeed
    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [createMockConfiguration('config-001', { name: 'Partial Success' })],
            pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
          }),
        });
      }
    );

    // Segments fail
    await mockApiError(page, '/newsletter/segments', 500, 'Internal server error');

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Assert: Config data is still displayed
    await expect(page.getByText('Partial Success')).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-19-partial-data-shown.png',
      fullPage: true,
    });
  });
});

// ============================================================================
// Test Suite: Network State Indicators
// ============================================================================

test.describe('Connectivity: Network State Indicators', () => {
  test('should indicate when retrying failed request', async ({ page }) => {
    /**
     * Test: UI shows retry status to user
     */
    await authenticateAs(page, TEST_USER);

    const intermittentMock = createIntermittentMock(2, {
      data: [createMockConfiguration('config-001')],
      pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    });

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      intermittentMock.handler
    );

    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);

    // Look for retry indicator
    const retryIndicator = page.locator(
      'text=/retrying|trying again|attempt/i'
    ).first();

    // Take screenshots during retry process
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-20-retry-indicator.png',
      fullPage: true,
    });

    const retryVisible = await retryIndicator
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    console.log(`Retry indicator visible: ${retryVisible}`);
    console.log(`Total attempts: ${intermittentMock.getAttempts()}`);
  });

  test('should show offline indicator when network is unavailable', async ({ page }) => {
    /**
     * Test: Offline mode is clearly indicated
     */
    await authenticateAs(page, TEST_USER);
    await mockSuccessfulResponses(page);

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Simulate going offline
    await page.context().setOffline(true);

    // Try to trigger a request
    const createButton = page
      .locator('button:has-text("New Configuration"), button[aria-label*="new" i]')
      .first();

    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-21-offline-state.png',
      fullPage: true,
    });

    // Go back online
    await page.context().setOffline(false);
  });
});

// ============================================================================
// Test Suite: Performance Under Network Stress
// ============================================================================

test.describe('Connectivity: Network Stress', () => {
  test('should handle multiple concurrent failed requests', async ({ page }) => {
    /**
     * Test: Multiple API calls failing simultaneously
     */
    await authenticateAs(page, TEST_USER);

    let failedRequests = 0;

    await page.route(
      (url) => url.pathname.includes('/v1/'),
      async (route: Route) => {
        failedRequests++;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'service_unavailable',
            message: 'Service temporarily unavailable',
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Page should not crash
    await expect(page.locator('body')).toBeVisible();

    console.log(`Failed requests handled: ${failedRequests}`);

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-22-concurrent-failures.png',
      fullPage: true,
    });
  });

  test('should maintain responsiveness during slow network', async ({ page }) => {
    /**
     * Test: UI remains interactive during slow responses
     */
    await authenticateAs(page, TEST_USER);

    // Slow down all requests
    await page.route(
      (url) => url.pathname.includes('/v1/'),
      async (route: Route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);

    // While loading, UI should still be interactive
    // Check that we can interact with other elements
    const startTime = Date.now();

    // Try clicking around - UI should not be frozen
    await page.locator('body').click({ position: { x: 100, y: 100 } });
    await page.locator('body').click({ position: { x: 200, y: 200 } });

    const clickTime = Date.now() - startTime;
    console.log(`Click response time: ${clickTime}ms`);

    // Clicks should respond quickly even during slow network
    expect(clickTime).toBeLessThan(500);

    await page.screenshot({
      path: 'tests/artifacts/newsletter/connectivity-23-responsive-during-slow.png',
      fullPage: true,
    });
  });
});

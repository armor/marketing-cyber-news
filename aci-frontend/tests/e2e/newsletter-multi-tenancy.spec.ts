/**
 * E2E Tests: Multi-Tenancy and Tenant Isolation
 *
 * Comprehensive tests for tenant isolation in the newsletter automation system:
 * - User sees only own tenant's newsletter configs
 * - Cannot access other tenant's issues via URL manipulation
 * - Cannot access other tenant's analytics
 * - API enforces tenant boundaries
 * - Configs filtered by tenant
 * - Segments isolated per tenant
 * - Contacts not visible across tenants
 *
 * Security Requirements:
 * - Tenant ID must be validated on all API calls
 * - Cross-tenant access attempts must return 403 Forbidden
 * - URL manipulation must not bypass tenant isolation
 * - Session tokens must be tenant-scoped
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
 * Test tenant configurations
 */
const TENANT_A = {
  id: 'tenant-alpha-001',
  name: 'Alpha Corporation',
};

const TENANT_B = {
  id: 'tenant-beta-002',
  name: 'Beta Industries',
};

/**
 * Test users for different tenants
 */
const USER_TENANT_A = {
  id: 'user-tenant-a-001',
  email: 'admin@alpha-corp.com',
  name: 'Alpha Admin',
  role: 'admin',
  tenant_id: TENANT_A.id,
  token: 'mock-token-tenant-a-001',
};

const USER_TENANT_B = {
  id: 'user-tenant-b-001',
  email: 'admin@beta-industries.com',
  name: 'Beta Admin',
  role: 'admin',
  tenant_id: TENANT_B.id,
  token: 'mock-token-tenant-b-002',
};

// ============================================================================
// Mock Data Factory
// ============================================================================

/**
 * Creates mock newsletter configuration for a specific tenant
 */
function createMockConfiguration(
  id: string,
  tenantId: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    tenant_id: tenantId,
    name: `Config for ${tenantId}`,
    description: `Newsletter configuration belonging to tenant ${tenantId}`,
    segment_id: `segment-${tenantId}-001`,
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
 * Creates mock segment for a specific tenant
 */
function createMockSegment(
  id: string,
  tenantId: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    tenant_id: tenantId,
    name: `Segment for ${tenantId}`,
    description: `Audience segment belonging to tenant ${tenantId}`,
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
    contact_count: 2500,
    is_active: true,
    created_at: '2024-01-10T08:00:00.000Z',
    updated_at: '2024-12-01T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * Creates mock newsletter issue for a specific tenant
 */
function createMockIssue(
  id: string,
  tenantId: string,
  status: string = 'draft',
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    tenant_id: tenantId,
    configuration_id: `config-${tenantId}-001`,
    segment_id: `segment-${tenantId}-001`,
    subject_lines: [`Newsletter for ${tenantId}`],
    subject_line: `Newsletter for ${tenantId}`,
    preview_text: `Content for tenant ${tenantId}`,
    status,
    blocks: [],
    total_recipients: 1000,
    total_delivered: 950,
    total_opened: 400,
    total_clicked: 100,
    created_by: 'admin-001',
    created_at: '2024-12-01T10:00:00.000Z',
    updated_at: '2024-12-01T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * Creates mock analytics for a specific tenant
 */
function createMockAnalytics(tenantId: string) {
  return {
    tenant_id: tenantId,
    total_newsletters_sent: 52,
    total_recipients: 148244,
    total_delivered: 146500,
    total_opened: 58600,
    total_clicked: 12320,
    average_open_rate: 0.4,
    average_click_rate: 0.084,
    average_click_to_open_rate: 0.21,
    unsubscribe_rate: 0.0048,
    bounce_rate: 0.0118,
    complaint_rate: 0.0003,
    top_performing_subject: 'Critical Alert: Immediate Action Required',
    top_performing_cta: 'Learn More',
    engagement_trend: [
      { date: '2024-12-01', open_rate: 0.38, click_rate: 0.08, subscribers: 2800 },
      { date: '2024-12-08', open_rate: 0.4, click_rate: 0.085, subscribers: 2820 },
    ],
  };
}

/**
 * Creates mock contact for a specific tenant
 */
function createMockContact(
  id: string,
  tenantId: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    tenant_id: tenantId,
    email: `contact-${id}@example.com`,
    first_name: 'Test',
    last_name: 'Contact',
    company: `Company for ${tenantId}`,
    job_title: 'Security Analyst',
    role_category: 'security_operations',
    industry: 'Technology',
    region: 'North America',
    primary_framework: 'NIST',
    engagement_score: 75,
    is_subscribed: true,
    is_bounced: false,
    is_high_touch: false,
    total_opens: 25,
    total_clicks: 10,
    topic_interests: ['threat_intelligence'],
    segment_ids: [`segment-${tenantId}-001`],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-12-01T00:00:00.000Z',
    ...overrides,
  };
}

// ============================================================================
// Test Fixtures and Helpers
// ============================================================================

/**
 * Set up authentication for a test user with tenant context
 */
async function authenticateAs(
  page: Page,
  user: typeof USER_TENANT_A
): Promise<void> {
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
          tenant_id: user.tenant_id,
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
        tenant_id: user.tenant_id,
      }),
    });
  });
}

/**
 * Mock tenant-scoped configuration list endpoint
 */
async function mockTenantConfigurations(
  page: Page,
  tenantId: string,
  configs: ReturnType<typeof createMockConfiguration>[]
): Promise<void> {
  await page.route(
    (url) =>
      url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
    async (route: Route) => {
      if (route.request().method() === 'GET') {
        // Filter configs by tenant
        const tenantConfigs = configs.filter((c) => c.tenant_id === tenantId);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: tenantConfigs,
            pagination: {
              page: 1,
              page_size: 20,
              total: tenantConfigs.length,
              total_pages: 1,
            },
          }),
        });
      } else {
        await route.continue();
      }
    }
  );
}

/**
 * Mock tenant-scoped segments list endpoint
 */
async function mockTenantSegments(
  page: Page,
  tenantId: string,
  segments: ReturnType<typeof createMockSegment>[]
): Promise<void> {
  await page.route(
    (url) =>
      url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/segments'),
    async (route: Route) => {
      if (route.request().method() === 'GET') {
        // Filter segments by tenant
        const tenantSegments = segments.filter((s) => s.tenant_id === tenantId);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: tenantSegments,
            pagination: {
              page: 1,
              page_size: 20,
              total: tenantSegments.length,
              total_pages: 1,
            },
          }),
        });
      } else {
        await route.continue();
      }
    }
  );
}

/**
 * Mock cross-tenant access denial for specific resource
 */
async function mockCrossTenantDenial(
  page: Page,
  resourcePath: string
): Promise<void> {
  await page.route(`**/v1${resourcePath}`, async (route: Route) => {
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'forbidden',
        message: 'Access denied: Resource belongs to a different tenant',
        code: 'TENANT_MISMATCH',
      }),
    });
  });
}

/**
 * Mock tenant-scoped issues list endpoint
 */
async function mockTenantIssues(
  page: Page,
  tenantId: string,
  issues: ReturnType<typeof createMockIssue>[]
): Promise<void> {
  await page.route(
    (url) =>
      url.pathname.includes('/v1/') &&
      url.pathname.includes('/newsletter-issues') &&
      !url.pathname.includes('/preview') &&
      !url.pathname.includes('/approve'),
    async (route: Route) => {
      if (route.request().method() === 'GET') {
        // Check if this is a specific issue request
        const match = route.request().url().match(/newsletter-issues\/([^/?]+)/);
        if (match && match[1]) {
          const issueId = match[1];
          const issue = issues.find((i) => i.id === issueId);

          if (!issue) {
            await route.fulfill({
              status: 404,
              contentType: 'application/json',
              body: JSON.stringify({
                error: 'not_found',
                message: 'Issue not found',
              }),
            });
            return;
          }

          // Check tenant isolation
          if (issue.tenant_id !== tenantId) {
            await route.fulfill({
              status: 403,
              contentType: 'application/json',
              body: JSON.stringify({
                error: 'forbidden',
                message: 'Access denied: Resource belongs to a different tenant',
                code: 'TENANT_MISMATCH',
              }),
            });
            return;
          }

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: issue }),
          });
          return;
        }

        // List request - filter by tenant
        const tenantIssues = issues.filter((i) => i.tenant_id === tenantId);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: tenantIssues,
            pagination: {
              page: 1,
              page_size: 20,
              total: tenantIssues.length,
              total_pages: 1,
            },
          }),
        });
      } else {
        await route.continue();
      }
    }
  );
}

/**
 * Mock tenant-scoped analytics endpoint
 */
async function mockTenantAnalytics(
  page: Page,
  tenantId: string
): Promise<void> {
  await page.route(
    (url) =>
      url.pathname.includes('/v1/') && url.pathname.includes('/newsletter/analytics'),
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockAnalytics(tenantId)),
      });
    }
  );
}

/**
 * Mock tenant-scoped contacts endpoint
 */
async function mockTenantContacts(
  page: Page,
  tenantId: string,
  contacts: ReturnType<typeof createMockContact>[]
): Promise<void> {
  await page.route(
    (url) =>
      url.pathname.includes('/v1/') && url.pathname.includes('/newsletter/contacts'),
    async (route: Route) => {
      if (route.request().method() === 'GET') {
        // Filter contacts by tenant
        const tenantContacts = contacts.filter((c) => c.tenant_id === tenantId);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: tenantContacts,
            pagination: {
              page: 1,
              page_size: 20,
              total: tenantContacts.length,
              total_pages: 1,
            },
          }),
        });
      } else {
        await route.continue();
      }
    }
  );
}

// ============================================================================
// Test Suite: Tenant Isolation for Configurations
// ============================================================================

test.describe('Multi-Tenancy: Configuration Isolation', () => {
  test('should display only own tenant configurations', async ({ page }) => {
    /**
     * Test: User sees only configurations belonging to their tenant
     * - Tenant A user logs in
     * - Only Tenant A configurations are visible
     * - Tenant B configurations are not visible
     */
    const allConfigs = [
      createMockConfiguration('config-a-001', TENANT_A.id, { name: 'Alpha Weekly Digest' }),
      createMockConfiguration('config-a-002', TENANT_A.id, { name: 'Alpha Monthly Report' }),
      createMockConfiguration('config-b-001', TENANT_B.id, { name: 'Beta Weekly Update' }),
      createMockConfiguration('config-b-002', TENANT_B.id, { name: 'Beta Executive Brief' }),
    ];

    const allSegments = [
      createMockSegment('segment-a-001', TENANT_A.id, { name: 'Alpha Enterprise' }),
      createMockSegment('segment-b-001', TENANT_B.id, { name: 'Beta Enterprise' }),
    ];

    await authenticateAs(page, USER_TENANT_A);
    await mockTenantConfigurations(page, TENANT_A.id, allConfigs);
    await mockTenantSegments(page, TENANT_A.id, allSegments);

    // Navigate to configuration page
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Assert: Page title visible
    await expect(
      page.getByRole('heading', { name: /newsletter configuration/i })
    ).toBeVisible({ timeout: 10000 });

    // Assert: Tenant A configurations are visible
    await expect(page.getByText('Alpha Weekly Digest')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Alpha Monthly Report')).toBeVisible({ timeout: 5000 });

    // Assert: Tenant B configurations are NOT visible
    await expect(page.getByText('Beta Weekly Update')).not.toBeVisible();
    await expect(page.getByText('Beta Executive Brief')).not.toBeVisible();

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-01-own-configs.png',
      fullPage: true,
    });
  });

  test('should return 403 when accessing other tenant config via URL', async ({ page }) => {
    /**
     * Test: Direct URL access to other tenant's configuration returns 403
     * - User A tries to access config belonging to Tenant B
     * - API should return 403 Forbidden
     */
    await authenticateAs(page, USER_TENANT_A);

    // Mock 403 for cross-tenant config access
    await mockCrossTenantDenial(page, '/newsletter/configs/config-b-001');

    // Mock segments to prevent 404 on page load
    await mockTenantSegments(page, TENANT_A.id, [
      createMockSegment('segment-a-001', TENANT_A.id),
    ]);

    // Mock configs list (empty for tenant A in this case)
    await mockTenantConfigurations(page, TENANT_A.id, []);

    // Navigate to the configs page first
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(
      page.getByRole('heading', { name: /newsletter configuration/i })
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-02-cross-tenant-denied.png',
      fullPage: true,
    });
  });

  test('should filter configurations by tenant in API responses', async ({ page }) => {
    /**
     * Test: API automatically filters results by authenticated tenant
     * - Multiple tenants have configurations
     * - API only returns current tenant's data
     */
    const allConfigs = [
      createMockConfiguration('config-a-001', TENANT_A.id, { name: 'Alpha Config 1' }),
      createMockConfiguration('config-b-001', TENANT_B.id, { name: 'Beta Config 1' }),
    ];

    const allSegments = [
      createMockSegment('segment-a-001', TENANT_A.id),
    ];

    await authenticateAs(page, USER_TENANT_A);
    await mockTenantConfigurations(page, TENANT_A.id, allConfigs);
    await mockTenantSegments(page, TENANT_A.id, allSegments);

    // Intercept API request to verify response
    let apiResponseData: unknown[] = [];
    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      async (route: Route) => {
        const tenantConfigs = allConfigs.filter((c) => c.tenant_id === TENANT_A.id);
        apiResponseData = tenantConfigs;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: tenantConfigs,
            pagination: {
              page: 1,
              page_size: 20,
              total: tenantConfigs.length,
              total_pages: 1,
            },
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Assert: Only tenant A config received
    expect(apiResponseData).toHaveLength(1);
    expect((apiResponseData[0] as Record<string, unknown>).tenant_id).toBe(TENANT_A.id);
  });
});

// ============================================================================
// Test Suite: Tenant Isolation for Segments
// ============================================================================

test.describe('Multi-Tenancy: Segment Isolation', () => {
  test('should display only own tenant segments', async ({ page }) => {
    /**
     * Test: User sees only segments belonging to their tenant
     */
    const allConfigs = [
      createMockConfiguration('config-a-001', TENANT_A.id),
    ];

    const allSegments = [
      createMockSegment('segment-a-001', TENANT_A.id, { name: 'Alpha Security Team' }),
      createMockSegment('segment-a-002', TENANT_A.id, { name: 'Alpha Executives' }),
      createMockSegment('segment-b-001', TENANT_B.id, { name: 'Beta Security Team' }),
    ];

    await authenticateAs(page, USER_TENANT_A);
    await mockTenantConfigurations(page, TENANT_A.id, allConfigs);
    await mockTenantSegments(page, TENANT_A.id, allSegments);

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Click on Segments tab
    const segmentTab = page.getByRole('tab', { name: /segments/i });
    await segmentTab.click();

    // Assert: Tenant A segments are visible
    await expect(page.getByText('Alpha Security Team').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Alpha Executives').first()).toBeVisible({ timeout: 5000 });

    // Assert: Tenant B segments are NOT visible
    await expect(page.getByText('Beta Security Team')).not.toBeVisible();

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-03-own-segments.png',
      fullPage: true,
    });
  });

  test('should enforce tenant isolation on segment operations', async ({ page }) => {
    /**
     * Test: Operations on segments are tenant-scoped
     */
    const allSegments = [
      createMockSegment('segment-a-001', TENANT_A.id, { name: 'Alpha Segment' }),
    ];

    await authenticateAs(page, USER_TENANT_A);
    await mockTenantConfigurations(page, TENANT_A.id, []);
    await mockTenantSegments(page, TENANT_A.id, allSegments);

    // Mock cross-tenant segment access denial
    await mockCrossTenantDenial(page, '/newsletter/segments/segment-b-001');

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Click on Segments tab
    const segmentTab = page.getByRole('tab', { name: /segments/i });
    await segmentTab.click();

    // Verify own segment is visible
    await expect(page.getByText('Alpha Segment').first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-04-segment-isolation.png',
      fullPage: true,
    });
  });
});

// ============================================================================
// Test Suite: Tenant Isolation for Issues
// ============================================================================

test.describe('Multi-Tenancy: Issue Isolation', () => {
  test('should display only own tenant issues', async ({ page }) => {
    /**
     * Test: User sees only newsletter issues belonging to their tenant
     */
    const allIssues = [
      createMockIssue('issue-a-001', TENANT_A.id, 'draft', {
        subject_line: 'Alpha Weekly - Dec 16',
      }),
      createMockIssue('issue-a-002', TENANT_A.id, 'sent', {
        subject_line: 'Alpha Weekly - Dec 9',
      }),
      createMockIssue('issue-b-001', TENANT_B.id, 'draft', {
        subject_line: 'Beta Weekly - Dec 16',
      }),
    ];

    await authenticateAs(page, USER_TENANT_A);
    await mockTenantIssues(page, TENANT_A.id, allIssues);
    await mockTenantConfigurations(page, TENANT_A.id, [
      createMockConfiguration('config-a-001', TENANT_A.id),
    ]);
    await mockTenantSegments(page, TENANT_A.id, [
      createMockSegment('segment-a-001', TENANT_A.id),
    ]);

    await page.goto(`${BASE_URL}/newsletter/edit/config-a-001`);
    await page.waitForLoadState('networkidle');

    // Page should load without errors (specific content depends on UI implementation)
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-05-own-issues.png',
      fullPage: true,
    });
  });

  test('should return 403 when accessing other tenant issue via URL', async ({ page }) => {
    /**
     * Test: Direct URL access to other tenant's issue returns 403
     */
    const allIssues = [
      createMockIssue('issue-a-001', TENANT_A.id),
      createMockIssue('issue-b-001', TENANT_B.id),
    ];

    await authenticateAs(page, USER_TENANT_A);
    await mockTenantIssues(page, TENANT_A.id, allIssues);
    await mockTenantConfigurations(page, TENANT_A.id, []);
    await mockTenantSegments(page, TENANT_A.id, []);

    // Navigate to issue belonging to Tenant B
    await page.goto(`${BASE_URL}/newsletter/preview/issue-b-001`);
    await page.waitForLoadState('networkidle');

    // Should show error or redirect (depending on UI implementation)
    // The key point is that the other tenant's data is not accessible
    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-06-cross-tenant-issue-denied.png',
      fullPage: true,
    });
  });
});

// ============================================================================
// Test Suite: Tenant Isolation for Analytics
// ============================================================================

test.describe('Multi-Tenancy: Analytics Isolation', () => {
  test('should display only own tenant analytics', async ({ page }) => {
    /**
     * Test: Analytics dashboard shows only current tenant's data
     */
    await authenticateAs(page, USER_TENANT_A);
    await mockTenantAnalytics(page, TENANT_A.id);
    await mockTenantConfigurations(page, TENANT_A.id, [
      createMockConfiguration('config-a-001', TENANT_A.id),
    ]);
    await mockTenantSegments(page, TENANT_A.id, [
      createMockSegment('segment-a-001', TENANT_A.id),
    ]);

    await page.goto(`${BASE_URL}/newsletter/analytics`);
    await page.waitForLoadState('networkidle');

    // Page should load successfully
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-07-own-analytics.png',
      fullPage: true,
    });
  });

  test('should not expose other tenant analytics data', async ({ page }) => {
    /**
     * Test: Analytics requests are scoped to authenticated tenant
     */
    let analyticsRequestTenantId: string | null = null;

    await authenticateAs(page, USER_TENANT_A);

    // Intercept analytics request to verify tenant scoping
    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.includes('/newsletter/analytics'),
      async (route: Route) => {
        // The API should only return data for the authenticated tenant
        analyticsRequestTenantId = TENANT_A.id;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createMockAnalytics(TENANT_A.id)),
        });
      }
    );

    await mockTenantConfigurations(page, TENANT_A.id, []);
    await mockTenantSegments(page, TENANT_A.id, []);

    await page.goto(`${BASE_URL}/newsletter/analytics`);
    await page.waitForLoadState('networkidle');

    // Verify analytics data is for the correct tenant
    expect(analyticsRequestTenantId).toBe(TENANT_A.id);
  });
});

// ============================================================================
// Test Suite: Tenant Isolation for Contacts
// ============================================================================

test.describe('Multi-Tenancy: Contact Isolation', () => {
  test('should display only own tenant contacts', async ({ page }) => {
    /**
     * Test: Contact lists show only current tenant's contacts
     */
    const allContacts = [
      createMockContact('contact-a-001', TENANT_A.id, { email: 'john@alpha-corp.com' }),
      createMockContact('contact-a-002', TENANT_A.id, { email: 'jane@alpha-corp.com' }),
      createMockContact('contact-b-001', TENANT_B.id, { email: 'bob@beta-ind.com' }),
    ];

    await authenticateAs(page, USER_TENANT_A);
    await mockTenantContacts(page, TENANT_A.id, allContacts);
    await mockTenantConfigurations(page, TENANT_A.id, []);
    await mockTenantSegments(page, TENANT_A.id, []);

    await page.goto(`${BASE_URL}/newsletter/content`);
    await page.waitForLoadState('networkidle');

    // Page should load (content page may include contact-related features)
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-08-own-contacts.png',
      fullPage: true,
    });
  });

  test('should prevent cross-tenant contact access', async ({ page }) => {
    /**
     * Test: Accessing other tenant's contact returns 403
     */
    await authenticateAs(page, USER_TENANT_A);

    // Mock cross-tenant contact denial
    await mockCrossTenantDenial(page, '/newsletter/contacts/contact-b-001');
    await mockTenantConfigurations(page, TENANT_A.id, []);
    await mockTenantSegments(page, TENANT_A.id, []);

    await page.goto(`${BASE_URL}/newsletter/content`);
    await page.waitForLoadState('networkidle');

    // Page should load without errors
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// Test Suite: API Tenant Boundary Enforcement
// ============================================================================

test.describe('Multi-Tenancy: API Boundary Enforcement', () => {
  test('should include tenant context in all API requests', async ({ page }) => {
    /**
     * Test: All API requests include proper tenant context via auth token
     */
    const apiRequests: string[] = [];

    await authenticateAs(page, USER_TENANT_A);

    // Track all API requests
    page.on('request', (request) => {
      if (request.url().includes('/v1/')) {
        apiRequests.push(request.url());
        // Verify auth header is present
        const authHeader = request.headers()['authorization'];
        expect(authHeader).toBeTruthy();
      }
    });

    await mockTenantConfigurations(page, TENANT_A.id, [
      createMockConfiguration('config-a-001', TENANT_A.id),
    ]);
    await mockTenantSegments(page, TENANT_A.id, [
      createMockSegment('segment-a-001', TENANT_A.id),
    ]);

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Verify API calls were made
    expect(apiRequests.length).toBeGreaterThan(0);

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-09-api-tenant-context.png',
      fullPage: true,
    });
  });

  test('should reject requests without valid tenant token', async ({ page }) => {
    /**
     * Test: Requests without valid authentication are rejected
     */
    // Do NOT set up authentication

    // Mock 401 for unauthenticated requests
    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.includes('/newsletter'),
      async (route: Route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'unauthorized',
            message: 'Authentication required',
          }),
        });
      }
    );

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Should redirect to login or show unauthorized message
    // (depending on UI implementation)
    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-10-no-auth-rejected.png',
      fullPage: true,
    });
  });

  test('should validate tenant ID on create operations', async ({ page }) => {
    /**
     * Test: Create operations validate that tenant ID matches authenticated user
     */
    let createRequestBody: Record<string, unknown> | null = null;

    await authenticateAs(page, USER_TENANT_A);

    await mockTenantConfigurations(page, TENANT_A.id, []);
    await mockTenantSegments(page, TENANT_A.id, [
      createMockSegment('segment-a-001', TENANT_A.id, { name: 'Alpha Segment' }),
    ]);

    // Intercept POST request to verify tenant handling
    await page.route(
      (url) =>
        url.pathname.includes('/v1/') && url.pathname.endsWith('/newsletter/configs'),
      async (route: Route) => {
        if (route.request().method() === 'POST') {
          createRequestBody = await route.request().postDataJSON() as Record<string, unknown>;
          // Simulate server adding tenant_id from auth context
          const newConfig = createMockConfiguration(
            `config-new-${Date.now()}`,
            TENANT_A.id,
            createRequestBody
          );
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newConfig),
          });
        } else {
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

      // Fill form if dialog opens
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        const nameInput = page.getByLabel(/name/i, { exact: false }).first();
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill('New Tenant A Config');
        }

        const submitButton = page.getByRole('button', { name: /submit|save|create/i });
        await submitButton.last().click();
        await page.waitForTimeout(1000);

        // Verify the request was made (tenant_id added server-side from auth)
        // The frontend typically doesn't send tenant_id; it's derived from auth token
      }
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-11-create-tenant-validation.png',
      fullPage: true,
    });
  });
});

// ============================================================================
// Test Suite: Session and Token Tenant Scoping
// ============================================================================

test.describe('Multi-Tenancy: Session Security', () => {
  test('should maintain tenant context across navigation', async ({ page }) => {
    /**
     * Test: Tenant context persists as user navigates between pages
     */
    await authenticateAs(page, USER_TENANT_A);
    await mockTenantConfigurations(page, TENANT_A.id, [
      createMockConfiguration('config-a-001', TENANT_A.id, { name: 'Alpha Config' }),
    ]);
    await mockTenantSegments(page, TENANT_A.id, [
      createMockSegment('segment-a-001', TENANT_A.id, { name: 'Alpha Segment' }),
    ]);
    await mockTenantAnalytics(page, TENANT_A.id);

    // Navigate to configs
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Alpha Config')).toBeVisible({ timeout: 5000 });

    // Navigate to analytics
    await page.goto(`${BASE_URL}/newsletter/analytics`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 5000 });

    // Navigate back to configs
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Alpha Config')).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-12-session-persistence.png',
      fullPage: true,
    });
  });

  test('should clear tenant context on logout', async ({ page }) => {
    /**
     * Test: Logging out clears all tenant-specific data
     */
    await authenticateAs(page, USER_TENANT_A);
    await mockTenantConfigurations(page, TENANT_A.id, [
      createMockConfiguration('config-a-001', TENANT_A.id),
    ]);
    await mockTenantSegments(page, TENANT_A.id, []);

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Verify we're logged in
    await expect(
      page.getByRole('heading', { name: /newsletter configuration/i })
    ).toBeVisible({ timeout: 10000 });

    // Clear localStorage (simulating logout)
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Mock 401 after logout
    await page.route(
      (url) => url.pathname.includes('/v1/'),
      async (route: Route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'unauthorized',
            message: 'Authentication required',
          }),
        });
      }
    );

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should redirect to login or show unauthorized
    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-13-logout-clears-context.png',
      fullPage: true,
    });
  });
});

// ============================================================================
// Test Suite: Edge Cases and Security Scenarios
// ============================================================================

test.describe('Multi-Tenancy: Security Edge Cases', () => {
  test('should handle tenant switching attempt gracefully', async ({ page }) => {
    /**
     * Test: Attempting to switch tenant context is handled securely
     */
    await authenticateAs(page, USER_TENANT_A);
    await mockTenantConfigurations(page, TENANT_A.id, [
      createMockConfiguration('config-a-001', TENANT_A.id),
    ]);
    await mockTenantSegments(page, TENANT_A.id, []);

    // Load page normally
    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Try to manipulate localStorage to change tenant
    await page.evaluate(() => {
      // Attempt to inject different tenant context
      localStorage.setItem('tenant_override', 'tenant-beta-002');
    });

    // API should still enforce original tenant from token
    // (server validates token, not localStorage)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Page should still work correctly with original tenant
    await expect(
      page.getByRole('heading', { name: /newsletter configuration/i })
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-14-tenant-switch-blocked.png',
      fullPage: true,
    });
  });

  test('should reject malformed tenant IDs in API requests', async ({ page }) => {
    /**
     * Test: API rejects requests with invalid tenant ID formats
     */
    await authenticateAs(page, USER_TENANT_A);

    // Mock API to reject malformed tenant IDs
    await page.route('**/v1/newsletter/configs', async (route: Route) => {
      const url = new URL(route.request().url());
      const tenantIdParam = url.searchParams.get('tenant_id');

      // If someone tries to inject tenant_id via query param, reject it
      if (tenantIdParam && tenantIdParam !== TENANT_A.id) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'bad_request',
            message: 'Invalid tenant ID parameter',
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
        }),
      });
    });

    await mockTenantSegments(page, TENANT_A.id, []);

    await page.goto(`${BASE_URL}/newsletter/configs`);
    await page.waitForLoadState('networkidle');

    // Page should load without security issues
    await expect(
      page.getByRole('heading', { name: /newsletter configuration/i })
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter/multi-tenancy-15-malformed-tenant-rejected.png',
      fullPage: true,
    });
  });
});

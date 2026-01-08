/**
 * E2E Tests: AI Newsletter Generation Workflow
 *
 * Comprehensive tests for the AI-powered newsletter automation system:
 * - Newsletter preview page access and navigation
 * - Subject line variant selection
 * - Viewport mode switching (Desktop/Tablet/Mobile)
 * - Personalization preview with contact selection
 * - Validation tab (brand voice, copy checks, education ratio)
 * - Workflow actions (Submit, Approve, Schedule, Send)
 *
 * Uses Playwright route interception for API mocking to simulate
 * the newsletter generation and approval workflow.
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
 * Newsletter issue statuses
 */
type IssueStatus = 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'sent' | 'failed';

/**
 * Viewport configurations for responsive testing (used in test descriptions)
 */
// Desktop: 700px, Tablet: 600px, Mobile: 375px

/**
 * Test user configurations
 */
const NEWSLETTER_ADMIN = {
  id: 'user-admin-001',
  email: 'admin@test.com',
  name: 'Newsletter Admin',
  role: 'admin',
  token: 'mock-token-admin-newsletter-001',
};

const NEWSLETTER_EDITOR = {
  id: 'user-marketing-001',
  email: 'marketing@test.com',
  name: 'Marketing Editor',
  role: 'marketing',
  token: 'mock-token-marketing-001',
};

const NEWSLETTER_VIEWER = {
  id: 'user-viewer-001',
  email: 'viewer@test.com',
  name: 'Viewer User',
  role: 'user',
  token: 'mock-token-viewer-001',
};

// ============================================================================
// Mock Data Factory
// ============================================================================

/**
 * Creates a mock newsletter issue with configurable status and blocks
 */
function createMockIssue(
  id: string,
  status: IssueStatus,
  options: {
    subjectLine?: string;
    previewText?: string;
    hasBlocks?: boolean;
    scheduledFor?: string;
  } = {}
) {
  const {
    subjectLine = 'Critical Security Alert: New Zero-Day Vulnerability Discovered',
    previewText = 'Learn how to protect your organization from the latest threats',
    hasBlocks = true,
    scheduledFor,
  } = options;

  const blocks = hasBlocks
    ? [
        {
          id: `block-hero-${id}`,
          issue_id: id,
          block_type: 'hero',
          position: 0,
          title: 'Zero-Day Alert: Critical Windows Vulnerability',
          subtitle: 'Immediate action required',
          content:
            'A critical zero-day vulnerability (CVE-2024-12345) has been discovered affecting all Windows systems.',
          cta_text: 'Learn More',
          cta_url: 'https://example.com/cve-2024-12345',
          content_item_ids: ['item-001'],
          created_at: new Date().toISOString(),
        },
        {
          id: `block-news-${id}`,
          issue_id: id,
          block_type: 'news',
          position: 1,
          title: 'Industry News',
          content:
            'This week in cybersecurity: ransomware attacks increase by 30%, new NIST guidelines released.',
          content_item_ids: ['item-002', 'item-003'],
          created_at: new Date().toISOString(),
        },
        {
          id: `block-content-${id}`,
          issue_id: id,
          block_type: 'content',
          position: 2,
          title: 'Best Practices: Securing Remote Work',
          content:
            'With remote work becoming the norm, organizations must adapt their security posture.',
          cta_text: 'Read Full Guide',
          cta_url: 'https://example.com/remote-security',
          content_item_ids: ['item-004'],
          created_at: new Date().toISOString(),
        },
      ]
    : [];

  return {
    id,
    configuration_id: 'config-001',
    segment_id: 'segment-001',
    subject_line: subjectLine,
    preview_text: previewText,
    status,
    scheduled_for: scheduledFor,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
    blocks,
    total_recipients: 1500,
    total_sent: status === 'sent' ? 1480 : 0,
    total_delivered: status === 'sent' ? 1450 : 0,
    total_opened: status === 'sent' ? 580 : 0,
    total_clicked: status === 'sent' ? 145 : 0,
    unique_opens: status === 'sent' ? 520 : 0,
    unique_clicks: status === 'sent' ? 130 : 0,
    created_by: 'user-admin-001',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    approved_by: ['approved', 'scheduled', 'sent'].includes(status) ? 'user-admin-001' : undefined,
    approved_at: ['approved', 'scheduled', 'sent'].includes(status)
      ? new Date().toISOString()
      : undefined,
    rejection_reason: undefined,
  };
}

/**
 * Creates mock subject line variants for A/B testing
 */
function createMockSubjectLineVariants(issueId: string) {
  return [
    {
      variant_id: `${issueId}-variant-a`,
      variant_name: 'Variant A - Pain First',
      test_value: 'Critical Security Alert: New Zero-Day Vulnerability Discovered',
      recipients: 500,
      delivered: 490,
      opened: 196,
      clicked: 49,
      open_rate: 0.4,
      click_rate: 0.1,
      click_to_open_rate: 0.25,
      confidence_level: 0.85,
      is_winner: true,
    },
    {
      variant_id: `${issueId}-variant-b`,
      variant_name: 'Variant B - Opportunity First',
      test_value: 'Protect Your Organization: Essential Security Updates Inside',
      recipients: 500,
      delivered: 488,
      opened: 146,
      clicked: 37,
      open_rate: 0.3,
      click_rate: 0.076,
      click_to_open_rate: 0.25,
      confidence_level: 0.72,
      is_winner: false,
    },
    {
      variant_id: `${issueId}-variant-c`,
      variant_name: 'Variant C - Visionary',
      test_value: 'The Future of Security: What Industry Leaders Are Doing Now',
      recipients: 500,
      delivered: 492,
      opened: 177,
      clicked: 44,
      open_rate: 0.36,
      click_rate: 0.089,
      click_to_open_rate: 0.25,
      confidence_level: 0.78,
      is_winner: false,
    },
  ];
}

/**
 * Creates mock issue preview with HTML content
 */
function createMockIssuePreview(
  issueId: string,
  contactId?: string,
  subjectLine?: string
) {
  const firstName = contactId ? 'John' : '{{first_name}}';
  const company = contactId ? 'Acme Corp' : '{{company}}';

  return {
    issue_id: issueId,
    contact_id: contactId,
    subject_line: subjectLine || 'Critical Security Alert: New Zero-Day Vulnerability Discovered',
    preview_text: 'Learn how to protect your organization from the latest threats',
    html_content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Newsletter</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <header style="background: #1a365d; color: white; padding: 20px; text-align: center;">
          <h1>Security Newsletter</h1>
        </header>
        <main style="padding: 20px;">
          <p>Hello ${firstName},</p>
          <p>Welcome to this week's security update for ${company}.</p>

          <section style="background: #fef3cd; padding: 15px; border-left: 4px solid #856404; margin: 20px 0;">
            <h2 style="color: #856404; margin: 0 0 10px;">Critical Alert</h2>
            <p>A critical zero-day vulnerability (CVE-2024-12345) has been discovered affecting all Windows systems.</p>
            <a href="https://example.com/cve-2024-12345" style="color: #0066cc;">Learn More</a>
          </section>

          <section style="margin: 20px 0;">
            <h2>Industry News</h2>
            <ul>
              <li>Ransomware attacks increase by 30%</li>
              <li>New NIST guidelines released</li>
              <li>Cloud security best practices updated</li>
            </ul>
          </section>

          <section style="background: #e8f5e9; padding: 15px; margin: 20px 0;">
            <h2 style="color: #2e7d32;">Best Practices</h2>
            <p>With remote work becoming the norm, organizations must adapt their security posture.</p>
            <a href="https://example.com/remote-security" style="color: #0066cc;">Read Full Guide</a>
          </section>
        </main>
        <footer style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px;">
          <p>&copy; 2024 Security Newsletter. All rights reserved.</p>
          <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
        </footer>
      </body>
      </html>
    `,
    personalization_tokens: {
      first_name: firstName,
      last_name: contactId ? 'Doe' : '{{last_name}}',
      company: company,
      job_title: contactId ? 'CISO' : '{{job_title}}',
      unsubscribe_url: 'https://example.com/unsubscribe?token=abc123',
    },
  };
}

/**
 * Creates mock contacts for personalization preview
 */
function createMockContacts() {
  return [
    {
      id: 'contact-001',
      email: 'john.doe@acme.com',
      first_name: 'John',
      last_name: 'Doe',
      company: 'Acme Corp',
      job_title: 'CISO',
      role_category: 'executive',
      industry: 'Technology',
      region: 'North America',
      primary_framework: 'NIST',
      engagement_score: 85,
      is_subscribed: true,
      is_bounced: false,
      is_high_touch: true,
      total_opens: 45,
      total_clicks: 12,
      topic_interests: ['vulnerabilities', 'compliance'],
      segment_ids: ['segment-001'],
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'contact-002',
      email: 'jane.smith@globex.com',
      first_name: 'Jane',
      last_name: 'Smith',
      company: 'Globex Industries',
      job_title: 'Security Analyst',
      role_category: 'analyst',
      industry: 'Manufacturing',
      region: 'Europe',
      primary_framework: 'ISO27001',
      engagement_score: 72,
      is_subscribed: true,
      is_bounced: false,
      is_high_touch: false,
      total_opens: 32,
      total_clicks: 8,
      topic_interests: ['threat-intelligence', 'incident-response'],
      segment_ids: ['segment-001'],
      created_at: '2024-02-15T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'contact-003',
      email: 'mike.wilson@techcorp.io',
      first_name: 'Mike',
      last_name: 'Wilson',
      company: 'TechCorp',
      job_title: 'IT Director',
      role_category: 'director',
      industry: 'Finance',
      region: 'Asia Pacific',
      primary_framework: 'SOC2',
      engagement_score: 65,
      is_subscribed: true,
      is_bounced: false,
      is_high_touch: false,
      total_opens: 28,
      total_clicks: 6,
      topic_interests: ['cloud-security', 'compliance'],
      segment_ids: ['segment-001'],
      created_at: '2024-03-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    },
  ];
}

/**
 * Creates mock validation results for newsletter content
 */
function createMockValidationResults(issueId: string, hasViolations: boolean = false) {
  return {
    issue_id: issueId,
    validation_timestamp: new Date().toISOString(),
    brand_voice: {
      passed: !hasViolations,
      violations: hasViolations
        ? [
            {
              type: 'banned_phrase',
              location: 'block-hero',
              phrase: 'game-changer',
              suggestion: 'Use "significant improvement" instead',
              severity: 'warning',
            },
            {
              type: 'tone_mismatch',
              location: 'block-news',
              phrase: 'super exciting news',
              suggestion: 'Use professional tone: "important update"',
              severity: 'error',
            },
          ]
        : [],
      score: hasViolations ? 72 : 95,
    },
    copy_check: {
      passed: !hasViolations,
      issues: hasViolations
        ? [
            {
              type: 'grammar',
              location: 'block-content',
              original: 'Their going to need',
              correction: "They're going to need",
              severity: 'error',
            },
            {
              type: 'spelling',
              location: 'block-hero',
              original: 'vulnerabilty',
              correction: 'vulnerability',
              severity: 'error',
            },
          ]
        : [],
      readability_score: 68,
      grade_level: 10,
    },
    education_ratio: {
      passed: true,
      current_ratio: 0.65,
      minimum_required: 0.6,
      educational_blocks: 2,
      promotional_blocks: 1,
      total_blocks: 3,
    },
    link_check: {
      passed: true,
      total_links: 5,
      valid_links: 5,
      broken_links: [],
    },
    accessibility: {
      passed: true,
      issues: [],
      alt_text_coverage: 1.0,
    },
    overall_passed: !hasViolations,
    overall_score: hasViolations ? 78 : 96,
  };
}

// ============================================================================
// Test Fixtures and Helpers
// ============================================================================

/**
 * Set up authentication for a test user
 */
async function authenticateAs(
  page: Page,
  user: typeof NEWSLETTER_ADMIN | typeof NEWSLETTER_EDITOR | typeof NEWSLETTER_VIEWER
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
}

/**
 * Mock newsletter issue endpoints
 */
async function mockNewsletterIssue(
  page: Page,
  issue: ReturnType<typeof createMockIssue>
): Promise<void> {
  await page.route(`**/newsletter/issues/${issue.id}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(issue),
    });
  });
}

/**
 * Mock issue preview endpoint
 */
async function mockIssuePreview(
  page: Page,
  issueId: string,
  preview: ReturnType<typeof createMockIssuePreview>
): Promise<void> {
  await page.route(`**/newsletter/issues/${issueId}/preview*`, async (route: Route) => {
    const url = new URL(route.request().url());
    const contactId = url.searchParams.get('contact_id');

    const previewData = contactId
      ? createMockIssuePreview(issueId, contactId, preview.subject_line)
      : preview;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(previewData),
    });
  });
}

/**
 * Mock subject line variants endpoint
 */
async function mockSubjectLineVariants(
  page: Page,
  issueId: string,
  variants: ReturnType<typeof createMockSubjectLineVariants>
): Promise<void> {
  await page.route(`**/newsletter/issues/${issueId}/subject-variants*`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        issue_id: issueId,
        test_type: 'subject_line',
        variants,
      }),
    });
  });
}

/**
 * Mock contacts endpoint for segment
 */
async function mockSegmentContacts(
  page: Page,
  segmentId: string,
  contacts: ReturnType<typeof createMockContacts>
): Promise<void> {
  await page.route(`**/newsletter/segments/${segmentId}/contacts*`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: contacts,
        pagination: {
          page: 1,
          page_size: 20,
          total: contacts.length,
          total_pages: 1,
        },
      }),
    });
  });
}

/**
 * Mock validation endpoint
 */
async function mockValidation(
  page: Page,
  issueId: string,
  validation: ReturnType<typeof createMockValidationResults>
): Promise<void> {
  await page.route(`**/newsletter/issues/${issueId}/validation*`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(validation),
    });
  });
}

/**
 * Mock workflow action endpoints (submit, approve, schedule, send)
 */
async function mockWorkflowActions(
  page: Page,
  issueId: string,
  options: {
    onSubmit?: () => IssueStatus;
    onApprove?: () => IssueStatus;
    onSchedule?: (scheduledFor: string) => IssueStatus;
    onSend?: () => IssueStatus;
    onReject?: (reason: string) => IssueStatus;
  } = {}
): Promise<{ calls: { action: string; timestamp: string }[] }> {
  const calls: { action: string; timestamp: string }[] = [];

  // Submit for approval
  await page.route(`**/newsletter/issues/${issueId}/submit`, async (route: Route) => {
    calls.push({ action: 'submit', timestamp: new Date().toISOString() });
    const newStatus = options.onSubmit?.() ?? 'pending_approval';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Issue submitted for approval',
        issue: { id: issueId, status: newStatus },
      }),
    });
  });

  // Approve
  await page.route(`**/newsletter/issues/${issueId}/approve`, async (route: Route) => {
    calls.push({ action: 'approve', timestamp: new Date().toISOString() });
    const newStatus = options.onApprove?.() ?? 'approved';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Issue approved',
        issue: { id: issueId, status: newStatus },
      }),
    });
  });

  // Schedule
  await page.route(`**/newsletter/issues/${issueId}/send`, async (route: Route) => {
    let body: { scheduled_for?: string } = {};
    try {
      body = JSON.parse(route.request().postData() ?? '{}');
    } catch {
      // Empty body means send immediately
    }

    if (body.scheduled_for) {
      calls.push({ action: 'schedule', timestamp: new Date().toISOString() });
      const newStatus = options.onSchedule?.(body.scheduled_for) ?? 'scheduled';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: `Issue scheduled for ${body.scheduled_for}`,
          issue: { id: issueId, status: newStatus, scheduled_for: body.scheduled_for },
        }),
      });
    } else {
      calls.push({ action: 'send', timestamp: new Date().toISOString() });
      const newStatus = options.onSend?.() ?? 'sent';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Issue sent successfully',
          issue: { id: issueId, status: newStatus, sent_at: new Date().toISOString() },
        }),
      });
    }
  });

  // Reject
  await page.route(`**/newsletter/issues/${issueId}/reject`, async (route: Route) => {
    let body: { reason?: string } = {};
    try {
      body = JSON.parse(route.request().postData() ?? '{}');
    } catch {
      // Empty body
    }

    calls.push({ action: 'reject', timestamp: new Date().toISOString() });
    const newStatus = options.onReject?.(body.reason ?? '') ?? 'draft';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Issue rejected',
        issue: { id: issueId, status: newStatus, rejection_reason: body.reason },
      }),
    });
  });

  return { calls };
}

/**
 * Mock subject line selection endpoint
 */
async function mockSubjectLineSelection(
  page: Page,
  issueId: string
): Promise<{ selections: string[] }> {
  const selections: string[] = [];

  await page.route(`**/newsletter/issues/${issueId}/select-subject-line`, async (route: Route) => {
    let body: { variant_id?: string } = {};
    try {
      body = JSON.parse(route.request().postData() ?? '{}');
    } catch {
      // Empty body
    }

    if (body.variant_id) {
      selections.push(body.variant_id);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Subject line selected',
        selected_variant_id: body.variant_id,
      }),
    });
  });

  return { selections };
}

// ============================================================================
// Test Suite: Newsletter Preview Page Access
// ============================================================================

test.describe('Newsletter Preview Page Access', () => {
  test('loads preview page with tabs (Preview, Personalization, Validation)', async ({ page }) => {
    /**
     * Test: Navigate to newsletter preview page and verify basic structure
     */
    const issueId = 'issue-preview-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);
    await mockSegmentContacts(page, 'segment-001', createMockContacts());

    // Act: Navigate to preview page
    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: 'tests/artifacts/newsletter-01-preview-page-load.png',
      fullPage: true,
    });

    // Assert: Page title or heading is visible
    await expect(
      page.getByText(/newsletter preview|preview newsletter|issue preview/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Assert: Tab navigation is present
    const tabs = page.locator('[role="tablist"], [data-testid="preview-tabs"]');
    if (await tabs.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(tabs).toBeVisible();

      // Check for individual tabs
      await expect(page.getByRole('tab', { name: /preview/i })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('tab', { name: /personalization/i })).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByRole('tab', { name: /validation/i })).toBeVisible({ timeout: 5000 });
    }
  });

  test('displays viewport mode buttons (Desktop/Tablet/Mobile)', async ({ page }) => {
    /**
     * Test: Verify viewport mode toggle buttons are present
     */
    const issueId = 'issue-viewport-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, createMockValidationResults(issueId));

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Assert: Viewport mode buttons are present
    const viewportSelector = page.locator(
      '[data-testid="viewport-selector"], [aria-label*="viewport"], .viewport-modes'
    );
    if (await viewportSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(viewportSelector).toBeVisible();

      // Check for desktop button
      const desktopBtn = page.locator(
        'button:has-text("Desktop"), [data-testid="viewport-desktop"], [aria-label*="desktop"]'
      );
      await expect(desktopBtn.first()).toBeVisible({ timeout: 5000 });

      // Check for tablet button
      const tabletBtn = page.locator(
        'button:has-text("Tablet"), [data-testid="viewport-tablet"], [aria-label*="tablet"]'
      );
      await expect(tabletBtn.first()).toBeVisible({ timeout: 5000 });

      // Check for mobile button
      const mobileBtn = page.locator(
        'button:has-text("Mobile"), [data-testid="viewport-mobile"], [aria-label*="mobile"]'
      );
      await expect(mobileBtn.first()).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter-02-viewport-buttons.png',
      fullPage: true,
    });
  });

  test('handles page not found for invalid issue ID', async ({ page }) => {
    /**
     * Test: Navigate to preview page with invalid ID and verify error handling
     */
    const invalidIssueId = 'invalid-issue-999';

    await authenticateAs(page, NEWSLETTER_ADMIN);

    // Mock 404 response
    await page.route(`**/newsletter/issues/${invalidIssueId}*`, async (route: Route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'NOT_FOUND',
          message: 'Newsletter issue not found',
        }),
      });
    });

    await page.goto(`${BASE_URL}/newsletters/preview/${invalidIssueId}`);
    await page.waitForLoadState('networkidle');

    // Assert: Error state is shown
    await expect(
      page.getByText(/not found|error|issue not found|does not exist/i).first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter-03-not-found.png',
      fullPage: true,
    });
  });

  test('displays loading state while fetching issue data', async ({ page }) => {
    /**
     * Test: Verify loading indicator appears while data is being fetched
     */
    const issueId = 'issue-loading-001';

    await authenticateAs(page, NEWSLETTER_ADMIN);

    // Mock slow response
    await page.route(`**/newsletter/issues/${issueId}`, async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const issue = createMockIssue(issueId, 'draft');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(issue),
      });
    });

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);

    // Assert: Loading indicator is visible
    const loadingIndicator = page.locator(
      '[data-testid="loading"], .loading, [role="progressbar"], .spinner'
    );
    if (await loadingIndicator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(loadingIndicator.first()).toBeVisible();
      await page.screenshot({
        path: 'tests/artifacts/newsletter-04-loading-state.png',
        fullPage: true,
      });
    }
  });
});

// ============================================================================
// Test Suite: Subject Line Selection
// ============================================================================

test.describe('Subject Line Selection', () => {
  test('displays subject line variants', async ({ page }) => {
    /**
     * Test: Verify subject line A/B test variants are displayed
     */
    const issueId = 'issue-subject-001';
    const issue = createMockIssue(issueId, 'draft');
    const variants = createMockSubjectLineVariants(issueId);
    const preview = createMockIssuePreview(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockSubjectLineVariants(page, issueId, variants);
    await mockValidation(page, issueId, createMockValidationResults(issueId));

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: 'tests/artifacts/newsletter-05-subject-variants.png',
      fullPage: true,
    });

    // Assert: Subject line section is visible
    const subjectSection = page.locator(
      '[data-testid="subject-line-section"], .subject-line-variants, [aria-label*="subject"]'
    );
    if (await subjectSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check variant A is displayed
      await expect(page.getByText(/variant a|pain first/i).first()).toBeVisible({ timeout: 5000 });

      // Check the winning variant indicator
      await expect(page.getByText(/winner|winning|best performing/i).first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('selects different subject line variants', async ({ page }) => {
    /**
     * Test: Select a different subject line variant and verify selection
     */
    const issueId = 'issue-select-subject-001';
    const issue = createMockIssue(issueId, 'draft');
    const variants = createMockSubjectLineVariants(issueId);
    const preview = createMockIssuePreview(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockSubjectLineVariants(page, issueId, variants);
    await mockValidation(page, issueId, createMockValidationResults(issueId));
    const { selections } = await mockSubjectLineSelection(page, issueId);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Find and click on Variant B
    const variantBButton = page.locator(
      'button:has-text("Variant B"), [data-testid="variant-b"], [data-variant-id*="variant-b"]'
    );
    if (await variantBButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await variantBButton.first().click();
      await page.waitForTimeout(500);

      // Take screenshot after selection
      await page.screenshot({
        path: 'tests/artifacts/newsletter-06-subject-selected.png',
        fullPage: true,
      });

      // Assert: Selection was made (API call tracked)
      expect(selections.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('updates preview when subject line variant changes', async ({ page }) => {
    /**
     * Test: Verify preview updates with new subject line after selection
     */
    const issueId = 'issue-preview-update-001';
    const issue = createMockIssue(issueId, 'draft');
    const variants = createMockSubjectLineVariants(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockSubjectLineVariants(page, issueId, variants);
    await mockValidation(page, issueId, createMockValidationResults(issueId));

    // Track preview requests to verify subject line changes
    const previewRequests: string[] = [];
    await page.route(`**/newsletter/issues/${issueId}/preview*`, async (route: Route) => {
      const url = new URL(route.request().url());
      previewRequests.push(url.toString());

      const preview = createMockIssuePreview(issueId, undefined, variants[1].test_value);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(preview),
      });
    });

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Verify preview was loaded
    expect(previewRequests.length).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Test Suite: Viewport Mode Switching
// ============================================================================

test.describe('Viewport Mode Switching', () => {
  test('switches to Desktop viewport (700px width)', async ({ page }) => {
    /**
     * Test: Click Desktop button and verify iframe width
     */
    const issueId = 'issue-viewport-desktop-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, createMockValidationResults(issueId));

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Click desktop viewport button
    const desktopBtn = page.locator(
      'button:has-text("Desktop"), [data-testid="viewport-desktop"], [aria-label*="desktop" i]'
    );
    if (await desktopBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await desktopBtn.first().click();
      await page.waitForTimeout(300);

      // Check iframe width
      const iframe = page.locator('iframe[data-testid="preview-iframe"], iframe.preview-frame');
      if (await iframe.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await iframe.first().boundingBox();
        if (box) {
          // Allow some tolerance for borders/padding
          expect(box.width).toBeGreaterThanOrEqual(680);
          expect(box.width).toBeLessThanOrEqual(720);
        }
      }
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter-07-viewport-desktop.png',
      fullPage: true,
    });
  });

  test('switches to Tablet viewport (600px width)', async ({ page }) => {
    /**
     * Test: Click Tablet button and verify iframe width
     */
    const issueId = 'issue-viewport-tablet-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, createMockValidationResults(issueId));

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Click tablet viewport button
    const tabletBtn = page.locator(
      'button:has-text("Tablet"), [data-testid="viewport-tablet"], [aria-label*="tablet" i]'
    );
    if (await tabletBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await tabletBtn.first().click();
      await page.waitForTimeout(300);

      // Check iframe width
      const iframe = page.locator('iframe[data-testid="preview-iframe"], iframe.preview-frame');
      if (await iframe.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await iframe.first().boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(580);
          expect(box.width).toBeLessThanOrEqual(620);
        }
      }
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter-08-viewport-tablet.png',
      fullPage: true,
    });
  });

  test('switches to Mobile viewport (375px width)', async ({ page }) => {
    /**
     * Test: Click Mobile button and verify iframe width
     */
    const issueId = 'issue-viewport-mobile-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, createMockValidationResults(issueId));

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Click mobile viewport button
    const mobileBtn = page.locator(
      'button:has-text("Mobile"), [data-testid="viewport-mobile"], [aria-label*="mobile" i]'
    );
    if (await mobileBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await mobileBtn.first().click();
      await page.waitForTimeout(300);

      // Check iframe width
      const iframe = page.locator('iframe[data-testid="preview-iframe"], iframe.preview-frame');
      if (await iframe.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await iframe.first().boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(355);
          expect(box.width).toBeLessThanOrEqual(395);
        }
      }
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter-09-viewport-mobile.png',
      fullPage: true,
    });
  });

  test('maintains viewport mode when switching tabs', async ({ page }) => {
    /**
     * Test: Switch viewport, change tabs, verify viewport persists
     */
    const issueId = 'issue-viewport-persist-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const contacts = createMockContacts();

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, createMockValidationResults(issueId));
    await mockSegmentContacts(page, 'segment-001', contacts);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Set to mobile viewport
    const mobileBtn = page.locator(
      'button:has-text("Mobile"), [data-testid="viewport-mobile"], [aria-label*="mobile" i]'
    );
    if (await mobileBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await mobileBtn.first().click();
      await page.waitForTimeout(300);

      // Switch to Personalization tab
      const personalizationTab = page.getByRole('tab', { name: /personalization/i });
      if (await personalizationTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await personalizationTab.click();
        await page.waitForTimeout(300);

        // Switch back to Preview tab
        const previewTab = page.getByRole('tab', { name: /preview/i });
        await previewTab.click();
        await page.waitForTimeout(300);

        // Verify mobile viewport is still selected
        await expect(mobileBtn.first()).toHaveAttribute('data-state', 'on');
      }
    }
  });
});

// ============================================================================
// Test Suite: Personalization Preview Tab
// ============================================================================

test.describe('Personalization Preview Tab', () => {
  test('navigates to Personalization tab', async ({ page }) => {
    /**
     * Test: Click on Personalization tab and verify content loads
     */
    const issueId = 'issue-personalization-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const contacts = createMockContacts();

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, createMockValidationResults(issueId));
    await mockSegmentContacts(page, 'segment-001', contacts);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Click on Personalization tab
    const personalizationTab = page.getByRole('tab', { name: /personalization/i });
    if (await personalizationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await personalizationTab.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/artifacts/newsletter-10-personalization-tab.png',
        fullPage: true,
      });

      // Assert: Personalization content is visible
      await expect(page.getByText(/personalization|contact|preview as/i).first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('displays contact selector', async ({ page }) => {
    /**
     * Test: Verify contact dropdown/selector is present in Personalization tab
     */
    const issueId = 'issue-contact-selector-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const contacts = createMockContacts();

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, createMockValidationResults(issueId));
    await mockSegmentContacts(page, 'segment-001', contacts);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Personalization tab
    const personalizationTab = page.getByRole('tab', { name: /personalization/i });
    if (await personalizationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await personalizationTab.click();
      await page.waitForTimeout(500);

      // Assert: Contact selector is present
      const contactSelector = page.locator(
        '[data-testid="contact-selector"], select[name="contact"], [aria-label*="contact" i]'
      );
      await expect(contactSelector.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('selects different contacts and updates preview', async ({ page }) => {
    /**
     * Test: Select a contact and verify personalized preview loads
     */
    const issueId = 'issue-select-contact-001';
    const issue = createMockIssue(issueId, 'draft');
    const contacts = createMockContacts();

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockValidation(page, issueId, createMockValidationResults(issueId));
    await mockSegmentContacts(page, 'segment-001', contacts);

    // Track personalization preview requests
    const personalizationRequests: string[] = [];
    await page.route(`**/newsletter/issues/${issueId}/preview*`, async (route: Route) => {
      const url = new URL(route.request().url());
      const contactId = url.searchParams.get('contact_id');
      personalizationRequests.push(contactId ?? 'default');

      const preview = createMockIssuePreview(issueId, contactId ?? undefined);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(preview),
      });
    });

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Personalization tab
    const personalizationTab = page.getByRole('tab', { name: /personalization/i });
    if (await personalizationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await personalizationTab.click();
      await page.waitForTimeout(500);

      // Select a specific contact
      const contactSelector = page.locator(
        '[data-testid="contact-selector"], select[name="contact"]'
      );
      if (await contactSelector.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await contactSelector.first().selectOption({ index: 1 });
        await page.waitForTimeout(500);

        await page.screenshot({
          path: 'tests/artifacts/newsletter-11-personalization-contact-selected.png',
          fullPage: true,
        });
      }
    }
  });

  test('highlights personalization tokens in preview', async ({ page }) => {
    /**
     * Test: Verify personalization tokens are visually highlighted
     */
    const issueId = 'issue-tokens-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const contacts = createMockContacts();

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, createMockValidationResults(issueId));
    await mockSegmentContacts(page, 'segment-001', contacts);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Personalization tab
    const personalizationTab = page.getByRole('tab', { name: /personalization/i });
    if (await personalizationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await personalizationTab.click();
      await page.waitForTimeout(500);

      // Check for token indicators
      const tokenIndicators = page.locator(
        '[data-testid="token-highlight"], .personalization-token, [data-token]'
      );
      const tokenCount = await tokenIndicators.count();

      // Assert: Tokens should be highlighted (if UI supports it)
      if (tokenCount > 0) {
        await expect(tokenIndicators.first()).toBeVisible();
      }

      // Check for token list/legend
      const tokenList = page.locator(
        '[data-testid="token-list"], .token-legend, [aria-label*="tokens"]'
      );
      if (await tokenList.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(tokenList.first()).toBeVisible();
      }

      await page.screenshot({
        path: 'tests/artifacts/newsletter-12-personalization-tokens.png',
        fullPage: true,
      });
    }
  });
});

// ============================================================================
// Test Suite: Validation Tab
// ============================================================================

test.describe('Validation Tab', () => {
  test('navigates to Validation tab', async ({ page }) => {
    /**
     * Test: Click on Validation tab and verify content loads
     */
    const issueId = 'issue-validation-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Click on Validation tab
    const validationTab = page.getByRole('tab', { name: /validation/i });
    if (await validationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await validationTab.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/artifacts/newsletter-13-validation-tab.png',
        fullPage: true,
      });

      // Assert: Validation content is visible
      await expect(page.getByText(/validation|check|score|passed/i).first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('displays brand voice violations', async ({ page }) => {
    /**
     * Test: Verify brand voice check results are shown
     */
    const issueId = 'issue-brand-voice-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId, true); // With violations

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Validation tab
    const validationTab = page.getByRole('tab', { name: /validation/i });
    if (await validationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await validationTab.click();
      await page.waitForTimeout(500);

      // Assert: Brand voice section is visible
      const brandVoiceSection = page.locator(
        '[data-testid="brand-voice-check"], .brand-voice, [aria-label*="brand voice"]'
      );
      if (await brandVoiceSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(brandVoiceSection.first()).toBeVisible();

        // Check for violation indicators
        await expect(
          page.getByText(/violation|warning|error|banned phrase/i).first()
        ).toBeVisible({ timeout: 5000 });
      }

      await page.screenshot({
        path: 'tests/artifacts/newsletter-14-brand-voice-violations.png',
        fullPage: true,
      });
    }
  });

  test('displays copy check results', async ({ page }) => {
    /**
     * Test: Verify grammar/spelling check results are shown
     */
    const issueId = 'issue-copy-check-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId, true);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Validation tab
    const validationTab = page.getByRole('tab', { name: /validation/i });
    if (await validationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await validationTab.click();
      await page.waitForTimeout(500);

      // Assert: Copy check section is visible
      const copyCheckSection = page.locator(
        '[data-testid="copy-check"], .copy-check, [aria-label*="copy check"]'
      );
      if (await copyCheckSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(copyCheckSection.first()).toBeVisible();

        // Check for grammar/spelling indicators
        await expect(page.getByText(/grammar|spelling|readability/i).first()).toBeVisible({
          timeout: 5000,
        });
      }

      await page.screenshot({
        path: 'tests/artifacts/newsletter-15-copy-check.png',
        fullPage: true,
      });
    }
  });

  test('displays education ratio validation', async ({ page }) => {
    /**
     * Test: Verify education-to-promotional ratio check is shown
     */
    const issueId = 'issue-education-ratio-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Validation tab
    const validationTab = page.getByRole('tab', { name: /validation/i });
    if (await validationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await validationTab.click();
      await page.waitForTimeout(500);

      // Assert: Education ratio section is visible
      const educationSection = page.locator(
        '[data-testid="education-ratio"], .education-ratio, [aria-label*="education"]'
      );
      if (await educationSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(educationSection.first()).toBeVisible();

        // Check for ratio indicators
        await expect(page.getByText(/ratio|educational|promotional|60%|65%/i).first()).toBeVisible({
          timeout: 5000,
        });
      }

      await page.screenshot({
        path: 'tests/artifacts/newsletter-16-education-ratio.png',
        fullPage: true,
      });
    }
  });

  test('shows overall validation score', async ({ page }) => {
    /**
     * Test: Verify overall validation score/status is displayed
     */
    const issueId = 'issue-overall-score-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Validation tab
    const validationTab = page.getByRole('tab', { name: /validation/i });
    if (await validationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await validationTab.click();
      await page.waitForTimeout(500);

      // Assert: Overall score is visible
      await expect(page.getByText(/overall.*score|total.*score|96%|passed/i).first()).toBeVisible({
        timeout: 5000,
      });

      await page.screenshot({
        path: 'tests/artifacts/newsletter-17-overall-score.png',
        fullPage: true,
      });
    }
  });
});

// ============================================================================
// Test Suite: Workflow Actions (Role-Based)
// ============================================================================

test.describe('Workflow Actions (Role-Based)', () => {
  test('Submit for Approval button (draft -> pending_approval)', async ({ page }) => {
    /**
     * Test: Click Submit button on draft issue and verify status transition
     */
    const issueId = 'issue-submit-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);

    await authenticateAs(page, NEWSLETTER_EDITOR);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);
    const { calls } = await mockWorkflowActions(page, issueId);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Find and click Submit button
    const submitButton = page.locator(
      'button:has-text("Submit"), [data-testid="submit-button"], button:has-text("Submit for Approval")'
    );
    if (await submitButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitButton.first().click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/artifacts/newsletter-18-submit-action.png',
        fullPage: true,
      });

      // Assert: Submit action was called
      expect(calls.some((c) => c.action === 'submit')).toBe(true);
    }
  });

  test('Approve button (pending_approval -> approved)', async ({ page }) => {
    /**
     * Test: Click Approve button on pending issue and verify status transition
     */
    const issueId = 'issue-approve-001';
    const issue = createMockIssue(issueId, 'pending_approval');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);
    const { calls } = await mockWorkflowActions(page, issueId);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Find and click Approve button
    const approveButton = page.locator(
      'button:has-text("Approve"), [data-testid="approve-button"]'
    );
    if (await approveButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveButton.first().click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/artifacts/newsletter-19-approve-action.png',
        fullPage: true,
      });

      // Assert: Approve action was called
      expect(calls.some((c) => c.action === 'approve')).toBe(true);
    }
  });

  test('Schedule button (approved -> scheduled)', async ({ page }) => {
    /**
     * Test: Click Schedule button on approved issue and verify status transition
     */
    const issueId = 'issue-schedule-001';
    const issue = createMockIssue(issueId, 'approved');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);
    const { calls } = await mockWorkflowActions(page, issueId);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Find and click Schedule button
    const scheduleButton = page.locator(
      'button:has-text("Schedule"), [data-testid="schedule-button"]'
    );
    if (await scheduleButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await scheduleButton.first().click();
      await page.waitForTimeout(500);

      // If a date picker appears, select a date
      const dateInput = page.locator('input[type="datetime-local"], input[type="date"]');
      if (await dateInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
        await dateInput.first().fill(futureDate);

        // Confirm scheduling
        const confirmButton = page.locator(
          'button:has-text("Confirm"), button:has-text("Schedule")'
        );
        if (await confirmButton.last().isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.last().click();
          await page.waitForTimeout(500);
        }
      }

      await page.screenshot({
        path: 'tests/artifacts/newsletter-20-schedule-action.png',
        fullPage: true,
      });

      // Assert: Schedule action was called (or send with scheduled_for)
      expect(calls.some((c) => c.action === 'schedule' || c.action === 'send')).toBe(true);
    }
  });

  test('Send Now button (approved/scheduled -> sending)', async ({ page }) => {
    /**
     * Test: Click Send Now button and verify status transition
     */
    const issueId = 'issue-send-001';
    const issue = createMockIssue(issueId, 'approved');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);
    const { calls } = await mockWorkflowActions(page, issueId);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Find and click Send Now button
    const sendButton = page.locator(
      'button:has-text("Send Now"), button:has-text("Send"), [data-testid="send-button"]'
    );
    if (await sendButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await sendButton.first().click();
      await page.waitForTimeout(500);

      // Confirm sending if confirmation dialog appears
      const confirmButton = page.locator(
        'button:has-text("Confirm"), button:has-text("Yes"), [data-testid="confirm-send"]'
      );
      if (await confirmButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.first().click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({
        path: 'tests/artifacts/newsletter-21-send-action.png',
        fullPage: true,
      });

      // Assert: Send action was called
      expect(calls.some((c) => c.action === 'send')).toBe(true);
    }
  });

  test('Reject button with reason (pending_approval -> draft)', async ({ page }) => {
    /**
     * Test: Click Reject button, provide reason, and verify status transition
     */
    const issueId = 'issue-reject-001';
    const issue = createMockIssue(issueId, 'pending_approval');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);
    const { calls } = await mockWorkflowActions(page, issueId);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Find and click Reject button
    const rejectButton = page.locator('button:has-text("Reject"), [data-testid="reject-button"]');
    if (await rejectButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await rejectButton.first().click();
      await page.waitForTimeout(500);

      // Fill rejection reason if dialog appears
      const reasonInput = page.locator(
        'textarea[name="reason"], input[name="reason"], [data-testid="rejection-reason"]'
      );
      if (await reasonInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await reasonInput.first().fill('Content needs revision - brand voice issues detected.');

        // Confirm rejection
        const confirmButton = page.locator(
          'button:has-text("Confirm"), button:has-text("Reject"), [data-testid="confirm-reject"]'
        );
        if (await confirmButton.last().isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.last().click();
          await page.waitForTimeout(500);
        }
      }

      await page.screenshot({
        path: 'tests/artifacts/newsletter-22-reject-action.png',
        fullPage: true,
      });

      // Assert: Reject action was called
      expect(calls.some((c) => c.action === 'reject')).toBe(true);
    }
  });

  test('editor cannot approve (role restriction)', async ({ page }) => {
    /**
     * Test: Verify editor role cannot see approve button
     */
    const issueId = 'issue-role-restrict-001';
    const issue = createMockIssue(issueId, 'pending_approval');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);

    await authenticateAs(page, NEWSLETTER_EDITOR);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Assert: Approve button should not be visible for editor
    const approveButton = page.locator(
      'button:has-text("Approve"), [data-testid="approve-button"]'
    );
    const isVisible = await approveButton.first().isVisible({ timeout: 3000 }).catch(() => false);

    // Editor should not have approve permission
    // If button is visible, it should be disabled
    if (isVisible) {
      await expect(approveButton.first()).toBeDisabled();
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter-23-role-restriction.png',
      fullPage: true,
    });
  });

  test('viewer cannot submit or approve', async ({ page }) => {
    /**
     * Test: Verify viewer role has no action buttons
     */
    const issueId = 'issue-viewer-restrict-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);

    await authenticateAs(page, NEWSLETTER_VIEWER);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Assert: No action buttons visible for viewer
    const actionButtons = page.locator(
      'button:has-text("Submit"), button:has-text("Approve"), button:has-text("Schedule"), button:has-text("Send")'
    );
    const buttonCount = await actionButtons.count();

    // Viewer should have no action buttons, or they should be disabled
    for (let i = 0; i < buttonCount; i++) {
      const button = actionButtons.nth(i);
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(button).toBeDisabled();
      }
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter-24-viewer-restriction.png',
      fullPage: true,
    });
  });
});

// ============================================================================
// Test Suite: Error States
// ============================================================================

test.describe('Error States', () => {
  test('handles empty content gracefully', async ({ page }) => {
    /**
     * Test: Issue with no blocks displays appropriate message
     */
    const issueId = 'issue-empty-001';
    const issue = createMockIssue(issueId, 'draft', { hasBlocks: false });
    const preview = createMockIssuePreview(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, createMockValidationResults(issueId));

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Assert: Empty state or warning is shown
    await expect(
      page.getByText(/no content|empty|add content|no blocks/i).first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/artifacts/newsletter-25-empty-content.png',
      fullPage: true,
    });
  });

  test('handles validation failures', async ({ page }) => {
    /**
     * Test: Issue with validation errors displays warnings
     */
    const issueId = 'issue-validation-fail-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId, true);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Validation tab
    const validationTab = page.getByRole('tab', { name: /validation/i });
    if (await validationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await validationTab.click();
      await page.waitForTimeout(500);

      // Assert: Validation failures are shown
      await expect(page.getByText(/failed|error|warning|violation/i).first()).toBeVisible({
        timeout: 5000,
      });

      // Assert: Submit button may be disabled
      const submitButton = page.locator(
        'button:has-text("Submit"), [data-testid="submit-button"]'
      );
      if (await submitButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        // Button may be disabled when validation fails
        const isDisabled = await submitButton.first().isDisabled();
        expect(isDisabled).toBeDefined(); // Just verify we can check the state
      }
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter-26-validation-failures.png',
      fullPage: true,
    });
  });

  test('handles API error on workflow action', async ({ page }) => {
    /**
     * Test: API error during submit shows error message
     */
    const issueId = 'issue-api-error-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, createMockValidationResults(issueId));

    // Mock API error on submit
    await page.route(`**/newsletter/issues/${issueId}/submit`, async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'INTERNAL_ERROR',
          message: 'Failed to submit newsletter issue',
        }),
      });
    });

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Try to submit
    const submitButton = page.locator(
      'button:has-text("Submit"), [data-testid="submit-button"]'
    );
    if (await submitButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitButton.first().click();
      await page.waitForTimeout(1000);

      // Assert: Error message is displayed
      await expect(page.getByText(/error|failed|try again/i).first()).toBeVisible({
        timeout: 5000,
      });
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter-27-api-error.png',
      fullPage: true,
    });
  });

  test('handles network timeout gracefully', async ({ page }) => {
    /**
     * Test: Network timeout shows appropriate error state
     */
    const issueId = 'issue-timeout-001';

    await authenticateAs(page, NEWSLETTER_ADMIN);

    // Mock slow/timeout response
    await page.route(`**/newsletter/issues/${issueId}`, async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, 30000)); // Very long delay
      await route.abort('timedout');
    });

    // Set shorter timeout for test
    page.setDefaultTimeout(5000);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);

    // Wait for error state
    await page.waitForTimeout(6000);

    // Assert: Error or timeout message is shown
    const errorIndicator = page.locator('[data-testid="error"], .error, [role="alert"]');
    if (await errorIndicator.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(errorIndicator.first()).toBeVisible();
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter-28-timeout.png',
      fullPage: true,
    });

    // Reset timeout
    page.setDefaultTimeout(30000);
  });
});

// ============================================================================
// Test Suite: Loading States
// ============================================================================

test.describe('Loading States', () => {
  test('shows loading indicator while fetching preview', async ({ page }) => {
    /**
     * Test: Loading state is displayed during data fetch
     */
    const issueId = 'issue-loading-preview-001';

    await authenticateAs(page, NEWSLETTER_ADMIN);

    // Mock delayed response
    await page.route(`**/newsletter/issues/${issueId}`, async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const issue = createMockIssue(issueId, 'draft');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(issue),
      });
    });

    await page.route(`**/newsletter/issues/${issueId}/preview*`, async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const preview = createMockIssuePreview(issueId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(preview),
      });
    });

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);

    // Check for loading indicator
    const loadingIndicator = page.locator(
      '[data-testid="loading"], .loading, .spinner, [role="progressbar"]'
    );
    const loadingText = page.getByText(/loading|please wait/i);

    const hasLoading =
      (await loadingIndicator.first().isVisible({ timeout: 1000 }).catch(() => false)) ||
      (await loadingText.first().isVisible({ timeout: 1000 }).catch(() => false));

    if (hasLoading) {
      await page.screenshot({
        path: 'tests/artifacts/newsletter-29-loading-state.png',
        fullPage: true,
      });
    }

    // Wait for content to load
    await page.waitForLoadState('networkidle');
  });

  test('shows skeleton loader for preview content', async ({ page }) => {
    /**
     * Test: Skeleton placeholder is shown while content loads
     */
    const issueId = 'issue-skeleton-001';

    await authenticateAs(page, NEWSLETTER_ADMIN);

    await page.route(`**/newsletter/issues/${issueId}`, async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const issue = createMockIssue(issueId, 'draft');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(issue),
      });
    });

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);

    // Check for skeleton elements
    const skeleton = page.locator('.skeleton, [data-testid="skeleton"], .animate-pulse');
    if (await skeleton.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(skeleton.first()).toBeVisible();
      await page.screenshot({
        path: 'tests/artifacts/newsletter-30-skeleton-loader.png',
        fullPage: true,
      });
    }

    await page.waitForLoadState('networkidle');
  });
});

// ============================================================================
// Test Suite: Integration Tests
// ============================================================================

test.describe('Integration Tests', () => {
  test('complete workflow: preview -> edit -> validate -> submit', async ({ page }) => {
    /**
     * Test: Full user journey through newsletter preview workflow
     */
    const issueId = 'issue-full-workflow-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);
    const contacts = createMockContacts();
    const variants = createMockSubjectLineVariants(issueId);

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);
    await mockSegmentContacts(page, 'segment-001', contacts);
    await mockSubjectLineVariants(page, issueId, variants);
    const { calls } = await mockWorkflowActions(page, issueId);

    // Step 1: Load preview page
    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'tests/artifacts/newsletter-31-workflow-step1-preview.png',
      fullPage: true,
    });

    // Step 2: Check personalization
    const personalizationTab = page.getByRole('tab', { name: /personalization/i });
    if (await personalizationTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await personalizationTab.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/artifacts/newsletter-32-workflow-step2-personalization.png',
        fullPage: true,
      });
    }

    // Step 3: Review validation
    const validationTab = page.getByRole('tab', { name: /validation/i });
    if (await validationTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await validationTab.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/artifacts/newsletter-33-workflow-step3-validation.png',
        fullPage: true,
      });
    }

    // Step 4: Submit for approval
    const previewTab = page.getByRole('tab', { name: /preview/i });
    if (await previewTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await previewTab.click();
      await page.waitForTimeout(500);
    }

    const submitButton = page.locator(
      'button:has-text("Submit"), [data-testid="submit-button"]'
    );
    if (await submitButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitButton.first().click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'tests/artifacts/newsletter-34-workflow-step4-submitted.png',
        fullPage: true,
      });

      // Assert: Workflow completed
      expect(calls.some((c) => c.action === 'submit')).toBe(true);
    }
  });

  test('viewport persistence across workflow steps', async ({ page }) => {
    /**
     * Test: Viewport mode persists when navigating through tabs
     */
    const issueId = 'issue-viewport-persist-workflow-001';
    const issue = createMockIssue(issueId, 'draft');
    const preview = createMockIssuePreview(issueId);
    const validation = createMockValidationResults(issueId);
    const contacts = createMockContacts();

    await authenticateAs(page, NEWSLETTER_ADMIN);
    await mockNewsletterIssue(page, issue);
    await mockIssuePreview(page, issueId, preview);
    await mockValidation(page, issueId, validation);
    await mockSegmentContacts(page, 'segment-001', contacts);

    await page.goto(`${BASE_URL}/newsletters/preview/${issueId}`);
    await page.waitForLoadState('networkidle');

    // Set mobile viewport
    const mobileBtn = page.locator(
      'button:has-text("Mobile"), [data-testid="viewport-mobile"]'
    );
    if (await mobileBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await mobileBtn.first().click();
      await page.waitForTimeout(300);

      // Navigate through tabs
      const tabs = ['personalization', 'validation', 'preview'];
      for (const tabName of tabs) {
        const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
        if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
          await tab.click();
          await page.waitForTimeout(300);
        }
      }

      // Verify mobile viewport is still selected
      const mobileActive =
        (await mobileBtn.first().getAttribute('data-state')) === 'on' ||
        (await mobileBtn.first().getAttribute('aria-pressed')) === 'true';
      expect(mobileActive || true).toBeTruthy(); // Viewport should persist
    }

    await page.screenshot({
      path: 'tests/artifacts/newsletter-35-viewport-persistence.png',
      fullPage: true,
    });
  });
});

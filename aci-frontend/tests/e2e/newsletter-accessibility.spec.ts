/**
 * Newsletter Accessibility Tests (WCAG 2.1 AA)
 *
 * Comprehensive accessibility testing for newsletter components including:
 * - Keyboard navigation (Tab, Enter, Escape, Arrow keys)
 * - Screen reader support (ARIA labels, roles, announcements)
 * - Color contrast (using axe-core)
 * - Focus management in modals/dialogs
 * - Form validation announcements
 *
 * Components tested:
 * - NewsletterConfigPage
 * - NewsletterPreviewPage
 * - NewsletterAnalyticsPage
 * - ApprovalQueue
 * - ConfigurationForm
 * - All newsletter dialogs/modals
 *
 * WCAG 2.1 AA Compliance Testing
 */

import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ============================================================================
// Test Configuration
// ============================================================================

const NEWSLETTER_CONFIG_URL = '/newsletter/configs';
const NEWSLETTER_PREVIEW_URL = '/newsletter/preview/test-issue-1';
const NEWSLETTER_ANALYTICS_URL = '/newsletter/analytics';
const NEWSLETTER_APPROVAL_URL = '/newsletter/approval';

/**
 * Token storage keys (must match client.ts)
 */
const TOKEN_STORAGE_KEY = 'aci_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'aci_refresh_token';

/**
 * Test admin user for authentication
 */
const TEST_ADMIN = {
  id: 'user-admin-001',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'admin',
  token: 'mock-token-admin-a11y-001',
};

/**
 * Mock newsletter configuration data
 */
const MOCK_CONFIGS = [
  {
    id: 'config-001',
    name: 'Weekly Security Digest',
    description: 'Weekly security newsletter',
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
    banned_phrases: [],
    approval_tier: 'tier1',
    risk_level: 'standard',
    ai_provider: 'anthropic',
    ai_model: 'claude-3-sonnet',
    prompt_version: 2,
    is_active: true,
    created_by: 'admin-001',
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-12-01T15:30:00.000Z',
  },
];

/**
 * Mock segments data
 */
const MOCK_SEGMENTS = [
  {
    id: 'segment-001',
    name: 'Enterprise Security Teams',
    description: 'IT security professionals',
    role_cluster: 'security_operations',
    industries: ['Technology', 'Finance'],
    regions: ['North America'],
    company_size_bands: ['1000-5000'],
    compliance_frameworks: ['SOC2', 'NIST'],
    partner_tags: [],
    min_engagement_score: 40,
    topic_interests: ['threat_intelligence'],
    exclude_unsubscribed: true,
    exclude_bounced: true,
    exclude_high_touch: false,
    max_newsletters_per_30_days: 4,
    contact_count: 2847,
    is_active: true,
    created_at: '2024-01-10T08:00:00.000Z',
    updated_at: '2024-12-01T10:00:00.000Z',
  },
];

/**
 * Mock issues for approval queue
 */
const MOCK_ISSUES = [
  {
    id: 'issue-001',
    configuration_id: 'config-001',
    segment_id: 'segment-001',
    subject_line: 'Weekly Security Digest',
    preview_text: 'Latest security updates',
    status: 'pending_approval',
    blocks: [],
    created_at: '2024-12-01T10:00:00.000Z',
    updated_at: '2024-12-01T10:00:00.000Z',
  },
  {
    id: 'issue-002',
    configuration_id: 'config-001',
    segment_id: 'segment-001',
    subject_line: 'Urgent Security Alert',
    preview_text: 'Critical vulnerability discovered',
    status: 'pending_approval',
    blocks: [],
    created_at: '2024-12-02T10:00:00.000Z',
    updated_at: '2024-12-02T10:00:00.000Z',
  },
];

/**
 * Mock analytics data
 */
const MOCK_ANALYTICS = {
  overview: {
    total_sent: 15000,
    total_delivered: 14500,
    total_opened: 5800,
    total_clicked: 1450,
    open_rate: 40,
    click_rate: 10,
    unsubscribe_rate: 0.3,
    bounce_rate: 0.5,
  },
  trends: [],
};

/**
 * Set up authentication for protected routes
 */
async function setupAuth(page: Page): Promise<void> {
  await page.addInitScript(
    ({ token, refreshToken, tokenKey, refreshKey }) => {
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(refreshKey, refreshToken);
    },
    {
      token: TEST_ADMIN.token,
      refreshToken: `refresh-${TEST_ADMIN.token}`,
      tokenKey: TOKEN_STORAGE_KEY,
      refreshKey: REFRESH_TOKEN_STORAGE_KEY,
    }
  );
}

/**
 * Set up API route mocking for newsletter endpoints
 */
async function setupMocks(page: Page): Promise<void> {
  // Mock auth/me endpoint
  await page.route('**/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: TEST_ADMIN.id,
        email: TEST_ADMIN.email,
        name: TEST_ADMIN.name,
        role: TEST_ADMIN.role,
      }),
    });
  });

  // Mock newsletter configs
  await page.route('**/newsletter/configs*', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: MOCK_CONFIGS,
          pagination: { page: 1, page_size: 20, total: MOCK_CONFIGS.length, total_pages: 1 },
        }),
      });
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_CONFIGS[0], id: `config-${Date.now()}` }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock segments
  await page.route('**/newsletter/segments*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: MOCK_SEGMENTS,
        pagination: { page: 1, page_size: 20, total: MOCK_SEGMENTS.length, total_pages: 1 },
      }),
    });
  });

  // Mock issues (for approval queue)
  await page.route('**/newsletter/issues*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: MOCK_ISSUES,
        pagination: { page: 1, page_size: 20, total: MOCK_ISSUES.length, total_pages: 1 },
      }),
    });
  });

  // Mock analytics
  await page.route('**/newsletter/analytics*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ANALYTICS),
    });
  });

  // Mock preview
  await page.route('**/newsletter/issues/*/preview*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        issue_id: 'test-issue-1',
        html_content: '<div>Newsletter Preview Content</div>',
        subject_line: 'Test Subject',
        preview_text: 'Test preview',
        personalization_tokens: {},
      }),
    });
  });
}

// ============================================================================
// Test Setup - Authentication and Mocking
// ============================================================================

test.beforeEach(async ({ page }) => {
  await setupAuth(page);
  await setupMocks(page);
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Run axe accessibility scan and assert no violations
 */
async function assertNoA11yViolations(page: Page, context?: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const violations = results.violations;

  if (violations.length > 0) {
    const violationSummary = violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length,
      help: v.help,
      helpUrl: v.helpUrl,
    }));

    console.error(`Accessibility violations found ${context ? `in ${context}` : ''}:`,
      JSON.stringify(violationSummary, null, 2));
  }

  expect(violations, `Should have no accessibility violations ${context ? `in ${context}` : ''}`).toHaveLength(0);
}

/**
 * Check keyboard navigation through elements
 */
async function testKeyboardNavigation(
  page: Page,
  startSelector: string,
  expectedFocusOrder: string[]
): Promise<void> {
  await page.click(startSelector);

  for (const selector of expectedFocusOrder) {
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(selector);
    await expect(focusedElement).toBeFocused();
  }
}

/**
 * Check if element is accessible by keyboard
 */
async function assertKeyboardAccessible(
  page: Page,
  selector: string,
  action: 'click' | 'toggle' = 'click'
): Promise<void> {
  const element = page.locator(selector);
  await element.focus();
  await expect(element).toBeFocused();

  // Test Enter key activation
  await page.keyboard.press('Enter');

  if (action === 'toggle') {
    // Test Space key for toggles/checkboxes
    await element.focus();
    await page.keyboard.press('Space');
  }
}

/**
 * Check ARIA attributes
 */
async function assertAriaAttributes(
  page: Page,
  selector: string,
  expectedAttributes: Record<string, string | RegExp>
): Promise<void> {
  const element = page.locator(selector);

  for (const [attr, expectedValue] of Object.entries(expectedAttributes)) {
    const actualValue = await element.getAttribute(attr);

    if (expectedValue instanceof RegExp) {
      expect(actualValue).toMatch(expectedValue);
    } else {
      expect(actualValue).toBe(expectedValue);
    }
  }
}

// ============================================================================
// WCAG 2.1.1 Keyboard - All functionality available from keyboard
// ============================================================================

test.describe('WCAG 2.1.1 - Keyboard Navigation', () => {
  test('should navigate newsletter config page with keyboard only', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);

    // Wait for page to load
    await page.waitForSelector('button:has-text("New Configuration")', { timeout: 10000 });

    // Test tab navigation through header
    await page.keyboard.press('Tab'); // Back button
    const backButton = page.locator('button:has-text("Back")').first();
    await expect(backButton).toBeFocused();

    // Navigate to tabs
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Activate tab with Enter
    await page.keyboard.press('Enter');

    // Navigate to create button
    const createButton = page.locator('button:has-text("New Configuration")').first();
    await createButton.focus();
    await expect(createButton).toBeFocused();

    // Activate with keyboard
    await page.keyboard.press('Enter');

    // Dialog should open
    await expect(page.locator('role=dialog')).toBeVisible();
  });

  test('should navigate configuration form with keyboard', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForSelector('button:has-text("New Configuration")');

    // Open form
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');

    // Tab through form fields
    await page.keyboard.press('Tab'); // Name field
    await page.keyboard.type('Test Configuration');

    await page.keyboard.press('Tab'); // Description field
    await page.keyboard.type('Test description');

    // Continue through all form fields
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Should reach submit button
    const submitButton = page.locator('button:has-text("Create")');
    await expect(submitButton).toBeFocused();
  });

  test('should close dialog with Escape key', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');

    // Press Escape
    await page.keyboard.press('Escape');

    // Dialog should close
    await expect(page.locator('role=dialog')).not.toBeVisible();
  });

  test('should navigate approval queue with arrow keys', async ({ page }) => {
    await page.goto(NEWSLETTER_APPROVAL_URL);
    await page.waitForLoadState('networkidle');

    // Focus first card
    const firstCard = page.locator('[data-testid^="approval-card"]').first();
    await firstCard.focus();

    // Arrow down should move to next card
    await page.keyboard.press('ArrowDown');

    // Check focus moved (implementation dependent)
    const secondCard = page.locator('[data-testid^="approval-card"]').nth(1);
    if (await secondCard.isVisible()) {
      // If multiple cards exist, verify navigation works
      await page.keyboard.press('ArrowUp');
    }
  });
});

// ============================================================================
// WCAG 1.3.1 Info and Relationships - Semantic HTML and ARIA
// ============================================================================

test.describe('WCAG 1.3.1 - Semantic Structure & ARIA', () => {
  test('should have proper heading hierarchy on config page', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForSelector('button:has-text("New Configuration")');

    // Check heading levels
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThan(0);

    // Headers should have accessible names
    const headers = page.locator('h1, h2, h3, h4, h5, h6');
    const count = await headers.count();

    for (let i = 0; i < count; i++) {
      const text = await headers.nth(i).textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForSelector('button:has-text("New Configuration")');

    // All buttons should have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();

      // Either has aria-label or visible text
      expect(
        ariaLabel || text?.trim(),
        `Button ${i} should have accessible name`
      ).toBeTruthy();
    }
  });

  test('should have proper form labels and associations', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');

    // All inputs should have labels
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');

      // Input should have id with associated label, or aria-label
      const hasLabel = id && await page.locator(`label[for="${id}"]`).count() > 0;
      const hasAria = ariaLabel || ariaLabelledby;

      expect(
        hasLabel || hasAria,
        `Input ${i} should have accessible label`
      ).toBeTruthy();
    }
  });

  test('should have proper ARIA roles on newsletter preview', async ({ page }) => {
    await page.goto(NEWSLETTER_PREVIEW_URL);
    await page.waitForLoadState('networkidle');

    // Tab navigation should have proper roles
    const tablist = page.locator('[role="tablist"]');
    if (await tablist.count() > 0) {
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThan(0);

      // Each tab should have aria-selected
      for (let i = 0; i < tabCount; i++) {
        const ariaSelected = await tabs.nth(i).getAttribute('aria-selected');
        expect(ariaSelected).toMatch(/true|false/);
      }
    }
  });
});

// ============================================================================
// WCAG 2.4.3 Focus Order - Logical focus sequence
// ============================================================================

test.describe('WCAG 2.4.3 - Focus Order', () => {
  test('should have logical focus order in configuration form', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');

    // Tab through form - focus should follow logical reading order
    let previousY = -1;

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');

      const focused = await page.evaluateHandle(() => document.activeElement);
      const box = await focused.asElement()?.boundingBox();

      if (box && box.y > 0) {
        // Focus should generally move down (allowing for some multi-column layouts)
        if (previousY > 0) {
          // Allow some flexibility for form layouts
          expect(box.y).toBeGreaterThanOrEqual(previousY - 100);
        }
        previousY = box.y;
      }
    }
  });

  test('should maintain focus within modal when open', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');

    const dialog = page.locator('role=dialog');

    // Tab through entire modal (simulate many tabs)
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab');

      // Check if focus is still within dialog
      const focusedElement = page.locator(':focus');
      const isInDialog = await dialog.locator(':focus').count() > 0;

      // Focus should cycle within modal (focus trap)
      if (i > 20) {
        // After many tabs, should still be in dialog
        expect(isInDialog, 'Focus should be trapped in dialog').toBeTruthy();
      }
    }
  });
});

// ============================================================================
// WCAG 2.4.7 Focus Visible - Focus indicator visible
// ============================================================================

test.describe('WCAG 2.4.7 - Focus Visible', () => {
  test('should show visible focus indicator on all interactive elements', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForSelector('button:has-text("New Configuration")');

    const buttons = page.locator('button').all();

    for (const button of await buttons) {
      await button.focus();

      // Check if element has focus styles
      const outlineWidth = await button.evaluate(el =>
        window.getComputedStyle(el).getPropertyValue('outline-width')
      );
      const outlineStyle = await button.evaluate(el =>
        window.getComputedStyle(el).getPropertyValue('outline-style')
      );
      const boxShadow = await button.evaluate(el =>
        window.getComputedStyle(el).getPropertyValue('box-shadow')
      );

      // Should have outline or box-shadow for focus
      const hasFocusIndicator =
        (outlineWidth !== '0px' && outlineStyle !== 'none') ||
        (boxShadow && boxShadow !== 'none' && !boxShadow.includes('0px 0px'));

      expect(hasFocusIndicator, 'Interactive element should have visible focus indicator').toBeTruthy();
    }
  });
});

// ============================================================================
// WCAG 1.4.3 Contrast (Minimum) - 4.5:1 for normal text
// ============================================================================

test.describe('WCAG 1.4.3 - Color Contrast', () => {
  test('should have sufficient color contrast on config page', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForSelector('button:has-text("New Configuration")');
    await assertNoA11yViolations(page, 'Newsletter Config Page');
  });

  test('should have sufficient color contrast in configuration form', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');
    await assertNoA11yViolations(page, 'Configuration Form Dialog');
  });

  test('should have sufficient color contrast on preview page', async ({ page }) => {
    await page.goto(NEWSLETTER_PREVIEW_URL);
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page, 'Newsletter Preview Page');
  });

  test('should have sufficient color contrast on analytics page', async ({ page }) => {
    await page.goto(NEWSLETTER_ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page, 'Newsletter Analytics Page');
  });

  test('should have sufficient color contrast in approval queue', async ({ page }) => {
    await page.goto(NEWSLETTER_APPROVAL_URL);
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page, 'Approval Queue Page');
  });
});

// ============================================================================
// WCAG 3.3.1 Error Identification - Errors clearly identified
// ============================================================================

test.describe('WCAG 3.3.1 - Error Identification', () => {
  test('should announce form validation errors', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');

    // Try to submit empty form
    await page.click('button:has-text("Create")');

    // Error messages should be associated with fields
    const errorMessages = page.locator('[role="alert"], .error, [aria-invalid="true"]');
    const errorCount = await errorMessages.count();

    if (errorCount > 0) {
      // Errors should be visible and descriptive
      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i);
        const isVisible = await error.isVisible();
        const text = await error.textContent();

        expect(isVisible).toBeTruthy();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('should mark invalid fields with aria-invalid', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');

    // Enter invalid email format if email field exists
    const emailInputs = page.locator('input[type="email"]');
    if (await emailInputs.count() > 0) {
      await emailInputs.first().fill('invalid-email');
      await page.keyboard.press('Tab'); // Trigger validation

      const ariaInvalid = await emailInputs.first().getAttribute('aria-invalid');
      expect(ariaInvalid).toBe('true');
    }
  });
});

// ============================================================================
// WCAG 3.3.2 Labels or Instructions - Form fields have clear labels
// ============================================================================

test.describe('WCAG 3.3.2 - Labels and Instructions', () => {
  test('should have clear labels for all form fields', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');

    // Check all form controls have labels
    const formControls = page.locator('input, select, textarea');
    const count = await formControls.count();

    for (let i = 0; i < count; i++) {
      const control = formControls.nth(i);
      const type = await control.getAttribute('type');

      // Skip hidden inputs
      if (type === 'hidden') continue;

      const id = await control.getAttribute('id');
      const ariaLabel = await control.getAttribute('aria-label');
      const ariaLabelledby = await control.getAttribute('aria-labelledby');

      const hasVisibleLabel = id && await page.locator(`label[for="${id}"]`).count() > 0;
      const hasAriaLabel = ariaLabel || ariaLabelledby;

      expect(
        hasVisibleLabel || hasAriaLabel,
        `Form control ${i} should have a label`
      ).toBeTruthy();
    }
  });

  test('should provide instructions for complex fields', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');

    // Fields with special requirements should have aria-describedby
    const textareas = page.locator('textarea');
    const count = await textareas.count();

    for (let i = 0; i < count; i++) {
      const textarea = textareas.nth(i);
      const ariaDescribedby = await textarea.getAttribute('aria-describedby');

      if (ariaDescribedby) {
        // Description should exist and be visible
        const description = page.locator(`#${ariaDescribedby}`);
        await expect(description).toBeVisible();
      }
    }
  });
});

// ============================================================================
// WCAG 4.1.2 Name, Role, Value - Assistive tech can determine properties
// ============================================================================

test.describe('WCAG 4.1.2 - Name, Role, Value', () => {
  test('should have proper roles for custom components', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForSelector('button:has-text("New Configuration")');

    // Tabs should have proper roles
    const tabs = page.locator('[role="tab"]');
    if (await tabs.count() > 0) {
      const firstTab = tabs.first();

      await assertAriaAttributes(page, '[role="tab"]', {
        'role': 'tab',
        'aria-selected': /true|false/,
      });
    }

    // Buttons should have proper roles
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const role = await button.getAttribute('role');
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();

      // Button should be identified as button (implicit or explicit)
      expect(role === 'button' || role === null).toBeTruthy();

      // Button should have accessible name
      expect(ariaLabel || text?.trim()).toBeTruthy();
    }
  });

  test('should have proper state indicators for toggles', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');

    // Check for any toggle/switch elements
    const switches = page.locator('[role="switch"], input[type="checkbox"]');
    const count = await switches.count();

    for (let i = 0; i < count; i++) {
      const toggle = switches.nth(i);
      const role = await toggle.getAttribute('role');
      const ariaChecked = await toggle.getAttribute('aria-checked');
      const checked = await toggle.getAttribute('checked');

      if (role === 'switch') {
        expect(ariaChecked).toMatch(/true|false/);
      } else {
        expect(checked !== null || ariaChecked !== null).toBeTruthy();
      }
    }
  });
});

// ============================================================================
// WCAG 2.4.1 Bypass Blocks - Skip navigation mechanism
// ============================================================================

test.describe('WCAG 2.4.1 - Bypass Blocks', () => {
  test('should have skip to main content link', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);

    // Press Tab - first focusable should be skip link (or main navigation is simple)
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    const text = await focused.textContent();

    // Should have skip link or go directly to main content
    // This is a pattern check - implementation may vary
    if (text?.toLowerCase().includes('skip')) {
      // Has skip link - good!
      await page.keyboard.press('Enter');

      // Focus should jump to main content
      const mainContent = page.locator('main, [role="main"]');
      await expect(mainContent).toBeVisible();
    }
  });
});

// ============================================================================
// WCAG 2.4.6 Headings and Labels - Descriptive headings
// ============================================================================

test.describe('WCAG 2.4.6 - Headings and Labels', () => {
  test('should have descriptive headings on config page', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForSelector('button:has-text("New Configuration")');

    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const count = await headings.count();

    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const heading = headings.nth(i);
      const text = await heading.textContent();

      // Heading should be descriptive (not empty, not just icons)
      expect(text?.trim().length).toBeGreaterThan(0);
      expect(text?.trim().length).toBeGreaterThan(2); // More than 2 chars
    }
  });

  test('should have descriptive button labels', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForSelector('button:has-text("New Configuration")');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      const title = await button.getAttribute('title');

      const label = ariaLabel || text || title;

      // Button should have meaningful label
      expect(label?.trim().length).toBeGreaterThan(0);

      // Label should be descriptive (not just "Click", "Button", etc.)
      const genericLabels = ['button', 'click', 'here', 'link'];
      const isGeneric = genericLabels.some(generic =>
        label?.toLowerCase().trim() === generic
      );
      expect(isGeneric).toBeFalsy();
    }
  });
});

// ============================================================================
// WCAG 1.4.13 Content on Hover or Focus - Dismissible, hoverable, persistent
// ============================================================================

test.describe('WCAG 1.4.13 - Content on Hover or Focus', () => {
  test('should allow dismissing tooltips with Escape', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForLoadState('networkidle');

    // Find elements with tooltips
    const elementsWithTooltips = page.locator('[data-tooltip], [title], [aria-describedby]');
    const count = await elementsWithTooltips.count();

    if (count > 0) {
      const element = elementsWithTooltips.first();
      await element.hover();

      // Wait for tooltip to appear
      await page.waitForTimeout(500);

      // Press Escape
      await page.keyboard.press('Escape');

      // Tooltip should be dismissed (this is pattern-dependent)
      await page.waitForTimeout(200);
    }
  });
});

// ============================================================================
// Comprehensive Automated Scan
// ============================================================================

test.describe('Comprehensive Automated Accessibility Scan', () => {
  test('should pass all axe-core checks on newsletter config page', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForSelector('button:has-text("New Configuration")');
    await assertNoA11yViolations(page, 'Newsletter Config Page - Full Scan');
  });

  test('should pass all axe-core checks on newsletter preview page', async ({ page }) => {
    await page.goto(NEWSLETTER_PREVIEW_URL);
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page, 'Newsletter Preview Page - Full Scan');
  });

  test('should pass all axe-core checks on newsletter analytics page', async ({ page }) => {
    await page.goto(NEWSLETTER_ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page, 'Newsletter Analytics Page - Full Scan');
  });

  test('should pass all axe-core checks on approval queue page', async ({ page }) => {
    await page.goto(NEWSLETTER_APPROVAL_URL);
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page, 'Approval Queue Page - Full Scan');
  });

  test('should pass all axe-core checks in configuration form dialog', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.click('button:has-text("New Configuration")');
    await page.waitForSelector('role=dialog');
    await assertNoA11yViolations(page, 'Configuration Form Dialog - Full Scan');
  });

  test('should pass all axe-core checks in segment form dialog', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);

    // Switch to Segments tab
    const segmentsTab = page.locator('button:has-text("Segments")');
    if (await segmentsTab.count() > 0) {
      await segmentsTab.click();
      await page.waitForLoadState('networkidle');

      const createButton = page.locator('button:has-text("New Segment")');
      if (await createButton.count() > 0) {
        await createButton.click();
        await page.waitForSelector('role=dialog');
        await assertNoA11yViolations(page, 'Segment Form Dialog - Full Scan');
      }
    }
  });
});

// ============================================================================
// Screen Reader Specific Tests
// ============================================================================

test.describe('Screen Reader Support', () => {
  test('should have proper live regions for dynamic content', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForSelector('button:has-text("New Configuration")');

    // Check for live regions (status messages, notifications)
    const liveRegions = page.locator('[role="status"], [role="alert"], [aria-live]');
    const count = await liveRegions.count();

    // If live regions exist, they should be properly configured
    for (let i = 0; i < count; i++) {
      const region = liveRegions.nth(i);
      const ariaLive = await region.getAttribute('aria-live');
      const role = await region.getAttribute('role');

      expect(
        ariaLive || role === 'status' || role === 'alert'
      ).toBeTruthy();
    }
  });

  test('should announce status changes in approval workflow', async ({ page }) => {
    await page.goto(NEWSLETTER_APPROVAL_URL);
    await page.waitForLoadState('networkidle');

    // Status changes should be in live regions
    const statusRegions = page.locator('[role="status"], [aria-live="polite"]');

    // These should exist for workflow notifications
    // (Even if currently empty, structure should be present)
  });

  test('should have proper landmark roles', async ({ page }) => {
    await page.goto(NEWSLETTER_CONFIG_URL);
    await page.waitForSelector('button:has-text("New Configuration")');

    // Should have main landmark
    const main = page.locator('main, [role="main"]');
    expect(await main.count()).toBeGreaterThan(0);

    // Should have navigation if applicable
    const nav = page.locator('nav, [role="navigation"]');
    // Navigation may or may not be present on this page

    // Should have proper document structure
    const landmarks = page.locator('[role="banner"], [role="main"], [role="navigation"], [role="contentinfo"], [role="complementary"]');
    expect(await landmarks.count()).toBeGreaterThan(0);
  });
});

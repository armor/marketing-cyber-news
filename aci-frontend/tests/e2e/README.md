# E2E Regression Test Suite

This directory contains the comprehensive E2E test suite for the Armor Cyber Intelligence platform. All tests follow **MANDATORY deep testing standards** to ensure production reliability.

## Quick Start

```bash
# Run all E2E tests
npm run test:e2e

# Run Marketing Autopilot tests only
npm run test:e2e:marketing

# Run Newsletter tests only
npm run test:e2e:newsletter

# Run full regression suite
npm run test:e2e:regression

# Run quick smoke tests
npm run test:e2e:smoke

# Run with visual browser (headed mode)
npm run test:e2e:marketing:headed

# Open Playwright UI for debugging
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

## Test Organization

```
tests/e2e/
├── marketing-campaign.spec.ts       # US1: Campaign Management
├── marketing-content-studio.spec.ts # US2: Content Studio
├── marketing-channels.spec.ts       # US3: Channel Connections
├── marketing-calendar-brand.spec.ts # US4+US5: Calendar & Brand
├── marketing-analytics-competitors.spec.ts # US6+US7: Analytics & Competitors
├── marketing-regression.spec.ts     # Master regression suite
├── newsletter-*.spec.ts             # Newsletter automation tests
└── README.md                        # This file
```

## Mandatory Deep Testing Standards

**CRITICAL**: All tests MUST follow these patterns. Surface-level testing is FORBIDDEN.

### 5 Required Verification Layers

| Layer | What to Check | How to Verify | Failure = |
|-------|---------------|---------------|-----------|
| 1. Network | Request sent | `page.waitForResponse()` | Silent failure |
| 2. HTTP Status | Backend accepted | `response.status()` | Rejected data |
| 3. Persistence | Data in DB | Reload page, verify | Lost data |
| 4. Console Errors | Zero JS errors | Capture and assert | Broken UI |
| 5. Network Errors | No 4xx/5xx | Monitor requests | API issues |

### Required Test Pattern

```typescript
// FORBIDDEN - catches nothing
await saveButton.click();
await expect(toast).toBeVisible(); // MEANINGLESS

// REQUIRED - proves the system works
const [apiResponse] = await Promise.all([
  page.waitForResponse(r =>
    r.url().includes('/api/resource') &&
    r.request().method() === 'PUT'
  ),
  saveButton.click()
]);
expect(apiResponse.status()).toBe(200);  // API actually called
await page.reload();                      // Fresh state
await expect(page.getByText(newValue)).toBeVisible(); // Data persisted
```

### Validation Testing Pattern

```typescript
// Prove validation BLOCKS API calls
let apiCalled = false;
page.on('request', r => {
  if (r.url().includes('/api/')) apiCalled = true;
});

await submitButton.click(); // With invalid data
await page.waitForTimeout(500);

expect(apiCalled).toBe(false); // API should NOT be called
await expect(page.locator('[role="alert"]')).toBeVisible();
```

### Console Error Capture

```typescript
function setupConsoleCapture(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  return errors;
}

// In your test
const consoleErrors = setupConsoleCapture(page);
// ... test actions ...
expect(consoleErrors).toHaveLength(0); // MANDATORY
```

## Test Suites

### Marketing Autopilot (`npm run test:e2e:marketing`)

| Test ID | Description | User Story |
|---------|-------------|------------|
| REG-CAM-001 | Campaign list loads with API verification | US1 |
| REG-CAM-002 | Campaign creation persists after reload | US1 |
| REG-CAM-003 | Validation blocks API on empty fields | US1 |
| REG-CAM-004 | Campaign lifecycle (launch/pause/stop) | US1 |
| REG-CON-001 | Content generation with brand validation | US2 |
| REG-CON-002 | Content refinement API verification | US2 |
| REG-CON-003 | Empty prompt validation blocks API | US2 |
| REG-CHA-001 | Channel list loads with API verification | US3 |
| REG-CHA-002 | OAuth initiation returns auth URL | US3 |
| REG-CHA-003 | Channel disconnect with API verification | US3 |
| REG-CAL-001 | Calendar loads with API verification | US4 |
| REG-CAL-002 | Calendar entry update persists | US4 |
| REG-BRA-001 | Brand store loads with API verification | US5 |
| REG-BRA-002 | Brand settings update persists | US5 |
| REG-BRA-003 | Content validation with brand score | US5 |
| REG-ANA-001 | Analytics dashboard loads | US6 |
| REG-ANA-002 | Engagement trends with time filter | US6 |
| REG-COM-001 | Competitor list loads | US7 |
| REG-COM-002 | Add competitor with persistence | US7 |
| REG-COM-003 | Validation blocks empty name | US7 |

### Newsletter Automation (`npm run test:e2e:newsletter`)

Tests for the AI Newsletter Automation feature (Spec 004).

### Full Regression (`npm run test:e2e:regression`)

Runs all regression tests across all features.

## CI/CD Integration

Tests run automatically via GitHub Actions:

- **On Push**: Smoke tests run on every push to main/develop
- **On PR**: Full regression suite runs on pull requests
- **Nightly**: Complete test suite runs at 2 AM UTC
- **Manual**: Can be triggered via workflow dispatch

### Workflow File

`.github/workflows/e2e-regression.yml`

### Artifacts

Test artifacts are uploaded to GitHub Actions:
- `playwright-report-{suite}`: HTML reports
- `test-screenshots-{suite}`: Failure screenshots (7 days retention)
- `nightly-full-report`: Complete nightly reports (90 days retention)

## Writing New Tests

### 1. Create Test File

```typescript
// tests/e2e/feature-name.spec.ts
import { test, expect, Page } from '@playwright/test';

function setupConsoleCapture(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  return errors;
}

test.describe('Feature Name - Deep E2E Tests', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleCapture(page);
    // Authentication setup
  });

  test.afterEach(async () => {
    expect(consoleErrors).toHaveLength(0);
  });

  test('REG-XXX-001: Description', async ({ page }) => {
    // 1. API Interception
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/endpoint')),
      page.goto('/path')
    ]);

    // 2. Status Verification
    expect(response.status()).toBe(200);

    // 3. Persistence (if applicable)
    await page.reload();
    await expect(page.getByText('expected')).toBeVisible();
  });
});
```

### 2. Add to Regression Suite

Import or reference your tests in `marketing-regression.spec.ts` or create a new regression file following the naming pattern `*-regression.spec.ts`.

### 3. Add npm Script (if new suite)

```json
{
  "scripts": {
    "test:e2e:yourfeature": "playwright test --project=yourfeature"
  }
}
```

### 4. Update Playwright Config

Add a new project in `playwright.config.ts`:

```typescript
{
  name: 'yourfeature',
  testMatch: /yourfeature.*\.spec\.ts/,
  use: { ...devices['Desktop Chrome'] }
}
```

## Test Data Management

### Mock Data

Tests use Playwright's route interception for API mocking:

```typescript
await page.route('**/api/v1/campaigns', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify([{ id: '1', name: 'Test Campaign' }])
  });
});
```

### Authentication

Tests set auth tokens in localStorage:

```typescript
await context.addInitScript(() => {
  localStorage.setItem('auth_token', 'test-token');
  localStorage.setItem('user', JSON.stringify({ id: '1', role: 'admin' }));
});
```

## Debugging

### Visual Debugging

```bash
# Run with browser visible
npm run test:e2e:marketing:headed

# Open Playwright UI
npm run test:e2e:ui

# Run specific test
npx playwright test -g "REG-CAM-001"
```

### Screenshots and Traces

Failed tests automatically capture:
- Screenshots: `tests/artifacts/*/test-failed-*.png`
- Traces: `tests/artifacts/*/trace.zip`

View traces:
```bash
npx playwright show-trace tests/artifacts/test-results/trace.zip
```

### Console Output

```bash
# Verbose output
npx playwright test --reporter=list

# Debug mode
DEBUG=pw:api npx playwright test
```

## Test Checklist

Before marking any feature complete:

- [ ] API intercepted with `waitForResponse()`
- [ ] HTTP status verified (200/201/204)
- [ ] Persistence proven after `page.reload()`
- [ ] Validation tested (API NOT called when invalid)
- [ ] Console errors captured and asserted to be zero
- [ ] Network errors monitored (no 5xx)
- [ ] Screenshots taken for visual proof
- [ ] Test added to regression suite
- [ ] CI pipeline passes

## Performance Benchmarks

| Operation | Target | Assertion |
|-----------|--------|-----------|
| Page load | <3s | `expect(duration).toBeLessThan(3000)` |
| API response | <2s | Timeout in `waitForResponse()` |
| Form submission | <5s | Total test duration |

## Troubleshooting

### Test Flakiness

1. Add explicit waits for animations:
   ```typescript
   await page.waitForTimeout(500);
   ```

2. Use `waitFor` instead of immediate assertions:
   ```typescript
   await page.locator('.element').waitFor({ state: 'visible' });
   ```

3. Increase timeouts for slow operations:
   ```typescript
   await page.waitForResponse(r => ..., { timeout: 15000 });
   ```

### CI Failures

1. Check artifacts for screenshots and traces
2. Review console error logs
3. Verify backend is running
4. Check for environment variable differences

### Local vs CI Differences

- CI uses fresh database, local may have stale data
- CI runs headless, local may be headed
- CI has longer timeouts, adjust locally if needed

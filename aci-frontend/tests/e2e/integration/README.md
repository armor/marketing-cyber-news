# Integration Test Suite

Comprehensive integration tests with **DEEP TESTING** patterns (API verification + persistence).

## Test Coverage

### Test Files and Counts

| File | Tests | Coverage Areas |
|------|-------|----------------|
| `auth-integration.spec.ts` | **10** | Login, logout, tokens, sessions, validation |
| `newsletter-integration.spec.ts` | **15** | Config CRUD, issues, approvals, analytics |
| `campaign-integration.spec.ts` | **15** | Campaign lifecycle, channels, goals, stats |
| `channel-integration.spec.ts` | **10** | OAuth flows, connections, testing, errors |
| **TOTAL** | **50** | Full integration coverage |

## Deep Testing Standards

Every test in this suite follows **MANDATORY** deep testing patterns:

### 1. API Call Verification
```typescript
// REQUIRED: Verify API actually called
await verifyApiCall(
  page,
  () => page.click(saveButton),
  { method: 'POST', urlPattern: '/api/resource' }
);
```

### 2. Persistence Verification
```typescript
// REQUIRED: Verify data survives reload
await verifyPersistence(
  page,
  '[data-testid="resource-name"]',
  expectedValue
);
```

### 3. Validation Testing
```typescript
// REQUIRED: Prove validation BLOCKS API
await verifyValidationBlocks(
  page,
  () => page.click(submitButton),
  '/api/resource'
);
```

### 4. Console Error Monitoring
```typescript
// REQUIRED: Zero errors allowed
const monitor = new ConsoleMonitor();
monitor.attach(page);
// ... test ...
monitor.assertNoErrors();
```

## Test Organization

### Authentication (`auth-integration.spec.ts`)

**10 tests** covering:
- ✅ Login as admin with token verification
- ✅ Login as marketing with role permissions
- ✅ Invalid credentials return 401
- ✅ Empty email blocks API call (validation)
- ✅ Invalid email format blocks API
- ✅ Logout clears tokens
- ✅ Session persists after reload
- ✅ Token expiry handling
- ✅ Multi-role access verification
- ✅ Password validation requirements

**Deep Testing Features:**
- Intercepts login API calls
- Verifies localStorage token storage
- Tests session persistence with page reload
- Validates error handling with 401 responses

### Newsletter (`newsletter-integration.spec.ts`)

**15 tests** covering:
- ✅ Create config with persistence
- ✅ Update config with persistence
- ✅ Delete config
- ✅ List configs with pagination
- ✅ Required field validation
- ✅ Invalid input validation
- ✅ Create issue as draft
- ✅ Edit issue content
- ✅ Submit for review (approval workflow)
- ✅ Approve as marketing
- ✅ Reject with reason
- ✅ Preview generation
- ✅ Segment assignment
- ✅ Personalization testing
- ✅ Analytics display

**Deep Testing Features:**
- Verifies POST/PUT/DELETE API calls
- Tests persistence after page reload
- Validates approval state transitions
- Monitors network requests for analytics

### Campaign (`campaign-integration.spec.ts`)

**15 tests** covering:
- ✅ Create campaign with persistence
- ✅ Update settings with persistence
- ✅ Delete draft campaign
- ✅ Lifecycle: draft → active
- ✅ Lifecycle: pause
- ✅ Lifecycle: resume
- ✅ Lifecycle: stop
- ✅ Channel selection
- ✅ Topic configuration
- ✅ Frequency settings
- ✅ Goal selection (engagement/leads/awareness)
- ✅ AI recommendations
- ✅ Stats display
- ✅ Analytics display
- ✅ Multi-campaign management

**Deep Testing Features:**
- Tests complete campaign lifecycle
- Verifies state transitions with API calls
- Validates channel configuration persistence
- Tests analytics data loading

### Channel (`channel-integration.spec.ts`)

**10 tests** covering:
- ✅ List available channels
- ✅ Connection status display
- ✅ OAuth initiation (email)
- ✅ OAuth initiation (LinkedIn)
- ✅ OAuth callback handling
- ✅ Channel disconnection
- ✅ Test connection
- ✅ Multiple channels connected
- ✅ Error handling
- ✅ Reconnection flow

**Deep Testing Features:**
- Tests OAuth popup/redirect flows
- Verifies connection state changes
- Tests error handling with invalid credentials
- Validates reconnection after disconnect

## Running Tests

### Run All Integration Tests
```bash
npx playwright test tests/e2e/integration/
```

### Run Specific Suite
```bash
npx playwright test tests/e2e/integration/auth-integration.spec.ts
npx playwright test tests/e2e/integration/newsletter-integration.spec.ts
npx playwright test tests/e2e/integration/campaign-integration.spec.ts
npx playwright test tests/e2e/integration/channel-integration.spec.ts
```

### Run in UI Mode (Recommended)
```bash
npx playwright test tests/e2e/integration/ --ui
```

### Debug Mode
```bash
npx playwright test tests/e2e/integration/auth-integration.spec.ts --debug
```

### Generate HTML Report
```bash
npx playwright test tests/e2e/integration/
npx playwright show-report
```

## Test Artifacts

All tests generate screenshots on completion:

```
tests/artifacts/
├── auth-*.png
├── newsletter-*.png
├── campaign-*.png
└── channel-*.png
```

## Helper Usage

All tests use centralized helpers from `tests/helpers/`:

### Authentication
```typescript
import { loginAs, logout, clearAuthState } from '../../helpers';

await loginAs(page, 'marketing'); // Login with role
await logout(page);                // Clean logout
await clearAuthState(page);        // Clear all auth data
```

### API Assertions
```typescript
import { verifyApiCall, verifyPersistence, verifyValidationBlocks } from '../../helpers';

// Verify API call
await verifyApiCall(page, action, { method: 'POST', urlPattern: '/api/resource' });

// Verify data persists
await verifyPersistence(page, selector, expectedText);

// Verify validation blocks API
await verifyValidationBlocks(page, action, '/api/resource');
```

### Console Monitoring
```typescript
import { ConsoleMonitor } from '../../helpers';

const monitor = new ConsoleMonitor();
monitor.attach(page);
// ... test code ...
monitor.assertNoErrors(); // REQUIRED
```

### Selectors
```typescript
import { selectors } from '../../helpers';

await page.locator(selectors.auth.emailInput).fill('user@example.com');
await page.locator(selectors.newsletter.saveButton).click();
```

## Test Patterns

### Standard Test Structure
```typescript
test.describe('Feature Integration', () => {
  let monitor: ConsoleMonitor;

  test.beforeEach(async ({ page }) => {
    monitor = new ConsoleMonitor();
    monitor.attach(page);
    await clearAuthState(page);
    await loginAs(page, 'marketing');
  });

  test.afterEach(async ({ page }, testInfo) => {
    monitor.assertNoErrors();
    await page.screenshot({
      path: `tests/artifacts/feature-${testInfo.title.replace(/\s+/g, '-')}.png`,
    });
  });

  test('action with persistence', async ({ page }) => {
    // Navigate
    await page.goto('/feature/new');

    // Fill form
    await page.locator(selector).fill(value);

    // Verify API call
    await verifyApiCall(page, action, expectations);

    // Verify persistence
    await verifyPersistence(page, selector, value);
  });
});
```

### Conditional Test Skipping
```typescript
// Skip if no data available
const hasData = await element.isVisible().catch(() => false);
if (!hasData) {
  test.skip();
  return;
}
```

## Verification Checklist

Before marking ANY test complete:

- [ ] **API Intercepted**: `verifyApiCall()` used for mutations
- [ ] **Status Verified**: Response status checked (200-299)
- [ ] **Persistence Proven**: Data visible after `page.reload()`
- [ ] **Validation Tested**: Invalid inputs make NO API call
- [ ] **Errors Captured**: `monitor.assertNoErrors()` called
- [ ] **Screenshots Taken**: Visual proof in afterEach
- [ ] **Selectors Used**: Centralized selectors from helpers

## Common Issues

### Test Skipping
Some tests conditionally skip if:
- No data exists (empty lists)
- Feature not yet implemented
- Channel not connected
- OAuth not configured

This is **EXPECTED** - tests are designed to be safe on both mock and real backends.

### Timing Issues
All tests use:
- `page.waitForLoadState('networkidle')`
- `page.waitForResponse()` for API calls
- Explicit timeouts for async operations

### Network Errors
If network errors occur:
1. Check backend is running
2. Verify API endpoints exist
3. Check CORS configuration
4. Review console monitor output

## Test Modes

### Mock Mode (Default)
Uses MSW handlers for predictable testing:
```bash
TEST_MODE=mock npx playwright test
```

### Real Backend Mode
Tests against actual backend:
```bash
TEST_MODE=real BACKEND_URL=http://localhost:8080 npx playwright test
```

## Success Criteria

All 50 tests must:
1. ✅ Execute without console errors
2. ✅ Verify API calls are made
3. ✅ Verify data persists
4. ✅ Handle validation correctly
5. ✅ Generate screenshots
6. ✅ Pass in both mock and real modes

## Maintenance

### Adding New Tests
1. Follow existing test structure
2. Use helpers from `tests/helpers/`
3. Include all 4 deep testing verifications
4. Add screenshots in afterEach
5. Update this README

### Updating Helpers
Helpers are in `tests/helpers/`:
- `auth.ts` - Authentication flows
- `api-assertions.ts` - Deep testing patterns
- `console-monitor.ts` - Error monitoring
- `selectors.ts` - UI selectors

Any changes to helpers affect **all integration tests**.

---

**Last Updated:** 2025-12-27
**Total Tests:** 50
**Coverage:** Authentication, Newsletter, Campaigns, Channels

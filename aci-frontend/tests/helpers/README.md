# E2E Test Helpers

Shared test infrastructure implementing mandatory deep E2E testing patterns.

## Quick Start

```typescript
import { test, expect } from '@playwright/test';
import {
  loginAs,
  verifyApiCall,
  verifyPersistence,
  ConsoleMonitor,
  selectors,
} from '../helpers';

test.describe('My Feature', () => {
  let consoleMonitor: ConsoleMonitor;

  test.beforeEach(async ({ page }) => {
    consoleMonitor = new ConsoleMonitor();
    consoleMonitor.attach(page);
    await loginAs(page, 'admin');
  });

  test.afterEach(() => {
    consoleMonitor.assertNoErrors();
  });

  test('form submission', async ({ page }) => {
    await page.goto('/feature');

    // Fill form
    await page.locator(selectors.common.submitButton).fill('Test');

    // DEEP VERIFICATION: Verify API call
    await verifyApiCall(
      page,
      () => page.locator(selectors.common.submitButton).click(),
      { method: 'POST', urlPattern: '/api/endpoint' }
    );

    // DEEP VERIFICATION: Verify persistence
    await verifyPersistence(page, 'h1', 'Test');
  });
});
```

## Files

### Core Helpers

| File | Purpose | Key Functions |
|------|---------|---------------|
| `selectors.ts` | Centralized UI selectors | `selectors.auth.*`, `selectors.newsletter.*` |
| `api-assertions.ts` | Deep API testing | `verifyApiCall()`, `verifyPersistence()`, `verifyValidationBlocks()` |
| `console-monitor.ts` | Error detection | `ConsoleMonitor.attach()`, `.assertNoErrors()` |
| `auth.ts` | Authentication | `loginAs()`, `logout()`, `clearAuthState()` |
| `test-credentials.ts` | Test configuration | `getTestCredentials()`, `testConfig` |

### Support Files

- `index.ts` - Single import point for all helpers
- `example-usage.spec.ts` - Usage examples and patterns
- `.env.example` - Environment configuration template

## API Assertions (Deep Testing)

### verifyApiCall()

**MANDATORY for all form submissions and mutations.**

Verifies an action triggers a specific API call.

```typescript
const response = await verifyApiCall(
  page,
  () => page.click('button[type="submit"]'),
  {
    method: 'POST',
    urlPattern: '/api/newsletter/configs',
    expectedStatus: 201 // optional, defaults to 200
  }
);

expect(response.status()).toBe(201);
```

### verifyPersistence()

**MANDATORY for CRUD operations.**

Proves data survives page reload.

```typescript
await verifyPersistence(
  page,
  'h1', // selector
  'My Newsletter' // expected text
);
```

### verifyValidationBlocks()

**MANDATORY for validation testing.**

Proves validation prevents API calls when invalid.

```typescript
await verifyValidationBlocks(
  page,
  () => page.click('button[type="submit"]'),
  '/api/newsletter/configs' // API that should NOT be called
);

// Validation error should be visible
await expect(page.locator('[role="alert"]')).toBeVisible();
```

### verifyApiSequence()

For complex flows with multiple API calls.

```typescript
await verifyApiSequence(
  page,
  async () => {
    await page.click('button:has-text("Submit")');
    await page.click('button:has-text("Approve")');
  },
  [
    { method: 'POST', urlPattern: '/api/issues' },
    { method: 'PUT', urlPattern: '/api/approvals' }
  ]
);
```

## Console Monitoring

**MANDATORY in all tests.**

```typescript
test.beforeEach(async ({ page }) => {
  consoleMonitor = new ConsoleMonitor();
  consoleMonitor.attach(page);
});

test.afterEach(() => {
  consoleMonitor.assertNoErrors();
  // Optional: consoleMonitor.assertNoWarnings();
});
```

### Methods

- `attach(page)` - Start monitoring (call in `beforeEach`)
- `assertNoErrors()` - Fail if errors detected (call in `afterEach`)
- `assertNoWarnings()` - Fail if warnings detected (optional)
- `getErrors()` - Get all captured errors
- `reset()` - Clear captured messages

## Authentication

### loginAs()

Login as a specific role with deep verification.

```typescript
// Admin role (full permissions)
await loginAs(page, 'admin');

// Marketing role (marketing + newsletter)
await loginAs(page, 'marketing');

// Viewer role (read-only)
await loginAs(page, 'viewer');
```

Returns:
```typescript
{
  response: Response, // API response
  token: string,      // Access token
  user: any          // User object
}
```

### Other Auth Helpers

```typescript
// Logout
await logout(page);

// Clear all auth state
await clearAuthState(page);

// Check if authenticated
const isAuth = await isAuthenticated(page);

// Get current user
const user = await getCurrentUser(page);

// Test invalid login
await attemptInvalidLogin(page, 'bad@email.com', 'wrongpass');

// Test validation
await testLoginValidation(page);
```

## Selectors

**Always use `selectors` object instead of hardcoding.**

```typescript
import { selectors } from './helpers';

// Auth selectors
await page.locator(selectors.auth.emailInput).fill('test@example.com');
await page.locator(selectors.auth.passwordInput).fill('password');
await page.locator(selectors.auth.submitButton).click();

// Newsletter selectors
await page.locator(selectors.newsletter.configNameInput).fill('Name');
await page.locator(selectors.newsletter.saveButton).click();

// Marketing selectors
await page.locator(selectors.marketing.campaignNameInput).fill('Campaign');

// Common selectors
await page.locator(selectors.common.toast).isVisible();
await page.locator(selectors.common.errorMessage).textContent();
```

### Selector Categories

- `selectors.auth.*` - Login, register forms
- `selectors.newsletter.*` - Newsletter configs, issues, analytics
- `selectors.marketing.*` - Campaigns, channels, content studio
- `selectors.common.*` - Shared UI (toast, modal, tables, pagination)
- `selectors.admin.*` - Admin features (role management)

## Test Configuration

### Environment Modes

**MSW Mock Mode** (default):
- Uses fixtures from `src/mocks/fixtures/`
- No real backend required
- Fast and deterministic

**Real Backend Mode**:
- Set `USE_REAL_BACKEND=true` in `tests/.env`
- Requires running backend server
- Tests actual API integration

### Configuration

```typescript
import { testConfig, getTestCredentials } from './helpers';

// Check mode
if (testConfig.isRealBackend) {
  console.log('Running against real backend');
}

// Get credentials
const creds = getTestCredentials();
console.log('Admin:', creds.admin.email);

// Get timeouts
const timeout = testConfig.timeout; // 30000ms default
const networkTimeout = testConfig.networkTimeout; // 5000ms default
```

### Setup for Real Backend

1. Copy `.env.example` to `.env`:
   ```bash
   cp tests/.env.example tests/.env
   ```

2. Edit `tests/.env`:
   ```
   USE_REAL_BACKEND=true
   TEST_ADMIN_EMAIL=admin@test.com
   TEST_ADMIN_PASSWORD=YourPassword123!
   ```

3. Start backend:
   ```bash
   cd aci-backend
   go run cmd/server/main.go
   ```

4. Run tests:
   ```bash
   npm run test:e2e:real
   ```

## Deep Testing Checklist

Before marking any form/CRUD feature complete:

- [ ] **API Intercepted**: `verifyApiCall()` captured the request
- [ ] **Status Verified**: Response status is 200/201
- [ ] **Persistence Proven**: Data visible after `page.reload()`
- [ ] **Validation Tested**: Invalid submission makes NO API call
- [ ] **Errors Captured**: Console errors array is empty
- [ ] **Network Clean**: No 4xx/5xx responses
- [ ] **Screenshots Taken**: Visual proof of each state

## Anti-Patterns (FORBIDDEN)

| Don't Do This | Do This Instead |
|---------------|-----------------|
| `await expect(toast).toBeVisible()` | `await verifyApiCall(...)` |
| Hardcoded selectors | `selectors.*` object |
| Manual login in every test | `loginAs()` helper |
| No console monitoring | Always attach `ConsoleMonitor` |
| Only testing happy path | Test validation, errors, edge cases |
| Trust UI feedback alone | Verify with `page.reload()` |

## Examples

See `example-usage.spec.ts` for complete working examples of:
- Login with verification
- Form submission with API call
- Validation blocking
- Edit existing data
- Console monitoring
- Selector usage

## Integration with Existing Tests

To migrate existing tests:

1. Import helpers:
   ```typescript
   import { loginAs, verifyApiCall, ConsoleMonitor, selectors } from './helpers';
   ```

2. Add console monitoring:
   ```typescript
   let consoleMonitor: ConsoleMonitor;
   test.beforeEach(async ({ page }) => {
     consoleMonitor = new ConsoleMonitor();
     consoleMonitor.attach(page);
   });
   test.afterEach(() => {
     consoleMonitor.assertNoErrors();
   });
   ```

3. Replace manual logins with `loginAs()`

4. Replace hardcoded selectors with `selectors.*`

5. Add deep verification:
   ```typescript
   // Before (SHALLOW)
   await saveButton.click();
   await expect(toast).toBeVisible();

   // After (DEEP)
   await verifyApiCall(
     page,
     () => saveButton.click(),
     { method: 'PUT', urlPattern: '/api/resource' }
   );
   await verifyPersistence(page, 'h1', 'Updated Value');
   ```

## Troubleshooting

### Tests fail with "Token not found"
- Ensure `loginAs()` is called before navigating to protected pages
- Check `localStorage` is not cleared unexpectedly

### API call not intercepted
- Check URL pattern matches actual API call
- Use browser DevTools Network tab to see actual URL
- Try regex pattern instead of string: `urlPattern: /\/api\/resource\/\d+/`

### Console errors detected
- Check browser console during test
- Add patterns to `isKnownFalsePositive()` for legitimate warnings
- Fix actual errors in application code

### Validation test fails
- Ensure form validation runs before API call
- Check that error message is actually rendered
- Verify validation blocks submission (button disabled or preventDefault)

## Contributing

When adding new features:
1. Add selectors to `selectors.ts`
2. Add auth helpers if needed to `auth.ts`
3. Update examples in `example-usage.spec.ts`
4. Document patterns in this README

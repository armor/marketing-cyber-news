# Migration Guide: Using Shared Test Helpers

This guide shows how to integrate the new shared test helpers into existing E2E tests.

## Import Structure

All helpers export from a single entry point.

**From `tests/e2e/*.spec.ts` files:**
```typescript
import {
  // Authentication
  loginAs,
  logout,
  clearAuthState,

  // Deep testing
  verifyApiCall,
  verifyPersistence,
  verifyValidationBlocks,

  // Console monitoring
  ConsoleMonitor,

  // Selectors
  selectors,

  // Configuration
  testConfig,
} from '../helpers';
```

**From `tests/performance/*.spec.ts` files:**
```typescript
import { ... } from '../helpers';
```

## Step-by-Step Migration

### 1. Update Imports

**Before:**
```typescript
import { test, expect } from '@playwright/test';
```

**After:**
```typescript
import { test, expect } from '@playwright/test';
import {
  loginAs,
  verifyApiCall,
  verifyPersistence,
  ConsoleMonitor,
  selectors,
} from '../helpers';
```

### 2. Add Console Monitoring

**Add to every test file:**

```typescript
test.describe('My Feature', () => {
  let consoleMonitor: ConsoleMonitor;

  test.beforeEach(async ({ page }) => {
    // MANDATORY: Attach console monitor
    consoleMonitor = new ConsoleMonitor();
    consoleMonitor.attach(page);
  });

  test.afterEach(() => {
    // MANDATORY: Assert no console errors
    consoleMonitor.assertNoErrors();
  });

  // ... your tests
});
```

### 3. Replace Manual Login

**Before:**
```typescript
test('my test', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'TestPass123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/);
});
```

**After:**
```typescript
test('my test', async ({ page }) => {
  await loginAs(page, 'admin');
});
```

### 4. Replace Hardcoded Selectors

**Before:**
```typescript
await page.click('button:has-text("Save")');
await page.fill('input[name="name"]', 'Test');
await page.locator('div.toast').isVisible();
```

**After:**
```typescript
await page.click(selectors.common.saveButton);
await page.fill(selectors.newsletter.configNameInput, 'Test');
await page.locator(selectors.common.toast).isVisible();
```

### 5. Add Deep API Verification

**Before (SHALLOW):**
```typescript
test('save config', async ({ page }) => {
  await page.fill('input[name="name"]', 'Test Config');
  await page.click('button:has-text("Save")');

  // ❌ Only checks UI feedback - doesn't prove API was called!
  await expect(page.locator('.toast')).toBeVisible();
});
```

**After (DEEP):**
```typescript
test('save config', async ({ page }) => {
  await loginAs(page, 'marketing');
  await page.goto('/newsletter/config');

  await page.fill(selectors.newsletter.configNameInput, 'Test Config');
  await page.fill(selectors.newsletter.configDescInput, 'Description');

  // ✅ Verifies actual API call
  await verifyApiCall(
    page,
    () => page.click(selectors.newsletter.saveButton),
    { method: 'POST', urlPattern: '/api/newsletter/configs' }
  );

  // ✅ Verifies data persisted
  await verifyPersistence(page, 'h1, h2', 'Test Config');
});
```

### 6. Add Validation Testing

**Before (MISSING):**
```typescript
// No validation testing - bugs can slip through!
```

**After (REQUIRED):**
```typescript
test('validation blocks submission', async ({ page }) => {
  await loginAs(page, 'marketing');
  await page.goto('/newsletter/config');

  // Leave required field empty
  await page.fill(selectors.newsletter.configNameInput, '');

  // Verify validation BLOCKS API call
  await verifyValidationBlocks(
    page,
    () => page.click(selectors.newsletter.saveButton),
    '/api/newsletter/configs'
  );

  // Error should be visible
  await expect(page.locator(selectors.common.errorMessage)).toBeVisible();
});
```

## Complete Example Migration

### Before (Original Test)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Newsletter Configs', () => {
  test('create new config', async ({ page }) => {
    // Manual login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'marketing@test.com');
    await page.fill('input[type="password"]', 'TestPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Navigate to form
    await page.goto('/newsletter/config');

    // Fill form with hardcoded selectors
    await page.fill('input[name="name"]', 'Test Config');
    await page.fill('textarea[name="description"]', 'Test description');

    // Submit - no API verification
    await page.click('button:has-text("Save")');

    // Only checks toast - doesn't prove anything!
    await expect(page.locator('.toast')).toBeVisible();
  });
});
```

### After (Migrated Test)

```typescript
import { test, expect } from '@playwright/test';
import {
  loginAs,
  verifyApiCall,
  verifyPersistence,
  verifyValidationBlocks,
  ConsoleMonitor,
  selectors,
} from '../helpers';

test.describe('Newsletter Configs', () => {
  let consoleMonitor: ConsoleMonitor;

  test.beforeEach(async ({ page }) => {
    consoleMonitor = new ConsoleMonitor();
    consoleMonitor.attach(page);
  });

  test.afterEach(() => {
    consoleMonitor.assertNoErrors();
  });

  test('create new config', async ({ page }) => {
    // Clean helper for login
    await loginAs(page, 'marketing');

    // Navigate to form
    await page.goto('/newsletter/config');
    await page.waitForLoadState('networkidle');

    const testName = `Test Config ${Date.now()}`;

    // Centralized selectors
    await page.fill(selectors.newsletter.configNameInput, testName);
    await page.fill(selectors.newsletter.configDescInput, 'Test description');

    // Deep verification: API call
    await verifyApiCall(
      page,
      () => page.click(selectors.newsletter.saveButton),
      { method: 'POST', urlPattern: '/api/newsletter/configs' }
    );

    // Deep verification: Persistence
    await verifyPersistence(page, 'h1, h2', testName);
  });

  test('validation blocks empty submission', async ({ page }) => {
    await loginAs(page, 'marketing');
    await page.goto('/newsletter/config');

    // Leave required fields empty
    await page.fill(selectors.newsletter.configNameInput, '');

    // Deep verification: Validation blocks API
    await verifyValidationBlocks(
      page,
      () => page.click(selectors.newsletter.saveButton),
      '/api/newsletter/configs'
    );

    // Error visible to user
    await expect(page.locator(selectors.common.errorMessage)).toBeVisible();
  });

  test('edit existing config', async ({ page }) => {
    await loginAs(page, 'admin');

    // Create first
    await page.goto('/newsletter/config');
    await page.fill(selectors.newsletter.configNameInput, 'Original');
    await page.fill(selectors.newsletter.configDescInput, 'Description');

    await verifyApiCall(
      page,
      () => page.click(selectors.newsletter.saveButton),
      { method: 'POST', urlPattern: '/api/newsletter/configs' }
    );

    // Edit
    const updatedName = `Updated ${Date.now()}`;
    await page.fill(selectors.newsletter.configNameInput, updatedName);

    // Verify PUT request
    await verifyApiCall(
      page,
      () => page.click(selectors.newsletter.saveButton),
      { method: 'PUT', urlPattern: '/api/newsletter/configs' }
    );

    // Verify update persisted
    await verifyPersistence(page, 'h1, h2', updatedName);
  });
});
```

## Benefits After Migration

✅ **No Silent Failures**: API calls are verified, not just UI feedback
✅ **Persistence Proven**: Data survives page reload
✅ **Validation Tested**: Invalid submissions blocked
✅ **Zero Console Errors**: All errors caught automatically
✅ **DRY Code**: No duplicate login/selector code
✅ **Maintainable**: Change selector once, update everywhere

## Migration Checklist

For each test file:

- [ ] Import helpers from `'./helpers'`
- [ ] Add `ConsoleMonitor` to `beforeEach`/`afterEach`
- [ ] Replace manual login with `loginAs()`
- [ ] Replace hardcoded selectors with `selectors.*`
- [ ] Replace shallow assertions with `verifyApiCall()`
- [ ] Add `verifyPersistence()` for CRUD operations
- [ ] Add `verifyValidationBlocks()` for validation testing
- [ ] Remove duplicate helper code

## Common Patterns

### Pattern 1: Simple Form Submission
```typescript
await loginAs(page, 'marketing');
await page.goto('/feature');
await page.fill(selectors.common.inputField, 'Value');
await verifyApiCall(
  page,
  () => page.click(selectors.common.submitButton),
  { method: 'POST', urlPattern: '/api/resource' }
);
await verifyPersistence(page, 'h1', 'Value');
```

### Pattern 2: Edit Existing
```typescript
await loginAs(page, 'admin');
await page.goto('/feature/123');
await page.fill(selectors.common.inputField, 'New Value');
await verifyApiCall(
  page,
  () => page.click(selectors.common.saveButton),
  { method: 'PUT', urlPattern: '/api/resource/123' }
);
await verifyPersistence(page, 'h1', 'New Value');
```

### Pattern 3: Validation
```typescript
await loginAs(page, 'viewer');
await page.goto('/feature');
await page.fill(selectors.common.inputField, ''); // empty
await verifyValidationBlocks(
  page,
  () => page.click(selectors.common.submitButton),
  '/api/resource'
);
await expect(page.locator(selectors.common.errorMessage)).toBeVisible();
```

## Need Help?

1. Check `tests/helpers/README.md` for detailed documentation
2. See `tests/helpers/example-usage.spec.ts` for working examples
3. Review this migration guide for patterns

## Rollout Strategy

1. **Phase 1**: Migrate critical flows (auth, newsletter configs)
2. **Phase 2**: Migrate marketing features (campaigns, channels)
3. **Phase 3**: Migrate remaining tests
4. **Phase 4**: Remove old helper code from individual test files

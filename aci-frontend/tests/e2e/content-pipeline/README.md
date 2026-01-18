# Content Pipeline E2E Tests

Comprehensive Playwright E2E tests for the Content Import flow, following MANDATORY deep testing standards from CLAUDE.md.

## Overview

These tests verify the actual behavior of the content import system, not just UI symptoms. All tests follow the deep testing pattern: API interception, HTTP status verification, persistence checks, and console error capture.

## Test File: `content-import.spec.ts`

**19 comprehensive test cases** covering:
- Happy path scenarios
- Input validation and error handling
- Edge cases
- UI behavior
- Tab switching

### Coverage Breakdown

#### Happy Path (4 tests)
- URL import with metadata extraction
- Editing metadata before save
- Manual entry tab import
- Content persistence after import

#### Validation (3 tests)
- Empty URL prevention
- Empty title prevention
- Invalid URL format detection

#### Error Handling (3 tests)
- Metadata extraction failure
- Content creation API error
- Timeout handling

#### Edge Cases (4 tests)
- Special characters in title
- Very long titles (500+ chars)
- Multiple comma-separated tags
- Empty optional fields

#### UI Behavior (3 tests)
- Form reset on sheet close/reopen
- Submit button disabled during creation
- Success message and sheet close

#### Tab Switching (2 tests)
- Form data preservation between tabs
- Metadata clearing on tab switch

## Running Tests

### Run all content import tests
```bash
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts
```

### Run specific test
```bash
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts -g "should import content via URL"
```

### Run in UI mode (interactive)
```bash
npx playwright test tests/e2e/content-pipeline/content-import.spec.ts --ui
```

### Run in debug mode
```bash
npx playwright test tests/e2e/content-pipeline/content-import.spec.ts --debug
```

## Deep Testing Standards Applied

### 1. API Interception with `page.waitForResponse()`
Every API call is intercepted and verified:
```typescript
const response = await Promise.all([
  page.waitForResponse(r => r.url().includes('/content/items') && r.request().method() === 'POST'),
  importButton.click()
]);
expect(response[0].status()).toBe(201);
```

### 2. HTTP Status Verification
Status codes verified for success (200/201) and errors (400/500):
```typescript
expect(response.status()).toBe(201);
```

### 3. Persistence Verification
Data verified to survive page reload:
```typescript
await page.reload();
await expect(page.locator('[role="main"]')).toContainText(uniqueTitle);
```

### 4. Validation Blocks API Calls
Proves invalid submissions make NO API call:
```typescript
let apiCalled = false;
page.on('request', r => { if (r.url().includes('/content/items')) apiCalled = true; });
await submitButton.click();
await page.waitForTimeout(1000);
expect(apiCalled).toBe(false);
```

### 5. Console Error Capture (Zero Errors)
All console errors captured and asserted to be empty:
```typescript
const consoleErrors: string[] = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
// ... tests run ...
expect(consoleErrors).toHaveLength(0);
```

## Test Credentials

Tests use the following credentials:
- Email: `admin@test.com`
- Password: `TestPass123`

## API Endpoints Tested

### Content Import API
- `POST /content/fetch-metadata` - Extract metadata from URL
- `POST /content/items` - Create content item (manual or from metadata)

### Expected Status Codes
- `200` - Metadata extracted successfully
- `201` - Content item created successfully
- `400` - Validation error
- `500` - Server error

## Failure Scenarios Covered

1. **Invalid Input**: Empty URL, empty title, invalid URL format
2. **API Failures**: Metadata extraction failure, content creation failure
3. **Timeouts**: Slow/unresponsive servers
4. **Special Characters**: Unicode, quotes, special security-related characters
5. **Large Data**: Very long titles, many tags
6. **Incomplete Data**: Missing optional fields

## Key Testing Patterns

### Form Validation Pattern
```typescript
// Verify button is disabled when required field is empty
expect(await importButton.isDisabled()).toBe(true);

// Verify no API call is made
let apiCalled = false;
page.on('request', req => {
  if (req.url().includes('/content/items')) apiCalled = true;
});
expect(apiCalled).toBe(false);
```

### Metadata Extraction Pattern
```typescript
// Intercept fetch request and verify status
const response = await Promise.all([
  page.waitForResponse(r => r.url().includes('/content/fetch-metadata')),
  fetchButton.click()
]);
expect(response[0].status()).toBe(200);

// Verify form populated with metadata
const titleInput = page.getByLabel('Content title');
await expect(titleInput).not.toHaveValue('');
```

### Error Handling Pattern
```typescript
// Intercept and simulate error
await page.route('**/content/fetch-metadata', route => {
  route.abort('failed');
});

// Verify error message shown
const errorAlert = page.locator('[role="alert"]');
await expect(errorAlert).toContainText(/failed to fetch/i);

// Verify user can continue manually
const titleInput = page.getByLabel('Content title');
await titleInput.fill('Manual Title');
```

## Environment Configuration

Set these environment variables to override defaults:

```bash
# Base URL for frontend
PLAYWRIGHT_TEST_BASE_URL=http://localhost:5173

# API base URL
VITE_API_BASE_URL=http://localhost:8080
```

## Debugging Failed Tests

### View test report
```bash
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts --reporter=html
npx playwright show-report
```

### Enable trace collection
```bash
npx playwright test tests/e2e/content-pipeline/content-import.spec.ts --trace=on
```

### Check screenshots/videos
Test artifacts are saved to `tests/e2e/content-pipeline/` after failures.

## Best Practices Applied

1. ✅ **No surface-level testing** - All tests verify actual behavior
2. ✅ **API calls intercepted** - Proven requests sent to backend
3. ✅ **Status codes verified** - 200/201 responses confirmed
4. ✅ **Persistence tested** - Data survives page reload
5. ✅ **Validation proven** - Invalid submissions block API calls
6. ✅ **Error handling verified** - Failures gracefully handled
7. ✅ **Console errors captured** - Zero errors allowed
8. ✅ **Independent tests** - No test interdependencies
9. ✅ **Clear assertions** - Specific, meaningful expectations
10. ✅ **Real user flows** - Tests mimic actual user actions

## Common Issues

### Tests fail with 404 on API endpoints
- Ensure backend is running on the configured API_BASE URL
- Verify endpoints match backend implementation

### Tests timeout on metadata extraction
- Check network connectivity to external URLs
- Verify timeout configurations

### Form not visible in tests
- Ensure ImportContentSheet is properly mounted
- Check that import button opens the sheet

### Console errors in test output
- Check that all resources load correctly
- Verify no JavaScript errors in components

## Adding New Tests

When adding new tests:

1. Follow the naming convention: `should [action] when [condition]`
2. Use the existing utility functions (loginUser, navigateToContentImport, etc.)
3. Always intercept API calls with `page.waitForResponse()`
4. Verify HTTP status codes
5. Add console error capture via beforeEach hook
6. Include meaningful assertions
7. Test both happy path AND error scenarios

Example:
```typescript
test('should [action]', async ({ page, request }) => {
  // Setup
  await loginUser(page);
  await navigateToContentImport(page);

  // Action
  const response = await Promise.all([
    page.waitForResponse(r => r.url().includes('/endpoint')),
    userAction()
  ]);

  // Assert
  expect(response[0].status()).toBe(200);
  await expect(page.locator('[role="alert"]')).toContainText('Success');
});
```

## Related Files

- **Component**: `src/components/newsletter/content/ImportContentSheet.tsx`
- **Hooks**:
  - `src/hooks/useFetchURLMetadata.ts`
  - `src/hooks/useCreateContentItem.ts`
- **API Service**: `src/services/api/newsletter.ts`
- **Playwright Config**: `playwright.config.ts`

## Performance Targets

- Metadata extraction: <5 seconds
- Content creation: <2 seconds
- Form interactions: <500ms
- Navigation: <2 seconds

## Future Enhancements

- [ ] Add visual regression tests for UI components
- [ ] Add performance benchmarks
- [ ] Add accessibility compliance tests (WCAG 2.1 AA)
- [ ] Add multi-user scenario tests
- [ ] Add bulk import tests
- [ ] Add content type specific validation tests

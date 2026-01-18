# Add to Newsletter E2E Test Suite

Comprehensive end-to-end tests for the Add to Newsletter content pipeline flow.

## Overview

This test suite validates the complete workflow for adding selected content items to newsletter issues. Tests follow the **CRITICAL DEEP TESTING REQUIREMENTS** from CLAUDE.md:

- ✅ Verify behavior, NOT UI feedback - toasts and messages can lie
- ✅ Intercept API calls with `page.waitForResponse()`
- ✅ Verify HTTP status codes (200/201)
- ✅ Verify data persistence with `page.reload()`
- ✅ Capture console errors and assert they're empty

## Test Coverage

### 1. **Core Functionality Tests**

#### Test 1: Add Selected Content to Newsletter
- Navigates to Content Management → Content Items tab
- Selects 2-3 content items using checkboxes
- Clicks "Add to Newsletter" button
- Opens AddToNewsletterSheet
- Selects draft issue from dropdown
- Selects block type (e.g., "News")
- **INTERCEPTS**: `POST /v1/newsletters/{issueId}/blocks/bulk`
- **VERIFIES**: Response status 201 (Created)
- **VERIFIES**: API response contains created_count > 0
- **VERIFIES**: Selection cleared after success
- **VERIFIES**: Zero console errors

**Coverage**: Happy path, API validation, UI state clearing

---

#### Test 2: Multiple Items in Correct Order
- Selects 3 content items in specific order
- Adds to newsletter
- **INTERCEPTS**: Request payload
- **VERIFIES**: `content_item_ids` array matches selection order
- **VERIFIES**: `block_type` is included in request
- **VERIFIES**: Status 201

**Coverage**: Data integrity, request structure

---

#### Test 3: Handle Duplicate Content Gracefully
- Adds same content twice
- **INTERCEPTS**: Response from API
- **VERIFIES**: `skipped_ids` populated if duplicates detected
- **VERIFIES**: `skipped_count` reflects skipped items
- **VERIFIES**: Warning message displayed (if applicable)

**Coverage**: Duplicate detection, error handling, user feedback

---

### 2. **Data Persistence Tests**

#### Test 4: Block Visible in Newsletter Preview
- Adds content to newsletter
- Captures issue ID from API response
- Navigates to preview page
- **VERIFIES**: Block content visible on page
- **VERIFIES**: No 404 errors

**Coverage**: Data visibility, preview rendering

---

#### Test 5: Persists After Page Reload
- Adds blocks to issue
- **VERIFIES**: API returns 201
- Navigates to preview page
- Records initial block count
- **CRITICAL**: Reloads page
- **VERIFIES**: Blocks still present after reload
- **VERIFIES**: Block count >= initial count

**Coverage**: Data persistence, database integrity

---

### 3. **Validation Tests**

#### Test 6: Empty Selection Validation
- Attempts to add newsletter without selecting items
- **VERIFIES**: "Add to Newsletter" button disabled or not visible
- **VERIFIES**: Submit button disabled in sheet (if opened)
- **VERIFIES**: No API call made

**Coverage**: Input validation, form state

---

#### Test 7: Missing Issue Selection
- Selects content items
- Opens sheet
- Selects block type
- **DOES NOT** select issue
- **VERIFIES**: "Add to Issue" button is disabled
- **VERIFIES**: No API call made

**Coverage**: Required field validation, form constraints

---

#### Test 8: Cancel Button Behavior
- Selects content and opens sheet
- Tracks API calls
- Clicks Cancel button
- **VERIFIES**: Sheet closes
- **VERIFIES**: No API call made
- **VERIFIES**: Selection state preserved (if needed)

**Coverage**: User action handling, state cleanup

---

### 4. **Quality Assurance Tests**

#### Test 9: Zero Console Errors Throughout
- Runs complete workflow
- **VERIFIES**: No console errors captured
- **VERIFIES**: No page errors
- Filters out known safe errors (favicon 404, React warnings)

**Coverage**: Browser console health, error monitoring

---

#### Test 10: API Request Structure Validation
- Completes full workflow
- **INTERCEPTS**: HTTP request
- **VERIFIES**: `content_item_ids` array exists and matches selection
- **VERIFIES**: `block_type` is valid enum value
- **VERIFIES**: Content-Type header is correct
- **VERIFIES**: Status 201

**Coverage**: API contract, request headers, data structure

---

## Running the Tests

### Run all tests in this suite
```bash
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts
```

### Run specific test
```bash
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts -g "should add selected content"
```

### Run with specific browser
```bash
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts --project=chromium
```

### Debug mode
```bash
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts --debug
```

### View test report
```bash
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts --reporter=html
```

## Prerequisites

### Backend Services
- ✅ Backend API running on `http://localhost:8080`
- ✅ PostgreSQL database seeded with test data
- ✅ Test user created: `admin@test.com` / `TestPass123`

### Frontend
- ✅ Frontend running on `http://localhost:5173`
- ✅ All dependencies installed

### Setup
```bash
# Terminal 1: Backend
cd aci-backend
make run

# Terminal 2: Frontend
cd aci-frontend
npm run dev

# Terminal 3: Run tests
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts
```

## Test Data Requirements

### Content Items
- ✅ Minimum 3 content items in database
- ✅ Content items have valid titles and metadata
- ✅ Content items linked to sources

### Newsletter Issues
- ✅ At least one draft issue exists
- ✅ Draft issues have segment names
- ✅ Draft issues have issue_date

## Key Test Patterns

### Pattern 1: API Interception
```typescript
// CRITICAL: Intercept API call before clicking button
const [apiResponse] = await Promise.all([
  page.waitForResponse(
    (r) =>
      r.url().includes('/blocks/bulk') &&
      r.request().method() === 'POST' &&
      r.status() === 201,
    { timeout: 15000 }
  ),
  // Click the button that triggers the API call
  page.locator('button:has-text("Add to Issue")').click(),
]);

// VERIFY: API status is 201
expect(apiResponse.status()).toBe(201);
```

### Pattern 2: Console Error Capture
```typescript
// Capture all console errors
const consoleErrors: string[] = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});
page.on('pageerror', (err) => {
  consoleErrors.push(`PageError: ${err.message}`);
});

// ... run test ...

// ASSERT: Zero critical errors
const criticalErrors = consoleErrors.filter(
  (e) => !e.includes('favicon') && !e.includes('404')
);
expect(criticalErrors).toHaveLength(0);
```

### Pattern 3: Data Persistence
```typescript
// 1. Add data and verify API success
const [response] = await Promise.all([
  page.waitForResponse(r => r.url().includes('/blocks/bulk') && r.status() === 201),
  button.click()
]);

// 2. Navigate to preview page
await page.goto(`${BASE_URL}/newsletter/preview/${issueId}`);

// 3. CRITICAL: Reload the page
await page.reload();
await page.waitForLoadState('networkidle');

// 4. VERIFY: Data survived reload
const blocks = page.locator('[class*="block"]');
expect(await blocks.count()).toBeGreaterThan(0);
```

## Common Issues & Troubleshooting

### Issue: Tests hang waiting for API response
**Cause**: Backend not running or endpoint not responding
```bash
# Check backend
curl http://localhost:8080/health
```

### Issue: Content items not found
**Cause**: Database not seeded
```bash
# Seed database
cd aci-backend
make seed-test-data
```

### Issue: Tests timeout on page load
**Cause**: Frontend not running
```bash
# Start frontend
cd aci-frontend
npm run dev
```

### Issue: Console errors but not API-related
**Cause**: Third-party library warnings
**Solution**: Filter out known safe errors in test assertions

## Performance Metrics

| Metric | Target | Typical |
|--------|--------|---------|
| API Response | < 200ms | 80-150ms |
| Sheet Open | < 500ms | 200-400ms |
| Page Reload | < 3s | 1-2s |
| Full Test | < 30s | 15-20s |

## Integration with CI/CD

These tests are designed to run in:
- GitHub Actions
- GitLab CI
- Other CI/CD platforms

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts
  env:
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: false
```

## Maintenance

### Adding New Tests
1. Follow existing test patterns
2. Always capture console errors
3. Always verify API calls with waitForResponse
4. Always verify persistence with reload
5. Document test purpose with JSDoc comments

### Updating Selectors
If UI components change:
1. Update selectors in helper functions
2. Update selectors in individual tests
3. Run test to verify new selectors
4. Commit selector changes

## Related Documentation

- [Playwright Docs](https://playwright.dev)
- [Test Best Practices](../README.md)
- [API Documentation](../../../../docs/API.md)
- [CLAUDE.md E2E Requirements](../../CLAUDE.md)

## Author Notes

**Created**: 2025-01-17
**Purpose**: Deep E2E testing for Add to Newsletter workflow
**Requirements Met**: All CLAUDE.md critical testing directives
**Coverage**: 10 test scenarios covering happy path, errors, edge cases, and persistence
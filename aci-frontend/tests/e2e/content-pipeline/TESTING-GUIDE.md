# Add to Newsletter E2E Testing Guide

## Test Suite Overview

**File**: `add-to-newsletter.spec.ts`  
**Location**: `/tests/e2e/content-pipeline/`  
**Tests**: 10 comprehensive scenarios  
**Coverage**: Happy paths, errors, edge cases, persistence  

## Quick Start

```bash
# Run all tests
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts

# Run single test
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts -g "should add selected content"

# Debug mode
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts --debug

# View HTML report
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts --reporter=html
```

## What Gets Tested

### 1. Core Add to Newsletter Flow
```
User selects content items
  ↓
Clicks "Add to Newsletter"
  ↓
AddToNewsletterSheet opens
  ↓
User selects issue and block type
  ↓
API POST /blocks/bulk called (INTERCEPTED & VERIFIED)
  ↓
Response status 201 (VERIFIED)
  ↓
Selection cleared
  ↓
Block visible in preview (VERIFIED)
  ↓
Data persists after reload (VERIFIED)
```

### 2. Data Integrity
- Content items sent in correct order
- Request payload structure validated
- Response contains created_count and skipped_ids
- Duplicate handling with skipped items

### 3. Validation
- Empty selection prevents submit
- Missing issue selection prevents submit
- Cancel button doesn't trigger API call
- Form state properly managed

### 4. Browser Health
- Zero console errors
- No JavaScript exceptions
- No 404s or unhandled rejections

## Critical Test Patterns Used

### Pattern 1: API Interception Before Action
```typescript
const [apiResponse] = await Promise.all([
  page.waitForResponse(
    (r) =>
      r.url().includes('/blocks/bulk') &&
      r.request().method() === 'POST' &&
      r.status() === 201,
    { timeout: 15000 }
  ),
  // User action that triggers API call
  page.locator('button:has-text("Add to Issue")').click(),
]);

expect(apiResponse.status()).toBe(201);
```

**Why**: Ensures we capture the real API request before any UI updates.

### Pattern 2: Console Error Capture
```typescript
const consoleErrors: string[] = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => {
  consoleErrors.push(`PageError: ${err.message}`);
});

// ... run test ...

const criticalErrors = consoleErrors.filter(
  (e) => !e.includes('favicon') && !e.includes('404')
);
expect(criticalErrors).toHaveLength(0);
```

**Why**: Detects runtime errors that UI might hide from the user.

### Pattern 3: Data Persistence After Reload
```typescript
// 1. Add data
const [response] = await Promise.all([
  page.waitForResponse(r => r.url().includes('/blocks/bulk') && r.status() === 201),
  page.locator('button:has-text("Add to Issue")').click()
]);

// 2. Navigate to preview
await page.goto(`${BASE_URL}/newsletter/preview/${issueId}`);

// 3. RELOAD THE PAGE
await page.reload();
await page.waitForLoadState('networkidle');

// 4. Verify data survived
const blocks = page.locator('[class*="block"]');
expect(await blocks.count()).toBeGreaterThan(0);
```

**Why**: Proves data actually persisted to database, not just in browser memory.

## Test-by-Test Details

### Test 1: Add Selected Content to Newsletter (Primary Flow)
**Status**: Core functionality
**Duration**: ~15 seconds
**Key Verifications**:
- Navigate to content management
- Select 2 items
- Open sheet
- Select issue and block type
- **API CALL INTERCEPTED**: POST status 201
- Selection cleared after success
- Zero console errors

**Failure Scenarios**:
- API returns non-201 status
- Sheet doesn't open
- Selections not cleared
- Console errors present

### Test 2: Multiple Items in Correct Order
**Status**: Data integrity
**Duration**: ~15 seconds
**Key Verifications**:
- Request body parsed
- content_item_ids array matches selection order
- block_type present in request
- Status 201

**Failure Scenarios**:
- Items reordered
- Missing request fields
- Wrong API status

### Test 3: Handle Duplicate Content Gracefully
**Status**: Error handling
**Duration**: ~15 seconds
**Key Verifications**:
- skipped_ids array present if duplicates
- skipped_count reflects duplicates
- Warning message displayed (optional)

**Failure Scenarios**:
- API doesn't detect duplicates
- No warning to user
- skipped_ids missing

### Test 4: Block Visible in Newsletter Preview
**Status**: Data visibility
**Duration**: ~12 seconds
**Key Verifications**:
- Block content visible on preview page
- No 404 errors
- Page loads successfully

**Failure Scenarios**:
- Block not rendered
- 404 error appears
- Page doesn't load

### Test 5: Persists After Page Reload (CRITICAL)
**Status**: Data persistence
**Duration**: ~18 seconds
**Key Verifications**:
- API returns 201
- Navigate to preview
- **PAGE RELOADED**
- Blocks still visible after reload
- Block count preserved

**Failure Scenarios**:
- Blocks disappear after reload
- Block count decreases
- 404 after reload

### Test 6: Empty Selection Validation
**Status**: Input validation
**Duration**: ~8 seconds
**Key Verifications**:
- Button disabled or inoperable without selection
- Submit button disabled if sheet opens
- No API call made

**Failure Scenarios**:
- Button enabled without selection
- API call made with empty selection

### Test 7: Missing Issue Selection Validation
**Status**: Required field validation
**Duration**: ~8 seconds
**Key Verifications**:
- Submit button disabled without issue selected
- API not called
- Form state prevents submission

**Failure Scenarios**:
- Submit button enabled
- API called without issue

### Test 8: Cancel Button Behavior
**Status**: State management
**Duration**: ~8 seconds
**Key Verifications**:
- Sheet closes on cancel
- No API call made
- Selection preserved

**Failure Scenarios**:
- Sheet stays open
- API called
- Selection cleared incorrectly

### Test 9: Zero Console Errors Throughout
**Status**: Browser health
**Duration**: ~20 seconds
**Key Verifications**:
- Complete workflow runs
- consoleErrors array empty
- No JavaScript exceptions
- Filtered errors: favicon, 404, React warnings

**Failure Scenarios**:
- Console errors detected
- JavaScript exceptions thrown
- Network errors unhandled

### Test 10: API Request Structure Validation
**Status**: API contract
**Duration**: ~15 seconds
**Key Verifications**:
- content_item_ids array exists and valid
- block_type is enum value (hero, news, content, events, spotlight)
- Content-Type header correct
- Status 201

**Failure Scenarios**:
- Invalid request structure
- Wrong enum value
- Missing headers

## Common Issues and Solutions

### Issue: Tests Timeout Waiting for API Response

**Symptom**: Test hangs on `waitForResponse`

**Cause**: 
- Backend not running
- Endpoint not responding
- Incorrect URL pattern

**Solution**:
```bash
# 1. Check backend health
curl http://localhost:8080/health

# 2. Check backend is running
ps aux | grep "aci-backend\|go"

# 3. Check logs
cd aci-backend && make run
```

### Issue: No Content Items Found

**Symptom**: "Cannot select content items"

**Cause**:
- Database not seeded
- Content items don't exist
- Query returns empty

**Solution**:
```bash
# 1. Seed database
cd aci-backend
make seed-test-data

# 2. Verify with query
psql postgres://user:pass@localhost/dbname -c "SELECT COUNT(*) FROM content_items;"
```

### Issue: Newsletter Issues Not Found

**Symptom**: "No draft issues available" alert

**Cause**:
- No draft newsletter issues exist
- All issues are in different status
- Database query fails

**Solution**:
```bash
# 1. Create draft issue via API or UI
# 2. Check status
psql postgres://user:pass@localhost/dbname -c "SELECT id, status FROM newsletter_issues;"
```

### Issue: Tests Pass Locally but Fail in CI/CD

**Symptom**: Different failures in GitHub Actions vs local

**Cause**:
- Environment variables different
- Backend not running in CI
- Database not seeded
- Browser not installed

**Solution**:
```yaml
# In GitHub Actions
- name: Start Backend
  run: cd aci-backend && make run &

- name: Wait for Backend
  run: |
    for i in {1..30}; do
      curl http://localhost:8080/health && break
      sleep 1
    done

- name: Seed Database
  run: cd aci-backend && make seed-test-data

- name: Run Tests
  run: npm run test:e2e
```

### Issue: Console Error Assertions Fail

**Symptom**: Test fails with "expected 0 errors, got N"

**Cause**:
- Real errors in application
- Third-party library warnings
- Network errors

**Solution**:
```typescript
// Check what errors are captured
console.log('Captured errors:', consoleErrors);

// Filter more aggressively
const criticalErrors = consoleErrors.filter(
  (e) =>
    !e.includes('favicon') &&
    !e.includes('404') &&
    !e.includes('React does not recognize') &&
    !e.includes('Warning:') &&
    !e.includes('Deprecation')
);
```

## Performance Benchmarks

| Test | Typical Duration | Max Duration | API Calls |
|------|-----------------|--------------|-----------|
| Test 1 | 14s | 20s | 1 |
| Test 2 | 15s | 20s | 1 |
| Test 3 | 14s | 20s | 1 |
| Test 4 | 12s | 18s | 1 |
| Test 5 | 18s | 25s | 1 |
| Test 6 | 8s | 12s | 0 |
| Test 7 | 8s | 12s | 0 |
| Test 8 | 8s | 12s | 0 |
| Test 9 | 20s | 25s | 1 |
| Test 10 | 15s | 20s | 1 |
| **TOTAL** | **132s** | **170s** | **7** |

## Debugging Strategies

### 1. Enable Trace Recording
```bash
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts --trace=on
```

### 2. Use Debug Mode
```bash
npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts --debug
# Opens Playwright Inspector - step through tests

# Commands in Inspector:
# Ctrl+T: Run all tests in file
# Ctrl+R: Repeat last test
# Step, Resume, etc.
```

### 3. View Network Requests
```typescript
// Add to any test
page.on('request', (request) => {
  console.log('>>> REQUEST:', request.method(), request.url());
});

page.on('response', (response) => {
  console.log('<<< RESPONSE:', response.status(), response.url());
});
```

### 4. View DOM Snapshot
```typescript
// Save HTML at any point
const html = await page.content();
console.log(html);

// Or view in browser
await page.pause(); // Pauses test, browser stays open
```

### 5. Screenshots for Visual Debugging
```typescript
// Add before each assertion
await page.screenshot({ path: 'debug-1.png' });
```

## Best Practices

### 1. Always Intercept API Calls
❌ Don't:
```typescript
await button.click();
await page.waitForTimeout(2000); // Hope it worked
```

✅ Do:
```typescript
const [response] = await Promise.all([
  page.waitForResponse(r => r.url().includes('/blocks/bulk')),
  button.click()
]);
expect(response.status()).toBe(201);
```

### 2. Always Capture Console Errors
❌ Don't:
```typescript
// No error monitoring
```

✅ Do:
```typescript
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));
// ... test ...
expect(errors).toHaveLength(0);
```

### 3. Always Verify Persistence
❌ Don't:
```typescript
await addButton.click();
// Assume it's saved
```

✅ Do:
```typescript
// After API call
await page.goto(previewUrl);
await page.reload(); // Fresh state
// Verify data exists
```

### 4. Use Descriptive Test Names
❌ Don't:
```typescript
test('works', () => {});
test('API test', () => {});
```

✅ Do:
```typescript
test('should add selected content to newsletter and verify API call', () => {});
test('should persist blocks after page reload', () => {});
```

### 5. Clean Up Test State
❌ Don't:
```typescript
// Leave selections checked
// Leave modals open
```

✅ Do:
```typescript
// Clear selections after add
const checkboxes = page.locator('[role="article"] input[type="checkbox"]:checked');
expect(await checkboxes.count()).toBe(0);
```

## Continuous Integration

### GitHub Actions Template
```yaml
name: E2E Tests - Add to Newsletter

on: [pull_request, push]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Install Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Start backend
        run: |
          cd aci-backend
          make run &
          sleep 3
          
      - name: Seed database
        run: cd aci-backend && make seed-test-data
        
      - name: Build frontend
        run: npm run build
        
      - name: Start frontend
        run: npm run dev &
        
      - name: Wait for services
        run: |
          for i in {1..30}; do
            (curl http://localhost:5173 && curl http://localhost:8080/health) && break
            sleep 1
          done
          
      - name: Run E2E tests
        run: npm run test:e2e -- tests/e2e/content-pipeline/add-to-newsletter.spec.ts
        
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/reports/
```

## Related Tests

- `content-import.spec.ts` - Importing content from sources
- `newsletter-full-flow.spec.ts` - Complete newsletter workflow
- Other tests in `/tests/e2e/`

## Support

**Issues?** Check:
1. This troubleshooting guide
2. Backend logs: `kubectl logs deployment/aci-backend`
3. Frontend console: DevTools → Console
4. Playwright docs: https://playwright.dev

**Questions?** See:
- `/tests/e2e/README.md` - General E2E patterns
- `/CLAUDE.md` - Project guidelines
- Component files: `/src/components/newsletter/content/`

# Frontend Test Suite

Comprehensive testing infrastructure for the ACI Frontend application using Playwright for E2E testing and Vitest for unit tests.

## Overview

This test suite provides:
- **E2E Tests:** Browser-based integration tests with Playwright
- **Console Monitoring:** Automatic capture of all console messages, errors, and warnings
- **Visual Regression:** Screenshots and videos of test runs
- **Comprehensive Reporting:** Detailed test reports in multiple formats

## Directory Structure

```
tests/
├── e2e/                          # End-to-end Playwright tests
│   └── frontend-integration.spec.ts
├── screenshots/                  # Test screenshots
├── reports/                      # Test reports
│   ├── E2E_TEST_SUMMARY.md      # Comprehensive test summary
│   ├── frontend-test-report.txt # Text-based report
│   └── playwright-html/         # Interactive HTML report
└── artifacts/                    # Videos, traces, screenshots
```

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install chromium
```

### Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with visible browser (useful for debugging)
npm run test:e2e:headed

# Run with Playwright UI (interactive mode)
npm run test:e2e:ui

# View last test report
npm run test:e2e:report

# Run unit tests (Vitest)
npm test

# Run unit tests with coverage
npm run test:coverage
```

## E2E Test Features

### Comprehensive User Flow Testing

The E2E test suite covers:
1. **Login Flow**
   - Navigate to login page
   - Fill credentials
   - Submit and verify redirect
   - Capture any errors

2. **Threats Page**
   - Verify page loads
   - Count visible articles
   - Check for data display
   - Monitor console errors

3. **Dashboard Page**
   - Verify page loads
   - Check dashboard widgets
   - Monitor API calls

4. **Other Pages**
   - Admin page
   - Bookmarks page
   - Home page

### Console Monitoring

Every test automatically captures:
- ✅ All console.log messages
- ⚠️ All console.warn messages
- ❌ All console.error messages
- 💥 Uncaught exceptions
- 🔌 Failed network requests

### Automatic Artifacts

On test failure, the following are automatically saved:
- Screenshot of the failure point
- Video recording of the entire test
- Console logs
- Network activity
- Error stack traces

## Test Reports

### Report Files

After running tests, check these files:

1. **E2E_TEST_SUMMARY.md** - Comprehensive human-readable summary
   - Test results overview
   - Console error analysis
   - API endpoint status
   - Recommendations for fixes
   - Screenshots and artifact locations

2. **frontend-test-report.txt** - Quick text summary
   - Login status
   - Page statuses
   - Error counts
   - Recommendations

3. **Playwright HTML Report** - Interactive visual report
   - Click-through test steps
   - View screenshots inline
   - Watch video recordings
   - Explore traces

### Viewing Reports

```bash
# View the comprehensive summary
cat tests/reports/E2E_TEST_SUMMARY.md

# View quick text report
cat tests/reports/frontend-test-report.txt

# Open interactive HTML report
npm run test:e2e:report
```

## Test Configuration

### Playwright Config

Located at: `/aci-frontend/playwright.config.ts`

Key settings:
- **Base URL:** http://localhost:5173
- **Timeout:** 60 seconds per test
- **Retries:** 2 on CI, 0 locally
- **Browser:** Chromium (Desktop Chrome)
- **Viewport:** 1920x1080
- **Screenshots:** On failure
- **Videos:** On failure

### Customizing Tests

Edit `/aci-frontend/tests/e2e/frontend-integration.spec.ts` to:
- Add new test scenarios
- Modify test credentials
- Add new page tests
- Customize console monitoring

## Console Monitoring Details

### What's Captured

```typescript
// Console logs
console.log('info message')      // ✅ Captured

// Warnings
console.warn('warning message')  // ⚠️ Captured

// Errors
console.error('error message')   // ❌ Captured

// Uncaught exceptions
throw new Error('boom')          // 💥 Captured

// Failed requests
fetch('/api/fail')               // 🔌 Captured
```

### Accessing Console Data

Console data is available in:
1. Test output (printed to terminal)
2. Text report (`frontend-test-report.txt`)
3. Summary report (`E2E_TEST_SUMMARY.md`)
4. Playwright HTML report (trace viewer)

## Test Assertions

The test validates:
- ✅ Login succeeds
- ✅ Threats page loads
- ✅ Dashboard page loads
- ⚠️ Articles are visible (currently fails - expected)
- ✅ Navigation works between pages

To adjust assertions, edit the test file:
```typescript
// Example: Make article count optional
expect(testResults.threatsPage.status).toBe('LOADED');
// Comment out if articles aren't required:
// expect(testResults.threatsPage.articlesVisible).toBeGreaterThan(0);
```

## Debugging Tests

### Run in Headed Mode

See the browser during test execution:
```bash
npm run test:e2e:headed
```

### Use Playwright UI

Interactive test runner with time-travel debugging:
```bash
npm run test:e2e:ui
```

Features:
- Step through tests
- Rewind and replay
- Inspect DOM at each step
- View console logs inline
- Edit and re-run tests

### Add Debug Logs

Add console.log statements to the test:
```typescript
console.log('🔍 Current URL:', page.url());
console.log('🔍 Page title:', await page.title());
```

### Increase Timeouts

For slow environments, increase timeouts in `playwright.config.ts`:
```typescript
timeout: 120 * 1000,  // 2 minutes instead of 1
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Start backend
        run: |
          cd ../aci-backend
          go run cmd/server/main.go &
          sleep 5

      - name: Start frontend
        run: |
          npm run dev &
          sleep 10

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: tests/reports/

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-artifacts
          path: tests/artifacts/
```

## Common Issues

### Issue: Tests timeout

**Solution:**
- Increase timeout in `playwright.config.ts`
- Check if backend is running
- Check if frontend dev server is running on port 5173

### Issue: Login fails

**Solution:**
- Verify test credentials exist in backend
- Check backend is running on http://localhost:8080
- Check `/v1/auth/login` endpoint is working

### Issue: No articles visible

**Solution:**
- Verify backend has seed data
- Check `/v1/threats` endpoint exists and returns data
- Check `/v1/auth/me` endpoint is implemented

### Issue: Console errors about 404

**Solution:**
- This is expected currently (backend endpoints not fully implemented)
- Check `E2E_TEST_SUMMARY.md` for list of missing endpoints
- Implement missing backend endpoints

## Best Practices

1. **Always run with both servers started:**
   ```bash
   # Terminal 1: Backend
   cd aci-backend && go run cmd/server/main.go

   # Terminal 2: Frontend
   cd aci-frontend && npm run dev

   # Terminal 3: Tests
   cd aci-frontend && npm run test:e2e
   ```

2. **Check reports after every run:**
   - Review `E2E_TEST_SUMMARY.md` for detailed findings
   - Check screenshots in `tests/artifacts/`
   - Watch videos if tests fail

3. **Update test credentials:**
   - If test user changes, update in test file
   - Keep credentials in sync with backend seed data

4. **Add new test scenarios:**
   - Test critical user journeys
   - Test error conditions
   - Test edge cases

## Contributing

When adding new tests:
1. Follow existing test structure
2. Add comprehensive console monitoring
3. Capture screenshots at key steps
4. Document what you're testing
5. Update this README with new test scenarios

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)

---

**Last Updated:** 2025-12-15
**Test Framework:** Playwright 1.x + Vitest 4.x
**Node Version:** 18+

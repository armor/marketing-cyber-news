# Content Import E2E Tests - Execution Checklist

## Pre-Test Setup

- [ ] Backend is running on `http://localhost:8080`
- [ ] Frontend is running on `http://localhost:5173`
- [ ] Database is accessible and populated with test data
- [ ] Test user exists: `admin@test.com` / `TestPass123`
- [ ] Environment variables configured (see below)

## Environment Setup

```bash
# Frontend
cd aci-frontend

# Install dependencies (if needed)
npm install

# Set environment variables
export PLAYWRIGHT_TEST_BASE_URL=http://localhost:5173
export VITE_API_BASE_URL=http://localhost:8080
```

## Test Execution Commands

### Quick Run (All Tests)
```bash
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts
```

### Run Specific Test Suite
```bash
# Happy Path tests only
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts -g "Happy Path"

# Validation tests only
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts -g "Validation"

# Error Handling tests only
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts -g "Error Handling"

# Edge Cases tests only
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts -g "Edge Cases"

# UI Behavior tests only
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts -g "UI Behavior"

# Tab Switching tests only
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts -g "Tab Switching"
```

### Interactive Debug Mode
```bash
# Run in Playwright Inspector
npx playwright test tests/e2e/content-pipeline/content-import.spec.ts --debug

# Run with UI mode (live test runner)
npx playwright test tests/e2e/content-pipeline/content-import.spec.ts --ui

# Run with trace collection (for debugging failures)
npx playwright test tests/e2e/content-pipeline/content-import.spec.ts --trace=on
```

### View Test Results
```bash
# Generate and open HTML report
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts --reporter=html
npx playwright show-report

# View test videos/screenshots
open test-results/  # macOS
xdg-open test-results/  # Linux
```

## Test Execution Verification

### Expected Results

```
Content Import Flow - Deep E2E Tests
├─ Happy Path - URL Import with Metadata Extraction
│  ├─ should import content via URL with metadata extraction ✓
│  ├─ should allow editing metadata before save ✓
│  ├─ should import via manual entry tab ✓
│  └─ should display imported content in list after import ✓
├─ Validation - Required Fields
│  ├─ should prevent submit when URL is empty ✓
│  ├─ should prevent submit when title is empty ✓
│  └─ should show validation error for invalid URL format ✓
├─ Error Handling - URL Fetch Failures
│  ├─ should handle metadata extraction failure gracefully ✓
│  ├─ should handle content creation API error ✓
│  └─ should timeout gracefully for slow responses ✓
├─ Edge Cases
│  ├─ should handle special characters in title ✓
│  ├─ should handle very long title (over 500 chars) ✓
│  ├─ should handle multiple comma-separated tags ✓
│  └─ should handle empty optional fields ✓
├─ UI Behavior
│  ├─ should reset form when sheet closes and reopens ✓
│  ├─ should disable submit button while creating ✓
│  └─ should show success message and then close sheet ✓
└─ Tab Switching
   ├─ should preserve form data when switching tabs ✓
   └─ should clear metadata when switching to manual entry ✓

19 passed (expected: 19)
Duration: ~2-5 minutes
Console Errors: 0
```

## Troubleshooting

### Test Fails: "Page not found"
**Problem**: Frontend not running or wrong URL
**Solution**:
```bash
# Terminal 1: Start frontend
cd aci-frontend && npm run dev

# Terminal 2: Run tests
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts
```

### Test Fails: "API call timeout"
**Problem**: Backend not responding or URL incorrect
**Solution**:
```bash
# Check backend is running
curl http://localhost:8080/health

# Set correct API URL
export VITE_API_BASE_URL=http://localhost:8080

# Re-run tests
npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts
```

### Test Fails: "Authentication failed"
**Problem**: Test user doesn't exist or password wrong
**Solution**:
```bash
# Verify user exists in test database
# Or create test user with credentials:
# Email: admin@test.com
# Password: TestPass123
```

### Test Fails: "Element not found"
**Problem**: UI structure changed or component not rendering
**Solution**:
```bash
# Run in UI debug mode
npx playwright test tests/e2e/content-pipeline/content-import.spec.ts --ui

# Check browser console for errors
# Review latest screenshots/videos in test-results/

# Update selectors if UI changed
# Edit content-import.spec.ts and update getByLabel()/getByRole() calls
```

### Test Times Out
**Problem**: Page load or API response is slow
**Solution**:
```bash
# Check network speed
# Increase timeouts if needed (be cautious)
# Set trace on to see where it hangs
npx playwright test tests/e2e/content-pipeline/content-import.spec.ts --trace=on
```

## Performance Baselines

Expected execution times:

- Happy Path tests: ~10-15 seconds total
- Validation tests: ~8-12 seconds total
- Error Handling tests: ~12-18 seconds total
- Edge Cases tests: ~15-20 seconds total
- UI Behavior tests: ~12-15 seconds total
- Tab Switching tests: ~8-10 seconds total

**Total suite**: ~2-5 minutes depending on system

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd aci-frontend && npm ci
      
      - name: Start backend
        run: cd aci-backend && make run &
      
      - name: Start frontend
        run: cd aci-frontend && npm run build && npm run preview &
      
      - name: Wait for services
        run: sleep 5
      
      - name: Run E2E tests
        run: cd aci-frontend && npm run test:e2e -- tests/e2e/content-pipeline/content-import.spec.ts
      
      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: aci-frontend/playwright-report/
```

## Test Quality Gates

Before merging PR, verify:

- [ ] All 19 tests pass
- [ ] No console errors (0 errors)
- [ ] No timeout failures
- [ ] All API calls verified with status codes
- [ ] Data persistence confirmed after reload
- [ ] Coverage includes: happy path, errors, edge cases, validation
- [ ] Test execution time within baseline (<5 minutes)

## Success Criteria

Test suite is passing when:

1. ✓ 19/19 tests pass
2. ✓ Console errors: 0
3. ✓ All API responses verified with correct status codes
4. ✓ No timeout failures
5. ✓ No flaky tests (consistent results on re-run)
6. ✓ All form validation works as expected
7. ✓ Data persists after page reload
8. ✓ Error handling graceful

## Notes

- Tests are independent and can run in any order
- Each test cleans up after itself (closes sheets, resets forms)
- No external dependencies required (URLs are mocked)
- Tests use test credentials only (never production data)
- Console errors captured and asserted to be empty
- All assertions are specific and meaningful

## Support

For issues or questions:
1. Check TEST_EXECUTION_CHECKLIST.md (this file)
2. Read README.md for detailed documentation
3. Review playwright-report/ for test output and traces
4. Check test-results/ for screenshots/videos
5. Run with --debug flag and inspect Playwright Inspector

---
Last Updated: 2024-01-17
Playwright Version: ^1.40.0
Node Version: ^18.0.0

# Newsletter Full Flow E2E Test Suite

## Overview

Comprehensive end-to-end test suite covering the complete newsletter automation workflow across all user stories (1, 2, 3, 4, 5, 7, and 8).

**Test File:** `tests/e2e/newsletter-full-flow.spec.ts`
**Total Tests:** 21 comprehensive test cases
**Coverage:** ~950 lines of well-documented test code

## User Stories Covered

### Story 1: Configuration
- Create newsletter configuration with all required fields
- Verify configuration values persist correctly
- Performance assertion: Setup < 30 minutes (SC-009)

### Story 2: Generation  
- Trigger AI-powered newsletter generation
- Verify newsletter blocks are created
- Verify block content structure
- Performance assertion: Generation < 5 minutes (SC-010)

### Story 3: Preview
- View generated newsletter preview
- Test personalization with contact selection
- Verify token substitution ({{first_name}}, {{company}}, etc.)

### Story 4: Approval
- Navigate approval queue
- Approve pending newsletters
- Reject newsletters with reason
- Verify status changes

### Story 5: Delivery
- Schedule newsletter for future delivery
- Verify scheduled dates
- Verify delivery status tracking

### Story 7: Analytics
- Load analytics dashboard (< 3s)
- Verify KPI cards display correctly
- Verify trend charts render
- Verify target comparison metrics

### Story 8: Content
- Add content sources (RSS feeds)
- Verify content items load from sources
- Test source connection validation

## Test Structure

### Mock Data Factories

The test suite includes built-in mock data factories for creating consistent test fixtures:

```typescript
// Newsletter configuration
createMockConfig(overrides?)

// Content source
createMockContentSource(overrides?)

// Content items
createMockContentItem(overrides?, index?)

// Newsletter issue
createMockIssue(status, overrides?)

// Analytics data
createMockAnalytics(configId)
```

### Test Setup

- **Authentication:** Marketing manager role with mock tokens
- **API Mocking:** Playwright route interception for all endpoints
- **Isolation:** Each test uses unique IDs (timestamps) to prevent collisions
- **BeforeEach Hook:** Sets up auth tokens and API mocks before each test

### Performance Thresholds

All tests include configurable performance assertions:

- **API Response:** < 200ms (PERFORMANCE_THRESHOLDS.API_RESPONSE)
- **Dashboard Load:** < 3 seconds (PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD)  
- **Generation:** < 5 minutes (PERFORMANCE_THRESHOLDS.GENERATION_COMPLETE)
- **Configuration Setup:** < 30 minutes (checked but very loose threshold)

## Running Tests

### Run All Tests
```bash
npm run test:e2e newsletter-full-flow.spec.ts
```

### Run Specific Story
```bash
npm run test:e2e newsletter-full-flow.spec.ts -g "Story 1"
```

### Run with Debug Mode
```bash
npm run test:e2e newsletter-full-flow.spec.ts --debug
```

### Run with Chrome Debug UI
```bash
npm run test:e2e newsletter-full-flow.spec.ts --debug --headed
```

## Test Artifacts

Playwright automatically captures test artifacts:

- **Screenshots:** `tests/artifacts/*.png` (on failure)
- **Videos:** `tests/artifacts/*.webm` (on failure)
- **Traces:** `tests/artifacts/*.zip` (on first retry)
- **HTML Reports:** `tests/reports/playwright-html/index.html`

### View HTML Report
```bash
open tests/reports/playwright-html/index.html
```

## Coverage Details

### Happy Path Tests (19)
- Configuration creation and persistence
- Newsletter generation and block creation
- Preview rendering and personalization
- Approval workflow
- Delivery scheduling
- Analytics dashboard KPIs
- Content source management
- End-to-end workflow

### Error Case Tests (2)
- Configuration validation
- Rejection workflow with reason

### Edge Case Tests (3)
- Token substitution edge cases
- Content source without items
- Analytics with empty data

## Key Features

### Test Isolation
- **Unique IDs:** Uses `Date.now()` timestamps to prevent ID collisions
- **No Shared State:** Each test creates its own mock data
- **Independent Execution:** Tests can run in any order
- **Automatic Cleanup:** Playwright handles context cleanup

### API Mocking
- **Route Interception:** Uses Playwright's `page.route()` API
- **MSW Compatibility:** Works alongside existing MSW handlers
- **Full Coverage:** Mocks all newsletter endpoints
  - Configuration CRUD
  - Content management
  - Issue generation
  - Preview rendering
  - Approval workflow
  - Scheduling
  - Analytics

### Performance Monitoring
- **Real Measurements:** Actual page load and API times
- **Configurable Thresholds:** Easy to adjust SLAs
- **Clear Assertions:** Explicit performance checks
- **Request Tracking:** Measures individual API response times

### Accessibility & Debugging
- **Explicit Waits:** Clear `waitForLoadState()` calls
- **Timeout Control:** Adjustable timeouts for each assertion
- **Screenshot Capture:** Configured in `playwright.config.ts`
- **Descriptive Names:** Test names match User Stories

## Test Organization

```
Newsletter Full Flow - User Stories 1-8
├── Story 1: Configuration (2 tests)
├── Story 8: Content Sources (2 tests)
├── Story 2: Generation (2 tests)
├── Story 3: Preview (3 tests)
├── Story 4: Approval (3 tests)
├── Story 5: Delivery (2 tests)
├── Story 7: Analytics (4 tests)
├── Integration Tests (1 test)
└── Performance Tests (2 tests)
```

## Mock Data Structure

### Configuration
```typescript
{
  id: 'config-timestamp',
  name: 'Test Newsletter Config',
  cadence: 'weekly',
  send_day_of_week: 2,
  send_time_utc: '14:00',
  timezone: 'America/New_York',
  max_blocks: 6,
  education_ratio_min: 0.3,
  // ... more fields
}
```

### Content Source
```typescript
{
  id: 'source-e2e-timestamp',
  name: 'E2E Test Content Source',
  source_type: 'rss',
  url: 'https://example.com/feed.rss',
  is_active: true,
  refresh_interval_minutes: 60
}
```

### Newsletter Issue
```typescript
{
  id: 'issue-e2e-timestamp',
  configuration_id: 'config-e2e-001',
  segment_id: 'segment-e2e-001',
  subject_line: 'Your Weekly Security Update',
  status: 'draft|approved|scheduled|sent',
  blocks: [/* hero, news, content blocks */],
  // ... analytics metrics
}
```

## Playwright Configuration

From `playwright.config.ts`:

- **Timeout:** 60 seconds per test
- **Browser:** Chromium
- **Viewport:** 1920x1080
- **Screenshot:** Only on failure
- **Video:** Only on failure
- **Trace:** On first retry
- **Base URL:** http://localhost:5173
- **Web Server:** Dev server on port 5173

## Extending the Tests

### Add a New Test
```typescript
test('Story X: Description of test', async ({ page }) => {
  // Setup
  const configId = `config-e2e-${Date.now()}`;
  
  // Act
  await page.goto(`${BASE_URL}/newsletter/config`);
  
  // Assert
  await expect(page.locator('text=Newsletter Configuration')).toBeVisible();
});
```

### Add a New Story
1. Update the test suite description in `test.describe()`
2. Add test cases for each scenario
3. Create mock data factories if needed
4. Add API route mocks in `setupNewsletterMocks()`

### Adjust Performance Thresholds
```typescript
const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE: 200,      // milliseconds
  DASHBOARD_LOAD: 3000,   // 3 seconds
  GENERATION_COMPLETE: 5 * 60 * 1000, // 5 minutes
};
```

## Troubleshooting

### Tests Timeout
- Increase test timeout: `test.setTimeout(120000)`
- Check dev server is running: `npm run dev`
- Verify API mocks are set up correctly in `setupNewsletterMocks()`

### Tests Fail to Find Elements
- Use Chrome DevTools: `npm run test:e2e -- --debug`
- Check for correct selectors (use `[data-test]` attributes)
- Verify selectors match UI implementation

### API Mocks Not Working
- Verify route patterns match API base URL
- Check that `setupNewsletterMocks()` is called in `beforeEach`
- Review mock response structure matches type definitions

### Performance Assertion Failures
- Check actual API response times in DevTools
- Adjust thresholds if environment is slower
- Profile API endpoint performance

## Best Practices

1. **Use timestamps for IDs** - Prevents test data collisions
2. **Mock all external APIs** - Ensures test reliability
3. **Test single user journey** - Focus on specific workflow
4. **Keep assertions specific** - Avoid vague assertions
5. **Use meaningful selectors** - Use `[data-test]` attributes
6. **Capture performance** - Measure real numbers
7. **Document complex logic** - Add comments for clarity

## Future Enhancements

- [ ] Error scenario testing (API failures, network issues)
- [ ] Multi-browser testing (Firefox, Safari, Edge)
- [ ] Accessibility testing (WCAG compliance)
- [ ] Load/stress testing (high volume scenarios)
- [ ] Visual regression testing (screenshot comparisons)
- [ ] Mobile viewport testing (responsive design)
- [ ] Cross-browser parallelization

## Related Files

- **Newsletter Mock Handlers:** `src/mocks/handlers/newsletter.ts`
- **Newsletter Factory:** `src/mocks/factories/newsletter-factory.ts`
- **Newsletter Types:** `src/types/newsletter.ts`
- **Playwright Config:** `playwright.config.ts`


# Component-Level E2E Tests

**Purpose**: Fast, MSW-only tests that verify UI behavior without real backend dependency.

**Focus**: Form validation, UI states, component interactions, error handling.

**Pattern**: Uses MSW mocks for all API responses - no real backend needed.

---

## Test Files Overview

| File | Tests | Lines | Focus Area |
|------|-------|-------|------------|
| `auth-ui.spec.ts` | 9 | 237 | Login form validation, error states, loading |
| `newsletter-form.spec.ts` | 13 | 359 | Newsletter config form, field validation, conditional fields |
| `campaign-form.spec.ts` | 12 | 380 | Campaign builder, wizard navigation, multi-select |
| `channel-cards.spec.ts` | 8 | 313 | Channel connection cards, status indicators, OAuth |
| `marketing-dashboard.spec.ts` | 10 | 400 | Analytics dashboard, charts, filters, empty states |
| **TOTAL** | **52** | **1,689** | **Complete UI component coverage** |

---

## Test Coverage Breakdown

### 1. Authentication UI (`auth-ui.spec.ts`) - 9 Tests

**Component**: Login/Register forms
**MSW Mocks**: `/auth/login`, `/auth/register`

Tests:
1. Login form renders correctly
2. Email field validation - empty
3. Email field validation - invalid format
4. Password field validation - empty
5. Password field validation - too short
6. Submit button disabled when form invalid
7. Error message displays on failed login
8. Loading state during submission
9. Form reset functionality

**Key Patterns**:
- Real-time validation (blur events)
- Submit-time validation blocking
- Error message visibility
- Loading state indicators

---

### 2. Newsletter Form (`newsletter-form.spec.ts`) - 13 Tests

**Component**: Newsletter configuration form
**MSW Mocks**: `/newsletter/configs`, `/segments`

Tests:
1. Config form renders all required fields
2. Name field validation - required
3. Name field validation - minimum length
4. Description field validation
5. Frequency dropdown shows all options
6. Send day selector functionality
7. Send time input accepts valid time
8. Segment multi-select functionality
9. Preview button enabled when form has minimum data
10. Save button disabled when form invalid
11. Form reset functionality
12. Edit mode pre-fills form with existing data
13. Conditional fields based on frequency selection

**Key Patterns**:
- Multi-field validation
- Conditional field rendering (frequency-dependent)
- Multi-select components
- Edit vs. Create mode

---

### 3. Campaign Form (`campaign-form.spec.ts`) - 12 Tests

**Component**: Campaign builder wizard
**MSW Mocks**: `/campaigns`, `/channels`, `/segments`

Tests:
1. Campaign form renders all essential fields
2. Name field validation - required
3. Goal selection dropdown shows all options
4. Channel multi-select functionality
5. Topic tags input accepts multiple tags
6. Frequency selection options
7. Date range picker functionality
8. Content style options available
9. AI recommendation display
10. Form validation summary displays all errors
11. Step wizard navigation (if multi-step)
12. Cancel confirmation dialog appears when form has data

**Key Patterns**:
- Wizard/multi-step forms
- Tag input components
- Date range validation
- AI-powered recommendations
- Unsaved changes confirmation

---

### 4. Channel Cards (`channel-cards.spec.ts`) - 8 Tests

**Component**: Marketing channel connection hub
**MSW Mocks**: `/channels`, `/channels/:id/connect`

Tests:
1. Channel cards render for all supported providers
2. Connected channel shows connected status indicator
3. Disconnected channel shows disconnected status indicator
4. Connect button visible when channel disconnected
5. Disconnect button visible when channel connected
6. Test connection button functionality
7. OAuth redirect initiated on connect click
8. Channel error state displays correctly

**Key Patterns**:
- Status badge indicators
- Conditional button rendering
- OAuth flow initiation
- Connection testing
- Error state visualization

---

### 5. Marketing Dashboard (`marketing-dashboard.spec.ts`) - 10 Tests

**Component**: Analytics dashboard with charts and metrics
**MSW Mocks**: `/analytics`, `/campaigns`, `/metrics`

Tests:
1. Dashboard layout renders all main sections
2. Campaign summary cards display key metrics
3. Channel performance charts render correctly
4. Recent activity list displays campaign actions
5. Quick action buttons are accessible
6. Date range filter updates display
7. Campaign status filter functionality
8. Empty state displays when no data available
9. Loading skeletons appear during data fetch
10. Error boundary handles failed data loading

**Key Patterns**:
- Data visualization (charts/graphs)
- Metric cards/KPIs
- Filter interactions
- Empty states
- Loading skeletons
- Error boundaries

---

## Running Component Tests

### Run all component tests:
```bash
npm test -- tests/e2e/component/
```

### Run specific test file:
```bash
npm test -- tests/e2e/component/auth-ui.spec.ts
npm test -- tests/e2e/component/newsletter-form.spec.ts
npm test -- tests/e2e/component/campaign-form.spec.ts
npm test -- tests/e2e/component/channel-cards.spec.ts
npm test -- tests/e2e/component/marketing-dashboard.spec.ts
```

### Run in UI mode (recommended for development):
```bash
npx playwright test --ui tests/e2e/component/
```

---

## Test Characteristics

### Speed
- **Fast**: MSW mocks respond instantly (no network latency)
- **Parallel**: All 50 tests run in parallel
- **Efficient**: ~10-20 seconds for full suite

### Independence
- Each test is isolated
- No shared state between tests
- Console monitoring in every test
- Clean auth state before each test

### Coverage
- ✅ Form validation (required fields, formats)
- ✅ UI states (loading, error, empty)
- ✅ Component interactions (clicks, selections)
- ✅ Conditional rendering (dependent fields)
- ✅ Error handling (validation, API errors)
- ✅ Multi-select components (tags, channels, segments)
- ✅ Date pickers and time inputs
- ✅ Wizard/multi-step flows
- ✅ Data visualization (charts, metrics)
- ✅ Filter and search interactions

### What's NOT Covered (by design)
- ❌ Real API integration (see integration tests)
- ❌ Data persistence (see integration tests)
- ❌ Backend validation logic
- ❌ Cross-page workflows (see E2E tests)
- ❌ Authentication flows (see integration tests)

---

## MSW Mock Patterns

Component tests rely on MSW handlers in `/src/mocks/handlers/`:

```typescript
// Example: Newsletter config mock
http.get('/api/newsletter/configs', () => {
  return HttpResponse.json([
    { id: 1, name: 'Weekly Newsletter', frequency: 'weekly' },
    { id: 2, name: 'Monthly Digest', frequency: 'monthly' }
  ]);
});

http.post('/api/newsletter/configs', async ({ request }) => {
  const body = await request.json();
  // MSW validates and returns mock response
  return HttpResponse.json({ id: 3, ...body }, { status: 201 });
});
```

---

## Console Monitoring

**ALL tests include console error monitoring**:

```typescript
test.beforeEach(async ({ page }) => {
  monitor = new ConsoleMonitor();
  monitor.attach(page);
  // ... test setup
});

test.afterEach(() => {
  monitor.assertNoErrors(); // FAILS if ANY console errors
});
```

This catches:
- JavaScript errors
- React warnings
- Uncaught exceptions
- Network errors (4xx/5xx)

---

## Common Patterns

### 1. Form Validation Testing
```typescript
// Focus and blur to trigger validation
await page.locator(selectors.newsletter.configNameInput).focus();
await page.locator(selectors.newsletter.configNameInput).blur();
await page.waitForTimeout(300);

// Verify error appears
const errorVisible = await page
  .locator('[role="alert"], .text-destructive')
  .isVisible();
expect(errorVisible).toBe(true);
```

### 2. Conditional Field Testing
```typescript
// Change select to trigger conditional fields
await frequencySelect.click();
await weeklyOption.click();
await page.waitForTimeout(500);

// Verify dependent field appears
const daySelector = page.locator('[data-testid="send-day"]');
await expect(daySelector).toBeVisible();
```

### 3. Multi-Select Testing
```typescript
await channelSelect.click();
await page.waitForTimeout(300);

// Select option
await options.first().click();

// Verify chip/tag appears
const selectedChips = page.locator('[data-testid*="selected-channel"]');
const count = await selectedChips.count();
expect(count).toBeGreaterThan(0);
```

### 4. Status Indicator Testing
```typescript
const connectedBadge = page.locator(
  '[data-testid*="status-connected"], text=/connected/i'
);
await expect(connectedBadge).toBeVisible();

const badgeText = await connectedBadge.textContent();
expect(badgeText?.toLowerCase()).toMatch(/connected|active/);
```

---

## Troubleshooting

### Tests failing with "element not visible"
- Increase `waitForTimeout` after navigation
- Check if element is behind loading skeleton
- Verify MSW mock is returning data

### Validation tests failing
- Some forms validate on blur, others on submit
- Tests handle both patterns gracefully
- Check if form uses real-time or submit-time validation

### Multi-select tests flaky
- Add `await page.waitForTimeout(300)` after clicks
- Verify dropdown is fully open before selecting
- Check if component uses custom select vs native

### Console errors in tests
- Filter false positives in `console-monitor.ts`
- Common: MSW service worker messages, dev tools warnings
- Real errors: React warnings, uncaught exceptions

---

## Next Steps

1. **Integration Tests**: Add tests that verify API calls and persistence
2. **Visual Regression**: Add Playwright screenshot comparisons
3. **Accessibility**: Expand with axe-core automated checks
4. **Performance**: Add metrics collection in tests
5. **Mobile**: Add mobile viewport variants

---

## Maintenance

### Adding New Component Tests

1. Create file: `tests/e2e/component/[component-name].spec.ts`
2. Use existing patterns from these 5 files
3. Always include console monitoring
4. Update this README with test count
5. Add MSW mocks if needed in `/src/mocks/handlers/`

### Updating Existing Tests

- Keep test count accurate in this README
- Update patterns if component changes
- Add TODO comments for missing coverage
- Run tests locally before committing

---

**Last Updated**: 2025-12-27
**Total Tests**: 52
**Total Lines**: 1,689
**Test Coverage**: UI component validation and interactions

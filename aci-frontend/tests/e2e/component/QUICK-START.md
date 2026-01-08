# Component Tests - Quick Start Guide

## 🎯 What Are These Tests?

**Component-level E2E tests** that verify UI behavior using MSW mocks (no real backend needed).

- ✅ Fast execution (~10-20 seconds)
- ✅ No database required
- ✅ No external APIs
- ✅ Focus on UI validation, states, interactions

---

## 🚀 Running Tests

```bash
# All component tests
npm test -- tests/e2e/component/

# Single file
npm test -- tests/e2e/component/auth-ui.spec.ts

# UI mode (best for debugging)
npx playwright test --ui tests/e2e/component/

# Watch mode
npm test -- tests/e2e/component/ --watch
```

---

## 📁 Test Files (52 tests total)

| File | Tests | What It Tests |
|------|-------|---------------|
| `auth-ui.spec.ts` | 9 | Login form, validation, errors |
| `newsletter-form.spec.ts` | 13 | Newsletter config, selectors, validation |
| `campaign-form.spec.ts` | 12 | Campaign wizard, multi-select, dates |
| `channel-cards.spec.ts` | 8 | Channel cards, connection status |
| `marketing-dashboard.spec.ts` | 10 | Dashboard, charts, filters |

---

## 🎨 Test Patterns

### Form Validation
```typescript
// Trigger validation
await page.locator(input).focus();
await page.locator(input).blur();

// Verify error
await expect(page.locator('[role="alert"]')).toBeVisible();
```

### Multi-Select
```typescript
await selectComponent.click();
await options.first().click();

// Verify selection
const chips = page.locator('[data-testid*="selected"]');
expect(await chips.count()).toBeGreaterThan(0);
```

### Status Indicators
```typescript
const statusBadge = page.locator('[data-testid*="status-connected"]');
await expect(statusBadge).toBeVisible();
```

---

## ✅ Every Test Includes

1. **Console Monitoring** - Fails on ANY console errors
2. **Clean State** - Fresh auth and page before each test
3. **Selectors** - Centralized in `tests/helpers/selectors.ts`
4. **MSW Mocks** - All API responses mocked

---

## 🔧 Troubleshooting

### "Element not visible"
- Add `await page.waitForTimeout(300)` after navigation
- Check if MSW mock is returning data

### Validation tests failing
- Some forms validate on blur, others on submit
- Tests handle both patterns

### Console errors in tests
- Check `tests/helpers/console-monitor.ts` for filters
- Real errors: React warnings, uncaught exceptions

---

## 📖 Full Documentation

- **README.md** - Complete guide, patterns, troubleshooting
- **TEST-SUMMARY.md** - Implementation details, verification
- **verify-tests.sh** - Automated verification script

---

## 🎯 Quick Verification

```bash
# Verify all tests are properly structured
bash tests/e2e/component/verify-tests.sh
```

Expected output:
```
Test Files: 5/5
Total Tests: 52/52
Console Monitoring: 5/5
✅ VERIFICATION PASSED
```

---

## 📝 Adding New Tests

1. Create `tests/e2e/component/[name].spec.ts`
2. Copy pattern from existing files
3. Include `ConsoleMonitor`
4. Use centralized `selectors`
5. Add MSW mocks if needed
6. Update README.md

---

## 🚫 What NOT to Test Here

These are **component** tests. Don't test:

- ❌ Real API calls (use integration tests)
- ❌ Data persistence (use integration tests)
- ❌ Cross-page workflows (use E2E tests)
- ❌ Real authentication (use integration tests)

**Focus**: UI behavior, validation, states, interactions

---

## ✨ Coverage Summary

- ✅ Form validation (required, format, min/max)
- ✅ Multi-select components
- ✅ Conditional field rendering
- ✅ Loading states
- ✅ Empty states
- ✅ Error boundaries
- ✅ Status indicators
- ✅ Date/time pickers
- ✅ Wizard navigation
- ✅ Filter interactions

---

**Status**: 52 tests, all using MSW mocks, fast execution, zero backend dependency.

For more details, see **README.md**.

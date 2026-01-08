# Newsletter UI Regression Test Suite

**Total Tests**: 418 E2E tests across 36 test files
**Regression Tests**: 108 tests tagged with @regression
**Last Updated**: 2024-12-22

## Quick Start

```bash
# Run all regression tests
npx playwright test --grep "regression"

# Run all tests
npx playwright test

# Run specific test file
npx playwright test newsletter-master-regression.spec.ts

# Run with UI mode
npx playwright test --ui
```

## Coverage Matrix

This document tracks comprehensive UI test coverage for the AI Newsletter Automation System.

---

## User Story Coverage

### US1: Configuration Management (P1)

| Scenario | Test File | Status |
|----------|-----------|--------|
| Create new configuration | newsletter-config.spec.ts | ✅ |
| Edit configuration | newsletter-config.spec.ts | ✅ |
| Delete configuration | newsletter-config.spec.ts | ✅ |
| List configurations | newsletter-config.spec.ts | ✅ |
| Form validation (required fields) | newsletter-config.spec.ts | ✅ |
| Segment selector | newsletter-config.spec.ts | ✅ |
| Content mix settings | newsletter-config.spec.ts | ⚠️ Partial |
| Brand voice settings | newsletter-config.spec.ts | ⚠️ Partial |
| Approval tier selection | newsletter-config.spec.ts | ✅ |
| <30 min configuration time (SC-009) | newsletter-config.spec.ts | ✅ |

### US2: AI Content Generation (P1)

| Scenario | Test File | Status |
|----------|-----------|--------|
| Trigger generation | newsletter-generation.spec.ts | ✅ |
| View generation status | newsletter-generation.spec.ts | ✅ |
| Generation <5 min (SC-010) | newsletter-generation.spec.ts | ✅ |
| View preview | newsletter-preview-regression.spec.ts | ⚠️ New |
| Block types displayed | newsletter-preview-regression.spec.ts | ⚠️ New |
| Subject line variants | newsletter-preview-regression.spec.ts | ⚠️ New |

### US3: Personalization (P1)

| Scenario | Test File | Status |
|----------|-----------|--------|
| Field token display | newsletter-preview-regression.spec.ts | ⚠️ New |
| Contact selector | newsletter-preview-regression.spec.ts | ⚠️ New |
| Side-by-side comparison | newsletter-preview-regression.spec.ts | ⚠️ New |
| Partner content filtering | newsletter-preview-regression.spec.ts | ⚠️ New |

### US4: Approval Workflow (P2)

| Scenario | Test File | Status |
|----------|-----------|--------|
| View pending approvals | newsletter-full-flow.spec.ts | ✅ |
| Approve issue | approval-button-actions.spec.ts | ✅ |
| Reject issue with reason | approval-button-actions.spec.ts | ✅ |
| Status transitions | approval-progression.spec.ts | ✅ |
| Role-based access | approval-marketing.spec.ts | ✅ |
| Approval history | approval-history.spec.ts | ✅ |

### US5: Delivery & Tracking (P2)

| Scenario | Test File | Status |
|----------|-----------|--------|
| Schedule send | newsletter-delivery-regression.spec.ts | ⚠️ New |
| View delivery status | newsletter-delivery-regression.spec.ts | ⚠️ New |
| Cancel scheduled send | newsletter-delivery-regression.spec.ts | ⚠️ New |

### US6: A/B Testing (P2)

| Scenario | Test File | Status |
|----------|-----------|--------|
| View test variants | newsletter-analytics-regression.spec.ts | ⚠️ New |
| View test results | newsletter-analytics-regression.spec.ts | ⚠️ New |
| Winner indicator | newsletter-analytics-regression.spec.ts | ⚠️ New |
| Statistical significance | newsletter-analytics-regression.spec.ts | ⚠️ New |

### US7: Analytics Dashboard (P3)

| Scenario | Test File | Status |
|----------|-----------|--------|
| Overview KPIs | newsletter-analytics-regression.spec.ts | ⚠️ New |
| Segment metrics | newsletter-analytics-regression.spec.ts | ⚠️ New |
| Trend charts | newsletter-analytics-regression.spec.ts | ⚠️ New |
| Date range selector | newsletter-analytics-regression.spec.ts | ⚠️ New |
| Export functionality | newsletter-analytics-regression.spec.ts | ⚠️ New |

### US8: Content Source Management (P3)

| Scenario | Test File | Status |
|----------|-----------|--------|
| List content sources | newsletter-content-regression.spec.ts | ⚠️ New |
| Create source | newsletter-content-regression.spec.ts | ⚠️ New |
| Edit source | newsletter-content-regression.spec.ts | ⚠️ New |
| Delete source | newsletter-content-regression.spec.ts | ⚠️ New |
| Test feed connection | newsletter-content-regression.spec.ts | ⚠️ New |
| Content items list | newsletter-content-regression.spec.ts | ⚠️ New |
| Content filtering | newsletter-content-regression.spec.ts | ⚠️ New |

---

## Cross-Cutting Concerns

### Accessibility (FR-058)

| Scenario | Test File | Status |
|----------|-----------|--------|
| Keyboard navigation | newsletter-accessibility.spec.ts | ✅ |
| Screen reader support | newsletter-accessibility.spec.ts | ✅ |
| Color contrast | newsletter-accessibility.spec.ts | ✅ |
| Focus management | newsletter-accessibility.spec.ts | ✅ |
| ARIA labels | newsletter-accessibility.spec.ts | ✅ |

### Error Handling

| Scenario | Test File | Status |
|----------|-----------|--------|
| API error messages | newsletter-error-handling.spec.ts | ⚠️ New |
| Network failures | newsletter-error-handling.spec.ts | ⚠️ New |
| Form validation errors | newsletter-error-handling.spec.ts | ⚠️ New |
| 404 handling | newsletter-error-handling.spec.ts | ⚠️ New |
| 401/403 handling | newsletter-error-handling.spec.ts | ⚠️ New |

### Navigation

| Scenario | Test File | Status |
|----------|-----------|--------|
| Sidebar newsletter routes | newsletter-navigation.spec.ts | ✅ |
| Breadcrumb navigation | newsletter-navigation.spec.ts | ⚠️ Partial |
| Deep linking | newsletter-navigation.spec.ts | ⚠️ Partial |
| Back button behavior | newsletter-navigation.spec.ts | ⚠️ Partial |

### Loading States

| Scenario | Test File | Status |
|----------|-----------|--------|
| List loading skeletons | newsletter-loading-states.spec.ts | ⚠️ New |
| Form loading | newsletter-loading-states.spec.ts | ⚠️ New |
| Chart loading | newsletter-loading-states.spec.ts | ⚠️ New |
| Generation progress | newsletter-loading-states.spec.ts | ⚠️ New |

---

## Performance Requirements

| Metric | Target | Test |
|--------|--------|------|
| SC-009: Config setup | <30 min | newsletter-config.spec.ts |
| SC-010: Generation | <5 min | newsletter-generation.spec.ts |
| API responses | <200ms | newsletter-api-regression.spec.ts |
| Dashboard load | <3s | newsletter-analytics-regression.spec.ts |

---

## Test Execution

### Run All Newsletter Tests
```bash
npx playwright test --grep "newsletter"
```

### Run Regression Suite Only
```bash
npx playwright test --grep "regression"
```

### Run by User Story
```bash
npx playwright test newsletter-config.spec.ts  # US1
npx playwright test newsletter-generation.spec.ts  # US2
npx playwright test newsletter-full-flow.spec.ts  # US3-4
npx playwright test newsletter-analytics-regression.spec.ts  # US6-7
npx playwright test newsletter-content-regression.spec.ts  # US8
```

---

## New Test Files Required

1. `newsletter-preview-regression.spec.ts` - Preview & personalization
2. `newsletter-analytics-regression.spec.ts` - Analytics dashboard
3. `newsletter-content-regression.spec.ts` - Content management
4. `newsletter-delivery-regression.spec.ts` - Delivery & scheduling
5. `newsletter-error-handling.spec.ts` - Error scenarios
6. `newsletter-loading-states.spec.ts` - Loading UX
7. `newsletter-master-regression.spec.ts` - Full regression suite

---

## Legend

- ✅ Complete - Tests exist and pass
- ⚠️ Partial - Some coverage exists but incomplete
- ⚠️ New - Test file needs to be created
- ❌ Missing - No coverage exists

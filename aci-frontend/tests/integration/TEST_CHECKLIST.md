# ThreatsPage Integration Tests - Implementation Checklist

## Overview

This checklist guides the implementation of `ThreatsPage` to pass all 26 integration tests.

**Status**: Tests written (TDD mode) - Ready for implementation
**Expected Duration**: 2-3 hours for full implementation
**Difficulty**: Medium (component composition + API integration)

---

## Phase 1: Setup & Infrastructure

### Project Structure
- [ ] Create `/src/pages/ThreatsPage.tsx`
- [ ] Create `/src/components/FilterPanel.tsx`
- [ ] Create `/src/components/ThreatList.tsx`
- [ ] Create `/src/components/Pagination.tsx`
- [ ] Create `/src/services/threatService.ts`
- [ ] Update `/src/pages/index.ts` to export ThreatsPage

### Verify Test Setup
- [ ] Check `/tests/setup.ts` is configured
- [ ] Verify MSW is installed: `npm list msw`
- [ ] Check vitest config exists: `vitest.config.ts`
- [ ] Verify TanStack Query is installed: `npm list @tanstack/react-query`

### Run Initial Tests
- [ ] Run: `npm test tests/integration/ThreatsPage.test.tsx`
- [ ] Verify tests fail with missing import error (EXPECTED)
- [ ] Note: This is the RED phase of TDD

---

## Phase 2: Component Implementation

### ThreatsPage Main Component

**File**: `/src/pages/ThreatsPage.tsx`

Checklist:
- [ ] Import React hooks (useState, useCallback)
- [ ] Import react-router hooks (useNavigate, useSearchParams)
- [ ] Import TanStack Query (useQuery)
- [ ] Import component types
- [ ] Create ThreatsPage function component
- [ ] Implement state: page number
- [ ] Parse URL searchParams for filters
- [ ] Call threatService.getThreats() with filters
- [ ] Handle loading state (show loading test ID)
- [ ] Handle error state (show error test ID + retry button)
- [ ] Handle empty state (show empty test ID + clear filters button)
- [ ] Render FilterPanel component
- [ ] Render ThreatList component
- [ ] Render Pagination component
- [ ] Implement filter change handler
- [ ] Implement search handler
- [ ] Reset pagination on filter change

Required Test IDs:
```typescript
data-testid="threats-loading-state"
data-testid="threats-error-state"
data-testid="threats-empty-state"
data-testid="retry-button"
data-testid="clear-filters-button"
```

### FilterPanel Component

**File**: `/src/components/FilterPanel.tsx`

Checklist:
- [ ] Create component with filter and search handlers
- [ ] Add Severity filter (checkbox/dropdown)
- [ ] Add Category filter (checkbox/dropdown)
- [ ] Add Search input
- [ ] Implement onChange handlers for each filter
- [ ] Add clear/reset functionality
- [ ] Style appropriately

Required Test IDs:
```typescript
data-testid="severity-filter-button"
data-testid="category-filter-button"
data-testid="threat-search-input"
data-testid="search-clear-button"
```

### ThreatList Component

**File**: `/src/components/ThreatList.tsx`

Checklist:
- [ ] Accept threats array as prop
- [ ] Map over threats array
- [ ] Create threat card for each threat
- [ ] Display title
- [ ] Display summary
- [ ] Display severity badge
- [ ] Display source
- [ ] Display CVE list (if any)
- [ ] Add bookmark button
- [ ] Implement card click handler (navigate to detail)
- [ ] Implement bookmark click handler (API call)
- [ ] Style threat cards
- [ ] Handle empty threats array

Required Test IDs:
```typescript
data-testid={`threat-card-${threat.id}`}
data-testid={`severity-badge-${severity}`}
data-testid={`threat-cves-${threat.id}`}
data-testid={`bookmark-button-${threat.id}`}
```

### Pagination Component

**File**: `/src/components/Pagination.tsx`

Checklist:
- [ ] Accept currentPage, totalPages, onPageChange props
- [ ] Render Previous button
- [ ] Render Next button
- [ ] Render current page display
- [ ] Disable Previous on page 1
- [ ] Disable Next on last page
- [ ] Call onPageChange callback on button click
- [ ] Style pagination controls

Required Test IDs:
```typescript
data-testid="pagination-prev-button"
data-testid="pagination-next-button"
data-testid="pagination-current-page"
```

---

## Phase 3: Service Layer

### ThreatService Implementation

**File**: `/src/services/threatService.ts`

Checklist:
- [ ] Create threatService object/class
- [ ] Implement getThreats(filters) method:
  - [ ] Accept page, severity[], category[], search params
  - [ ] Build URL with query string
  - [ ] Call GET `/api/v1/threats`
  - [ ] Return response with data array
- [ ] Implement toggleBookmark(threatId) method:
  - [ ] Call POST `/api/v1/threats/{id}/bookmark`
  - [ ] Handle success/error
- [ ] Export service

Example signature:
```typescript
interface GetThreatsParams {
  page?: number;
  severity?: Severity[];
  category?: ThreatCategory[];
  search?: string;
}

interface ThreatsResponse {
  success: boolean;
  data: ThreatSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const threatService = {
  async getThreats(params: GetThreatsParams): Promise<ThreatsResponse>,
  async toggleBookmark(threatId: string): Promise<void>,
}
```

---

## Phase 4: Test 1 - Happy Path Tests

### Run Tests
```bash
npm test tests/integration/ThreatsPage.test.tsx -- -t "Happy Path"
```

### Tests to Pass

#### 1. "should render threats list with threat cards"
- [ ] Component renders without errors
- [ ] Threat titles display
- [ ] Basic threat card structure visible

#### 2. "should render severity badges on threat cards"
- [ ] Severity badges render
- [ ] Test IDs: `severity-badge-critical`, etc.
- [ ] Each threat shows its severity

#### 3. "should display threat summaries and metadata"
- [ ] Summary text displays
- [ ] Source attribution shows
- [ ] CVE list displays with data-testid

#### 4. "should render filter panel with severity options"
- [ ] Filter panel visible
- [ ] Severity dropdown/options render
- [ ] All severity levels (Critical, High, Medium, Low) present

#### 5. "should filter threats by severity"
- [ ] Click severity filter
- [ ] Select "Critical"
- [ ] API called with `?severity=critical`
- [ ] Only critical threats show
- [ ] Others hidden

#### 6. "should filter threats by category"
- [ ] Click category filter
- [ ] Select "Ransomware"
- [ ] API called with `?category=ransomware`
- [ ] Only matching threats show

#### 7. "should search threats by text"
- [ ] Type in search input
- [ ] API called with `?search=term`
- [ ] Results filtered by title/summary
- [ ] Non-matching threats hidden

#### 8. "should support pagination with 20 items per page"
- [ ] Page 1 shows items 1-20
- [ ] Click "Next"
- [ ] Page 2 shows items 21-25
- [ ] API called with `?page=2`
- [ ] Previous/Next buttons work

#### 9. "should navigate to threat detail on card click"
- [ ] Click threat card
- [ ] Browser navigates to `/threats/{threatId}`
- [ ] URL changes correctly

#### 10. "should toggle bookmark on threat card"
- [ ] Click bookmark button
- [ ] POST call to `/api/v1/threats/{id}/bookmark`
- [ ] Button state changes (aria-pressed)
- [ ] Card reflects bookmarked state

### Expected Result
```
PASS  10 happy path tests
```

---

## Phase 5: Test 2 - Error Path Tests

### Run Tests
```bash
npm test tests/integration/ThreatsPage.test.tsx -- -t "Error Path"
```

### Tests to Pass

#### 1. "should display error message when API returns 500"
- [ ] Error state test ID visible
- [ ] Error message displayed
- [ ] User sees something went wrong

#### 2. "should show error details in error state"
- [ ] Error details from API shown
- [ ] Error message is meaningful

#### 3. "should retry and recover from API error"
- [ ] First call fails (503)
- [ ] Error state shows
- [ ] Click "Retry" button
- [ ] Second call succeeds
- [ ] Threats load and display
- [ ] Verify API called twice

#### 4. "should handle network errors gracefully"
- [ ] Network error handled (HttpResponse.error())
- [ ] Error state visible
- [ ] No uncaught exceptions
- [ ] Can retry

### Expected Result
```
PASS  4 error path tests
```

---

## Phase 6: Test 3 - Empty State Tests

### Run Tests
```bash
npm test tests/integration/ThreatsPage.test.tsx -- -t "Empty"
```

### Tests to Pass

#### 1. "should show empty state when no threats exist"
- [ ] API returns empty array
- [ ] Empty state test ID visible
- [ ] "No threats found" message shows

#### 2. "should show empty state when search returns no results"
- [ ] Search for "nonexistentterm123xyz"
- [ ] API returns 0 results
- [ ] Empty state shows
- [ ] Message indicates search returned nothing

#### 3. "should show empty state when filters return no results"
- [ ] Apply filter yielding 0 results
- [ ] Empty state visible
- [ ] Message clear about filters being active

#### 4. "should suggest clearing filters when empty from filter"
- [ ] Empty state shown due to filters
- [ ] "Clear Filters" button visible
- [ ] Button clickable and works

### Expected Result
```
PASS  4 empty state tests
```

---

## Phase 7: Test 4 - Edge Case (CVE Search) Tests

### Run Tests
```bash
npm test tests/integration/ThreatsPage.test.tsx -- -t "CVE"
```

### Tests to Pass

#### 1. "should find threats by CVE ID"
- [ ] Search: `CVE-2024-12345`
- [ ] API filters threats by CVE in array
- [ ] Matching threat displays
- [ ] Non-matching hidden

#### 2. "should display CVE IDs on matching threats"
- [ ] CVE IDs render on card
- [ ] Multiple CVEs display if present
- [ ] Format clear and readable

#### 3. "should handle partial CVE searches"
- [ ] Search: `CVE-2024`
- [ ] Matches all 2024 CVEs
- [ ] Substring matching works

#### 4. "should return empty result for non-existent CVE"
- [ ] Search: `CVE-9999-99999`
- [ ] Returns 0 results
- [ ] Empty state shown

### Expected Result
```
PASS  4 CVE search tests
```

---

## Phase 8: Test 5 - Additional Edge Cases

### Run Tests
```bash
npm test tests/integration/ThreatsPage.test.tsx -- -t "Additional"
```

### Tests to Pass

#### 1. "should clear search input when clear button is clicked"
- [ ] Type search term
- [ ] Click clear button
- [ ] Input emptied
- [ ] Filters removed
- [ ] All results restored

#### 2. "should reset pagination to page 1 when filters change"
- [ ] Navigate to page 2
- [ ] Apply filter
- [ ] Pagination resets to page 1
- [ ] API called with `?page=1`

#### 3. "should display loading state initially"
- [ ] Page initially shows loader/skeleton
- [ ] Data loads
- [ ] Loading state hidden
- [ ] Content displayed

#### 4. "should combine multiple filters"
- [ ] Apply severity filter
- [ ] Apply category filter
- [ ] API called with both params
- [ ] Only matching BOTH filters shown

### Expected Result
```
PASS  4 additional edge case tests
```

---

## Phase 9: Full Test Suite

### Run All Tests
```bash
npm test tests/integration/ThreatsPage.test.tsx
```

### Expected Result
```
PASS  tests/integration/ThreatsPage.test.tsx
  Happy Path: Full Page Rendering (10 passed)
  Error Path: API Failure and Recovery (4 passed)
  Empty/Null State: No Threats Found (4 passed)
  Edge Case: Search by CVE ID (4 passed)
  Additional Edge Cases (4 passed)

Test Files: 1 passed (1)
Tests: 26 passed (26)
Duration: ~3-5 seconds
```

---

## Phase 10: Quality Checks

### Code Quality
- [ ] No console errors during tests
- [ ] All TypeScript types correct
- [ ] No ESLint warnings
- [ ] Proper error handling throughout

### Test Coverage
- [ ] All 26 tests passing
- [ ] No skipped tests (no `it.skip()`)
- [ ] No pending tests

### Component Quality
- [ ] Components are responsive
- [ ] Proper loading states
- [ ] Proper error handling
- [ ] Accessible (keyboard nav, ARIA labels)
- [ ] Semantic HTML structure

### Performance
- [ ] Tests run in <5 seconds total
- [ ] No memory leaks
- [ ] API calls optimized (query keys)

---

## Troubleshooting Guide

### Test Failures

**Error: "Failed to resolve import"**
- Check component file exists at correct path
- Verify export statement in component

**Test: "should render threats list" fails**
- Check test IDs in ThreatList component match test expectations
- Verify data loading and rendering in waitFor()

**Test: "should filter by severity" fails**
- Check filter handlers update URL params
- Verify API service builds query string correctly
- Check MSW handler filters data by severity param

**Test: "should show error state" fails**
- Check error state component renders with test ID
- Verify error is caught and displayed
- Check retry button is present and clickable

**Test: "should navigate" fails**
- Check useNavigate() is imported and used
- Verify onClick handler calls navigate()
- Check route path is correct

**Test timeout issues**
- Increase waitFor timeout if API is slow
- Check async/await in service
- Verify MSW handler responds correctly

### Common Mistakes

1. **Forgetting test IDs**: Every interactive element needs data-testid
2. **Not resetting pagination**: Always reset to page 1 on filter change
3. **Async race conditions**: Use proper await with waitFor()
4. **Not handling null data**: Check data exists before rendering
5. **Missing event.stopPropagation()**: Prevent bubbling on nested buttons
6. **Query string building**: Use URLSearchParams for proper formatting
7. **Not updating filters state**: Update both state and URL params
8. **Bookmark state**: Use both local state and API response

---

## Verification Checklist - Final

Before marking complete, verify:

- [ ] All 26 tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] No console errors
- [ ] Load page manually and test UI
- [ ] Test in different browsers
- [ ] Test on mobile viewport
- [ ] Git commit changes
- [ ] Update CHANGELOG if needed

---

## Time Estimates

| Phase | Task | Estimate |
|-------|------|----------|
| 1 | Setup & Infrastructure | 10 min |
| 2 | Component Implementation | 60 min |
| 3 | Service Layer | 15 min |
| 4-8 | Test Iterations | 45 min |
| 9 | Full Suite Run | 5 min |
| 10 | Quality Checks | 15 min |
| **Total** | **Full Implementation** | **2.5 hours** |

---

## Success Criteria

- [x] All 26 integration tests pass
- [x] No TypeScript errors
- [x] No console warnings/errors
- [x] Code follows project conventions
- [x] Components are accessible
- [x] Performance is acceptable
- [x] Git history is clean

---

## Next Steps After Completion

1. **Create component detail page** (`/src/pages/ThreatDetail.tsx`)
2. **Add unit tests** for individual components
3. **Add E2E tests** for full user workflows
4. **Deploy to staging** and test manually
5. **Update component library** documentation
6. **Create user guide** for threat browsing

---

**Document Version**: 1.0
**Last Updated**: December 14, 2025
**Status**: Ready for Implementation

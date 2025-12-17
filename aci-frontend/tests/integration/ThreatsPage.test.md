# ThreatsPage Integration Tests

## Overview

This document describes the integration tests for the `ThreatsPage` component. These tests follow **Test-Driven Development (TDD)** principles - the tests are written BEFORE the page implementation exists.

**File**: `tests/integration/ThreatsPage.test.tsx`
**Status**: Ready for implementation (tests will FAIL until `ThreatsPage` is built)

## Test Coverage

### Coverage Matrix (31 test cases)

| Category | Tests | Coverage |
|----------|-------|----------|
| **Happy Path** | 12 tests | List rendering, filters, search, pagination, navigation |
| **Error Path** | 4 tests | API errors (500, 503), network errors, retry logic |
| **Empty State** | 4 tests | No results, search empty, filter empty, clear suggestions |
| **Edge Case: CVE Search** | 4 tests | Full CVE, partial CVE, non-existent CVE, display |
| **Additional Edges** | 7 tests | Loading state, combined filters, pagination reset, clear search |

## Test Scenarios Detailed

### Happy Path: Full Page Rendering (12 tests)

**Test 1: Threat List Rendering**
- Verifies threats appear as cards on initial load
- Checks threat titles match mock data
- Validates 3+ threats display correctly

**Test 2: Severity Badges**
- Checks severity badges render on each threat card
- Verifies badge styling by severity level (critical/high/medium/low)
- Uses `[data-testid="severity-badge-*"]`

**Test 3: Threat Metadata Display**
- Displays threat summary/description
- Shows source attribution (NVD, CISA, etc.)
- Lists CVE IDs in `threat-cves-{threatId}` element

**Test 4: Filter Panel UI**
- Renders severity filter dropdown
- Renders category filter dropdown
- Shows all severity options (Critical, High, Medium, Low)

**Test 5: Severity Filtering**
- User clicks severity filter
- Selects one severity (e.g., "Critical")
- API called with `?severity=critical`
- Only critical threats displayed
- Non-critical threats hidden

**Test 6: Category Filtering**
- Similar flow to severity filtering
- Uses category filter dropdown
- Calls API with `?category=ransomware`
- Filters results appropriately

**Test 7: Text Search**
- User types in search input
- API called with `?search=<term>`
- Results filtered by title/summary match
- Non-matching threats removed

**Test 8: Pagination (20 items/page)**
- 25 total mock threats (requires 2 pages)
- Page 1 shows threats 1-20
- Clicking "Next" loads page 2
- Page 2 shows threats 21-25
- API receives `?page=2`

**Test 9: Threat Detail Navigation**
- User clicks threat card
- Browser navigates to `/threats/{threatId}`
- Uses `navigate()` from react-router

**Test 10: Bookmark Toggle**
- User clicks bookmark button on threat card
- POST `/api/v1/threats/{id}/bookmark` called
- Button aria-pressed state changes
- Card shows bookmarked state

**Test 11: Search Clears**
- Search input populated with text
- User clicks clear button
- Input emptied, all results restored

**Test 12: Filter Reset**
- Filters applied (e.g., severity=critical)
- User clicks "Clear Filters"
- All filters removed, all threats shown

### Error Path: API Failures (4 tests)

**Test 1: 500 Server Error**
- API returns `{ status: 500, success: false }`
- Error message displayed to user
- Error state shown with proper UI
- Uses `[data-testid="threats-error-state"]`

**Test 2: Error Details**
- API returns error with message: `"Database connection failed"`
- Message displayed in error UI
- Helps user understand what went wrong

**Test 3: Retry and Recovery**
- First API call fails (503)
- User clicks "Retry" button
- Second call succeeds
- Threats load and display
- Verifies retry logic works

**Test 4: Network Errors**
- Network connection fails (HttpResponse.error())
- Error state shown
- User can retry
- No uncaught exceptions

### Empty State: No Results (4 tests)

**Test 1: No Threats Exist**
- API returns empty array
- Empty state UI displayed
- "No threats found" message shown
- Uses `[data-testid="threats-empty-state"]`

**Test 2: Search Returns Empty**
- User searches for "nonexistentterm123xyz"
- API returns 0 results
- Empty state shown
- Message indicates search returned nothing

**Test 3: Filter Returns Empty**
- User applies severity filter that yields 0 results
- Empty state displayed
- Helps user understand filters are active

**Test 4: Clear Filters Suggestion**
- Empty state shown due to filters
- "Clear Filters" button visible
- User can click to reset and try again

### Edge Case: CVE ID Search (4 tests)

**Test 1: Full CVE Search**
- Search input: `CVE-2024-12345`
- API filters by CVE in threat's `cves[]` array
- Only threats with matching CVE shown
- Correct threat (Apache Struts) appears

**Test 2: CVE Display on Results**
- Threat with CVEs shown
- CVE IDs rendered in card
- Multiple CVEs displayed if present
- `CVE-2024-12345, CVE-2024-12346`

**Test 3: Partial CVE Search**
- Search: `CVE-2024`
- Matches all 2024 CVEs
- Demonstrates substring search works

**Test 4: Non-Existent CVE**
- Search: `CVE-9999-99999`
- Returns 0 results
- Empty state shown
- User sees no threats match that CVE

### Additional Edge Cases (7 tests)

**Test 1: Clear Search Input**
- User types search term
- Clicks X button to clear
- Input emptied, filters removed
- All original threats restored

**Test 2: Reset Pagination on Filter**
- User on page 2
- Applies new filter
- Pagination resets to page 1
- API called with `?page=1&severity=critical`

**Test 3: Loading State**
- Page initially shows skeleton/loader
- API response delayed 500ms
- Loading state visible during wait
- Data loads after

**Test 4: Combined Filters**
- User applies severity=high AND category=ransomware
- API called: `?severity=high&category=ransomware`
- Only threats matching BOTH shown

**Test 5: Multiple Severity Selection**
- User selects High AND Medium
- API called: `?severity=high&severity=medium`
- Only High and Medium threats shown

**Test 6: Search + Filter Combination**
- User applies severity filter
- User enters search text
- API called: `?severity=critical&search=Apache`
- Results filtered by BOTH criteria

**Test 7: Page Size Handling**
- API returns `page_size: 20`
- Frontend respects pagination
- Shows correct current page info
- Shows total pages correctly

## Mock Data Structure

### ThreatSummary Type

```typescript
interface ThreatSummary {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly severity: Severity; // 'critical' | 'high' | 'medium' | 'low'
  readonly category: ThreatCategory;
  readonly source: string;
  readonly publishedAt: string; // ISO 8601
  readonly cves: readonly string[]; // ['CVE-2024-12345']
  readonly isBookmarked?: boolean;
}
```

### Mock Threats Provided

1. **MOCK_CRITICAL_THREAT** - Apache Struts RCE (2 CVEs)
2. **MOCK_HIGH_THREAT** - Ransomware campaign (bookmarked)
3. **MOCK_MEDIUM_THREAT** - Phishing campaign
4. **MOCK_LOW_THREAT** - Suspicious activity

### Pagination Mock

25 threats total with factory function `createMockThreatsForPagination()`:
- Page 1: Threats 1-20
- Page 2: Threats 21-25
- Mixed severities and categories

## API Endpoints Tested

| Method | Endpoint | Query Params | Response |
|--------|----------|--------------|----------|
| GET | `/api/v1/threats` | `?page`, `?severity[]`, `?category[]`, `?search` | `{ success, data[], total, page, page_size, total_pages }` |
| POST | `/api/v1/threats/{id}/bookmark` | - | `{ success: true }` |

## Test IDs Required in Implementation

When implementing ThreatsPage, ensure these test IDs are added:

```typescript
// Threat Cards
<div data-testid={`threat-card-${threat.id}`}>
<div data-testid={`severity-badge-${severity}`}>
<div data-testid={`threat-cves-${threat.id}`}>
<button data-testid={`bookmark-button-${threat.id}`}>

// Filters & Search
<div data-testid="severity-filter-button">
<div data-testid="category-filter-button">
<input data-testid="threat-search-input">
<button data-testid="search-clear-button">

// States
<div data-testid="threats-loading-state">
<div data-testid="threats-error-state">
<div data-testid="threats-empty-state">
<button data-testid="retry-button">
<button data-testid="clear-filters-button">

// Pagination
<button data-testid="pagination-next-button">
<button data-testid="pagination-prev-button">
<span data-testid="pagination-current-page">
```

## Test Utilities & Setup

### Testing Libraries
- **vitest** - Test runner
- **@testing-library/react** - React component testing
- **@testing-library/user-event** - User interaction simulation
- **msw** (Mock Service Worker) - API mocking

### MSW Handler Pattern

```typescript
server.use(
  http.get('/api/v1/threats', async ({ request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.get('page');
    const severity = url.searchParams.getAll('severity');
    const search = url.searchParams.get('search');

    // Filter mock data based on params
    let results = allThreats;
    if (severity.length) {
      results = results.filter(t => severity.includes(t.severity));
    }
    // ... apply other filters

    return HttpResponse.json({
      success: true,
      data: results,
      total: results.length,
      page: parseInt(page || '1'),
      page_size: 20,
      total_pages: Math.ceil(results.length / 20),
    });
  })
);
```

### Test Wrapper Component

All tests wrap the ThreatsPage in required providers:

```typescript
<BrowserRouter>
  <AuthProvider>
    <QueryClientProvider client={new QueryClient()}>
      <ThreatsPage />
    </QueryClientProvider>
  </AuthProvider>
</BrowserRouter>
```

## Running Tests

### Run all ThreatsPage tests
```bash
npm test tests/integration/ThreatsPage.test.tsx
```

### Run specific test suite
```bash
npm test ThreatsPage -- --reporter=verbose
```

### Run with coverage
```bash
npm test tests/integration/ThreatsPage.test.tsx -- --coverage
```

### Watch mode
```bash
npm test tests/integration/ThreatsPage.test.tsx -- --watch
```

## Implementation Checklist

When implementing ThreatsPage, verify:

- [ ] Page component renders at `/src/pages/ThreatsPage.tsx`
- [ ] Imports `ThreatSummary` and `ThreatFilters` from types
- [ ] Uses TanStack Query for API calls
- [ ] All 30+ test IDs implemented
- [ ] Filters apply correctly (severity, category, search)
- [ ] Pagination works (20 items per page)
- [ ] Navigation to `/threats/{id}` on card click
- [ ] Bookmark toggle calls POST endpoint
- [ ] Error states show error message
- [ ] Retry button calls API again
- [ ] Empty state displays when no results
- [ ] Loading skeleton shown initially
- [ ] Combines multiple filters correctly

## Notes for Implementation

1. **Pagination Reset**: When any filter/search changes, pagination should reset to page 1
2. **CVE Search**: Search can match CVE IDs in the `cves` array
3. **Bookmark Optimization**: Use mutation instead of full refresh
4. **Error Recovery**: Retry button should trigger a new API request
5. **Loading UX**: Use skeleton loaders instead of spinners for better UX
6. **Accessibility**: Ensure filter dropdowns are keyboard accessible
7. **Query Keys**: Use proper TanStack Query keys for caching

## TDD Philosophy

This test suite is written FIRST, before implementation. This ensures:

1. **Tests define the contract** - What the page MUST do
2. **Implementation validates tests** - Code must pass all cases
3. **Regression prevention** - Tests catch future bugs
4. **Behavior documentation** - Tests show how page should work
5. **Confidence in refactoring** - Safe to improve code later

**Expected flow**:
- Write tests (RED - all fail)
- Implement ThreatsPage (GREEN - all pass)
- Refactor if needed (REFACTOR - tests still pass)

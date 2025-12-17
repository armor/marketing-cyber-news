# ThreatsPage Implementation Guide

This guide shows how to implement the `ThreatsPage` component to pass all 26 integration tests.

## Quick Start

The tests are designed to guide your implementation. Follow these patterns:

## 1. Page Structure

```typescript
// src/pages/ThreatsPage.tsx

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ThreatSummary, ThreatFilters, Severity, ThreatCategory } from '@/types/threat';
import { threatService } from '@/services/threatService';

export function ThreatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  // Parse filters from URL params
  const severity = searchParams.getAll('severity') as Severity[];
  const category = searchParams.getAll('category') as ThreatCategory[];
  const search = searchParams.get('search') || '';

  // Fetch threats with filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['threats', page, severity, category, search],
    queryFn: () => threatService.getThreats({ page, severity, category, search }),
  });

  return (
    <div className="threats-page">
      <FilterPanel
        onFilterChange={updateFilters}
        onSearch={updateSearch}
      />

      {isLoading && <div data-testid="threats-loading-state">Loading...</div>}
      {error && (
        <div data-testid="threats-error-state">
          <p>Error: {error.message}</p>
          <button data-testid="retry-button" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}
      {data?.data?.length === 0 && (
        <div data-testid="threats-empty-state">
          <p>No threats found</p>
          <button data-testid="clear-filters-button" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {data?.data && <ThreatList threats={data.data} />}

      {data && <Pagination data={data} onPageChange={setPage} />}
    </div>
  );
}
```

## 2. Filter Panel Component

```typescript
// src/components/FilterPanel.tsx

interface FilterPanelProps {
  onFilterChange: (filters: ThreatFilters) => void;
  onSearch: (query: string) => void;
}

export function FilterPanel({ onFilterChange, onSearch }: FilterPanelProps) {
  const [severity, setSeverity] = useState<Severity[]>([]);
  const [category, setCategory] = useState<ThreatCategory[]>([]);
  const [search, setSearch] = useState('');

  const handleSeverityChange = (newSeverity: Severity[]) => {
    setSeverity(newSeverity);
    onFilterChange({ severity: newSeverity, category });
  };

  const handleCategoryChange = (newCategory: ThreatCategory[]) => {
    setCategory(newCategory);
    onFilterChange({ severity, category: newCategory });
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    onSearch(query);
  };

  return (
    <div className="filter-panel">
      {/* Severity Filter */}
      <div data-testid="severity-filter-button" className="filter-group">
        <label>Severity</label>
        <select
          multiple
          value={severity}
          onChange={(e) =>
            handleSeverityChange(
              Array.from(e.target.selectedOptions).map((o) => o.value as Severity)
            )
          }
        >
          <option role="option" value="critical">
            Critical
          </option>
          <option role="option" value="high">
            High
          </option>
          <option role="option" value="medium">
            Medium
          </option>
          <option role="option" value="low">
            Low
          </option>
        </select>
      </div>

      {/* Category Filter */}
      <div data-testid="category-filter-button" className="filter-group">
        <label>Category</label>
        <select
          multiple
          value={category}
          onChange={(e) =>
            handleCategoryChange(
              Array.from(e.target.selectedOptions).map((o) => o.value as ThreatCategory)
            )
          }
        >
          <option role="option" value="vulnerability">
            Vulnerability
          </option>
          <option role="option" value="ransomware">
            Ransomware
          </option>
          <option role="option" value="phishing">
            Phishing
          </option>
          <option role="option" value="malware">
            Malware
          </option>
        </select>
      </div>

      {/* Search Input */}
      <div className="search-group">
        <input
          data-testid="threat-search-input"
          type="text"
          placeholder="Search threats or CVE ID..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {search && (
          <button
            data-testid="search-clear-button"
            onClick={() => handleSearch('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
```

## 3. Threat List Component

```typescript
// src/components/ThreatList.tsx

interface ThreatListProps {
  threats: ThreatSummary[];
  onNavigate?: (threatId: string) => void;
  onBookmark?: (threatId: string, bookmarked: boolean) => void;
}

export function ThreatList({ threats, onNavigate, onBookmark }: ThreatListProps) {
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});

  const handleCardClick = (threatId: string) => {
    navigate(`/threats/${threatId}`);
  };

  const handleBookmarkClick = async (threatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await threatService.toggleBookmark(threatId);
      setBookmarked((prev) => ({ ...prev, [threatId]: !prev[threatId] }));
      onBookmark?.(threatId, !bookmarked[threatId]);
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  return (
    <div className="threat-list">
      {threats.map((threat) => (
        <div
          key={threat.id}
          data-testid={`threat-card-${threat.id}`}
          className="threat-card"
          onClick={() => handleCardClick(threat.id)}
          role="button"
          tabIndex={0}
        >
          {/* Severity Badge */}
          <div
            data-testid={`severity-badge-${threat.severity}`}
            className={`severity-badge severity-${threat.severity}`}
          >
            {threat.severity.charAt(0).toUpperCase() + threat.severity.slice(1)}
          </div>

          {/* Content */}
          <div className="threat-content">
            <h3>{threat.title}</h3>
            <p className="summary">{threat.summary}</p>

            <div className="threat-meta">
              <span className="source">{threat.source}</span>
              <span className="date">
                {new Date(threat.publishedAt).toLocaleDateString()}
              </span>
            </div>

            {/* CVEs */}
            {threat.cves.length > 0 && (
              <div
                data-testid={`threat-cves-${threat.id}`}
                className="threat-cves"
              >
                {threat.cves.map((cve) => (
                  <span key={cve} className="cve-tag">
                    {cve}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            data-testid={`bookmark-button-${threat.id}`}
            className="bookmark-button"
            aria-pressed={bookmarked[threat.id] || threat.isBookmarked}
            onClick={(e) => handleBookmarkClick(threat.id, e)}
            aria-label={`Bookmark ${threat.title}`}
          >
            {bookmarked[threat.id] || threat.isBookmarked ? '★' : '☆'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

## 4. Pagination Component

```typescript
// src/components/Pagination.tsx

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="pagination">
      <button
        data-testid="pagination-prev-button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>

      <span data-testid="pagination-current-page">
        Page {currentPage} of {totalPages}
      </span>

      <button
        data-testid="pagination-next-button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </div>
  );
}
```

## 5. Threat Service (API Integration)

```typescript
// src/services/threatService.ts

import { ThreatSummary, ThreatFilters, Severity, ThreatCategory } from '@/types/threat';
import { apiClient } from './api';

interface ThreatsResponse {
  success: boolean;
  data: ThreatSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const threatService = {
  async getThreats(filters: {
    page?: number;
    severity?: Severity[];
    category?: ThreatCategory[];
    search?: string;
  }): Promise<ThreatsResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.severity?.length) {
      filters.severity.forEach((s) => params.append('severity', s));
    }
    if (filters.category?.length) {
      filters.category.forEach((c) => params.append('category', c));
    }
    if (filters.search) params.append('search', filters.search);

    const response = await apiClient.get<ThreatsResponse>(
      `/api/v1/threats?${params.toString()}`
    );
    return response.data;
  },

  async toggleBookmark(threatId: string): Promise<void> {
    await apiClient.post(`/api/v1/threats/${threatId}/bookmark`);
  },
};
```

## 6. Key Implementation Details

### Handling Filters

When filters change:
1. Update URL searchParams
2. Reset pagination to page 1
3. Trigger new API call
4. Update TanStack Query key

```typescript
const handleFilterChange = (filters: ThreatFilters) => {
  const params = new URLSearchParams();

  if (filters.severity?.length) {
    filters.severity.forEach((s) => params.append('severity', s));
  }
  if (filters.category?.length) {
    filters.category.forEach((c) => params.append('category', c));
  }
  if (filters.search) {
    params.append('search', filters.search);
  }

  setSearchParams(params);
  setPage(1); // Reset to page 1
};
```

### CVE Search Implementation

CVE IDs follow pattern `CVE-YYYY-XXXXX`. Search should match:
- Full CVE: `CVE-2024-12345`
- Partial: `CVE-2024`
- In threat.cves array

```typescript
const handleSearch = (query: string) => {
  const params = new URLSearchParams();
  if (query) {
    params.append('search', query);
  }
  setSearchParams(params);
  setPage(1);
};
```

### Error Handling with Retry

```typescript
const { data, error, refetch, isLoading } = useQuery({
  queryKey: [...],
  queryFn: () => threatService.getThreats(...),
  retry: false, // Let tests control retry
});

// In error state:
<button onClick={() => refetch()}>Retry</button>
```

### Loading State

Show skeleton loaders instead of spinner:

```typescript
{isLoading && <div data-testid="threats-loading-state">
  <ThreatListSkeleton />
</div>}
```

### Empty State

```typescript
{!isLoading && data?.data?.length === 0 && (
  <div data-testid="threats-empty-state">
    <div className="empty-icon">📋</div>
    <h3>No threats found</h3>
    <p>Try adjusting your filters or search term</p>
    <button data-testid="clear-filters-button" onClick={clearAllFilters}>
      Clear All Filters
    </button>
  </div>
)}
```

## 7. URL Structure Examples

Based on test behavior, these are example URLs:

```
/threats
  ↓ Initial load

/threats?page=2
  ↓ Navigate to page 2

/threats?severity=critical&severity=high
  ↓ Multiple severity filter

/threats?severity=critical&category=vulnerability
  ↓ Combined filters

/threats?search=Apache
  ↓ Text search

/threats?search=CVE-2024-12345
  ↓ CVE search

/threats?page=1&severity=critical&search=RCE
  ↓ All combined
```

## 8. Component Tree

```
ThreatsPage
├── FilterPanel
│   ├── SeverityFilter (dropdown)
│   ├── CategoryFilter (dropdown)
│   └── SearchInput
├── Loading State (skeleton)
├── Error State (with retry)
├── Empty State (with clear filters)
├── ThreatList
│   └── ThreatCard (repeated)
│       ├── SeverityBadge
│       ├── ThreatContent
│       ├── CVEList
│       └── BookmarkButton
└── Pagination
    ├── PreviousButton
    ├── CurrentPageDisplay
    └── NextButton
```

## 9. Testing Your Implementation

Run tests as you implement:

```bash
# Test continuously
npm test tests/integration/ThreatsPage.test.tsx -- --watch

# Run specific test
npm test tests/integration/ThreatsPage.test.tsx -- -t "should filter"

# See which tests fail
npm test tests/integration/ThreatsPage.test.tsx -- --reporter=verbose
```

## 10. Common Pitfalls to Avoid

1. **Not resetting pagination**: Always reset to page 1 when filters change
2. **Not awaiting async operations**: Use proper async/await for API calls
3. **Missing test IDs**: Add all required `data-testid` attributes
4. **Not handling null/undefined**: Check threats array before mapping
5. **Not propagating events correctly**: Use event.stopPropagation() in nested buttons
6. **Using `disabled` vs aria attributes**: Use `aria-pressed` for bookmark state
7. **Not parsing URL params**: Parse searchParams for filter persistence
8. **Race conditions**: Use TanStack Query keys correctly for cache invalidation

## 11. Performance Considerations

- Use React.memo for ThreatCard to avoid unnecessary re-renders
- Debounce search input (300ms) before API call
- Use virtual scrolling for large lists (100+ items)
- Cache pagination data in TanStack Query
- Lazy load threat images

## 12. Accessibility Checklist

- [ ] Threat cards are keyboard navigable (role="button", tabIndex={0})
- [ ] Buttons have aria-label attributes
- [ ] Severity badges have semantic color meaning
- [ ] Filter dropdowns are keyboard accessible
- [ ] Error messages are announced to screen readers
- [ ] Loading state is announced
- [ ] Pagination buttons disabled state is clear

---

**Remember**: Follow the tests, not assumptions. If a test expects certain behavior, implement that behavior exactly as tested.

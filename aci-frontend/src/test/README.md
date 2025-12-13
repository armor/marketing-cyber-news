# Testing Infrastructure for ACI Frontend

This directory contains the testing setup and utilities for the ACI (Armor Cyber Intelligence) frontend React application.

## Overview

The frontend testing infrastructure uses:
- **Vitest**: Fast unit test framework (Vite-native)
- **React Testing Library**: Component testing best practices
- **jsdom**: DOM simulation for browser-like testing environment

## Directory Structure

```
src/test/
├── setup.ts          # Test environment configuration and mocks
├── utils.tsx         # Custom render function with providers
├── mocks.ts          # Mock data factories (based on backend models)
└── README.md         # This file
```

## File Descriptions

### setup.ts
Configures the test environment before running any tests:
- Mocks `localStorage` and `sessionStorage`
- Mocks global `fetch` API
- Mocks `WebSocket` for real-time features
- Suppresses React warnings (optional)

### utils.tsx
Provides a custom render function that wraps components with necessary providers:
- Currently wraps components in a div
- Can be extended to include Router, Theme Provider, Auth Context, etc.

**Usage:**
```typescript
import { render, screen } from '../test/utils';

render(<MyComponent />);
```

### mocks.ts
Comprehensive mock data factory matching ACI backend domain models:

**Type Definitions:**
- `Category` - Article category (vulnerabilities, ransomware, phishing, etc.)
- `Source` - News source (CISA, security blogs, etc.)
- `IOC` - Indicators of Compromise (IPs, domains, hashes, URLs)
- `Article` - Complete article with all metadata and AI enrichment
- `ArmorCTA` - Call-to-action for Armor.com marketing

**Pre-built Fixtures:**
- `mockVulnerabilityCategory`, `mockRansomwareCategory`, `mockPhishingCategory`
- `mockCISASource`, `mockSecurityBlogSource`
- `mockArticleWithCVE`, `mockRansomwareArticle`, `mockPhishingArticle`
- `mockArticles` - Array of all sample articles

**Factory Functions:**
```typescript
// Create random articles/categories/sources with overrides
createMockArticle({ title: 'Custom Title' })
createMockCategory({ color: '#00FF00' })
createMockSource({ is_active: false })

// Create paginated API responses
createMockPaginatedResponse(mockArticles, page=1, pageSize=20)
```

## Test Files

### Components (src/components/)

#### ArticleCard.test.tsx
Tests for the article card display component.

**Coverage:**
- Happy path: Rendering title, summary, category, severity, CVEs, tags
- Edge cases: Missing CVEs, different article types
- Interactions: Click handlers, view counts, bookmarks

#### CategoryFilter.test.tsx
Tests for category selection/filtering component.

**Coverage:**
- Rendering all categories and "All Categories" option
- Selection changes and callback invocation
- Clear filters functionality
- Color coding and icons
- Disabled state

#### SearchBar.test.tsx
Tests for article search with debouncing.

**Coverage:**
- Happy path: Searching, debouncing, form submit
- Edge cases: Empty input, special characters, whitespace trimming
- Debounce behavior: Timer management, multiple rapid inputs
- Advanced search syntax and escaping

#### SeverityBadge.test.tsx
Tests for threat level/severity display component.

**Coverage:**
- All severity levels: critical, high, medium, low, informational
- Color mappings for each severity
- Size variations and custom styling
- Tooltips with descriptions

### Hooks (src/hooks/)

#### useArticles.test.ts
Tests for article fetching and filtering hook.

**Coverage:**
- Happy path: Fetching articles, pagination, filtering
- Error handling: Network errors, error states
- Filtering: By category, severity, search query
- Pagination: Page navigation, total pages
- Caching: Reducing redundant API calls
- Sorting: By published date, custom fields

#### useWebSocket.test.ts
Tests for WebSocket connection management hook.

**Coverage:**
- Connection: Establishing, closing, error handling
- Reconnection: Auto-reconnect, exponential backoff, max attempts
- Messaging: Sending, receiving, queueing
- Subscriptions: Subscribing/unsubscribing to categories
- Keepalive: Ping/pong mechanism
- State: Connection status, error tracking

## Running Tests

### All Tests
```bash
npm test          # Watch mode (default)
npm run test:run  # Run once and exit
```

### With Coverage
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory in multiple formats:
- Text report (console output)
- JSON (for CI/CD integration)
- HTML (open in browser: `coverage/index.html`)

### Specific Tests
```bash
# By filename
npm test ArticleCard

# By pattern
npm test components
npm test hooks
```

### Debug Mode
```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

## Writing Tests

### Basic Component Test
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render title', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Using Mock Data
```typescript
import { mockArticleWithCVE, createMockArticle } from '../test/mocks';

// Pre-built fixture
render(<ArticleCard article={mockArticleWithCVE} />);

// Custom fixture
const customArticle = createMockArticle({
  severity: 'high',
  title: 'Custom Title'
});
render(<ArticleCard article={customArticle} />);
```

### Testing Hooks
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useArticles } from './useArticles';

it('should fetch articles on mount', async () => {
  const { result } = renderHook(() => useArticles());

  expect(result.current.loading).toBe(true);

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.articles).toHaveLength(3);
  });
});
```

## Best Practices

### Do
✅ Test user behavior and outcomes, not implementation details
✅ Use meaningful test descriptions that explain the scenario
✅ Mock external dependencies (API calls, WebSocket, storage)
✅ Test error cases and edge cases
✅ Keep tests independent (no test interdependencies)
✅ Use factory functions for consistent mock data
✅ Test asynchronous behavior with `waitFor`

### Don't
❌ Write tests that always pass (test nothing)
❌ Test React internals or component implementation details
❌ Make real API calls in unit tests
❌ Have tests that depend on execution order
❌ Create overly verbose test descriptions
❌ Mock everything (test actual behavior when possible)

## Common Testing Patterns

### Testing Async Operations
```typescript
it('should handle async operations', async () => {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ data: mockArticles }),
  });

  const { result } = renderHook(() => useArticles());

  await waitFor(() => {
    expect(result.current.articles).toEqual(mockArticles);
  });
});
```

### Testing Error States
```typescript
it('should handle errors gracefully', async () => {
  global.fetch = vi.fn().mockRejectedValueOnce(
    new Error('Network error')
  );

  const { result } = renderHook(() => useArticles());

  await waitFor(() => {
    expect(result.current.error).toBeDefined();
    expect(result.current.articles).toEqual([]);
  });
});
```

### Testing User Interactions
```typescript
it('should respond to user input', () => {
  const handleChange = vi.fn();
  render(<SearchBar onChange={handleChange} />);

  const input = screen.getByPlaceholderText(/search/i);
  fireEvent.change(input, { target: { value: 'apache' } });

  expect(handleChange).toHaveBeenCalledWith('apache');
});
```

### Testing with Fake Timers
```typescript
it('should debounce search', () => {
  vi.useFakeTimers();

  const { result } = renderHook(() => useSearch());

  act(() => {
    result.current.search('test');
  });

  expect(result.current.isSearching).toBe(false);

  vi.advanceTimersByTime(300); // Advance debounce timer

  expect(result.current.isSearching).toBe(true);

  vi.useRealTimers();
});
```

## Integration with Backend

Mock data in `mocks.ts` is designed to match the ACI backend Go domain models:

- **Article**: Matches `internal/domain/article.go`
  - Severity levels: critical, high, medium, low, informational
  - AI enrichment fields: threat_type, attack_vector, iocs, recommendations
  - Armor relevance and CTA fields

- **Category**: Matches `internal/domain/category.go`
  - Color validation: hex codes
  - Slug generation and validation

- **Source**: Matches `internal/domain/source.go`
  - Trust score: 0.0 - 1.0
  - URL validation

When the backend API changes, update the corresponding mock types in `mocks.ts` to keep tests in sync.

## Troubleshooting

### Tests Hanging
Check for missing `vi.useRealTimers()` after `vi.useFakeTimers()`:
```typescript
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
```

### Async Timeout Errors
Use longer timeout for slow operations:
```typescript
await waitFor(
  () => expect(result.current.loaded).toBe(true),
  { timeout: 5000 }
);
```

### Missing Mock Data
Ensure using provided mock factories:
```typescript
// Good
const article = createMockArticle({ title: 'Custom' });

// Avoid
const article = { title: 'Custom' }; // Missing other required fields
```

### WebSocket Tests
Mock WebSocket is available globally:
```typescript
const ws = new WebSocket('ws://test.com');
ws.onopen(); // Trigger open event
```

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [ACI Backend HANDOFF.md](../../aci-backend/HANDOFF.md) - Backend architecture and models
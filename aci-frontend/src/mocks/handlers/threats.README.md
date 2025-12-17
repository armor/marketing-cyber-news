# Threats API Mock Handlers

MSW handlers for threat intelligence endpoints with filtering, pagination, and bookmark management.

## Endpoints

### 1. List Threats (with filtering/pagination)
```typescript
GET /api/v1/threats

Query Parameters:
- page: number (default: 1)
- perPage: number (default: 20, max: 100)
- severity[]: 'critical' | 'high' | 'medium' | 'low' (multiple)
- category[]: ThreatCategory enum values (multiple)
- source[]: string (multiple)
- search: string (searches title and summary)
- startDate: ISO 8601 date string
- endDate: ISO 8601 date string

Response:
{
  success: true,
  data: ThreatSummary[],
  pagination: {
    total: number,
    page: number,
    pageSize: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPreviousPage: boolean
  }
}
```

**Example Usage:**
```typescript
// Basic list
fetch('/api/v1/threats')

// With filters
fetch('/api/v1/threats?severity[]=critical&severity[]=high&page=2&perPage=10')

// With search
fetch('/api/v1/threats?search=ransomware')

// With date range
fetch('/api/v1/threats?startDate=2024-12-01&endDate=2024-12-14')
```

### 2. Get Threat Detail
```typescript
GET /api/v1/threats/:id

Path Parameters:
- id: string (threat UUID, e.g., 'threat-001')

Response (Success):
{
  success: true,
  data: Threat
}

Response (Not Found):
{
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: string
  }
}
```

**Example Usage:**
```typescript
fetch('/api/v1/threats/threat-001')
```

### 3. Add Bookmark
```typescript
POST /api/v1/threats/:id/bookmark

Path Parameters:
- id: string (threat UUID)

Response (Success):
{
  success: true,
  data: { bookmarked: true }
}

Response (Already Bookmarked):
{
  success: false,
  error: {
    code: 'ALREADY_BOOKMARKED',
    message: string
  }
}
```

**Example Usage:**
```typescript
fetch('/api/v1/threats/threat-001/bookmark', { method: 'POST' })
```

### 4. Remove Bookmark
```typescript
DELETE /api/v1/threats/:id/bookmark

Path Parameters:
- id: string (threat UUID)

Response (Success):
{
  success: true,
  data: { bookmarked: false }
}

Response (Not Bookmarked):
{
  success: false,
  error: {
    code: 'NOT_BOOKMARKED',
    message: string
  }
}
```

**Example Usage:**
```typescript
fetch('/api/v1/threats/threat-001/bookmark', { method: 'DELETE' })
```

## Mock Data

### Fixtures
- **60 mock threats** generated with variety of:
  - Severities: critical, high, medium, low
  - Categories: malware, phishing, ransomware, data_breach, vulnerability, APT, DDoS, insider_threat, supply_chain, zero_day
  - Sources: NVD, CISA, CVE Details, Proofpoint, SecurityWeek, BleepingComputer, ThreatPost, ZDI
  - CVEs: Some threats have associated CVEs, others don't
  - Dates: Spread across multiple days for realistic timeline

### Functions
```typescript
// Get all mock threats
import { mockThreats } from './fixtures/threats';

// Get single threat by ID
import { getMockThreatById } from './fixtures/threats';
const threat = getMockThreatById('threat-001');

// Filter threats programmatically
import { filterThreats } from './fixtures/threats';
const filtered = filterThreats({
  severity: ['critical', 'high'],
  category: [ThreatCategory.RANSOMWARE],
  search: 'lockbit'
});
```

## Testing

### Enable MSW in Development
1. Create `.env.local`:
   ```
   VITE_ENABLE_MSW=true
   ```

2. Import in `main.tsx` (already configured):
   ```typescript
   if (import.meta.env.VITE_ENABLE_MSW === 'true') {
     const { worker } = await import('./mocks/browser');
     await worker.start({ onUnhandledRequest: 'bypass' });
   }
   ```

### Test Scenarios
- Pagination: 60 threats provide 3 pages at default size (20)
- Empty results: Filter with no matches
- Bookmark flow: Add/remove bookmarks persists across requests
- Date filtering: Filter by date range
- Search: Case-insensitive title/summary search
- Error states: Invalid IDs return 404, duplicate operations return 409

## Architecture

### Bookmark State Management
Bookmarks are managed in-memory using a `Set<string>`:
- Initial bookmarks loaded from fixture `isBookmarked` flag
- POST/DELETE operations update the set
- GET operations check set for current state
- State persists for session (resets on page reload)

### Filtering Logic
Filters are applied sequentially:
1. Severity filter (OR within severity values)
2. Category filter (OR within category values)
3. Source filter (OR within source values)
4. Search filter (AND - matches title OR summary)
5. Date range filter (AND - within start/end dates)

All filters are combined with AND logic (intersection).

### Pagination Logic
Standard offset-based pagination:
- `start = (page - 1) * pageSize`
- `end = start + pageSize`
- Returns slice of filtered results
- Calculates metadata (totalPages, hasNextPage, etc.)

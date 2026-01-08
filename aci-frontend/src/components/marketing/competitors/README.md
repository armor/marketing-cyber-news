# Competitor Monitoring Components

Frontend components for tracking and analyzing competitor content activity (Phase 10, User Story 7, Tasks T183-T186).

## Components Overview

### Core Components

#### `CompetitorMonitor.tsx`
Main dashboard component that orchestrates all competitor monitoring features:
- Combines competitor list, alerts, content feed, and insights
- Manages tab navigation between different views
- Handles state for selected competitor
- Integrates all mutation operations (add, remove, refresh, mark as read)

**Usage:**
```tsx
<CompetitorMonitor campaignId="campaign-uuid" />
```

#### `CompetitorList.tsx`
Grid display of tracked competitors with management actions:
- Responsive grid layout (auto-fill, min 320px cards)
- Add competitor dialog
- Empty state when no competitors
- Loading state

**Props:**
- `campaignId` - Campaign ID
- `competitors` - Array of competitor profiles
- `isLoading` - Loading state
- `onAdd` - Add competitor callback
- `onRefresh` - Refresh competitor callback
- `onRemove` - Remove competitor callback
- `onViewDetails` - View details callback
- `isAddingLoading` - Add mutation loading state

#### `CompetitorCard.tsx`
Individual competitor card displaying profile and stats:
- Competitor name and status badge
- Tracked channels (LinkedIn, Twitter, Blog, Website)
- Content count and posting frequency
- Last checked timestamp
- Action buttons (refresh, remove)

**Props:**
- `competitor` - Competitor profile data
- `onRefresh` - Refresh callback (optional)
- `onRemove` - Remove callback (optional)
- `onViewDetails` - View details callback (optional)

#### `AddCompetitorDialog.tsx`
Modal form for adding new competitor:
- Competitor name (required)
- LinkedIn URL (optional, validated)
- Twitter handle (optional)
- Blog URL (optional, validated)
- Website URL (optional, validated)
- Client-side validation with error messages

**Props:**
- `campaignId` - Campaign ID
- `onAdd` - Add callback
- `isLoading` - Mutation loading state (optional)

**Validation:**
- Name: Required, non-empty
- URLs: Must start with http:// or https://
- Form resets on successful submission
- Accessible error messages with `role="alert"`

#### `CompetitorContentFeed.tsx`
Timeline of recent content from competitor:
- Chronological content list
- Channel badges with color coding
- Published date
- Content title and summary
- Engagement metrics (likes, comments, shares)
- External link to original content

**Props:**
- `content` - Array of competitor content items
- `isLoading` - Loading state (optional)

**Features:**
- Empty state when no content
- Loading state
- Channel-specific color coding
- Engagement icons (ThumbsUp, MessageCircle, Share2)

#### `CompetitorAlerts.tsx`
Real-time alerts from competitor monitoring:
- Alert types: new_content, high_engagement, topic_match, frequency_change
- Unread count badge
- Alert type icons and labels
- Timestamp
- Mark as read functionality
- Visual distinction for unread alerts

**Props:**
- `alerts` - Array of competitor alerts
- `isLoading` - Loading state (optional)
- `onMarkRead` - Mark as read callback (optional)

**Alert Types:**
- `new_content` - Bell icon - New content published
- `high_engagement` - TrendingUp icon - High engagement detected
- `topic_match` - Hash icon - Topic match with campaign
- `frequency_change` - Calendar icon - Posting frequency changed

#### `CompetitorInsights.tsx`
Analysis and insights for competitor:
- Total content count
- Average posting frequency (posts/week)
- Top topics with counts
- Best posting times
- Best posting days

**Props:**
- `analysis` - Competitor analysis data (optional)
- `isLoading` - Loading state (optional)

**Features:**
- Stats grid (2 columns)
- Topic badges (top 10)
- Posting schedule recommendations
- Empty state when no analysis available

### Page Component

#### `CompetitorMonitorPage.tsx`
Route page wrapper for competitor monitoring:
- Extracts `campaignId` from route params
- Renders `CompetitorMonitor` component
- Error state when campaign ID missing

**Route:** `/campaigns/:campaignId/competitors`

## Types

All TypeScript types are defined in `/src/types/marketing.ts`:

### Extended Types
```typescript
interface CompetitorProfile extends Competitor {
  last_checked_at?: string;
  content_count: number;
  avg_posting_frequency?: number;
  status: 'active' | 'inactive' | 'error';
}

interface CompetitorContent {
  id: string;
  competitor_id: string;
  channel: ChannelType;
  title: string;
  url: string;
  published_at: string;
  summary?: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
  created_at: string;
}

interface CompetitorAnalysis {
  competitor_id: string;
  content_count: number;
  avg_posting_frequency: number;
  top_topics: Array<{ topic: string; count: number }>;
  posting_schedule?: {
    best_times: string[];
    best_days: string[];
  };
}

type CompetitorAlertType = 'new_content' | 'high_engagement' | 'topic_match' | 'frequency_change';

interface CompetitorAlert {
  id: string;
  competitor_id: string;
  alert_type: CompetitorAlertType;
  content_id?: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface AddCompetitorRequest {
  campaign_id: string;
  name: string;
  linkedin_url?: string;
  twitter_handle?: string;
  blog_url?: string;
  website_url?: string;
}

interface CompetitorContentFilters {
  channel?: ChannelType;
  start_date?: string;
  end_date?: string;
  limit?: number;
}
```

## API Functions

All API functions are in `/src/services/api/marketing.ts`:

### Competitor Management
```typescript
getCompetitors(campaignId: string): Promise<CompetitorProfile[]>
addCompetitor(req: AddCompetitorRequest): Promise<CompetitorProfile>
removeCompetitor(campaignId: string, competitorId: string): Promise<void>
triggerCompetitorFetch(campaignId: string, competitorId: string): Promise<void>
```

### Content & Analysis
```typescript
getCompetitorContent(
  campaignId: string,
  competitorId: string,
  filters?: CompetitorContentFilters
): Promise<CompetitorContent[]>

getCompetitorAnalysis(
  campaignId: string,
  competitorId: string
): Promise<CompetitorAnalysis>
```

### Alerts
```typescript
getCompetitorAlerts(campaignId: string): Promise<CompetitorAlert[]>
markAlertRead(campaignId: string, alertId: string): Promise<void>
```

## Hooks

Custom hooks in `/src/hooks/useCompetitors.ts`:

### Query Hooks
```typescript
useCompetitors(campaignId: string | undefined)
useCompetitorContent(
  campaignId: string | undefined,
  competitorId: string | undefined,
  filters?: CompetitorContentFilters
)
useCompetitorAnalysis(
  campaignId: string | undefined,
  competitorId: string | undefined
)
useCompetitorAlerts(campaignId: string | undefined)
```

### Mutation Hook
```typescript
useCompetitorMutations(campaignId: string) => {
  addMutation,
  removeMutation,
  fetchMutation,
  markReadMutation
}
```

**Features:**
- TanStack Query integration
- Automatic cache invalidation
- Optimistic updates where appropriate
- Stale time configuration:
  - Competitors: 5 minutes
  - Content: 3 minutes
  - Analysis: 10 minutes
  - Alerts: 1 minute

## Design Token Usage

All components follow the design token standards:

### Colors
- `--color-text-primary` - Primary text
- `--color-text-secondary` - Secondary text
- `--color-text-muted` - Muted text
- `--color-surface-secondary` - Secondary background
- `--color-border-default` - Default borders
- `--color-brand-primary` - Brand primary color
- `--color-success`, `--color-error`, `--color-warning`, `--color-info` - Status colors

### Spacing
- `--spacing-1` through `--spacing-12` - Consistent spacing scale
- No hardcoded pixel values

### Typography
- `--font-size-xs` through `--font-size-3xl` - Font size scale
- `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold` - Font weights

### Motion
- `--motion-duration-normal` - Standard transitions
- `--motion-ease-default` - Default easing

### Borders
- `--border-width-thin` - Standard border width
- `--border-radius-md`, `--border-radius-full` - Border radius values

## Accessibility

All components follow WCAG 2.1 AA standards:

### Keyboard Navigation
- All interactive elements focusable
- Tab order follows visual flow
- Focus indicators visible

### Screen Readers
- Semantic HTML elements
- ARIA labels where needed
- `role="alert"` for validation errors
- Descriptive button titles

### Form Validation
- Error messages associated with inputs via `aria-describedby`
- `aria-invalid` attribute on invalid inputs
- Error messages visible and descriptive

### Color Contrast
- Text meets 4.5:1 contrast ratio
- Icons and UI elements meet 3:1 contrast ratio

## Testing Requirements

Per the Deep E2E Testing standards, tests must verify:

### 1. Network Verification
```typescript
// Verify API call made
const response = await Promise.all([
  page.waitForResponse(r =>
    r.url().includes('/api/campaigns/123/competitors') &&
    r.request().method() === 'POST'
  ),
  addButton.click()
]);
expect(response[0].status()).toBe(200);
```

### 2. Persistence Verification
```typescript
// Verify data survives reload
await page.reload();
await expect(page.getByText('New Competitor Name')).toBeVisible();
```

### 3. Validation Testing
```typescript
// Verify validation blocks API call
let apiCalled = false;
page.on('request', r => {
  if (r.url().includes('/api/')) apiCalled = true;
});
await submitButton.click(); // With empty name
expect(apiCalled).toBe(false);
await expect(page.locator('[role="alert"]')).toBeVisible();
```

### 4. Console Error Capture
```typescript
const consoleErrors: string[] = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
// ... run tests ...
expect(consoleErrors).toHaveLength(0);
```

### 5. Test Completion Checklist
Before marking feature complete:
- [ ] API Intercepted: `waitForResponse()` captured requests
- [ ] Status Verified: Response status is 200/201
- [ ] Persistence Proven: Data visible after `page.reload()`
- [ ] Validation Tested: Invalid submission makes NO API call
- [ ] Errors Captured: Console errors array is empty
- [ ] Network Clean: No 4xx/5xx responses
- [ ] Screenshots Taken: Visual proof of each state

## Integration

### Route Setup
Route added to `/src/App.tsx`:
```tsx
<Route
  path="/campaigns/:campaignId/competitors"
  element={
    <ProtectedRoute>
      <MainLayout>
        <CompetitorMonitorPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

### Navigation
Access from campaign detail page:
```tsx
<Button asChild>
  <Link to={`/campaigns/${campaignId}/competitors`}>
    View Competitor Monitoring
  </Link>
</Button>
```

## Backend API Expectations

Components expect the following backend endpoints:

### Competitors
- `GET /api/v1/campaigns/:campaignId/competitors` - List competitors
- `POST /api/v1/campaigns/:campaignId/competitors` - Add competitor
- `DELETE /api/v1/campaigns/:campaignId/competitors/:competitorId` - Remove competitor
- `POST /api/v1/campaigns/:campaignId/competitors/:competitorId/fetch` - Trigger manual fetch

### Content & Analysis
- `GET /api/v1/campaigns/:campaignId/competitors/:competitorId/content` - Get content
  - Query params: `channel`, `start_date`, `end_date`, `limit`
- `GET /api/v1/campaigns/:campaignId/competitors/:competitorId/analysis` - Get analysis

### Alerts
- `GET /api/v1/campaigns/:campaignId/alerts` - Get alerts
- `PUT /api/v1/campaigns/:campaignId/alerts/:alertId/read` - Mark as read

## Future Enhancements

Potential improvements:
1. Bulk competitor import (CSV upload)
2. Competitor content comparison view
3. Export competitor data (PDF/CSV)
4. Advanced filtering (date range, channels)
5. Real-time WebSocket updates for new content
6. Competitor performance benchmarking
7. Automated competitor discovery suggestions
8. Content sentiment analysis
9. Competitive gap analysis
10. Custom alert rules configuration

## Related Files

- Types: `/src/types/marketing.ts`
- API: `/src/services/api/marketing.ts`
- Hooks: `/src/hooks/useCompetitors.ts`
- Query Keys: `/src/hooks/marketingKeys.ts`
- Route: `/src/App.tsx`
- Page: `/src/pages/CompetitorMonitorPage.tsx`

## Dependencies

- React 19.2
- TanStack Query v5
- react-router-dom v7
- shadcn/ui components
- lucide-react icons

## Performance Considerations

- Lazy loading of page component
- TanStack Query caching with stale time
- Optimistic updates for mutations
- Virtualization recommended for large content lists (future)
- Image lazy loading in content feed (future)

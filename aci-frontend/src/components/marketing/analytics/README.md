# Marketing Analytics Components

Campaign analytics dashboard components for Phase 9, User Story 6 (T170-T176).

## Components

### AnalyticsDashboard
Main orchestrator component that combines all analytics sub-components.

**Features:**
- Time range filtering (7d, 30d, 90d)
- Campaign-specific analytics (via campaignId prop)
- Auto-refresh every 30 seconds
- Error handling for all data fetches

**Props:**
- `campaignId?: string` - Optional campaign ID for campaign-specific analytics

**Usage:**
```tsx
<AnalyticsDashboard campaignId="campaign-123" />
```

### PerformanceOverview
Key metrics cards showing high-level campaign performance.

**Displays:**
- Total impressions
- Engagement rate
- Click-through rate
- Conversions

**Props:**
- `analytics: CampaignAnalytics`
- `isLoading?: boolean`

### EngagementChart
Time-series line chart showing engagement trends over time.

**Displays:**
- Impressions over time
- Engagement over time
- Posts published

**Props:**
- `data: TrendData[]`
- `isLoading?: boolean`

**Note:** Currently uses simple SVG rendering. For production, consider using a library like Recharts or Chart.js.

### ChannelBreakdown
Per-channel performance breakdown with visual indicators.

**Displays:**
- Channel name and icon
- Posts published
- Impressions
- Engagement rate
- Visual progress bars

**Props:**
- `channels: ChannelPerformance[]`
- `isLoading?: boolean`

### TopContentTable
Table of best-performing content sorted by engagement rate.

**Displays:**
- Content title
- Channel badge
- Views, clicks, engagement metrics
- Published date

**Props:**
- `content: ContentMetrics[]`
- `isLoading?: boolean`
- `limit?: number` - Maximum number of rows (default: 10)

### AudienceInsights
Audience demographics and growth by channel.

**Displays:**
- Follower counts
- Growth rates
- Top demographics (age, location, industry)

**Props:**
- `audience: AudienceData[]`
- `isLoading?: boolean`

## Hooks

### useMarketingAnalytics.ts

**Available Hooks:**

1. `useCampaignAnalytics(campaignId: string)`
   - Fetches campaign-specific analytics
   - Refreshes every 30 seconds

2. `useChannelPerformance()`
   - Fetches overall channel performance metrics

3. `useContentPerformance(filters?: AnalyticsFilters)`
   - Fetches content performance with optional filters
   - Filters: channels, start_date, end_date, content_style

4. `useEngagementTrends(timeRange: TimeRange)`
   - Fetches engagement trends over time
   - TimeRange: { start, end, period }

5. `useAudienceGrowth()`
   - Fetches audience growth data by channel

**Query Keys:**
```ts
analyticsKeys.all                    // ['marketing', 'analytics']
analyticsKeys.campaign(campaignId)   // ['marketing', 'analytics', 'campaign', id]
analyticsKeys.channels()             // ['marketing', 'analytics', 'channels']
analyticsKeys.content(filters)       // ['marketing', 'analytics', 'content', filters]
analyticsKeys.trends(timeRange)      // ['marketing', 'analytics', 'trends', timeRange]
analyticsKeys.audience()             // ['marketing', 'analytics', 'audience']
```

## API Functions

Located in `src/services/api/marketing.ts`:

- `getCampaignAnalytics(campaignId: string)`
- `getChannelPerformance()`
- `getContentPerformance(filters?: AnalyticsFilters)`
- `getEngagementTrends(timeRange: TimeRange)`
- `getAudienceGrowth()`

## Types

Located in `src/types/marketing.ts`:

```ts
interface CampaignAnalytics {
  campaign_id: string;
  impressions: number;
  engagement: number;
  clicks: number;
  conversions: number;
  by_channel: Record<ChannelType, ChannelMetrics>;
  top_content: ContentMetrics[];
  trend_data: TrendData[];
}

interface ChannelPerformance {
  channel: ChannelType;
  posts: number;
  impressions: number;
  engagement_rate: number;
  top_content: ContentMetrics[];
}

interface ContentMetrics {
  content_id: string;
  title: string;
  channel: ChannelType;
  views: number;
  clicks: number;
  shares: number;
  comments: number;
  engagement_rate: number;
  published_at: string;
}

interface TrendData {
  date: string;
  impressions: number;
  engagement: number;
  posts_published: number;
}

interface AudienceData {
  channel: ChannelType;
  followers: number;
  growth_rate: number;
  demographics: {
    age_groups: Record<string, number>;
    locations: Record<string, number>;
    industries: Record<string, number>;
  };
}
```

## Styling

All components use CSS custom properties (design tokens) from `src/styles/variables.css`:

- Colors: `var(--color-*)`
- Spacing: `var(--spacing-*)`
- Typography: `var(--font-*)`
- Motion: `var(--motion-duration-*)`, `var(--motion-ease-*)`
- Borders: `var(--border-radius-*)`

**No hardcoded values are used** - all styling follows the design token standard.

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- Color contrast ratios meet WCAG AA standards
- Keyboard navigation support
- Hover/focus states for interactive elements

## Performance

- Components use React.memo where beneficial
- Loading states prevent layout shift
- Data is cached via TanStack Query
- Stale time: 5 minutes for most queries
- Auto-refresh: 30 seconds for campaign analytics

## Testing

To test these components, you'll need:

1. Backend implementing the analytics endpoints
2. Mock data following the TypeScript interfaces
3. E2E tests verifying:
   - Data loads correctly
   - Filters work
   - Charts render
   - Time range selection updates data
   - Error states display properly

## Future Enhancements

- [ ] Export analytics to CSV/PDF
- [ ] Custom date range picker
- [ ] Real-time WebSocket updates
- [ ] Advanced filtering (multiple campaigns, custom metrics)
- [ ] Comparison mode (compare two time periods)
- [ ] Customizable dashboard layouts
- [ ] Chart library integration (Recharts/Chart.js)
- [ ] Drill-down views for detailed analysis

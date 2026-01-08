/**
 * AnalyticsDashboard.tsx - Main Analytics Dashboard Component
 *
 * Orchestrates all analytics sub-components:
 * - Performance overview cards
 * - Engagement trends chart
 * - Channel breakdown
 * - Top content table
 * - Audience insights
 *
 * Supports filtering by time range and campaign.
 */

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PerformanceOverview } from './PerformanceOverview';
import { EngagementChart } from './EngagementChart';
import { ChannelBreakdown } from './ChannelBreakdown';
import { TopContentTable } from './TopContentTable';
import { AudienceInsights } from './AudienceInsights';
import {
  useCampaignAnalytics,
  useChannelPerformance,
  useContentPerformance,
  useEngagementTrends,
  useAudienceGrowth,
} from '@/hooks/useMarketingAnalytics';
import type { TimeRange } from '@/types/marketing';

interface AnalyticsDashboardProps {
  campaignId?: string;
}

/**
 * Calculate time range based on period
 */
function getTimeRange(period: TimeRange['period']): TimeRange {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    period,
  };
}

const TIME_PERIOD_OPTIONS: Array<{ label: string; value: TimeRange['period'] }> = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
];

export function AnalyticsDashboard({ campaignId }: AnalyticsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimeRange['period']>('30d');
  const timeRange = getTimeRange(selectedPeriod);

  // Fetch analytics data
  const campaignAnalytics = useCampaignAnalytics(campaignId || '');
  const channelPerformance = useChannelPerformance();
  const contentPerformance = useContentPerformance();
  const engagementTrends = useEngagementTrends(timeRange);
  const audienceGrowth = useAudienceGrowth();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
      }}
    >
      {/* Header with time range selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-xs)',
            }}
          >
            Campaign Analytics
          </h1>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Performance metrics and insights for your marketing campaigns
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {TIME_PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={selectedPeriod === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(option.value)}
              style={{
                transition: 'all var(--motion-duration-fast) var(--motion-ease-default)',
              }}
            >
              <Calendar style={{ width: '14px', height: '14px', marginRight: 'var(--spacing-xs)' }} />
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Performance overview cards */}
      {campaignId && campaignAnalytics.data && (
        <PerformanceOverview
          analytics={campaignAnalytics.data}
          isLoading={campaignAnalytics.isLoading}
        />
      )}

      {/* Engagement trends chart */}
      <EngagementChart
        data={engagementTrends.data || []}
        isLoading={engagementTrends.isLoading}
      />

      {/* Two-column layout for channel breakdown and audience insights */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 'var(--spacing-lg)',
        }}
      >
        <ChannelBreakdown
          channels={channelPerformance.data || []}
          isLoading={channelPerformance.isLoading}
        />

        <AudienceInsights
          audience={audienceGrowth.data || []}
          isLoading={audienceGrowth.isLoading}
        />
      </div>

      {/* Top content table */}
      <TopContentTable
        content={contentPerformance.data || []}
        isLoading={contentPerformance.isLoading}
        limit={10}
      />

      {/* Error states */}
      {(campaignAnalytics.error ||
        channelPerformance.error ||
        contentPerformance.error ||
        engagementTrends.error ||
        audienceGrowth.error) && (
        <div
          style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--color-semantic-error)',
            color: 'white',
            borderRadius: 'var(--border-radius-md)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontWeight: 'var(--font-weight-semibold)' }}>
            Error loading analytics data
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-xs)' }}>
            {campaignAnalytics.error?.message ||
              channelPerformance.error?.message ||
              contentPerformance.error?.message ||
              engagementTrends.error?.message ||
              audienceGrowth.error?.message}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * SegmentMetrics Component
 *
 * Displays segment-specific analytics including performance metrics,
 * engagement trends, and top content for a selected audience segment.
 * Implements SC-016 compliance for segment analytics.
 */

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSegmentAnalytics } from '@/hooks/useNewsletterAnalytics';
import { useSegments } from '@/hooks/useSegments';
import { spacing } from '@/styles/tokens/spacing';
import type { DateRangeParams } from '@/hooks/useNewsletterAnalytics';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for SegmentMetrics component
 */
export interface SegmentMetricsProps {
  readonly dateRange?: DateRangeParams;
  readonly defaultSegmentId?: string;
  readonly className?: string;
}

/**
 * Segment KPI data
 */
interface SegmentKPI {
  readonly label: string;
  readonly value: number;
  readonly format: 'percentage' | 'number';
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Props for SegmentKPICard component
 */
interface SegmentKPICardProps {
  readonly kpi: SegmentKPI;
}

/**
 * Individual segment KPI card
 */
const SegmentKPICard: React.FC<SegmentKPICardProps> = ({ kpi }) => {
  const formattedValue = useMemo(() => {
    if (kpi.format === 'percentage') {
      return `${kpi.value.toFixed(1)}%`;
    }
    return kpi.value.toLocaleString();
  }, [kpi]);

  return (
    <Card data-testid={`segment-kpi-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader>
        <CardDescription>{kpi.label}</CardDescription>
        <CardTitle
          style={{
            fontSize: 'var(--typography-font-size-2xl)',
            fontWeight: 'var(--typography-font-weight-bold)',
          }}
        >
          {formattedValue}
        </CardTitle>
      </CardHeader>
    </Card>
  );
};

/**
 * Props for EngagementTrendChart component
 */
interface EngagementTrendChartProps {
  readonly data: readonly {
    readonly date: string;
    readonly avg_engagement_score: number;
  }[];
}

/**
 * Segment engagement trend chart
 */
const EngagementTrendChart: React.FC<EngagementTrendChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      engagement: item.avg_engagement_score,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <EmptyState
        title="No trend data available"
        description="Send newsletters to this segment to see engagement trends"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border-default)"
        />
        <XAxis
          dataKey="date"
          stroke="var(--color-text-secondary)"
          style={{ fontSize: 'var(--typography-font-size-xs)' }}
        />
        <YAxis
          stroke="var(--color-text-secondary)"
          style={{ fontSize: 'var(--typography-font-size-xs)' }}
          label={{
            value: 'Engagement Score',
            angle: -90,
            position: 'insideLeft',
            style: { fill: 'var(--color-text-secondary)' },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--border-radius-md)',
          }}
        />
        <Line
          type="monotone"
          dataKey="engagement"
          name="Engagement Score"
          stroke="var(--color-accent-armorBlue)"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Props for TopContentList component
 */
interface TopContentListProps {
  readonly topics: readonly {
    readonly topic: string;
    readonly clicks: number;
  }[];
}

/**
 * List of top performing content topics
 */
const TopContentList: React.FC<TopContentListProps> = ({ topics }) => {
  if (topics.length === 0) {
    return (
      <EmptyState
        title="No content data"
        description="Send newsletters to see top performing topics"
      />
    );
  }

  const maxClicks = Math.max(...topics.map((t) => t.clicks));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[3],
      }}
      data-testid="top-content-list"
    >
      {topics.map((topic, index) => {
        const percentage = maxClicks > 0 ? (topic.clicks / maxClicks) * 100 : 0;

        return (
          <div
            key={topic.topic}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing[1],
            }}
            data-testid={`topic-item-${index}`}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {topic.topic}
              </span>
              <span
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {topic.clicks.toLocaleString()} clicks
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 'var(--spacing-1)',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--border-radius-full)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${percentage}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-accent-armorBlue)',
                  borderRadius: 'var(--border-radius-full)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * SegmentMetrics Component
 *
 * Displays comprehensive analytics for a selected audience segment.
 * Includes segment selector, KPI cards, engagement trend, and top topics.
 *
 * @example
 * ```tsx
 * <SegmentMetrics
 *   dateRange={{ dateFrom: '2024-01-01', dateTo: '2024-12-31' }}
 *   defaultSegmentId="segment-123"
 * />
 * ```
 */
export const SegmentMetrics: React.FC<SegmentMetricsProps> = ({
  dateRange,
  defaultSegmentId,
  className,
}) => {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(
    defaultSegmentId ?? ''
  );

  const { data: segmentsData, isLoading: isLoadingSegments } = useSegments({
    isActive: true,
  });

  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    isError,
    error,
  } = useSegmentAnalytics(selectedSegmentId, dateRange);

  const segments = segmentsData?.data ?? [];

  const kpiData = useMemo((): readonly SegmentKPI[] => {
    if (!analytics) return [];

    return [
      {
        label: 'Total Contacts',
        value: analytics.total_contacts,
        format: 'number',
      },
      {
        label: 'Subscribed',
        value: analytics.subscribed_contacts,
        format: 'number',
      },
      {
        label: 'Avg Open Rate',
        value: analytics.avg_open_rate,
        format: 'percentage',
      },
      {
        label: 'Avg Click Rate',
        value: analytics.avg_click_rate,
        format: 'percentage',
      },
      {
        label: 'Avg Engagement',
        value: analytics.avg_engagement_score,
        format: 'number',
      },
      {
        label: 'Churn Rate',
        value: analytics.churn_rate,
        format: 'percentage',
      },
    ];
  }, [analytics]);

  const handleSegmentChange = (segmentId: string): void => {
    setSelectedSegmentId(segmentId);
  };

  if (isLoadingSegments) {
    return <LoadingSpinner />;
  }

  if (segments.length === 0) {
    return (
      <EmptyState
        title="No segments available"
        description="Create audience segments to view segment-specific analytics"
      />
    );
  }

  return (
    <div className={className} data-testid="segment-metrics">
      {/* Segment Selector */}
      <div
        style={{
          marginBottom: spacing[6],
        }}
      >
        <label
          htmlFor="segment-selector"
          style={{
            display: 'block',
            fontSize: 'var(--typography-font-size-sm)',
            fontWeight: 'var(--typography-font-weight-medium)',
            color: 'var(--color-text-primary)',
            marginBottom: spacing[2],
          }}
        >
          Select Segment
        </label>
        <Select
          value={selectedSegmentId}
          onValueChange={handleSegmentChange}
        >
          <SelectTrigger
            id="segment-selector"
            data-testid="segment-selector"
          >
            <SelectValue placeholder="Choose a segment..." />
          </SelectTrigger>
          <SelectContent>
            {segments.map((segment) => (
              <SelectItem key={segment.id} value={segment.id}>
                {segment.name} ({segment.contact_count} contacts)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Area */}
      {!selectedSegmentId && (
        <EmptyState
          title="Select a segment"
          description="Choose a segment from the dropdown to view its analytics"
        />
      )}

      {selectedSegmentId && isLoadingAnalytics && <LoadingSpinner />}

      {selectedSegmentId && isError && (
        <EmptyState
          title="Error loading analytics"
          description={error?.message ?? 'Failed to load segment analytics'}
        />
      )}

      {selectedSegmentId && analytics && (
        <>
          {/* KPI Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: spacing[4],
              marginBottom: spacing[6],
            }}
            data-testid="segment-kpi-grid"
          >
            {kpiData.map((kpi) => (
              <SegmentKPICard key={kpi.label} kpi={kpi} />
            ))}
          </div>

          {/* Engagement Trend */}
          <Card style={{ marginBottom: spacing[6] }}>
            <CardHeader>
              <CardTitle>Engagement Trend</CardTitle>
              <CardDescription>
                Average engagement score over time for {analytics.segment_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EngagementTrendChart data={analytics.engagement_trend} />
            </CardContent>
          </Card>

          {/* Top Topics */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Topics</CardTitle>
              <CardDescription>
                Most clicked content topics for this segment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TopContentList topics={analytics.top_topics} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

SegmentMetrics.displayName = 'SegmentMetrics';

export default SegmentMetrics;

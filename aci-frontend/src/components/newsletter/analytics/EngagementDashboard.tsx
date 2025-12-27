/**
 * EngagementDashboard Component
 *
 * Comprehensive analytics dashboard displaying newsletter engagement metrics.
 * Shows KPI summary cards, trend charts, and performance indicators.
 * Implements SC-001 through SC-006 compliance for newsletter analytics.
 */

import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAnalyticsOverview } from '@/hooks/useNewsletterAnalytics';
import { spacing } from '@/styles/tokens/spacing';
import type { DateRangeParams } from '@/hooks/useNewsletterAnalytics';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for EngagementDashboard component
 */
export interface EngagementDashboardProps {
  readonly dateRange?: DateRangeParams;
  readonly onDateRangeChange?: (range: DateRangeParams) => void;
  readonly className?: string;
}

/**
 * KPI summary data
 */
interface KPISummary {
  readonly label: string;
  readonly value: number;
  readonly target: number;
  readonly targetMin: number;
  readonly targetMax: number;
  readonly unit: string;
  readonly format: 'percentage' | 'number';
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Target ranges per SC-001 through SC-006
 */
const KPI_TARGETS = {
  OPEN_RATE: { min: 30, max: 40, target: 35 }, // SC-001
  CLICK_RATE: { min: 3, max: 7, target: 5 }, // SC-002
  CTOR: { min: 15, max: 25, target: 20 }, // SC-003
  UNSUBSCRIBE_RATE: { min: 0, max: 0.5, target: 0.3 }, // SC-004
  BOUNCE_RATE: { min: 0, max: 2, target: 1 }, // SC-005
  // SC-006: A/B test threshold handled separately
} as const;

/**
 * Preset date ranges
 */
const DATE_RANGES = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'Year to Date', value: 'ytd' },
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate KPI status based on target range
 */
function getKPIStatus(
  value: number,
  min: number,
  max: number
): 'success' | 'warning' | 'danger' {
  if (value >= min && value <= max) {
    return 'success';
  }

  const threshold = (max - min) * 0.1;
  const minDistance = Math.abs(value - min);
  const maxDistance = Math.abs(value - max);

  if (minDistance <= threshold || maxDistance <= threshold) {
    return 'warning';
  }

  return 'danger';
}

/**
 * Get status color using design tokens
 */
function getStatusColor(status: 'success' | 'warning' | 'danger'): string {
  switch (status) {
    case 'success':
      return 'var(--color-semantic-success)';
    case 'warning':
      return 'var(--color-semantic-warning)';
    case 'danger':
      return 'var(--color-semantic-error)';
  }
}

/**
 * Calculate date range from preset value
 */
function calculateDateRange(preset: string): DateRangeParams {
  const now = new Date();
  const dateFrom = new Date();

  switch (preset) {
    case '7d':
      dateFrom.setDate(now.getDate() - 7);
      break;
    case '30d':
      dateFrom.setDate(now.getDate() - 30);
      break;
    case '90d':
      dateFrom.setDate(now.getDate() - 90);
      break;
    case 'ytd':
      dateFrom.setMonth(0, 1);
      break;
    default:
      dateFrom.setDate(now.getDate() - 30);
  }

  return {
    dateFrom: dateFrom.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Props for KPICard component
 */
interface KPICardProps {
  readonly kpi: KPISummary;
}

/**
 * Individual KPI summary card
 */
const KPICard: React.FC<KPICardProps> = ({ kpi }) => {
  const status = useMemo(
    () => getKPIStatus(kpi.value, kpi.targetMin, kpi.targetMax),
    [kpi]
  );

  const formattedValue = useMemo(() => {
    if (kpi.format === 'percentage') {
      return `${kpi.value.toFixed(1)}%`;
    }
    return kpi.value.toLocaleString();
  }, [kpi]);

  const statusColor = getStatusColor(status);

  return (
    <Card
      style={{
        borderLeftWidth: 'var(--spacing-1)',
        borderLeftColor: statusColor,
      }}
      data-testid={`kpi-card-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardHeader>
        <CardDescription>{kpi.label}</CardDescription>
        <CardTitle
          style={{
            fontSize: 'var(--typography-font-size-3xl)',
            fontWeight: 'var(--typography-font-weight-bold)',
          }}
        >
          {formattedValue}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 'var(--typography-font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span>
            Target: {kpi.targetMin}% - {kpi.targetMax}%
          </span>
          <span
            style={{
              color: statusColor,
              fontWeight: 'var(--typography-font-weight-semibold)',
            }}
          >
            {status === 'success' && '✓ On Track'}
            {status === 'warning' && '⚠ Warning'}
            {status === 'danger' && '✕ Off Track'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Props for TrendChart component
 */
interface TrendChartProps {
  readonly data: readonly {
    readonly date: string;
    readonly delivered: number;
    readonly opened: number;
    readonly clicked: number;
  }[];
}

/**
 * Engagement trend chart using Recharts
 */
const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      openRate: item.delivered > 0 ? (item.opened / item.delivered) * 100 : 0,
      clickRate: item.delivered > 0 ? (item.clicked / item.delivered) * 100 : 0,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <EmptyState
        title="No trend data available"
        description="Send newsletters to see engagement trends"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
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
            value: 'Rate (%)',
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
        <Legend />
        <Line
          type="monotone"
          dataKey="openRate"
          name="Open Rate"
          stroke="var(--color-accent-armorBlue)"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="clickRate"
          name="Click Rate"
          stroke="var(--color-accent-shieldCyan)"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * EngagementDashboard Component
 *
 * Main analytics dashboard with KPI cards, trend charts, and date range selector.
 * Compliant with SC-001 through SC-006 success criteria.
 *
 * @example
 * ```tsx
 * <EngagementDashboard
 *   dateRange={{ dateFrom: '2024-01-01', dateTo: '2024-12-31' }}
 *   onDateRangeChange={(range) => console.log(range)}
 * />
 * ```
 */
export const EngagementDashboard: React.FC<EngagementDashboardProps> = ({
  dateRange: externalDateRange,
  onDateRangeChange,
  className,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('30d');

  const dateRange = useMemo(() => {
    return externalDateRange ?? calculateDateRange(selectedPreset);
  }, [externalDateRange, selectedPreset]);

  const { data, isLoading, isError, error } = useAnalyticsOverview(dateRange);

  const handlePresetChange = (value: string): void => {
    setSelectedPreset(value);
    const newRange = calculateDateRange(value);
    onDateRangeChange?.(newRange);
  };

  const kpiData = useMemo((): readonly KPISummary[] => {
    if (!data) return [];

    return [
      {
        label: 'Open Rate',
        value: data.avg_open_rate ?? 0,
        target: KPI_TARGETS.OPEN_RATE.target,
        targetMin: KPI_TARGETS.OPEN_RATE.min,
        targetMax: KPI_TARGETS.OPEN_RATE.max,
        unit: '%',
        format: 'percentage',
      },
      {
        label: 'Click Rate',
        value: data.avg_click_rate ?? 0,
        target: KPI_TARGETS.CLICK_RATE.target,
        targetMin: KPI_TARGETS.CLICK_RATE.min,
        targetMax: KPI_TARGETS.CLICK_RATE.max,
        unit: '%',
        format: 'percentage',
      },
      {
        label: 'Click-to-Open Rate',
        value: data.avg_click_to_open_rate ?? 0,
        target: KPI_TARGETS.CTOR.target,
        targetMin: KPI_TARGETS.CTOR.min,
        targetMax: KPI_TARGETS.CTOR.max,
        unit: '%',
        format: 'percentage',
      },
      {
        label: 'Unsubscribe Rate',
        value:
          data.total_recipients > 0
            ? (data.total_unsubscribes / data.total_recipients) * 100
            : 0,
        target: KPI_TARGETS.UNSUBSCRIBE_RATE.target,
        targetMin: KPI_TARGETS.UNSUBSCRIBE_RATE.min,
        targetMax: KPI_TARGETS.UNSUBSCRIBE_RATE.max,
        unit: '%',
        format: 'percentage',
      },
      {
        label: 'Bounce Rate',
        value:
          data.total_recipients > 0
            ? (data.total_bounces / data.total_recipients) * 100
            : 0,
        target: KPI_TARGETS.BOUNCE_RATE.target,
        targetMin: KPI_TARGETS.BOUNCE_RATE.min,
        targetMax: KPI_TARGETS.BOUNCE_RATE.max,
        unit: '%',
        format: 'percentage',
      },
    ];
  }, [data]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <EmptyState
        title="Error loading analytics"
        description={error?.message ?? 'Failed to load analytics data'}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No analytics data"
        description="Send newsletters to see engagement metrics"
      />
    );
  }

  return (
    <div className={className} data-testid="engagement-dashboard">
      {/* Date Range Selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: spacing[6],
        }}
      >
        <Select
          value={selectedPreset}
          onValueChange={handlePresetChange}
          data-testid="date-range-selector"
        >
          {DATE_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </Select>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: spacing[4],
          marginBottom: spacing[8],
        }}
        data-testid="kpi-grid"
      >
        {kpiData.map((kpi) => (
          <KPICard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Engagement Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Trends</CardTitle>
          <CardDescription>
            Daily open and click rates over the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart data={data.engagement_by_day ?? []} />
        </CardContent>
      </Card>
    </div>
  );
};

EngagementDashboard.displayName = 'EngagementDashboard';

export default EngagementDashboard;

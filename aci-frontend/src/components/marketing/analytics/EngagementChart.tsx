/**
 * EngagementChart.tsx - Time-series Engagement Chart
 *
 * Displays engagement trends over time using a line chart.
 * Shows impressions, engagement, and posts published.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TrendData } from '@/types/marketing';

interface EngagementChartProps {
  data: TrendData[];
  isLoading?: boolean;
}

/**
 * Simple SVG-based line chart
 * For production, consider using recharts or similar library
 */
function LineChart({ data }: { data: TrendData[] }) {
  if (data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '300px',
          color: 'var(--color-text-muted)',
        }}
      >
        No data available
      </div>
    );
  }

  // Calculate max values for scaling
  const maxImpressions = Math.max(...data.map((d) => d.impressions));
  const maxEngagement = Math.max(...data.map((d) => d.engagement));

  const width = 100; // percentage
  const height = 300;
  const padding = 40;

  // Calculate points for impressions line
  const impressionsPoints = data
    .map((d, i) => {
      const x = ((i / (data.length - 1)) * (width - 2 * padding)) + padding;
      const y = height - ((d.impressions / maxImpressions) * (height - 2 * padding)) - padding;
      return `${x},${y}`;
    })
    .join(' ');

  // Calculate points for engagement line
  const engagementPoints = data
    .map((d, i) => {
      const x = ((i / (data.length - 1)) * (width - 2 * padding)) + padding;
      const y = height - ((d.engagement / maxEngagement) * (height - 2 * padding)) - padding;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: '100%' }}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => {
          const y = height - (percent / 100) * (height - 2 * padding) - padding;
          return (
            <line
              key={percent}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="var(--color-border-default)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          );
        })}

        {/* Impressions line */}
        <polyline
          points={impressionsPoints}
          fill="none"
          stroke="var(--color-brand-primary)"
          strokeWidth="2"
        />

        {/* Engagement line */}
        <polyline
          points={engagementPoints}
          fill="none"
          stroke="var(--color-semantic-success)"
          strokeWidth="2"
        />
      </svg>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--spacing-md)',
          right: 'var(--spacing-md)',
          display: 'flex',
          gap: 'var(--spacing-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <div
            style={{
              width: '16px',
              height: '2px',
              backgroundColor: 'var(--color-brand-primary)',
            }}
          />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Impressions
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <div
            style={{
              width: '16px',
              height: '2px',
              backgroundColor: 'var(--color-semantic-success)',
            }}
          />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Engagement
          </span>
        </div>
      </div>

      {/* X-axis labels */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: `${padding}%`,
          right: `${padding}%`,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {data.map((d, i) => {
          if (i === 0 || i === data.length - 1 || i % Math.floor(data.length / 5) === 0) {
            return (
              <span
                key={d.date}
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

export function EngagementChart({ data, isLoading }: EngagementChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Engagement Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            style={{
              height: '300px',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--border-radius-md)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChart data={data} />
      </CardContent>
    </Card>
  );
}

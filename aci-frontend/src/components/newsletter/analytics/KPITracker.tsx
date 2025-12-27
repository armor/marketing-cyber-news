/**
 * KPITracker Component
 *
 * Displays key performance indicators with target tracking,
 * actual vs target visualization, and alert thresholds.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { spacing } from '@/styles/tokens/spacing';

// ============================================================================
// Types
// ============================================================================

/**
 * KPI metric definition
 */
export interface KPIMetric {
  readonly id: string;
  readonly name: string;
  readonly current: number;
  readonly target: number;
  readonly targetMin?: number;
  readonly targetMax?: number;
  readonly unit: '%' | 'count' | 'score';
  readonly format?: 'percentage' | 'number';
}

/**
 * Props for KPITracker component
 */
export interface KPITrackerProps {
  readonly metrics: readonly KPIMetric[];
  readonly className?: string;
}

/**
 * Status type based on target comparison
 */
type KPIStatus = 'success' | 'warning' | 'danger';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate KPI status based on current value vs target
 */
function calculateStatus(metric: KPIMetric): KPIStatus {
  const { current, target, targetMin, targetMax } = metric;

  if (targetMin !== undefined && targetMax !== undefined) {
    if (current >= targetMin && current <= targetMax) {
      return 'success';
    }
    const minDistance = Math.abs(current - targetMin);
    const maxDistance = Math.abs(current - targetMax);
    const threshold = (targetMax - targetMin) * 0.1;

    if (minDistance <= threshold || maxDistance <= threshold) {
      return 'warning';
    }
    return 'danger';
  }

  const percentage = (current / target) * 100;

  if (percentage >= 100) {
    return 'success';
  }
  if (percentage >= 80) {
    return 'warning';
  }
  return 'danger';
}

/**
 * Format value based on metric unit
 */
function formatValue(value: number, metric: KPIMetric): string {
  if (metric.format === 'percentage' || metric.unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString();
}

/**
 * Get status color using design tokens
 */
function getStatusColor(status: KPIStatus): string {
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
 * Get background color for status
 */
function getStatusBackground(status: KPIStatus): string {
  switch (status) {
    case 'success':
      return 'var(--color-bg-success-subtle)';
    case 'warning':
      return 'var(--color-bg-warning-subtle)';
    case 'danger':
      return 'var(--color-bg-error-subtle)';
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Props for KPICard component
 */
interface KPICardProps {
  readonly metric: KPIMetric;
}

/**
 * Individual KPI card with gauge visualization
 */
const KPICard: React.FC<KPICardProps> = ({ metric }) => {
  const status = useMemo(() => calculateStatus(metric), [metric]);
  const progress = useMemo(() => {
    const { current, target, targetMin, targetMax } = metric;

    if (targetMin !== undefined && targetMax !== undefined) {
      const range = targetMax - targetMin;
      const position = ((current - targetMin) / range) * 100;
      return Math.max(0, Math.min(100, position));
    }

    return Math.min(100, (current / target) * 100);
  }, [metric]);

  return (
    <Card
      style={{
        borderLeftWidth: 'var(--spacing-1)',
        borderLeftColor: getStatusColor(status),
      }}
      data-testid={`kpi-card-${metric.id}`}
    >
      <CardHeader>
        <CardTitle
          style={{
            fontSize: 'var(--typography-font-size-sm)',
            fontWeight: 'var(--typography-font-weight-medium)',
          }}
        >
          {metric.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current Value */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: spacing[2],
            marginBottom: spacing[4],
          }}
        >
          <span
            style={{
              fontSize: 'var(--typography-font-size-3xl)',
              fontWeight: 'var(--typography-font-weight-bold)',
              color: 'var(--color-text-primary)',
            }}
            data-testid={`kpi-current-${metric.id}`}
          >
            {formatValue(metric.current, metric)}
          </span>
          <span
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            of {formatValue(metric.target, metric)}
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: 'var(--spacing-2)',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--border-radius-full)',
            overflow: 'hidden',
            marginBottom: spacing[3],
          }}
          data-testid={`kpi-progress-${metric.id}`}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: getStatusColor(status),
              borderRadius: 'var(--border-radius-full)',
              transition: 'width var(--motion-duration-normal) var(--motion-ease-default)',
            }}
            data-testid={`kpi-progress-bar-${metric.id}`}
          />
        </div>

        {/* Status and Target Range */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[2],
              padding: `${spacing[1]} ${spacing[2]}`,
              backgroundColor: getStatusBackground(status),
              borderRadius: 'var(--border-radius-md)',
              fontSize: 'var(--typography-font-size-xs)',
              fontWeight: 'var(--typography-font-weight-medium)',
              color: getStatusColor(status),
            }}
            data-testid={`kpi-status-${metric.id}`}
          >
            {status === 'success' && '✓ On Target'}
            {status === 'warning' && '⚠ Near Target'}
            {status === 'danger' && '✕ Off Target'}
          </div>

          {metric.targetMin !== undefined && metric.targetMax !== undefined && (
            <span
              style={{
                fontSize: 'var(--typography-font-size-xs)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Target: {formatValue(metric.targetMin, metric)} -{' '}
              {formatValue(metric.targetMax, metric)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * KPITracker Component
 *
 * Displays a grid of KPI cards with target tracking and visual indicators.
 * Each card shows current value, target, progress bar, and status.
 *
 * @example
 * ```tsx
 * <KPITracker
 *   metrics={[
 *     {
 *       id: 'open_rate',
 *       name: 'Open Rate',
 *       current: 32.5,
 *       target: 35,
 *       targetMin: 30,
 *       targetMax: 40,
 *       unit: '%',
 *       format: 'percentage',
 *     },
 *   ]}
 * />
 * ```
 */
export const KPITracker: React.FC<KPITrackerProps> = ({
  metrics,
  className,
}) => {
  if (metrics.length === 0) {
    return (
      <div
        style={{
          padding: spacing[8],
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
        data-testid="kpi-tracker-empty"
      >
        No KPI metrics configured
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: spacing[4],
      }}
      data-testid="kpi-tracker"
    >
      {metrics.map((metric) => (
        <KPICard key={metric.id} metric={metric} />
      ))}
    </div>
  );
};

KPITracker.displayName = 'KPITracker';

export default KPITracker;

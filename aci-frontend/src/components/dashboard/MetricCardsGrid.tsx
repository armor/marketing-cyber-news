/**
 * MetricCardsGrid Component
 *
 * Responsive grid container for dashboard metric cards.
 * Displays 4 key security metrics with loading states.
 *
 * Layout:
 * - Desktop: 4 cards per row (grid-cols-4)
 * - Tablet: 2 cards per row (md:grid-cols-2)
 * - Mobile: 1 card per row (grid-cols-1)
 *
 * @example
 * ```tsx
 * <MetricCardsGrid
 *   totalThreats={2847}
 *   criticalCount={142}
 *   newToday={38}
 *   activeAlerts={12}
 * />
 * ```
 */

import { Shield, AlertTriangle, Clock, Bell } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Skeleton } from '@/components/ui/skeleton';
import { gapSpacing } from '@/styles/tokens/spacing';

export interface MetricCardsGridProps {
  /** Total number of threats tracked */
  totalThreats: number;
  /** Number of critical severity threats */
  criticalCount: number;
  /** Threats detected today */
  newToday: number;
  /** Active alert count */
  activeAlerts: number;
  /** Loading state for data fetch */
  loading?: boolean;
}

/**
 * Skeleton loading state for metrics grid
 */
function MetricCardsGridSkeleton() {
  return (
    <div
      data-testid="metrics-skeleton"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      style={{
        gap: gapSpacing.lg,
      }}
    >
      {[1, 2, 3, 4].map((index) => (
        <Skeleton
          key={index}
          style={{
            height: '140px',
            width: '100%',
          }}
          aria-label={`Loading metric card ${index}`}
        />
      ))}
    </div>
  );
}

/**
 * MetricCardsGrid displays 4 key dashboard metrics in a responsive grid.
 * Uses design tokens for all spacing - NO hardcoded values.
 */
export function MetricCardsGrid({
  totalThreats,
  criticalCount,
  newToday,
  activeAlerts,
  loading = false,
}: MetricCardsGridProps) {
  // Show skeleton during loading
  if (loading) {
    return <MetricCardsGridSkeleton />;
  }

  return (
    <div
      data-testid="metrics-grid"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      style={{
        gap: gapSpacing.lg,
      }}
      role="region"
      aria-label="Dashboard metrics overview"
    >
      {/* Total Threats Card */}
      <div data-testid="metric-total-threats">
        <MetricCard
          title="Total Threats"
          value={totalThreats}
          icon={<Shield size={24} />}
          variant="default"
        />
      </div>

      {/* Critical Count Card */}
      <div data-testid="metric-critical-count">
        <MetricCard
          title="Critical"
          value={criticalCount}
          icon={<AlertTriangle size={24} />}
          variant="critical"
        />
      </div>

      {/* New Today Card */}
      <div data-testid="metric-new-today">
        <MetricCard
          title="New Today"
          value={newToday}
          icon={<Clock size={24} />}
          variant="warning"
        />
      </div>

      {/* Active Alerts Card */}
      <div data-testid="metric-active-alerts">
        <MetricCard
          title="Active Alerts"
          value={activeAlerts}
          icon={<Bell size={24} />}
          variant="success"
        />
      </div>
    </div>
  );
}

MetricCardsGrid.displayName = 'MetricCardsGrid';

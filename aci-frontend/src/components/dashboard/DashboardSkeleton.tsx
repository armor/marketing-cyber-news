/**
 * DashboardSkeleton Component
 *
 * Loading skeleton for the Dashboard page.
 * Shows placeholder UI while data is being fetched.
 *
 * Uses design tokens exclusively - NO hardcoded values.
 *
 * @module components/dashboard/DashboardSkeleton
 */

import { Skeleton } from '@/components/ui/skeleton';
import { gapSpacing, layoutSpacing } from '@/styles/tokens/spacing';

/**
 * DashboardSkeleton Component
 *
 * Displays skeleton loaders matching the structure of the full Dashboard:
 * - 4 metric cards in a grid
 * - 2 chart placeholders side by side
 * - Activity feed placeholder
 *
 * @example
 * ```tsx
 * if (isLoading) {
 *   return <DashboardSkeleton />;
 * }
 * ```
 */
export function DashboardSkeleton(): React.ReactElement {
  return (
    <div
      data-testid="dashboard-skeleton"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: layoutSpacing.section,
      }}
      role="status"
      aria-label="Loading dashboard"
    >
      {/* Metric Cards Skeleton - 4 column grid */}
      <div
        className="metrics-skeleton"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(1, 1fr)',
          gap: gapSpacing.lg,
        }}
        data-testid="metrics-skeleton"
      >
        {/* Desktop/tablet responsive grid handled by CSS classes */}
        <style>{`
          @media (min-width: 768px) {
            .metrics-skeleton {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (min-width: 1024px) {
            .metrics-skeleton {
              grid-template-columns: repeat(4, 1fr);
            }
          }
        `}</style>

        {[1, 2, 3, 4].map((index) => (
          <Skeleton
            key={`metric-${index}`}
            style={{
              height: '140px',
              width: '100%',
            }}
            data-testid={`metric-skeleton-${index}`}
            aria-label={`Loading metric card ${index}`}
          />
        ))}
      </div>

      {/* Charts Skeleton - 2 charts side by side */}
      <div
        className="charts-skeleton"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(1, 1fr)',
          gap: gapSpacing.lg,
        }}
        data-testid="charts-skeleton"
      >
        <style>{`
          @media (min-width: 1024px) {
            .charts-skeleton {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        `}</style>

        <Skeleton
          style={{
            height: '300px',
            width: '100%',
          }}
          data-testid="chart-skeleton-1"
          aria-label="Loading severity distribution chart"
        />

        <Skeleton
          style={{
            height: '300px',
            width: '100%',
          }}
          data-testid="chart-skeleton-2"
          aria-label="Loading threat timeline chart"
        />
      </div>

      {/* Activity Feed Skeleton */}
      <Skeleton
        style={{
          height: '400px',
          width: '100%',
        }}
        data-testid="activity-feed-skeleton"
        aria-label="Loading activity feed"
      />
    </div>
  );
}

DashboardSkeleton.displayName = 'DashboardSkeleton';

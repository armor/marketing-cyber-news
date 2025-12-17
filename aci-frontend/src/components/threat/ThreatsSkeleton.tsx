/**
 * ThreatsSkeleton Component
 *
 * Full page skeleton for ThreatsPage loading state.
 * Displays animated skeletons for:
 * - Search input field
 * - Filter pills (4 filter buttons)
 * - Threat cards in list layout
 *
 * Uses design tokens exclusively - NO hardcoded colors or values.
 * Matches the layout and spacing of the actual ThreatsPage.
 *
 * @example
 * ```tsx
 * import { ThreatsSkeleton } from '@/components/threat/ThreatsSkeleton';
 *
 * // Basic usage with default 5 cards
 * <ThreatsSkeleton />
 *
 * // Custom card count
 * <ThreatsSkeleton cardCount={8} />
 * ```
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { componentSpacing, gapSpacing, spacing } from '@/styles/tokens/spacing';
import { colors } from '@/styles/tokens/colors';

export interface ThreatsSkeletonProps {
  /** Number of threat card skeletons to display. Defaults to 5. */
  readonly cardCount?: number;
}

/**
 * ThreatCardSkeleton Component
 *
 * Individual skeleton for a threat card with:
 * - Header with severity and category badges
 * - Title skeleton
 * - Summary text lines
 * - Footer with metadata
 */
function ThreatCardSkeleton(): React.ReactElement {
  return (
    <div
      role="status"
      aria-label="Loading threat information"
      className="rounded-lg border p-[var(--spacing-component-lg)]"
      style={{
        borderColor: colors.border.default,
        backgroundColor: colors.background.elevated,
        borderWidth: '1px',
      }}
    >
      {/* Header: Severity badge, Category badge, Bookmark button */}
      <div
        className="flex items-start justify-between mb-[var(--spacing-component-sm)]"
        style={{
          gap: gapSpacing.md,
        }}
      >
        <div className="flex items-center flex-wrap" style={{ gap: gapSpacing.sm }}>
          {/* Severity Badge Skeleton */}
          <Skeleton
            className="rounded-full"
            style={{
              width: spacing[20],
              height: spacing[5],
            }}
          />
          {/* Category Badge Skeleton */}
          <Skeleton
            className="rounded"
            style={{
              width: spacing[16],
              height: spacing[5],
            }}
          />
        </div>

        {/* Bookmark Button Skeleton */}
        <Skeleton
          className="rounded"
          style={{
            width: spacing[8],
            height: spacing[8],
          }}
        />
      </div>

      {/* Title Skeleton */}
      <Skeleton
        className="rounded mb-[var(--spacing-component-sm)]"
        style={{
          width: '75%',
          height: spacing[6],
        }}
      />

      {/* Summary Text Lines Skeleton */}
      <div
        className="mb-[var(--spacing-component-md)]"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[2],
        }}
      >
        <Skeleton
          className="rounded"
          style={{
            width: '100%',
            height: spacing[4],
          }}
        />
        <Skeleton
          className="rounded"
          style={{
            width: '85%',
            height: spacing[4],
          }}
        />
        <Skeleton
          className="rounded"
          style={{
            width: '90%',
            height: spacing[4],
          }}
        />
      </div>

      {/* Footer: CVE badges, Source, Timestamp */}
      <div
        className="flex items-center justify-between flex-wrap pt-[var(--spacing-component-sm)]"
        style={{
          borderTopWidth: '1px',
          borderTopColor: colors.border.default,
          borderTopStyle: 'solid',
          gap: gapSpacing.md,
        }}
      >
        {/* CVE and Source Skeletons */}
        <div className="flex items-center gap-[var(--spacing-gap-sm)]">
          <Skeleton
            className="rounded"
            style={{
              width: spacing[16],
              height: spacing[4],
            }}
          />
          <Skeleton
            className="rounded"
            style={{
              width: spacing[20],
              height: spacing[4],
            }}
          />
        </div>

        {/* Timestamp Skeleton */}
        <Skeleton
          className="rounded"
          style={{
            width: spacing[20],
            height: spacing[4],
          }}
        />
      </div>
    </div>
  );
}

/**
 * Filter Pills Skeleton Component
 *
 * Displays 4 skeleton pills representing filter buttons.
 */
function FilterPillsSkeleton(): React.ReactElement {
  return (
    <div
      className="flex items-center flex-wrap"
      style={{
        gap: gapSpacing.sm,
      }}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton
          key={`filter-skeleton-${index}`}
          className="rounded-full"
          style={{
            width: spacing[24],
            height: spacing[8],
          }}
        />
      ))}
    </div>
  );
}

/**
 * ThreatsSkeleton Component
 *
 * Full page skeleton showing:
 * 1. Search input skeleton
 * 2. Filter pills skeleton
 * 3. Multiple threat card skeletons
 *
 * All animations and spacing use design tokens.
 */
export function ThreatsSkeleton({
  cardCount = 5,
}: ThreatsSkeletonProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-label="Loading threats page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: gapSpacing.lg,
      }}
    >
      {/* Search Input Skeleton */}
      <div className="space-y-[var(--spacing-component-sm)]">
        <Skeleton
          className="rounded-lg"
          style={{
            width: '100%',
            height: spacing[10],
          }}
        />
      </div>

      {/* Filters Section Skeleton */}
      <div
        style={{
          paddingBottom: componentSpacing.md,
        }}
      >
        <FilterPillsSkeleton />
      </div>

      {/* Threat Cards Skeleton */}
      <div
        className="space-y-[var(--spacing-gap-md)]"
        aria-label="Loading threat cards"
      >
        {Array.from({ length: cardCount }).map((_, index) => (
          <ThreatCardSkeleton key={`threat-skeleton-${index}`} />
        ))}
      </div>
    </div>
  );
}

ThreatsSkeleton.displayName = 'ThreatsSkeleton';
ThreatCardSkeleton.displayName = 'ThreatCardSkeleton';
FilterPillsSkeleton.displayName = 'FilterPillsSkeleton';

/**
 * Accessibility Notes:
 * - role="status" indicates loading state to screen readers
 * - aria-label provides context for loading state
 * - aria-busy would be set on parent in actual implementation
 * - Maintains consistent spacing with actual components
 *
 * Performance Notes:
 * - Pure functional component with no state
 * - Skeleton components use CSS animations via class
 * - No heavy computations or side effects
 * - Lightweight and fast to render
 *
 * Design Token Usage:
 * - All spacing uses token variables (componentSpacing, gapSpacing, spacing)
 * - All colors use token variables (colors.border, colors.background)
 * - No hardcoded px, rem, or color values
 * - Supports theme switching via CSS custom properties
 */

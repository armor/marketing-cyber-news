/**
 * ThreatDetailSkeleton Component
 *
 * Loading skeleton matching ThreatDetailPage layout.
 * Displays placeholder content while threat data is being fetched.
 *
 * Features:
 * - Breadcrumb skeleton
 * - Title skeleton (large)
 * - Meta badges row skeleton
 * - Content skeleton (multiple lines)
 * - CVE section skeleton
 * - Responsive layout matching actual page
 *
 * Used in: ThreatDetailPage (loading state)
 *
 * @example
 * ```tsx
 * if (isLoading) {
 *   return <ThreatDetailSkeleton />;
 * }
 * ```
 */

import type { ReactElement } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { spacing } from '@/styles/tokens/spacing';

/**
 * ThreatDetailSkeleton - Loading state for threat detail page
 *
 * Mimics the structure of ThreatDetailPage with skeleton placeholders:
 * - Breadcrumb navigation
 * - Back button
 * - Large title
 * - Metadata badges (severity, category, source)
 * - Content lines (simulating paragraphs)
 * - CVE badges
 * - CTA section
 */
export function ThreatDetailSkeleton(): ReactElement {
  return (
    <div
      data-testid="threat-detail-skeleton"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[8],
        padding: spacing[8],
        maxWidth: '1200px',
        margin: '0 auto',
      }}
      role="status"
      aria-label="Loading threat details..."
    >
      {/* Breadcrumb Skeleton */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
        }}
      >
        <Skeleton
          style={{
            width: '60px',
            height: '16px',
          }}
        />
        <Skeleton
          style={{
            width: '8px',
            height: '16px',
          }}
        />
        <Skeleton
          style={{
            width: '80px',
            height: '16px',
          }}
        />
        <Skeleton
          style={{
            width: '8px',
            height: '16px',
          }}
        />
        <Skeleton
          style={{
            width: '200px',
            height: '16px',
          }}
        />
      </div>

      {/* Back Button Skeleton */}
      <div>
        <Skeleton
          style={{
            width: '140px',
            height: '36px',
            borderRadius: 'var(--border-radius-md)',
          }}
        />
      </div>

      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[6],
        }}
      >
        {/* Title Row with Bookmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing[4],
          }}
        >
          <Skeleton
            style={{
              width: '70%',
              height: '48px',
            }}
          />
          <Skeleton
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--border-radius-md)',
            }}
          />
        </div>

        {/* Badges Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
            flexWrap: 'wrap',
          }}
        >
          <Skeleton
            style={{
              width: '100px',
              height: '28px',
              borderRadius: 'var(--border-radius-full)',
            }}
          />
          <Skeleton
            style={{
              width: '120px',
              height: '28px',
              borderRadius: 'var(--border-radius-full)',
            }}
          />
          <Skeleton
            style={{
              width: '80px',
              height: '28px',
              borderRadius: 'var(--border-radius-full)',
            }}
          />
        </div>

        {/* Metadata Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[4],
            flexWrap: 'wrap',
          }}
        >
          <Skeleton
            style={{
              width: '160px',
              height: '20px',
            }}
          />
          <Skeleton
            style={{
              width: '100px',
              height: '20px',
            }}
          />
        </div>

        {/* Summary Skeleton */}
        <Skeleton
          style={{
            width: '90%',
            height: '24px',
          }}
        />
      </div>

      {/* Content Section (multiple lines) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[4],
        }}
      >
        <Skeleton
          style={{
            width: '100%',
            height: '20px',
          }}
        />
        <Skeleton
          style={{
            width: '95%',
            height: '20px',
          }}
        />
        <Skeleton
          style={{
            width: '98%',
            height: '20px',
          }}
        />
        <Skeleton
          style={{
            width: '85%',
            height: '20px',
          }}
        />

        <div style={{ height: spacing[4] }} />

        <Skeleton
          style={{
            width: '100%',
            height: '20px',
          }}
        />
        <Skeleton
          style={{
            width: '92%',
            height: '20px',
          }}
        />
        <Skeleton
          style={{
            width: '88%',
            height: '20px',
          }}
        />

        <div style={{ height: spacing[4] }} />

        <Skeleton
          style={{
            width: '100%',
            height: '120px',
            borderRadius: 'var(--border-radius-md)',
          }}
        />
      </div>

      {/* CVE Section Skeleton */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[4],
        }}
      >
        <Skeleton
          style={{
            width: '150px',
            height: '28px',
          }}
        />
        <div
          style={{
            display: 'flex',
            gap: spacing[3],
            flexWrap: 'wrap',
          }}
        >
          <Skeleton
            style={{
              width: '200px',
              height: '36px',
              borderRadius: 'var(--border-radius-md)',
            }}
          />
          <Skeleton
            style={{
              width: '180px',
              height: '36px',
              borderRadius: 'var(--border-radius-md)',
            }}
          />
          <Skeleton
            style={{
              width: '220px',
              height: '36px',
              borderRadius: 'var(--border-radius-md)',
            }}
          />
        </div>
      </div>

      {/* CTA Section Skeleton */}
      <Skeleton
        style={{
          width: '100%',
          height: '160px',
          borderRadius: 'var(--border-radius-lg)',
        }}
      />

      {/* Screen reader announcement */}
      <span className="sr-only">Loading threat details, please wait...</span>
    </div>
  );
}

/**
 * Accessibility Notes:
 * - role="status" indicates loading state to screen readers
 * - aria-label provides context for loading message
 * - sr-only span announces loading to assistive technologies
 * - Maintains page structure for consistent user experience
 *
 * Performance Notes:
 * - Pure presentational component (no state)
 * - Minimal re-renders (static skeleton)
 * - Fast initial render (no data fetching)
 * - Improves perceived performance during loading
 *
 * Design Token Usage:
 * - Spacing: spacing[2-8]
 * - Border radius: var(--border-radius-*)
 * - Skeleton component uses design tokens internally
 *
 * Testing:
 * - data-testid="threat-detail-skeleton" for assertions
 * - Verify skeleton is shown during loading
 * - Check transition to actual content after load
 */

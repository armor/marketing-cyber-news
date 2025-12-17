/**
 * ThreatHeader Component
 * Displays threat metadata: title, badges, timestamps, view count, bookmark button
 *
 * Features:
 * - Title with severity badge
 * - Category and source badges
 * - Published/updated timestamps
 * - View count
 * - Bookmark button
 *
 * Used in: ThreatDetail
 */

import React from 'react';
import { Calendar, Eye, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Threat } from '@/types/threat';
import { SeverityBadge } from './SeverityBadge';
import { BookmarkButton } from './BookmarkButton';
import { colors } from '@/styles/tokens/colors';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';

export interface ThreatHeaderProps {
  /**
   * Threat entity with all metadata
   */
  readonly threat: Threat;
  /**
   * Callback when bookmark is toggled
   */
  readonly onBookmarkToggle: () => void | Promise<void>;
  /**
   * Optional loading state for bookmark toggle
   */
  readonly isBookmarkLoading?: boolean;
  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Formats ISO date string to human-readable format
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats number with thousands separator
 */
function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

/**
 * Gets human-readable category label
 */
function getCategoryLabel(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * ThreatHeader - Displays threat title, metadata, and actions
 *
 * Features:
 * - Prominent title with severity indicator
 * - Metadata badges (category, source)
 * - Timestamps for published/updated dates
 * - View count display
 * - Bookmark toggle button
 * - Responsive layout
 *
 * @example
 * ```tsx
 * <ThreatHeader
 *   threat={threatData}
 *   onBookmarkToggle={handleBookmarkToggle}
 * />
 * ```
 */
export function ThreatHeader({
  threat,
  onBookmarkToggle,
  isBookmarkLoading = false,
  className,
}: ThreatHeaderProps): React.JSX.Element {
  const {
    title,
    severity,
    category,
    source,
    sourceUrl,
    publishedAt,
    updatedAt,
    viewCount,
    isBookmarked = false,
  } = threat;

  const formattedPublished = formatDate(publishedAt);
  const formattedUpdated = formatDate(updatedAt);
  const formattedViewCount = formatCount(viewCount);
  const categoryLabel = getCategoryLabel(category);

  // Only show updated timestamp if different from published
  const showUpdated = publishedAt !== updatedAt;

  return (
    <header
      className={cn('flex flex-col', className)}
      style={{
        gap: spacing[6],
      }}
    >
      {/* Title Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing[4],
        }}
      >
        <h1
          style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            lineHeight: typography.lineHeight.tight,
            color: colors.text.primary,
            margin: 0,
            flex: 1,
          }}
        >
          {title}
        </h1>

        <BookmarkButton
          isBookmarked={isBookmarked}
          onClick={onBookmarkToggle}
          isLoading={isBookmarkLoading}
          size="icon"
        />
      </div>

      {/* Badges Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing[3],
        }}
      >
        {/* Severity Badge */}
        <SeverityBadge severity={severity} size="md" />

        {/* Category Badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: `${spacing[1]} ${spacing[3]}`,
            borderRadius: 'var(--border-radius-full)',
            backgroundColor: colors.background.elevated,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.secondary,
            border: `1px solid ${colors.border.default}`,
          }}
        >
          {categoryLabel}
        </span>

        {/* Source Badge */}
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View source at ${source} (opens in new tab)`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[2],
              padding: `${spacing[1]} ${spacing[3]}`,
              borderRadius: 'var(--border-radius-full)',
              backgroundColor: colors.background.elevated,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.secondary,
              border: `1px solid ${colors.border.default}`,
              textDecoration: 'none',
              transition: 'all 150ms ease',
            }}
            className="hover:border-primary hover:text-primary"
          >
            <span>{source}</span>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: `${spacing[1]} ${spacing[3]}`,
              borderRadius: 'var(--border-radius-full)',
              backgroundColor: colors.background.elevated,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.secondary,
              border: `1px solid ${colors.border.default}`,
            }}
          >
            {source}
          </span>
        )}
      </div>

      {/* Metadata Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing[4],
          fontSize: typography.fontSize.sm,
          color: colors.text.muted,
        }}
      >
        {/* Published Date */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          <Calendar size={16} aria-hidden="true" />
          <span>
            <span style={{ fontWeight: typography.fontWeight.medium }}>Published</span>
            {' '}
            <time dateTime={publishedAt}>{formattedPublished}</time>
          </span>
        </div>

        {/* Updated Date (if different) */}
        {showUpdated && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
            }}
          >
            <Calendar size={16} aria-hidden="true" />
            <span>
              <span style={{ fontWeight: typography.fontWeight.medium }}>Updated</span>
              {' '}
              <time dateTime={updatedAt}>{formattedUpdated}</time>
            </span>
          </div>
        )}

        {/* View Count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          <Eye size={16} aria-hidden="true" />
          <span>
            {formattedViewCount} {viewCount === 1 ? 'view' : 'views'}
          </span>
        </div>
      </div>

      {/* Summary/Description */}
      {threat.summary && (
        <p
          style={{
            fontSize: typography.fontSize.lg,
            lineHeight: typography.lineHeight.relaxed,
            color: colors.text.secondary,
            margin: 0,
          }}
        >
          {threat.summary}
        </p>
      )}
    </header>
  );
}

/**
 * Accessibility Notes:
 * - Semantic <header> element
 * - <h1> for page title
 * - <time> elements with datetime attributes
 * - Icons hidden from screen readers (aria-hidden)
 * - External link has descriptive aria-label
 * - Bookmark button has proper aria-pressed state
 *
 * Performance Notes:
 * - No state management (controlled component)
 * - Date formatting memoized via function calls
 * - Minimal re-renders (pure presentation)
 *
 * Design Token Usage:
 * - Colors: colors.text.*, colors.background.*, colors.border.*
 * - Spacing: spacing[1-6]
 * - Typography: typography.fontSize.*, typography.fontWeight.*, typography.lineHeight.*
 *
 * Testing:
 * - Verify title renders correctly
 * - Check severity badge displays with correct color
 * - Test source link (opens new tab, security attrs)
 * - Verify timestamps are formatted
 * - Check view count formatting (thousands separator)
 * - Test bookmark button interaction
 */

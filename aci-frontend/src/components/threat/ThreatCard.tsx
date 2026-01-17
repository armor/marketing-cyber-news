/**
 * ThreatCard Component
 *
 * Enhanced threat card with view tracking, improved accessibility,
 * and theme-agnostic styling. Supports both standard ThreatSummary
 * and enhanced ThreatSummaryWithViews for infinite scroll.
 *
 * Features:
 * - View tracking indicators
 * - Theme-agnostic CSS variables only
 * - Enhanced accessibility
 * - Severity-coded styling
 * - CVE badges with overflow handling
 * - Relative time formatting
 * - Keyboard navigation
 * - Bookmark toggle
 *
 * @example
 * ```tsx
 * <ThreatCard
 *   threat={threatSummary}
 *   onSelect={(id) => navigate(`/threats/${id}`)}
 *   onBookmarkToggle={(id) => toggleBookmark(id)}
 * />
 * ```
 */

import { type ReactElement, useCallback } from 'react';
import { Shield, Eye, Clock, ExternalLink } from 'lucide-react';
import type { ThreatSummary } from '@/types/threat';
import type { ThreatSummaryWithViews } from '@/hooks/useInfiniteThreats';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Types
// ============================================================================

export interface ThreatCardProps {
  readonly threat: ThreatSummary | ThreatSummaryWithViews;
  readonly onSelect?: (id: string) => void;
  readonly onBookmarkToggle?: (id: string) => void;
  readonly showViewIndicator?: boolean;
  readonly className?: string;
  readonly 'data-index'?: number;
  readonly 'aria-setsize'?: number;
  readonly 'aria-posinset'?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get severity color from design tokens
 */
function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'var(--color-severity-critical)';
    case 'high':
      return 'var(--color-severity-high)';
    case 'medium':
      return 'var(--color-severity-medium)';
    case 'low':
      return 'var(--color-severity-low)';
    default:
      return 'var(--color-text-secondary)';
  }
}

/**
 * Get severity variant for badges
 */
function getSeverityVariant(severity: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'destructive';
    case 'high':
      return 'destructive';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'outline';
  }
}

/**
 * Format relative date with more precision
 */
function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 60) {
    if (diffMinutes < 1) return 'Just now';
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Check if threat has view tracking data
 */
function hasViewData(threat: ThreatSummary | ThreatSummaryWithViews): threat is ThreatSummaryWithViews {
  return 'lastViewedAt' in threat || 'viewCount' in threat || 'userHasViewed' in threat;
}

/**
 * Format category display name
 */
function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================================================
// Component
// ============================================================================

/**
 * Enhanced threat card with view tracking and accessibility features
 *
 * Displays threat information with severity indicators, view tracking,
 * CVE counts, and interactive bookmark toggle. Optimized for both
 * mouse and keyboard navigation with theme-agnostic styling.
 */
export function ThreatCard({
  threat,
  onSelect,
  onBookmarkToggle,
  showViewIndicator = true,
  className,
  'data-index': dataIndex,
  'aria-setsize': ariaSetsize,
  'aria-posinset': ariaPosInSet,
}: ThreatCardProps): ReactElement {
  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleCardClick = useCallback(() => {
    if (onSelect) {
      onSelect(threat.id);
    }
  }, [onSelect, threat.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  }, [handleCardClick]);

  const handleBookmarkClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBookmarkToggle) {
      onBookmarkToggle(threat.id);
    }
  }, [onBookmarkToggle, threat.id]);

  // ============================================================================
  // View Data Processing
  // ============================================================================

  const viewData = hasViewData(threat) ? threat : null;
  const hasBeenViewed = viewData?.userHasViewed ?? false;
  const viewCount = viewData?.viewCount ?? 0;
  const lastViewedAt = viewData?.lastViewedAt;

  // ============================================================================
  // Styling
  // ============================================================================

  const severityColor = getSeverityColor(threat.severity);
  const severityVariant = getSeverityVariant(threat.severity);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <article
      className={`
        group relative cursor-pointer rounded-lg border border-[var(--color-border-default)]
        bg-[var(--color-bg-elevated)] p-[var(--spacing-component-lg)]
        shadow-[var(--shadow-sm)] transition-all duration-[var(--motion-duration-fast)]
        hover:shadow-[var(--shadow-md)] hover:border-[var(--color-brand-primary-muted)]
        focus-within:ring-2 focus-within:ring-[var(--color-brand-primary)]
        focus-within:ring-offset-2 overflow-hidden
        ${hasBeenViewed ? 'opacity-90' : ''}
        ${className || ''}
      `}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`View threat: ${threat.title}`}
      aria-describedby={`threat-${threat.id}-summary`}
      data-testid="threat-card"
      data-threat-id={threat.id}
      data-index={dataIndex}
      aria-setsize={ariaSetsize}
      aria-posinset={ariaPosInSet}
    >
      {/* View Indicator */}
      {showViewIndicator && hasBeenViewed && (
        <div
          className="absolute top-[var(--spacing-component-sm)] left-[var(--spacing-component-sm)] flex items-center gap-[var(--spacing-gap-xs)]"
          aria-label="Previously viewed"
        >
          <div className="w-2 h-2 rounded-full bg-[var(--color-brand-primary)]" />
          <span className="text-xs text-[var(--color-text-muted)]">Viewed</span>
        </div>
      )}

      {/* Header: Severity and Category */}
      <div className={`mb-[var(--spacing-component-sm)] flex items-start justify-between gap-[var(--spacing-gap-md)] ${hasBeenViewed && showViewIndicator ? 'mt-[var(--spacing-component-md)]' : ''}`}>
        <Badge
          variant={severityVariant}
          className="text-xs font-[var(--typography-font-weight-semibold)] uppercase tracking-[var(--typography-letter-spacing-wide)]"
          style={{
            '--badge-bg': `color-mix(in srgb, ${severityColor} 15%, transparent)`,
            '--badge-color': severityColor,
          } as React.CSSProperties}
          aria-label={`Severity: ${threat.severity}`}
        >
          {threat.severity}
        </Badge>

        <div className="flex items-center gap-[var(--spacing-gap-sm)]">
          <span
            className="text-xs font-[var(--typography-font-weight-medium)] text-[var(--color-text-secondary)]"
            aria-label={`Category: ${formatCategory(threat.category)}`}
          >
            {formatCategory(threat.category)}
          </span>

          {/* View Count */}
          {viewCount > 0 && (
            <div
              className="flex items-center gap-[var(--spacing-gap-xs)] text-xs text-[var(--color-text-muted)]"
              aria-label={`Viewed ${viewCount} times`}
            >
              <Eye size={12} aria-hidden="true" />
              {viewCount}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="mb-[var(--spacing-component-sm)] text-lg font-[var(--typography-font-weight-semibold)] leading-[var(--typography-line-height-tight)] text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-primary)] transition-colors duration-[var(--motion-duration-fast)]">
        {threat.title}
      </h3>

      {/* Summary */}
      <p
        id={`threat-${threat.id}-summary`}
        className="mb-[var(--spacing-component-md)] line-clamp-2 text-sm leading-[var(--typography-line-height-normal)] text-[var(--color-text-secondary)]"
      >
        {threat.summary}
      </p>

      {/* CVE Tags (if any) */}
      {threat.cves.length > 0 && (
        <div className="mb-[var(--spacing-component-sm)] flex flex-wrap gap-[var(--spacing-gap-xs)] overflow-hidden">
          {threat.cves.slice(0, 3).map((cve) => (
            <Badge
              key={cve}
              variant="outline"
              className="text-xs font-mono bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]"
            >
              {cve}
            </Badge>
          ))}
          {threat.cves.length > 3 && (
            <Badge
              variant="outline"
              className="text-xs text-[var(--color-text-muted)] border-dashed"
            >
              +{threat.cves.length - 3} more
            </Badge>
          )}
        </div>
      )}

      {/* Footer: Metadata and Actions */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-[var(--spacing-gap-sm)] text-[var(--color-text-muted)]">
          {/* Source */}
          <span className="font-[var(--typography-font-weight-medium)] text-[var(--color-text-secondary)]">
            {threat.source}
          </span>

          <span aria-hidden="true">•</span>

          {/* Published Date */}
          <time
            dateTime={threat.publishedAt}
            className="flex items-center gap-[var(--spacing-gap-xs)]"
          >
            <Clock size={12} aria-hidden="true" />
            {formatRelativeDate(threat.publishedAt)}
          </time>

          {/* Last Viewed (if available) */}
          {lastViewedAt && (
            <>
              <span aria-hidden="true">•</span>
              <time
                dateTime={lastViewedAt}
                className="text-[var(--color-brand-primary)]"
                title={`Last viewed: ${formatRelativeDate(lastViewedAt)}`}
              >
                Viewed {formatRelativeDate(lastViewedAt)}
              </time>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-[var(--spacing-gap-sm)]">
          {/* CVE Count */}
          {threat.cves.length > 0 && (
            <span
              className="flex items-center gap-[var(--spacing-gap-xs)] text-[var(--color-text-muted)]"
              aria-label={`${threat.cves.length} CVE${threat.cves.length !== 1 ? 's' : ''}`}
            >
              <Shield size={12} aria-hidden="true" />
              {threat.cves.length}
            </span>
          )}

          {/* External Link Indicator */}
          <ExternalLink
            size={12}
            className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--motion-duration-fast)]"
            aria-hidden="true"
          />

          {/* Bookmark Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmarkClick}
            className="h-auto p-1 text-[var(--color-text-muted)] hover:text-[var(--color-brand-primary)] transition-colors duration-[var(--motion-duration-fast)]"
            aria-label={threat.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            aria-pressed={threat.isBookmarked}
            data-testid="bookmark-toggle"
          >
            {threat.isBookmarked ? (
              <span className="text-[var(--color-brand-primary)]" aria-hidden="true">★</span>
            ) : (
              <span aria-hidden="true">☆</span>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}

/**
 * ============================================================================
 * Accessibility Features
 * ============================================================================
 *
 * ✅ Semantic HTML: article, headings, time elements
 * ✅ ARIA labels: Descriptive labels for all interactive elements
 * ✅ ARIA pressed: Bookmark toggle state
 * ✅ ARIA describedby: Links title to summary for screen readers
 * ✅ ARIA setsize/posinset: Position in list context
 * ✅ Keyboard navigation: Enter/Space key support
 * ✅ Focus management: Proper focus indicators
 * ✅ Screen reader support: Clear structure and labels
 *
 * ============================================================================
 * Performance Optimizations
 * ============================================================================
 *
 * ✅ useCallback: All event handlers memoized
 * ✅ Conditional rendering: Only render view data when available
 * ✅ CSS variables: Efficient styling with design tokens
 * ✅ Overflow handling: Prevents layout shifts
 * ✅ Limited CVE display: Shows max 3 CVEs to prevent overflow
 * ✅ Optimized transitions: GPU-accelerated animations
 *
 * ============================================================================
 * Theme Compatibility
 * ============================================================================
 *
 * ✅ CSS Variables Only: All colors use design tokens
 * ✅ Dark Theme: Current theme fully supported
 * ✅ White Theme Ready: No hardcoded colors
 * ✅ High Contrast: Sufficient contrast ratios
 * ✅ Responsive Design: Works across all viewport sizes
 * ✅ Color Mixing: Modern CSS color mixing for dynamic backgrounds
 */

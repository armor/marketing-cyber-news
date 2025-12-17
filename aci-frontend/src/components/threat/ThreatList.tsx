import type { ReactElement } from 'react';
import type { ThreatSummary } from '@/types/threat';
import { EmptyState } from '@/components/ui/EmptyState';
import { Shield, AlertTriangle } from 'lucide-react';

interface ThreatListProps {
  readonly threats: readonly ThreatSummary[];
  readonly isLoading?: boolean;
  readonly onThreatSelect?: (threatId: string) => void;
  readonly onBookmarkToggle?: (threatId: string) => void;
  readonly emptyMessage?: string;
}

/**
 * ThreatCardSkeleton Component
 *
 * Loading skeleton for ThreatCard with animated pulse effect.
 * Maintains consistent dimensions with actual ThreatCard component.
 */
function ThreatCardSkeleton(): ReactElement {
  return (
    <div
      className="animate-pulse rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-[var(--spacing-component-lg)] shadow-[var(--shadow-sm)]"
      role="status"
      aria-label="Loading threat information"
    >
      {/* Header with severity badge */}
      <div className="mb-[var(--spacing-component-sm)] flex items-start justify-between gap-[var(--spacing-gap-md)]">
        <div className="h-5 w-20 rounded bg-[var(--color-bg-secondary)]" />
        <div className="h-5 w-16 rounded bg-[var(--color-bg-secondary)]" />
      </div>

      {/* Title */}
      <div className="mb-[var(--spacing-component-sm)] h-6 w-3/4 rounded bg-[var(--color-bg-secondary)]" />

      {/* Summary text lines */}
      <div className="mb-[var(--spacing-component-md)] space-y-[var(--spacing-2)]">
        <div className="h-4 w-full rounded bg-[var(--color-bg-secondary)]" />
        <div className="h-4 w-5/6 rounded bg-[var(--color-bg-secondary)]" />
      </div>

      {/* Footer with metadata */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-[var(--color-bg-secondary)]" />
        <div className="flex gap-[var(--spacing-gap-sm)]">
          <div className="h-4 w-16 rounded bg-[var(--color-bg-secondary)]" />
          <div className="h-4 w-20 rounded bg-[var(--color-bg-secondary)]" />
        </div>
      </div>
    </div>
  );
}

/**
 * ThreatCard Component
 *
 * Displays a single threat in a card format with severity, category,
 * summary, and metadata. Includes click handler and bookmark toggle.
 *
 * TODO: This is a placeholder implementation. Replace with full ThreatCard
 * component once created with proper severity badges, CVE tags, and interactions.
 */
function ThreatCard({
  threat,
  onSelect,
  onBookmarkToggle,
}: {
  readonly threat: ThreatSummary;
  readonly onSelect?: (id: string) => void;
  readonly onBookmarkToggle?: (id: string) => void;
}): ReactElement {
  const handleClick = (): void => {
    if (onSelect) {
      onSelect(threat.id);
    }
  };

  const handleBookmarkClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onBookmarkToggle) {
      onBookmarkToggle(threat.id);
    }
  };

  // Get severity color from design tokens
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
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
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <article
      className="group cursor-pointer rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-[var(--spacing-component-lg)] shadow-[var(--shadow-sm)] transition-all duration-[var(--motion-duration-fast)] hover:shadow-[var(--shadow-md)] focus-within:ring-2 focus-within:ring-[var(--color-brand-primary)] focus-within:ring-offset-2"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View threat: ${threat.title}`}
      data-testid="threat-card"
    >
      {/* Header: Severity and Category */}
      <div className="mb-[var(--spacing-component-sm)] flex items-start justify-between gap-[var(--spacing-gap-md)]">
        <span
          className="inline-flex items-center rounded-full px-[var(--spacing-component-sm)] py-[var(--spacing-1)] text-xs font-[var(--typography-font-weight-semibold)] uppercase tracking-[var(--typography-letter-spacing-wide)]"
          style={{
            backgroundColor: `color-mix(in srgb, ${getSeverityColor(threat.severity)} 15%, transparent)`,
            color: getSeverityColor(threat.severity),
          }}
          aria-label={`Severity: ${threat.severity}`}
        >
          {threat.severity}
        </span>
        <span
          className="text-xs font-[var(--typography-font-weight-medium)] capitalize text-[var(--color-text-secondary)]"
          aria-label={`Category: ${threat.category}`}
        >
          {threat.category.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Title */}
      <h3 className="mb-[var(--spacing-component-sm)] text-lg font-[var(--typography-font-weight-semibold)] leading-[var(--typography-line-height-tight)] text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-primary)] transition-colors duration-[var(--motion-duration-fast)]">
        {threat.title}
      </h3>

      {/* Summary */}
      <p className="mb-[var(--spacing-component-md)] line-clamp-2 text-sm leading-[var(--typography-line-height-normal)] text-[var(--color-text-secondary)]">
        {threat.summary}
      </p>

      {/* Footer: Metadata */}
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-[var(--spacing-gap-sm)]">
          <span>{threat.source}</span>
          <span aria-hidden="true">•</span>
          <time dateTime={threat.publishedAt}>{formatDate(threat.publishedAt)}</time>
        </div>

        <div className="flex items-center gap-[var(--spacing-gap-sm)]">
          {threat.cves.length > 0 && (
            <span className="flex items-center gap-[var(--spacing-1)]">
              <Shield size={14} aria-hidden="true" />
              {threat.cves.length} CVE{threat.cves.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            type="button"
            onClick={handleBookmarkClick}
            className="ml-[var(--spacing-component-sm)] transition-opacity duration-[var(--motion-duration-fast)] hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:ring-offset-2 rounded"
            aria-label={threat.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            aria-pressed={threat.isBookmarked}
          >
            {threat.isBookmarked ? '★' : '☆'}
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * ThreatList Component
 *
 * Container component that renders a list of ThreatCards with loading,
 * error, and empty states. Provides responsive layout with smooth transitions.
 *
 * @example
 * ```tsx
 * <ThreatList
 *   threats={threatData}
 *   isLoading={isLoading}
 *   onThreatSelect={(id) => navigate(`/threats/${id}`)}
 *   onBookmarkToggle={(id) => toggleBookmark(id)}
 * />
 * ```
 *
 * @example Empty state
 * ```tsx
 * <ThreatList
 *   threats={[]}
 *   emptyMessage="No threats match your filters"
 * />
 * ```
 */
export function ThreatList({
  threats,
  isLoading = false,
  onThreatSelect,
  onBookmarkToggle,
  emptyMessage = 'No threats found',
}: ThreatListProps): ReactElement {
  // Loading state: show skeleton cards
  if (isLoading) {
    return (
      <div
        className="mx-auto w-full max-w-4xl space-y-[var(--spacing-gap-md)]"
        data-testid="threat-list"
        aria-busy="true"
        aria-label="Loading threats"
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <ThreatCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  // Empty state: show empty state message
  if (threats.length === 0) {
    return (
      <div
        className="mx-auto w-full max-w-4xl"
        data-testid="threat-list"
        aria-label="Threat list"
      >
        <EmptyState
          icon={<AlertTriangle />}
          title={emptyMessage}
          description="Try adjusting your filters or check back later for new threats."
        />
      </div>
    );
  }

  // Render threat cards
  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-[var(--spacing-gap-md)]"
      data-testid="threat-list"
      role="feed"
      aria-label="Threat list"
      aria-busy="false"
    >
      {threats.map((threat) => (
        <ThreatCard
          key={threat.id}
          threat={threat}
          onSelect={onThreatSelect}
          onBookmarkToggle={onBookmarkToggle}
        />
      ))}
    </div>
  );
}

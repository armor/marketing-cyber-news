/**
 * CVEList Component
 * Displays a collapsible list of CVE badges
 *
 * Features:
 * - Shows first N CVEs (default 5)
 * - Collapsible/expandable with "Show More/Less" button
 * - Empty state when no CVEs
 * - Accessible with ARIA labels
 *
 * Used in: ThreatDetail
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CVE } from '@/types/threat';
import { CVEBadge } from './CVEBadge';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { colors } from '@/styles/tokens/colors';

export interface CVEListProps {
  /**
   * Array of CVE entities to display
   */
  readonly cves: readonly CVE[];
  /**
   * Maximum number of CVEs to show before collapsing
   * @default 5
   */
  readonly maxVisible?: number;
  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

const DEFAULT_MAX_VISIBLE = 5;

/**
 * CVEList - Collapsible list of CVE badges with expand/collapse functionality
 *
 * @example
 * ```tsx
 * const cves: CVE[] = [
 *   { id: 'CVE-2024-1234', severity: 'critical', cvssScore: 9.8, description: 'RCE' },
 *   { id: 'CVE-2024-5678', severity: 'high', cvssScore: 8.5, description: 'XSS' },
 * ];
 *
 * <CVEList cves={cves} />
 * ```
 */
export function CVEList({
  cves,
  maxVisible = DEFAULT_MAX_VISIBLE,
  className,
}: CVEListProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Guard: Empty state
  if (cves.length === 0) {
    return (
      <div
        data-testid="cve-list-empty"
        style={{
          padding: spacing[6],
          textAlign: 'center',
          color: colors.text.muted,
          fontSize: typography.fontSize.sm,
        }}
        className={className}
      >
        No CVEs available.
      </div>
    );
  }

  const effectiveMaxVisible = Math.max(1, maxVisible); // Ensure at least 1 CVE shown
  const shouldCollapse = cves.length > effectiveMaxVisible;
  const displayedCves = isExpanded || !shouldCollapse ? cves : cves.slice(0, effectiveMaxVisible);
  const hiddenCount = Math.max(0, cves.length - effectiveMaxVisible);

  const handleToggle = (): void => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div
      data-testid="cve-list"
      aria-label="Common Vulnerabilities and Exposures list"
      className={cn('flex flex-col', className)}
      style={{
        gap: spacing[4],
      }}
    >
      {/* CVE List */}
      <ul
        role="list"
        aria-label="CVE vulnerabilities"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing[3],
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {displayedCves.map((cve) => (
          <li key={cve.id} role="listitem">
            <CVEBadge cve={cve} />
          </li>
        ))}
      </ul>

      {/* Show More/Less Button */}
      {shouldCollapse && (
        <button
          data-testid="cve-list-toggle-button"
          type="button"
          onClick={handleToggle}
          aria-expanded={isExpanded}
          aria-controls="cve-list"
          aria-label={isExpanded ? `Show fewer CVEs` : `Show ${hiddenCount} more CVEs`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: spacing[2],
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.secondary,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={16} aria-hidden="true" />
              <span>Show Less</span>
            </>
          ) : (
            <>
              <ChevronDown size={16} aria-hidden="true" />
              <span>Show more</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Accessibility Notes:
 * - Semantic <ul> and <li> elements
 * - ARIA labels for list and individual items
 * - aria-expanded attribute on toggle button
 * - aria-controls links button to content
 * - Keyboard accessible (native button element)
 * - Focus maintained on button after expand/collapse
 *
 * Performance Notes:
 * - Only renders visible CVEs (not hiding with CSS)
 * - Efficient array slicing
 * - Minimal re-renders (useState for expansion only)
 * - Suitable for large CVE lists (100+)
 *
 * Design Token Usage:
 * - Spacing: spacing[2-6]
 * - Typography: typography.fontSize.sm, typography.fontWeight.medium
 * - Colors: colors.text.muted, colors.text.secondary
 *
 * Testing:
 * - data-testid="cve-list" for container queries
 * - data-testid="cve-list-empty" for empty state
 * - data-testid="cve-badge" on individual badges (in CVEBadge component)
 */

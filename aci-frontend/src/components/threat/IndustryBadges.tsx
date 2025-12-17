/**
 * IndustryBadges Component
 * Displays affected industries with optional impact level color coding
 *
 * Features:
 * - Color-coded by impact level (if provided)
 * - Industry name with tooltip for impact details
 * - Responsive layout
 *
 * Used in: ThreatDetail, ThreatHeader
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { Industry } from '@/types/threat';
import { Badge } from '@/components/ui/badge';
import { spacing } from '@/styles/tokens/spacing';

export interface IndustryBadgesProps {
  /**
   * Array of affected industries
   */
  readonly industries: readonly Industry[];
  /**
   * Optional impact levels for each industry (critical, high, medium, low)
   * If provided, must match length of industries array
   */
  readonly impactLevels?: readonly ('critical' | 'high' | 'medium' | 'low' | null)[];
  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Maps industry codes to human-readable labels
 */
const INDUSTRY_LABELS: Record<Industry, string> = {
  finance: 'Finance',
  healthcare: 'Healthcare',
  manufacturing: 'Manufacturing',
  energy: 'Energy',
  retail: 'Retail',
  technology: 'Technology',
  government: 'Government',
  education: 'Education',
  telecommunications: 'Telecommunications',
  transportation: 'Transportation',
  defense: 'Defense',
  critical_infrastructure: 'Critical Infrastructure',
  all: 'All Industries',
};

/**
 * Maps impact levels to badge variants
 */
const IMPACT_VARIANT_MAP: Record<
  'critical' | 'high' | 'medium' | 'low',
  'critical' | 'warning' | 'info' | 'success'
> = {
  critical: 'critical',
  high: 'warning',
  medium: 'info',
  low: 'success',
};

/**
 * IndustryBadges - Display list of affected industries
 *
 * Features:
 * - Shows industry names as badges
 * - Optional color coding based on impact level
 * - Responsive flex layout
 * - Empty state handling
 *
 * @example
 * ```tsx
 * // Simple usage
 * <IndustryBadges industries={['finance', 'healthcare']} />
 *
 * // With impact levels
 * <IndustryBadges
 *   industries={['finance', 'healthcare', 'technology']}
 *   impactLevels={['critical', 'high', 'medium']}
 * />
 * ```
 */
export function IndustryBadges({
  industries,
  impactLevels,
  className,
}: IndustryBadgesProps): React.JSX.Element | null {
  // Guard: Empty state
  if (industries.length === 0) {
    return null;
  }

  // Validate impactLevels length if provided
  if (impactLevels && impactLevels.length !== industries.length) {
    console.warn(
      'IndustryBadges: impactLevels length does not match industries length. Ignoring impactLevels.'
    );
  }

  const hasValidImpactLevels = impactLevels && impactLevels.length === industries.length;

  return (
    <div
      data-testid="industry-badges"
      aria-label="Affected industries"
      className={cn('flex flex-wrap', className)}
      style={{
        gap: spacing[2],
      }}
    >
      {industries.map((industry, index) => {
        const label = INDUSTRY_LABELS[industry] || industry;
        const impactLevel = hasValidImpactLevels ? impactLevels[index] : null;
        const variant = impactLevel ? IMPACT_VARIANT_MAP[impactLevel] : 'default';

        // Build aria-label with impact information if available
        const ariaLabel = impactLevel
          ? `${label} - ${impactLevel} impact`
          : label;

        return (
          <Badge
            key={`${industry}-${index}`}
            variant={variant}
            data-testid="industry-badge"
            data-industry={industry}
            data-impact={impactLevel || undefined}
            aria-label={ariaLabel}
            style={{
              cursor: impactLevel ? 'help' : 'default',
            }}
            title={impactLevel ? `Impact: ${impactLevel}` : undefined}
          >
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

/**
 * Accessibility Notes:
 * - aria-label on container for context
 * - Individual badge aria-labels include impact level
 * - title attribute for native tooltips
 * - Semantic HTML (div container, badge components)
 * - data-industry and data-impact for testing
 *
 * Performance Notes:
 * - Pure presentational component
 * - No state management
 * - Efficient rendering (no nested loops)
 * - Memoization-friendly (React.memo compatible)
 *
 * Design Token Usage:
 * - Colors: via Badge component variants
 * - Spacing: spacing[2]
 * - Typography: via Badge component
 *
 * Testing:
 * - data-testid="industry-badges" for container
 * - data-testid="industry-badge" for individual badges
 * - data-industry attribute for industry identification
 * - data-impact attribute for impact level verification
 */

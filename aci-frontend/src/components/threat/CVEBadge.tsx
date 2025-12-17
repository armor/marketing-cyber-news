/**
 * CVEBadge Component
 * Displays a single CVE with severity indicator, CVSS score, and link to NVD
 *
 * Used in: CVEList, ThreatDetail
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CVE } from '@/types/threat';
import { colors } from '@/styles/tokens/colors';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { motion } from '@/styles/tokens/motion';

export interface CVEBadgeProps {
  /**
   * CVE data including ID, severity, and CVSS score
   */
  readonly cve: CVE;
  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Formats CVSS score to 1 decimal place
 */
function formatCVSSScore(score: number | null): string {
  if (score === null) {
    return 'N/A';
  }
  return score.toFixed(1);
}

/**
 * Generates NVD URL for a given CVE ID
 */
function getNVDUrl(cveId: string): string {
  return `https://nvd.nist.gov/vuln/detail/${cveId}`;
}

/**
 * CVEBadge - Displays CVE information with link to National Vulnerability Database
 *
 * Features:
 * - Severity color-coded badge using design tokens
 * - CVSS score display (formatted to 1 decimal)
 * - External link to NVD with security attributes
 * - Accessible with ARIA labels
 * - Hover effects with smooth transitions
 *
 * @example
 * ```tsx
 * const cve: CVE = {
 *   id: 'CVE-2024-1234',
 *   severity: 'critical',
 *   cvssScore: 9.8,
 *   description: 'RCE vulnerability'
 * };
 *
 * <CVEBadge cve={cve} />
 * ```
 */
export function CVEBadge({ cve, className }: CVEBadgeProps): React.JSX.Element {
  const { id, severity, cvssScore, description } = cve;
  const nvdUrl = getNVDUrl(id);
  const formattedScore = formatCVSSScore(cvssScore);

  return (
    <a
      href={nvdUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="cve-badge"
      data-severity={severity}
      aria-label={`${id} - ${severity} severity${cvssScore !== null ? `, CVSS score ${formattedScore}` : ''} - View on National Vulnerability Database (opens in new tab)`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing[2],
        padding: `${spacing[2]} ${spacing[3]}`,
        borderRadius: 'var(--border-radius-md)',
        borderWidth: 'var(--border-width-thin)',
        borderStyle: 'solid',
        borderColor: `var(--color-severity-${severity})`,
        backgroundColor: `color-mix(in srgb, var(--color-severity-${severity}) 10%, transparent)`,
        color: colors.text.primary,
        textDecoration: 'none',
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        lineHeight: typography.lineHeight.tight,
        transition: `all ${motion.duration.fast} ${motion.easing.default}`,
      }}
      className={cn(
        'group hover:shadow-md',
        className
      )}
      onMouseEnter={(e): void => {
        e.currentTarget.style.backgroundColor = `color-mix(in srgb, var(--color-severity-${severity}) 20%, transparent)`;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e): void => {
        e.currentTarget.style.backgroundColor = `color-mix(in srgb, var(--color-severity-${severity}) 10%, transparent)`;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* CVE ID */}
      <span
        style={{
          fontFamily: typography.fontFamily.mono,
          fontWeight: typography.fontWeight.semibold,
          color: `var(--color-severity-${severity})`,
        }}
      >
        {id}
      </span>

      {/* CVSS Score */}
      {cvssScore !== null && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[1],
            paddingLeft: spacing[2],
            paddingRight: spacing[2],
            paddingTop: spacing[1],
            paddingBottom: spacing[1],
            borderRadius: 'var(--border-radius-full)',
            backgroundColor: colors.background.elevated,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.secondary,
          }}
          title={`CVSS Score: ${formattedScore}`}
        >
          <span style={{ fontSize: typography.fontSize.xs }}>CVSS</span>
          <span style={{ fontWeight: typography.fontWeight.bold }}>{formattedScore}</span>
        </span>
      )}

      {/* External Link Icon */}
      <ExternalLink
        size={14}
        style={{
          color: colors.text.muted,
          transition: `color ${motion.duration.fast} ${motion.easing.default}`,
        }}
        className="group-hover:text-primary"
        aria-hidden="true"
      />

      {/* Hidden description for accessibility */}
      {description && (
        <span className="sr-only">{description}</span>
      )}
    </a>
  );
}

/**
 * Accessibility Notes:
 * - Full ARIA label describing CVE, severity, score, and action
 * - External link icon hidden from screen readers (decorative)
 * - Description available to screen readers via sr-only span
 * - Keyboard accessible (native anchor element)
 * - High contrast severity colors
 *
 * Security Notes:
 * - Uses rel="noopener noreferrer" for external links
 * - Opens in new tab (target="_blank")
 * - Links to trusted NVD source only
 *
 * Design Token Usage:
 * - Colors: var(--color-severity-*), colors.text.*, colors.background.*
 * - Spacing: spacing[1-3]
 * - Typography: typography.fontSize.*, typography.fontWeight.*
 * - Motion: motion.duration.fast, motion.easing.default
 *
 * Performance Notes:
 * - Pure presentational component
 * - No state management
 * - Suitable for large lists (efficient rendering)
 * - Inline event handlers are stable (no re-renders)
 */

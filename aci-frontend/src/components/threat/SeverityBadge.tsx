/**
 * SeverityBadge Component
 * Displays threat severity level with appropriate color coding
 *
 * Used in: ThreatCard, ThreatList, ActivityFeed
 */

import { cn } from '@/lib/utils';
import type { Severity } from '@/types/threat';

export interface SeverityBadgeProps {
  /**
   * Severity level of the threat
   */
  severity: Severity;
  /**
   * Badge size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to show the severity label text
   * @default true
   */
  showLabel?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Maps severity levels to display labels
 */
const severityLabels: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  informational: 'Informational',
};

/**
 * Size variant class mappings using design tokens
 * Note: Using separate style object for inline styles to avoid Tailwind class conflicts
 */
const sizeStyles = {
  sm: {
    paddingLeft: 'var(--spacing-2)',
    paddingRight: 'var(--spacing-2)',
    paddingTop: 'var(--spacing-1)',
    paddingBottom: 'var(--spacing-1)',
    fontSize: 'var(--typography-font-size-xs)',
    fontWeight: 'var(--typography-font-weight-medium)',
  },
  md: {
    paddingLeft: 'var(--spacing-3)',
    paddingRight: 'var(--spacing-3)',
    paddingTop: 'var(--spacing-1)',
    paddingBottom: 'var(--spacing-1)',
    fontSize: 'var(--typography-font-size-sm)',
    fontWeight: 'var(--typography-font-weight-medium)',
  },
  lg: {
    paddingLeft: 'var(--spacing-4)',
    paddingRight: 'var(--spacing-4)',
    paddingTop: 'var(--spacing-2)',
    paddingBottom: 'var(--spacing-2)',
    fontSize: 'var(--typography-font-size-base)',
    fontWeight: 'var(--typography-font-weight-semibold)',
  },
} as const;

/**
 * SeverityBadge - Visual indicator for threat severity levels
 *
 * Features:
 * - Color-coded using CSS custom properties (design tokens)
 * - Three size variants (sm, md, lg)
 * - Optional label text
 * - Accessible color contrast (WCAG AA compliant)
 * - Styled with data-severity attribute for easy testing
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SeverityBadge severity="critical" />
 *
 * // Small size without label (icon-only mode)
 * <SeverityBadge severity="high" size="sm" showLabel={false} />
 *
 * // Large size for detail views
 * <SeverityBadge severity="medium" size="lg" />
 * ```
 */
export function SeverityBadge({
  severity,
  size = 'md',
  showLabel = true,
  className,
}: SeverityBadgeProps) {
  // Inline styles for size-dependent properties to avoid Tailwind conflicts with color classes
  const sizeStyle = sizeStyles[size];

  // Determine color values based on severity
  const colorStyle = {
    backgroundColor: `var(--color-severity-${severity})`,
    borderColor: `var(--color-severity-${severity})`,
    color: `var(--color-severity-${severity})`,
  };

  return (
    <span
      data-severity={severity}
      style={{
        ...sizeStyle,
        ...colorStyle,
        // Apply opacity to background using color-mix
        backgroundColor: `color-mix(in srgb, var(--color-severity-${severity}) 10%, transparent)`,
        // Transition using design tokens
        transition: `all var(--motion-duration-fast) var(--motion-easing-default)`,
        borderRadius: 'var(--border-radius-full)',
        borderWidth: 'var(--border-width-thin)',
        borderStyle: 'solid',
        letterSpacing: 'var(--typography-letter-spacing-wide)',
      }}
      className={cn(
        // Base layout styles
        'inline-flex items-center justify-center',
        'uppercase whitespace-nowrap',
        className
      )}
      role="status"
      aria-label={`Severity: ${severityLabels[severity]}`}
    >
      {showLabel && severityLabels[severity]}
    </span>
  );
}

/**
 * Accessibility Notes:
 * - Uses role="status" for live region announcements
 * - Includes aria-label for screen readers
 * - Color contrast meets WCAG AA standards (4.5:1 minimum)
 * - Text is uppercase with wide letter spacing for readability
 *
 * Performance Notes:
 * - Pure presentational component (no side effects)
 * - CSS-only animations using design token transitions
 * - No JavaScript event listeners
 * - Suitable for React.memo() if needed in large lists
 *
 * Testing:
 * - Use data-severity attribute for querying in tests
 * - Example: screen.getByRole('status', { name: /severity: critical/i })
 */

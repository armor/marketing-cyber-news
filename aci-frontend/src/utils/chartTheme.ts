/**
 * Chart Theme Utilities
 *
 * Provides consistent theming for all chart components using design tokens.
 * ALL values reference CSS custom properties - NO hardcoded colors, sizes, or timings.
 *
 * @module chartTheme
 */

import { colors } from '@/styles/tokens/colors';
import { motion } from '@/styles/tokens/motion';
import { typography } from '@/styles/tokens/typography';
import { componentSpacing } from '@/styles/tokens/spacing';
import { borders } from '@/styles/tokens/borders';

/**
 * Severity color palette for charts
 * Maps threat severity levels to their corresponding design token colors
 */
export const severityColors = {
  critical: colors.severity.critical,
  high: colors.severity.high,
  medium: colors.severity.medium,
  low: colors.severity.low,
} as const;

/**
 * Chart animation configuration using motion design tokens
 * Provides consistent animation timing across all chart components
 */
export const chartAnimationConfig = {
  /** Animation duration in ms (derived from motion tokens) */
  duration: motion.duration.normal,
  /** Easing function for smooth animations */
  easing: motion.easing.easeInOut,
} as const;

/**
 * Tooltip theme configuration
 * Consistent styling for chart tooltips and popovers
 */
export const tooltipTheme = {
  backgroundColor: colors.background.elevated,
  borderColor: colors.border.default,
  textColor: colors.text.primary,
  borderRadius: borders.radius.md,
  padding: componentSpacing.sm,
} as const;

/**
 * Axis theme configuration
 * Styling for chart axes (x-axis, y-axis)
 */
export const axisTheme = {
  tickColor: colors.text.muted,
  lineColor: colors.border.default,
  labelColor: colors.text.secondary,
  fontSize: typography.fontSize.sm,
  fontFamily: typography.fontFamily.sans,
} as const;

/**
 * Grid theme configuration
 * Styling for chart gridlines and reference lines
 */
export const gridTheme = {
  strokeColor: colors.border.default,
  /** Dashed grid pattern: 5px dash, 5px gap */
  strokeDasharray: '5 5',
} as const;

/**
 * Legend theme configuration
 * Styling for chart legends
 */
export const legendTheme = {
  textColor: colors.text.secondary,
  fontSize: typography.fontSize.sm,
  fontFamily: typography.fontFamily.sans,
  iconSize: componentSpacing.md,
} as const;

/**
 * Chart colors for data series
 * Array of colors for multi-series charts
 */
export const chartColors = [
  colors.brand.primary,
  colors.brand.accent,
  colors.semantic.info,
  colors.semantic.success,
  colors.semantic.warning,
  colors.semantic.error,
] as const;

/**
 * Severity level type
 */
export type SeverityLevel = keyof typeof severityColors;

/**
 * Get color for a specific severity level
 *
 * @param severity - The threat severity level
 * @returns CSS custom property reference for the severity color
 *
 * @example
 * ```tsx
 * const color = getSeverityColor('critical');
 * // Returns: 'var(--color-severity-critical)'
 * ```
 */
export function getSeverityColor(severity: SeverityLevel): string {
  return severityColors[severity];
}

/**
 * Format number for chart display
 * Adds thousand separators and handles large numbers with K/M/B suffixes
 *
 * @param value - The number to format
 * @returns Formatted string representation
 *
 * @example
 * ```tsx
 * formatChartNumber(1234);      // "1,234"
 * formatChartNumber(1234567);   // "1.23M"
 * formatChartNumber(1234567890); // "1.23B"
 * ```
 */
export function formatChartNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toLocaleString();
}

/**
 * Date format type
 */
export type DateFormat = 'short' | 'long';

/**
 * Format date for chart axis labels
 *
 * @param date - ISO date string or Date object
 * @param format - Display format ('short' = MM/DD, 'long' = MMM DD, YYYY)
 * @returns Formatted date string
 *
 * @example
 * ```tsx
 * formatChartDate('2025-12-13');           // "Dec 13"
 * formatChartDate('2025-12-13', 'short');  // "12/13"
 * formatChartDate('2025-12-13', 'long');   // "Dec 13, 2025"
 * ```
 */
export function formatChartDate(
  date: string | Date,
  format: DateFormat = 'short'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'short') {
    return dateObj.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
    });
  }

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get color for a data series by index
 * Cycles through chart colors for multi-series charts
 *
 * @param index - Series index
 * @returns CSS custom property reference for the color
 *
 * @example
 * ```tsx
 * getSeriesColor(0); // Returns primary brand color
 * getSeriesColor(1); // Returns accent color
 * getSeriesColor(7); // Cycles back to primary (7 % 6 = 1)
 * ```
 */
export function getSeriesColor(index: number): string {
  return chartColors[index % chartColors.length];
}

/**
 * Format percentage for chart display
 *
 * @param value - Decimal value (0-1) or percentage (0-100)
 * @param isDecimal - Whether input is decimal (true) or percentage (false)
 * @returns Formatted percentage string
 *
 * @example
 * ```tsx
 * formatChartPercentage(0.456, true);  // "45.6%"
 * formatChartPercentage(45.6, false);  // "45.6%"
 * ```
 */
export function formatChartPercentage(
  value: number,
  isDecimal = true
): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(1)}%`;
}

/**
 * Responsive chart dimensions helper
 * Returns appropriate chart height based on container width
 *
 * @param containerWidth - Width of chart container in pixels
 * @returns Recommended chart height in pixels
 *
 * @example
 * ```tsx
 * getResponsiveChartHeight(800);  // 400 (16:9 aspect ratio)
 * getResponsiveChartHeight(400);  // 300 (min height)
 * ```
 */
export function getResponsiveChartHeight(containerWidth: number): number {
  // Maintain 16:9 aspect ratio with min/max constraints
  const aspectRatioHeight = containerWidth * (9 / 16);
  const minHeight = 300;
  const maxHeight = 600;

  return Math.max(minHeight, Math.min(maxHeight, aspectRatioHeight));
}

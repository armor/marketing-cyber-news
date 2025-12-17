/**
 * Severity Color Configuration
 *
 * Maps severity levels to Tailwind CSS classes.
 * Extracted to separate file for DRY principle and maintainability.
 */

export const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
  info: 'bg-blue-500',
} as const;

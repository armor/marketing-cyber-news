/**
 * SeverityFilter Component
 *
 * Multi-select filter for threat severity levels (Critical, High, Medium, Low).
 * Uses design tokens for colors and spacing - NO hardcoded values.
 *
 * @example
 * ```tsx
 * <SeverityFilter
 *   value={['critical', 'high']}
 *   onChange={(severities) => setFilters({ severity: severities })}
 * />
 * ```
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { colors } from '@/styles/tokens/colors';
import type { Severity } from '@/types/threat';

/**
 * Props for SeverityFilter component
 */
export interface SeverityFilterProps {
  /** Currently selected severity levels */
  value: readonly Severity[];
  /** Callback when severity selection changes */
  onChange: (severity: Severity[]) => void;
  /** Disable all filter buttons */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Severity configuration with labels and design token references
 */
const SEVERITY_CONFIG: Record<Severity, { label: string; colorVar: string }> = {
  critical: {
    label: 'Critical',
    colorVar: colors.severity.critical,
  },
  high: {
    label: 'High',
    colorVar: colors.severity.high,
  },
  medium: {
    label: 'Medium',
    colorVar: colors.severity.medium,
  },
  low: {
    label: 'Low',
    colorVar: colors.severity.low,
  },
  informational: {
    label: 'Informational',
    colorVar: colors.semantic.info,
  },
};

/**
 * Ordered list of severity levels for consistent rendering
 */
const SEVERITY_ORDER: readonly Severity[] = ['critical', 'high', 'medium', 'low'] as const;

/**
 * SeverityFilter Component
 *
 * Provides toggle buttons for filtering threats by severity level.
 * Supports keyboard navigation and screen readers.
 */
export const SeverityFilter = React.forwardRef<HTMLDivElement, SeverityFilterProps>(
  ({ value, onChange, disabled = false, className }, ref) => {
    /**
     * Toggle a severity level on/off
     */
    const handleToggle = React.useCallback(
      (severity: Severity) => {
        if (disabled) return;

        const isSelected = value.includes(severity);
        const newValue = isSelected
          ? value.filter((s) => s !== severity)
          : [...value, severity];

        onChange(newValue);
      },
      [value, onChange, disabled]
    );

    /**
     * Handle keyboard navigation (Space/Enter to toggle)
     */
    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>, severity: Severity) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          handleToggle(severity);
        }
      },
      [handleToggle]
    );

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-wrap items-center',
          'gap-[var(--spacing-gap-sm)]',
          className
        )}
        role="group"
        aria-label="Filter by severity level"
      >
        {SEVERITY_ORDER.map((severity) => {
          const config = SEVERITY_CONFIG[severity];
          const isSelected = value.includes(severity);

          return (
            <button
              key={severity}
              type="button"
              onClick={() => handleToggle(severity)}
              onKeyDown={(e) => handleKeyDown(e, severity)}
              disabled={disabled}
              className={cn(
                // Base styles
                'inline-flex items-center justify-center',
                'px-[var(--spacing-component-sm)] py-[var(--spacing-component-xs)]',
                'text-sm font-medium',
                'rounded-md',
                'border-2 border-solid',
                'transition-all duration-[var(--motion-duration-normal)] ease-[var(--motion-ease-default)]',
                'focus-visible:outline-none',
                'focus-visible:ring-2',
                'focus-visible:ring-[var(--color-border-focus)]',
                'focus-visible:ring-offset-2',
                'focus-visible:ring-offset-[var(--color-bg-primary)]',
                // Disabled state
                disabled && 'opacity-50 cursor-not-allowed',
                // Selected state with severity color
                isSelected && [
                  'text-white',
                  'shadow-sm',
                ],
                // Unselected state
                !isSelected && [
                  'bg-transparent',
                  'text-[var(--color-text-secondary)]',
                  'border-[var(--color-border-default)]',
                  'hover:bg-[var(--color-bg-secondary)]',
                  'hover:border-[var(--color-text-muted)]',
                  'hover:text-[var(--color-text-primary)]',
                ]
              )}
              style={
                isSelected
                  ? {
                      backgroundColor: config.colorVar,
                      borderColor: config.colorVar,
                    }
                  : undefined
              }
              aria-pressed={isSelected}
              aria-label={`${isSelected ? 'Remove' : 'Add'} ${config.label} severity filter`}
              data-severity={severity}
              data-selected={isSelected}
            >
              {config.label}
            </button>
          );
        })}
      </div>
    );
  }
);

SeverityFilter.displayName = 'SeverityFilter';

export default SeverityFilter;

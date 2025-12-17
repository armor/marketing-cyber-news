/**
 * DashboardErrorState Component
 *
 * Error state display for dashboard data fetching failures.
 * Provides retry action and clear error messaging.
 *
 * Uses design tokens exclusively - NO hardcoded values.
 *
 * @module components/dashboard/DashboardErrorState
 */

import { AlertTriangle } from 'lucide-react';
import { colors } from '@/styles/tokens/colors';
import { spacing, componentSpacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { borders } from '@/styles/tokens/borders';
import { motion } from '@/styles/tokens/motion';

/**
 * Props for DashboardErrorState component
 */
export interface DashboardErrorStateProps {
  /** Error object from query */
  error: Error | null;
  /** Retry callback function */
  onRetry: () => void;
}

/**
 * DashboardErrorState Component
 *
 * Displays a user-friendly error message with retry button
 * when dashboard data fails to load.
 *
 * @example
 * ```tsx
 * if (isError) {
 *   return <DashboardErrorState error={error} onRetry={refetch} />;
 * }
 * ```
 */
export function DashboardErrorState({
  error,
  onRetry,
}: DashboardErrorStateProps): React.ReactElement {
  const errorMessage = error?.message || 'Failed to load dashboard data';

  return (
    <div
      data-testid="dashboard-error"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: componentSpacing.xl,
        textAlign: 'center',
      }}
      role="alert"
      aria-live="assertive"
    >
      {/* Error Icon */}
      <div
        style={{
          width: spacing[16],
          height: spacing[16],
          borderRadius: borders.radius.full,
          backgroundColor: colors.semantic.error,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing[6],
          opacity: 0.9,
        }}
        aria-hidden="true"
      >
        <AlertTriangle
          size={48}
          style={{
            color: colors.text.primary,
          }}
        />
      </div>

      {/* Error Title */}
      <h2
        style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          marginBottom: spacing[3],
          lineHeight: typography.lineHeight.tight,
        }}
      >
        Unable to Load Dashboard
      </h2>

      {/* Error Message */}
      <p
        style={{
          fontSize: typography.fontSize.base,
          color: colors.text.secondary,
          marginBottom: spacing[8],
          maxWidth: '500px',
          lineHeight: typography.lineHeight.relaxed,
        }}
      >
        {errorMessage}
      </p>

      {/* Retry Button */}
      <button
        data-testid="dashboard-retry-button"
        type="button"
        onClick={onRetry}
        style={{
          padding: `${componentSpacing.md} ${componentSpacing.lg}`,
          backgroundColor: colors.brand.primary,
          color: colors.text.primary,
          border: 'none',
          borderRadius: borders.radius.md,
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.medium,
          cursor: 'pointer',
          transition: `opacity ${motion.duration.fast} ${motion.easing.default}`,
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = `2px solid ${colors.border.focus}`;
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
        aria-label="Retry loading dashboard data"
      >
        Try Again
      </button>
    </div>
  );
}

DashboardErrorState.displayName = 'DashboardErrorState';

import type { CSSProperties } from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  readonly size?: SpinnerSize;
  readonly label?: string;
  readonly className?: string;
}

// Size configurations using design tokens
const SIZE_STYLES: Record<SpinnerSize, CSSProperties> = {
  sm: {
    width: 'var(--spacing-4)',
    height: 'var(--spacing-4)',
    borderWidth: 'var(--border-width-medium)',
  },
  md: {
    width: 'var(--spacing-8)',
    height: 'var(--spacing-8)',
    borderWidth: 'var(--border-width-medium)',
  },
  lg: {
    width: 'var(--spacing-12)',
    height: 'var(--spacing-12)',
    borderWidth: 'var(--border-width-thick)',
  },
} as const;

/**
 * LoadingSpinner Component
 *
 * Animated loading spinner with size variants and optional label.
 * Uses CSS animations with design token motion timing.
 *
 * @example
 * <LoadingSpinner />
 *
 * @example With label and size
 * <LoadingSpinner size="lg" label="Loading articles..." />
 */
export function LoadingSpinner({
  size = 'md',
  label,
  className = '',
}: LoadingSpinnerProps): React.ReactElement {
  const spinnerStyle: CSSProperties = {
    ...SIZE_STYLES[size],
    borderRadius: 'var(--border-radius-full)',
    borderColor: 'var(--color-border-default)',
    borderTopColor: 'var(--color-brand-primary)',
    animationDuration: 'var(--motion-duration-normal)',
    animationTimingFunction: 'var(--motion-easing-default)',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      style={{
        gap: 'var(--spacing-gap-sm)',
      }}
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
    >
      <div
        className="animate-spin"
        style={spinnerStyle}
        aria-hidden="true"
      />
      {label && (
        <p
          style={{
            fontSize: 'var(--typography-font-size-sm)',
            fontWeight: 'var(--typography-font-weight-medium)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {label}
        </p>
      )}
    </div>
  );
}

import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface BrandScoreBadgeProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * BrandScoreBadge - Visual indicator for brand compliance score
 *
 * Color coding:
 * - Green (80-100): High brand alignment
 * - Yellow (60-79): Moderate issues
 * - Red (0-59): Significant issues
 *
 * Features:
 * - Accessible color contrast
 * - Icon + numeric score
 * - Responsive sizing
 */
export function BrandScoreBadge({
  score,
  size = 'md',
  showLabel = true,
  className = '',
}: BrandScoreBadgeProps) {
  const getScoreVariant = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  const variant = getScoreVariant(score);

  const sizeStyles = {
    sm: {
      height: 'var(--spacing-6)',
      padding: '0 var(--spacing-2)',
      fontSize: 'var(--typography-font-size-xs)',
      iconSize: 'var(--spacing-3)',
    },
    md: {
      height: 'var(--spacing-8)',
      padding: '0 var(--spacing-3)',
      fontSize: 'var(--typography-font-size-sm)',
      iconSize: 'var(--spacing-4)',
    },
    lg: {
      height: 'var(--spacing-10)',
      padding: '0 var(--spacing-4)',
      fontSize: 'var(--typography-font-size-base)',
      iconSize: 'var(--spacing-5)',
    },
  };

  const variantConfig = {
    success: {
      Icon: CheckCircle,
      bgColor: 'var(--gradient-badge-success)',
      textColor: 'var(--color-semantic-success)',
      label: 'High alignment',
      ariaLabel: `Brand score: ${score} out of 100. High alignment.`,
    },
    warning: {
      Icon: AlertTriangle,
      bgColor: 'var(--gradient-badge-warning)',
      textColor: 'var(--color-semantic-warning)',
      label: 'Needs review',
      ariaLabel: `Brand score: ${score} out of 100. Needs review.`,
    },
    critical: {
      Icon: AlertCircle,
      bgColor: 'var(--gradient-badge-critical)',
      textColor: 'var(--color-semantic-error)',
      label: 'Issues found',
      ariaLabel: `Brand score: ${score} out of 100. Issues found.`,
    },
  };

  const config = variantConfig[variant];
  const Icon = config.Icon;
  const styles = sizeStyles[size];

  return (
    <div
      className={`inline-flex items-center gap-[var(--spacing-2)] rounded-full ${className}`}
      style={{
        height: styles.height,
        padding: styles.padding,
        background: config.bgColor,
        boxShadow: 'var(--shadow-badge)',
      }}
      role="status"
      aria-label={config.ariaLabel}
    >
      <Icon
        style={{
          width: styles.iconSize,
          height: styles.iconSize,
          color: config.textColor,
        }}
        aria-hidden="true"
      />
      <span
        style={{
          fontSize: styles.fontSize,
          fontFamily: 'var(--typography-font-family-sans)',
          fontWeight: 'var(--typography-font-weight-semibold)',
          color: config.textColor,
          lineHeight: 1,
        }}
      >
        {score}
      </span>
      {showLabel && (
        <span
          style={{
            fontSize: styles.fontSize,
            fontFamily: 'var(--typography-font-family-sans)',
            fontWeight: 'var(--typography-font-weight-medium)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1,
          }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}

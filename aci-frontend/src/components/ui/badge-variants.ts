/**
 * Badge Variant Styles - Fortified Horizon Theme
 *
 * Extracted to separate file for react-refresh compliance.
 * Uses CSS custom properties for all styling values.
 */

import type { CSSProperties } from 'react';

/**
 * Variant style configurations using design tokens
 */
export const variantStyles: Record<string, CSSProperties> = {
  default: {
    borderColor: 'transparent',
    background: 'var(--gradient-badge-neutral)',
    color: 'var(--color-text-primary)',
    boxShadow: 'var(--shadow-badge)',
  },
  secondary: {
    borderColor: 'transparent',
    background: 'var(--gradient-component)',
    color: 'var(--color-text-secondary)',
    boxShadow: 'var(--shadow-badge)',
  },
  destructive: {
    borderColor: 'transparent',
    background: 'var(--gradient-badge-critical)',
    color: 'var(--color-critical)',
    boxShadow: 'var(--shadow-badge)',
  },
  critical: {
    borderColor: 'transparent',
    background: 'var(--gradient-badge-critical)',
    color: 'var(--color-critical)',
    boxShadow: 'var(--shadow-badge)',
  },
  warning: {
    borderColor: 'transparent',
    background: 'var(--gradient-badge-warning)',
    color: 'var(--color-warning)',
    boxShadow: 'var(--shadow-badge)',
  },
  success: {
    borderColor: 'transparent',
    background: 'var(--gradient-badge-success)',
    color: 'var(--color-success)',
    boxShadow: 'var(--shadow-badge)',
  },
  info: {
    borderColor: 'transparent',
    background: 'var(--gradient-badge-info)',
    color: 'var(--color-armor-blue)',
    boxShadow: 'var(--shadow-badge)',
  },
  outline: {
    borderColor: 'var(--color-border-default)',
    background: 'transparent',
    color: 'var(--color-text-primary)',
  },
};

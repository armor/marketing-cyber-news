/**
 * Button Variant Styles - Fortified Horizon Theme
 *
 * Extracted to separate file for react-refresh compliance.
 * Uses CSS custom properties for styling.
 */

import type { CSSProperties } from 'react';

/**
 * Size configurations using design tokens
 */
export const sizeStyles: Record<string, CSSProperties> = {
  default: {
    height: 'var(--spacing-10)',
    paddingLeft: 'var(--spacing-6)',
    paddingRight: 'var(--spacing-6)',
    paddingTop: 'var(--spacing-2)',
    paddingBottom: 'var(--spacing-2)',
    fontSize: 'var(--typography-font-size-sm)',
    borderRadius: 'var(--border-radius-lg)',
  },
  sm: {
    height: 'var(--spacing-8)',
    paddingLeft: 'var(--spacing-4)',
    paddingRight: 'var(--spacing-4)',
    paddingTop: 'var(--spacing-1)',
    paddingBottom: 'var(--spacing-1)',
    fontSize: 'var(--typography-font-size-xs)',
    borderRadius: 'var(--border-radius-md)',
  },
  lg: {
    height: 'var(--spacing-12)',
    paddingLeft: 'var(--spacing-8)',
    paddingRight: 'var(--spacing-8)',
    paddingTop: 'var(--spacing-3)',
    paddingBottom: 'var(--spacing-3)',
    fontSize: 'var(--typography-font-size-base)',
    borderRadius: 'var(--border-radius-lg)',
  },
  icon: {
    height: 'var(--spacing-10)',
    width: 'var(--spacing-10)',
    padding: 'var(--spacing-2)',
    borderRadius: 'var(--border-radius-md)',
  },
};

/**
 * Variant configurations using design tokens
 */
export const variantStyles: Record<string, CSSProperties> = {
  default: {
    background: 'var(--gradient-btn-primary)',
    color: 'var(--color-void)',
    boxShadow: 'var(--shadow-btn-primary)',
  },
  primary: {
    background: 'var(--gradient-btn-primary)',
    color: 'var(--color-void)',
    boxShadow: 'var(--shadow-btn-primary)',
  },
  destructive: {
    background: 'var(--gradient-btn-alert)',
    color: 'white',
    boxShadow: 'var(--shadow-btn-accent)',
  },
  alert: {
    background: 'var(--gradient-btn-alert)',
    color: 'white',
    boxShadow: 'var(--shadow-btn-accent)',
  },
  trust: {
    background: 'var(--gradient-btn-trust)',
    color: 'white',
    boxShadow: 'var(--shadow-btn-accent)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border-default)',
    boxShadow: 'var(--shadow-sm)',
  },
  secondary: {
    background: 'var(--gradient-btn-secondary)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border-default)',
    boxShadow: 'var(--shadow-card)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  link: {
    background: 'transparent',
    color: 'var(--color-brand-primary)',
    padding: '0',
  },
};

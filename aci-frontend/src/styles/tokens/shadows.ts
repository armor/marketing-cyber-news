/**
 * Shadow Design Tokens
 *
 * Elevation levels and focus states using CSS custom properties.
 * DO NOT hardcode box-shadow values in components - use these tokens.
 *
 * Usage:
 *   import { shadows } from '@/styles/tokens/shadows';
 *   const Card = styled.div`
 *     box-shadow: ${shadows.md};
 *   `;
 */

export interface ShadowTokens {
  readonly none: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
  readonly focus: string;
  readonly focusError: string;
}

export const shadows: ShadowTokens = {
  /** No shadow */
  none: 'var(--shadow-none)',

  /** Subtle shadow for cards and small elevated elements */
  sm: 'var(--shadow-sm)',

  /** Medium elevation for cards and panels */
  md: 'var(--shadow-md)',

  /** High elevation for modals and dropdowns */
  lg: 'var(--shadow-lg)',

  /** Highest elevation for tooltips and popovers */
  xl: 'var(--shadow-xl)',

  /** Focus ring shadow for interactive elements */
  focus: 'var(--shadow-focus)',

  /** Focus ring shadow for error state */
  focusError: 'var(--shadow-focus-error)',
} as const;

export type ShadowToken = keyof ShadowTokens;

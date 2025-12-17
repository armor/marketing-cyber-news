/**
 * Border Design Tokens
 *
 * All border values MUST reference CSS custom properties (var(--border-*))
 * to ensure consistent theming and dark mode support.
 *
 * NEVER hardcode border values in components - always use these tokens.
 */

/**
 * Border Radius Scale
 * Defines corner rounding values for UI elements
 */
export interface BorderRadiusScale {
  readonly none: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
  readonly full: string;
}

/**
 * Border Width Scale
 * Defines stroke thickness values for borders and dividers
 */
export interface BorderWidthScale {
  readonly none: string;
  readonly thin: string;
  readonly medium: string;
  readonly thick: string;
}

/**
 * Border Tokens Structure
 */
export interface BorderTokens {
  readonly radius: BorderRadiusScale;
  readonly width: BorderWidthScale;
}

/**
 * Border Radius Tokens
 * Reference CSS custom properties for theme-aware corner rounding
 */
export const borderRadius: BorderRadiusScale = {
  none: 'var(--border-radius-none)',
  sm: 'var(--border-radius-sm)',
  md: 'var(--border-radius-md)',
  lg: 'var(--border-radius-lg)',
  xl: 'var(--border-radius-xl)',
  full: 'var(--border-radius-full)',
} as const;

/**
 * Border Width Tokens
 * Reference CSS custom properties for theme-aware border thickness
 */
export const borderWidth: BorderWidthScale = {
  none: 'var(--border-width-none)',
  thin: 'var(--border-width-thin)',
  medium: 'var(--border-width-medium)',
  thick: 'var(--border-width-thick)',
} as const;

/**
 * Unified Border Tokens Export
 * Use this object to access all border-related design tokens
 *
 * @example
 * ```tsx
 * import { borders } from '@/styles/tokens/borders';
 *
 * const Button = styled.button`
 *   border-radius: ${borders.radius.md};
 *   border-width: ${borders.width.thin};
 * `;
 * ```
 */
export const borders: BorderTokens = {
  radius: borderRadius,
  width: borderWidth,
} as const;

/**
 * Type Guards for Border Tokens
 */
export function isBorderRadius(value: string): value is keyof BorderRadiusScale {
  return value in borderRadius;
}

export function isBorderWidth(value: string): value is keyof BorderWidthScale {
  return value in borderWidth;
}

/**
 * Helper Types for Component Props
 */
export type BorderRadiusKey = keyof BorderRadiusScale;
export type BorderWidthKey = keyof BorderWidthScale;

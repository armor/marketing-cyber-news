/**
 * Design Tokens Index
 *
 * Unified design token system for NEXUS Frontend Dashboard.
 * All visual design values (colors, spacing, typography, motion, shadows, borders)
 * are tokenized here for consistent theming and easy reskinning.
 *
 * CRITICAL: NO HARDCODED CSS VALUES allowed outside this token system.
 */

// Re-export all token modules
export * from './colors';
export * from './motion';
export * from './typography';
export * from './spacing';
export * from './shadows';
export * from './borders';

// Import token modules for unified object
import { colors, type ColorTokens } from './colors';
import { motion, type MotionTokens } from './motion';
import { typography, type TypographyTokens } from './typography';
import { spacingTokens } from './spacing';
import type { SpacingTokens } from './spacing';
import { shadows, type ShadowTokens } from './shadows';
import { borders, type BorderTokens } from './borders';

/**
 * Unified Design Token Interface
 *
 * Complete type definition for all design tokens in the system.
 */
export interface DesignTokens {
  readonly colors: ColorTokens;
  readonly motion: MotionTokens;
  readonly typography: TypographyTokens;
  readonly spacing: SpacingTokens;
  readonly shadows: ShadowTokens;
  readonly borders: BorderTokens;
}

/**
 * Unified Design Tokens Object
 *
 * Central export containing all design tokens.
 * Use this for programmatic access to token values.
 *
 * @example
 * ```tsx
 * import { tokens } from '@/styles/tokens';
 *
 * const Button = styled.button`
 *   background: ${tokens.colors.primary[600]};
 *   padding: ${tokens.spacing.md};
 *   border-radius: ${tokens.borders.radius.md};
 *   transition: all ${tokens.motion.duration.fast} ${tokens.motion.ease.default};
 * `;
 * ```
 */
export const tokens: DesignTokens = {
  colors,
  motion,
  typography,
  spacing: spacingTokens,
  shadows,
  borders,
} as const;

/**
 * Token Access Helpers
 *
 * Utility functions for accessing tokens with fallbacks and validation.
 */

/**
 * Get a color token with fallback
 *
 * @param path - Dot-notation path to color (e.g., 'primary.600')
 * @param fallback - Fallback color if path not found
 * @returns Color value or fallback
 */
export function getColorToken(path: string, fallback = '#000000'): string {
  const keys = path.split('.');
  let value: ColorTokens | string = tokens.colors;

  for (const key of keys) {
    if (typeof value === 'object' && value !== null && key in value) {
      value = (value as Record<string, ColorTokens | string>)[key];
    } else {
      return fallback;
    }
  }

  return typeof value === 'string' ? value : fallback;
}

/**
 * Get a spacing token with fallback
 *
 * @param key - Spacing key (e.g., 'md', 'lg')
 * @param fallback - Fallback value if key not found
 * @returns Spacing value or fallback
 */
export function getSpacingToken(key: string, fallback = '1rem'): string {
  const spacingObj = tokens.spacing as Record<string, unknown>;
  if (key in spacingObj) {
    const value = spacingObj[key];
    return typeof value === 'string' ? value : fallback;
  }
  return fallback;
}

/**
 * Get a motion duration token with fallback
 *
 * @param key - Duration key (e.g., 'fast', 'normal')
 * @param fallback - Fallback value if key not found
 * @returns Duration value or fallback
 */
export function getMotionDurationToken(key: string, fallback = '200ms'): string {
  if (key in tokens.motion.duration) {
    return tokens.motion.duration[key as keyof typeof tokens.motion.duration];
  }
  return fallback;
}

/**
 * CSS Variable Generator
 *
 * Generates CSS custom properties from tokens.
 * Use this to inject tokens into the :root selector.
 *
 * @returns CSS custom property declarations
 */
export function generateCSSVariables(): string {
  const cssVars: string[] = [
    '/* Design Token CSS Variables */',
    '',
    '/* Colors */',
  ];

  // Generate color variables
  const generateColorVars = (obj: Record<string, unknown>, prefix = 'color'): void => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        cssVars.push(`  --${prefix}-${key}: ${value};`);
      } else if (typeof value === 'object' && value !== null) {
        generateColorVars(value as Record<string, unknown>, `${prefix}-${key}`);
      }
    }
  };

  generateColorVars(tokens.colors);

  cssVars.push('', '/* Spacing */');
  for (const [key, value] of Object.entries(tokens.spacing)) {
    cssVars.push(`  --spacing-${key}: ${value};`);
  }

  cssVars.push('', '/* Motion */');
  for (const [key, value] of Object.entries(tokens.motion.duration)) {
    cssVars.push(`  --motion-duration-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(tokens.motion.easing)) {
    cssVars.push(`  --motion-easing-${key}: ${value};`);
  }

  cssVars.push('', '/* Typography */');
  for (const [key, value] of Object.entries(tokens.typography.fontSize)) {
    cssVars.push(`  --font-size-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(tokens.typography.fontWeight)) {
    cssVars.push(`  --font-weight-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(tokens.typography.lineHeight)) {
    cssVars.push(`  --line-height-${key}: ${value};`);
  }

  cssVars.push('', '/* Shadows */');
  for (const [key, value] of Object.entries(tokens.shadows)) {
    cssVars.push(`  --shadow-${key}: ${value};`);
  }

  cssVars.push('', '/* Borders */');
  for (const [key, value] of Object.entries(tokens.borders.radius)) {
    cssVars.push(`  --border-radius-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(tokens.borders.width)) {
    cssVars.push(`  --border-width-${key}: ${value};`);
  }

  return cssVars.join('\n');
}

/**
 * Default Export
 *
 * Export the unified tokens object as default for convenience.
 */
export default tokens;

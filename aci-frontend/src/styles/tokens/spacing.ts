/**
 * Spacing Design Tokens
 *
 * All spacing values reference CSS custom properties defined in global CSS.
 * NEVER use hardcoded px/rem values - always use these tokens.
 */

/**
 * Base spacing scale following 4px/0.25rem baseline grid
 */
export const spacing = {
  0: 'var(--spacing-0)',    // 0
  1: 'var(--spacing-1)',    // 0.25rem / 4px
  2: 'var(--spacing-2)',    // 0.5rem / 8px
  3: 'var(--spacing-3)',    // 0.75rem / 12px
  4: 'var(--spacing-4)',    // 1rem / 16px
  5: 'var(--spacing-5)',    // 1.25rem / 20px
  6: 'var(--spacing-6)',    // 1.5rem / 24px
  8: 'var(--spacing-8)',    // 2rem / 32px
  10: 'var(--spacing-10)',  // 2.5rem / 40px
  12: 'var(--spacing-12)',  // 3rem / 48px
  16: 'var(--spacing-16)',  // 4rem / 64px
  20: 'var(--spacing-20)',  // 5rem / 80px
  24: 'var(--spacing-24)',  // 6rem / 96px
  32: 'var(--spacing-32)',  // 8rem / 128px
  40: 'var(--spacing-40)',  // 10rem / 160px
  48: 'var(--spacing-48)',  // 12rem / 192px
  64: 'var(--spacing-64)',  // 16rem / 256px
} as const;

/**
 * Semantic spacing for internal component padding
 */
export const componentSpacing = {
  xs: 'var(--spacing-component-xs)',  // 0.5rem / 8px
  sm: 'var(--spacing-component-sm)',  // 0.75rem / 12px
  md: 'var(--spacing-component-md)',  // 1rem / 16px
  lg: 'var(--spacing-component-lg)',  // 1.5rem / 24px
  xl: 'var(--spacing-component-xl)',  // 2rem / 32px
} as const;

/**
 * Semantic spacing for page-level layouts
 */
export const layoutSpacing = {
  page: 'var(--spacing-layout-page)',      // 2rem / 32px
  section: 'var(--spacing-layout-section)', // 3rem / 48px
  card: 'var(--spacing-layout-card)',      // 1.5rem / 24px
} as const;

/**
 * Semantic spacing for flex/grid gaps
 */
export const gapSpacing = {
  xs: 'var(--spacing-gap-xs)',  // 0.5rem / 8px
  sm: 'var(--spacing-gap-sm)',  // 0.75rem / 12px
  md: 'var(--spacing-gap-md)',  // 1rem / 16px
  lg: 'var(--spacing-gap-lg)',  // 1.5rem / 24px
} as const;

/**
 * Combined spacing tokens export
 */
export const spacingTokens = {
  base: spacing,
  component: componentSpacing,
  layout: layoutSpacing,
  gap: gapSpacing,
} as const;

/**
 * SpacingTokens type export
 */
export type SpacingTokens = typeof spacingTokens;

/**
 * TypeScript types for spacing tokens
 */
export type SpacingScale = keyof typeof spacing;
export type ComponentSpacing = keyof typeof componentSpacing;
export type LayoutSpacing = keyof typeof layoutSpacing;
export type GapSpacing = keyof typeof gapSpacing;

export type SpacingValue =
  | typeof spacing[SpacingScale]
  | typeof componentSpacing[ComponentSpacing]
  | typeof layoutSpacing[LayoutSpacing]
  | typeof gapSpacing[GapSpacing];

/**
 * Type guard to check if a value is a valid spacing token
 */
export function isSpacingValue(value: unknown): value is SpacingValue {
  if (typeof value !== 'string') {
    return false;
  }

  return value.startsWith('var(--spacing-');
}

/**
 * Helper to get spacing value with type safety
 */
export function getSpacing(scale: SpacingScale): string {
  return spacing[scale];
}

export function getComponentSpacing(size: ComponentSpacing): string {
  return componentSpacing[size];
}

export function getLayoutSpacing(area: LayoutSpacing): string {
  return layoutSpacing[area];
}

export function getGapSpacing(size: GapSpacing): string {
  return gapSpacing[size];
}

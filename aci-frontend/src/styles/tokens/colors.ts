/**
 * Color Design Tokens for NEXUS Cybersecurity Dashboard
 * Fortified Horizon Theme
 *
 * All values reference CSS custom properties (var(--color-*)).
 * NEVER hardcode hex/rgb values in components - use these tokens.
 *
 * The actual color values are defined in the global CSS file
 * and support automatic dark mode theming.
 */

export interface ColorTokens {
  readonly [key: string]: Record<string, string> | string;
  brand: {
    primary: string;
    secondary: string;
    accent: string;
  };
  severity: {
    critical: string;
    high: string;
    medium: string;
    low: string;
  };
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  background: {
    primary: string;
    secondary: string;
    elevated: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: {
    default: string;
    focus: string;
    error: string;
  };
  // Fortified Horizon accent colors
  accent: {
    armorBlue: string;
    shieldCyan: string;
    signalOrange: string;
    compliant: string;
    critical: string;
    warning: string;
    success: string;
  };
  // Fortified Horizon grayscale palette
  fortifiedHorizon: {
    // Light theme background scale
    cream: string;
    bone: string;
    pearl: string;
    stone: string;
    pebble: string;
    dove: string;
    cement: string;
    // Foreground scale
    silver: string;
    ash: string;
    slate: string;
    steel: string;
    iron: string;
    graphite: string;
    charcoal: string;
    black: string;
    // Dark theme deep blacks
    void: string;
    abyss: string;
    obsidian: string;
    onyx: string;
    coal: string;
    // Dark theme foreground
    pewter: string;
    mist: string;
    cloud: string;
    snow: string;
  };
}

/**
 * Color design tokens referencing CSS custom properties.
 * Use these tokens throughout the application for consistent theming.
 *
 * @example
 * import { colors } from '@/styles/tokens/colors';
 *
 * const Button = styled.button`
 *   background: ${colors.brand.primary};
 *   color: ${colors.text.primary};
 *   border: 1px solid ${colors.border.default};
 * `;
 */
export const colors: Readonly<ColorTokens> = {
  brand: {
    primary: 'var(--color-brand-primary)',
    secondary: 'var(--color-brand-secondary)',
    accent: 'var(--color-brand-accent)',
  },
  severity: {
    critical: 'var(--color-severity-critical)',
    high: 'var(--color-severity-high)',
    medium: 'var(--color-severity-medium)',
    low: 'var(--color-severity-low)',
  },
  semantic: {
    success: 'var(--color-semantic-success)',
    warning: 'var(--color-semantic-warning)',
    error: 'var(--color-semantic-error)',
    info: 'var(--color-semantic-info)',
  },
  background: {
    primary: 'var(--color-bg-primary)',
    secondary: 'var(--color-bg-secondary)',
    elevated: 'var(--color-bg-elevated)',
  },
  text: {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    muted: 'var(--color-text-muted)',
  },
  border: {
    default: 'var(--color-border-default)',
    focus: 'var(--color-border-focus)',
    error: 'var(--color-border-error)',
  },
  // Fortified Horizon accent colors
  accent: {
    armorBlue: 'var(--color-armor-blue)',
    shieldCyan: 'var(--color-shield-cyan)',
    signalOrange: 'var(--color-signal-orange)',
    compliant: 'var(--color-compliant)',
    critical: 'var(--color-critical)',
    warning: 'var(--color-warning)',
    success: 'var(--color-success)',
  },
  // Fortified Horizon grayscale palette
  fortifiedHorizon: {
    // Light theme background scale
    cream: 'var(--color-cream)',
    bone: 'var(--color-bone)',
    pearl: 'var(--color-pearl)',
    stone: 'var(--color-stone)',
    pebble: 'var(--color-pebble)',
    dove: 'var(--color-dove)',
    cement: 'var(--color-cement)',
    // Foreground scale
    silver: 'var(--color-silver)',
    ash: 'var(--color-ash)',
    slate: 'var(--color-slate)',
    steel: 'var(--color-steel)',
    iron: 'var(--color-iron)',
    graphite: 'var(--color-graphite)',
    charcoal: 'var(--color-charcoal)',
    black: 'var(--color-black)',
    // Dark theme deep blacks
    void: 'var(--color-void)',
    abyss: 'var(--color-abyss)',
    obsidian: 'var(--color-obsidian)',
    onyx: 'var(--color-onyx)',
    coal: 'var(--color-coal)',
    // Dark theme foreground
    pewter: 'var(--color-pewter)',
    mist: 'var(--color-mist)',
    cloud: 'var(--color-cloud)',
    snow: 'var(--color-snow)',
  },
} as const;

/**
 * Type-safe color token keys for runtime validation
 */
export type ColorCategory = keyof ColorTokens;
export type BrandColor = keyof ColorTokens['brand'];
export type SeverityColor = keyof ColorTokens['severity'];
export type SemanticColor = keyof ColorTokens['semantic'];
export type BackgroundColor = keyof ColorTokens['background'];
export type TextColor = keyof ColorTokens['text'];
export type BorderColor = keyof ColorTokens['border'];

/**
 * Helper function to get color token value
 * @param category - Color category (brand, severity, etc.)
 * @param variant - Specific color within category
 * @returns CSS custom property reference
 */
export function getColorToken(
  category: ColorCategory,
  variant: string
): string {
  const categoryColors = colors[category] as Record<string, string>;
  return categoryColors[variant] ?? colors.text.primary;
}

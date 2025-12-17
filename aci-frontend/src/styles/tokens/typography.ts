/**
 * Typography Design Tokens
 *
 * All typography values use CSS custom properties (var(--typography-*)).
 * Never hardcode font-size, font-weight, line-height, or letter-spacing in components.
 */

export interface TypographyTokens {
  readonly fontFamily: {
    readonly sans: string;
    readonly mono: string;
  };
  readonly fontSize: {
    readonly xs: string;
    readonly sm: string;
    readonly base: string;
    readonly lg: string;
    readonly xl: string;
    readonly '2xl': string;
    readonly '3xl': string;
    readonly '4xl': string;
  };
  readonly fontWeight: {
    readonly normal: string;
    readonly medium: string;
    readonly semibold: string;
    readonly bold: string;
  };
  readonly lineHeight: {
    readonly tight: string;
    readonly normal: string;
    readonly relaxed: string;
  };
  readonly letterSpacing: {
    readonly tight: string;
    readonly normal: string;
    readonly wide: string;
  };
}

export const typography: TypographyTokens = {
  fontFamily: {
    sans: 'var(--typography-font-family-sans)',
    mono: 'var(--typography-font-family-mono)',
  },
  fontSize: {
    xs: 'var(--typography-font-size-xs)',
    sm: 'var(--typography-font-size-sm)',
    base: 'var(--typography-font-size-base)',
    lg: 'var(--typography-font-size-lg)',
    xl: 'var(--typography-font-size-xl)',
    '2xl': 'var(--typography-font-size-2xl)',
    '3xl': 'var(--typography-font-size-3xl)',
    '4xl': 'var(--typography-font-size-4xl)',
  },
  fontWeight: {
    normal: 'var(--typography-font-weight-normal)',
    medium: 'var(--typography-font-weight-medium)',
    semibold: 'var(--typography-font-weight-semibold)',
    bold: 'var(--typography-font-weight-bold)',
  },
  lineHeight: {
    tight: 'var(--typography-line-height-tight)',
    normal: 'var(--typography-line-height-normal)',
    relaxed: 'var(--typography-line-height-relaxed)',
  },
  letterSpacing: {
    tight: 'var(--typography-letter-spacing-tight)',
    normal: 'var(--typography-letter-spacing-normal)',
    wide: 'var(--typography-letter-spacing-wide)',
  },
} as const;

// Type exports for consumer convenience
export type FontFamily = keyof typeof typography.fontFamily;
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type LineHeight = keyof typeof typography.lineHeight;
export type LetterSpacing = keyof typeof typography.letterSpacing;

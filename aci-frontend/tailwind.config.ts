import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS Configuration with Design Token Integration
 *
 * This configuration extends Tailwind's default theme with design tokens
 * that reference CSS custom properties (var(--*)) defined in the global stylesheet.
 *
 * NEVER use hardcoded values (hex colors, px values, etc.) in this file.
 * ALL values MUST reference CSS custom properties for theme consistency.
 *
 * Constitution Principle IX Compliance:
 * - Zero hardcoded hex values
 * - Zero hardcoded timing values
 * - Zero hardcoded spacing values
 * - All values reference centralized design tokens
 */

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Color tokens mapped to CSS custom properties
      colors: {
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
          DEFAULT: 'var(--color-border-default)',
          focus: 'var(--color-border-focus)',
          error: 'var(--color-border-error)',
        },
        // Fortified Horizon accent colors
        'armor-blue': 'var(--color-armor-blue)',
        'shield-cyan': 'var(--color-shield-cyan)',
        'signal-orange': 'var(--color-signal-orange)',
        compliant: 'var(--color-compliant)',
        critical: 'var(--color-critical)',
        warning: 'var(--color-warning)',
        success: 'var(--color-success)',
        // Fortified Horizon background scale
        fh: {
          // Light theme / warm grays
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
      },

      // Spacing scale (4px baseline grid)
      spacing: {
        0: 'var(--spacing-0)',
        1: 'var(--spacing-1)',
        2: 'var(--spacing-2)',
        3: 'var(--spacing-3)',
        4: 'var(--spacing-4)',
        5: 'var(--spacing-5)',
        6: 'var(--spacing-6)',
        8: 'var(--spacing-8)',
        10: 'var(--spacing-10)',
        12: 'var(--spacing-12)',
        16: 'var(--spacing-16)',
        20: 'var(--spacing-20)',
        24: 'var(--spacing-24)',
        32: 'var(--spacing-32)',
        40: 'var(--spacing-40)',
        48: 'var(--spacing-48)',
        64: 'var(--spacing-64)',
        // Semantic spacing aliases
        'component-xs': 'var(--spacing-component-xs)',
        'component-sm': 'var(--spacing-component-sm)',
        'component-md': 'var(--spacing-component-md)',
        'component-lg': 'var(--spacing-component-lg)',
        'component-xl': 'var(--spacing-component-xl)',
        'layout-page': 'var(--spacing-layout-page)',
        'layout-section': 'var(--spacing-layout-section)',
        'layout-card': 'var(--spacing-layout-card)',
      },

      // Gap spacing for flex/grid layouts
      gap: {
        xs: 'var(--spacing-gap-xs)',
        sm: 'var(--spacing-gap-sm)',
        md: 'var(--spacing-gap-md)',
        lg: 'var(--spacing-gap-lg)',
      },

      // Border radius scale
      borderRadius: {
        none: 'var(--border-radius-none)',
        sm: 'var(--border-radius-sm)',
        md: 'var(--border-radius-md)',
        lg: 'var(--border-radius-lg)',
        xl: 'var(--border-radius-xl)',
        full: 'var(--border-radius-full)',
      },

      // Border width scale
      borderWidth: {
        0: 'var(--border-width-none)',
        DEFAULT: 'var(--border-width-thin)',
        thin: 'var(--border-width-thin)',
        medium: 'var(--border-width-medium)',
        thick: 'var(--border-width-thick)',
      },

      // Elevation shadows (includes Fortified Horizon layered shadows)
      boxShadow: {
        none: 'var(--shadow-none)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        focus: 'var(--shadow-focus)',
        'focus-error': 'var(--shadow-focus-error)',
        // Fortified Horizon layered shadows
        card: 'var(--shadow-card)',
        hero: 'var(--shadow-hero)',
        'btn-primary': 'var(--shadow-btn-primary)',
        'btn-primary-hover': 'var(--shadow-btn-primary-hover)',
        'btn-accent': 'var(--shadow-btn-accent)',
        'btn-accent-hover': 'var(--shadow-btn-accent-hover)',
        badge: 'var(--shadow-badge)',
        icon: 'var(--shadow-icon)',
        'progress-track': 'var(--shadow-progress-track)',
        'progress-fill': 'var(--shadow-progress-fill)',
      },

      // Fortified Horizon gradient backgrounds
      backgroundImage: {
        'gradient-page': 'var(--gradient-page)',
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-diagonal': 'var(--gradient-diagonal)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-component': 'var(--gradient-component)',
        'gradient-panel-header': 'var(--gradient-panel-header)',
        'gradient-dashboard-body': 'var(--gradient-dashboard-body)',
        'gradient-btn-primary': 'var(--gradient-btn-primary)',
        'gradient-btn-secondary': 'var(--gradient-btn-secondary)',
        'gradient-btn-alert': 'var(--gradient-btn-alert)',
        'gradient-btn-trust': 'var(--gradient-btn-trust)',
        'gradient-badge-neutral': 'var(--gradient-badge-neutral)',
        'gradient-badge-critical': 'var(--gradient-badge-critical)',
        'gradient-badge-warning': 'var(--gradient-badge-warning)',
        'gradient-badge-success': 'var(--gradient-badge-success)',
        'gradient-badge-info': 'var(--gradient-badge-info)',
        'gradient-icon-threat': 'var(--gradient-icon-threat)',
        'gradient-icon-warning': 'var(--gradient-icon-warning)',
        'gradient-icon-success': 'var(--gradient-icon-success)',
        'gradient-icon-neutral': 'var(--gradient-icon-neutral)',
        'gradient-progress-default': 'var(--gradient-progress-default)',
        'gradient-progress-success': 'var(--gradient-progress-success)',
        'gradient-progress-warning': 'var(--gradient-progress-warning)',
        'gradient-progress-track': 'var(--gradient-progress-track)',
      },

      // Motion durations
      transitionDuration: {
        instant: 'var(--motion-duration-instant)',
        fast: 'var(--motion-duration-fast)',
        normal: 'var(--motion-duration-normal)',
        slow: 'var(--motion-duration-slow)',
      },

      // Motion easing functions
      transitionTimingFunction: {
        DEFAULT: 'var(--motion-easing-default)',
        in: 'var(--motion-easing-in)',
        out: 'var(--motion-easing-out)',
        'in-out': 'var(--motion-easing-in-out)',
        spring: 'var(--motion-easing-spring)',
      },

      // Typography - Font families
      fontFamily: {
        sans: 'var(--typography-font-family-sans)',
        mono: 'var(--typography-font-family-mono)',
      },

      // Typography - Font sizes
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

      // Typography - Font weights
      fontWeight: {
        normal: 'var(--typography-font-weight-normal)',
        medium: 'var(--typography-font-weight-medium)',
        semibold: 'var(--typography-font-weight-semibold)',
        bold: 'var(--typography-font-weight-bold)',
      },

      // Typography - Line heights
      lineHeight: {
        tight: 'var(--typography-line-height-tight)',
        normal: 'var(--typography-line-height-normal)',
        relaxed: 'var(--typography-line-height-relaxed)',
      },

      // Typography - Letter spacing
      letterSpacing: {
        tight: 'var(--typography-letter-spacing-tight)',
        normal: 'var(--typography-letter-spacing-normal)',
        wide: 'var(--typography-letter-spacing-wide)',
      },
    },
  },
  plugins: [],
};

export default config;

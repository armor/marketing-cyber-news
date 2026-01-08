import React from 'react';
/**
 * Footer Component
 *
 * Simple footer for NEXUS dashboard with copyright and branding.
 *
 * DESIGN TOKEN COMPLIANCE:
 * - All colors use Tailwind classes referencing CSS custom properties
 * - All spacing uses token-based spacing scale
 * - Zero hardcoded hex/px values
 *
 * @example
 * ```tsx
 * <Footer />
 * ```
 */

// ============================================================================
// Component
// ============================================================================

export function Footer(): React.ReactElement {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="w-full border-t"
      style={{
        paddingTop: 'var(--spacing-4)',
        paddingBottom: 'var(--spacing-4)',
        paddingLeft: 'var(--spacing-6)',
        paddingRight: 'var(--spacing-6)',
        background: 'var(--gradient-panel-header)',
        borderColor: 'var(--color-border-default)',
      }}
      role="contentinfo"
    >
      <div className="flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          NEXUS by Armor &copy; {currentYear}
        </p>
      </div>
    </footer>
  );
}

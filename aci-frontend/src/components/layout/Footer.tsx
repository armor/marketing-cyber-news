import React from 'react';
/**
 * Footer Component
 *
 * Simple footer for Armor Cyber News dashboard with copyright and branding.
 * Styled with Armor-Dash design patterns.
 *
 * DESIGN TOKEN COMPLIANCE:
 * - All colors use CSS custom properties from design tokens
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
      className="w-full border-t border-border py-4 text-center"
      style={{
        background: 'var(--gradient-panel-header)',
      }}
      role="contentinfo"
    >
      <p className="text-sm text-muted-foreground">
        &copy; {currentYear} Armor. All rights reserved.
      </p>
    </footer>
  );
}

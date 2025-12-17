/**
 * MainLayout Component
 *
 * Main wrapper component that combines Header, Sidebar, and Footer for NEXUS dashboard.
 * Manages responsive layout with collapsible sidebar on mobile.
 *
 * DESIGN TOKEN COMPLIANCE:
 * - All colors use Tailwind classes referencing CSS custom properties
 * - All spacing uses token-based spacing scale
 * - Zero hardcoded hex/px values
 *
 * @example
 * ```tsx
 * <MainLayout>
 *   <DashboardPage />
 * </MainLayout>
 * ```
 */

import { useState, type ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

// ============================================================================
// Types
// ============================================================================

interface MainLayoutProps {
  /** Page content to render in main area */
  children: ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export function MainLayout({ children }: MainLayoutProps): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * Toggle sidebar (used by mobile hamburger menu)
   */
  const handleMenuToggle = (): void => {
    setSidebarOpen((prev) => !prev);
  };

  /**
   * Close sidebar (used when clicking outside or nav item)
   */
  const handleSidebarClose = (): void => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed header at top */}
      <Header onMenuToggle={handleMenuToggle} />

      {/* Main content wrapper with sidebar */}
      <div className="flex flex-1" style={{ paddingTop: 'var(--layout-header-height)' }}>
        {/* Sidebar - hidden on mobile unless toggled */}
        <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

        {/* Main content area with scrolling */}
        <main
          className="flex-1 flex flex-col lg:ml-64 transition-all"
          style={{
            minHeight: 'calc(100vh - var(--layout-header-height))',
            transitionDuration: 'var(--motion-duration-normal)',
          }}
          role="main"
        >
          {/* Page content with padding using design tokens */}
          <div
            className="flex-1 overflow-y-auto"
            style={{
              padding: 'var(--spacing-layout-page)'
            }}
          >
            {children}
          </div>

          {/* Footer at bottom of content */}
          <Footer />
        </main>
      </div>
    </div>
  );
}

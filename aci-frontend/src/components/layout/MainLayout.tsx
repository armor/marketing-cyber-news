/**
 * MainLayout Component
 *
 * Main wrapper component that combines Header, Sidebar, and Footer for NEXUS dashboard.
 * Layout structure:
 * - Full-width header at top (sticky)
 * - Sidebar + content area below header
 *
 * @example
 * ```tsx
 * <MainLayout>
 *   <DashboardPage />
 * </MainLayout>
 * ```
 */

import { type ReactNode } from 'react';
import { Header } from './Header';
import { AppSidebar } from './AppSidebar';
import { Footer } from './Footer';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

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
  return (
    <div data-theme="dark" className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header at top - full width, fixed height */}
      <header
        className="w-full h-14 flex-shrink-0 flex items-center px-4"
        style={{
          background: 'var(--gradient-panel-header)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border-default)',
          zIndex: 50,
        }}
      >
        <Header />
      </header>

      {/* Content area - fills remaining viewport height */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="flex-1 overflow-hidden">
            {/* Main content area - scrollable */}
            <div className="h-full flex flex-col" role="main">
              <div
                className="flex-1 overflow-y-auto"
                style={{
                  background: 'var(--gradient-page)',
                  padding: 'var(--spacing-layout-page)',
                }}
              >
                {children}
              </div>
              <Footer />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}

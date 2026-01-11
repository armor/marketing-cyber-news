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
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

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
    <div data-theme="dark" className="min-h-screen flex flex-col bg-background">
      {/* Full-width Header at top - sticky */}
      <header
        className="sticky top-0 z-50 flex shrink-0 items-center h-14 px-4 gap-3"
        style={{
          backgroundColor: 'rgba(10, 10, 16, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Header />
      </header>

      {/* Sidebar + Content area below header */}
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* Sidebar trigger row */}
          <div
            className="flex shrink-0 items-center h-10 gap-2 px-4"
            style={{
              backgroundColor: 'rgba(10, 10, 16, 0.6)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-xs text-muted-foreground">Navigation</span>
          </div>

          {/* Main content area */}
          <main className="flex-1 flex flex-col" role="main">
            <div
              className="flex-1 overflow-y-auto"
              style={{
                background: 'var(--gradient-page)',
                padding: 'var(--spacing-layout-page)',
              }}
            >
              <div
                style={{
                  maxWidth: '1400px',
                  margin: '0 auto',
                }}
              >
                {children}
              </div>
            </div>
            <Footer />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

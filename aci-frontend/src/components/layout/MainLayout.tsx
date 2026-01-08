/**
 * MainLayout Component
 *
 * Main wrapper component that combines Header, Sidebar, and Footer for NEXUS dashboard.
 * Uses MVPBlocks SidebarProvider for collapsible sidebar state management.
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header with sidebar trigger */}
        <header
          className="flex shrink-0 items-center"
          style={{
            height: 'var(--spacing-16)',
            gap: 'var(--spacing-2)',
            borderBottom: '1px solid var(--color-border-default)',
            paddingLeft: 'var(--spacing-4)',
            paddingRight: 'var(--spacing-4)',
            background: 'var(--gradient-panel-header)',
          }}
        >
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Header />
        </header>

        {/* Main content area */}
        <main className="flex-1 flex flex-col" role="main">
          <div
            className="flex-1 overflow-y-auto"
            style={{
              padding: 'var(--spacing-layout-page)',
            }}
          >
            {children}
          </div>
          <Footer />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

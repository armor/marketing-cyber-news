/**
 * App Component
 *
 * Root application component with routing configuration.
 * Sets up providers (Auth, QueryClient) and defines all application routes.
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/stores/AuthContext';
import { queryClient } from '@/services/api/queryClient';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { PublicRoute } from '@/components/layout/PublicRoute';
import { MainLayout } from '@/components/layout/MainLayout';

// ============================================================================
// Lazy-loaded Pages
// ============================================================================

// Public pages
const LoginPage = lazy(() =>
  import('@/pages/Login').then((module) => ({ default: module.Login }))
);
const RegisterPage = lazy(() =>
  import('@/pages/Register').then((module) => ({ default: module.Register }))
);

// Protected pages
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
const BookmarksPage = lazy(() =>
  import('@/pages/Bookmarks').then((module) => ({ default: module.Bookmarks }))
);
const ThreatsPage = lazy(() =>
  import('@/pages/ThreatsPage').then((module) => ({ default: module.ThreatsPage }))
);
const ThreatDetailPage = lazy(() =>
  import('@/pages/ThreatDetailPage').then((module) => ({ default: module.ThreatDetailPage }))
);
const ApprovalPage = lazy(() =>
  import('@/pages/ApprovalPage').then((module) => ({ default: module.ApprovalPage }))
);
const ArticleDetailPage = lazy(() =>
  import('@/pages/ArticleDetailPage').then((module) => ({ default: module.ArticleDetailPage }))
);
const NewsletterConfigPage = lazy(() =>
  import('@/pages/NewsletterConfigPage').then((module) => ({ default: module.NewsletterConfigPage }))
);
const NewsletterPreviewPage = lazy(() =>
  import('@/pages/NewsletterPreviewPage').then((module) => ({ default: module.NewsletterPreviewPage }))
);
const NewsletterEditPage = lazy(() =>
  import('@/pages/NewsletterEditPage').then((module) => ({ default: module.NewsletterEditPage }))
);
const NewsletterAnalyticsPage = lazy(() =>
  import('@/pages/NewsletterAnalyticsPage').then((module) => ({ default: module.NewsletterAnalyticsPage }))
);
const NewsletterApprovalPage = lazy(() =>
  import('@/pages/NewsletterApprovalPage').then((module) => ({ default: module.NewsletterApprovalPage }))
);
const NewsletterContentPage = lazy(() =>
  import('@/pages/NewsletterContentPage').then((module) => ({ default: module.NewsletterContentPage }))
);
const ClaimsLibraryPage = lazy(() =>
  import('@/pages/ClaimsLibraryPage').then((module) => ({ default: module.ClaimsLibraryPage }))
);
const CalendarPage = lazy(() =>
  import('@/pages/CalendarPage').then((module) => ({ default: module.CalendarPage }))
);
const CampaignListPage = lazy(() =>
  import('@/pages/CampaignListPage').then((module) => ({ default: module.CampaignListPage }))
);
const CampaignBuilderPage = lazy(() =>
  import('@/pages/CampaignBuilderPage').then((module) => ({ default: module.CampaignBuilderPage }))
);
const CampaignDetailPage = lazy(() =>
  import('@/pages/CampaignDetailPage').then((module) => ({ default: module.CampaignDetailPage }))
);
const ChannelsPage = lazy(() =>
  import('@/pages/ChannelsPage').then((module) => ({ default: module.ChannelsPage }))
);
const ContentStudioPage = lazy(() =>
  import('@/pages/ContentStudioPage').then((module) => ({ default: module.ContentStudioPage }))
);
const BrandCenterPage = lazy(() => import('@/pages/BrandCenterPage'));
const MarketingAnalyticsPage = lazy(() =>
  import('@/pages/MarketingAnalyticsPage').then((module) => ({ default: module.MarketingAnalyticsPage }))
);
const CompetitorMonitorPage = lazy(() =>
  import('@/pages/CompetitorMonitorPage').then((module) => ({ default: module.CompetitorMonitorPage }))
);
const AnalyticsPage = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-4 text-[var(--color-text-muted)]">Threat analytics coming soon...</p>
      </div>
    ),
  })
);

// Placeholder components for pages not yet implemented

const AlertsPage = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="mt-4 text-[var(--color-text-muted)]">Alerts page coming soon...</p>
      </div>
    ),
  })
);

const AdminPage = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-4 text-[var(--color-text-muted)]">Admin page coming soon...</p>
      </div>
    ),
  })
);

const NotFoundPage = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-[var(--color-brand-primary)] mb-4">404</h1>
          <p className="text-xl text-[var(--color-text-muted)] mb-8">Page not found</p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-[var(--color-brand-primary)] text-[var(--color-bg-elevated)] rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    ),
  })
);

// ============================================================================
// Loading Fallback
// ============================================================================

const LOADING_CONFIG = {
  spinnerSize: 48,
  spinnerBorderWidth: 2,
} as const;

function LoadingFallback(): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
      <div
        className="animate-spin rounded-full border-t-[var(--color-brand-primary)] border-b-[var(--color-brand-primary)]"
        style={{
          height: `${LOADING_CONFIG.spinnerSize}px`,
          width: `${LOADING_CONFIG.spinnerSize}px`,
          borderWidth: `${LOADING_CONFIG.spinnerBorderWidth}px`,
        }}
        role="status"
        aria-label="Loading page..."
      />
    </div>
  );
}

// ============================================================================
// App Component
// ============================================================================

function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Public routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                }
              />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <DashboardPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/threats"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ThreatsPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/threats/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ThreatDetailPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookmarks"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                    <BookmarksPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approvals"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                    <ApprovalPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/articles/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ArticleDetailPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                    <AlertsPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                    <AnalyticsPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              {/* Newsletter Routes */}
              <Route path="/newsletter" element={<Navigate to="/newsletter/configs" replace />} />
              <Route
                path="/newsletter/configs"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <NewsletterConfigPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/newsletter/preview"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <NewsletterPreviewPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/newsletter/preview/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <NewsletterPreviewPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/newsletter/edit/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <NewsletterEditPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/newsletter/approval"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <NewsletterApprovalPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/newsletter/analytics"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <NewsletterAnalyticsPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/newsletter/content"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <NewsletterContentPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/newsletter/claims"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ClaimsLibraryPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CalendarPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              {/* Legacy newsletter routes - redirect to new paths */}
              <Route path="/newsletter-analytics" element={<Navigate to="/newsletter/analytics" replace />} />
              <Route path="/newsletter-config" element={<Navigate to="/newsletter/configs" replace />} />
              <Route path="/newsletters/preview/:id" element={<Navigate to="/newsletter/preview/:id" replace />} />
              {/* Campaign Routes */}
              <Route
                path="/campaigns"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CampaignListPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns/new"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CampaignBuilderPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CampaignDetailPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              {/* Channel Routes */}
              <Route
                path="/channels"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ChannelsPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              {/* Content Studio Route */}
              <Route
                path="/content-studio"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ContentStudioPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              {/* Brand Center Route */}
              <Route
                path="/brand-center"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <BrandCenterPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              {/* Marketing Analytics Route */}
              <Route
                path="/marketing/analytics"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <MarketingAnalyticsPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              {/* Competitor Monitoring Route */}
              <Route
                path="/campaigns/:campaignId/competitors"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CompetitorMonitorPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <MainLayout>
                    <AdminPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* 404 catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

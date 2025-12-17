/**
 * App Component
 *
 * Root application component with routing configuration.
 * Sets up providers (Auth, QueryClient) and defines all application routes.
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
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

const AnalyticsPage = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-4 text-[var(--color-text-muted)]">Analytics page coming soon...</p>
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
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

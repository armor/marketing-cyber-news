/**
 * ProtectedRoute Component
 *
 * Route guard that requires authentication. Redirects to login if not authenticated.
 * Optionally enforces role-based access control.
 *
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 *
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPage />
 * </ProtectedRoute>
 * ```
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/user';
import type { ReactNode } from 'react';

// ============================================================================
// Constants
// ============================================================================

const LOGIN_PATH = '/login' as const;

const LOADING_CONFIG = {
  spinnerBorderWidth: 2,
  spinnerSize: 48,
  backgroundColor: 'var(--color-bg-primary)',
} as const;

// ============================================================================
// Types
// ============================================================================

interface ProtectedRouteProps {
  readonly children: ReactNode;
  readonly requiredRole?: UserRole;
}

// ============================================================================
// Loading Component
// ============================================================================

function LoadingScreen(): React.ReactElement {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: LOADING_CONFIG.backgroundColor }}
    >
      <div
        className="animate-spin rounded-full border-t-primary border-b-primary"
        style={{
          height: `${LOADING_CONFIG.spinnerSize}px`,
          width: `${LOADING_CONFIG.spinnerSize}px`,
          borderWidth: `${LOADING_CONFIG.spinnerBorderWidth}px`,
        }}
        role="status"
        aria-label="Loading..."
      />
    </div>
  );
}

// ============================================================================
// ProtectedRoute Component
// ============================================================================

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps): React.ReactElement {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATH} replace />;
  }

  // Check role-based access if required
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

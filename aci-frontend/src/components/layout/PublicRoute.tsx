/**
 * PublicRoute Component
 *
 * Route guard for public pages (login, register).
 * Redirects to dashboard if user is already authenticated.
 *
 * @example
 * ```tsx
 * <PublicRoute>
 *   <LoginPage />
 * </PublicRoute>
 *
 * <PublicRoute>
 *   <RegisterPage />
 * </PublicRoute>
 * ```
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

// ============================================================================
// Constants
// ============================================================================

const DASHBOARD_PATH = '/dashboard' as const;

// ============================================================================
// Types
// ============================================================================

interface PublicRouteProps {
  readonly children: ReactNode;
}

// ============================================================================
// PublicRoute Component
// ============================================================================

export function PublicRoute({ children }: PublicRouteProps): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();

  // Don't redirect while loading to prevent flashing
  if (isLoading) {
    return <>{children}</>;
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to={DASHBOARD_PATH} replace />;
  }

  return <>{children}</>;
}

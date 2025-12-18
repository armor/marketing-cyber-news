/**
 * useAuth Hook
 *
 * Convenience hook for accessing authentication context with additional role-based helpers.
 * Primary way for components to access auth state and operations.
 *
 * @example
 * ```typescript
 * const { user, isAuthenticated, isAdmin, login, logout } = useAuth();
 *
 * if (isAdmin) {
 *   // Admin-only UI
 * }
 *
 * if (canWrite) {
 *   // Show edit buttons
 * }
 * ```
 */

import { useMemo } from 'react';
import { useAuthContext } from '@/stores/AuthContext';
import type { UserRole } from '@/types/user';

// ============================================================================
// Types
// ============================================================================

interface UseAuthReturn {
  readonly user: ReturnType<typeof useAuthContext>['user'];
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly login: ReturnType<typeof useAuthContext>['login'];
  readonly register: ReturnType<typeof useAuthContext>['register'];
  readonly logout: ReturnType<typeof useAuthContext>['logout'];
  readonly clearError: ReturnType<typeof useAuthContext>['clearError'];
  readonly isAdmin: boolean;
  readonly isAnalyst: boolean;
  readonly canWrite: boolean;
  hasRole: (role: UserRole) => boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access authentication state and operations with role-based helpers
 *
 * @returns {UseAuthReturn} Auth state and operations
 *
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): UseAuthReturn {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  } = useAuthContext();

  // Memoize role checks to avoid recalculation on every render
  const isAdmin = useMemo((): boolean => {
    return user?.role === 'admin' || user?.role === 'super_admin';
  }, [user?.role]);

  const isAnalyst = useMemo((): boolean => {
    return user?.role === 'analyst' || user?.role === 'admin';
  }, [user?.role]);

  const canWrite = useMemo((): boolean => {
    return isAdmin || isAnalyst;
  }, [isAdmin, isAnalyst]);

  /**
   * Check if user has specific role
   * @param role - Role to check
   * @returns true if user has the role
   */
  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    isAdmin,
    isAnalyst,
    canWrite,
    hasRole,
  };
}

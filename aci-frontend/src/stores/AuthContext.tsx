/**
 * Authentication Context Provider
 *
 * Manages authentication state and provides auth operations:
 * - Checks auth status on mount
 * - Provides login, register, logout functions
 * - Handles loading and error states
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { apiClient, ApiError, tokenStorage } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
} from '@/types/user';

// ============================================================================
// Types
// ============================================================================

interface AuthContextValue {
  readonly user: User | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface AuthProviderProps {
  readonly children: ReactNode;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check authentication status on mount
   */
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    // Skip auth check if no token is stored
    if (!tokenStorage.hasToken()) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get<ApiResponse<User>>('/users/me');
      setUser(response.data);
    } catch (err) {
      // Not authenticated or network error
      if (err instanceof ApiError && err.statusCode === 401) {
        // Clear invalid token
        tokenStorage.clearTokens();
        setUser(null);
      } else {
        console.error('Failed to check auth status:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to check authentication'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login with credentials
   */
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiClient.post<
          ApiResponse<{
            access_token: string;
            refresh_token: string;
            token_type: string;
            expires_in: number;
            user: User;
          }>
        >('/auth/login', credentials);

        // Save tokens to localStorage
        tokenStorage.setTokens(response.data.access_token, response.data.refresh_token);
        setUser(response.data.user);
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Login failed';

        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Register new user
   */
  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiClient.post<
          ApiResponse<{
            access_token: string;
            refresh_token: string;
            expires_at: string;
            user: User;
          }>
        >('/auth/register', credentials);

        // Save tokens to localStorage
        tokenStorage.setTokens(response.data.access_token, response.data.refresh_token);
        setUser(response.data.user);
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Registration failed';

        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Logout current user
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      await apiClient.post<{ message: string }>('/auth/logout');

      // Clear tokens from localStorage
      tokenStorage.clearTokens();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Logout failed';

      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear current error
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Check auth status on mount
   */
  useEffect(() => {
    void checkAuthStatus();
  }, [checkAuthStatus]);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access auth context
 * @throws Error if used outside AuthProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }

  return context;
}

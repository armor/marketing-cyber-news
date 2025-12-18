/**
 * User and Authentication Types
 * Strict TypeScript definitions for user management and authentication
 */

// ============================================================================
// User Role Types
// ============================================================================

/**
 * Available user roles in the system
 * - user: Basic user access
 * - admin: Full system access
 * - super_admin: Super admin with all privileges
 * - marketing: Marketing approval gate
 * - branding: Branding approval gate
 * - soc_level_1: SOC Level 1 approval gate
 * - soc_level_3: SOC Level 3 approval gate
 * - ciso: CISO final approval gate
 * - analyst: Read/write access to analytics (legacy)
 * - viewer: Read-only access (legacy)
 */
export type UserRole =
  | 'user'
  | 'admin'
  | 'super_admin'
  | 'marketing'
  | 'branding'
  | 'soc_level_1'
  | 'soc_level_3'
  | 'ciso'
  | 'analyst'
  | 'viewer';

/**
 * Permission levels derived from roles
 */
export type PermissionLevel = 'read' | 'write' | 'admin';

// ============================================================================
// User Preferences
// ============================================================================

export interface UserPreferences {
  readonly theme: 'light' | 'dark' | 'system';
  readonly notificationsEnabled: boolean;
  readonly emailAlertsEnabled: boolean;
  readonly dashboardLayout: 'compact' | 'comfortable';
}

// ============================================================================
// User Entity
// ============================================================================

export interface User {
  readonly id: string; // UUID
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly avatarUrl: string | null;
  readonly createdAt: string; // ISO 8601 date string
  readonly lastLoginAt: string | null; // ISO 8601 date string
  readonly preferences: UserPreferences;
}

// ============================================================================
// Authentication State
// ============================================================================

export interface AuthState {
  readonly user: User | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
}

// ============================================================================
// Authentication Credentials
// ============================================================================

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface RegisterCredentials {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

// ============================================================================
// Authentication Response
// ============================================================================

export interface AuthResponse {
  readonly user: User;
  readonly message: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if user is an admin
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

/**
 * Type guard to check if user is an analyst
 */
export function isAnalyst(user: User | null): boolean {
  return user?.role === 'analyst';
}

/**
 * Type guard to check if user is a viewer
 */
export function isViewer(user: User | null): boolean {
  return user?.role === 'viewer';
}

/**
 * Check if user has at least the specified permission level
 */
export function hasPermission(
  user: User | null,
  requiredLevel: PermissionLevel
): boolean {
  if (!user) {
    return false;
  }

  const rolePermissions: Record<UserRole, PermissionLevel[]> = {
    user: ['read'],
    admin: ['read', 'write', 'admin'],
    super_admin: ['read', 'write', 'admin'],
    marketing: ['read', 'write'],
    branding: ['read', 'write'],
    soc_level_1: ['read', 'write'],
    soc_level_3: ['read', 'write'],
    ciso: ['read', 'write', 'admin'],
    analyst: ['read', 'write'],
    viewer: ['read'],
  };

  const userPermissions = rolePermissions[user.role];
  return userPermissions.includes(requiredLevel);
}

/**
 * Check if user has write access
 */
export function canWrite(user: User | null): boolean {
  return hasPermission(user, 'write');
}

/**
 * Check if user has admin access
 */
export function canAdmin(user: User | null): boolean {
  return hasPermission(user, 'admin');
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  notificationsEnabled: true,
  emailAlertsEnabled: false,
  dashboardLayout: 'comfortable',
} as const;

export const INITIAL_AUTH_STATE: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
} as const;

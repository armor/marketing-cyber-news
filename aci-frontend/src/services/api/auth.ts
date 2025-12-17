/**
 * Authentication API Functions
 *
 * Typed API functions for authentication endpoints.
 * Uses HttpOnly cookies for session management.
 */

import { apiClient } from './client';
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  UserPreferences,
} from '@/types/user';

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for updating user profile
 */
export interface UpdateProfileInput {
  readonly name?: string;
  readonly avatarUrl?: string;
  readonly preferences?: Partial<UserPreferences>;
}

/**
 * Input for changing password
 */
export interface ChangePasswordInput {
  readonly currentPassword: string;
  readonly newPassword: string;
}

// ============================================================================
// Authentication API Functions
// ============================================================================

/**
 * Login with email and password
 *
 * @param credentials - User email and password
 * @returns Auth response with user and message
 * @throws ApiError on invalid credentials or network issues
 *
 * @example
 * const { user, message } = await login({
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 */
export async function login(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/login', credentials);
}

/**
 * Register a new user account
 *
 * @param credentials - User registration data (email, password, name)
 * @returns Auth response with user and message
 * @throws ApiError on validation errors or duplicate email
 *
 * @example
 * const { user, message } = await register({
 *   email: 'user@example.com',
 *   password: 'password123',
 *   name: 'John Doe'
 * });
 */
export async function register(
  credentials: RegisterCredentials
): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/register', credentials);
}

/**
 * Logout current user
 *
 * Clears HttpOnly authentication cookie on server.
 *
 * @returns Promise that resolves when logout is complete
 * @throws ApiError on network issues
 *
 * @example
 * await logout();
 * // User is now logged out, cookie cleared
 */
export async function logout(): Promise<void> {
  return apiClient.post<void>('/auth/logout');
}

/**
 * Get current authenticated user
 *
 * @returns Current user data
 * @throws ApiError if not authenticated (401)
 *
 * @example
 * const user = await getCurrentUser();
 * console.log(user.email, user.role);
 */
export async function getCurrentUser(): Promise<User> {
  return apiClient.get<User>('/auth/me');
}

/**
 * Update current user's profile
 *
 * @param data - Profile fields to update (name, avatarUrl, preferences)
 * @returns Updated user data
 * @throws ApiError on validation errors or not authenticated
 *
 * @example
 * const updatedUser = await updateProfile({
 *   name: 'Jane Doe',
 *   preferences: { theme: 'dark' }
 * });
 */
export async function updateProfile(
  data: UpdateProfileInput
): Promise<User> {
  return apiClient.patch<User>('/auth/profile', data);
}

/**
 * Change current user's password
 *
 * Requires current password for security verification.
 *
 * @param data - Current and new password
 * @returns Promise that resolves when password is changed
 * @throws ApiError if current password is incorrect or validation fails
 *
 * @example
 * await changePassword({
 *   currentPassword: 'oldPassword123',
 *   newPassword: 'newSecurePassword456'
 * });
 */
export async function changePassword(
  data: ChangePasswordInput
): Promise<void> {
  return apiClient.post<void>('/auth/change-password', data);
}

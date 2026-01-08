/**
 * Mock Auth Handlers
 * MSW handlers for authentication endpoints
 */

import { http, HttpResponse, delay } from 'msw';
import type { LoginCredentials, RegisterCredentials } from '../../types/user';
import { mockUsersByEmail, mockAdminUser } from '../fixtures/users';

// ============================================================================
// Mock Session Storage
// ============================================================================

let currentUserId: string | null = null;
let currentUserData: typeof mockAdminUser | null = null;

// ============================================================================
// Auth Handlers
// ============================================================================

export const authHandlers = [
  /**
   * POST /v1/auth/login
   * Authenticate user with credentials
   * Returns JWT tokens for Bearer authentication
   */
  http.post('*/v1/auth/login', async ({ request }) => {
    await delay(100);

    const body = (await request.json()) as LoginCredentials;

    if (!body.email || !body.password) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
        },
        { status: 400 }
      );
    }

    // Accept any non-empty password for mock
    if (!body.password.trim()) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
        },
        { status: 401 }
      );
    }

    // Check if user exists in mock data, otherwise create a temp user
    let user = mockUsersByEmail[body.email];

    if (!user) {
      // For development: accept any email/password and create a mock user
      user = {
        id: `user-${Date.now()}`,
        email: body.email,
        name: body.email.split('@')[0],
        role: 'viewer' as const,
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        preferences: {
          theme: 'system' as const,
          notificationsEnabled: true,
          emailAlertsEnabled: false,
          dashboardLayout: 'comfortable' as const,
        },
      };
    }

    // Set mock session - store the full user data for /me endpoints
    currentUserId = user.id;
    currentUserData = user;

    // Return response with JWT tokens (mock tokens for development)
    return HttpResponse.json({
      success: true,
      data: {
        access_token: `mock-access-token-${user.id}-${Date.now()}`,
        refresh_token: `mock-refresh-token-${user.id}-${Date.now()}`,
        token_type: 'Bearer',
        expires_in: 3600,
        user,
      },
    });
  }),

  /**
   * POST /v1/auth/register
   * Register new user
   * Returns JWT tokens for Bearer authentication
   */
  http.post('*/v1/auth/register', async ({ request }) => {
    await delay(150);

    const body = (await request.json()) as RegisterCredentials;

    if (!body.email || !body.password || !body.name) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Email, password, and name are required' }
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    if (mockUsersByEmail[body.email]) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
        },
        { status: 409 }
      );
    }

    // Create new user with viewer role
    const newUser = {
      id: `user-${Date.now()}`,
      email: body.email,
      name: body.name,
      role: 'viewer' as const,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferences: {
        theme: 'system' as const,
        notificationsEnabled: true,
        emailAlertsEnabled: false,
        dashboardLayout: 'comfortable' as const,
      },
    };

    // Set mock session - store the full user data for /me endpoints
    currentUserId = newUser.id;
    currentUserData = newUser;

    // Return response with JWT tokens (mock tokens for development)
    return HttpResponse.json({
      success: true,
      data: {
        access_token: `mock-access-token-${newUser.id}-${Date.now()}`,
        refresh_token: `mock-refresh-token-${newUser.id}-${Date.now()}`,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        user: newUser,
      },
    }, { status: 201 });
  }),

  /**
   * POST /v1/auth/logout
   * Logout current user
   */
  http.post('*/v1/auth/logout', async () => {
    await delay(50);

    // Clear mock session
    currentUserId = null;
    currentUserData = null;

    return HttpResponse.json(
      { message: 'Logout successful' },
      {
        headers: {
          'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
        },
      }
    );
  }),

  /**
   * GET /v1/auth/me
   * Get current authenticated user
   */
  http.get('*/v1/auth/me', async () => {
    await delay(75);

    if (!currentUserId || !currentUserData) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
        },
        { status: 401 }
      );
    }

    // Return the actual logged-in user data
    return HttpResponse.json({
      success: true,
      data: currentUserData,
    });
  }),

  /**
   * GET /v1/users/me
   * Get current authenticated user (Bearer token auth)
   */
  http.get('*/v1/users/me', async ({ request }) => {
    await delay(75);

    // Check for Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
        },
        { status: 401 }
      );
    }

    // Return the actual logged-in user data (or default to mockAdminUser if not set)
    return HttpResponse.json({
      success: true,
      data: currentUserData || mockAdminUser,
    });
  }),
];

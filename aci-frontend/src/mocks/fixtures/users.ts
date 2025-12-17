/**
 * Mock User Fixtures
 * Mock user data for development and testing
 */

import type { User, UserPreferences } from '../../types/user';

// ============================================================================
// Default Preferences
// ============================================================================

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  notificationsEnabled: true,
  emailAlertsEnabled: false,
  dashboardLayout: 'comfortable',
} as const;

// ============================================================================
// Mock Users
// ============================================================================

export const mockAdminUser: User = {
  id: 'admin-001',
  email: 'admin@nexus.local',
  name: 'Admin User',
  role: 'admin',
  avatarUrl: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  preferences: DEFAULT_PREFERENCES,
} as const;

export const mockAnalystUser: User = {
  id: 'analyst-001',
  email: 'analyst@nexus.local',
  name: 'Analyst User',
  role: 'analyst',
  avatarUrl: null,
  createdAt: '2024-01-15T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  preferences: {
    ...DEFAULT_PREFERENCES,
    dashboardLayout: 'compact',
  },
} as const;

export const mockViewerUser: User = {
  id: 'viewer-001',
  email: 'viewer@nexus.local',
  name: 'Viewer User',
  role: 'viewer',
  avatarUrl: null,
  createdAt: '2024-02-01T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  preferences: {
    ...DEFAULT_PREFERENCES,
    theme: 'dark',
    notificationsEnabled: false,
  },
} as const;

// ============================================================================
// User Map for Lookup
// ============================================================================

export const mockUsersByEmail: Record<string, User> = {
  [mockAdminUser.email]: mockAdminUser,
  [mockAnalystUser.email]: mockAnalystUser,
  [mockViewerUser.email]: mockViewerUser,
} as const;

export const mockUsersById: Record<string, User> = {
  [mockAdminUser.id]: mockAdminUser,
  [mockAnalystUser.id]: mockAnalystUser,
  [mockViewerUser.id]: mockViewerUser,
} as const;

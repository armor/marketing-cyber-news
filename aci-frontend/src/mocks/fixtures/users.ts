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
// Mock Users - All 8 Test Accounts
// ============================================================================

export const mockSuperAdminUser: User = {
  id: 'superadmin-001',
  email: 'superadmin@armor.com',
  name: 'Super Admin',
  role: 'super_admin',
  avatarUrl: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  preferences: DEFAULT_PREFERENCES,
} as const;

export const mockAdminUser: User = {
  id: 'admin-001',
  email: 'admin@armor.com',
  name: 'Admin User',
  role: 'admin',
  avatarUrl: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  preferences: DEFAULT_PREFERENCES,
} as const;

export const mockMarketingUser: User = {
  id: 'marketing-001',
  email: 'marketing@armor.com',
  name: 'Marketing User',
  role: 'marketing',
  avatarUrl: null,
  createdAt: '2024-01-15T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  preferences: DEFAULT_PREFERENCES,
} as const;

export const mockBrandingUser: User = {
  id: 'branding-001',
  email: 'branding@armor.com',
  name: 'Branding User',
  role: 'branding',
  avatarUrl: null,
  createdAt: '2024-01-15T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  preferences: DEFAULT_PREFERENCES,
} as const;

export const mockSoc1User: User = {
  id: 'soc1-001',
  email: 'soc1@armor.com',
  name: 'SOC Level 1',
  role: 'soc_level_1',
  avatarUrl: null,
  createdAt: '2024-02-01T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  preferences: {
    ...DEFAULT_PREFERENCES,
    dashboardLayout: 'compact',
  },
} as const;

export const mockSoc3User: User = {
  id: 'soc3-001',
  email: 'soc3@armor.com',
  name: 'SOC Level 3',
  role: 'soc_level_3',
  avatarUrl: null,
  createdAt: '2024-02-01T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  preferences: {
    ...DEFAULT_PREFERENCES,
    dashboardLayout: 'compact',
  },
} as const;

export const mockCisoUser: User = {
  id: 'ciso-001',
  email: 'ciso@armor.com',
  name: 'CISO',
  role: 'ciso',
  avatarUrl: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  preferences: DEFAULT_PREFERENCES,
} as const;

export const mockViewerUser: User = {
  id: 'viewer-001',
  email: 'viewer@armor.com',
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

// Legacy exports for backward compatibility
export const mockAnalystUser: User = mockSoc1User;

// ============================================================================
// User Map for Lookup
// ============================================================================

export const mockUsersByEmail: Record<string, User> = {
  [mockSuperAdminUser.email]: mockSuperAdminUser,
  [mockAdminUser.email]: mockAdminUser,
  [mockMarketingUser.email]: mockMarketingUser,
  [mockBrandingUser.email]: mockBrandingUser,
  [mockSoc1User.email]: mockSoc1User,
  [mockSoc3User.email]: mockSoc3User,
  [mockCisoUser.email]: mockCisoUser,
  [mockViewerUser.email]: mockViewerUser,
} as const;

export const mockUsersById: Record<string, User> = {
  [mockSuperAdminUser.id]: mockSuperAdminUser,
  [mockAdminUser.id]: mockAdminUser,
  [mockMarketingUser.id]: mockMarketingUser,
  [mockBrandingUser.id]: mockBrandingUser,
  [mockSoc1User.id]: mockSoc1User,
  [mockSoc3User.id]: mockSoc3User,
  [mockCisoUser.id]: mockCisoUser,
  [mockViewerUser.id]: mockViewerUser,
} as const;

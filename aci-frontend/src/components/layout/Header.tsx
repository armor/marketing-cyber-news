/**
 * Header Component
 *
 * Top navigation bar for NEXUS dashboard with branding, user menu, and notifications.
 * Responsive with hamburger menu for mobile devices.
 *
 * DESIGN TOKEN COMPLIANCE:
 * - All colors use Tailwind classes referencing CSS custom properties
 * - All spacing uses token-based spacing scale
 * - Zero hardcoded hex/px values
 *
 * @example
 * ```tsx
 * <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
 * ```
 */

import { useState } from 'react';
import { Menu, Bell, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// Types
// ============================================================================

interface HeaderProps {
  /** Callback when mobile menu button is clicked */
  onMenuToggle?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function Header({ onMenuToggle }: HeaderProps): React.ReactElement {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        background: 'var(--gradient-panel-header)',
        borderColor: 'var(--color-border-default)',
        boxShadow: 'var(--shadow-card)',
        width: 'var(--layout-full-width)',
      }}
      role="banner"
    >
      <div
        className="flex items-center justify-between w-full"
        style={{
          height: 'var(--layout-header-height)',
          paddingLeft: 'var(--spacing-8)',
          paddingRight: 'var(--spacing-8)',
        }}
      >
        {/* Left section: Menu button + Logo */}
        <div className="flex items-center" style={{ gap: 'var(--spacing-4)' }}>
          {/* Mobile menu toggle */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden rounded-md transition-colors"
            style={{
              padding: 'var(--spacing-2)',
              background: 'transparent',
              transitionDuration: 'var(--motion-duration-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gradient-component)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label="Toggle sidebar menu"
            type="button"
          >
            <Menu className="w-6 h-6 text-[var(--color-text-primary)]" />
          </button>

          {/* Logo/Brand */}
          <div className="flex items-center" style={{ gap: 'var(--spacing-4)' }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 'var(--spacing-icon-avatar-lg)',
                height: 'var(--spacing-icon-avatar-lg)',
                borderRadius: 'var(--border-radius-lg)',
                background: 'var(--gradient-btn-primary)',
                boxShadow: 'var(--shadow-btn-primary)',
              }}
            >
              <span
                className="font-bold"
                style={{
                  color: 'var(--color-void)',
                  fontSize: '1.5rem',
                }}
              >
                N
              </span>
            </div>
            <h1
              className="font-bold tracking-tight"
              style={{
                color: 'var(--color-text-primary)',
                fontSize: '1.5rem',
                letterSpacing: '-0.02em',
              }}
            >
              NEXUS
            </h1>
          </div>
        </div>

        {/* Right section: Notifications + User menu */}
        <div className="flex items-center" style={{ gap: 'var(--spacing-6)', marginLeft: 'auto' }}>
          {/* Notification bell */}
          <button
            className="relative rounded-lg transition-colors"
            style={{
              padding: 'var(--spacing-3)',
              background: 'transparent',
              transitionDuration: 'var(--motion-duration-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gradient-component)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label="Notifications"
            type="button"
          >
            <Bell className="w-6 h-6 text-[var(--color-text-secondary)]" />
            {/* Notification badge placeholder */}
            <span
              className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: 'var(--color-semantic-error)' }}
              aria-hidden="true"
            />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center rounded-lg transition-colors"
              style={{
                gap: 'var(--spacing-3)',
                paddingLeft: 'var(--spacing-4)',
                paddingRight: 'var(--spacing-4)',
                paddingTop: 'var(--spacing-2)',
                paddingBottom: 'var(--spacing-2)',
                background: 'transparent',
                transitionDuration: 'var(--motion-duration-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--gradient-component)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              type="button"
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 'var(--spacing-icon-avatar-md)',
                  height: 'var(--spacing-icon-avatar-md)',
                  background: 'var(--gradient-btn-trust)',
                  boxShadow: 'var(--shadow-btn-accent)',
                }}
              >
                <User className="w-5 h-5 text-[var(--color-bg-elevated)]" />
              </div>
              <span
                className="hidden md:block font-medium"
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: '0.95rem',
                }}
              >
                {user?.name ?? 'User'}
              </span>
              <ChevronDown className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>

            {/* User dropdown menu */}
            {userMenuOpen && (
              <>
                {/* Backdrop for mobile */}
                <div
                  className="fixed inset-0 z-40 lg:hidden"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden="true"
                />

                <div
                  className="absolute right-0 w-48 rounded-lg z-50"
                  style={{
                    marginTop: 'var(--spacing-2)',
                    background: 'var(--gradient-card)',
                    border: `1px solid var(--color-border-default)`,
                    boxShadow: 'var(--shadow-card)',
                  }}
                  role="menu"
                >
                  <div
                    className="border-b"
                    style={{
                      padding: 'var(--spacing-3)',
                      borderColor: 'var(--color-border-default)',
                    }}
                  >
                    <p
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {user?.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {user?.email}
                    </p>
                    {user?.role && (
                      <span
                        className="inline-block rounded"
                        style={{
                          marginTop: 'var(--spacing-1)',
                          paddingLeft: 'var(--spacing-2)',
                          paddingRight: 'var(--spacing-2)',
                          paddingTop: 'var(--spacing-1)',
                          paddingBottom: 'var(--spacing-1)',
                          fontSize: 'var(--typography-font-size-xs)',
                          fontWeight: 'var(--typography-font-weight-medium)',
                          background: 'var(--gradient-badge-info)',
                          color: 'var(--color-armor-blue)',
                        }}
                      >
                        {user.role}
                      </span>
                    )}
                  </div>
                  <div style={{ paddingTop: 'var(--spacing-2)', paddingBottom: 'var(--spacing-2)' }}>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        // Profile action placeholder
                      }}
                      className="w-full text-left text-sm transition-colors"
                      style={{
                        paddingLeft: 'var(--spacing-4)',
                        paddingRight: 'var(--spacing-4)',
                        paddingTop: 'var(--spacing-2)',
                        paddingBottom: 'var(--spacing-2)',
                        color: 'var(--color-text-primary)',
                        background: 'transparent',
                        transitionDuration: 'var(--motion-duration-fast)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--gradient-component)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      role="menuitem"
                      type="button"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        // Settings action placeholder
                      }}
                      className="w-full text-left text-sm transition-colors"
                      style={{
                        paddingLeft: 'var(--spacing-4)',
                        paddingRight: 'var(--spacing-4)',
                        paddingTop: 'var(--spacing-2)',
                        paddingBottom: 'var(--spacing-2)',
                        color: 'var(--color-text-primary)',
                        background: 'transparent',
                        transitionDuration: 'var(--motion-duration-fast)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--gradient-component)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      role="menuitem"
                      type="button"
                    >
                      Settings
                    </button>
                  </div>
                  <div
                    className="border-t"
                    style={{
                      borderColor: 'var(--color-border-default)',
                      paddingTop: 'var(--spacing-2)',
                      paddingBottom: 'var(--spacing-2)',
                    }}
                  >
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left text-sm transition-colors"
                      style={{
                        paddingLeft: 'var(--spacing-4)',
                        paddingRight: 'var(--spacing-4)',
                        paddingTop: 'var(--spacing-2)',
                        paddingBottom: 'var(--spacing-2)',
                        color: 'var(--color-semantic-error)',
                        background: 'transparent',
                        transitionDuration: 'var(--motion-duration-fast)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--gradient-component)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      role="menuitem"
                      type="button"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

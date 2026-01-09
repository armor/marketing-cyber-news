/**
 * Header Component
 *
 * Top navigation bar for Armor Cyber News dashboard with user menu and notifications.
 * Styled with Armor-Dash design patterns within the SidebarInset layout.
 */

import { useState } from 'react';
import { Bell, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// Component
// ============================================================================

export function Header(): React.ReactElement {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="flex items-center justify-end flex-1">
      {/* Right section: Notifications + User menu */}
      <div
        className="flex items-center"
        style={{ gap: 'var(--spacing-4)' }}
      >
        {/* Notification bell */}
        <button
          className="relative transition-all"
          style={{
            padding: 'var(--spacing-2)',
            borderRadius: 'var(--border-radius-md)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-secondary)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
          aria-label="Notifications"
          type="button"
        >
          <Bell style={{ width: 'var(--spacing-5)', height: 'var(--spacing-5)' }} />
          {/* Notification badge */}
          <span
            style={{
              position: 'absolute',
              top: 'var(--spacing-1)',
              right: 'var(--spacing-1)',
              width: 'var(--spacing-2)',
              height: 'var(--spacing-2)',
              borderRadius: 'var(--border-radius-full)',
              backgroundColor: 'var(--color-semantic-error)',
            }}
            aria-hidden="true"
          />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center transition-all"
            style={{
              gap: 'var(--spacing-2)',
              padding: 'var(--spacing-1) var(--spacing-3)',
              borderRadius: 'var(--border-radius-md)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-secondary)';
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
              className="flex items-center justify-center"
              style={{
                width: 'var(--spacing-8)',
                height: 'var(--spacing-8)',
                borderRadius: 'var(--border-radius-full)',
                background: 'var(--gradient-btn-primary)',
                color: 'var(--color-bg-elevated)',
              }}
            >
              <User style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
            </div>
            <span
              className="hidden md:block"
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              {user?.name ?? 'User'}
            </span>
            <ChevronDown
              style={{
                width: 'var(--spacing-4)',
                height: 'var(--spacing-4)',
                color: 'var(--color-text-secondary)',
              }}
            />
          </button>

          {/* User dropdown menu */}
          {userMenuOpen && (
            <>
              {/* Backdrop for mobile */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
                aria-hidden="true"
              />

              <div
                className="absolute right-0 top-full z-50"
                style={{
                  marginTop: 'var(--spacing-2)',
                  width: '14rem',
                  borderRadius: 'var(--border-radius-lg)',
                  border: '1px solid var(--color-border-default)',
                  background: 'var(--gradient-card)',
                  boxShadow: 'var(--shadow-elevated)',
                  overflow: 'hidden',
                }}
                role="menu"
              >
                {/* User info section */}
                <div
                  style={{
                    padding: 'var(--spacing-4)',
                    borderBottom: '1px solid var(--color-border-default)',
                    background: 'var(--gradient-panel-header)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-1)',
                    }}
                  >
                    {user?.name}
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {user?.email}
                  </p>
                  {user?.role && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: 'var(--spacing-2)',
                        padding: 'var(--spacing-1) var(--spacing-2)',
                        fontSize: 'var(--typography-font-size-xs)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        borderRadius: 'var(--border-radius-sm)',
                        background: 'var(--gradient-badge-neutral)',
                        color: 'var(--color-text-secondary)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {user.role.replace('_', ' ')}
                    </span>
                  )}
                </div>

                {/* Menu items */}
                <div style={{ padding: 'var(--spacing-1) 0' }}>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left transition-colors"
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-4)',
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-primary)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-secondary)';
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
                    }}
                    className="w-full text-left transition-colors"
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-4)',
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-primary)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-secondary)';
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

                {/* Sign out */}
                <div
                  style={{
                    padding: 'var(--spacing-1) 0',
                    borderTop: '1px solid var(--color-border-default)',
                  }}
                >
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left transition-colors"
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-4)',
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-semantic-error)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-secondary)';
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
  );
}

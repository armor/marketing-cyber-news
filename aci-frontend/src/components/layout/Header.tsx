/**
 * Header Component - Armor Brand Style
 *
 * Top navigation bar matching the login page brand patterns:
 * - Glass effect with semi-transparent backgrounds
 * - Amber accent colors for interactive elements
 * - Clean icon containers with subtle backgrounds
 * - Proper spacing and typography
 */

import { useState } from 'react';
import { Bell, ChevronDown, Settings, LogOut, Building2, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArmorLogo } from '@/components/ui/ArmorLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// ============================================================================
// Component
// ============================================================================

export function Header(): React.ReactElement {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';

  return (
    <div className="flex items-center justify-between gap-6 flex-1">
      {/* Left: Logo and Title */}
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/dashboard" className="flex-shrink-0">
          <ArmorLogo width={100} height={42} />
        </Link>
        <div className="hidden md:block min-w-0">
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            Cyber News
          </h1>
          <p className="text-xs text-muted-foreground">
            Proactive Threat Intelligence
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Help button */}
        <button
          className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
          aria-label="Help"
          type="button"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Notification bell */}
        <button
          className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
          aria-label="Notifications"
          type="button"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          {/* Notification badge */}
          <span
            className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: 'var(--color-amber-500)' }}
            aria-hidden="true"
          />
        </button>

        {/* Divider */}
        <div
          className="h-8 w-px mx-2 hidden sm:block"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
        />

        {/* Theme toggle */}
        <ThemeToggle className="!w-10 !h-10" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            aria-label="User menu"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
            type="button"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: 'var(--color-amber-500)',
                color: 'var(--color-obsidian)',
              }}
            >
              <span className="text-sm font-bold">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="hidden sm:inline text-sm font-medium text-foreground">
              {firstName}
            </span>
            <ChevronDown
              className="w-4 h-4 hidden sm:inline text-muted-foreground transition-transform duration-200"
              style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {/* User dropdown menu */}
          {userMenuOpen && (
            <>
              {/* Backdrop for closing */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
                aria-hidden="true"
              />

              <div
                className="absolute right-0 top-full mt-2 z-50 w-72 overflow-hidden rounded-xl"
                style={{
                  backgroundColor: 'rgba(24, 24, 27, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                }}
                role="menu"
              >
                {/* User info section */}
                <div
                  className="px-4 py-4"
                  style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--color-amber-500)',
                        color: 'var(--color-obsidian)',
                      }}
                    >
                      <span className="text-base font-bold">
                        {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {user?.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  {user?.role && (
                    <div className="mt-3">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--color-amber-400)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Menu items */}
                <div className="py-2">
                  <Link
                    to="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 text-foreground transition-colors duration-200"
                    role="menuitem"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    User Settings
                  </Link>

                  <Link
                    to="/admin"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 text-foreground transition-colors duration-200"
                    role="menuitem"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Admin Settings
                  </Link>
                </div>

                {/* Sign out */}
                <div
                  className="py-2"
                  style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors duration-200"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--color-critical)',
                    }}
                    role="menuitem"
                    type="button"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
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

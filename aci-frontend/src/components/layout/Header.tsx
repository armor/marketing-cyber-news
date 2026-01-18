/**
 * Header Component - Armor Brand Style
 *
 * Top navigation bar matching the login page brand patterns:
 * - Glass effect with semi-transparent backgrounds
 * - Amber accent colors for interactive elements
 * - Clean icon containers with subtle backgrounds
 * - Proper spacing and typography
 * - Uses design system Button and DropdownMenu components
 */

import { Bell, ChevronDown, Settings, LogOut, Building2, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Component
// ============================================================================

export function Header(): React.ReactElement {
  const { user, logout } = useAuth();

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';

  return (
    <div className="flex items-center justify-between gap-4 flex-1 min-w-0">
      {/* Left: Logo and Title */}
      <div className="flex items-center gap-4 min-w-0 flex-shrink">
        <Link to="/dashboard" className="flex-shrink-0">
          <img
            src="/branding/logos/armor-dash-white-logo.svg"
            alt="Armor"
            style={{ height: '36px', width: 'auto' }}
          />
        </Link>
        <div className="hidden md:flex flex-col min-w-0" style={{ padding: 'var(--spacing-2) var(--spacing-3)' }}>
          <h1
            style={{
              fontSize: 'var(--typography-font-size-lg)',
              fontWeight: 'var(--typography-font-weight-bold)',
              background: 'var(--gradient-brand-text-alt)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 'var(--typography-line-height-tight)',
              margin: 0,
              letterSpacing: 'var(--typography-letter-spacing-tight)',
            }}
          >
            Cyber News
          </h1>
          <p
            style={{
              fontSize: 'var(--typography-font-size-xs)',
              color: 'rgba(255, 255, 255, 0.6)',
              margin: 0,
            }}
          >
            Proactive Threat Intelligence
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Help button - dark background matching brand */}
        <button
          type="button"
          aria-label="Help"
          className="size-10 rounded-lg flex items-center justify-center transition-all duration-200"
          style={{
            backgroundColor: 'var(--header-icon-bg)',
            border: '1px solid var(--header-icon-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--header-icon-bg-hover)';
            e.currentTarget.style.borderColor = 'var(--header-icon-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--header-icon-bg)';
            e.currentTarget.style.borderColor = 'var(--header-icon-border)';
          }}
        >
          <HelpCircle className="size-5" style={{ color: 'var(--color-amber-400)' }} />
        </button>

        {/* Notification bell - dark background matching brand */}
        <button
          type="button"
          aria-label="Notifications"
          className="size-10 rounded-lg flex items-center justify-center transition-all duration-200 relative"
          style={{
            backgroundColor: 'var(--header-icon-bg)',
            border: '1px solid var(--header-icon-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--header-icon-bg-hover)';
            e.currentTarget.style.borderColor = 'var(--header-icon-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--header-icon-bg)';
            e.currentTarget.style.borderColor = 'var(--header-icon-border)';
          }}
        >
          <Bell className="size-5" style={{ color: 'var(--color-amber-400)' }} />
          {/* Notification badge */}
          <span
            className="absolute top-1.5 right-1.5 size-2.5 rounded-full"
            style={{ backgroundColor: 'var(--color-amber-500)' }}
            aria-hidden="true"
          />
        </button>

        {/* Divider */}
        <div
          className="h-8 w-px mx-1 hidden sm:block"
          style={{ backgroundColor: 'var(--header-icon-border-hover)' }}
        />

        {/* Theme toggle */}
        <ThemeToggle className="!size-10" />

        {/* User menu dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200"
              style={{
                backgroundColor: 'var(--header-icon-bg)',
                border: '1px solid var(--header-icon-border)',
                height: '48px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--header-icon-bg-hover)';
                e.currentTarget.style.borderColor = 'var(--header-icon-border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--header-icon-bg)';
                e.currentTarget.style.borderColor = 'var(--header-icon-border)';
              }}
              aria-label="User menu"
            >
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: 'var(--color-amber-500)',
                  color: 'var(--color-obsidian)',
                }}
              >
                <span className="text-base font-bold">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {firstName}
              </span>
              <ChevronDown className="size-4 hidden sm:inline" style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={12}
            collisionPadding={16}
            style={{ width: '320px' }}
          >
            {/* User info section - matches sidebar footer user card */}
            <div
              style={{
                padding: 'var(--spacing-4)',
                borderBottom: '1px solid var(--color-border-default)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-3)',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    borderRadius: 'var(--border-radius-full)',
                    background: 'var(--gradient-btn-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--typography-font-size-xs)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                  }}
                >
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    className="truncate"
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.3,
                      margin: 0,
                    }}
                  >
                    {user?.name}
                  </p>
                  <p
                    className="truncate"
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-muted)',
                      margin: 0,
                    }}
                  >
                    {user?.email}
                  </p>
                </div>
              </div>
              {user?.role && (
                <div style={{ marginTop: 'var(--spacing-3)' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: 'var(--spacing-1) var(--spacing-3)',
                      borderRadius: 'var(--border-radius-full)',
                      fontSize: 'var(--typography-font-size-xs)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--color-amber-400)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Menu items - matches sidebar nav items */}
            <div style={{ padding: 'var(--spacing-3)' }}>
              <DropdownMenuItem asChild>
                <Link
                  to="/settings"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-3)',
                    padding: 'var(--spacing-3) var(--spacing-3)',
                    borderRadius: 'var(--border-radius-lg)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 'var(--border-radius-md)',
                      flexShrink: 0,
                    }}
                  >
                    <Settings style={{ width: '16px', height: '16px', color: 'var(--color-amber-400)' }} />
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                    }}
                  >
                    User Settings
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  to="/admin"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-3)',
                    padding: 'var(--spacing-3) var(--spacing-3)',
                    borderRadius: 'var(--border-radius-lg)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 'var(--border-radius-md)',
                      flexShrink: 0,
                    }}
                  >
                    <Building2 style={{ width: '16px', height: '16px', color: 'var(--color-amber-400)' }} />
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                    }}
                  >
                    Admin Settings
                  </span>
                </Link>
              </DropdownMenuItem>
            </div>

            {/* Sign out - matches sidebar logout */}
            <DropdownMenuSeparator />
            <div style={{ padding: 'var(--spacing-3)' }}>
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer focus:bg-[rgba(239,68,68,0.1)]"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-3)',
                  padding: 'var(--spacing-3) var(--spacing-3)',
                  borderRadius: 'var(--border-radius-lg)',
                  color: 'var(--color-critical)',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--border-radius-md)',
                    flexShrink: 0,
                  }}
                >
                  <LogOut style={{ width: '16px', height: '16px', color: 'var(--color-critical)' }} />
                </div>
                <span
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                  }}
                >
                  Logout
                </span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

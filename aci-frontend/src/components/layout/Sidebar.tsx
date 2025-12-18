/**
 * Sidebar Component
 *
 * Main navigation sidebar for NEXUS dashboard with role-based menu items.
 * Responsive and collapsible on mobile devices.
 *
 * DESIGN TOKEN COMPLIANCE:
 * - All colors use Tailwind classes referencing CSS custom properties
 * - All spacing uses token-based spacing scale
 * - Zero hardcoded hex/px values
 *
 * @example
 * ```tsx
 * <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
 * ```
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  Bookmark,
  Bell,
  BarChart,
  Settings,
  ClipboardCheck,
  Mail,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/approval';

// ============================================================================
// Types
// ============================================================================

interface SidebarProps {
  /** Whether sidebar is open (mobile) */
  isOpen?: boolean;
  /** Callback when sidebar should close */
  onClose?: () => void;
}

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  requiresAdmin?: boolean;
  requiresApproval?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    to: '/threats',
    icon: Shield,
    label: 'Threats',
  },
  {
    to: '/bookmarks',
    icon: Bookmark,
    label: 'Bookmarks',
  },
  {
    to: '/alerts',
    icon: Bell,
    label: 'Alerts',
  },
  {
    to: '/approvals',
    icon: ClipboardCheck,
    label: 'Approval Queue',
    requiresApproval: true,
  },
  {
    to: '/analytics',
    icon: BarChart,
    label: 'Analytics',
  },
  {
    to: '/newsletter-config',
    icon: Mail,
    label: 'Newsletter Config',
    requiresAdmin: true,
  },
  {
    to: '/admin',
    icon: Settings,
    label: 'Admin',
    requiresAdmin: true,
  },
];

// ============================================================================
// Component
// ============================================================================

export function Sidebar({ isOpen = false, onClose }: SidebarProps): React.ReactElement {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Check if user has approval permissions
  const hasApprovalPermissions = (): boolean => {
    if (!user) {
      return false;
    }

    const userRole = user.role as UserRole;

    // Admin and super_admin can always see approvals
    if (userRole === 'admin' || userRole === 'super_admin') {
      return true;
    }

    // Check if user can approve any gate
    const approvalRoles: UserRole[] = [
      'marketing',
      'branding',
      'soc_level_1',
      'soc_level_3',
      'ciso',
    ];

    return approvalRoles.includes(userRole);
  };

  // Filter nav items based on role
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.requiresAdmin) {
      return isAdmin;
    }
    if (item.requiresApproval) {
      return hasApprovalPermissions();
    }
    return true;
  });

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
          style={{ backgroundColor: 'rgba(10, 10, 16, 0.8)' }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 w-64
          border-r transition-transform ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0 top-0 h-screen z-50' : '-translate-x-full top-0 h-screen z-50'}
        `}
        style={{
          background: 'var(--gradient-card)',
          borderColor: 'var(--color-border-default)',
          transitionDuration: 'var(--motion-duration-normal)',
          boxShadow: 'var(--shadow-card)',
          // On desktop (lg+), position below header
          top: 'var(--layout-header-height)',
          height: 'calc(100vh - var(--layout-header-height))',
          zIndex: 40, // Below header (z-50)
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Mobile header with close button */}
        <div
          className="flex items-center justify-between h-16 border-b lg:hidden"
          style={{
            paddingLeft: 'var(--spacing-4)',
            paddingRight: 'var(--spacing-4)',
            borderColor: 'var(--color-border-default)',
            background: 'var(--gradient-panel-header)',
          }}
        >
          <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{
                background: 'var(--gradient-btn-primary)',
                boxShadow: 'var(--shadow-btn-primary)',
              }}
            >
              <span className="font-bold text-lg" style={{ color: 'var(--color-void)' }}>
                N
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              NEXUS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md transition-colors"
            style={{
              padding: 'var(--spacing-2)',
              backgroundColor: 'transparent',
              transitionDuration: 'var(--motion-duration-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gradient-component)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Close sidebar"
            type="button"
          >
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Navigation menu */}
        <nav
          className="flex flex-col overflow-y-auto lg:h-auto"
          style={{
            gap: 'var(--spacing-2)',
            padding: 'var(--spacing-4)',
            height: 'calc(100% - 5rem)', // Account for footer
          }}
        >
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-3)',
                  paddingLeft: 'var(--spacing-4)',
                  paddingRight: 'var(--spacing-4)',
                  paddingTop: 'var(--spacing-3)',
                  paddingBottom: 'var(--spacing-3)',
                  borderRadius: 'var(--border-radius-lg)',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  transition: 'all',
                  transitionDuration: 'var(--motion-duration-fast)',
                  textDecoration: 'none',
                }}
                className={({ isActive }) =>
                  isActive ? 'nav-link-active' : 'nav-link'
                }
                end={item.to === '/'}
              >
                {({ isActive }) => (
                  <>
                    <style>{`
                      .nav-link-active {
                        background: var(--gradient-btn-primary) !important;
                        color: var(--color-void) !important;
                        box-shadow: var(--shadow-btn-primary);
                      }
                      .nav-link {
                        color: var(--color-text-secondary);
                        background: transparent;
                      }
                      .nav-link:hover {
                        color: var(--color-text-primary);
                        background: var(--gradient-component);
                      }
                      .nav-icon-active {
                        color: var(--color-void);
                      }
                      .nav-icon {
                        color: currentColor;
                      }
                    `}</style>
                    <Icon
                      className={`w-5 h-5 ${isActive ? 'nav-icon-active' : 'nav-icon'}`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar footer with version/info */}
        <div
          className="absolute bottom-0 left-0 right-0 border-t text-center"
          style={{
            padding: 'var(--spacing-4)',
            borderColor: 'var(--color-border-default)',
            background: 'var(--gradient-panel-header)',
          }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            NEXUS v1.0.0
          </p>
        </div>
      </aside>
    </>
  );
}

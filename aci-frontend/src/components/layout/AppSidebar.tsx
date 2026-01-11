/**
 * AppSidebar Component
 *
 * Main navigation sidebar for Armor Cyber News dashboard.
 * Styled with Armor-Dash design patterns using sidebar primitives.
 * Features role-based menu items and collapsible sidebar with nested groups.
 */

import { memo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  Bookmark,
  Bell,
  BarChart,
  Settings,
  ClipboardCheck,
  Mail,
  LogOut,
  Settings2,
  Eye,
  CheckCircle,
  BarChart3,
  FileStack,
  Megaphone,
  Wand2,
  Share2,
  Calendar,
  Palette,
  TrendingUp,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/approval';


// ============================================================================
// Types
// ============================================================================

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  requiresAdmin?: boolean;
  requiresApproval?: boolean;
  requiresNewsletter?: boolean;
  requiresMarketing?: boolean;
  children?: NavItem[];
}

// ============================================================================
// Constants
// ============================================================================

const NAV_GROUPS = {
  main: [
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
  ],
  newsletter: {
    parent: {
      to: '/newsletter',
      icon: Mail,
      label: 'Newsletter',
      requiresNewsletter: true,
    },
    children: [
      {
        to: '/newsletter/configs',
        icon: Settings2,
        label: 'Configuration',
      },
      {
        to: '/newsletter/preview',
        icon: Eye,
        label: 'Preview',
      },
      {
        to: '/newsletter/approval',
        icon: CheckCircle,
        label: 'Approval',
        requiresApproval: true,
      },
      {
        to: '/newsletter/analytics',
        icon: BarChart3,
        label: 'Metrics',
      },
      {
        to: '/newsletter/content',
        icon: FileStack,
        label: 'Content',
      },
      {
        to: '/newsletter/claims',
        icon: FileText,
        label: 'Claims Library',
      },
    ],
  },
  marketing: {
    parent: {
      to: '/campaigns',
      icon: Megaphone,
      label: 'Marketing',
      requiresMarketing: true,
    },
    children: [
      {
        to: '/content-studio',
        icon: Wand2,
        label: 'Content Studio',
      },
      {
        to: '/voice-transform',
        icon: Sparkles,
        label: 'Voice Transform',
      },
      {
        to: '/channels',
        icon: Share2,
        label: 'Channels',
      },
      {
        to: '/calendar',
        icon: Calendar,
        label: 'Calendar',
      },
      {
        to: '/brand-center',
        icon: Palette,
        label: 'Brand Center',
      },
      {
        to: '/marketing/analytics',
        icon: TrendingUp,
        label: 'Performance',
      },
    ],
  },
  admin: {
    parent: {
      to: '/admin',
      icon: Settings,
      label: 'Admin',
      requiresAdmin: true,
    },
    children: [
      {
        to: '/admin/voice-agents',
        icon: Wand2,
        label: 'Voice Agents',
      },
    ],
  },
};

// ============================================================================
// Collapsible Nav Group Component
// ============================================================================

interface CollapsibleNavGroupProps {
  parent: NavItem;
  children: NavItem[];
  isVisible: boolean;
  isItemVisible: (item: NavItem) => boolean;
  isActive: (path: string) => boolean;
  defaultExpanded?: boolean;
}

function CollapsibleNavGroup({
  parent,
  children,
  isVisible,
  isItemVisible,
  isActive,
  defaultExpanded = false,
}: CollapsibleNavGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const ParentIcon = parent.icon;
  const parentActive = isActive(parent.to);
  const visibleChildren = children.filter(isItemVisible);

  if (!isVisible || visibleChildren.length === 0) {
    return null;
  }

  // Check if any child is active to auto-expand
  const hasActiveChild = visibleChildren.some((child) => isActive(child.to));
  const shouldExpand = isExpanded || hasActiveChild;

  return (
    <div
      style={{
        marginBottom: 'var(--spacing-2)',
      }}
    >
      {/* Parent item with expand/collapse */}
      <button
        onClick={() => setIsExpanded(!shouldExpand)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: 'var(--spacing-3) var(--spacing-4)',
          borderRadius: 'var(--border-radius-lg)',
          background: parentActive ? 'var(--color-bg-elevated)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: parentActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          fontSize: 'var(--typography-font-size-sm)',
          fontWeight: parentActive ? 'var(--typography-font-weight-semibold)' : 'var(--typography-font-weight-medium)',
          transition: 'all var(--motion-duration-fast) var(--motion-easing-default)',
        }}
        onMouseEnter={(e) => {
          if (!parentActive) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!parentActive) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: parentActive ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--border-radius-md)',
            flexShrink: 0,
            marginRight: 'var(--spacing-3)',
          }}
        >
          <ParentIcon style={{ width: '16px', height: '16px', color: parentActive ? 'var(--color-signal-orange)' : 'var(--color-amber-400)' }} />
        </div>
        <span style={{ flex: 1, textAlign: 'left' }}>{parent.label}</span>
        {shouldExpand ? (
          <ChevronDown style={{ width: '16px', height: '16px', opacity: 0.5 }} />
        ) : (
          <ChevronRight style={{ width: '16px', height: '16px', opacity: 0.5 }} />
        )}
      </button>

      {/* Children (collapsible) */}
      {shouldExpand && (
        <div
          style={{
            marginLeft: 'var(--spacing-4)',
            paddingLeft: 'var(--spacing-4)',
            borderLeft: '1px solid var(--color-border-default)',
            marginTop: 'var(--spacing-1)',
          }}
        >
          {visibleChildren.map((child) => {
            const ChildIcon = child.icon;
            const childActive = isActive(child.to);
            return (
              <NavLink
                key={child.to}
                to={child.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  borderRadius: 'var(--border-radius-md)',
                  background: childActive ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                  color: childActive ? 'var(--color-signal-orange)' : 'var(--color-text-muted)',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: childActive ? 'var(--typography-font-weight-medium)' : 'var(--typography-font-weight-normal)',
                  textDecoration: 'none',
                  transition: 'all var(--motion-duration-fast) var(--motion-easing-default)',
                  marginBottom: 'var(--spacing-1)',
                }}
                onMouseEnter={(e) => {
                  if (!childActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!childActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                  }
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: childActive ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                    borderRadius: 'var(--border-radius-md)',
                    flexShrink: 0,
                    marginRight: 'var(--spacing-3)',
                  }}
                >
                  <ChildIcon style={{ width: '14px', height: '14px', color: childActive ? 'var(--color-signal-orange)' : 'var(--color-amber-400)' }} />
                </div>
                <span>{child.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export const AppSidebar = memo(function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
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

  // Check if user has newsletter permissions (marketing, branding, or admin)
  const hasNewsletterPermissions = (): boolean => {
    if (!user) {
      return false;
    }

    const userRole = user.role as UserRole;

    // Admin and super_admin can always access newsletter
    if (userRole === 'admin' || userRole === 'super_admin') {
      return true;
    }

    // Marketing, branding, SOC L3, and CISO roles can access newsletter config
    const newsletterRoles: UserRole[] = ['marketing', 'branding', 'soc_level_3', 'ciso'];

    return newsletterRoles.includes(userRole);
  };

  // Check if user has marketing permissions
  const hasMarketingPermissions = (): boolean => {
    if (!user) {
      return false;
    }

    const userRole = user.role as UserRole;

    // Admin and super_admin can always access marketing
    if (userRole === 'admin' || userRole === 'super_admin') {
      return true;
    }

    // Marketing role can access marketing features
    return userRole === 'marketing';
  };

  // Filter a single nav item based on role requirements
  const isItemVisible = (item: NavItem): boolean => {
    if (item.requiresAdmin && !isAdmin) {
      return false;
    }
    if (item.requiresApproval && !hasApprovalPermissions()) {
      return false;
    }
    if (item.requiresNewsletter && !hasNewsletterPermissions()) {
      return false;
    }
    if (item.requiresMarketing && !hasMarketingPermissions()) {
      return false;
    }
    return true;
  };

  // Check if path is active
  const isActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Filter main nav items
  const visibleMainItems = NAV_GROUPS.main.filter(isItemVisible);

  return (
    <Sidebar collapsible="icon">
      {/* Navigation Content */}
      <SidebarContent
        style={{
          padding: 'var(--spacing-4)',
        }}
      >
        {/* Main Navigation Group */}
        <SidebarGroup style={{ padding: 0 }}>
          <SidebarGroupLabel
            style={{
              padding: 'var(--spacing-2) var(--spacing-4)',
              marginBottom: 'var(--spacing-2)',
              fontSize: 'var(--typography-font-size-xs)',
              fontWeight: 'var(--typography-font-weight-semibold)',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--typography-letter-spacing-wide)',
            }}
          >
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu style={{ gap: 'var(--spacing-1)' }}>
              {visibleMainItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);

                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      style={{
                        padding: 'var(--spacing-3) var(--spacing-4)',
                        borderRadius: 'var(--border-radius-lg)',
                      }}
                    >
                      <NavLink to={item.to} end={item.to === '/'}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: active ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            borderRadius: 'var(--border-radius-md)',
                            flexShrink: 0,
                          }}
                        >
                          <Icon style={{ width: '16px', height: '16px', color: active ? 'var(--color-signal-orange)' : 'var(--color-amber-400)' }} />
                        </div>
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator style={{ margin: 'var(--spacing-4) 0' }} />

        {/* Newsletter Group */}
        <SidebarGroup style={{ padding: 0 }}>
          <SidebarGroupLabel
            style={{
              padding: 'var(--spacing-2) var(--spacing-4)',
              marginBottom: 'var(--spacing-2)',
              fontSize: 'var(--typography-font-size-xs)',
              fontWeight: 'var(--typography-font-weight-semibold)',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--typography-letter-spacing-wide)',
            }}
          >
            Content
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <CollapsibleNavGroup
              parent={NAV_GROUPS.newsletter.parent}
              children={NAV_GROUPS.newsletter.children}
              isVisible={isItemVisible(NAV_GROUPS.newsletter.parent)}
              isItemVisible={isItemVisible}
              isActive={isActive}
              defaultExpanded
            />
            <CollapsibleNavGroup
              parent={NAV_GROUPS.marketing.parent}
              children={NAV_GROUPS.marketing.children}
              isVisible={isItemVisible(NAV_GROUPS.marketing.parent)}
              isItemVisible={isItemVisible}
              isActive={isActive}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Group */}
        {isAdmin && (
          <>
            <SidebarSeparator style={{ margin: 'var(--spacing-4) 0' }} />
            <SidebarGroup style={{ padding: 0 }}>
              <SidebarGroupLabel
                style={{
                  padding: 'var(--spacing-2) var(--spacing-4)',
                  marginBottom: 'var(--spacing-2)',
                  fontSize: 'var(--typography-font-size-xs)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--typography-letter-spacing-wide)',
                }}
              >
                System
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <CollapsibleNavGroup
                  parent={NAV_GROUPS.admin.parent}
                  children={NAV_GROUPS.admin.children}
                  isVisible={isItemVisible(NAV_GROUPS.admin.parent)}
                  isItemVisible={isItemVisible}
                  isActive={isActive}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer with User Info */}
      <SidebarFooter
        style={{
          padding: 'var(--spacing-4)',
          borderTop: '1px solid var(--color-border-default)',
        }}
      >
        <SidebarMenu style={{ gap: 'var(--spacing-2)' }}>
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                style={{
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  borderRadius: 'var(--border-radius-lg)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--border-radius-full)',
                    background: 'var(--gradient-btn-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                  }}
                >
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div
                  className="group-data-[collapsible=icon]:hidden"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    textAlign: 'left',
                    lineHeight: 1.3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {user.name || user.email}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-muted)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {user.role?.replace('_', ' ')}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarSeparator style={{ margin: 'var(--spacing-2) 0' }} />
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              style={{
                padding: 'var(--spacing-3) var(--spacing-4)',
                borderRadius: 'var(--border-radius-lg)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--border-radius-md)',
                  flexShrink: 0,
                }}
              >
                <LogOut style={{ width: '16px', height: '16px', color: 'var(--color-amber-400)' }} />
              </div>
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
});

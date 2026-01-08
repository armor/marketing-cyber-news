/**
 * AppSidebar Component
 *
 * Main navigation sidebar for NEXUS dashboard using MVPBlocks sidebar primitives.
 * Features role-based menu items and collapsible sidebar.
 */

import { memo } from 'react';
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
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/approval';

// ============================================================================
// Constants - Logo paths
// ============================================================================

const LOGO_DARK = '/branding/logos/armor-white-logo.svg';
const LOGO_LIGHT = '/branding/logos/armor-black-logo.svg';

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
    to: '/newsletter',
    icon: Mail,
    label: 'Newsletter',
    requiresNewsletter: true,
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
    ],
  },
  {
    to: '/campaigns',
    icon: Megaphone,
    label: 'Marketing',
    requiresMarketing: true,
    children: [
      {
        to: '/content-studio',
        icon: Wand2,
        label: 'Content Studio',
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

  // Filter nav items based on role
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    // Parent must be visible
    if (!isItemVisible(item)) {
      return false;
    }

    // If has children, at least one child must be visible
    if (item.children) {
      return item.children.some(isItemVisible);
    }

    return true;
  }).map((item) => {
    // Filter children for parent items
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(isItemVisible),
      };
    }
    return item;
  });

  // Check if path is active
  const isActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      {/* Logo Header */}
      <SidebarHeader
        style={{
          padding: 'var(--spacing-4)',
          borderBottom: '1px solid var(--color-border-default)',
        }}
      >
        <NavLink
          to="/"
          className="flex items-center transition-opacity hover:opacity-80"
          style={{ gap: 'var(--spacing-3)' }}
        >
          {/* Logo - shows full in expanded, icon only in collapsed */}
          <img
            src={LOGO_LIGHT}
            alt="Armor Cyber News"
            className="dark:hidden group-data-[collapsible=icon]:hidden"
            style={{
              height: 'var(--spacing-8)',
              width: 'auto',
            }}
          />
          <img
            src={LOGO_DARK}
            alt="Armor Cyber News"
            className="hidden dark:block dark:group-data-[collapsible=icon]:hidden"
            style={{
              height: 'var(--spacing-8)',
              width: 'auto',
            }}
          />
          {/* Shield icon for collapsed state */}
          <div
            className="hidden group-data-[collapsible=icon]:flex items-center justify-center"
            style={{
              width: 'var(--spacing-8)',
              height: 'var(--spacing-8)',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--gradient-btn-primary)',
              color: 'var(--color-bg-elevated)',
            }}
          >
            <Shield style={{ width: 'var(--spacing-5)', height: 'var(--spacing-5)' }} />
          </div>
        </NavLink>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent style={{ padding: 'var(--spacing-2)' }}>
        <SidebarGroup style={{ padding: 0 }}>
          <SidebarGroupLabel
            style={{
              padding: 'var(--spacing-2) var(--spacing-3)',
              fontSize: 'var(--typography-font-size-xs)',
              fontWeight: 'var(--typography-font-weight-medium)',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu style={{ gap: 'var(--spacing-1)' }}>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);

                // Parent item with children
                if (item.children && item.children.length > 0) {
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        style={{
                          padding: 'var(--spacing-2) var(--spacing-3)',
                          borderRadius: 'var(--border-radius-md)',
                        }}
                      >
                        <NavLink to={item.to}>
                          <Icon className="size-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isActive(child.to);
                          return (
                            <SidebarMenuSubItem key={child.to}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={childActive}
                                style={{
                                  padding: 'var(--spacing-2) var(--spacing-3)',
                                  borderRadius: 'var(--border-radius-md)',
                                }}
                              >
                                <NavLink to={child.to}>
                                  <ChildIcon className="size-4 shrink-0" />
                                  <span>{child.label}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  );
                }

                // Regular item without children
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      style={{
                        padding: 'var(--spacing-2) var(--spacing-3)',
                        borderRadius: 'var(--border-radius-md)',
                      }}
                    >
                      <NavLink to={item.to} end={item.to === '/'}>
                        <Icon className="size-4 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Info */}
      <SidebarFooter
        style={{
          padding: 'var(--spacing-3)',
          borderTop: '1px solid var(--color-border-default)',
        }}
      >
        <SidebarMenu style={{ gap: 'var(--spacing-1)' }}>
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                style={{
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  borderRadius: 'var(--border-radius-md)',
                }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 'var(--spacing-8)',
                    height: 'var(--spacing-8)',
                    borderRadius: 'var(--border-radius-full)',
                    background: 'var(--gradient-btn-primary)',
                    color: 'var(--color-bg-elevated)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                  }}
                >
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span
                    className="truncate"
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {user.name || user.email}
                  </span>
                  <span
                    className="truncate capitalize"
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-secondary)',
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
                padding: 'var(--spacing-2) var(--spacing-3)',
                borderRadius: 'var(--border-radius-md)',
                color: 'var(--color-text-primary)',
              }}
            >
              <LogOut className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
});

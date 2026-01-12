/**
 * ApprovalPage Component
 *
 * Main approval workflow page that integrates ApprovalQueue component
 * with role-based access control, authentication checks, and navigation.
 * Uses MVPBlocks sidebar layout via MainLayout wrapper.
 *
 * Features:
 * - Role-based queue display (gate-specific for reviewers, all for admins)
 * - Page header with title and user role badge
 * - Breadcrumb navigation
 * - Authentication check with redirect to login
 * - Authorization check with unauthorized message
 * - Toast notifications for approval actions
 * - Responsive layout with design tokens
 * - MVPBlocks sidebar integration
 *
 * Access:
 * - marketing: Marketing gate queue only
 * - branding: Branding gate queue only
 * - soc_level_1: SOC L1 gate queue only
 * - soc_level_3: SOC L3 gate queue only
 * - ciso: CISO gate queue only
 * - admin/super_admin: All pending articles with gate filter
 * - user: Unauthorized (no approval access)
 *
 * @example
 * ```tsx
 * <Route path="/approvals" element={<ApprovalPage />} />
 * ```
 */

import { type ReactElement, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { ShieldCheck, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { ApprovalQueue } from '@/components/approval/ApprovalQueue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  getUserGate,
  GATE_LABELS,
  type UserRole,
  type ApprovalGate,
} from '@/types/approval';

// ============================================================================
// Constants
// ============================================================================

const LOGIN_REDIRECT_PATH = '/login';
const DASHBOARD_PATH = '/';

/**
 * Roles that have approval access
 */
const APPROVAL_ROLES: readonly UserRole[] = [
  'marketing',
  'branding',
  'soc_level_1',
  'soc_level_3',
  'ciso',
  'admin',
  'super_admin',
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a user role has any approval access
 */
function hasApprovalAccess(role: UserRole): boolean {
  return APPROVAL_ROLES.includes(role);
}

/**
 * Get page title based on user role
 */
function getPageTitle(role: UserRole, gate: ApprovalGate | null): string {
  if (role === 'admin' || role === 'super_admin') {
    return 'All Pending Articles';
  }

  if (gate) {
    return `${GATE_LABELS[gate]} Approval Queue`;
  }

  return 'Approval Queue';
}

// ============================================================================
// Component
// ============================================================================

/**
 * Main approval workflow page
 *
 * No props - state managed through auth context and routing
 * Designed to be rendered within MainLayout (MVPBlocks sidebar)
 */
export function ApprovalPage(): ReactElement {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // ============================================================================
  // Authentication Check
  // ============================================================================

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Authentication Required', {
        description: 'Please log in to access the approval queue.',
      });
      navigate(LOGIN_REDIRECT_PATH);
    }
  }, [authLoading, isAuthenticated, navigate]);

  // ============================================================================
  // Authorization Check
  // ============================================================================

  const userRole = user?.role as UserRole | undefined;
  const hasAccess = userRole ? hasApprovalAccess(userRole) : false;
  const userGate = userRole ? getUserGate(userRole) : null;
  const pageTitle = userRole ? getPageTitle(userRole, userGate) : 'Approval Queue';

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Navigate to article detail (can be slide-over or full page)
   */
  const handleArticleSelect = (articleId: string): void => {
    navigate(`/articles/${articleId}`);
  };

  // ============================================================================
  // Loading State
  // ============================================================================

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <ShieldCheck
            className="mx-auto mb-4 animate-pulse"
            style={{
              width: 'var(--spacing-12)',
              height: 'var(--spacing-12)',
              color: 'var(--color-accent-primary)',
            }}
          />
          <p
            style={{
              fontSize: 'var(--typography-font-size-lg)',
              fontWeight: 'var(--typography-font-weight-medium)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Unauthorized State
  // ============================================================================

  if (!hasAccess || !userRole) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="text-center pt-6">
            <ShieldCheck
              className="mx-auto mb-4"
              style={{
                width: 'var(--spacing-12)',
                height: 'var(--spacing-12)',
                color: 'var(--color-semantic-error)',
              }}
            />
            <h2
              style={{
                fontSize: 'var(--typography-font-size-xl)',
                fontWeight: 'var(--typography-font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Access Denied
            </h2>
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-4)',
              }}
            >
              You do not have permission to access the approval queue. Contact
              your administrator to request approval access.
            </p>
            <Button asChild variant="default">
              <NavLink to={DASHBOARD_PATH}>
                <Home className="size-4 mr-2" />
                Back to Dashboard
              </NavLink>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Main Render - Works within MVPBlocks MainLayout
  // ============================================================================

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: DASHBOARD_PATH },
          { label: 'Approvals' },
        ]}
        title={pageTitle}
        description="Review and approve pending articles"
        actions={
          <Badge
            variant="secondary"
            className="capitalize"
            style={{
              padding: 'var(--spacing-1) var(--spacing-3)',
              fontSize: 'var(--typography-font-size-xs)',
              fontWeight: 'var(--typography-font-weight-medium)',
            }}
          >
            {userRole.replace('_', ' ')}
          </Badge>
        }
      />

      {/* Main Content Area */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          padding: 'var(--spacing-6)',
        }}
      >
        <ApprovalQueue onArticleSelect={handleArticleSelect} />
      </div>
    </div>
  );
}

ApprovalPage.displayName = 'ApprovalPage';

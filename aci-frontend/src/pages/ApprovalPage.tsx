/**
 * ApprovalPage Component
 *
 * Main approval workflow page that integrates ApprovalQueue component
 * with role-based access control, authentication checks, and navigation.
 *
 * Features:
 * - Role-based queue display (gate-specific for reviewers, all for admins)
 * - Header shows user role and target gate
 * - Navigation with back button and breadcrumbs
 * - Authentication check with redirect to login
 * - Authorization check with unauthorized message
 * - Toast notifications for approval actions
 * - Responsive layout with design tokens
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
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { ApprovalQueue } from '@/components/approval/ApprovalQueue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
   * Navigate back to dashboard
   */
  const handleBack = (): void => {
    navigate(DASHBOARD_PATH);
  };

  /**
   * Navigate to article detail (can be slide-over or full page)
   */
  const handleArticleSelect = (articleId: string): void => {
    // For now, navigate to a detail route
    // TODO: Implement slide-over panel for article detail
    navigate(`/articles/${articleId}`);
  };

  // ============================================================================
  // Loading State
  // ============================================================================

  if (authLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{
          backgroundColor: 'var(--color-background)',
        }}
      >
        <div
          className="text-center"
          style={{
            color: 'var(--color-text-secondary)',
          }}
        >
          <ShieldCheck
            className="mx-auto mb-4 animate-pulse"
            style={{
              width: 'var(--icon-size-2xl)',
              height: 'var(--icon-size-2xl)',
              color: 'var(--color-primary)',
            }}
          />
          <p
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-medium)',
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
      <div
        className="min-h-screen"
        style={{
          backgroundColor: 'var(--color-background)',
          padding: 'var(--spacing-page-padding)',
        }}
      >
        <Card
          className="max-w-2xl mx-auto"
          style={{
            marginTop: 'var(--spacing-section-gap)',
          }}
        >
          <CardContent
            className="text-center"
            style={{
              padding: 'var(--spacing-component-xl)',
            }}
          >
            <ShieldCheck
              className="mx-auto mb-4"
              style={{
                width: 'var(--icon-size-2xl)',
                height: 'var(--icon-size-2xl)',
                color: 'var(--color-destructive)',
              }}
            />
            <h2
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-gap-md)',
              }}
            >
              Access Denied
            </h2>
            <p
              style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-gap-lg)',
              }}
            >
              You do not have permission to access the approval queue. Contact
              your administrator to request approval access.
            </p>
            <Button onClick={handleBack} variant="default">
              <ArrowLeft
                style={{
                  width: 'var(--icon-size-sm)',
                  height: 'var(--icon-size-sm)',
                  marginRight: 'var(--spacing-gap-sm)',
                }}
              />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--color-background)',
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: `var(--border-width-thin) solid var(--color-border)`,
          padding: 'var(--spacing-component-lg) var(--spacing-page-padding)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Left: Back button and title */}
            <div className="flex items-center gap-[var(--spacing-gap-lg)]">
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
                aria-label="Back to dashboard"
              >
                <ArrowLeft
                  style={{
                    width: 'var(--icon-size-sm)',
                    height: 'var(--icon-size-sm)',
                    marginRight: 'var(--spacing-gap-sm)',
                  }}
                />
                Back
              </Button>

              <div className="flex items-center gap-[var(--spacing-gap-md)]">
                <ShieldCheck
                  style={{
                    width: 'var(--icon-size-lg)',
                    height: 'var(--icon-size-lg)',
                    color: 'var(--color-primary)',
                  }}
                />
                <h1
                  style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {pageTitle}
                </h1>
              </div>
            </div>

            {/* Right: User info badge */}
            <div className="flex items-center gap-[var(--spacing-gap-md)]">
              <User
                style={{
                  width: 'var(--icon-size-sm)',
                  height: 'var(--icon-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              />
              <div className="flex flex-col items-end gap-[var(--spacing-gap-xs)]">
                <span
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {user?.name || user?.email}
                </span>
                <Badge
                  variant="secondary"
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    textTransform: 'capitalize',
                  }}
                >
                  {userRole.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div
            className="flex items-center gap-[var(--spacing-gap-sm)]"
            style={{
              marginTop: 'var(--spacing-gap-md)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <button
              onClick={handleBack}
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                color: 'var(--color-text-secondary)',
              }}
            >
              Dashboard
            </button>
            <span>&gt;</span>
            <span
              style={{
                color: 'var(--color-text-primary)',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              Approvals
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          padding: 'var(--spacing-page-padding)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          <ApprovalQueue onArticleSelect={handleArticleSelect} />
        </div>
      </main>
    </div>
  );
}

ApprovalPage.displayName = 'ApprovalPage';

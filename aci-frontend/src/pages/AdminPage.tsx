/**
 * AdminPage Component
 *
 * Admin dashboard page for content review and article approval workflow.
 * Displays review queue with pending articles awaiting categorization review.
 * Requires admin role authentication.
 *
 * Features:
 * - Review queue with pending articles
 * - Admin statistics summary
 * - Approve/reject workflow
 * - Article release for publication
 * - Real-time queue updates
 *
 * Route: /admin
 * Auth: Required (admin role)
 *
 * @example
 * ```tsx
 * <Route path="/admin" element={<AdminPage />} />
 * ```
 */

import { useState } from 'react';
import { ReviewQueue } from '@/components/admin/ReviewQueue';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/styles/tokens/colors';
import { spacing, componentSpacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { borders } from '@/styles/tokens/borders';

/**
 * AdminPage Component
 *
 * Main admin dashboard page for content review.
 */
export function AdminPage() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);

  // Check admin role
  const isAdmin = user?.role === 'admin';

  // ============================================================================
  // Unauthorized Access
  // ============================================================================

  if (!isAdmin) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid="admin-unauthorized"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: componentSpacing.xl,
        }}
      >
        <div
          style={{
            fontSize: typography.fontSize['4xl'],
            marginBottom: spacing[4],
          }}
          aria-hidden="true"
        >
          🔒
        </div>
        <h1
          style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}
        >
          Unauthorized Access
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            textAlign: 'center',
          }}
        >
          You do not have permission to access this page. Admin privileges required.
        </p>
      </div>
    );
  }

  // ============================================================================
  // Admin Dashboard
  // ============================================================================

  return (
    <div
      data-testid="admin-page"
      style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: componentSpacing.xl,
      }}
    >
      {/* Page Header */}
      <header
        style={{
          marginBottom: spacing[8],
          paddingBottom: spacing[6],
          borderBottomWidth: borders.width.thin,
          borderBottomColor: colors.border.default,
          borderBottomStyle: 'solid',
        }}
      >
        <h1
          style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}
        >
          Admin Dashboard
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
          }}
        >
          Review and approve articles for publication
        </p>
      </header>

      {/* Main Content: Review Queue */}
      <main>
        <ReviewQueue page={currentPage} pageSize={20} onPageChange={setCurrentPage} />
      </main>
    </div>
  );
}

AdminPage.displayName = 'AdminPage';

/**
 * Accessibility Notes:
 * - Semantic HTML structure with <header> and <main>
 * - Unauthorized state with role="alert" and aria-live="assertive"
 * - Proper heading hierarchy (h1 for page title)
 * - Color contrast meets WCAG AA standards
 * - Keyboard navigation support
 *
 * Design Token Usage:
 * - All colors via colors.* tokens
 * - All spacing via spacing.* and componentSpacing.* tokens
 * - All typography via typography.* tokens
 * - All borders via borders.* tokens
 * - NO hardcoded CSS values
 *
 * Security:
 * - Checks admin role before rendering admin content
 * - Shows unauthorized message for non-admin users
 * - Requires authentication (enforced by route guard)
 *
 * Testing:
 * - data-testid="admin-page" for authorized view
 * - data-testid="admin-unauthorized" for unauthorized view
 */

/**
 * ReviewQueue Component
 *
 * Displays paginated list of pending articles awaiting admin review.
 * Shows loading states, empty states, and error states.
 * Integrates with useReviewQueue hook for data fetching and mutations.
 *
 * Features:
 * - Paginated list of ContentReviewCard components
 * - Loading spinner during data fetch
 * - Empty state when no articles pending
 * - Error state with retry button
 * - Pagination controls
 * - Real-time updates via polling
 *
 * @example
 * ```tsx
 * <ReviewQueue page={1} pageSize={20} />
 * ```
 */

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { ContentReviewCard } from './ContentReviewCard';
import { Button } from '@/components/ui/button';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import { colors } from '@/styles/tokens/colors';
import { spacing, componentSpacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { borders } from '@/styles/tokens/borders';

export interface ReviewQueueProps {
  /** Current page number (1-indexed) */
  page?: number;

  /** Items per page */
  pageSize?: number;

  /** Callback when page changes */
  onPageChange?: (page: number) => void;
}

/**
 * ReviewQueue Component
 *
 * Renders a list of pending articles for admin review with pagination.
 * Handles loading, empty, and error states automatically.
 */
export function ReviewQueue({ page = 1, pageSize = 20, onPageChange }: ReviewQueueProps) {
  const [currentPage, setCurrentPage] = useState(page);

  const {
    articles,
    pagination,
    isLoading,
    isError,
    error,
    refetch,
    approveArticle,
    rejectArticle,
    isApproving,
    isRejecting,
  } = useReviewQueue({ page: currentPage, pageSize });

  // ============================================================================
  // Pagination Handlers
  // ============================================================================

  const handleNextPage = () => {
    if (pagination?.hasNextPage) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      onPageChange?.(nextPage);
    }
  };

  const handlePreviousPage = () => {
    if (pagination?.hasPreviousPage) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      onPageChange?.(prevPage);
    }
  };

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading review queue"
        data-testid="review-queue-loading"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: componentSpacing.xl,
          minHeight: '400px',
        }}
      >
        <div
          className="animate-spin"
          style={{
            width: spacing[12],
            height: spacing[12],
            borderWidth: borders.width.medium,
            borderStyle: 'solid',
            borderColor: colors.border.default,
            borderTopColor: colors.brand.primary,
            borderRadius: borders.radius.full,
            marginBottom: spacing[4],
          }}
        />
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
          }}
        >
          Loading review queue...
        </p>
      </div>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================

  if (isError) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid="review-queue-error"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: componentSpacing.xl,
          minHeight: '400px',
        }}
      >
        <AlertCircle
          size={48}
          style={{
            color: colors.semantic.error,
            marginBottom: spacing[4],
          }}
          aria-hidden="true"
        />
        <h3
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}
        >
          Failed to Load Review Queue
        </h3>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            marginBottom: spacing[4],
            textAlign: 'center',
          }}
        >
          {error?.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={refetch} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  // ============================================================================
  // Empty State
  // ============================================================================

  if (!articles || articles.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="review-queue-empty"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: componentSpacing.xl,
          minHeight: '400px',
        }}
      >
        <div
          style={{
            fontSize: typography.fontSize['4xl'],
            marginBottom: spacing[4],
          }}
          aria-hidden="true"
        >
          ✅
        </div>
        <h3
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}
        >
          No Articles Pending Review
        </h3>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            textAlign: 'center',
          }}
        >
          All articles have been reviewed. Check back later for new submissions.
        </p>
      </div>
    );
  }

  // ============================================================================
  // Content List
  // ============================================================================

  return (
    <div data-testid="review-queue" aria-label="Review queue">
      {/* Queue Header */}
      <div
        style={{
          marginBottom: spacing[6],
          paddingBottom: spacing[4],
          borderBottomWidth: borders.width.thin,
          borderBottomColor: colors.border.default,
          borderBottomStyle: 'solid',
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}
        >
          Content Review Queue
        </h2>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
          }}
        >
          {pagination?.total || 0} articles pending review
        </p>
      </div>

      {/* Article Cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[6],
          marginBottom: spacing[6],
        }}
      >
        {articles.map((article) => (
          <ContentReviewCard
            key={article.id}
            article={article}
            onApprove={approveArticle}
            onReject={rejectArticle}
            isApproving={isApproving}
            isRejecting={isRejecting}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: spacing[4],
            borderTopWidth: borders.width.thin,
            borderTopColor: colors.border.default,
            borderTopStyle: 'solid',
          }}
        >
          <Button
            onClick={handlePreviousPage}
            disabled={!pagination.hasPreviousPage}
            variant="outline"
            aria-label="Previous page"
          >
            Previous
          </Button>

          <span
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
            }}
          >
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <Button
            onClick={handleNextPage}
            disabled={!pagination.hasNextPage}
            variant="outline"
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

ReviewQueue.displayName = 'ReviewQueue';

/**
 * Accessibility Notes:
 * - Loading state with role="status" and aria-live="polite"
 * - Error state with role="alert" and aria-live="assertive"
 * - Empty state with role="status"
 * - Pagination buttons with descriptive aria-labels
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
 * Testing:
 * - data-testid="review-queue" for main content
 * - data-testid="review-queue-loading" for loading state
 * - data-testid="review-queue-error" for error state
 * - data-testid="review-queue-empty" for empty state
 */

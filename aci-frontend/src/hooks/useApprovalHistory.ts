/**
 * useApprovalHistory Hook
 *
 * TanStack Query hook for fetching approval history for a specific article.
 * Shows all gate approvals, rejection details, and release information.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchApprovalHistory } from '@/services/api/approvals';
import type { ApprovalHistoryResponse } from '@/types/approval';
import { approvalKeys } from './approvalKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Return value from useApprovalHistory hook
 */
export interface UseApprovalHistoryReturn {
  readonly data: ApprovalHistoryResponse | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
}

// ============================================================================
// Hook
// ============================================================================

const STALE_TIME_MS = 60000; // 60 seconds

/**
 * Hook to fetch approval history with TanStack Query
 *
 * Fetches detailed approval history for a specific article including:
 * - All gate approvals with approver information
 * - Rejection details if applicable
 * - Release information if applicable
 * - Current progress through workflow
 *
 * Only enabled when articleId is defined.
 *
 * @param articleId - Article ID to fetch history for (undefined disables query)
 * @returns {UseApprovalHistoryReturn} History data and loading states
 */
export function useApprovalHistory(
  articleId: string | undefined
): UseApprovalHistoryReturn {
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: approvalKeys.history(articleId ?? ''),
    queryFn: () => {
      if (!articleId) {
        throw new Error('Article ID is required');
      }
      return fetchApprovalHistory(articleId);
    },
    enabled: articleId !== undefined,
    staleTime: STALE_TIME_MS,
  });

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
  };
}

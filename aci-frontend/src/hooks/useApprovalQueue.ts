/**
 * useApprovalQueue Hook
 *
 * TanStack Query hook for fetching paginated approval queue data.
 * Supports filtering by category, severity, date range, and sorting.
 * Only fetches when user is authenticated.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchApprovalQueue } from '@/services/api/approvals';
import type { ApprovalQueueResponse } from '@/types/approval';
import { approvalKeys } from './approvalKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for approval queue query
 */
export interface UseApprovalQueueOptions {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: 'created_at' | 'severity' | 'category';
  readonly sortOrder?: 'asc' | 'desc';
  readonly categoryId?: string;
  readonly severity?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly enabled?: boolean;
}

/**
 * Return value from useApprovalQueue hook
 */
export interface UseApprovalQueueReturn {
  readonly data: ApprovalQueueResponse | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const STALE_TIME_MS = 30000; // 30 seconds

/**
 * Hook to fetch approval queue with TanStack Query
 *
 * Fetches articles pending approval for the current user's role.
 * Query key includes all filter parameters for proper cache invalidation.
 * Auto-refetches on window focus to keep queue up-to-date.
 *
 * @param options - Configuration options for query filters, pagination, and behavior
 * @returns {UseApprovalQueueReturn} Queue data, loading states, and refetch function
 */
export function useApprovalQueue(
  options?: UseApprovalQueueOptions
): UseApprovalQueueReturn {
  const page = options?.page ?? DEFAULT_PAGE;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const enabled = options?.enabled !== false;

  const queryParams = {
    page,
    pageSize,
    sortBy: options?.sortBy,
    sortOrder: options?.sortOrder,
    categoryId: options?.categoryId,
    severity: options?.severity,
    dateFrom: options?.dateFrom,
    dateTo: options?.dateTo,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: approvalKeys.queue(queryParams),
    queryFn: () => fetchApprovalQueue(queryParams),
    enabled,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });

  // Wrap refetch to return void instead of Promise
  const refetch = (): void => {
    void originalRefetch();
  };

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

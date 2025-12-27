/**
 * useIssues Hook
 *
 * TanStack Query hook for fetching paginated newsletter issues.
 * Supports filtering by configuration, segment, status, and date range.
 */

import { useQuery } from '@tanstack/react-query';
import { getIssues } from '@/services/api/newsletter';
import type { IssueListResponse, IssueStatus } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for issues query
 */
export interface UseIssuesOptions {
  readonly configurationId?: string;
  readonly segmentId?: string;
  readonly status?: IssueStatus;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly enabled?: boolean;
}

/**
 * Return value from useIssues hook
 */
export interface UseIssuesReturn {
  readonly data: IssueListResponse | undefined;
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
 * Hook to fetch newsletter issues with TanStack Query
 *
 * Fetches paginated list of newsletter issues with comprehensive filters.
 * Query key includes all filter parameters for proper cache invalidation.
 * Auto-refetches on window focus to keep data up-to-date.
 *
 * @param options - Configuration options for query filters, pagination, and behavior
 * @returns {UseIssuesReturn} Issues data, loading states, and refetch function
 */
export function useIssues(options?: UseIssuesOptions): UseIssuesReturn {
  const page = options?.page ?? DEFAULT_PAGE;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const enabled = options?.enabled !== false;

  const queryParams = {
    configuration_id: options?.configurationId,
    segment_id: options?.segmentId,
    status: options?.status,
    date_from: options?.dateFrom,
    date_to: options?.dateTo,
    page,
    page_size: pageSize,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.issueList(queryParams),
    queryFn: () => getIssues(queryParams),
    enabled,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });

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

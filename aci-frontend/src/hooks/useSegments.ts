/**
 * useSegments Hook
 *
 * TanStack Query hook for fetching paginated newsletter audience segments.
 * Supports filtering by active status and pagination.
 */

import { useQuery } from '@tanstack/react-query';
import { getSegments } from '@/services/api/newsletter';
import type { SegmentListResponse } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for segments query
 */
export interface UseSegmentsOptions {
  readonly page?: number;
  readonly pageSize?: number;
  readonly isActive?: boolean;
  readonly enabled?: boolean;
}

/**
 * Return value from useSegments hook
 */
export interface UseSegmentsReturn {
  readonly data: SegmentListResponse | undefined;
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
const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch newsletter segments with TanStack Query
 *
 * Fetches paginated list of audience segments with optional filters.
 * Query key includes all filter parameters for proper cache invalidation.
 * Auto-refetches on window focus to keep data up-to-date.
 *
 * @param options - Configuration options for query filters, pagination, and behavior
 * @returns {UseSegmentsReturn} Segment data, loading states, and refetch function
 */
export function useSegments(options?: UseSegmentsOptions): UseSegmentsReturn {
  const page = options?.page ?? DEFAULT_PAGE;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const enabled = options?.enabled !== false;

  const queryParams = {
    page,
    page_size: pageSize,
    is_active: options?.isActive,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.segmentList(queryParams),
    queryFn: () => getSegments(queryParams),
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

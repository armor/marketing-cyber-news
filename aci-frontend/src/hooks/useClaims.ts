/**
 * useClaims Hook
 *
 * TanStack Query hook for fetching paginated claims library entries.
 * Supports filtering by type, category, approval status, and search.
 */

import { useQuery } from '@tanstack/react-query';
import { getClaims } from '@/services/api/claims';
import type { ClaimListResponse, ClaimFilter } from '@/types/claims';
import { claimsKeys } from './claimsKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for claims query
 */
export interface UseClaimsOptions extends ClaimFilter {
  readonly enabled?: boolean;
}

/**
 * Return value from useClaims hook
 */
export interface UseClaimsReturn {
  readonly data: ClaimListResponse | undefined;
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
 * Hook to fetch claims library entries with TanStack Query
 *
 * Fetches paginated list of claims with optional filters.
 * Query key includes all filter parameters for proper cache invalidation.
 * Auto-refetches on window focus to keep data up-to-date.
 *
 * @param options - Configuration options for query filters, pagination, and behavior
 * @returns {UseClaimsReturn} Claims data, loading states, and refetch function
 *
 * @example
 * ```typescript
 * // Fetch all approved claims
 * const { data, isLoading } = useClaims({ approval_status: 'approved' });
 *
 * // Fetch do-not-say items
 * const { data } = useClaims({ claim_type: 'do_not_say' });
 *
 * // Search claims
 * const { data } = useClaims({ search: 'FDA approved' });
 * ```
 */
export function useClaims(options?: UseClaimsOptions): UseClaimsReturn {
  const page = options?.page ?? DEFAULT_PAGE;
  const pageSize = options?.page_size ?? DEFAULT_PAGE_SIZE;
  const enabled = options?.enabled !== false;

  const queryParams: ClaimFilter = {
    page,
    page_size: pageSize,
    claim_type: options?.claim_type,
    category: options?.category,
    approval_status: options?.approval_status,
    tags: options?.tags,
    search: options?.search,
    include_expired: options?.include_expired,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: claimsKeys.list(queryParams),
    queryFn: () => getClaims(queryParams),
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

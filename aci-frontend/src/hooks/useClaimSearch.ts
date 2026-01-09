/**
 * useClaimSearch Hook
 *
 * TanStack Query hook for searching claims by text.
 * Used for typeahead search and claim selection components.
 */

import { useQuery } from '@tanstack/react-query';
import { searchClaims } from '@/services/api/claims';
import type { Claim } from '@/types/claims';
import { claimsKeys } from './claimsKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for claim search query
 */
export interface UseClaimSearchOptions {
  readonly query: string;
  readonly limit?: number;
  readonly enabled?: boolean;
}

/**
 * Return value from useClaimSearch hook
 */
export interface UseClaimSearchReturn {
  readonly data: Claim[] | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

const DEFAULT_LIMIT = 10;
const STALE_TIME_MS = 30 * 1000; // 30 seconds
const MIN_QUERY_LENGTH = 2; // Minimum characters before search

/**
 * Hook to search claims by text query
 *
 * Performs text search across claim_text field.
 * Only executes query when search string has minimum length.
 * Useful for typeahead and claim selector components.
 *
 * @param options - Search query, limit, and enabled flag
 * @returns {UseClaimSearchReturn} Search results, loading states, and refetch function
 *
 * @example
 * ```typescript
 * const [searchQuery, setSearchQuery] = useState('');
 * const { data: results, isLoading } = useClaimSearch({
 *   query: searchQuery,
 *   limit: 5,
 *   enabled: searchQuery.length >= 2
 * });
 *
 * // Display search results
 * results?.map(claim => (
 *   <ClaimOption key={claim.id} claim={claim} />
 * ))
 * ```
 */
export function useClaimSearch(
  options: UseClaimSearchOptions
): UseClaimSearchReturn {
  const { query, limit = DEFAULT_LIMIT, enabled = true } = options;

  // Only search when query has minimum length
  const shouldSearch = enabled && query.length >= MIN_QUERY_LENGTH;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: claimsKeys.search(query, limit),
    queryFn: () => searchClaims(query, limit),
    enabled: shouldSearch,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false, // Don't refetch search results on focus
  });

  // Wrap refetch to return void instead of Promise
  const refetch = (): void => {
    void originalRefetch();
  };

  return {
    data,
    isLoading: shouldSearch && isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

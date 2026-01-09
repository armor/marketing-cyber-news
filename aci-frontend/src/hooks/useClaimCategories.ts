/**
 * useClaimCategories Hook
 *
 * TanStack Query hook for fetching claim categories.
 * Used for filter dropdowns and category selection in forms.
 */

import { useQuery } from '@tanstack/react-query';
import { getClaimCategories } from '@/services/api/claims';
import { claimsKeys } from './claimsKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for categories query
 */
export interface UseClaimCategoriesOptions {
  readonly enabled?: boolean;
}

/**
 * Return value from useClaimCategories hook
 */
export interface UseClaimCategoriesReturn {
  readonly data: string[] | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

const STALE_TIME_MS = 10 * 60 * 1000; // 10 minutes (categories change rarely)

/**
 * Hook to fetch claim categories
 *
 * Fetches list of all unique categories in the claims library.
 * Has longer stale time since categories change infrequently.
 *
 * @param options - Optional configuration for query behavior
 * @returns {UseClaimCategoriesReturn} Categories data, loading states, and refetch function
 *
 * @example
 * ```typescript
 * const { data: categories, isLoading } = useClaimCategories();
 *
 * // Use in select dropdown
 * <Select>
 *   {categories?.map(cat => (
 *     <SelectItem key={cat} value={cat}>{cat}</SelectItem>
 *   ))}
 * </Select>
 * ```
 */
export function useClaimCategories(
  options?: UseClaimCategoriesOptions
): UseClaimCategoriesReturn {
  const enabled = options?.enabled !== false;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: claimsKeys.categories,
    queryFn: () => getClaimCategories(),
    enabled,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false, // Categories don't need frequent updates
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

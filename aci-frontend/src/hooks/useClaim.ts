/**
 * useClaim Hook
 *
 * TanStack Query hook for fetching a single claim by ID.
 */

import { useQuery } from '@tanstack/react-query';
import { getClaim } from '@/services/api/claims';
import type { Claim } from '@/types/claims';
import { claimsKeys } from './claimsKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for single claim query
 */
export interface UseClaimOptions {
  readonly id: string;
  readonly enabled?: boolean;
}

/**
 * Return value from useClaim hook
 */
export interface UseClaimReturn {
  readonly data: Claim | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

const STALE_TIME_MS = 30000; // 30 seconds

/**
 * Hook to fetch single claim by ID
 *
 * Fetches detailed claim data for a specific claim entry.
 * Auto-refetches on window focus to keep data up-to-date.
 *
 * @param options - Configuration options with required ID and optional enabled flag
 * @returns {UseClaimReturn} Claim data, loading states, and refetch function
 *
 * @example
 * ```typescript
 * const { data: claim, isLoading } = useClaim({ id: 'claim_123' });
 *
 * // Conditional fetch
 * const { data } = useClaim({ id: selectedClaimId, enabled: !!selectedClaimId });
 * ```
 */
export function useClaim(options: UseClaimOptions): UseClaimReturn {
  const { id, enabled = true } = options;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: claimsKeys.detail(id),
    queryFn: () => getClaim(id),
    enabled: enabled && Boolean(id),
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

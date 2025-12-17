/**
 * useThreat Hook
 *
 * TanStack Query hook for fetching single threat detail by ID.
 * Includes full content, CVEs, metadata, and bookmark status.
 *
 * @example
 * ```typescript
 * const { data: threat, isLoading, error, refetch } = useThreat('threat-123');
 *
 * if (threat) {
 *   console.log(threat.title);
 *   console.log(threat.cves);
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { getThreat } from '@/services/api/threats';
import { queryKeys } from '@/services/api/queryClient';
import type { Threat } from '@/types/threat';

// ============================================================================
// Types
// ============================================================================

/**
 * Return value from useThreat hook
 */
export interface UseThreatReturn {
  readonly data: Threat | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

const STALE_TIME_MS = 60000; // 1 minute

/**
 * Hook to fetch single threat detail with TanStack Query
 *
 * Fetches complete threat data including full content, CVEs, and metadata.
 * Query is enabled by default and will fetch immediately on mount.
 * Data is cached with 1 minute stale time.
 *
 * @param threatId - Threat UUID to fetch
 * @returns {UseThreatReturn} Threat data, loading states, and refetch function
 */
export function useThreat(threatId: string): UseThreatReturn {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: queryKeys.threats.detail(threatId),
    queryFn: () => getThreat(threatId),
    enabled: Boolean(threatId && threatId.trim().length > 0),
    staleTime: STALE_TIME_MS,
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

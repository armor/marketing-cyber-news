/**
 * useContentSources Hook
 *
 * TanStack Query hook for fetching content sources.
 * Supports filtering by active status and source type.
 */

import { useQuery } from '@tanstack/react-query';
import { getContentSources } from '@/services/api/newsletter';
import type { ContentSourceListResponse, SourceType } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for content sources query
 */
export interface UseContentSourcesOptions {
  readonly isActive?: boolean;
  readonly sourceType?: SourceType;
  readonly enabled?: boolean;
}

/**
 * Return value from useContentSources hook
 */
export interface UseContentSourcesReturn {
  readonly data: ContentSourceListResponse | undefined;
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
 * Hook to fetch content sources with TanStack Query
 *
 * Fetches list of content sources with optional filters.
 * Query key includes all filter parameters for proper cache invalidation.
 * Auto-refetches on window focus to keep data up-to-date.
 *
 * @param options - Configuration options for query filters and behavior
 * @returns {UseContentSourcesReturn} Content sources data, loading states, and refetch function
 */
export function useContentSources(
  options?: UseContentSourcesOptions
): UseContentSourcesReturn {
  const enabled = options?.enabled !== false;

  const queryParams = {
    is_active: options?.isActive,
    source_type: options?.sourceType,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.contentSourceList(queryParams),
    queryFn: () => getContentSources(queryParams),
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

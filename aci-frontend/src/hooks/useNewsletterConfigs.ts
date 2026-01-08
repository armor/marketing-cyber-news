/**
 * useNewsletterConfigs Hook
 *
 * TanStack Query hook for fetching paginated newsletter configurations.
 * Supports filtering by segment, active status, and pagination.
 */

import { useQuery } from '@tanstack/react-query';
import { getConfigurations } from '@/services/api/newsletter';
import type { ConfigurationListResponse } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for newsletter configurations query
 */
export interface UseNewsletterConfigsOptions {
  readonly page?: number;
  readonly pageSize?: number;
  readonly segmentId?: string;
  readonly isActive?: boolean;
  readonly enabled?: boolean;
}

/**
 * Return value from useNewsletterConfigs hook
 */
export interface UseNewsletterConfigsReturn {
  readonly data: ConfigurationListResponse | undefined;
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
 * Hook to fetch newsletter configurations with TanStack Query
 *
 * Fetches paginated list of newsletter configurations with optional filters.
 * Query key includes all filter parameters for proper cache invalidation.
 * Auto-refetches on window focus to keep data up-to-date.
 *
 * @param options - Configuration options for query filters, pagination, and behavior
 * @returns {UseNewsletterConfigsReturn} Configuration data, loading states, and refetch function
 */
export function useNewsletterConfigs(
  options?: UseNewsletterConfigsOptions
): UseNewsletterConfigsReturn {
  const page = options?.page ?? DEFAULT_PAGE;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const enabled = options?.enabled !== false;

  const queryParams = {
    page,
    page_size: pageSize,
    segment_id: options?.segmentId,
    is_active: options?.isActive,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.configList(queryParams),
    queryFn: () => getConfigurations(queryParams),
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

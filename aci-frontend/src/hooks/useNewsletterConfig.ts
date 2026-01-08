/**
 * useNewsletterConfig Hook
 *
 * TanStack Query hook for fetching a single newsletter configuration by ID.
 */

import { useQuery } from '@tanstack/react-query';
import { getConfiguration } from '@/services/api/newsletter';
import type { NewsletterConfiguration } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for single configuration query
 */
export interface UseNewsletterConfigOptions {
  readonly id: string;
  readonly enabled?: boolean;
}

/**
 * Return value from useNewsletterConfig hook
 */
export interface UseNewsletterConfigReturn {
  readonly data: NewsletterConfiguration | undefined;
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
 * Hook to fetch single newsletter configuration by ID
 *
 * Fetches detailed configuration data for a specific configuration.
 * Auto-refetches on window focus to keep data up-to-date.
 *
 * @param options - Configuration options with required ID and optional enabled flag
 * @returns {UseNewsletterConfigReturn} Configuration data, loading states, and refetch function
 */
export function useNewsletterConfig(
  options: UseNewsletterConfigOptions
): UseNewsletterConfigReturn {
  const { id, enabled = true } = options;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.configDetail(id),
    queryFn: () => getConfiguration(id),
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

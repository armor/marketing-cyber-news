/**
 * useIssue Hook
 *
 * TanStack Query hook for fetching a single newsletter issue with full blocks.
 */

import { useQuery } from '@tanstack/react-query';
import { getIssue } from '@/services/api/newsletter';
import type { NewsletterIssue } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for single issue query
 */
export interface UseIssueOptions {
  readonly id: string;
  readonly enabled?: boolean;
}

/**
 * Return value from useIssue hook
 */
export interface UseIssueReturn {
  readonly data: NewsletterIssue | undefined;
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
 * Hook to fetch a single newsletter issue by ID with TanStack Query
 *
 * Fetches complete issue with all blocks for detail views.
 * Auto-refetches on window focus to keep data up-to-date.
 *
 * @param options - Configuration options including issue ID and behavior settings
 * @returns {UseIssueReturn} Issue data, loading states, and refetch function
 */
export function useIssue(options: UseIssueOptions): UseIssueReturn {
  const enabled = options.enabled !== false;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.issueDetail(options.id),
    queryFn: () => getIssue(options.id),
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

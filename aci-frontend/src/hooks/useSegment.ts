/**
 * useSegment Hook
 *
 * TanStack Query hook for fetching a single newsletter audience segment by ID.
 */

import { useQuery } from '@tanstack/react-query';
import { getSegment } from '@/services/api/newsletter';
import type { Segment } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for single segment query
 */
export interface UseSegmentOptions {
  readonly id: string;
  readonly enabled?: boolean;
}

/**
 * Return value from useSegment hook
 */
export interface UseSegmentReturn {
  readonly data: Segment | undefined;
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
 * Hook to fetch single newsletter segment by ID
 *
 * Fetches detailed segment data for a specific audience segment.
 * Auto-refetches on window focus to keep data up-to-date.
 *
 * @param options - Configuration options with required ID and optional enabled flag
 * @returns {UseSegmentReturn} Segment data, loading states, and refetch function
 */
export function useSegment(options: UseSegmentOptions): UseSegmentReturn {
  const { id, enabled = true } = options;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.segmentDetail(id),
    queryFn: () => getSegment(id),
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

/**
 * useIssuePreview Hook
 *
 * TanStack Query hook for fetching newsletter issue preview.
 * Supports optional personalization with contact ID.
 */

import { useQuery } from '@tanstack/react-query';
import { previewIssue } from '@/services/api/newsletter';
import type { IssuePreview } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for issue preview query
 */
export interface UseIssuePreviewOptions {
  readonly id: string;
  readonly contactId?: string;
  readonly enabled?: boolean;
}

/**
 * Return value from useIssuePreview hook
 */
export interface UseIssuePreviewReturn {
  readonly data: IssuePreview | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

const STALE_TIME_MS = 60000; // 1 minute - previews don't change often

/**
 * Hook to fetch newsletter issue preview with TanStack Query
 *
 * Fetches HTML preview with personalization tokens for a specific issue.
 * If contactId is provided, personalizes preview for that contact.
 * Otherwise, uses sample contact data.
 *
 * @param options - Configuration options including issue ID, optional contact ID, and behavior settings
 * @returns {UseIssuePreviewReturn} Preview data, loading states, and refetch function
 */
export function useIssuePreview(
  options: UseIssuePreviewOptions
): UseIssuePreviewReturn {
  const enabled = options.enabled !== false;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.issuePreview(options.id, options.contactId),
    queryFn: () => previewIssue(options.id, options.contactId),
    enabled,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false, // Previews don't need frequent updates
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

/**
 * useContentItems Hook
 *
 * TanStack Query hook for searching and fetching content items.
 * Supports comprehensive filtering by source, type, tags, and date range.
 */

import { useQuery } from '@tanstack/react-query';
import { searchContentItems } from '@/services/api/newsletter';
import type { ContentItemListResponse, ContentType } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for content items query
 */
export interface UseContentItemsOptions {
  readonly query?: string;
  readonly sourceId?: string;
  readonly contentType?: ContentType;
  readonly topicTags?: readonly string[];
  readonly frameworkTags?: readonly string[];
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly enabled?: boolean;
}

/**
 * Return value from useContentItems hook
 */
export interface UseContentItemsReturn {
  readonly data: ContentItemListResponse | undefined;
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
const STALE_TIME_MS = 30000; // 30 seconds

/**
 * Hook to search content items with TanStack Query
 *
 * Fetches paginated list of content items with comprehensive filters.
 * Query key includes all filter parameters for proper cache invalidation.
 * Auto-refetches on window focus to keep data up-to-date.
 *
 * @param options - Configuration options for query filters, pagination, and behavior
 * @returns {UseContentItemsReturn} Content items data, loading states, and refetch function
 */
export function useContentItems(
  options?: UseContentItemsOptions
): UseContentItemsReturn {
  const page = options?.page ?? DEFAULT_PAGE;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const enabled = options?.enabled !== false;

  const queryParams = {
    q: options?.query,
    source_id: options?.sourceId,
    content_type: options?.contentType,
    topic_tags: options?.topicTags,
    framework_tags: options?.frameworkTags,
    date_from: options?.dateFrom,
    date_to: options?.dateTo,
    page,
    page_size: pageSize,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.contentItemList(queryParams),
    queryFn: () => searchContentItems(queryParams),
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

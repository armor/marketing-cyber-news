/**
 * useCreateContentItem Hook
 *
 * TanStack Query mutation hook for creating content items manually.
 * Sets source_type='manual' and trust_score=0.75.
 * Invalidates content item queries on success.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import type { ContentType } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Request body for creating manual content item
 */
export interface CreateManualContentRequest {
  readonly url: string;
  readonly title: string;
  readonly summary?: string | null;
  readonly content_type: ContentType;
  readonly topic_tags?: readonly string[];
  readonly framework_tags?: readonly string[];
  readonly publish_date?: string | null;
  readonly author?: string | null;
  readonly image_url?: string | null;
}

/**
 * Created content item response
 */
export interface ContentItem {
  readonly id: string;
  readonly source_id?: string | null;
  readonly article_id?: string | null;
  readonly url: string;
  readonly title: string;
  readonly summary?: string | null;
  readonly content?: string | null;
  readonly content_type: ContentType;
  readonly topic_tags: readonly string[];
  readonly framework_tags: readonly string[];
  readonly industry_tags: readonly string[];
  readonly buyer_stage?: string | null;
  readonly partner_tags: readonly string[];
  readonly author?: string | null;
  readonly publish_date: string;
  readonly word_count?: number | null;
  readonly reading_time_minutes?: number | null;
  readonly image_url?: string | null;
  readonly trust_score: number;
  readonly relevance_score: number;
  readonly historical_ctr: number;
  readonly historical_opens: number;
  readonly historical_clicks: number;
  readonly expires_at?: string | null;
  readonly is_active: boolean;
  readonly indexed_at?: string | null;
  readonly source_type: 'rss' | 'api' | 'manual';
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * Variables for mutation
 */
interface CreateContentVariables {
  readonly request: CreateManualContentRequest;
}

/**
 * Raw API response wrapper
 */
interface ApiResponse {
  readonly data: ContentItem;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to create a content item from manual entry
 *
 * Creates content item from manual input or imported metadata.
 * Automatically sets source_type='manual' and trust_score=0.75.
 * Invalidates content item queries on success.
 *
 * @returns {UseMutationResult} Mutation result with content item, loading state, and error handling
 *
 * @example
 * ```typescript
 * const { mutate, isPending, data } = useCreateContentItem();
 *
 * mutate({
 *   request: {
 *     url: 'https://example.com/article',
 *     title: 'Critical Security Vulnerability',
 *     summary: 'Researchers discovered...',
 *     content_type: 'news',
 *     topic_tags: ['vulnerability', 'zero-day'],
 *     framework_tags: ['MITRE'],
 *     publish_date: '2026-01-10',
 *     author: 'Security Researcher'
 *   }
 * }, {
 *   onSuccess: (item) => {
 *     console.log('Created content item:', item.id);
 *   }
 * });
 * ```
 */
export function useCreateContentItem(): UseMutationResult<
  ContentItem,
  Error,
  CreateContentVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ request }: CreateContentVariables) => {
      const response = await apiClient.post<ApiResponse>(
        '/content/items',
        request
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.contentItemAll,
      });
    },
  });
}

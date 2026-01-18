/**
 * useFetchURLMetadata Hook
 *
 * TanStack Query mutation hook for extracting metadata from URLs.
 * Implements SSRF protection and 10-second timeout.
 * Used for content import preview.
 */

import {
  useMutation,
  type UseMutationResult,
} from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';

// ============================================================================
// Types
// ============================================================================

/**
 * Extracted URL metadata
 */
export interface URLMetadata {
  readonly url: string;
  readonly title: string;
  readonly description?: string | null;
  readonly image_url?: string | null;
  readonly publish_date?: string | null;
  readonly author?: string | null;
  readonly read_time_minutes?: number | null;
  readonly site_name?: string | null;
}

/**
 * Variables for mutation
 */
interface FetchMetadataVariables {
  readonly url: string;
}

/**
 * Raw API response wrapper
 */
interface ApiResponse {
  readonly data: URLMetadata;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to fetch and extract metadata from a URL
 *
 * Extracts title, description, image, author, and other metadata from URLs.
 * Implements SSRF protection (blocks private IPs, cloud metadata endpoints).
 * Has 10-second timeout to prevent slow responses.
 *
 * @returns {UseMutationResult} Mutation result with metadata, loading state, and error handling
 *
 * @example
 * ```typescript
 * const { mutate, isPending, data, error } = useFetchURLMetadata();
 *
 * mutate({ url: 'https://example.com/article' }, {
 *   onSuccess: (metadata) => {
 *     console.log('Title:', metadata.title);
 *     console.log('Description:', metadata.description);
 *   },
 *   onError: (error) => {
 *     if (error.message.includes('timeout')) {
 *       console.error('Request timed out after 10 seconds');
 *     } else if (error.message.includes('blocked')) {
 *       console.error('URL blocked by security policy');
 *     }
 *   }
 * });
 * ```
 */
export function useFetchURLMetadata(): UseMutationResult<
  URLMetadata,
  Error,
  FetchMetadataVariables
> {
  return useMutation({
    mutationFn: async ({ url }: FetchMetadataVariables) => {
      const response = await apiClient.post<ApiResponse>(
        '/content/fetch-metadata',
        { url }
      );
      return response.data;
    },
  });
}

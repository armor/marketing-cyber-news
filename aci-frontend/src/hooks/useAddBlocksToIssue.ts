/**
 * useAddBlocksToIssue Hook
 *
 * TanStack Query mutation hook for bulk adding content items as newsletter blocks.
 * Supports adding multiple content items in a single atomic operation.
 * Invalidates newsletter queries on success.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import type { BlockType, NewsletterBlock } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Request body for bulk adding blocks
 */
interface BulkAddBlocksRequest {
  readonly content_item_ids: readonly string[];
  readonly block_type: BlockType;
}

/**
 * Response from bulk add blocks operation
 */
interface BulkAddBlocksResponse {
  readonly blocks: readonly NewsletterBlock[];
  readonly created_count: number;
  readonly skipped_count: number;
  readonly skipped_ids?: readonly string[];
}

/**
 * Variables for mutation
 */
interface AddBlocksVariables {
  readonly issueId: string;
  readonly request: BulkAddBlocksRequest;
}

/**
 * Raw API response wrapper
 */
interface ApiResponse {
  readonly data: BulkAddBlocksResponse;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to bulk add content items as newsletter blocks
 *
 * Adds multiple content items to a draft newsletter issue as blocks.
 * Maximum 20 items per request. Automatically handles duplicate detection.
 * Invalidates newsletter issue queries on success.
 *
 * @returns {UseMutationResult} Mutation result with blocks, loading state, and error handling
 *
 * @example
 * ```typescript
 * const { mutate, isPending, data } = useAddBlocksToIssue();
 *
 * mutate({
 *   issueId: 'iss_123',
 *   request: {
 *     content_item_ids: ['item_1', 'item_2', 'item_3'],
 *     block_type: 'news'
 *   }
 * }, {
 *   onSuccess: (response) => {
 *     console.log(`Created ${response.created_count} blocks`);
 *     if (response.skipped_count > 0) {
 *       console.log(`Skipped ${response.skipped_count} duplicates`);
 *     }
 *   }
 * });
 * ```
 */
export function useAddBlocksToIssue(): UseMutationResult<
  BulkAddBlocksResponse,
  Error,
  AddBlocksVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ issueId, request }: AddBlocksVariables) => {
      const response = await apiClient.post<ApiResponse>(
        `/newsletters/${issueId}/blocks/bulk`,
        request
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueDetail(variables.issueId),
      });
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueAll,
      });
    },
  });
}

/**
 * useContentMutations Hook
 *
 * TanStack Query mutation hooks for content source operations.
 * All mutations automatically invalidate relevant queries on success.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  createContentSource,
  updateContentSource,
  deleteContentSource,
  testFeed,
  syncContent,
  type UpdateContentSourceRequest,
  type TestFeedResponse,
} from '@/services/api/newsletter';
import type {
  ContentSource,
  CreateContentSourceRequest,
} from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

interface CreateContentSourceVariables {
  readonly request: CreateContentSourceRequest;
}

interface UpdateContentSourceVariables {
  readonly id: string;
  readonly request: UpdateContentSourceRequest;
}

interface DeleteContentSourceVariables {
  readonly id: string;
}

interface TestFeedVariables {
  readonly url: string;
}

interface SyncContentVariables {
  readonly sourceId?: string;
}

interface SyncContentResponse {
  readonly message: string;
  readonly job_id: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to create a new content source
 *
 * Invalidates content source list queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useCreateContentSource();
 *
 * mutate({
 *   request: {
 *     name: 'Security Blog',
 *     source_type: 'rss',
 *     url: 'https://example.com/feed.xml'
 *   }
 * });
 * ```
 */
export function useCreateContentSource(): UseMutationResult<
  ContentSource,
  Error,
  CreateContentSourceVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request }: CreateContentSourceVariables) =>
      createContentSource(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.contentSourceAll,
      });
    },
  });
}

/**
 * Hook to update an existing content source
 *
 * Invalidates content source queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useUpdateContentSource();
 *
 * mutate({
 *   id: 'src_123',
 *   request: {
 *     name: 'Updated Blog Name',
 *     is_active: false
 *   }
 * });
 * ```
 */
export function useUpdateContentSource(): UseMutationResult<
  ContentSource,
  Error,
  UpdateContentSourceVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: UpdateContentSourceVariables) =>
      updateContentSource(id, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.contentSourceAll,
      });
    },
  });
}

/**
 * Hook to delete a content source
 *
 * Invalidates content source queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useDeleteContentSource();
 *
 * mutate({ id: 'src_123' });
 * ```
 */
export function useDeleteContentSource(): UseMutationResult<
  void,
  Error,
  DeleteContentSourceVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DeleteContentSourceVariables) =>
      deleteContentSource(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.contentSourceAll,
      });
    },
  });
}

/**
 * Hook to test feed URL connection
 *
 * Does not invalidate queries (read-only test operation).
 *
 * @example
 * ```typescript
 * const { mutate, isPending, data } = useTestFeed();
 *
 * mutate({ url: 'https://example.com/feed.xml' });
 * ```
 */
export function useTestFeed(): UseMutationResult<
  TestFeedResponse,
  Error,
  TestFeedVariables
> {
  return useMutation({
    mutationFn: ({ url }: TestFeedVariables) => testFeed(url),
  });
}

/**
 * Hook to trigger content synchronization
 *
 * Optionally sync specific source or all active sources.
 * Returns job tracking info for monitoring progress.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useSyncContent();
 *
 * // Sync all active sources
 * mutate({});
 *
 * // Sync specific source
 * mutate({ sourceId: 'src_123' });
 * ```
 */
export function useSyncContent(): UseMutationResult<
  SyncContentResponse,
  Error,
  SyncContentVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceId }: SyncContentVariables) => syncContent(sourceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.contentSourceAll,
      });
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.contentItemAll,
      });
    },
  });
}

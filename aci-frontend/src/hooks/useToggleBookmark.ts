/**
 * useToggleBookmark Hook
 *
 * TanStack Query mutation hook for toggling bookmark state on threats.
 * Implements optimistic updates and automatic cache invalidation.
 *
 * @example
 * ```typescript
 * const { toggleBookmark, isToggling } = useToggleBookmark();
 *
 * const handleClick = async () => {
 *   await toggleBookmark('threat-123', false); // Add bookmark
 * };
 * ```
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addBookmark, removeBookmark } from '@/services/api/bookmarks';
import { queryKeys } from '@/services/api/queryClient';

// ============================================================================
// Types
// ============================================================================

/**
 * Return value from useToggleBookmark hook
 */
export interface UseToggleBookmarkReturn {
  readonly toggleBookmark: (threatId: string, isBookmarked: boolean) => Promise<void>;
  readonly isToggling: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to toggle bookmark state with optimistic updates
 *
 * Provides a mutation function for adding/removing bookmarks with:
 * - Optimistic UI updates (immediate feedback)
 * - Automatic rollback on error
 * - Cache invalidation for threats list and detail views
 *
 * @returns {UseToggleBookmarkReturn} Toggle function and loading state
 */
export function useToggleBookmark(): UseToggleBookmarkReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      threatId,
      isBookmarked,
    }: {
      threatId: string;
      isBookmarked: boolean;
    }): Promise<void> => {
      if (isBookmarked) {
        // Currently bookmarked - remove it
        await removeBookmark(threatId);
      } else {
        // Not bookmarked - add it
        await addBookmark(threatId);
      }
    },

    // Optimistic update: immediately update UI before API call completes
    onMutate: async ({ threatId, isBookmarked }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.threats.all,
      });

      // Snapshot current values for rollback
      const previousThreatDetail = queryClient.getQueryData(
        queryKeys.threats.detail(threatId)
      );

      // Optimistically update threat detail
      queryClient.setQueryData(
        queryKeys.threats.detail(threatId),
        (old: unknown) => {
          if (!old || typeof old !== 'object') {
            return old;
          }

          return {
            ...old,
            isBookmarked: !isBookmarked,
          };
        }
      );

      // Return context for rollback
      return { previousThreatDetail };
    },

    // On error: rollback optimistic update
    onError: (_error, { threatId }, context) => {
      if (context?.previousThreatDetail) {
        queryClient.setQueryData(
          queryKeys.threats.detail(threatId),
          context.previousThreatDetail
        );
      }
    },

    // On success: invalidate affected queries to fetch fresh data
    onSuccess: (_data, { threatId }) => {
      // Invalidate threats list (includes bookmark status)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threats.lists(),
      });

      // Invalidate specific threat detail
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threats.detail(threatId),
      });

      // Invalidate bookmarks list if it exists
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookmarks.all,
      });
    },
  });

  /**
   * Toggle bookmark state for a threat
   *
   * @param threatId - UUID of threat to toggle
   * @param isBookmarked - Current bookmark state (true = bookmarked, false = not bookmarked)
   * @returns Promise that resolves when operation completes
   */
  const toggleBookmark = async (
    threatId: string,
    isBookmarked: boolean
  ): Promise<void> => {
    await mutation.mutateAsync({ threatId, isBookmarked });
  };

  return {
    toggleBookmark,
    isToggling: mutation.isPending,
  };
}

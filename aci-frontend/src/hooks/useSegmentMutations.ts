/**
 * useSegmentMutations Hook
 *
 * TanStack Query mutation hooks for newsletter segment CRUD operations.
 * All mutations automatically invalidate relevant queries on success.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { createSegment, updateSegment } from '@/services/api/newsletter';
import type {
  Segment,
  CreateSegmentRequest,
  UpdateSegmentRequest,
} from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

interface CreateSegmentVariables {
  readonly request: CreateSegmentRequest;
}

interface UpdateSegmentVariables {
  readonly id: string;
  readonly request: UpdateSegmentRequest;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to create a new newsletter audience segment
 *
 * Invalidates segment list queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useCreateSegment();
 *
 * mutate({
 *   request: {
 *     name: 'Enterprise CISOs',
 *     role_cluster: 'executive',
 *     industries: ['finance', 'healthcare']
 *   }
 * });
 * ```
 */
export function useCreateSegment(): UseMutationResult<
  Segment,
  Error,
  CreateSegmentVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request }: CreateSegmentVariables) =>
      createSegment(request),
    onSuccess: () => {
      // Invalidate all segment lists to include new segment
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.segmentAll,
      });
    },
  });
}

/**
 * Hook to update an existing newsletter audience segment
 *
 * Invalidates segment list and detail queries on success.
 * Also invalidates any configuration lists that may filter by this segment.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useUpdateSegment();
 *
 * mutate({
 *   id: 'seg_123',
 *   request: {
 *     is_active: false,
 *     min_engagement_score: 75
 *   }
 * });
 * ```
 */
export function useUpdateSegment(): UseMutationResult<
  Segment,
  Error,
  UpdateSegmentVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: UpdateSegmentVariables) =>
      updateSegment(id, request),
    onSuccess: (_, variables) => {
      // Invalidate segment lists
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.segmentAll,
      });

      // Invalidate specific segment detail
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.segmentDetail(variables.id),
      });

      // Invalidate configuration lists as they may filter by segment
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.configAll,
      });
    },
  });
}

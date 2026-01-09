/**
 * useClaimMutations Hook
 *
 * TanStack Query mutation hooks for claims library CRUD and approval operations.
 * All mutations automatically invalidate relevant queries on success.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  createClaim,
  updateClaim,
  deleteClaim,
  approveClaim,
  rejectClaim,
  recordClaimUsage,
} from '@/services/api/claims';
import type {
  Claim,
  CreateClaimRequest,
  UpdateClaimRequest,
  ApproveClaimRequest,
  RejectClaimRequest,
} from '@/types/claims';
import { claimsKeys } from './claimsKeys';

// ============================================================================
// Types
// ============================================================================

interface CreateClaimVariables {
  readonly request: CreateClaimRequest;
}

interface UpdateClaimVariables {
  readonly id: string;
  readonly request: UpdateClaimRequest;
}

interface DeleteClaimVariables {
  readonly id: string;
}

interface ApproveClaimVariables {
  readonly id: string;
  readonly request?: ApproveClaimRequest;
}

interface RejectClaimVariables {
  readonly id: string;
  readonly request: RejectClaimRequest;
}

interface RecordUsageVariables {
  readonly id: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to create a new claim
 *
 * Invalidates claims list queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useCreateClaim();
 *
 * mutate({
 *   request: {
 *     claim_text: 'Industry-leading security',
 *     claim_type: 'claim',
 *     category: 'Security'
 *   }
 * });
 * ```
 */
export function useCreateClaim(): UseMutationResult<
  Claim,
  Error,
  CreateClaimVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request }: CreateClaimVariables) => createClaim(request),
    onSuccess: () => {
      // Invalidate all claims lists to include new claim
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.all,
      });
      // Invalidate categories in case new category was added
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.categories,
      });
    },
  });
}

/**
 * Hook to update an existing claim
 *
 * Invalidates claims list and detail queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useUpdateClaim();
 *
 * mutate({
 *   id: 'claim_123',
 *   request: {
 *     claim_text: 'Updated claim text',
 *     claim_type: 'claim',
 *     category: 'Security'
 *   }
 * });
 * ```
 */
export function useUpdateClaim(): UseMutationResult<
  Claim,
  Error,
  UpdateClaimVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: UpdateClaimVariables) =>
      updateClaim(id, request),
    onSuccess: (_, variables) => {
      // Invalidate claims lists
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.all,
      });
      // Invalidate specific claim detail
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.detail(variables.id),
      });
      // Invalidate categories in case category changed
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.categories,
      });
    },
  });
}

/**
 * Hook to delete a claim
 *
 * Invalidates claims list queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useDeleteClaim();
 *
 * mutate({ id: 'claim_123' });
 * ```
 */
export function useDeleteClaim(): UseMutationResult<
  void,
  Error,
  DeleteClaimVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DeleteClaimVariables) => deleteClaim(id),
    onSuccess: (_, variables) => {
      // Invalidate claims lists
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.all,
      });
      // Remove specific claim from cache
      queryClient.removeQueries({
        queryKey: claimsKeys.detail(variables.id),
      });
      // Invalidate categories in case count changed
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.categories,
      });
    },
  });
}

/**
 * Hook to approve a claim (requires compliance access)
 *
 * Invalidates claims list and detail queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useApproveClaim();
 *
 * mutate({
 *   id: 'claim_123',
 *   request: {
 *     expires_at: '2025-12-31T23:59:59Z',
 *     notes: 'Approved for Q4 campaigns'
 *   }
 * });
 * ```
 */
export function useApproveClaim(): UseMutationResult<
  Claim,
  Error,
  ApproveClaimVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: ApproveClaimVariables) =>
      approveClaim(id, request),
    onSuccess: (_, variables) => {
      // Invalidate claims lists
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.all,
      });
      // Invalidate specific claim detail
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Hook to reject a claim (requires compliance access)
 *
 * Invalidates claims list and detail queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useRejectClaim();
 *
 * mutate({
 *   id: 'claim_123',
 *   request: {
 *     reason: 'Claim not substantiated by source documentation'
 *   }
 * });
 * ```
 */
export function useRejectClaim(): UseMutationResult<
  Claim,
  Error,
  RejectClaimVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: RejectClaimVariables) =>
      rejectClaim(id, request),
    onSuccess: (_, variables) => {
      // Invalidate claims lists
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.all,
      });
      // Invalidate specific claim detail
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Hook to record usage of a claim
 *
 * Invalidates specific claim detail to update usage count.
 *
 * @example
 * ```typescript
 * const { mutate } = useRecordClaimUsage();
 *
 * // Record when claim is used in newsletter block
 * mutate({ id: 'claim_123' });
 * ```
 */
export function useRecordClaimUsage(): UseMutationResult<
  void,
  Error,
  RecordUsageVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: RecordUsageVariables) => recordClaimUsage(id),
    onSuccess: (_, variables) => {
      // Invalidate specific claim to update usage count
      void queryClient.invalidateQueries({
        queryKey: claimsKeys.detail(variables.id),
      });
    },
  });
}

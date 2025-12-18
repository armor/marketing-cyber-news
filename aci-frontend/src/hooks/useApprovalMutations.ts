/**
 * useApprovalMutations Hook
 *
 * TanStack Query mutation hooks for approval workflow actions.
 * All mutations automatically invalidate relevant queries on success.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import {
  approveArticle,
  rejectArticle,
  releaseArticle,
  resetArticle,
  updateUserRole,
} from '@/services/api/approvals';
import type {
  ApprovalActionResponse,
  ApproveRequest,
  RejectRequest,
  UpdateRoleRequest,
  UserResponse,
} from '@/types/approval';
import { approvalKeys } from './approvalKeys';

// ============================================================================
// Types
// ============================================================================

interface ApproveArticleVariables {
  readonly articleId: string;
  readonly request?: ApproveRequest;
}

interface RejectArticleVariables {
  readonly articleId: string;
  readonly request: RejectRequest;
}

interface ReleaseArticleVariables {
  readonly articleId: string;
}

interface ResetArticleVariables {
  readonly articleId: string;
}

interface UpdateUserRoleVariables {
  readonly userId: string;
  readonly request: UpdateRoleRequest;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to approve an article at the current user's gate
 *
 * Invalidates approval queue and history queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useApproveArticle();
 *
 * mutate({
 *   articleId: '123',
 *   request: { notes: 'Looks good' }
 * });
 * ```
 */
export function useApproveArticle(): UseMutationResult<
  ApprovalActionResponse,
  Error,
  ApproveArticleVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId, request }: ApproveArticleVariables) =>
      approveArticle(articleId, request),
    onSuccess: (_, variables) => {
      // Invalidate queue to reflect removed article
      void queryClient.invalidateQueries({
        queryKey: approvalKeys.all,
      });

      // Invalidate history for this article
      void queryClient.invalidateQueries({
        queryKey: approvalKeys.history(variables.articleId),
      });
    },
  });
}

/**
 * Hook to reject an article with a reason
 *
 * Invalidates approval queue and history queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useRejectArticle();
 *
 * mutate({
 *   articleId: '123',
 *   request: { reason: 'Inaccurate information' }
 * });
 * ```
 */
export function useRejectArticle(): UseMutationResult<
  ApprovalActionResponse,
  Error,
  RejectArticleVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId, request }: RejectArticleVariables) =>
      rejectArticle(articleId, request),
    onSuccess: (_, variables) => {
      // Invalidate queue to reflect removed article
      void queryClient.invalidateQueries({
        queryKey: approvalKeys.all,
      });

      // Invalidate history for this article
      void queryClient.invalidateQueries({
        queryKey: approvalKeys.history(variables.articleId),
      });
    },
  });
}

/**
 * Hook to release an approved article to public
 *
 * Only available to admin and ciso roles.
 * Invalidates approval queue and history queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useReleaseArticle();
 *
 * mutate({ articleId: '123' });
 * ```
 */
export function useReleaseArticle(): UseMutationResult<
  ApprovalActionResponse,
  Error,
  ReleaseArticleVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId }: ReleaseArticleVariables) =>
      releaseArticle(articleId),
    onSuccess: (_, variables) => {
      // Invalidate queue to reflect removed article
      void queryClient.invalidateQueries({
        queryKey: approvalKeys.all,
      });

      // Invalidate history for this article
      void queryClient.invalidateQueries({
        queryKey: approvalKeys.history(variables.articleId),
      });
    },
  });
}

/**
 * Hook to reset a rejected article back to pending_marketing
 *
 * Only available to admin role.
 * Invalidates approval queue and history queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useResetArticle();
 *
 * mutate({ articleId: '123' });
 * ```
 */
export function useResetArticle(): UseMutationResult<
  ApprovalActionResponse,
  Error,
  ResetArticleVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId }: ResetArticleVariables) =>
      resetArticle(articleId),
    onSuccess: (_, variables) => {
      // Invalidate queue to reflect updated article
      void queryClient.invalidateQueries({
        queryKey: approvalKeys.all,
      });

      // Invalidate history for this article
      void queryClient.invalidateQueries({
        queryKey: approvalKeys.history(variables.articleId),
      });
    },
  });
}

/**
 * Hook to update a user's role (admin only)
 *
 * Does not invalidate approval queries as this is an admin operation.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useUpdateUserRole();
 *
 * mutate({
 *   userId: '456',
 *   request: { role: 'soc_level_1' }
 * });
 * ```
 */
export function useUpdateUserRole(): UseMutationResult<
  UserResponse,
  Error,
  UpdateUserRoleVariables
> {
  return useMutation({
    mutationFn: ({ userId, request }: UpdateUserRoleVariables) =>
      updateUserRole(userId, request),
  });
}

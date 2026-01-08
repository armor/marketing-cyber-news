/**
 * useNewsletterApprovals Hook
 *
 * TanStack Query hooks for newsletter approval workflow.
 * Provides query and mutation hooks for pending approvals,
 * approve/reject actions with optimistic updates.
 *
 * Wave 4 Task 6.3.1 - Approval Queue Hook
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  getPendingApprovals,
  approveIssue,
  rejectIssue,
} from '@/services/api/newsletter';
import type {
  NewsletterIssue,
  IssueListResponse,
  ApprovalTier,
} from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

interface PendingApprovalsParams {
  readonly tier?: ApprovalTier;
  readonly page?: number;
  readonly page_size?: number;
}

interface ApproveIssueVariables {
  readonly id: string;
  readonly notes?: string;
}

interface RejectIssueVariables {
  readonly id: string;
  readonly reason: string;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch pending approvals
 *
 * Returns list of newsletter issues with status 'pending_approval'.
 * Optionally filter by approval tier.
 *
 * @example
 * ```typescript
 * const { data, isLoading } = usePendingApprovals({ tier: 'tier1' });
 *
 * if (isLoading) return <Spinner />;
 *
 * const pendingIssues = data?.data || [];
 * return <ApprovalQueue issues={pendingIssues} />;
 * ```
 */
export function usePendingApprovals(
  params?: PendingApprovalsParams
): UseQueryResult<IssueListResponse, Error> {
  return useQuery({
    queryKey: newsletterKeys.issueList({
      status: 'pending_approval',
      ...params,
    }),
    queryFn: () => getPendingApprovals(params),
    staleTime: 30_000, // 30 seconds
    refetchOnMount: 'always',
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to approve a newsletter issue
 *
 * Transitions status from pending_approval to approved.
 * Performs optimistic update for immediate UI feedback.
 * Invalidates approval queue and issue detail queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useApproveIssue();
 *
 * const handleApprove = () => {
 *   mutate({
 *     id: 'iss_123',
 *     notes: 'Looks great, ready to send!'
 *   }, {
 *     onSuccess: () => {
 *       toast.success('Newsletter approved');
 *     },
 *     onError: (error) => {
 *       toast.error(error.message);
 *     }
 *   });
 * };
 * ```
 */
export function useApproveIssue(): UseMutationResult<
  NewsletterIssue,
  Error,
  ApproveIssueVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: ApproveIssueVariables) =>
      approveIssue(id, notes),

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: newsletterKeys.issueAll,
      });

      // Snapshot previous value
      const previousIssues = queryClient.getQueryData(
        newsletterKeys.issueList({ status: 'pending_approval' })
      );

      // Optimistically remove from pending queue
      queryClient.setQueryData<IssueListResponse>(
        newsletterKeys.issueList({ status: 'pending_approval' }),
        (old) => {
          if (!old) return old;

          return {
            ...old,
            data: old.data.filter((issue) => issue.id !== variables.id),
            pagination: {
              ...old.pagination,
              total: old.pagination.total - 1,
            },
          };
        }
      );

      return { previousIssues };
    },

    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousIssues) {
        queryClient.setQueryData(
          newsletterKeys.issueList({ status: 'pending_approval' }),
          context.previousIssues
        );
      }
    },

    onSuccess: (_, variables) => {
      // Invalidate all issue queries to refresh data
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueAll,
      });
      // Invalidate specific issue detail
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueDetail(variables.id),
      });
    },
  });
}

/**
 * Hook to reject a newsletter issue
 *
 * Requires rejection reason (minimum 10 characters).
 * Performs optimistic update for immediate UI feedback.
 * Invalidates approval queue and issue detail queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useRejectIssue();
 *
 * const handleReject = (reason: string) => {
 *   if (reason.length < 10) {
 *     toast.error('Reason must be at least 10 characters');
 *     return;
 *   }
 *
 *   mutate({
 *     id: 'iss_123',
 *     reason
 *   }, {
 *     onSuccess: () => {
 *       toast.success('Newsletter rejected');
 *     },
 *     onError: (error) => {
 *       toast.error(error.message);
 *     }
 *   });
 * };
 * ```
 */
export function useRejectIssue(): UseMutationResult<
  NewsletterIssue,
  Error,
  RejectIssueVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: RejectIssueVariables) =>
      rejectIssue(id, reason),

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: newsletterKeys.issueAll,
      });

      // Snapshot previous value
      const previousIssues = queryClient.getQueryData(
        newsletterKeys.issueList({ status: 'pending_approval' })
      );

      // Optimistically remove from pending queue
      queryClient.setQueryData<IssueListResponse>(
        newsletterKeys.issueList({ status: 'pending_approval' }),
        (old) => {
          if (!old) return old;

          return {
            ...old,
            data: old.data.filter((issue) => issue.id !== variables.id),
            pagination: {
              ...old.pagination,
              total: old.pagination.total - 1,
            },
          };
        }
      );

      return { previousIssues };
    },

    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousIssues) {
        queryClient.setQueryData(
          newsletterKeys.issueList({ status: 'pending_approval' }),
          context.previousIssues
        );
      }
    },

    onSuccess: (_, variables) => {
      // Invalidate all issue queries to refresh data
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueAll,
      });
      // Invalidate specific issue detail
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueDetail(variables.id),
      });
    },
  });
}

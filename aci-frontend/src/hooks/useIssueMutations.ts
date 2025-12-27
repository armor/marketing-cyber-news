/**
 * useIssueMutations Hook
 *
 * TanStack Query mutation hooks for newsletter issue operations.
 * Includes generate, approve, reject, and send functionality.
 * All mutations automatically invalidate relevant queries on success.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  generateIssue,
  approveIssue,
  rejectIssue,
  sendIssue,
  getIssue,
} from '@/services/api/newsletter';
import type {
  NewsletterIssue,
  GenerateIssueRequest,
  GenerateIssueResponse,
} from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface GenerateIssueVariables {
  readonly request: GenerateIssueRequest;
}

interface ApproveIssueVariables {
  readonly id: string;
  readonly notes?: string;
}

interface RejectIssueVariables {
  readonly id: string;
  readonly reason: string;
}

interface SendIssueVariables {
  readonly id: string;
  readonly scheduledFor?: string;
}

interface ScheduleIssueVariables {
  readonly id: string;
  readonly scheduledFor: string;
}

interface DeliveryStatusOptions {
  readonly issueId: string;
  readonly enabled?: boolean;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to generate a new newsletter issue
 *
 * Returns immediately with job tracking info.
 * Invalidates issue list queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useGenerateIssue();
 *
 * mutate({
 *   request: {
 *     configuration_id: 'cfg_123',
 *     scheduled_for: '2024-01-15T10:00:00Z'
 *   }
 * });
 * ```
 */
export function useGenerateIssue(): UseMutationResult<
  GenerateIssueResponse,
  Error,
  GenerateIssueVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request }: GenerateIssueVariables) => generateIssue(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueAll,
      });
    },
  });
}

/**
 * Hook to approve a newsletter issue for sending
 *
 * Transitions status from pending_approval to approved.
 * Invalidates issue list and detail queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useApproveIssue();
 *
 * mutate({
 *   id: 'iss_123',
 *   notes: 'Looks good, ready to send!'
 * });
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
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueAll,
      });
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
 * Invalidates issue list and detail queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useRejectIssue();
 *
 * mutate({
 *   id: 'iss_123',
 *   reason: 'Subject line needs to be more compelling for this audience'
 * });
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
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueAll,
      });
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueDetail(variables.id),
      });
    },
  });
}

/**
 * Hook to send or schedule a newsletter issue
 *
 * If scheduledFor is omitted, sends immediately.
 * Invalidates issue list and detail queries on success.
 * Shows toast notifications for success/failure.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useSendIssue();
 *
 * // Send immediately
 * mutate({ id: 'iss_123' });
 *
 * // Schedule for later
 * mutate({
 *   id: 'iss_123',
 *   scheduledFor: '2024-01-15T10:00:00Z'
 * });
 * ```
 */
export function useSendIssue(): UseMutationResult<
  NewsletterIssue,
  Error,
  SendIssueVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scheduledFor }: SendIssueVariables) =>
      sendIssue(id, scheduledFor),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueAll,
      });
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueDetail(variables.id),
      });

      if (variables.scheduledFor) {
        const scheduledDate = new Date(variables.scheduledFor).toLocaleString();
        toast.success(`Newsletter scheduled for ${scheduledDate}`);
      } else {
        toast.success('Newsletter sent successfully');
      }
    },
    onError: (error) => {
      toast.error(`Failed to send newsletter: ${error.message}`);
    },
  });
}

/**
 * Hook to schedule a newsletter issue for future delivery
 *
 * Requires a future scheduledFor timestamp.
 * Validates that the date is in the future before sending request.
 * Invalidates issue list and detail queries on success.
 * Shows toast notifications for success/failure.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useScheduleIssue();
 *
 * mutate({
 *   id: 'iss_123',
 *   scheduledFor: '2024-01-15T10:00:00Z'
 * });
 * ```
 */
export function useScheduleIssue(): UseMutationResult<
  NewsletterIssue,
  Error,
  ScheduleIssueVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scheduledFor }: ScheduleIssueVariables) => {
      const scheduledDate = new Date(scheduledFor);
      const now = new Date();

      if (scheduledDate <= now) {
        throw new Error('Scheduled date must be in the future');
      }

      return sendIssue(id, scheduledFor);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueAll,
      });
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueDetail(variables.id),
      });

      const scheduledDate = new Date(variables.scheduledFor).toLocaleString();
      toast.success(`Newsletter scheduled for ${scheduledDate}`);
    },
    onError: (error) => {
      toast.error(`Failed to schedule newsletter: ${error.message}`);
    },
  });
}

/**
 * Hook to poll delivery status of a newsletter issue
 *
 * Automatically polls every 5 seconds while status is "sending".
 * Stops polling when status becomes "sent" or "failed".
 * Use enabled option to control when polling starts.
 *
 * @example
 * ```typescript
 * const { data: issue, isLoading } = useDeliveryStatus({
 *   issueId: 'iss_123',
 *   enabled: status === 'sending'
 * });
 *
 * // Check current delivery status
 * if (issue?.status === 'sent') {
 *   console.log('Delivery complete');
 * }
 * ```
 */
export function useDeliveryStatus({
  issueId,
  enabled = true,
}: DeliveryStatusOptions): UseQueryResult<NewsletterIssue, Error> {
  return useQuery({
    queryKey: newsletterKeys.issueDetail(issueId),
    queryFn: () => getIssue(issueId),
    enabled,
    refetchInterval: (query) => {
      const issue = query.state.data;

      if (!issue) {
        return false;
      }

      const isDelivering =
        issue.status === 'scheduled' ||
        (issue.status === 'approved' && issue.scheduled_for);

      return isDelivering ? 5000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

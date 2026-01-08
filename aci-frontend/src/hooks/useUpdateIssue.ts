/**
 * useUpdateIssue Hook
 *
 * TanStack Query mutation hook for updating newsletter issue fields.
 * Allows editing of subject line, preheader, and intro template.
 * Automatically invalidates relevant queries on success.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import type { NewsletterIssue } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';
import { toast } from 'sonner';

const API_PREFIX = '/newsletter';

// ============================================================================
// Types
// ============================================================================

/**
 * Update issue request body
 */
export interface UpdateIssueRequest {
  readonly selected_subject_line?: string;
  readonly preheader?: string;
  readonly intro_template?: string;
}

/**
 * Update issue variables for mutation
 */
interface UpdateIssueVariables {
  readonly id: string;
  readonly data: UpdateIssueRequest;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to update a newsletter issue
 *
 * Updates editable fields: subject line, preheader, intro template.
 * Only allowed when issue status is 'draft'.
 * Invalidates issue list and detail queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useUpdateIssue();
 *
 * mutate({
 *   id: 'iss_123',
 *   data: {
 *     selected_subject_line: 'New subject line',
 *     preheader: 'Updated preview text',
 *     intro_template: 'Updated intro paragraph'
 *   }
 * });
 * ```
 */
export function useUpdateIssue(): UseMutationResult<
  NewsletterIssue,
  Error,
  UpdateIssueVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateIssueVariables) => {
      return apiClient.put<NewsletterIssue>(
        `${API_PREFIX}/issues/${id}`,
        data
      );
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueAll,
      });
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueDetail(variables.id),
      });
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issuePreview(variables.id),
      });

      toast.success('Newsletter updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update newsletter: ${error.message}`);
    },
  });
}

/**
 * useDraftIssues Hook
 *
 * TanStack Query hook for fetching draft newsletter issues.
 * Used for selecting issues when adding content to newsletters.
 * Caches for 30 seconds to reduce redundant API calls.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Draft newsletter issue summary
 */
export interface DraftIssue {
  readonly id: string;
  readonly segment_id: string;
  readonly segment_name: string;
  readonly issue_date: string;
  readonly subject_line?: string | null;
  readonly status: 'draft';
  readonly created_at: string;
}

/**
 * Hook options for draft issues query
 */
export interface UseDraftIssuesOptions {
  readonly limit?: number;
  readonly enabled?: boolean;
}

/**
 * API response wrapper
 */
interface ApiResponse {
  readonly data: readonly DraftIssue[];
}

// ============================================================================
// Hook
// ============================================================================

const DEFAULT_LIMIT = 50;
const STALE_TIME_MS = 30_000; // 30 seconds

/**
 * Hook to fetch draft newsletter issues
 *
 * Retrieves list of newsletter issues in draft status.
 * Used for issue selection in add-to-newsletter dialogs.
 * Data is cached for 30 seconds to minimize API calls.
 *
 * @param options - Configuration for limit and enabled state
 * @returns {UseQueryResult} Query result with draft issues array
 *
 * @example
 * ```typescript
 * const { data, isLoading, error } = useDraftIssues({ limit: 20 });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return (
 *   <select>
 *     {data?.map(issue => (
 *       <option key={issue.id} value={issue.id}>
 *         {issue.segment_name} - {issue.issue_date}
 *       </option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useDraftIssues(
  options?: UseDraftIssuesOptions
): UseQueryResult<readonly DraftIssue[], Error> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const enabled = options?.enabled !== false;

  const queryParams: Record<string, string> = {
    status: 'draft',
    limit: String(limit),
  };

  return useQuery({
    queryKey: newsletterKeys.issueList({ status: 'draft', limit }),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse>(
        '/newsletters/issues',
        queryParams
      );
      return response.data;
    },
    enabled,
    staleTime: STALE_TIME_MS,
  });
}

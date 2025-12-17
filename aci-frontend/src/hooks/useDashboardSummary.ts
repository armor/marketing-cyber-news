/**
 * useDashboardSummary Hook
 *
 * TanStack Query hook for fetching dashboard summary data with real-time updates.
 * Fetches summary metrics and recent activity in parallel, combining states appropriately.
 *
 * @example
 * ```typescript
 * const {
 *   summary,
 *   recentActivity,
 *   isLoading,
 *   isError,
 *   error,
 *   refetch
 * } = useDashboardSummary({ refetchInterval: 30000 });
 * ```
 */

import { useQueries } from '@tanstack/react-query';
import type { DashboardSummary } from '@/types/api';
import { apiClient } from '@/services/api/client';
import { queryKeys } from '@/services/api/queryClient';
import { useAuth } from './useAuth';

// ============================================================================
// Types
// ============================================================================

/**
 * Recent activity item structure
 * Represents recent threat activity for dashboard feed
 */
export interface RecentActivity {
  readonly id: string;
  readonly type: 'threat_added' | 'threat_updated' | 'alert_triggered';
  readonly threatId: string;
  readonly threatTitle: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly timestamp: string; // ISO 8601 date string
  readonly description: string;
}

/**
 * Hook options for dashboard summary query
 */
export interface UseDashboardSummaryOptions {
  readonly enabled?: boolean;
  readonly refetchInterval?: number; // Milliseconds, default 30000
}

/**
 * Return value from useDashboardSummary hook
 */
export interface UseDashboardSummaryReturn {
  readonly summary: DashboardSummary | undefined;
  readonly recentActivity: readonly RecentActivity[] | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch dashboard summary metrics from API
 */
async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get<{ data: DashboardSummary }>(
    '/dashboard/summary'
  );
  return response.data;
}

/**
 * Fetch recent activity feed from API
 */
async function fetchRecentActivity(): Promise<readonly RecentActivity[]> {
  const response = await apiClient.get<{ data: readonly RecentActivity[] }>(
    '/dashboard/recent-activity'
  );
  return response.data;
}

// ============================================================================
// Hook
// ============================================================================

const DEFAULT_REFETCH_INTERVAL_MS = 30000; // 30 seconds

/**
 * Hook to fetch dashboard summary and recent activity with TanStack Query
 *
 * Fetches summary metrics and recent activity in parallel.
 * Only enabled when user is authenticated.
 * Supports automatic refetch for real-time dashboard updates.
 *
 * @param options - Configuration options for query behavior
 * @returns {UseDashboardSummaryReturn} Dashboard data, loading states, and refetch function
 */
export function useDashboardSummary(
  options?: UseDashboardSummaryOptions
): UseDashboardSummaryReturn {
  const { isAuthenticated } = useAuth();

  // Determine if queries should be enabled
  const enabled = options?.enabled !== false && isAuthenticated;
  const refetchInterval = options?.refetchInterval ?? DEFAULT_REFETCH_INTERVAL_MS;

  // Fetch summary and recent activity in parallel using useQueries
  const [summaryQuery, activityQuery] = useQueries({
    queries: [
      {
        queryKey: queryKeys.dashboard.summary(),
        queryFn: fetchDashboardSummary,
        enabled,
        refetchInterval: enabled ? refetchInterval : false,
        staleTime: 0, // Always refetch on mount for dashboard freshness
      },
      {
        queryKey: [...queryKeys.dashboard.all, 'recent-activity'] as const,
        queryFn: fetchRecentActivity,
        enabled,
        refetchInterval: enabled ? refetchInterval : false,
        staleTime: 0, // Always refetch on mount for dashboard freshness
      },
    ],
  });

  // Combine loading states - loading if either query is loading
  const isLoading = summaryQuery.isLoading || activityQuery.isLoading;

  // Combine error states - error if either query has error
  const isError = summaryQuery.isError || activityQuery.isError;

  // Get first error if any
  const error =
    (summaryQuery.error as Error | null) ??
    (activityQuery.error as Error | null);

  // Refetch both queries
  const refetch = (): void => {
    void summaryQuery.refetch();
    void activityQuery.refetch();
  };

  return {
    summary: summaryQuery.data,
    recentActivity: activityQuery.data,
    isLoading,
    isError,
    error,
    refetch,
  };
}

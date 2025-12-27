/**
 * useABTests Hooks
 *
 * TanStack Query hooks for A/B testing functionality.
 * Supports fetching test variants, results, and declaring winners.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTestVariants,
  getTestResults,
  declareWinner,
} from '@/services/api/newsletter';
import type { TestVariant, TestResultsResponse } from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for test variants query
 */
export interface UseTestVariantsOptions {
  readonly enabled?: boolean;
}

/**
 * Return value from useTestVariants hook
 */
export interface UseTestVariantsReturn {
  readonly data: readonly TestVariant[] | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

/**
 * Hook options for test results query
 */
export interface UseTestResultsOptions {
  readonly enabled?: boolean;
}

/**
 * Return value from useTestResults hook
 */
export interface UseTestResultsReturn {
  readonly data: TestResultsResponse | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

/**
 * Return value from useDeclareWinner hook
 */
export interface UseDeclareWinnerReturn {
  readonly mutate: (variantId: string) => void;
  readonly mutateAsync: (variantId: string) => Promise<TestResultsResponse>;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly isSuccess: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const STALE_TIME_MS = 30000; // 30 seconds
const REFETCH_INTERVAL_MS = 60000; // 1 minute for active tests

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch test variants for a specific issue
 *
 * Fetches all A/B test variants with their performance metrics.
 * Useful for displaying variant comparison tables.
 * Auto-refetches every minute for active tests.
 *
 * @param issueId - Newsletter issue ID
 * @param options - Configuration options for query behavior
 * @returns {UseTestVariantsReturn} Variants data, loading states, and refetch function
 */
export function useTestVariants(
  issueId: string,
  options?: UseTestVariantsOptions
): UseTestVariantsReturn {
  const enabled = options?.enabled !== false;

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.testVariants(issueId),
    queryFn: () => getTestVariants(issueId),
    enabled: enabled && !!issueId,
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const refetch = (): void => {
    void originalRefetch();
  };

  return {
    data: response?.variants,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to fetch A/B test results with statistical analysis
 *
 * Fetches complete test results including variants, statistical significance,
 * and winner information. Use this for displaying comprehensive test analytics.
 * Auto-refetches every minute for active tests.
 *
 * @param issueId - Newsletter issue ID
 * @param options - Configuration options for query behavior
 * @returns {UseTestResultsReturn} Test results data, loading states, and refetch function
 */
export function useTestResults(
  issueId: string,
  options?: UseTestResultsOptions
): UseTestResultsReturn {
  const enabled = options?.enabled !== false;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.testResults(issueId),
    queryFn: () => getTestResults({ issue_id: issueId }),
    enabled: enabled && !!issueId,
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const refetch = (): void => {
    void originalRefetch();
  };

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to declare a winning variant in an A/B test
 *
 * Mutation hook that declares a specific variant as the winner.
 * Automatically invalidates related queries to trigger refetch.
 * Should only be used when statistical significance is reached.
 *
 * @param issueId - Newsletter issue ID
 * @returns {UseDeclareWinnerReturn} Mutation functions and state
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useDeclareWinner(issueId);
 *
 * const handleDeclareWinner = (variantId: string) => {
 *   if (confirm('Declare this variant as the winner?')) {
 *     mutate(variantId);
 *   }
 * };
 * ```
 */
export function useDeclareWinner(issueId: string): UseDeclareWinnerReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (variantId: string) => declareWinner(issueId, variantId),
    onSuccess: () => {
      // Invalidate test results to trigger refetch
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.testResults(issueId),
      });

      // Invalidate test variants to update winner status
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.testVariants(issueId),
      });

      // Invalidate issue detail to update overall status
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.issueDetail(issueId),
      });

      // Invalidate all analytics to update metrics
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.analyticsAll,
      });
    },
  });

  return {
    mutate: (variantId: string): void => {
      mutation.mutate(variantId);
    },
    mutateAsync: async (variantId: string): Promise<TestResultsResponse> => {
      return mutation.mutateAsync(variantId);
    },
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
    isSuccess: mutation.isSuccess,
  };
}

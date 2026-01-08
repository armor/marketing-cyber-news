/**
 * Newsletter Analytics Hooks
 *
 * TanStack Query hooks for fetching newsletter analytics data.
 * Provides hooks for overview metrics, segment analytics, A/B test results,
 * and trend analysis.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getAnalyticsOverview,
  getSegmentAnalytics,
  getTestResults,
} from '@/services/api/newsletter';
import type {
  AnalyticsOverview,
  SegmentAnalytics,
  TestResultsResponse,
} from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

/**
 * Date range parameters for analytics queries
 */
export interface DateRangeParams {
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

/**
 * Metric type for trend analysis
 */
export type MetricType =
  | 'open_rate'
  | 'click_rate'
  | 'click_to_open_rate'
  | 'unsubscribe_rate'
  | 'bounce_rate';

/**
 * Granularity for trend data
 */
export type TrendGranularity = 'daily' | 'weekly' | 'monthly';

/**
 * Return value from useAnalyticsOverview hook
 */
export interface UseAnalyticsOverviewReturn {
  readonly data: AnalyticsOverview | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

/**
 * Return value from useSegmentAnalytics hook
 */
export interface UseSegmentAnalyticsReturn {
  readonly data: SegmentAnalytics | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
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
 * Options for trend data hook
 */
export interface UseTrendDataOptions extends DateRangeParams {
  readonly metric: MetricType;
  readonly granularity?: TrendGranularity;
  readonly enabled?: boolean;
}

/**
 * Trend data point
 */
export interface TrendDataPoint {
  readonly date: string;
  readonly value: number;
}

/**
 * Return value from useTrendData hook
 */
export interface UseTrendDataReturn {
  readonly data: readonly TrendDataPoint[] | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const STALE_TIME_MS = 60000; // 1 minute
const CACHE_TIME_MS = 300000; // 5 minutes

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch analytics overview
 *
 * Fetches high-level analytics metrics across all newsletters
 * for the specified date range. Includes KPIs, top performers,
 * and engagement trends.
 *
 * @param dateRange - Optional date range filter
 * @returns {UseAnalyticsOverviewReturn} Overview data, loading states, and refetch function
 */
export function useAnalyticsOverview(
  dateRange?: DateRangeParams
): UseAnalyticsOverviewReturn {
  const params = {
    date_from: dateRange?.dateFrom,
    date_to: dateRange?.dateTo,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.analyticsOverview(params),
    queryFn: () => getAnalyticsOverview(params),
    staleTime: STALE_TIME_MS,
    gcTime: CACHE_TIME_MS,
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
 * Hook to fetch segment-specific analytics
 *
 * Fetches analytics data for a specific audience segment,
 * including engagement metrics, top topics, and churn rate.
 *
 * @param segmentId - Segment ID to fetch analytics for
 * @param dateRange - Optional date range filter
 * @returns {UseSegmentAnalyticsReturn} Segment analytics data, loading states, and refetch function
 */
export function useSegmentAnalytics(
  segmentId: string,
  dateRange?: DateRangeParams
): UseSegmentAnalyticsReturn {
  const params = {
    date_from: dateRange?.dateFrom,
    date_to: dateRange?.dateTo,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.analyticsSegment(segmentId, params),
    queryFn: () => getSegmentAnalytics(segmentId, params),
    enabled: Boolean(segmentId),
    staleTime: STALE_TIME_MS,
    gcTime: CACHE_TIME_MS,
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
 * Hook to fetch A/B test results
 *
 * Fetches results for A/B tests, optionally filtered by issue ID,
 * test type, or date range. Includes variant performance metrics
 * and statistical significance.
 *
 * @param issueId - Optional issue ID to filter results
 * @returns {UseTestResultsReturn} Test results data, loading states, and refetch function
 */
export function useTestResults(issueId?: string): UseTestResultsReturn {
  const params = issueId ? { issue_id: issueId } : undefined;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: newsletterKeys.analyticsTests(params),
    queryFn: () => getTestResults(params),
    staleTime: STALE_TIME_MS,
    gcTime: CACHE_TIME_MS,
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
 * Hook to fetch trend data for specific metric
 *
 * Transforms analytics overview data into trend data for charting.
 * Extracts time-series data for the specified metric and granularity.
 *
 * @param options - Trend data options including metric, date range, and granularity
 * @returns {UseTrendDataReturn} Trend data points, loading states, and refetch function
 */
export function useTrendData(
  options: UseTrendDataOptions
): UseTrendDataReturn {
  const { metric, dateRange, granularity = 'daily', enabled = true } = {
    dateRange: { dateFrom: options.dateFrom, dateTo: options.dateTo },
    ...options,
  };

  const params = {
    date_from: dateRange?.dateFrom,
    date_to: dateRange?.dateTo,
  };

  const {
    data: overviewData,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: [...newsletterKeys.analyticsOverview(params), metric, granularity],
    queryFn: () => getAnalyticsOverview(params),
    enabled,
    staleTime: STALE_TIME_MS,
    gcTime: CACHE_TIME_MS,
    refetchOnWindowFocus: true,
    select: (data): readonly TrendDataPoint[] => {
      if (!data.engagement_by_day) {
        return [];
      }

      return data.engagement_by_day.map((item) => {
        let value = 0;

        switch (metric) {
          case 'open_rate':
            value =
              item.delivered > 0 ? (item.opened / item.delivered) * 100 : 0;
            break;
          case 'click_rate':
            value =
              item.delivered > 0 ? (item.clicked / item.delivered) * 100 : 0;
            break;
          case 'click_to_open_rate':
            value = item.opened > 0 ? (item.clicked / item.opened) * 100 : 0;
            break;
          // For unsubscribe/bounce, would need additional data from API
          default:
            value = 0;
        }

        return {
          date: item.date,
          value: Number(value.toFixed(2)),
        };
      });
    },
  });

  const refetch = (): void => {
    void originalRefetch();
  };

  return {
    data: overviewData,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Marketing Analytics Hooks
 *
 * React Query hooks for fetching and managing marketing analytics data.
 * Provides access to campaign analytics, channel performance, content metrics,
 * engagement trends, and audience growth data.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getCampaignAnalytics,
  getChannelPerformance,
  getContentPerformance,
  getEngagementTrends,
  getAudienceGrowth,
} from '../services/api/marketing';
import type {
  CampaignAnalytics,
  ChannelPerformance,
  ContentMetrics,
  TrendData,
  AudienceData,
  AnalyticsFilters,
  TimeRange,
} from '../types/marketing';

// Query key factory for analytics
export const analyticsKeys = {
  all: ['marketing', 'analytics'] as const,
  campaign: (campaignId: string) =>
    [...analyticsKeys.all, 'campaign', campaignId] as const,
  channels: () => [...analyticsKeys.all, 'channels'] as const,
  content: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, 'content', filters] as const,
  trends: (timeRange: TimeRange) => [...analyticsKeys.all, 'trends', timeRange] as const,
  audience: () => [...analyticsKeys.all, 'audience'] as const,
};

/**
 * Hook to fetch campaign analytics
 *
 * @param campaignId - Campaign ID to fetch analytics for
 * @returns Query result with campaign analytics data
 *
 * @example
 * const { data: analytics, isLoading } = useCampaignAnalytics('campaign-123');
 */
export function useCampaignAnalytics(
  campaignId: string
): UseQueryResult<CampaignAnalytics, Error> {
  return useQuery({
    queryKey: analyticsKeys.campaign(campaignId),
    queryFn: () => getCampaignAnalytics(campaignId),
    enabled: !!campaignId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Refresh every 30 seconds for live data
  });
}

/**
 * Hook to fetch channel performance metrics
 *
 * @returns Query result with channel performance data for all channels
 *
 * @example
 * const { data: channels } = useChannelPerformance();
 * channels?.forEach(channel => console.log(channel.engagement_rate));
 */
export function useChannelPerformance(): UseQueryResult<ChannelPerformance[], Error> {
  return useQuery({
    queryKey: analyticsKeys.channels(),
    queryFn: getChannelPerformance,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch content performance metrics with optional filters
 *
 * @param filters - Optional filters for channels, dates, and content style
 * @returns Query result with content metrics
 *
 * @example
 * const { data: content } = useContentPerformance({
 *   channels: ['linkedin', 'twitter'],
 *   start_date: '2024-01-01',
 * });
 */
export function useContentPerformance(
  filters?: AnalyticsFilters
): UseQueryResult<ContentMetrics[], Error> {
  return useQuery({
    queryKey: analyticsKeys.content(filters),
    queryFn: () => getContentPerformance(filters),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch engagement trends over a time range
 *
 * @param timeRange - Time range configuration with start, end, and period
 * @returns Query result with trend data points
 *
 * @example
 * const { data: trends } = useEngagementTrends({
 *   start: '2024-01-01',
 *   end: '2024-01-31',
 *   period: '30d'
 * });
 */
export function useEngagementTrends(
  timeRange: TimeRange
): UseQueryResult<TrendData[], Error> {
  return useQuery({
    queryKey: analyticsKeys.trends(timeRange),
    queryFn: () => getEngagementTrends(timeRange),
    enabled: !!(timeRange.start && timeRange.end),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch audience growth data
 *
 * @returns Query result with audience data by channel
 *
 * @example
 * const { data: audience } = useAudienceGrowth();
 * audience?.forEach(a => console.log(a.followers, a.growth_rate));
 */
export function useAudienceGrowth(): UseQueryResult<AudienceData[], Error> {
  return useQuery({
    queryKey: analyticsKeys.audience(),
    queryFn: getAudienceGrowth,
    staleTime: 10 * 60 * 1000, // 10 minutes (slower moving data)
  });
}

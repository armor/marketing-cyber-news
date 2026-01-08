/**
 * useCampaign & useCampaignStats Hooks
 *
 * Query hooks for fetching individual campaign details and statistics.
 * Uses TanStack Query for caching, automatic refetching, and stale data management.
 *
 * @example
 * ```typescript
 * // Fetch campaign detail
 * const { data: campaign, isLoading } = useCampaign(campaignId);
 *
 * // Fetch campaign statistics
 * const { data: stats } = useCampaignStats(campaignId);
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { getCampaign, getCampaignStats } from '../services/api/marketing';
import { marketingKeys } from './marketingKeys';
import { useAuth } from './useAuth';

// ============================================================================
// useCampaign Hook
// ============================================================================

/**
 * Fetch single campaign by ID
 *
 * @param id - Campaign ID (can be undefined during initial render)
 * @returns TanStack Query result with campaign data
 *
 * @remarks
 * - Only enabled when user is authenticated AND id is provided
 * - Data is considered stale after 5 minutes
 * - Automatically refetches on window focus
 * - Cache invalidated by campaign mutations
 */
export function useCampaign(id: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: marketingKeys.campaigns.detail(id ?? ''),
    queryFn: () => getCampaign(id!),
    enabled: isAuthenticated && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// useCampaignStats Hook
// ============================================================================

/**
 * Fetch campaign statistics (engagement, content counts, etc.)
 *
 * @param id - Campaign ID (can be undefined during initial render)
 * @returns TanStack Query result with campaign statistics
 *
 * @remarks
 * - Only enabled when user is authenticated AND id is provided
 * - Data is considered stale after 2 minutes (more frequent updates than campaign details)
 * - Automatically refetches on window focus
 * - Cache invalidated by content publishing/approval actions
 */
export function useCampaignStats(id: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: marketingKeys.campaigns.stats(id ?? ''),
    queryFn: () => getCampaignStats(id!),
    enabled: isAuthenticated && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes - stats change more frequently
  });
}

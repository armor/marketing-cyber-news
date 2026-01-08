/**
 * useCampaigns Hook
 *
 * Query hook for fetching campaign lists with filtering and pagination.
 * Uses TanStack Query for caching, automatic refetching, and stale data management.
 *
 * @example
 * ```typescript
 * // Fetch all campaigns
 * const { data, isLoading, error } = useCampaigns();
 *
 * // Fetch with filters
 * const { data } = useCampaigns({
 *   status: 'active',
 *   goal: 'leads',
 *   page: 1,
 *   pageSize: 20
 * });
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { getCampaigns } from '../services/api/marketing';
import { marketingKeys } from './marketingKeys';
import { useAuth } from './useAuth';
import type { CampaignStatus, CampaignGoal } from '../types/marketing';

// ============================================================================
// Types
// ============================================================================

/**
 * Campaign filter and pagination options
 */
interface UseCampaignsOptions extends Record<string, unknown> {
  readonly status?: CampaignStatus;
  readonly goal?: CampaignGoal;
  readonly page?: number;
  readonly pageSize?: number;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Fetch campaigns with optional filtering and pagination
 *
 * @param options - Filter and pagination parameters
 * @returns TanStack Query result with campaigns and total count
 *
 * @remarks
 * - Only enabled when user is authenticated
 * - Data is considered stale after 5 minutes
 * - Automatically refetches on window focus
 * - Cache invalidated by campaign mutations
 */
export function useCampaigns(options: UseCampaignsOptions = {}) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: marketingKeys.campaigns.list(options),
    queryFn: () =>
      getCampaigns({
        status: options.status,
        goal: options.goal,
        page: options.page,
        page_size: options.pageSize,
      }),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

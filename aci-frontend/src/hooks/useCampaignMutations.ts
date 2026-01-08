/**
 * useCampaignMutations Hook
 *
 * Mutation hook for campaign CRUD operations and state management.
 * Uses TanStack Query mutations for optimistic updates and cache invalidation.
 *
 * @example
 * ```typescript
 * const { create, update, remove, launch, pause, stop } = useCampaignMutations();
 *
 * // Create campaign
 * await create.mutateAsync(campaignData);
 *
 * // Update campaign
 * await update.mutateAsync({ id: '123', data: updates });
 *
 * // Launch campaign (draft -> active)
 * await launch.mutateAsync('123');
 *
 * // Pause active campaign
 * await pause.mutateAsync('123');
 *
 * // Stop campaign (-> completed)
 * await stop.mutateAsync('123');
 *
 * // Delete campaign
 * await remove.mutateAsync('123');
 * ```
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  launchCampaign,
  pauseCampaign,
  stopCampaign,
} from '../services/api/marketing';
import { marketingKeys } from './marketingKeys';
import type { CreateCampaignRequest, UpdateCampaignRequest } from '../types/marketing';

// ============================================================================
// Types
// ============================================================================

/**
 * Update mutation parameters
 */
interface UpdateCampaignParams {
  readonly id: string;
  readonly data: UpdateCampaignRequest;
}

/**
 * Return type for campaign mutations
 */
interface UseCampaignMutationsReturn {
  readonly create: ReturnType<typeof useMutation<unknown, Error, CreateCampaignRequest>>;
  readonly update: ReturnType<typeof useMutation<unknown, Error, UpdateCampaignParams>>;
  readonly remove: ReturnType<typeof useMutation<unknown, Error, string>>;
  readonly launch: ReturnType<typeof useMutation<unknown, Error, string>>;
  readonly pause: ReturnType<typeof useMutation<unknown, Error, string>>;
  readonly stop: ReturnType<typeof useMutation<unknown, Error, string>>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Campaign mutation operations with automatic cache invalidation
 *
 * @returns Object containing mutation functions for campaign operations
 *
 * @remarks
 * All mutations automatically invalidate relevant queries:
 * - `create` invalidates all campaign lists
 * - `update` invalidates specific campaign detail and all lists
 * - `remove` invalidates all campaign lists
 * - `launch/pause/stop` invalidate specific campaign detail and all lists
 */
export function useCampaignMutations(): UseCampaignMutationsReturn {
  const queryClient = useQueryClient();

  /**
   * Invalidate all campaign list queries
   */
  const invalidateCampaigns = (): void => {
    void queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.all() });
  };

  /**
   * Create new campaign
   * - Invalidates all campaign lists after success
   */
  const create = useMutation({
    mutationFn: (req: CreateCampaignRequest) => createCampaign(req),
    onSuccess: invalidateCampaigns,
  });

  /**
   * Update existing campaign
   * - Invalidates specific campaign detail
   * - Invalidates all campaign lists
   */
  const update = useMutation({
    mutationFn: ({ id, data }: UpdateCampaignParams) => updateCampaign(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.campaigns.detail(variables.id),
      });
      invalidateCampaigns();
    },
  });

  /**
   * Delete campaign
   * - Invalidates all campaign lists after success
   */
  const remove = useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: invalidateCampaigns,
  });

  /**
   * Launch campaign (draft -> active)
   * - Invalidates specific campaign detail
   * - Invalidates all campaign lists
   */
  const launch = useMutation({
    mutationFn: (id: string) => launchCampaign(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.campaigns.detail(id),
      });
      invalidateCampaigns();
    },
  });

  /**
   * Pause active campaign
   * - Invalidates specific campaign detail
   * - Invalidates all campaign lists
   */
  const pause = useMutation({
    mutationFn: (id: string) => pauseCampaign(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.campaigns.detail(id),
      });
      invalidateCampaigns();
    },
  });

  /**
   * Stop campaign (paused/active -> completed)
   * - Invalidates specific campaign detail
   * - Invalidates all campaign lists
   */
  const stop = useMutation({
    mutationFn: (id: string) => stopCampaign(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.campaigns.detail(id),
      });
      invalidateCampaigns();
    },
  });

  return { create, update, remove, launch, pause, stop };
}

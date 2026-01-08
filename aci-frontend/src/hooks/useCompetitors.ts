/**
 * useCompetitors Hook
 *
 * Query and mutation hooks for competitor monitoring functionality.
 * Provides access to competitor lists, content, analysis, and alerts.
 *
 * @example
 * ```typescript
 * // Fetch competitors for a campaign
 * const { data: competitors, isLoading } = useCompetitors(campaignId);
 *
 * // Fetch competitor content
 * const { data: content } = useCompetitorContent(campaignId, competitorId);
 *
 * // Add/remove competitors
 * const { addMutation, removeMutation } = useCompetitorMutations(campaignId);
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCompetitors,
  getCompetitorContent,
  getCompetitorAnalysis,
  getCompetitorAlerts,
  addCompetitor,
  removeCompetitor,
  triggerCompetitorFetch,
  markAlertRead,
} from '../services/api/marketing';
import { marketingKeys } from './marketingKeys';
import { useAuth } from './useAuth';
import type {
  AddCompetitorRequest,
  CompetitorContentFilters,
} from '../types/marketing';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all competitors for a campaign
 *
 * @param campaignId - Campaign ID
 * @returns TanStack Query result with competitor profiles
 */
export function useCompetitors(campaignId: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: marketingKeys.competitors.list(campaignId ?? ''),
    queryFn: () => getCompetitors(campaignId!),
    enabled: isAuthenticated && !!campaignId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch content from a specific competitor
 *
 * @param campaignId - Campaign ID
 * @param competitorId - Competitor ID
 * @param filters - Optional filters for content
 * @returns TanStack Query result with competitor content
 */
export function useCompetitorContent(
  campaignId: string | undefined,
  competitorId: string | undefined,
  filters?: CompetitorContentFilters
) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: marketingKeys.competitors.content(
      campaignId ?? '',
      competitorId ?? '',
      filters as Record<string, unknown> | undefined
    ),
    queryFn: () => getCompetitorContent(campaignId!, competitorId!, filters),
    enabled: isAuthenticated && !!campaignId && !!competitorId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

/**
 * Fetch analysis for a specific competitor
 *
 * @param campaignId - Campaign ID
 * @param competitorId - Competitor ID
 * @returns TanStack Query result with competitor analysis
 */
export function useCompetitorAnalysis(
  campaignId: string | undefined,
  competitorId: string | undefined
) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: marketingKeys.competitors.analysis(campaignId ?? '', competitorId ?? ''),
    queryFn: () => getCompetitorAnalysis(campaignId!, competitorId!),
    enabled: isAuthenticated && !!campaignId && !!competitorId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch competitor alerts for a campaign
 *
 * @param campaignId - Campaign ID
 * @returns TanStack Query result with competitor alerts
 */
export function useCompetitorAlerts(campaignId: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: marketingKeys.competitors.alerts(campaignId ?? ''),
    queryFn: () => getCompetitorAlerts(campaignId!),
    enabled: isAuthenticated && !!campaignId,
    staleTime: 1 * 60 * 1000, // 1 minute (alerts should be fresh)
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Competitor mutations (add, remove, fetch, mark alert as read)
 *
 * @param campaignId - Campaign ID
 * @returns Mutation functions for competitor management
 */
export function useCompetitorMutations(campaignId: string) {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (req: AddCompetitorRequest) => addCompetitor(req),
    onSuccess: () => {
      // Invalidate competitors list
      queryClient.invalidateQueries({
        queryKey: marketingKeys.competitors.list(campaignId),
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (competitorId: string) => removeCompetitor(campaignId, competitorId),
    onSuccess: () => {
      // Invalidate competitors list and all related queries
      queryClient.invalidateQueries({
        queryKey: marketingKeys.competitors.list(campaignId),
      });
    },
  });

  const fetchMutation = useMutation({
    mutationFn: (competitorId: string) => triggerCompetitorFetch(campaignId, competitorId),
    onSuccess: (_data, competitorId) => {
      // Invalidate content for this competitor
      queryClient.invalidateQueries({
        queryKey: marketingKeys.competitors.content(campaignId, competitorId),
      });
      // Invalidate analysis
      queryClient.invalidateQueries({
        queryKey: marketingKeys.competitors.analysis(campaignId, competitorId),
      });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (alertId: string) => markAlertRead(campaignId, alertId),
    onSuccess: () => {
      // Invalidate alerts
      queryClient.invalidateQueries({
        queryKey: marketingKeys.competitors.alerts(campaignId),
      });
    },
  });

  return {
    addMutation,
    removeMutation,
    fetchMutation,
    markReadMutation,
  };
}

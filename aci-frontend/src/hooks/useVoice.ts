/**
 * Voice Transformation Hooks
 *
 * TanStack Query hooks for voice transformation system
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  VoiceAgent,
  VoiceAgentWithDetails,
  TransformRequest,
  TransformResponse,
  SelectTransformRequest,
  TransformationRecord,
  TransformationFilter,
  TransformationListResponse,
} from '@/types/voice';
import {
  listVoiceAgents,
  getVoiceAgent,
  transformText,
  selectTransformation,
  getTransformationHistory,
} from '@/services/api/voice';
import { marketingKeys } from './marketingKeys';

// ============================================================================
// Voice Agents Hooks
// ============================================================================

/**
 * Hook to fetch all active voice agents
 */
export function useVoiceAgents() {
  return useQuery<VoiceAgent[]>({
    queryKey: marketingKeys.voice.agents(),
    queryFn: listVoiceAgents,
    staleTime: 5 * 60 * 1000, // 5 minutes - agents don't change often
  });
}

/**
 * Hook to fetch a specific voice agent with details
 */
export function useVoiceAgent(id: string | null) {
  return useQuery<VoiceAgentWithDetails>({
    queryKey: marketingKeys.voice.agent(id ?? ''),
    queryFn: () => getVoiceAgent(id!),
    enabled: !!id, // Only fetch if ID is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Transformation Hooks
// ============================================================================

/**
 * Hook to transform text using a voice agent
 * Rate limited: 30 requests/hour
 */
export function useTransformText() {
  const queryClient = useQueryClient();

  return useMutation<
    TransformResponse,
    Error,
    { agentId: string; request: TransformRequest }
  >({
    mutationFn: async ({ agentId, request }) => {
      const response = await transformText(agentId, request);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate transformation history to show new request
      queryClient.invalidateQueries({ queryKey: marketingKeys.voice.transformations() });
    },
    onError: (error) => {
      // Check if rate limited
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        toast.error('Rate limit exceeded. Try again later (30 requests/hour limit).');
      } else {
        toast.error('Failed to transform text. Please try again.');
      }
    },
  });
}

/**
 * Hook to select a transformation option
 */
export function useSelectTransformation() {
  const queryClient = useQueryClient();

  return useMutation<TransformationRecord, Error, SelectTransformRequest>({
    mutationFn: async (request) => {
      const response = await selectTransformation(request);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate transformation history to show new selection
      queryClient.invalidateQueries({ queryKey: marketingKeys.voice.transformations() });
      toast.success('Transformation applied successfully');
    },
    onError: () => {
      toast.error('Failed to save transformation selection');
    },
  });
}

/**
 * Hook to fetch transformation history
 */
export function useTransformationHistory(filters?: TransformationFilter) {
  return useQuery<TransformationListResponse>({
    queryKey: marketingKeys.voice.transformations(filters as Record<string, unknown>),
    queryFn: () => getTransformationHistory(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

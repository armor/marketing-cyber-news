/**
 * useVoiceAgentAdmin Hook
 *
 * TanStack Query mutation hooks for voice agent admin operations.
 * All mutations automatically invalidate relevant queries on success.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createVoiceAgent,
  updateVoiceAgent,
  deleteVoiceAgent,
  createStyleRule,
  updateStyleRule,
  deleteStyleRule,
  createExample,
  updateExample,
  deleteExample,
} from '@/services/api/voice';
import type { VoiceAgentWithDetails } from '@/types/voice';
import { marketingKeys } from './marketingKeys';

// ============================================================================
// Types
// ============================================================================

interface CreateVoiceAgentVariables {
  readonly data: {
    readonly name: string;
    readonly description?: string;
    readonly icon?: string;
    readonly color?: string;
    readonly system_prompt: string;
    readonly temperature?: number;
    readonly max_tokens?: number;
    readonly status?: 'active' | 'draft' | 'inactive';
  };
}

interface UpdateVoiceAgentVariables {
  readonly id: string;
  readonly data: {
    readonly name?: string;
    readonly description?: string;
    readonly icon?: string;
    readonly color?: string;
    readonly system_prompt?: string;
    readonly temperature?: number;
    readonly max_tokens?: number;
    readonly status?: 'active' | 'draft' | 'inactive';
  };
}

interface DeleteVoiceAgentVariables {
  readonly id: string;
}

interface CreateStyleRuleVariables {
  readonly agentId: string;
  readonly data: {
    readonly rule_type: 'do' | 'dont';
    readonly rule_text: string;
    readonly sort_order?: number;
  };
}

interface UpdateStyleRuleVariables {
  readonly agentId: string;
  readonly ruleId: string;
  readonly data: {
    readonly rule_type?: 'do' | 'dont';
    readonly rule_text?: string;
    readonly sort_order?: number;
  };
}

interface DeleteStyleRuleVariables {
  readonly agentId: string;
  readonly ruleId: string;
}

interface CreateExampleVariables {
  readonly agentId: string;
  readonly data: {
    readonly before_text: string;
    readonly after_text: string;
    readonly context?: string;
    readonly sort_order?: number;
  };
}

interface UpdateExampleVariables {
  readonly agentId: string;
  readonly exampleId: string;
  readonly data: {
    readonly before_text?: string;
    readonly after_text?: string;
    readonly context?: string;
    readonly sort_order?: number;
  };
}

interface DeleteExampleVariables {
  readonly agentId: string;
  readonly exampleId: string;
}

// ============================================================================
// Voice Agent CRUD Hooks
// ============================================================================

/**
 * Hook to create a new voice agent
 */
export function useCreateVoiceAgent(): UseMutationResult<
  VoiceAgentWithDetails,
  Error,
  CreateVoiceAgentVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data }: CreateVoiceAgentVariables) => createVoiceAgent(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.voice.agents(),
      });
      toast.success('Voice agent created successfully');
    },
    onError: () => {
      toast.error('Failed to create voice agent');
    },
  });
}

/**
 * Hook to update an existing voice agent
 */
export function useUpdateVoiceAgent(): UseMutationResult<
  VoiceAgentWithDetails,
  Error,
  UpdateVoiceAgentVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateVoiceAgentVariables) =>
      updateVoiceAgent(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.voice.agents(),
      });
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.voice.agent(variables.id),
      });
      toast.success('Voice agent updated successfully');
    },
    onError: () => {
      toast.error('Failed to update voice agent');
    },
  });
}

/**
 * Hook to delete a voice agent
 */
export function useDeleteVoiceAgent(): UseMutationResult<
  void,
  Error,
  DeleteVoiceAgentVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DeleteVoiceAgentVariables) => deleteVoiceAgent(id),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.voice.agents(),
      });
      queryClient.removeQueries({
        queryKey: marketingKeys.voice.agent(variables.id),
      });
      toast.success('Voice agent deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete voice agent');
    },
  });
}

// ============================================================================
// Style Rule Hooks
// ============================================================================

/**
 * Hook to create a new style rule
 */
export function useCreateStyleRule(): UseMutationResult<
  void,
  Error,
  CreateStyleRuleVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, data }: CreateStyleRuleVariables) =>
      createStyleRule(agentId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.voice.agent(variables.agentId),
      });
      toast.success('Style rule added successfully');
    },
    onError: () => {
      toast.error('Failed to add style rule');
    },
  });
}

/**
 * Hook to update a style rule
 */
export function useUpdateStyleRule(): UseMutationResult<
  void,
  Error,
  UpdateStyleRuleVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, ruleId, data }: UpdateStyleRuleVariables) =>
      updateStyleRule(agentId, ruleId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.voice.agent(variables.agentId),
      });
      toast.success('Style rule updated successfully');
    },
    onError: () => {
      toast.error('Failed to update style rule');
    },
  });
}

/**
 * Hook to delete a style rule
 */
export function useDeleteStyleRule(): UseMutationResult<
  void,
  Error,
  DeleteStyleRuleVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, ruleId }: DeleteStyleRuleVariables) =>
      deleteStyleRule(agentId, ruleId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.voice.agent(variables.agentId),
      });
      toast.success('Style rule deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete style rule');
    },
  });
}

// ============================================================================
// Example Hooks
// ============================================================================

/**
 * Hook to create a new example
 */
export function useCreateExample(): UseMutationResult<
  void,
  Error,
  CreateExampleVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, data }: CreateExampleVariables) =>
      createExample(agentId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.voice.agent(variables.agentId),
      });
      toast.success('Example added successfully');
    },
    onError: () => {
      toast.error('Failed to add example');
    },
  });
}

/**
 * Hook to update an example
 */
export function useUpdateExample(): UseMutationResult<
  void,
  Error,
  UpdateExampleVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, exampleId, data }: UpdateExampleVariables) =>
      updateExample(agentId, exampleId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.voice.agent(variables.agentId),
      });
      toast.success('Example updated successfully');
    },
    onError: () => {
      toast.error('Failed to update example');
    },
  });
}

/**
 * Hook to delete an example
 */
export function useDeleteExample(): UseMutationResult<
  void,
  Error,
  DeleteExampleVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, exampleId }: DeleteExampleVariables) =>
      deleteExample(agentId, exampleId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: marketingKeys.voice.agent(variables.agentId),
      });
      toast.success('Example deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete example');
    },
  });
}

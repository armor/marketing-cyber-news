/**
 * useNewsletterConfigMutations Hook
 *
 * TanStack Query mutation hooks for newsletter configuration CRUD operations.
 * All mutations automatically invalidate relevant queries on success.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,
} from '@/services/api/newsletter';
import type {
  NewsletterConfiguration,
  CreateConfigurationRequest,
  UpdateConfigurationRequest,
} from '@/types/newsletter';
import { newsletterKeys } from './newsletterKeys';

// ============================================================================
// Types
// ============================================================================

interface CreateConfigVariables {
  readonly request: CreateConfigurationRequest;
}

interface UpdateConfigVariables {
  readonly id: string;
  readonly request: UpdateConfigurationRequest;
}

interface DeleteConfigVariables {
  readonly id: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to create a new newsletter configuration
 *
 * Invalidates configuration list queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useCreateConfig();
 *
 * mutate({
 *   request: {
 *     name: 'Weekly Security Digest',
 *     cadence: 'weekly',
 *     segment_id: 'seg_123'
 *   }
 * });
 * ```
 */
export function useCreateConfig(): UseMutationResult<
  NewsletterConfiguration,
  Error,
  CreateConfigVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request }: CreateConfigVariables) =>
      createConfiguration(request),
    onSuccess: () => {
      // Invalidate all configuration lists to include new config
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.configAll,
      });
    },
  });
}

/**
 * Hook to update an existing newsletter configuration
 *
 * Invalidates configuration list and detail queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useUpdateConfig();
 *
 * mutate({
 *   id: 'cfg_123',
 *   request: {
 *     is_active: false,
 *     max_blocks: 8
 *   }
 * });
 * ```
 */
export function useUpdateConfig(): UseMutationResult<
  NewsletterConfiguration,
  Error,
  UpdateConfigVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: UpdateConfigVariables) =>
      updateConfiguration(id, request),
    onSuccess: (_, variables) => {
      // Invalidate configuration lists
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.configAll,
      });

      // Invalidate specific configuration detail
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.configDetail(variables.id),
      });
    },
  });
}

/**
 * Hook to delete a newsletter configuration
 *
 * Invalidates configuration list queries on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useDeleteConfig();
 *
 * mutate({ id: 'cfg_123' });
 * ```
 */
export function useDeleteConfig(): UseMutationResult<
  void,
  Error,
  DeleteConfigVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DeleteConfigVariables) => deleteConfiguration(id),
    onSuccess: (_, variables) => {
      // Invalidate all configuration lists to remove deleted config
      void queryClient.invalidateQueries({
        queryKey: newsletterKeys.configAll,
      });

      // Remove specific configuration from cache
      queryClient.removeQueries({
        queryKey: newsletterKeys.configDetail(variables.id),
      });
    },
  });
}

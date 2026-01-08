/**
 * useBrandMutations Hook
 *
 * TanStack Query mutations for brand voice operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { brandKeys } from './useBrandStore';
import type {
  CreateExampleRequest,
  AddTerminologyRequest,
  UpdateBrandVoiceRequest,
  BannedTerm,
} from '@/types/brand';

// ============================================================================
// Mock API Functions (replace with real API calls)
// ============================================================================

async function uploadBrandAsset(_brandVoiceId: string, _file: File): Promise<void> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Simulate random failure for testing
  if (Math.random() < 0.1) {
    throw new Error('Upload failed - network error');
  }
}

async function createContentExample(
  _brandVoiceId: string,
  request: CreateExampleRequest
): Promise<void> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (!request.content || request.quality_score < 1 || request.quality_score > 10) {
    throw new Error('Invalid content example');
  }
}

async function updateTerminology(
  _brandVoiceId: string,
  _request: AddTerminologyRequest
): Promise<void> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 600));
}

async function updateBrandSettings(
  _brandVoiceId: string,
  _request: UpdateBrandVoiceRequest
): Promise<void> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 500));
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export interface UploadAssetVariables {
  readonly brandVoiceId: string;
  readonly file: File;
}

/**
 * Upload brand asset mutation
 */
export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandVoiceId, file }: UploadAssetVariables) =>
      uploadBrandAsset(brandVoiceId, file),
    onSuccess: (_data, variables) => {
      // Invalidate assets list
      void queryClient.invalidateQueries({
        queryKey: brandKeys.assets(variables.brandVoiceId),
      });

      // Invalidate brand voice (health score may change)
      void queryClient.invalidateQueries({
        queryKey: brandKeys.voice(variables.brandVoiceId),
      });

      toast.success('Asset uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

export interface CreateExampleVariables {
  readonly brandVoiceId: string;
  readonly request: CreateExampleRequest;
}

/**
 * Create content example mutation
 */
export function useCreateExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandVoiceId, request }: CreateExampleVariables) =>
      createContentExample(brandVoiceId, request),
    onSuccess: (_data, variables) => {
      // Invalidate examples list
      void queryClient.invalidateQueries({
        queryKey: brandKeys.examples(variables.brandVoiceId),
      });

      // Invalidate brand voice (health score may change)
      void queryClient.invalidateQueries({
        queryKey: brandKeys.voice(variables.brandVoiceId),
      });

      toast.success('Content example added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add example: ${error.message}`);
    },
  });
}

export interface UpdateTerminologyVariables {
  readonly brandVoiceId: string;
  readonly request: AddTerminologyRequest;
}

/**
 * Update terminology mutation
 */
export function useUpdateTerminology() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandVoiceId, request }: UpdateTerminologyVariables) =>
      updateTerminology(brandVoiceId, request),
    onSuccess: (_data, variables) => {
      // Invalidate brand voice
      void queryClient.invalidateQueries({
        queryKey: brandKeys.voice(variables.brandVoiceId),
      });

      toast.success('Terminology updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update terminology: ${error.message}`);
    },
  });
}

export interface UpdateSettingsVariables {
  readonly brandVoiceId: string;
  readonly request: UpdateBrandVoiceRequest;
}

/**
 * Update brand settings mutation
 */
export function useUpdateBrandSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandVoiceId, request }: UpdateSettingsVariables) =>
      updateBrandSettings(brandVoiceId, request),
    onSuccess: (_data, variables) => {
      // Invalidate brand voice
      void queryClient.invalidateQueries({
        queryKey: brandKeys.voice(variables.brandVoiceId),
      });

      toast.success('Settings updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add a single approved term
 */
export function useAddApprovedTerm() {
  const updateMutation = useUpdateTerminology();

  return (brandVoiceId: string, term: string) => {
    updateMutation.mutate({
      brandVoiceId,
      request: {
        approved_terms: [term],
      },
    });
  };
}

/**
 * Add a single banned term
 */
export function useAddBannedTerm() {
  const updateMutation = useUpdateTerminology();

  return (brandVoiceId: string, bannedTerm: BannedTerm) => {
    updateMutation.mutate({
      brandVoiceId,
      request: {
        banned_terms: [bannedTerm],
      },
    });
  };
}

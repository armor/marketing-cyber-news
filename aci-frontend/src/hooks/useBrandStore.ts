/**
 * useBrandStore Hook
 *
 * TanStack Query hook for fetching brand voice data.
 */

import { useQuery } from '@tanstack/react-query';
import type { BrandVoice, BrandHealthBreakdown, BrandAsset, ContentExample } from '@/types/brand';

// ============================================================================
// Query Keys
// ============================================================================

export const brandKeys = {
  all: ['brand'] as const,
  voices: () => [...brandKeys.all, 'voices'] as const,
  voice: (id: string) => [...brandKeys.all, 'voice', id] as const,
  health: (id: string) => [...brandKeys.all, 'health', id] as const,
  assets: (id: string) => [...brandKeys.all, 'assets', id] as const,
  examples: (id: string) => [...brandKeys.all, 'examples', id] as const,
};

// ============================================================================
// Mock API Functions (replace with real API calls)
// ============================================================================

async function getBrandVoice(id: string): Promise<BrandVoice> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    id,
    name: 'Armor AI Brand Voice',
    description: 'Technical but accessible cybersecurity voice for CISOs',
    health_score: 78,
    total_examples: 12,
    total_documents: 5,
    approved_terms: ['zero-trust', 'defense-in-depth', 'threat actor'],
    banned_terms: [
      { term: 'hack', replacement: 'compromise' },
      { term: 'bulletproof', replacement: 'resilient' },
    ],
    strictness_level: 75,
    auto_correct_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function getBrandHealth(_id: string): Promise<BrandHealthBreakdown> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    examples_score: 85,
    guidelines_score: 70,
    terminology_score: 80,
    recommendations: [
      'Add 3 more content examples to reach optimal training',
      'Define guidelines for technical jargon usage',
      'Review banned terms list for completeness',
    ],
  };
}

async function getBrandAssets(brandVoiceId: string): Promise<readonly BrandAsset[]> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 300));

  return [
    {
      id: '1',
      brand_voice_id: brandVoiceId,
      filename: 'brand-guidelines.pdf',
      file_type: 'pdf',
      file_size: 2048576,
      processing_status: 'completed',
      extracted_text_length: 15420,
      uploaded_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    },
  ];
}

async function getContentExamples(brandVoiceId: string): Promise<readonly ContentExample[]> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 300));

  return [
    {
      id: '1',
      brand_voice_id: brandVoiceId,
      content: 'Zero-trust architecture provides defense-in-depth for modern enterprises.',
      quality_score: 9,
      source: 'Newsletter 2024-01',
      created_by: 'admin',
      created_at: new Date().toISOString(),
    },
  ];
}

// ============================================================================
// Hooks
// ============================================================================

const STALE_TIME_MS = 30000; // 30 seconds

export interface UseBrandVoiceOptions {
  readonly id: string;
  readonly enabled?: boolean;
}

export interface UseBrandVoiceReturn {
  readonly data: BrandVoice | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

/**
 * Hook to fetch brand voice configuration
 */
export function useBrandVoice(options: UseBrandVoiceOptions): UseBrandVoiceReturn {
  const { id, enabled = true } = options;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: brandKeys.voice(id),
    queryFn: () => getBrandVoice(id),
    enabled: enabled && Boolean(id),
    staleTime: STALE_TIME_MS,
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

export interface UseBrandHealthReturn {
  readonly data: BrandHealthBreakdown | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

/**
 * Hook to fetch brand health breakdown
 */
export function useBrandHealth(options: UseBrandVoiceOptions): UseBrandHealthReturn {
  const { id, enabled = true } = options;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: brandKeys.health(id),
    queryFn: () => getBrandHealth(id),
    enabled: enabled && Boolean(id),
    staleTime: STALE_TIME_MS,
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

export interface UseBrandAssetsReturn {
  readonly data: readonly BrandAsset[] | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

/**
 * Hook to fetch brand assets
 */
export function useBrandAssets(options: UseBrandVoiceOptions): UseBrandAssetsReturn {
  const { id, enabled = true } = options;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: brandKeys.assets(id),
    queryFn: () => getBrandAssets(id),
    enabled: enabled && Boolean(id),
    staleTime: STALE_TIME_MS,
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

export interface UseContentExamplesReturn {
  readonly data: readonly ContentExample[] | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

/**
 * Hook to fetch content examples
 */
export function useContentExamples(options: UseBrandVoiceOptions): UseContentExamplesReturn {
  const { id, enabled = true } = options;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: brandKeys.examples(id),
    queryFn: () => getContentExamples(id),
    enabled: enabled && Boolean(id),
    staleTime: STALE_TIME_MS,
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

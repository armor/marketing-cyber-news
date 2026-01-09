/**
 * useClaimValidation Hook
 *
 * TanStack Query hook for validating content against do-not-say items.
 * Used to check newsletter blocks for forbidden phrases before publishing.
 */

import {
  useMutation,
  type UseMutationResult,
} from '@tanstack/react-query';
import { validateContent } from '@/services/api/claims';
import type {
  ValidateContentRequest,
  ClaimValidationResult,
} from '@/types/claims';

// ============================================================================
// Types
// ============================================================================

interface ValidateContentVariables {
  readonly content: string;
  readonly block_id?: string;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to validate content against do-not-say claims
 *
 * Checks content for violations of do-not-say items in the claims library.
 * Returns validation result with any matched forbidden phrases.
 *
 * @example
 * ```typescript
 * const { mutate, data, isPending } = useClaimValidation();
 *
 * // Validate newsletter block content
 * mutate({
 *   content: 'This product guarantees results...',
 *   block_id: 'block_123'
 * });
 *
 * // Check results
 * if (data && !data.is_valid) {
 *   console.log('Violations found:', data.violations);
 * }
 * ```
 */
export function useClaimValidation(): UseMutationResult<
  ClaimValidationResult,
  Error,
  ValidateContentVariables
> {
  return useMutation({
    mutationFn: ({ content, block_id }: ValidateContentVariables) =>
      validateContent({ content, block_id } as ValidateContentRequest),
  });
}

// ============================================================================
// Validation Helper Hook
// ============================================================================

/**
 * Hook state for validation UI
 */
export interface UseClaimValidationState {
  readonly isValidating: boolean;
  readonly validationResult: ClaimValidationResult | undefined;
  readonly hasViolations: boolean;
  readonly violationCount: number;
}

/**
 * Extract validation state from mutation result
 *
 * @param mutation - The mutation result from useClaimValidation
 * @returns Validation state for UI consumption
 */
export function getValidationState(
  mutation: UseMutationResult<ClaimValidationResult, Error, ValidateContentVariables>
): UseClaimValidationState {
  return {
    isValidating: mutation.isPending,
    validationResult: mutation.data,
    hasViolations: mutation.data ? !mutation.data.is_valid : false,
    violationCount: mutation.data?.violations?.length ?? 0,
  };
}

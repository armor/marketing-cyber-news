/**
 * Claims Library Query Keys
 *
 * Centralized query key factory for claims-related queries.
 * Ensures consistent cache key structure for proper invalidation.
 */

// ============================================================================
// Query Key Factory
// ============================================================================

/**
 * Claims query keys with hierarchical structure
 *
 * @example
 * ```typescript
 * // Invalidate all claims queries
 * queryClient.invalidateQueries({ queryKey: claimsKeys.all });
 *
 * // Invalidate specific claims list
 * queryClient.invalidateQueries({ queryKey: claimsKeys.list({ page: 1 }) });
 *
 * // Invalidate specific claim detail
 * queryClient.invalidateQueries({ queryKey: claimsKeys.detail('123') });
 *
 * // Invalidate categories
 * queryClient.invalidateQueries({ queryKey: claimsKeys.categories });
 * ```
 */
export const claimsKeys = {
  /**
   * Base key for all claims queries
   */
  all: ['claims'] as const,

  /**
   * Key for claims list with optional parameters
   * @param params - List filter and pagination parameters
   */
  list: (params?: object) => ['claims', 'list', params] as const,

  /**
   * Key for single claim detail
   * @param id - Claim ID
   */
  detail: (id: string) => ['claims', 'detail', id] as const,

  /**
   * Key for claims categories
   */
  categories: ['claims', 'categories'] as const,

  /**
   * Key for claims search
   * @param query - Search query
   * @param limit - Optional limit
   */
  search: (query: string, limit?: number) =>
    ['claims', 'search', query, limit] as const,

  /**
   * Key for content validation
   */
  validation: ['claims', 'validation'] as const,
} as const;

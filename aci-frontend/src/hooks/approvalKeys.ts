/**
 * Approval Query Keys
 *
 * Centralized query key factory for approval-related queries.
 * Ensures consistent cache key structure for proper invalidation.
 */

// ============================================================================
// Query Key Factory
// ============================================================================

/**
 * Approval query keys with hierarchical structure
 *
 * @example
 * ```typescript
 * // Invalidate all approval queries
 * queryClient.invalidateQueries({ queryKey: approvalKeys.all });
 *
 * // Invalidate specific queue
 * queryClient.invalidateQueries({ queryKey: approvalKeys.queue({ page: 1 }) });
 *
 * // Invalidate specific history
 * queryClient.invalidateQueries({ queryKey: approvalKeys.history('123') });
 * ```
 */
export const approvalKeys = {
  /**
   * Base key for all approval queries
   */
  all: ['approvals'] as const,

  /**
   * Key for approval queue with optional parameters
   * @param params - Queue filter and pagination parameters
   */
  queue: (params?: object) => ['approvals', 'queue', params] as const,

  /**
   * Key for approval history of a specific article
   * @param articleId - Article ID
   */
  history: (articleId: string) => ['approvals', 'history', articleId] as const,
} as const;

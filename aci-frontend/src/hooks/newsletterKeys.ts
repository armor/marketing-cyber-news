/**
 * Newsletter Query Keys
 *
 * Centralized query key factory for newsletter-related queries.
 * Ensures consistent cache key structure for proper invalidation.
 */

// ============================================================================
// Query Key Factory
// ============================================================================

/**
 * Newsletter query keys with hierarchical structure
 *
 * @example
 * ```typescript
 * // Invalidate all newsletter queries
 * queryClient.invalidateQueries({ queryKey: newsletterKeys.all });
 *
 * // Invalidate specific configuration list
 * queryClient.invalidateQueries({ queryKey: newsletterKeys.configList({ page: 1 }) });
 *
 * // Invalidate specific configuration detail
 * queryClient.invalidateQueries({ queryKey: newsletterKeys.configDetail('123') });
 *
 * // Invalidate all segments
 * queryClient.invalidateQueries({ queryKey: newsletterKeys.segmentAll });
 * ```
 */
export const newsletterKeys = {
  /**
   * Base key for all newsletter queries
   */
  all: ['newsletter'] as const,

  /**
   * Base key for all configuration queries
   */
  configAll: ['newsletter', 'configs'] as const,

  /**
   * Key for configuration list with optional parameters
   * @param params - List filter and pagination parameters
   */
  configList: (params?: object) =>
    ['newsletter', 'configs', 'list', params] as const,

  /**
   * Key for single configuration detail
   * @param id - Configuration ID
   */
  configDetail: (id: string) =>
    ['newsletter', 'configs', 'detail', id] as const,

  /**
   * Base key for all segment queries
   */
  segmentAll: ['newsletter', 'segments'] as const,

  /**
   * Key for segment list with optional parameters
   * @param params - List filter and pagination parameters
   */
  segmentList: (params?: object) =>
    ['newsletter', 'segments', 'list', params] as const,

  /**
   * Key for single segment detail
   * @param id - Segment ID
   */
  segmentDetail: (id: string) =>
    ['newsletter', 'segments', 'detail', id] as const,

  /**
   * Key for segment contacts list
   * @param id - Segment ID
   * @param params - Pagination parameters
   */
  segmentContacts: (id: string, params?: object) =>
    ['newsletter', 'segments', 'detail', id, 'contacts', params] as const,

  // ============================================================================
  // Content Source Keys
  // ============================================================================

  /**
   * Base key for all content source queries
   */
  contentSourceAll: ['newsletter', 'content', 'sources'] as const,

  /**
   * Key for content source list with optional parameters
   * @param params - List filter parameters
   */
  contentSourceList: (params?: object) =>
    ['newsletter', 'content', 'sources', 'list', params] as const,

  /**
   * Key for single content source detail
   * @param id - Content source ID
   */
  contentSourceDetail: (id: string) =>
    ['newsletter', 'content', 'sources', 'detail', id] as const,

  // ============================================================================
  // Content Item Keys
  // ============================================================================

  /**
   * Base key for all content item queries
   */
  contentItemAll: ['newsletter', 'content', 'items'] as const,

  /**
   * Key for content item search with optional parameters
   * @param params - Search filter and pagination parameters
   */
  contentItemList: (params?: object) =>
    ['newsletter', 'content', 'items', 'list', params] as const,

  /**
   * Key for single content item detail
   * @param id - Content item ID
   */
  contentItemDetail: (id: string) =>
    ['newsletter', 'content', 'items', 'detail', id] as const,

  // ============================================================================
  // Newsletter Issue Keys
  // ============================================================================

  /**
   * Base key for all issue queries
   */
  issueAll: ['newsletter', 'issues'] as const,

  /**
   * Key for issue list with optional parameters
   * @param params - List filter and pagination parameters
   */
  issueList: (params?: object) =>
    ['newsletter', 'issues', 'list', params] as const,

  /**
   * Key for single issue detail
   * @param id - Issue ID
   */
  issueDetail: (id: string) => ['newsletter', 'issues', 'detail', id] as const,

  /**
   * Key for issue preview
   * @param id - Issue ID
   * @param contactId - Optional contact ID for personalization
   */
  issuePreview: (id: string, contactId?: string) =>
    ['newsletter', 'issues', 'detail', id, 'preview', contactId] as const,

  // ============================================================================
  // Analytics Keys
  // ============================================================================

  /**
   * Base key for all analytics queries
   */
  analyticsAll: ['newsletter', 'analytics'] as const,

  /**
   * Key for analytics overview
   * @param params - Date range parameters
   */
  analyticsOverview: (params?: object) =>
    ['newsletter', 'analytics', 'overview', params] as const,

  /**
   * Key for segment analytics
   * @param id - Segment ID
   * @param params - Date range parameters
   */
  analyticsSegment: (id: string, params?: object) =>
    ['newsletter', 'analytics', 'segments', id, params] as const,

  /**
   * Key for A/B test results
   * @param params - Test filter parameters
   */
  analyticsTests: (params?: object) =>
    ['newsletter', 'analytics', 'tests', params] as const,

  // ============================================================================
  // A/B Testing Keys
  // ============================================================================

  /**
   * Base key for all A/B test queries
   */
  testAll: ['newsletter', 'tests'] as const,

  /**
   * Key for test variants of a specific issue
   * @param issueId - Issue ID
   */
  testVariants: (issueId: string) =>
    ['newsletter', 'tests', 'variants', issueId] as const,

  /**
   * Key for test results of a specific issue
   * @param issueId - Issue ID
   */
  testResults: (issueId: string) =>
    ['newsletter', 'tests', 'results', issueId] as const,

  // ============================================================================
  // Calendar Keys
  // ============================================================================

  /**
   * Base key for all calendar queries
   */
  calendarAll: ['newsletter', 'calendar'] as const,

  /**
   * Key for calendar events with optional filters
   * @param startDate - Start date filter
   * @param endDate - End date filter
   * @param configurationId - Configuration ID filter
   * @param status - Status filter array
   */
  calendar: (
    startDate?: Date,
    endDate?: Date,
    configurationId?: string,
    status?: string[]
  ) =>
    [
      'newsletter',
      'calendar',
      'events',
      startDate?.toISOString(),
      endDate?.toISOString(),
      configurationId,
      status,
    ] as const,

  /**
   * Shorthand to invalidate all calendar queries
   */
  issue: (id: string) => ['newsletter', 'issues', 'detail', id] as const,
} as const;

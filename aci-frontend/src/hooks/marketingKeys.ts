/**
 * Marketing Query Keys
 *
 * Centralized query key factory for marketing-related queries.
 * Ensures consistent cache key structure for proper invalidation.
 */

// ============================================================================
// Query Key Factory
// ============================================================================

/**
 * Marketing query keys with hierarchical structure
 *
 * @example
 * ```typescript
 * // Invalidate all marketing queries
 * queryClient.invalidateQueries({ queryKey: marketingKeys.all });
 *
 * // Invalidate specific campaign list
 * queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.list({ status: 'active' }) });
 *
 * // Invalidate specific campaign detail
 * queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.detail('123') });
 *
 * // Invalidate all channels
 * queryClient.invalidateQueries({ queryKey: marketingKeys.channels.all() });
 * ```
 */
export const marketingKeys = {
  /**
   * Base key for all marketing queries
   */
  all: ['marketing'] as const,

  // ============================================================================
  // Campaign Keys
  // ============================================================================

  campaigns: {
    /**
     * Base key for all campaign queries
     */
    all: () => [...marketingKeys.all, 'campaigns'] as const,

    /**
     * Base key for campaign lists
     */
    lists: () => [...marketingKeys.campaigns.all(), 'list'] as const,

    /**
     * Key for campaign list with filters
     * @param filters - Status, goal, pagination parameters
     */
    list: (filters: Record<string, unknown>) =>
      [...marketingKeys.campaigns.lists(), filters] as const,

    /**
     * Base key for campaign details
     */
    details: () => [...marketingKeys.campaigns.all(), 'detail'] as const,

    /**
     * Key for single campaign detail
     * @param id - Campaign ID
     */
    detail: (id: string) => [...marketingKeys.campaigns.details(), id] as const,

    /**
     * Key for campaign statistics
     * @param id - Campaign ID
     */
    stats: (id: string) => [...marketingKeys.campaigns.detail(id), 'stats'] as const,

    /**
     * Base key for campaign recommendations
     */
    recommendations: () => [...marketingKeys.campaigns.all(), 'recommendations'] as const,
  },

  // ============================================================================
  // Channel Keys
  // ============================================================================

  channels: {
    /**
     * Base key for all channel queries
     */
    all: () => [...marketingKeys.all, 'channels'] as const,

    /**
     * Key for channel list
     */
    list: () => [...marketingKeys.channels.all(), 'list'] as const,

    /**
     * Key for single channel connection
     * @param channel - Channel identifier (linkedin, twitter, etc.)
     */
    detail: (channel: string) => [...marketingKeys.channels.all(), channel] as const,
  },

  // ============================================================================
  // Content Keys
  // ============================================================================

  content: {
    /**
     * Base key for all content queries
     */
    all: () => [...marketingKeys.all, 'content'] as const,

    /**
     * Key for generated content by ID
     * @param id - Content ID
     */
    generated: (id: string) => [...marketingKeys.content.all(), 'generated', id] as const,
  },

  // ============================================================================
  // Calendar Keys
  // ============================================================================

  calendar: {
    /**
     * Base key for all calendar queries
     */
    all: () => [...marketingKeys.all, 'calendar'] as const,

    /**
     * Key for calendar date range
     * @param start - Start date (ISO string)
     * @param end - End date (ISO string)
     */
    range: (start: string, end: string) =>
      [...marketingKeys.calendar.all(), start, end] as const,
  },

  // ============================================================================
  // Brand Keys
  // ============================================================================

  brand: {
    /**
     * Base key for all brand queries
     */
    all: () => [...marketingKeys.all, 'brand'] as const,

    /**
     * Key for brand store configuration
     */
    store: () => [...marketingKeys.brand.all(), 'store'] as const,

    /**
     * Key for brand health metrics
     */
    health: () => [...marketingKeys.brand.all(), 'health'] as const,
  },

  // ============================================================================
  // Competitor Keys
  // ============================================================================

  competitors: {
    /**
     * Base key for all competitor queries
     */
    all: () => [...marketingKeys.all, 'competitors'] as const,

    /**
     * Key for competitors list for a campaign
     * @param campaignId - Campaign ID
     */
    list: (campaignId: string) => [...marketingKeys.competitors.all(), campaignId] as const,

    /**
     * Key for competitor content
     * @param campaignId - Campaign ID
     * @param competitorId - Competitor ID
     * @param filters - Optional filters
     */
    content: (campaignId: string, competitorId: string, filters?: Record<string, unknown>) =>
      [...marketingKeys.competitors.list(campaignId), competitorId, 'content', filters ?? {}] as const,

    /**
     * Key for competitor analysis
     * @param campaignId - Campaign ID
     * @param competitorId - Competitor ID
     */
    analysis: (campaignId: string, competitorId: string) =>
      [...marketingKeys.competitors.list(campaignId), competitorId, 'analysis'] as const,

    /**
     * Key for competitor alerts for a campaign
     * @param campaignId - Campaign ID
     */
    alerts: (campaignId: string) =>
      [...marketingKeys.competitors.all(), campaignId, 'alerts'] as const,
  },

  // ============================================================================
  // Voice Transformation Keys
  // ============================================================================

  voice: {
    /**
     * Base key for all voice transformation queries
     */
    all: () => [...marketingKeys.all, 'voice'] as const,

    /**
     * Key for voice agents list
     */
    agents: () => [...marketingKeys.voice.all(), 'agents'] as const,

    /**
     * Key for single voice agent detail
     * @param id - Voice agent ID
     */
    agent: (id: string) => [...marketingKeys.voice.agents(), id] as const,

    /**
     * Key for transformation history
     * @param filters - Optional filters
     */
    transformations: (filters?: Record<string, unknown>) =>
      [...marketingKeys.voice.all(), 'transformations', filters ?? {}] as const,
  },
} as const;

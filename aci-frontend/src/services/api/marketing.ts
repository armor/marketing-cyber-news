/**
 * Marketing Automation API Service
 *
 * Type-safe API functions for AI-powered marketing autopilot system.
 * Provides access to campaigns, channel management, content generation,
 * brand store, and content calendar.
 */

import { apiClient } from './client';
import type {
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  ChannelConnection,
  BrandStore,
  BrandValidation,
  CalendarEntry,
  GeneratedContent,
  ContentRequest,
  RefineContentRequest,
  ScheduleContentRequest,
  AIRecommendation,
  CampaignStats,
  CampaignAnalytics,
  ChannelPerformance,
  ContentMetrics,
  TrendData,
  AudienceData,
  AnalyticsFilters,
  TimeRange,
  CompetitorProfile,
  CompetitorContent,
  CompetitorAnalysis,
  CompetitorAlert,
  AddCompetitorRequest,
  CompetitorContentFilters,
} from '../../types/marketing';

// API Prefixes - aligned with backend routing
const CAMPAIGNS_PREFIX = '/campaigns';
const CHANNELS_PREFIX = '/channels';
const CONTENT_PREFIX = '/content';
const CALENDAR_PREFIX = '/calendar';
const BRAND_PREFIX = '/brand';
const ANALYTICS_PREFIX = '/analytics';

// ============================================================================
// Campaign API
// ============================================================================

/**
 * Campaign list query parameters
 */
interface CampaignParams {
  readonly status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  readonly goal?: 'awareness' | 'leads' | 'engagement' | 'traffic';
  readonly page?: number;
  readonly page_size?: number;
}

/**
 * Raw backend response format for campaign list
 */
interface RawCampaignListResponse {
  readonly data: readonly Campaign[];
  readonly pagination: {
    readonly page: number;
    readonly page_size: number;
    readonly total_items: number;
    readonly total_pages: number;
  };
}

/**
 * Frontend response format for campaign list
 */
interface CampaignListResponse {
  readonly data: readonly Campaign[];
  readonly total: number;
}

/**
 * Fetch list of campaigns
 */
export async function getCampaigns(params?: CampaignParams): Promise<CampaignListResponse> {
  const queryParams: Record<string, string> = {};

  if (params?.status) queryParams.status = params.status;
  if (params?.goal) queryParams.goal = params.goal;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.page_size) queryParams.page_size = String(params.page_size);

  const raw = await apiClient.get<RawCampaignListResponse>(CAMPAIGNS_PREFIX, queryParams);

  return {
    data: raw.data,
    total: raw.pagination.total_items,
  };
}

/**
 * Fetch single campaign by ID
 */
export async function getCampaign(id: string): Promise<Campaign> {
  return apiClient.get<Campaign>(`${CAMPAIGNS_PREFIX}/${id}`);
}

/**
 * Create new campaign
 */
export async function createCampaign(req: CreateCampaignRequest): Promise<Campaign> {
  return apiClient.post<Campaign>(CAMPAIGNS_PREFIX, req);
}

/**
 * Update existing campaign
 */
export async function updateCampaign(
  id: string,
  req: UpdateCampaignRequest
): Promise<Campaign> {
  return apiClient.put<Campaign>(`${CAMPAIGNS_PREFIX}/${id}`, req);
}

/**
 * Delete campaign
 */
export async function deleteCampaign(id: string): Promise<void> {
  return apiClient.delete<void>(`${CAMPAIGNS_PREFIX}/${id}`);
}

/**
 * Launch campaign (draft -> active)
 */
export async function launchCampaign(id: string): Promise<Campaign> {
  return apiClient.post<Campaign>(`${CAMPAIGNS_PREFIX}/${id}/launch`);
}

/**
 * Pause active campaign
 */
export async function pauseCampaign(id: string): Promise<Campaign> {
  return apiClient.post<Campaign>(`${CAMPAIGNS_PREFIX}/${id}/pause`);
}

/**
 * Stop campaign (paused/active -> completed)
 */
export async function stopCampaign(id: string): Promise<Campaign> {
  return apiClient.post<Campaign>(`${CAMPAIGNS_PREFIX}/${id}/stop`);
}

/**
 * AI recommendations response
 */
interface RecommendationsResponse {
  readonly recommendations: readonly AIRecommendation[];
}

/**
 * Get AI-powered campaign recommendations
 */
export async function getCampaignRecommendations(
  req: CreateCampaignRequest
): Promise<AIRecommendation[]> {
  const response = await apiClient.post<RecommendationsResponse>(
    `${CAMPAIGNS_PREFIX}/recommendations`,
    req
  );
  return [...response.recommendations];
}

/**
 * Fetch campaign statistics
 */
export async function getCampaignStats(id: string): Promise<CampaignStats> {
  return apiClient.get<CampaignStats>(`${CAMPAIGNS_PREFIX}/${id}/stats`);
}

// ============================================================================
// Channel API
// ============================================================================

/**
 * Raw backend response for channel list
 */
interface ChannelListResponse {
  readonly channels: readonly ChannelConnection[];
}

/**
 * Fetch all connected channels
 */
export async function getChannels(): Promise<ChannelConnection[]> {
  const response = await apiClient.get<ChannelListResponse>(CHANNELS_PREFIX);
  return [...response.channels];
}

/**
 * Fetch single channel connection
 */
export async function getChannel(channel: string): Promise<ChannelConnection | null> {
  try {
    return await apiClient.get<ChannelConnection>(`${CHANNELS_PREFIX}/${channel}`);
  } catch {
    return null;
  }
}

/**
 * OAuth initiation response
 */
interface OAuthResponse {
  readonly oauth_url: string;
}

/**
 * Initiate OAuth flow for channel
 */
export async function initiateOAuth(channel: string): Promise<{ oauth_url: string }> {
  return apiClient.post<OAuthResponse>(`${CHANNELS_PREFIX}/${channel}/oauth`);
}

/**
 * Disconnect channel
 */
export async function disconnectChannel(channel: string): Promise<void> {
  return apiClient.delete<void>(`${CHANNELS_PREFIX}/${channel}`);
}

/**
 * Channel test response
 */
interface ChannelTestResponse {
  readonly success: boolean;
  readonly error?: string;
}

/**
 * Test channel connection
 */
export async function testChannel(channel: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.post<ChannelTestResponse>(`${CHANNELS_PREFIX}/${channel}/test`);
}

// ============================================================================
// Content Studio API
// ============================================================================

/**
 * Generate content with AI
 */
export async function generateContent(req: ContentRequest): Promise<GeneratedContent> {
  return apiClient.post<GeneratedContent>(`${CONTENT_PREFIX}/generate`, req);
}

/**
 * Refine existing content
 */
export async function refineContent(
  id: string,
  req: RefineContentRequest
): Promise<GeneratedContent> {
  return apiClient.post<GeneratedContent>(`${CONTENT_PREFIX}/${id}/refine`, req);
}

/**
 * Validate content against brand guidelines
 */
export async function validateContent(id: string): Promise<BrandValidation> {
  return apiClient.get<BrandValidation>(`${CONTENT_PREFIX}/${id}/validate`);
}

/**
 * Schedule content for publishing
 */
export async function scheduleContent(req: ScheduleContentRequest): Promise<CalendarEntry> {
  return apiClient.post<CalendarEntry>(CALENDAR_PREFIX, req);
}

/**
 * Publish content response
 */
interface PublishResponse {
  readonly published_url: string;
}

/**
 * Publish content immediately
 */
export async function publishContent(id: string): Promise<{ published_url: string }> {
  return apiClient.post<PublishResponse>(`${CONTENT_PREFIX}/${id}/publish`);
}

// ============================================================================
// Calendar API
// ============================================================================

/**
 * Calendar query parameters
 */
interface CalendarParams {
  readonly start_date: string;
  readonly end_date: string;
  readonly channel?: string;
}

/**
 * Raw backend response for calendar
 */
interface CalendarResponse {
  readonly entries: readonly CalendarEntry[];
}

/**
 * Fetch content calendar for date range
 */
export async function getCalendar(params: CalendarParams): Promise<CalendarEntry[]> {
  const queryParams: Record<string, string> = {
    start_date: params.start_date,
    end_date: params.end_date,
  };

  if (params.channel) queryParams.channel = params.channel;

  const response = await apiClient.get<CalendarResponse>(CALENDAR_PREFIX, queryParams);
  return [...response.entries];
}

/**
 * Update calendar entry request
 */
interface UpdateCalendarEntryRequest {
  readonly scheduled_at: string;
}

/**
 * Update scheduled time for calendar entry
 */
export async function updateCalendarEntry(
  id: string,
  scheduledAt: string
): Promise<CalendarEntry> {
  const body: UpdateCalendarEntryRequest = { scheduled_at: scheduledAt };
  return apiClient.put<CalendarEntry>(`${CALENDAR_PREFIX}/${id}`, body);
}

/**
 * Cancel scheduled content
 */
export async function cancelCalendarEntry(id: string): Promise<void> {
  return apiClient.delete<void>(`${CALENDAR_PREFIX}/${id}`);
}

// ============================================================================
// Brand Store API
// ============================================================================

/**
 * Fetch brand store configuration
 */
export async function getBrandStore(): Promise<BrandStore> {
  return apiClient.get<BrandStore>(BRAND_PREFIX);
}

/**
 * Upload brand asset (style guide, examples, etc.)
 */
export async function uploadBrandAsset(
  file: File,
  type: string
): Promise<{ processed: boolean; chunks: number }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  // Note: This would need special handling for multipart/form-data
  // For now, returning placeholder - implement with proper form data upload
  throw new Error('uploadBrandAsset not yet implemented - requires multipart/form-data support');
}

/**
 * Train brand voice request
 */
interface TrainBrandRequest {
  readonly content: string;
  readonly score: number;
}

/**
 * Train brand voice from example content
 */
export async function trainBrandFromContent(content: string, score: number): Promise<void> {
  const body: TrainBrandRequest = { content, score };
  return apiClient.post<void>(`${BRAND_PREFIX}/train`, body);
}

/**
 * Update terminology request
 */
interface UpdateTerminologyRequest {
  readonly approved: readonly string[];
  readonly banned: readonly { term: string; replacement?: string }[];
}

/**
 * Update approved/banned terminology
 */
export async function updateBrandTerminology(
  approved: string[],
  banned: { term: string; replacement?: string }[]
): Promise<BrandStore> {
  const body: UpdateTerminologyRequest = { approved, banned };
  return apiClient.put<BrandStore>(`${BRAND_PREFIX}/terminology`, body);
}

/**
 * Update brand settings request
 */
interface UpdateBrandSettingsRequest {
  readonly strictness: number;
  readonly auto_correct: boolean;
}

/**
 * Update brand validation settings
 */
export async function updateBrandSettings(
  strictness: number,
  autoCorrect: boolean
): Promise<BrandStore> {
  const body: UpdateBrandSettingsRequest = {
    strictness,
    auto_correct: autoCorrect,
  };
  return apiClient.put<BrandStore>(`${BRAND_PREFIX}/settings`, body);
}

/**
 * Brand health response
 */
interface BrandHealthResponse {
  readonly score: number;
  readonly recommendations: readonly string[];
}

/**
 * Get brand health score and recommendations
 */
export async function getBrandHealth(): Promise<{ score: number; recommendations: string[] }> {
  const response = await apiClient.get<BrandHealthResponse>(`${BRAND_PREFIX}/health`);
  return {
    score: response.score,
    recommendations: [...response.recommendations],
  };
}

// ============================================================================
// Analytics API
// ============================================================================

/**
 * Raw backend response for campaign analytics
 */
interface CampaignAnalyticsResponse {
  readonly analytics: CampaignAnalytics;
}

/**
 * Fetch campaign analytics by ID
 */
export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  const response = await apiClient.get<CampaignAnalyticsResponse>(
    `${CAMPAIGNS_PREFIX}/${campaignId}/analytics`
  );
  return response.analytics;
}

/**
 * Raw backend response for channel performance
 */
interface ChannelPerformanceResponse {
  readonly channels: readonly ChannelPerformance[];
}

/**
 * Fetch overall channel performance metrics
 */
export async function getChannelPerformance(): Promise<ChannelPerformance[]> {
  const response = await apiClient.get<ChannelPerformanceResponse>(
    `${ANALYTICS_PREFIX}/channels`
  );
  return [...response.channels];
}

/**
 * Raw backend response for content performance
 */
interface ContentPerformanceResponse {
  readonly content: readonly ContentMetrics[];
}

/**
 * Fetch content performance with optional filters
 */
export async function getContentPerformance(
  filters?: AnalyticsFilters
): Promise<ContentMetrics[]> {
  const queryParams: Record<string, string> = {};

  if (filters?.channels) queryParams.channels = filters.channels.join(',');
  if (filters?.start_date) queryParams.start_date = filters.start_date;
  if (filters?.end_date) queryParams.end_date = filters.end_date;
  if (filters?.content_style) queryParams.content_style = filters.content_style;

  const response = await apiClient.get<ContentPerformanceResponse>(
    `${ANALYTICS_PREFIX}/content`,
    queryParams
  );
  return [...response.content];
}

/**
 * Raw backend response for engagement trends
 */
interface EngagementTrendsResponse {
  readonly trends: readonly TrendData[];
}

/**
 * Fetch engagement trends over time
 */
export async function getEngagementTrends(timeRange: TimeRange): Promise<TrendData[]> {
  const queryParams: Record<string, string> = {
    start: timeRange.start,
    end: timeRange.end,
    period: timeRange.period,
  };

  const response = await apiClient.get<EngagementTrendsResponse>(
    `${ANALYTICS_PREFIX}/trends`,
    queryParams
  );
  return [...response.trends];
}

/**
 * Raw backend response for audience growth
 */
interface AudienceGrowthResponse {
  readonly audience: readonly AudienceData[];
}

/**
 * Fetch audience growth data by channel
 */
export async function getAudienceGrowth(): Promise<AudienceData[]> {
  const response = await apiClient.get<AudienceGrowthResponse>(
    `${ANALYTICS_PREFIX}/audience`
  );
  return [...response.audience];
}

// ============================================================================
// Competitor Monitoring API
// ============================================================================

/**
 * Raw backend response for competitors list
 */
interface CompetitorsResponse {
  readonly competitors: readonly CompetitorProfile[];
}

/**
 * Fetch all competitors for a campaign
 */
export async function getCompetitors(campaignId: string): Promise<CompetitorProfile[]> {
  const response = await apiClient.get<CompetitorsResponse>(
    `${CAMPAIGNS_PREFIX}/${campaignId}/competitors`
  );
  return [...response.competitors];
}

/**
 * Add a competitor to campaign
 */
export async function addCompetitor(req: AddCompetitorRequest): Promise<CompetitorProfile> {
  return apiClient.post<CompetitorProfile>(
    `${CAMPAIGNS_PREFIX}/${req.campaign_id}/competitors`,
    req
  );
}

/**
 * Remove a competitor from campaign
 */
export async function removeCompetitor(campaignId: string, competitorId: string): Promise<void> {
  return apiClient.delete<void>(
    `${CAMPAIGNS_PREFIX}/${campaignId}/competitors/${competitorId}`
  );
}

/**
 * Raw backend response for competitor content
 */
interface CompetitorContentResponse {
  readonly content: readonly CompetitorContent[];
}

/**
 * Fetch content from a specific competitor
 */
export async function getCompetitorContent(
  campaignId: string,
  competitorId: string,
  filters?: CompetitorContentFilters
): Promise<CompetitorContent[]> {
  const queryParams: Record<string, string> = {};

  if (filters?.channel) queryParams.channel = filters.channel;
  if (filters?.start_date) queryParams.start_date = filters.start_date;
  if (filters?.end_date) queryParams.end_date = filters.end_date;
  if (filters?.limit) queryParams.limit = String(filters.limit);

  const response = await apiClient.get<CompetitorContentResponse>(
    `${CAMPAIGNS_PREFIX}/${campaignId}/competitors/${competitorId}/content`,
    queryParams
  );
  return [...response.content];
}

/**
 * Raw backend response for competitor analysis
 */
interface CompetitorAnalysisResponse {
  readonly analysis: CompetitorAnalysis;
}

/**
 * Fetch analysis for a specific competitor
 */
export async function getCompetitorAnalysis(
  campaignId: string,
  competitorId: string
): Promise<CompetitorAnalysis> {
  const response = await apiClient.get<CompetitorAnalysisResponse>(
    `${CAMPAIGNS_PREFIX}/${campaignId}/competitors/${competitorId}/analysis`
  );
  return response.analysis;
}

/**
 * Trigger manual fetch for competitor content
 */
export async function triggerCompetitorFetch(
  campaignId: string,
  competitorId: string
): Promise<void> {
  return apiClient.post<void>(
    `${CAMPAIGNS_PREFIX}/${campaignId}/competitors/${competitorId}/fetch`
  );
}

/**
 * Raw backend response for competitor alerts
 */
interface CompetitorAlertsResponse {
  readonly alerts: readonly CompetitorAlert[];
}

/**
 * Fetch competitor alerts for a campaign
 */
export async function getCompetitorAlerts(campaignId: string): Promise<CompetitorAlert[]> {
  const response = await apiClient.get<CompetitorAlertsResponse>(
    `${CAMPAIGNS_PREFIX}/${campaignId}/alerts`
  );
  return [...response.alerts];
}

/**
 * Mark competitor alert as read
 */
export async function markAlertRead(campaignId: string, alertId: string): Promise<void> {
  return apiClient.put<void>(
    `${CAMPAIGNS_PREFIX}/${campaignId}/alerts/${alertId}/read`
  );
}

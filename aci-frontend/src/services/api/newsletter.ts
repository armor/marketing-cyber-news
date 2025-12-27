/**
 * Newsletter API Service
 *
 * Type-safe API functions for AI-powered newsletter automation system.
 * Provides access to newsletter configuration, content management,
 * issue generation, approval workflow, and analytics.
 */

import { apiClient } from './client';
import type {
  NewsletterConfiguration,
  ConfigurationListResponse,
  CreateConfigurationRequest,
  UpdateConfigurationRequest,
  Segment,
  SegmentListResponse,
  CreateSegmentRequest,
  UpdateSegmentRequest,
  ContactListResponse,
  ContentSource,
  ContentSourceListResponse,
  CreateContentSourceRequest,
  ContentItemListResponse,
  NewsletterIssue,
  IssueListResponse,
  GenerateIssueRequest,
  GenerateIssueResponse,
  IssuePreview,
  AnalyticsOverview,
  SegmentAnalytics,
  TestResultsResponse,
} from '@/types/newsletter';

// API Prefixes - aligned with backend router.go routes
const NEWSLETTER_PREFIX = '/newsletter';       // Content sources, content items
const CONFIGS_PREFIX = '/newsletter-configs';  // Newsletter configurations
const ISSUES_PREFIX = '/newsletter-issues';    // Newsletter issues
const SEGMENTS_PREFIX = '/segments';           // Audience segments
const ANALYTICS_PREFIX = '/newsletter-analytics'; // Newsletter analytics

// ============================================================================
// Configuration API
// ============================================================================

/**
 * Configuration query parameters
 */
interface ConfigurationParams {
  readonly segment_id?: string;
  readonly is_active?: boolean;
  readonly page?: number;
  readonly page_size?: number;
}

/**
 * Raw backend response format for configuration list
 * Backend uses 'meta' instead of 'pagination'
 */
interface RawConfigurationListResponse {
  readonly data: readonly NewsletterConfiguration[];
  readonly meta: {
    readonly page: number;
    readonly page_size: number;
    readonly total_count: number;
    readonly total_pages: number;
  };
}

/**
 * Fetch list of newsletter configurations
 * Transforms backend 'meta' to frontend 'pagination' format
 */
export async function getConfigurations(
  params?: ConfigurationParams
): Promise<ConfigurationListResponse> {
  const queryParams: Record<string, string> = {};

  if (params?.segment_id) queryParams.segment_id = params.segment_id;
  if (params?.is_active !== undefined) {
    queryParams.is_active = String(params.is_active);
  }
  if (params?.page) queryParams.page = String(params.page);
  if (params?.page_size) queryParams.page_size = String(params.page_size);

  const raw = await apiClient.get<RawConfigurationListResponse>(
    CONFIGS_PREFIX,
    queryParams
  );

  // Transform backend 'meta' to frontend 'pagination' format
  return {
    data: raw.data,
    pagination: {
      page: raw.meta.page,
      page_size: raw.meta.page_size,
      total: raw.meta.total_count,
      total_pages: raw.meta.total_pages,
    },
  };
}

/**
 * Fetch single configuration by ID
 */
export async function getConfiguration(
  id: string
): Promise<NewsletterConfiguration> {
  return apiClient.get<NewsletterConfiguration>(`${CONFIGS_PREFIX}/${id}`);
}

/**
 * Create new newsletter configuration
 */
export async function createConfiguration(
  data: CreateConfigurationRequest
): Promise<NewsletterConfiguration> {
  return apiClient.post<NewsletterConfiguration>(CONFIGS_PREFIX, data);
}

/**
 * Update existing configuration
 */
export async function updateConfiguration(
  id: string,
  data: UpdateConfigurationRequest
): Promise<NewsletterConfiguration> {
  return apiClient.put<NewsletterConfiguration>(
    `${CONFIGS_PREFIX}/${id}`,
    data
  );
}

/**
 * Delete configuration
 */
export async function deleteConfiguration(id: string): Promise<void> {
  return apiClient.delete<void>(`${CONFIGS_PREFIX}/${id}`);
}

// ============================================================================
// Segment API
// ============================================================================

/**
 * Segment query parameters
 */
interface SegmentParams {
  readonly is_active?: boolean;
  readonly page?: number;
  readonly page_size?: number;
}

/**
 * Raw backend response format for segment list
 * Backend uses 'meta' instead of 'pagination'
 */
interface RawSegmentListResponse {
  readonly data: readonly Segment[];
  readonly meta: {
    readonly page: number;
    readonly page_size: number;
    readonly total_count: number;
    readonly total_pages: number;
  };
}

/**
 * Fetch list of audience segments
 * Transforms backend 'meta' to frontend 'pagination' format
 */
export async function getSegments(
  params?: SegmentParams
): Promise<SegmentListResponse> {
  const queryParams: Record<string, string> = {};

  if (params?.is_active !== undefined) {
    queryParams.is_active = String(params.is_active);
  }
  if (params?.page) queryParams.page = String(params.page);
  if (params?.page_size) queryParams.page_size = String(params.page_size);

  const raw = await apiClient.get<RawSegmentListResponse>(
    SEGMENTS_PREFIX,
    queryParams
  );

  // Transform backend 'meta' to frontend 'pagination' format
  return {
    data: raw.data,
    pagination: {
      page: raw.meta.page,
      page_size: raw.meta.page_size,
      total: raw.meta.total_count,
      total_pages: raw.meta.total_pages,
    },
  };
}

/**
 * Fetch single segment by ID
 */
export async function getSegment(id: string): Promise<Segment> {
  return apiClient.get<Segment>(`${SEGMENTS_PREFIX}/${id}`);
}

/**
 * Create new audience segment
 */
export async function createSegment(
  data: CreateSegmentRequest
): Promise<Segment> {
  return apiClient.post<Segment>(SEGMENTS_PREFIX, data);
}

/**
 * Update existing segment
 */
export async function updateSegment(
  id: string,
  data: UpdateSegmentRequest
): Promise<Segment> {
  return apiClient.put<Segment>(`${SEGMENTS_PREFIX}/${id}`, data);
}

/**
 * Segment contacts query parameters
 */
interface SegmentContactParams {
  readonly page?: number;
  readonly page_size?: number;
}

/**
 * Fetch contacts in a segment
 */
export async function getSegmentContacts(
  id: string,
  params?: SegmentContactParams
): Promise<ContactListResponse> {
  const queryParams: Record<string, string> = {};

  if (params?.page) queryParams.page = String(params.page);
  if (params?.page_size) queryParams.page_size = String(params.page_size);

  return apiClient.get<ContactListResponse>(
    `${SEGMENTS_PREFIX}/${id}/contacts`,
    queryParams
  );
}

// ============================================================================
// Content API
// ============================================================================

/**
 * Content source query parameters
 */
interface ContentSourceParams {
  readonly is_active?: boolean;
  readonly source_type?: 'rss' | 'api' | 'manual';
}

/**
 * Fetch list of content sources
 */
export async function getContentSources(
  params?: ContentSourceParams
): Promise<ContentSourceListResponse> {
  const queryParams: Record<string, string> = {};

  if (params?.is_active !== undefined) {
    queryParams.is_active = String(params.is_active);
  }
  if (params?.source_type) queryParams.source_type = params.source_type;

  return apiClient.get<ContentSourceListResponse>(
    `${NEWSLETTER_PREFIX}/content-sources`,
    queryParams
  );
}

/**
 * Create new content source
 */
export async function createContentSource(
  data: CreateContentSourceRequest
): Promise<ContentSource> {
  return apiClient.post<ContentSource>(
    `${NEWSLETTER_PREFIX}/content-sources`,
    data
  );
}

/**
 * Update content source request
 */
export interface UpdateContentSourceRequest {
  readonly name?: string;
  readonly description?: string;
  readonly url?: string;
  readonly api_endpoint?: string;
  readonly api_key_name?: string;
  readonly fetch_frequency_hours?: number;
  readonly is_active?: boolean;
}

/**
 * Update existing content source
 */
export async function updateContentSource(
  id: string,
  data: UpdateContentSourceRequest
): Promise<ContentSource> {
  return apiClient.put<ContentSource>(
    `${NEWSLETTER_PREFIX}/content-sources/${id}`,
    data
  );
}

/**
 * Delete content source
 */
export async function deleteContentSource(id: string): Promise<void> {
  return apiClient.delete<void>(`${NEWSLETTER_PREFIX}/content-sources/${id}`);
}

/**
 * Test feed response
 */
export interface TestFeedResponse {
  readonly success: boolean;
  readonly title?: string;
  readonly item_count?: number;
  readonly error?: string;
}

/**
 * Test RSS/API feed connection
 * Validates URL and returns preview of feed data
 */
export async function testFeed(url: string): Promise<TestFeedResponse> {
  return apiClient.post<TestFeedResponse>(
    `${NEWSLETTER_PREFIX}/content-sources/test-feed`,
    { url }
  );
}

/**
 * Content source status response
 */
export interface ContentSourceStatus {
  readonly id: string;
  readonly is_active: boolean;
  readonly last_synced_at?: string;
  readonly items_fetched: number;
  readonly status: 'idle' | 'syncing' | 'error';
  readonly error_message?: string;
}

/**
 * Get content source status
 * Returns current sync status and metrics
 */
export async function getContentSourceStatus(
  id: string
): Promise<ContentSourceStatus> {
  return apiClient.get<ContentSourceStatus>(
    `${NEWSLETTER_PREFIX}/content-sources/${id}/status`
  );
}

/**
 * Content item search parameters
 */
interface ContentItemSearchParams {
  readonly q?: string;
  readonly source_id?: string;
  readonly content_type?:
    | 'blog'
    | 'news'
    | 'case_study'
    | 'webinar'
    | 'product_update'
    | 'event';
  readonly topic_tags?: readonly string[];
  readonly framework_tags?: readonly string[];
  readonly date_from?: string;
  readonly date_to?: string;
  readonly page?: number;
  readonly page_size?: number;
}

/**
 * Search content items with filters
 */
export async function searchContentItems(
  params?: ContentItemSearchParams
): Promise<ContentItemListResponse> {
  const queryParams: Record<string, string> = {};

  if (params?.q) queryParams.q = params.q;
  if (params?.source_id) queryParams.source_id = params.source_id;
  if (params?.content_type) queryParams.content_type = params.content_type;
  if (params?.topic_tags && params.topic_tags.length > 0) {
    queryParams.topic_tags = params.topic_tags.join(',');
  }
  if (params?.framework_tags && params.framework_tags.length > 0) {
    queryParams.framework_tags = params.framework_tags.join(',');
  }
  if (params?.date_from) queryParams.date_from = params.date_from;
  if (params?.date_to) queryParams.date_to = params.date_to;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.page_size) queryParams.page_size = String(params.page_size);

  return apiClient.get<ContentItemListResponse>(
    `${NEWSLETTER_PREFIX}/content-items`,
    queryParams
  );
}

/**
 * Sync content request body
 */
interface SyncContentRequest {
  readonly source_id?: string;
}

/**
 * Content sync response
 */
interface SyncContentResponse {
  readonly message: string;
  readonly job_id: string;
}

/**
 * Trigger content sync from sources
 * Optionally sync specific source or all active sources
 */
export async function syncContent(
  source_id?: string
): Promise<SyncContentResponse> {
  const body: SyncContentRequest = source_id
    ? { source_id }
    : {};

  return apiClient.post<SyncContentResponse>(
    `${NEWSLETTER_PREFIX}/content/select`,
    body
  );
}

// ============================================================================
// Newsletter Issue API
// ============================================================================

/**
 * Issue list query parameters
 */
interface IssueListParams {
  readonly configuration_id?: string;
  readonly segment_id?: string;
  readonly status?:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'scheduled'
    | 'sent'
    | 'failed';
  readonly date_from?: string;
  readonly date_to?: string;
  readonly page?: number;
  readonly page_size?: number;
}

/**
 * Raw API response type before transformation
 * API may not return all fields that NewsletterIssue expects
 */
interface RawNewsletterIssue extends Omit<NewsletterIssue, 'subject_line' | 'blocks' | 'preview_text'> {
  readonly subject_lines: readonly string[];
  readonly blocks?: readonly import('@/types/newsletter').NewsletterBlock[];
  readonly preview_text?: string;
}

/**
 * Raw issue list response
 * Backend uses 'total_items' instead of frontend's 'total'
 */
interface RawIssueListResponse {
  readonly data: readonly RawNewsletterIssue[];
  readonly pagination: {
    readonly page: number;
    readonly page_size: number;
    readonly total_items: number;
    readonly total_pages: number;
  };
}

/**
 * Transform raw API response to include computed subject_line and defaults
 * API may not return all fields, so we provide sensible defaults
 */
function transformIssue(raw: RawNewsletterIssue): NewsletterIssue {
  return {
    ...raw,
    subject_line: raw.subject_lines?.[0] ?? '',
    // Provide defaults for fields that may be missing from API
    blocks: raw.blocks ?? [],
    subject_lines: raw.subject_lines ?? [],
    preview_text: raw.preview_text ?? '',
  };
}

/**
 * Fetch list of newsletter issues
 * Transforms backend 'total_items' to frontend 'total' format
 */
export async function getIssues(
  params?: IssueListParams
): Promise<IssueListResponse> {
  const queryParams: Record<string, string> = {};

  if (params?.configuration_id) {
    queryParams.configuration_id = params.configuration_id;
  }
  if (params?.segment_id) queryParams.segment_id = params.segment_id;
  if (params?.status) queryParams.status = params.status;
  if (params?.date_from) queryParams.date_from = params.date_from;
  if (params?.date_to) queryParams.date_to = params.date_to;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.page_size) queryParams.page_size = String(params.page_size);

  const raw = await apiClient.get<RawIssueListResponse>(ISSUES_PREFIX, queryParams);
  return {
    data: raw.data.map(transformIssue),
    // Transform backend 'total_items' to frontend 'total' format
    pagination: {
      page: raw.pagination.page,
      page_size: raw.pagination.page_size,
      total: raw.pagination.total_items,
      total_pages: raw.pagination.total_pages,
    },
  };
}

/**
 * Fetch single issue by ID with full blocks
 */
export async function getIssue(id: string): Promise<NewsletterIssue> {
  // API returns { data: issue } wrapper
  const response = await apiClient.get<{ data: RawNewsletterIssue }>(`${ISSUES_PREFIX}/${id}`);
  return transformIssue(response.data);
}

/**
 * Generate new newsletter issue
 * Returns immediately with job tracking info
 */
export async function generateIssue(
  data: GenerateIssueRequest
): Promise<GenerateIssueResponse> {
  return apiClient.post<GenerateIssueResponse>(
    ISSUES_PREFIX,
    data
  );
}

/**
 * Update issue request body
 */
interface UpdateIssueRequest {
  readonly scheduled_for?: string;
  readonly subject_lines?: readonly string[];
  readonly intro_template?: string;
  readonly preview_text?: string;
}

/**
 * Update newsletter issue
 * Allows rescheduling and updating content
 */
export async function updateIssue(
  id: string,
  data: UpdateIssueRequest
): Promise<NewsletterIssue> {
  const response = await apiClient.put<{ data: RawNewsletterIssue }>(
    `${ISSUES_PREFIX}/${id}`,
    data
  );
  return transformIssue(response.data);
}

/**
 * Delete newsletter issue
 * Permanently removes the issue
 */
export async function deleteIssue(id: string): Promise<void> {
  return apiClient.delete(`${ISSUES_PREFIX}/${id}`);
}

/**
 * Preview issue with optional personalization
 * If contact_id omitted, uses sample contact data
 */
export async function previewIssue(
  id: string,
  contact_id?: string
): Promise<IssuePreview> {
  const queryParams: Record<string, string> = {};
  if (contact_id) queryParams.contact_id = contact_id;

  return apiClient.get<IssuePreview>(
    `${ISSUES_PREFIX}/${id}/preview`,
    queryParams
  );
}

/**
 * Approve issue request body
 */
interface ApproveIssueRequest {
  readonly notes?: string;
}

/**
 * Approve newsletter issue for sending
 * Transitions status from pending_approval to approved
 */
export async function approveIssue(
  id: string,
  notes?: string
): Promise<NewsletterIssue> {
  const body: ApproveIssueRequest = notes ? { notes } : {};

  return apiClient.post<NewsletterIssue>(
    `${ISSUES_PREFIX}/${id}/approve`,
    body
  );
}

/**
 * Reject issue request body
 */
interface RejectIssueRequest {
  readonly reason: string;
}

/**
 * Reject newsletter issue
 * Requires rejection reason (minimum 10 characters)
 */
export async function rejectIssue(
  id: string,
  reason: string
): Promise<NewsletterIssue> {
  const body: RejectIssueRequest = { reason };

  return apiClient.post<NewsletterIssue>(
    `${ISSUES_PREFIX}/${id}/reject`,
    body
  );
}

/**
 * Send issue request body
 */
interface SendIssueRequest {
  readonly scheduled_for?: string;
}

/**
 * Send or schedule newsletter issue
 * If scheduled_for omitted, sends immediately
 */
export async function sendIssue(
  id: string,
  scheduled_for?: string
): Promise<NewsletterIssue> {
  const body: SendIssueRequest = scheduled_for ? { scheduled_for } : {};

  return apiClient.post<NewsletterIssue>(
    `${ISSUES_PREFIX}/${id}/send`,
    body
  );
}

// ============================================================================
// Analytics API
// ============================================================================

/**
 * Analytics date range parameters
 */
interface AnalyticsDateParams {
  readonly date_from?: string;
  readonly date_to?: string;
}

/**
 * Fetch analytics dashboard overview
 */
export async function getAnalyticsOverview(
  params?: AnalyticsDateParams
): Promise<AnalyticsOverview> {
  const queryParams: Record<string, string> = {};

  if (params?.date_from) queryParams.date_from = params.date_from;
  if (params?.date_to) queryParams.date_to = params.date_to;

  return apiClient.get<AnalyticsOverview>(
    `${ANALYTICS_PREFIX}/overview`,
    queryParams
  );
}

/**
 * Fetch segment-specific analytics
 */
export async function getSegmentAnalytics(
  id: string,
  params?: AnalyticsDateParams
): Promise<SegmentAnalytics> {
  const queryParams: Record<string, string> = {};

  if (params?.date_from) queryParams.date_from = params.date_from;
  if (params?.date_to) queryParams.date_to = params.date_to;

  return apiClient.get<SegmentAnalytics>(
    `${ANALYTICS_PREFIX}/segments/${id}`,
    queryParams
  );
}

/**
 * Test results query parameters
 */
interface TestResultsParams {
  readonly issue_id?: string;
  readonly test_type?:
    | 'subject_line'
    | 'hero_topic'
    | 'cta_framing'
    | 'send_time';
  readonly date_from?: string;
  readonly date_to?: string;
}

/**
 * Fetch A/B test results
 */
export async function getTestResults(
  params?: TestResultsParams
): Promise<TestResultsResponse> {
  const queryParams: Record<string, string> = {};

  if (params?.issue_id) queryParams.issue_id = params.issue_id;
  if (params?.test_type) queryParams.test_type = params.test_type;
  if (params?.date_from) queryParams.date_from = params.date_from;
  if (params?.date_to) queryParams.date_to = params.date_to;

  return apiClient.get<TestResultsResponse>(
    `${ANALYTICS_PREFIX}/tests`,
    queryParams
  );
}

// ============================================================================
// Approval Workflow Helpers
// ============================================================================

/**
 * Pending approvals query parameters
 */
interface PendingApprovalsParams {
  readonly tier?: 'tier1' | 'tier2';
  readonly page?: number;
  readonly page_size?: number;
}

/**
 * Fetch issues pending approval
 * Convenience function that filters issues by pending_approval status
 * Optionally filter by approval tier based on configuration
 */
export async function getPendingApprovals(
  params?: PendingApprovalsParams
): Promise<IssueListResponse> {
  const queryParams: IssueListParams = {
    status: 'pending_approval',
    page: params?.page,
    page_size: params?.page_size,
  };

  return getIssues(queryParams);
}

// ============================================================================
// A/B Testing API
// ============================================================================

/**
 * Test variants response
 */
interface TestVariantsResponse {
  readonly issue_id: string;
  readonly variants: readonly import('@/types/newsletter').TestVariant[];
}

/**
 * Fetch test variants for a specific issue
 * Returns all variants with their performance metrics
 */
export async function getTestVariants(
  issueId: string
): Promise<TestVariantsResponse> {
  return apiClient.get<TestVariantsResponse>(
    `${ISSUES_PREFIX}/${issueId}/test-variants`
  );
}

/**
 * Declare winner request body
 */
interface DeclareWinnerRequest {
  readonly variant_id: string;
}

/**
 * Declare winning variant in A/B test
 * Marks the specified variant as the winner and updates issue status
 * Should only be called when statistical significance is reached
 */
export async function declareWinner(
  issueId: string,
  variantId: string
): Promise<TestResultsResponse> {
  const body: DeclareWinnerRequest = { variant_id: variantId };

  return apiClient.post<TestResultsResponse>(
    `${ISSUES_PREFIX}/${issueId}/declare-winner`,
    body
  );
}

// ============================================================================
// Unified API Object
// ============================================================================

/**
 * Unified newsletter API object
 * Provides all newsletter-related API methods in a single namespace
 */
export const newsletterApi = {
  // Configurations
  getConfigurations,
  getConfiguration,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,

  // Segments
  getSegments,
  getSegment,
  createSegment,
  updateSegment,
  getSegmentContacts,

  // Content Sources
  getContentSources,
  createContentSource,
  updateContentSource,
  deleteContentSource,
  testFeed,
  getContentSourceStatus,

  // Content Items
  searchContentItems,
  syncContent,

  // Issues
  getIssues,
  getIssue,
  generateIssue,
  updateIssue,
  deleteIssue,
  previewIssue,
  approveIssue,
  rejectIssue,
  sendIssue,

  // Analytics
  getAnalyticsOverview,
  getSegmentAnalytics,
  getTestResults,

  // Approvals
  getPendingApprovals,

  // A/B Testing
  getTestVariants,
  declareWinner,
} as const;

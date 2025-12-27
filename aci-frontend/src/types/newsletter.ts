// Newsletter Automation System Types
// Auto-generated from OpenAPI spec: newsletter-api.yaml

// ============================================
// ENUMS
// ============================================

export type CadenceType = 'weekly' | 'bi-weekly' | 'monthly';

export type ApprovalTier = 'tier1' | 'tier2';

export type RiskLevel = 'standard' | 'high' | 'experimental';

export type SubjectLineStyle = 'pain_first' | 'opportunity_first' | 'visionary';

export type IssueStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'sent'
  | 'failed';

export type BlockType =
  | 'hero'
  | 'news'
  | 'content'
  | 'events'
  | 'spotlight';

export type ContentType =
  | 'blog'
  | 'news'
  | 'case_study'
  | 'webinar'
  | 'product_update'
  | 'event';

export type SourceType = 'rss' | 'api' | 'manual';

export type TestType =
  | 'subject_line'
  | 'hero_topic'
  | 'cta_framing'
  | 'send_time';

export type EventType =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'unsubscribed'
  | 'complained';

// ============================================
// COMMON SCHEMAS
// ============================================

export interface Error {
  readonly error: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface Pagination {
  readonly page: number;
  readonly page_size: number;
  readonly total: number;
  readonly total_pages: number;
}

// ============================================
// CONFIGURATION INTERFACES
// ============================================

export interface NewsletterConfiguration {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly segment_id: string;
  readonly cadence: CadenceType;
  readonly send_day_of_week: number;
  readonly send_time_utc: string;
  readonly timezone: string;
  readonly max_blocks: number;
  readonly education_ratio_min: number;
  readonly content_freshness_days: number;
  readonly hero_topic_priority: string;
  readonly framework_focus: string;
  readonly subject_line_style: SubjectLineStyle;
  readonly max_metaphors: number;
  readonly banned_phrases: readonly string[];
  readonly approval_tier: ApprovalTier;
  readonly risk_level: RiskLevel;
  readonly ai_provider: string;
  readonly ai_model: string;
  readonly prompt_version: number;
  readonly is_active: boolean;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateConfigurationRequest {
  readonly name: string;
  readonly description?: string;
  readonly segment_id?: string;
  readonly cadence: CadenceType;
  readonly send_day_of_week?: number;
  readonly send_time_utc?: string;
  readonly timezone: string;
  readonly max_blocks: number;
  readonly education_ratio_min: number;
  readonly content_freshness_days: number;
  readonly hero_topic_priority?: string;
  readonly framework_focus?: string;
  readonly subject_line_style: SubjectLineStyle;
  readonly max_metaphors: number;
  readonly banned_phrases?: readonly string[];
  readonly approval_tier: ApprovalTier;
  readonly risk_level: RiskLevel;
  readonly ai_provider: string;
  readonly ai_model: string;
  readonly prompt_version: number;
}

export interface UpdateConfigurationRequest {
  readonly name?: string;
  readonly description?: string;
  readonly cadence?: CadenceType;
  readonly send_day_of_week?: number;
  readonly send_time_utc?: string;
  readonly timezone?: string;
  readonly max_blocks?: number;
  readonly education_ratio_min?: number;
  readonly content_freshness_days?: number;
  readonly hero_topic_priority?: string;
  readonly framework_focus?: string;
  readonly subject_line_style?: SubjectLineStyle;
  readonly max_metaphors?: number;
  readonly banned_phrases?: readonly string[];
  readonly approval_tier?: ApprovalTier;
  readonly risk_level?: RiskLevel;
  readonly is_active?: boolean;
}

export interface ConfigurationListResponse {
  readonly data: readonly NewsletterConfiguration[];
  readonly pagination: Pagination;
}

// ============================================
// SEGMENT INTERFACES
// ============================================

export interface Segment {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly role_cluster?: string;
  readonly industries?: readonly string[];
  readonly regions?: readonly string[];
  readonly company_size_bands?: readonly string[];
  readonly compliance_frameworks?: readonly string[];
  readonly partner_tags?: readonly string[];
  readonly min_engagement_score?: number;
  readonly topic_interests?: readonly string[];
  readonly exclude_unsubscribed?: boolean;
  readonly exclude_bounced?: boolean;
  readonly exclude_high_touch?: boolean;
  readonly max_newsletters_per_30_days?: number;
  readonly contact_count: number;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly created_by?: string;
}

export interface CreateSegmentRequest {
  readonly name: string;
  readonly description?: string;
  readonly role_cluster?: string;
  readonly industries?: readonly string[];
  readonly regions?: readonly string[];
  readonly company_size_bands?: readonly string[];
  readonly compliance_frameworks?: readonly string[];
  readonly partner_tags?: readonly string[];
  readonly min_engagement_score?: number;
  readonly topic_interests?: readonly string[];
  readonly max_newsletters_per_30_days?: number;
  readonly is_active?: boolean;
}

export interface UpdateSegmentRequest {
  readonly name?: string;
  readonly description?: string;
  readonly role_cluster?: string;
  readonly industries?: readonly string[];
  readonly regions?: readonly string[];
  readonly company_size_bands?: readonly string[];
  readonly compliance_frameworks?: readonly string[];
  readonly partner_tags?: readonly string[];
  readonly min_engagement_score?: number;
  readonly topic_interests?: readonly string[];
  readonly max_newsletters_per_30_days?: number;
  readonly is_active?: boolean;
}

export interface SegmentListResponse {
  readonly data: readonly Segment[];
  readonly pagination: Pagination;
}

// ============================================
// CONTACT INTERFACES
// ============================================

export interface Contact {
  readonly id: string;
  readonly email: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly company: string;
  readonly job_title: string;
  readonly role_category: string;
  readonly industry: string;
  readonly region: string;
  readonly primary_framework: string;
  readonly engagement_score: number;
  readonly is_subscribed: boolean;
  readonly is_bounced: boolean;
  readonly is_high_touch: boolean;
  readonly last_email_sent_at?: string;
  readonly last_opened_at?: string;
  readonly last_clicked_at?: string;
  readonly total_opens: number;
  readonly total_clicks: number;
  readonly topic_interests: readonly string[];
  readonly segment_ids: readonly string[];
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ContactListResponse {
  readonly data: readonly Contact[];
  readonly pagination: Pagination;
}

// ============================================
// CONTENT INTERFACES
// ============================================

export interface ContentSource {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly source_type: SourceType;
  readonly url?: string;
  readonly api_endpoint?: string;
  readonly api_key_name?: string;
  readonly fetch_frequency_hours: number;
  readonly is_active: boolean;
  readonly last_synced_at?: string;
  readonly items_fetched: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateContentSourceRequest {
  readonly name: string;
  readonly description?: string;
  readonly source_type: SourceType;
  readonly url?: string;
  readonly api_endpoint?: string;
  readonly api_key_name?: string;
  readonly fetch_frequency_hours?: number;
}

export interface ContentSourceListResponse {
  readonly data: readonly ContentSource[];
  readonly pagination: Pagination;
}

export interface ContentItem {
  readonly id: string;
  readonly source_id: string;
  readonly title: string;
  readonly summary: string;
  readonly url: string;
  readonly content_type: ContentType;
  readonly published_at: string;
  readonly author?: string;
  readonly topic_tags: readonly string[];
  readonly framework_tags: readonly string[];
  readonly sentiment_score?: number;
  readonly relevance_score?: number;
  readonly is_evergreen: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ContentItemListResponse {
  readonly data: readonly ContentItem[];
  readonly pagination: Pagination;
}

// ============================================
// NEWSLETTER ISSUE INTERFACES
// ============================================

export interface NewsletterBlock {
  readonly id: string;
  readonly issue_id: string;
  readonly block_type: BlockType;
  readonly position: number;
  readonly title: string;
  readonly subtitle?: string;
  readonly content: string;
  readonly cta_text?: string;
  readonly cta_url?: string;
  readonly content_item_ids: readonly string[];
  readonly created_at: string;
}

export interface NewsletterIssue {
  readonly id: string;
  readonly configuration_id: string;
  readonly segment_id: string;
  // API returns array of subject lines for A/B testing
  readonly subject_lines: readonly string[];
  // Computed property for primary subject line
  readonly subject_line: string;
  readonly intro_template?: string;
  readonly preview_text?: string;
  readonly status: IssueStatus;
  readonly scheduled_for?: string;
  readonly sent_at?: string;
  readonly blocks: readonly NewsletterBlock[];
  readonly total_recipients: number;
  readonly total_sent?: number;
  readonly total_delivered: number;
  readonly total_opens?: number;
  readonly total_opened?: number;
  readonly total_clicks?: number;
  readonly total_clicked?: number;
  readonly unique_opens?: number;
  readonly unique_clicks?: number;
  readonly total_bounces?: number;
  readonly total_unsubscribes?: number;
  readonly total_complaints?: number;
  readonly issue_number?: number;
  readonly issue_date?: string;
  readonly version?: number;
  readonly ai_model_used?: string;
  readonly prompt_version_used?: number;
  readonly generation_metadata?: Record<string, unknown>;
  readonly created_by?: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly approved_by?: string;
  readonly approved_at?: string;
  readonly rejected_by?: string;
  readonly rejected_at?: string;
  readonly rejection_reason?: string;
}

export interface GenerateIssueRequest {
  readonly configuration_id: string;
  readonly segment_id: string;
  readonly scheduled_for?: string;
}

export interface GenerateIssueResponse {
  readonly message: string;
  readonly issue_id: string;
  readonly job_id: string;
}

export interface IssuePreview {
  readonly issue_id: string;
  readonly contact_id?: string;
  readonly subject_line: string;
  readonly preview_text: string;
  readonly html_content: string;
  readonly personalization_tokens: Record<string, string>;
}

export interface IssueListResponse {
  readonly data: readonly NewsletterIssue[];
  readonly pagination: Pagination;
}

// ============================================
// A/B TEST INTERFACES
// ============================================

export interface TestVariant {
  readonly variant_id: string;
  readonly variant_name: string;
  readonly test_value: string;
  readonly recipients: number;
  readonly delivered: number;
  readonly opened: number;
  readonly clicked: number;
  readonly open_rate: number;
  readonly click_rate: number;
  readonly click_to_open_rate: number;
  readonly confidence_level?: number;
  readonly is_winner: boolean;
}

export interface TestResultsResponse {
  readonly issue_id: string;
  readonly test_type: TestType;
  readonly test_started_at: string;
  readonly test_completed_at?: string;
  readonly is_complete: boolean;
  readonly variants: readonly TestVariant[];
  readonly winning_variant_id?: string;
  readonly statistical_significance: number;
}

// ============================================
// ANALYTICS INTERFACES
// ============================================

export interface AnalyticsOverview {
  readonly date_from: string;
  readonly date_to: string;
  readonly total_issues_sent: number;
  readonly total_recipients: number;
  readonly total_delivered: number;
  readonly total_opened: number;
  readonly total_clicked: number;
  readonly unique_opens: number;
  readonly unique_clicks: number;
  readonly avg_open_rate: number;
  readonly avg_click_rate: number;
  readonly avg_click_to_open_rate: number;
  readonly total_unsubscribes: number;
  readonly total_bounces: number;
  readonly total_complaints: number;
  readonly top_performing_subjects: readonly {
    readonly subject_line: string;
    readonly open_rate: number;
    readonly issue_id: string;
  }[];
  readonly top_clicked_links: readonly {
    readonly url: string;
    readonly clicks: number;
    readonly unique_clicks: number;
  }[];
  readonly engagement_by_day: readonly {
    readonly date: string;
    readonly delivered: number;
    readonly opened: number;
    readonly clicked: number;
  }[];
}

export interface SegmentAnalytics {
  readonly segment_id: string;
  readonly segment_name: string;
  readonly date_from: string;
  readonly date_to: string;
  readonly total_contacts: number;
  readonly subscribed_contacts: number;
  readonly total_issues_sent: number;
  readonly avg_open_rate: number;
  readonly avg_click_rate: number;
  readonly avg_engagement_score: number;
  readonly top_topics: readonly {
    readonly topic: string;
    readonly clicks: number;
  }[];
  readonly engagement_trend: readonly {
    readonly date: string;
    readonly avg_engagement_score: number;
  }[];
  readonly churn_rate: number;
}

// ============================================
// TYPE GUARDS
// ============================================

export function isIssueStatus(status: string): status is IssueStatus {
  return ['draft', 'pending_approval', 'approved', 'scheduled', 'sent', 'failed'].includes(status);
}

export function isBlockType(type: string): type is BlockType {
  return ['hero', 'news', 'content', 'events', 'spotlight'].includes(type);
}

export function isContentType(type: string): type is ContentType {
  return ['blog', 'news', 'case_study', 'webinar', 'product_update', 'event'].includes(type);
}

export function isSourceType(type: string): type is SourceType {
  return ['rss', 'api', 'manual'].includes(type);
}

export function isTestType(type: string): type is TestType {
  return ['subject_line', 'hero_topic', 'cta_framing', 'send_time'].includes(type);
}

export function isCadenceType(cadence: string): cadence is CadenceType {
  return ['weekly', 'bi-weekly', 'monthly'].includes(cadence);
}

export function isRiskLevel(level: string): level is RiskLevel {
  return ['standard', 'high', 'experimental'].includes(level);
}

export function isApprovalTier(tier: string): tier is ApprovalTier {
  return ['tier1', 'tier2'].includes(tier);
}

export function isSubjectLineStyle(style: string): style is SubjectLineStyle {
  return ['pain_first', 'opportunity_first', 'visionary'].includes(style);
}

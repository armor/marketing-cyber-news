// Channel and connection types
export type ChannelType = 'linkedin' | 'twitter' | 'blog' | 'email' | 'facebook' | 'instagram';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface ChannelConnection {
  id: string;
  tenant_id: string;
  channel: ChannelType;
  account_name: string;
  account_id: string;
  status: ConnectionStatus;
  metadata: Record<string, unknown>;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// Campaign types
export type CampaignGoal = 'awareness' | 'leads' | 'engagement' | 'traffic';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type ContentStyle = 'thought_leadership' | 'product_focused' | 'industry_news' | 'educational' | 'promotional';
export type Frequency = 'daily' | '3x_week' | '5x_week' | 'weekly' | 'biweekly' | 'monthly';

export interface CampaignConfig {
  weekly_mix: Record<ChannelType, number>;
  theme_weights: Record<ContentStyle, number>;
  posting_times: Record<ChannelType, string[]>;
  auto_publish: boolean;
  min_brand_score: number;
}

export interface CampaignStats {
  total_content: number;
  published_content: number;
  pending_approval: number;
  avg_brand_score: number;
  total_engagement: number;
  total_impressions: number;
}

export interface Competitor {
  id: string;
  campaign_id: string;
  name: string;
  linkedin_url?: string;
  twitter_handle?: string;
  blog_url?: string;
  website_url?: string;
}

// Extended competitor types for monitoring
export interface CompetitorProfile extends Competitor {
  last_checked_at?: string;
  content_count: number;
  avg_posting_frequency?: number;
  status: 'active' | 'inactive' | 'error';
}

export interface CompetitorContent {
  id: string;
  competitor_id: string;
  channel: ChannelType;
  title: string;
  url: string;
  published_at: string;
  summary?: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
  created_at: string;
}

export interface CompetitorAnalysis {
  competitor_id: string;
  content_count: number;
  avg_posting_frequency: number;
  top_topics: Array<{ topic: string; count: number }>;
  posting_schedule?: {
    best_times: string[];
    best_days: string[];
  };
}

export type CompetitorAlertType = 'new_content' | 'high_engagement' | 'topic_match' | 'frequency_change';

export interface CompetitorAlert {
  id: string;
  competitor_id: string;
  alert_type: CompetitorAlertType;
  content_id?: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

// Request types
export interface AddCompetitorRequest {
  campaign_id: string;
  name: string;
  linkedin_url?: string;
  twitter_handle?: string;
  blog_url?: string;
  website_url?: string;
}

export interface CompetitorContentFilters {
  channel?: ChannelType;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  goal: CampaignGoal;
  status: CampaignStatus;
  channels: ChannelType[];
  start_date?: string;
  end_date?: string;
  frequency: Frequency;
  content_style: ContentStyle;
  topics: string[];
  config: CampaignConfig;
  workflow_ids: string[];
  stats: CampaignStats;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Brand store types
export interface TermEntry {
  term: string;
  replacement?: string;
}

export interface BrandStore {
  id: string;
  tenant_id: string;
  voice_examples_count: number;
  guidelines_count: number;
  terminology_count: number;
  corrections_count: number;
  health_score: number;
  strictness: number;
  auto_correct: boolean;
  approved_terms: string[];
  banned_terms: TermEntry[];
  last_trained_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BrandContext {
  voice_examples: string[];
  guidelines: string[];
  approved_terms: string[];
  banned_terms: TermEntry[];
  tone_guidelines: string;
}

export interface BrandIssue {
  type: 'terminology' | 'tone' | 'guideline' | 'length';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  position?: { start: number; end: number };
}

export interface BrandValidation {
  score: number;
  issues: BrandIssue[];
  auto_fixed: boolean;
  fixed_content?: string;
}

// Content generation types
export type ContentType = 'post' | 'article' | 'thread' | 'story';

export interface ContentRequest {
  campaign_id?: string;
  channel: ChannelType;
  content_type: ContentType;
  prompt: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  audience?: string;
  includes_cta?: boolean;
}

export interface GeneratedContent {
  id: string;
  content: string;
  channel: ChannelType;
  content_type: ContentType;
  brand_score: number;
  brand_validation: BrandValidation;
  character_count: number;
  created_at: string;
}

// Calendar types
export type CalendarEntryStatus = 'scheduled' | 'published' | 'failed' | 'cancelled';

export interface CalendarEntry {
  id: string;
  tenant_id: string;
  campaign_id?: string;
  content_id?: string;
  channel: ChannelType;
  scheduled_at: string;
  status: CalendarEntryStatus;
  content?: GeneratedContent;
  created_at: string;
}

// AI Recommendations
export interface AIRecommendation {
  type: 'channel' | 'frequency' | 'content_style' | 'timing' | 'topic';
  title: string;
  description: string;
  confidence: number;
  suggested_value: string | number;
}

// Request/Response types
export interface CreateCampaignRequest {
  name: string;
  description?: string;
  goal: CampaignGoal;
  channels: ChannelType[];
  frequency: Frequency;
  content_style: ContentStyle;
  topics?: string[];
  start_date?: string;
  end_date?: string;
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  config?: Partial<CampaignConfig>;
}

export interface RefineContentRequest {
  action: 'shorter' | 'longer' | 'formal' | 'casual' | 'add_cta' | 'remove_cta';
}

export interface ScheduleContentRequest {
  content_id: string;
  channel: ChannelType;
  scheduled_at: string;
}

// Analytics types
export interface CampaignAnalytics {
  campaign_id: string;
  impressions: number;
  engagement: number;
  clicks: number;
  conversions: number;
  by_channel: Record<ChannelType, ChannelMetrics>;
  top_content: ContentMetrics[];
  trend_data: TrendData[];
}

export interface ChannelMetrics {
  impressions: number;
  engagement_rate: number;
  clicks: number;
  posts_published: number;
}

export interface ChannelPerformance {
  channel: ChannelType;
  posts: number;
  impressions: number;
  engagement_rate: number;
  top_content: ContentMetrics[];
}

export interface ContentMetrics {
  content_id: string;
  title: string;
  channel: ChannelType;
  views: number;
  clicks: number;
  shares: number;
  comments: number;
  engagement_rate: number;
  published_at: string;
}

export interface TrendData {
  date: string;
  impressions: number;
  engagement: number;
  posts_published: number;
}

export interface AudienceData {
  channel: ChannelType;
  followers: number;
  growth_rate: number;
  demographics: {
    age_groups: Record<string, number>;
    locations: Record<string, number>;
    industries: Record<string, number>;
  };
}

export interface AnalyticsFilters {
  channels?: ChannelType[];
  start_date?: string;
  end_date?: string;
  content_style?: ContentStyle;
}

export interface TimeRange {
  start: string;
  end: string;
  period: '7d' | '30d' | '90d' | 'custom';
}

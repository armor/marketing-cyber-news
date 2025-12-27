/**
 * Newsletter Mock Factory
 * Creates mock data for newsletter configuration, segments, and issues testing
 */

import type {
  NewsletterConfiguration,
  Segment,
  NewsletterBlock,
  NewsletterIssue,
  ContentItem,
  ContentSource,
  IssuePreview,
} from '@/types/newsletter';

// Helper type to make properties mutable for factory creation
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

// ============================================================================
// Configuration Factory
// ============================================================================

export function createMockConfiguration(
  overrides?: Partial<NewsletterConfiguration>
): NewsletterConfiguration {
  const id = overrides?.id ?? `config-${generateId()}`;

  const defaultConfig: NewsletterConfiguration = {
    id,
    name: 'Weekly Security Digest',
    description: 'Weekly roundup of critical security news',
    segment_id: 'segment-001',
    cadence: 'weekly',
    send_day_of_week: 2,
    send_time_utc: '14:00',
    timezone: 'America/New_York',
    max_blocks: 6,
    education_ratio_min: 0.3,
    content_freshness_days: 7,
    hero_topic_priority: 'critical_vulnerabilities',
    framework_focus: 'NIST',
    subject_line_style: 'pain_first',
    max_metaphors: 2,
    banned_phrases: ['game-changer', 'synergy', 'paradigm shift'],
    approval_tier: 'tier1',
    risk_level: 'standard',
    ai_provider: 'anthropic',
    ai_model: 'claude-3-sonnet',
    prompt_version: 2,
    is_active: true,
    created_by: 'admin-001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { ...defaultConfig, ...overrides };
}

// ============================================================================
// Segment Factory
// ============================================================================

export function createMockSegment(
  overrides?: Partial<Segment>
): Segment {
  const id = overrides?.id ?? `segment-${generateId()}`;

  const defaultSegment: Segment = {
    id,
    name: 'Enterprise Security Teams',
    description: 'IT security professionals at enterprise organizations',
    role_cluster: 'security_operations',
    industries: ['Technology', 'Finance', 'Healthcare'],
    regions: ['North America', 'Europe'],
    company_size_bands: ['1000-5000', '5000+'],
    compliance_frameworks: ['SOC2', 'NIST', 'HIPAA'],
    partner_tags: [],
    min_engagement_score: 40,
    topic_interests: ['threat_intelligence', 'vulnerability_management', 'incident_response'],
    exclude_unsubscribed: true,
    exclude_bounced: true,
    exclude_high_touch: false,
    max_newsletters_per_30_days: 4,
    contact_count: 2847,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { ...defaultSegment, ...overrides };
}

// ============================================================================
// Content Block Factory
// ============================================================================

export function createMockBlock(
  overrides?: Partial<NewsletterBlock>
): NewsletterBlock {
  const id = overrides?.id ?? `block-${generateId()}`;

  const defaultBlock: NewsletterBlock = {
    id,
    issue_id: 'issue-001',
    block_type: 'news',
    position: 1,
    title: 'Latest Security Threats',
    subtitle: 'Critical vulnerabilities affecting your infrastructure',
    content: 'This week, three critical vulnerabilities have been disclosed affecting...',
    cta_text: 'Read More',
    cta_url: 'https://example.com/article',
    content_item_ids: ['content-001', 'content-002'],
    created_at: new Date().toISOString(),
  };

  return { ...defaultBlock, ...overrides };
}

// ============================================================================
// Newsletter Issue Factory
// ============================================================================

export function createMockIssue(
  overrides?: Partial<NewsletterIssue>
): NewsletterIssue {
  const id = overrides?.id ?? `issue-${generateId()}`;

  const defaultIssue: NewsletterIssue = {
    id,
    configuration_id: 'config-001',
    segment_id: 'segment-001',
    subject_lines: ['Your Weekly Security Update - Critical Alerts This Week'],
    subject_line: 'Your Weekly Security Update - Critical Alerts This Week',
    preview_text: 'Stay informed about the latest security threats and updates',
    status: 'draft',
    scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    blocks: [
      createMockBlock({ position: 1, block_type: 'hero' }),
      createMockBlock({ position: 2, block_type: 'news' }),
      createMockBlock({ position: 3, block_type: 'content' }),
    ],
    total_recipients: 0,
    total_sent: 0,
    total_delivered: 0,
    total_opened: 0,
    total_clicked: 0,
    unique_opens: 0,
    unique_clicks: 0,
    created_by: 'admin-001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { ...defaultIssue, ...overrides };
}

/**
 * Create mock issue with specific status
 */
export function createMockIssueWithStatus(
  status: NewsletterIssue['status'],
  overrides?: Partial<NewsletterIssue>
): NewsletterIssue {
  // If subject_line is provided but subject_lines is not, derive subject_lines from subject_line
  const processedOverrides = { ...overrides };
  if (overrides?.subject_line && !overrides?.subject_lines) {
    (processedOverrides as Mutable<Partial<NewsletterIssue>>).subject_lines = [overrides.subject_line];
  }

  const issue = createMockIssue(processedOverrides) as Mutable<NewsletterIssue>;

  issue.status = status;

  if (status === 'sent') {
    issue.sent_at = new Date().toISOString();
    issue.total_sent = 2847;
    issue.total_delivered = 2812;
    issue.total_opened = 1124;
    issue.total_clicked = 456;
    issue.unique_opens = 950;
    issue.unique_clicks = 380;
  }

  if (status === 'approved' || status === 'scheduled' || status === 'sent') {
    issue.approved_by = 'approver-001';
    issue.approved_at = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }

  // Handle draft issues with rejection_reason (from rejection flow)
  if (overrides?.rejection_reason) {
    issue.rejection_reason = overrides.rejection_reason;
  }

  return issue as NewsletterIssue;
}

// ============================================================================
// Content Source Factory
// ============================================================================

export function createMockContentSource(
  overrides?: Partial<ContentSource>
): ContentSource {
  const id = overrides?.id ?? `source-${generateId()}`;

  const defaultSource: ContentSource = {
    id,
    name: 'Security News RSS Feed',
    description: 'Daily security news and vulnerability reports',
    source_type: 'rss',
    url: 'https://example.com/security-feed.xml',
    fetch_frequency_hours: 6,
    is_active: true,
    last_synced_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    items_fetched: 142,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { ...defaultSource, ...overrides };
}

// ============================================================================
// Content Item Factory
// ============================================================================

export function createMockContentItem(
  overrides?: Partial<ContentItem>
): ContentItem {
  const id = overrides?.id ?? `content-${generateId()}`;

  const defaultItem: ContentItem = {
    id,
    source_id: 'source-001',
    title: 'Critical Vulnerability Discovered in Apache Struts',
    summary: 'A critical remote code execution vulnerability has been discovered affecting multiple versions',
    url: 'https://example.com/article',
    content_type: 'news',
    published_at: new Date().toISOString(),
    author: 'Security Team',
    topic_tags: ['vulnerability', 'apache', 'rce'],
    framework_tags: ['NIST', 'CWE-79'],
    sentiment_score: 0.3,
    relevance_score: 0.95,
    is_evergreen: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { ...defaultItem, ...overrides };
}

// ============================================================================
// Issue Preview Factory
// ============================================================================

export function createMockIssuePreview(
  overrides?: Partial<IssuePreview>
): IssuePreview {
  const defaultPreview: IssuePreview = {
    issue_id: 'issue-001',
    contact_id: 'contact-001',
    subject_line: 'Your Weekly Security Update - Critical Alerts This Week',
    preview_text: 'Stay informed about the latest security threats and updates',
    html_content: `
      <html>
        <body>
          <h1>Your Weekly Security Update</h1>
          <p>Critical vulnerabilities have been discovered this week.</p>
        </body>
      </html>
    `,
    personalization_tokens: {
      first_name: 'John',
      company: 'Acme Corp',
      industry: 'Technology',
    },
  };

  return { ...defaultPreview, ...overrides };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate random ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

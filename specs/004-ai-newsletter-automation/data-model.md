# Data Model: AI-Powered Newsletter Automation System

**Feature Branch**: `004-ai-newsletter-automation`
**Date**: 2025-12-17
**Spec**: [spec.md](./spec.md)

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           Newsletter System Data Model                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌───────────────────┐         ┌───────────────────┐         ┌───────────────────┐     │
│  │  newsletter_      │         │     segments      │         │     contacts      │     │
│  │  configurations   │1───────*│                   │1───────*│                   │     │
│  │                   │         │                   │         │                   │     │
│  └───────────────────┘         └───────────────────┘         └───────────────────┘     │
│           │                            │                             │                  │
│           │1                           │                             │                  │
│           │                            │                             │                  │
│           ▼*                           │                             │                  │
│  ┌───────────────────┐                 │                             │                  │
│  │  newsletter_      │                 │                             │                  │
│  │  issues           │*────────────────┘                             │                  │
│  │                   │                                               │                  │
│  └───────────────────┘                                               │                  │
│           │1                                                         │                  │
│           │                                                          │                  │
│           ▼*                                                         │                  │
│  ┌───────────────────┐         ┌───────────────────┐                │                  │
│  │  newsletter_      │*───────1│  content_items    │                │                  │
│  │  blocks           │         │                   │                │                  │
│  │                   │         │                   │                │                  │
│  └───────────────────┘         └───────────────────┘                │                  │
│           │                            │1                            │                  │
│           │                            │                             │                  │
│           │                            ▼*                            │                  │
│           │                   ┌───────────────────┐                 │                  │
│           │                   │  content_sources  │                 │                  │
│           │                   │                   │                 │                  │
│           │                   └───────────────────┘                 │                  │
│           │                                                          │                  │
│           │                   ┌───────────────────┐                 │                  │
│           └──────────────────*│  test_variants    │                 │                  │
│                               │                   │                 │                  │
│                               └───────────────────┘                 │                  │
│                                                                      │                  │
│  ┌───────────────────┐                                              │                  │
│  │  engagement_      │*─────────────────────────────────────────────┘                  │
│  │  events           │                                                                  │
│  │                   │                                                                  │
│  └───────────────────┘                                                                  │
│                                                                                         │
│  ┌───────────────────┐         ┌───────────────────┐                                   │
│  │  articles         │◄────────│  (existing)       │                                   │
│  │  (existing)       │         │  Used for Armor   │                                   │
│  │                   │         │  blog content     │                                   │
│  └───────────────────┘         └───────────────────┘                                   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Newsletter Configuration

### Table: `newsletter_configurations`

Global and segment-level settings controlling newsletter generation and delivery.

```sql
CREATE TABLE newsletter_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_id UUID REFERENCES segments(id),  -- NULL for global config

    -- Cadence Settings
    cadence VARCHAR(20) NOT NULL DEFAULT 'bi-weekly',  -- weekly, bi-weekly, monthly
    send_day_of_week INTEGER,  -- 0=Sunday, 1=Monday, etc.
    send_time_utc TIME,
    timezone VARCHAR(50) DEFAULT 'America/New_York',

    -- Content Mix Settings
    max_blocks INTEGER NOT NULL DEFAULT 6,
    education_ratio_min DECIMAL(3,2) NOT NULL DEFAULT 0.60,
    content_freshness_days INTEGER NOT NULL DEFAULT 45,
    hero_topic_priority VARCHAR(100),  -- e.g., "compliance_changes", "threat_intelligence"
    framework_focus VARCHAR(50),  -- e.g., "NERC_CIP", "SOC2", "HIPAA"

    -- Brand Voice Settings
    subject_line_style VARCHAR(50) DEFAULT 'pain_first',  -- pain_first, opportunity_first, visionary
    max_metaphors INTEGER DEFAULT 2,
    banned_phrases TEXT[],  -- Array of banned phrases

    -- Approval Settings
    approval_tier VARCHAR(10) NOT NULL DEFAULT 'tier1',  -- tier1 (auto), tier2 (human)
    risk_level VARCHAR(10) NOT NULL DEFAULT 'standard',  -- standard, high, experimental

    -- AI Provider Settings
    ai_provider VARCHAR(50) DEFAULT 'openai',
    ai_model VARCHAR(100) DEFAULT 'gpt-4',
    prompt_version INTEGER DEFAULT 1,

    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_newsletter_configs_segment ON newsletter_configurations(segment_id);
CREATE INDEX idx_newsletter_configs_active ON newsletter_configurations(is_active);
```

### Go Domain Type

```go
type NewsletterConfiguration struct {
    ID                  uuid.UUID         `json:"id"`
    Name                string            `json:"name"`
    Description         *string           `json:"description,omitempty"`
    SegmentID           *uuid.UUID        `json:"segment_id,omitempty"`

    // Cadence
    Cadence             CadenceType       `json:"cadence"`
    SendDayOfWeek       *int              `json:"send_day_of_week,omitempty"`
    SendTimeUTC         *time.Time        `json:"send_time_utc,omitempty"`
    Timezone            string            `json:"timezone"`

    // Content Mix
    MaxBlocks           int               `json:"max_blocks"`
    EducationRatioMin   float64           `json:"education_ratio_min"`
    ContentFreshnessDays int              `json:"content_freshness_days"`
    HeroTopicPriority   *string           `json:"hero_topic_priority,omitempty"`
    FrameworkFocus      *string           `json:"framework_focus,omitempty"`

    // Brand Voice
    SubjectLineStyle    SubjectLineStyle  `json:"subject_line_style"`
    MaxMetaphors        int               `json:"max_metaphors"`
    BannedPhrases       []string          `json:"banned_phrases"`

    // Approval
    ApprovalTier        ApprovalTier      `json:"approval_tier"`
    RiskLevel           RiskLevel         `json:"risk_level"`

    // AI Provider
    AIProvider          string            `json:"ai_provider"`
    AIModel             string            `json:"ai_model"`
    PromptVersion       int               `json:"prompt_version"`

    // Metadata
    IsActive            bool              `json:"is_active"`
    CreatedBy           uuid.UUID         `json:"created_by"`
    CreatedAt           time.Time         `json:"created_at"`
    UpdatedAt           time.Time         `json:"updated_at"`
}

type CadenceType string
const (
    CadenceWeekly    CadenceType = "weekly"
    CadenceBiWeekly  CadenceType = "bi-weekly"
    CadenceMonthly   CadenceType = "monthly"
)

type ApprovalTier string
const (
    TierOne ApprovalTier = "tier1"  // Auto-send after validation
    TierTwo ApprovalTier = "tier2"  // Human approval required
)

type RiskLevel string
const (
    RiskStandard     RiskLevel = "standard"
    RiskHigh         RiskLevel = "high"
    RiskExperimental RiskLevel = "experimental"
)
```

---

## 2. Segments

### Table: `segments`

Audience segment definitions based on role, industry, framework, and behavioral attributes.

```sql
CREATE TABLE segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Segmentation Criteria (stored as JSONB for flexibility)
    role_cluster VARCHAR(50),  -- security_leadership, security_ops, it_cloud, compliance_grc, partner
    industries TEXT[],  -- Array of industry codes
    regions TEXT[],  -- Array of region codes
    company_size_bands TEXT[],  -- Array: small, medium, enterprise
    compliance_frameworks TEXT[],  -- Array: NERC_CIP, SOC2, PCI_DSS, HIPAA, ISO27001, HITRUST
    partner_tags TEXT[],  -- Array: Microsoft, Oracle, etc.

    -- Behavioral Criteria
    min_engagement_score DECIMAL(5,2),
    topic_interests TEXT[],  -- Array of topic tags

    -- Exclusion Rules
    exclude_unsubscribed BOOLEAN NOT NULL DEFAULT true,
    exclude_bounced BOOLEAN NOT NULL DEFAULT true,
    exclude_high_touch BOOLEAN NOT NULL DEFAULT false,  -- Suppress strategic accounts

    -- Frequency Controls
    max_newsletters_per_30_days INTEGER DEFAULT 4,

    -- Metadata
    contact_count INTEGER DEFAULT 0,  -- Cached count
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_segments_active ON segments(is_active);
CREATE INDEX idx_segments_role_cluster ON segments(role_cluster);
```

### Go Domain Type

```go
type Segment struct {
    ID                    uuid.UUID  `json:"id"`
    Name                  string     `json:"name"`
    Description           *string    `json:"description,omitempty"`

    // Segmentation Criteria
    RoleCluster           *string    `json:"role_cluster,omitempty"`
    Industries            []string   `json:"industries"`
    Regions               []string   `json:"regions"`
    CompanySizeBands      []string   `json:"company_size_bands"`
    ComplianceFrameworks  []string   `json:"compliance_frameworks"`
    PartnerTags           []string   `json:"partner_tags"`

    // Behavioral
    MinEngagementScore    *float64   `json:"min_engagement_score,omitempty"`
    TopicInterests        []string   `json:"topic_interests"`

    // Exclusions
    ExcludeUnsubscribed   bool       `json:"exclude_unsubscribed"`
    ExcludeBounced        bool       `json:"exclude_bounced"`
    ExcludeHighTouch      bool       `json:"exclude_high_touch"`

    // Frequency
    MaxNewslettersPer30Days int      `json:"max_newsletters_per_30_days"`

    // Metadata
    ContactCount          int        `json:"contact_count"`
    IsActive              bool       `json:"is_active"`
    CreatedBy             uuid.UUID  `json:"created_by"`
    CreatedAt             time.Time  `json:"created_at"`
    UpdatedAt             time.Time  `json:"updated_at"`
}
```

---

## 3. Contacts

### Table: `contacts`

Individual recipients with firmographic and behavioral data.

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE,  -- CRM ID
    email VARCHAR(255) NOT NULL UNIQUE,

    -- Firmographic Data
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company VARCHAR(255),
    job_title VARCHAR(255),
    role_category VARCHAR(50),  -- CISO, SOC_Analyst, IT_Director, Compliance_Manager, etc.
    seniority_band VARCHAR(20),  -- C-level, VP, Director, Manager, Individual
    industry VARCHAR(100),
    region VARCHAR(50),
    company_size_band VARCHAR(20),  -- small, medium, enterprise

    -- Compliance/Framework
    primary_framework VARCHAR(50),  -- NERC_CIP, SOC2, etc.
    secondary_frameworks TEXT[],

    -- Partner Ecosystem
    partner_tags TEXT[],  -- Microsoft, Oracle, etc.

    -- Behavioral Data
    engagement_score DECIMAL(5,2) DEFAULT 0,
    last_10_interactions JSONB DEFAULT '[]',  -- Array of {type, topic, date}
    last_webinar_attendance TIMESTAMPTZ,
    topic_scores JSONB DEFAULT '{}',  -- {topic_name: score}

    -- Subscription Status
    is_subscribed BOOLEAN NOT NULL DEFAULT true,
    unsubscribed_at TIMESTAMPTZ,
    is_bounced BOOLEAN NOT NULL DEFAULT false,
    bounced_at TIMESTAMPTZ,
    is_high_touch BOOLEAN NOT NULL DEFAULT false,  -- Strategic account suppression

    -- Newsletter Tracking
    last_newsletter_sent TIMESTAMPTZ,
    newsletters_sent_30_days INTEGER DEFAULT 0,

    -- Segment Assignment
    primary_segment_id UUID REFERENCES segments(id),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_segment ON contacts(primary_segment_id);
CREATE INDEX idx_contacts_subscribed ON contacts(is_subscribed) WHERE is_subscribed = true;
CREATE INDEX idx_contacts_industry ON contacts(industry);
CREATE INDEX idx_contacts_role ON contacts(role_category);
CREATE INDEX idx_contacts_framework ON contacts(primary_framework);
```

### Go Domain Type

```go
type Contact struct {
    ID                    uuid.UUID   `json:"id"`
    ExternalID            *string     `json:"external_id,omitempty"`
    Email                 string      `json:"email"`

    // Firmographic
    FirstName             *string     `json:"first_name,omitempty"`
    LastName              *string     `json:"last_name,omitempty"`
    Company               *string     `json:"company,omitempty"`
    JobTitle              *string     `json:"job_title,omitempty"`
    RoleCategory          *string     `json:"role_category,omitempty"`
    SeniorityBand         *string     `json:"seniority_band,omitempty"`
    Industry              *string     `json:"industry,omitempty"`
    Region                *string     `json:"region,omitempty"`
    CompanySizeBand       *string     `json:"company_size_band,omitempty"`

    // Compliance
    PrimaryFramework      *string     `json:"primary_framework,omitempty"`
    SecondaryFrameworks   []string    `json:"secondary_frameworks"`

    // Partner
    PartnerTags           []string    `json:"partner_tags"`

    // Behavioral
    EngagementScore       float64     `json:"engagement_score"`
    Last10Interactions    []Interaction `json:"last_10_interactions"`
    LastWebinarAttendance *time.Time  `json:"last_webinar_attendance,omitempty"`
    TopicScores           map[string]float64 `json:"topic_scores"`

    // Subscription
    IsSubscribed          bool        `json:"is_subscribed"`
    UnsubscribedAt        *time.Time  `json:"unsubscribed_at,omitempty"`
    IsBounced             bool        `json:"is_bounced"`
    BouncedAt             *time.Time  `json:"bounced_at,omitempty"`
    IsHighTouch           bool        `json:"is_high_touch"`

    // Newsletter Tracking
    LastNewsletterSent    *time.Time  `json:"last_newsletter_sent,omitempty"`
    NewslettersSent30Days int         `json:"newsletters_sent_30_days"`

    // Segment
    PrimarySegmentID      *uuid.UUID  `json:"primary_segment_id,omitempty"`

    // Metadata
    CreatedAt             time.Time   `json:"created_at"`
    UpdatedAt             time.Time   `json:"updated_at"`
}

type Interaction struct {
    Type      string    `json:"type"`       // click, open, webinar
    Topic     string    `json:"topic"`
    Timestamp time.Time `json:"timestamp"`
}
```

---

## 4. Content Items

### Table: `content_items`

Ingested content from internal and external sources.

```sql
CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES content_sources(id),
    article_id UUID REFERENCES articles(id),  -- Link to existing Armor articles

    -- Content Data
    title VARCHAR(500) NOT NULL,
    url VARCHAR(2000) NOT NULL UNIQUE,
    summary TEXT,
    content TEXT,

    -- Classification
    content_type VARCHAR(50) NOT NULL,  -- blog, news, case_study, webinar, product_update
    topic_tags TEXT[] NOT NULL DEFAULT '{}',
    framework_tags TEXT[] DEFAULT '{}',
    industry_tags TEXT[] DEFAULT '{}',
    buyer_stage VARCHAR(20),  -- awareness, consideration, decision
    partner_tags TEXT[] DEFAULT '{}',

    -- Metadata
    author VARCHAR(255),
    publish_date TIMESTAMPTZ NOT NULL,
    word_count INTEGER,
    reading_time_minutes INTEGER,
    image_url VARCHAR(2000),

    -- Scoring
    trust_score DECIMAL(3,2) DEFAULT 1.0,  -- From source, 0.0-1.0
    relevance_score DECIMAL(5,2) DEFAULT 0,  -- Computed
    historical_ctr DECIMAL(5,4) DEFAULT 0,  -- Historical click-through rate
    historical_opens INTEGER DEFAULT 0,
    historical_clicks INTEGER DEFAULT 0,

    -- Freshness
    expires_at TIMESTAMPTZ,  -- Manual override for content expiry

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    indexed_at TIMESTAMPTZ,  -- ZincSearch indexing timestamp

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_items_source ON content_items(source_id);
CREATE INDEX idx_content_items_article ON content_items(article_id);
CREATE INDEX idx_content_items_publish ON content_items(publish_date DESC);
CREATE INDEX idx_content_items_type ON content_items(content_type);
CREATE INDEX idx_content_items_topics ON content_items USING GIN(topic_tags);
CREATE INDEX idx_content_items_frameworks ON content_items USING GIN(framework_tags);
CREATE INDEX idx_content_items_active ON content_items(is_active) WHERE is_active = true;
```

### Go Domain Type

```go
type ContentItem struct {
    ID                uuid.UUID   `json:"id"`
    SourceID          uuid.UUID   `json:"source_id"`
    ArticleID         *uuid.UUID  `json:"article_id,omitempty"`

    // Content
    Title             string      `json:"title"`
    URL               string      `json:"url"`
    Summary           *string     `json:"summary,omitempty"`
    Content           *string     `json:"content,omitempty"`

    // Classification
    ContentType       ContentType `json:"content_type"`
    TopicTags         []string    `json:"topic_tags"`
    FrameworkTags     []string    `json:"framework_tags"`
    IndustryTags      []string    `json:"industry_tags"`
    BuyerStage        *string     `json:"buyer_stage,omitempty"`
    PartnerTags       []string    `json:"partner_tags"`

    // Metadata
    Author            *string     `json:"author,omitempty"`
    PublishDate       time.Time   `json:"publish_date"`
    WordCount         *int        `json:"word_count,omitempty"`
    ReadingTimeMinutes *int       `json:"reading_time_minutes,omitempty"`
    ImageURL          *string     `json:"image_url,omitempty"`

    // Scoring
    TrustScore        float64     `json:"trust_score"`
    RelevanceScore    float64     `json:"relevance_score"`
    HistoricalCTR     float64     `json:"historical_ctr"`
    HistoricalOpens   int         `json:"historical_opens"`
    HistoricalClicks  int         `json:"historical_clicks"`

    // Freshness
    ExpiresAt         *time.Time  `json:"expires_at,omitempty"`

    // Status
    IsActive          bool        `json:"is_active"`
    IndexedAt         *time.Time  `json:"indexed_at,omitempty"`

    // Metadata
    CreatedAt         time.Time   `json:"created_at"`
    UpdatedAt         time.Time   `json:"updated_at"`
}

type ContentType string
const (
    ContentBlog          ContentType = "blog"
    ContentNews          ContentType = "news"
    ContentCaseStudy     ContentType = "case_study"
    ContentWebinar       ContentType = "webinar"
    ContentProductUpdate ContentType = "product_update"
    ContentEvent         ContentType = "event"
)
```

---

## 5. Content Sources

### Table: `content_sources`

Feed configurations for content ingestion.

```sql
CREATE TABLE content_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Source Configuration
    source_type VARCHAR(50) NOT NULL,  -- rss, api, manual
    feed_url VARCHAR(2000),
    api_config JSONB,  -- API-specific configuration

    -- Default Tags
    default_content_type VARCHAR(50),
    default_topic_tags TEXT[] DEFAULT '{}',
    default_framework_tags TEXT[] DEFAULT '{}',

    -- Trust Configuration
    trust_score DECIMAL(3,2) NOT NULL DEFAULT 0.80,  -- 0.0-1.0
    min_trust_threshold DECIMAL(3,2) DEFAULT 0.50,

    -- Freshness
    freshness_days INTEGER DEFAULT 45,

    -- Polling Configuration
    poll_interval_minutes INTEGER DEFAULT 60,
    last_polled_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_internal BOOLEAN NOT NULL DEFAULT false,  -- Armor-owned source

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_sources_active ON content_sources(is_active);
CREATE INDEX idx_content_sources_type ON content_sources(source_type);
```

### Go Domain Type

```go
type ContentSource struct {
    ID                  uuid.UUID   `json:"id"`
    Name                string      `json:"name"`
    Description         *string     `json:"description,omitempty"`

    // Configuration
    SourceType          SourceType  `json:"source_type"`
    FeedURL             *string     `json:"feed_url,omitempty"`
    APIConfig           map[string]interface{} `json:"api_config,omitempty"`

    // Default Tags
    DefaultContentType  *string     `json:"default_content_type,omitempty"`
    DefaultTopicTags    []string    `json:"default_topic_tags"`
    DefaultFrameworkTags []string   `json:"default_framework_tags"`

    // Trust
    TrustScore          float64     `json:"trust_score"`
    MinTrustThreshold   float64     `json:"min_trust_threshold"`

    // Freshness
    FreshnessDays       int         `json:"freshness_days"`

    // Polling
    PollIntervalMinutes int         `json:"poll_interval_minutes"`
    LastPolledAt        *time.Time  `json:"last_polled_at,omitempty"`
    LastSuccessAt       *time.Time  `json:"last_success_at,omitempty"`
    ErrorCount          int         `json:"error_count"`
    LastError           *string     `json:"last_error,omitempty"`

    // Status
    IsActive            bool        `json:"is_active"`
    IsInternal          bool        `json:"is_internal"`

    // Metadata
    CreatedBy           uuid.UUID   `json:"created_by"`
    CreatedAt           time.Time   `json:"created_at"`
    UpdatedAt           time.Time   `json:"updated_at"`
}

type SourceType string
const (
    SourceRSS    SourceType = "rss"
    SourceAPI    SourceType = "api"
    SourceManual SourceType = "manual"
)
```

---

## 6. Newsletter Issues

### Table: `newsletter_issues`

Generated newsletter instances.

```sql
CREATE TABLE newsletter_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id UUID NOT NULL REFERENCES newsletter_configurations(id),
    segment_id UUID NOT NULL REFERENCES segments(id),

    -- Issue Identification
    issue_number INTEGER NOT NULL,
    issue_date DATE NOT NULL,

    -- Generated Content
    subject_lines JSONB NOT NULL DEFAULT '[]',  -- Array of subject line variants
    selected_subject_line VARCHAR(255),
    preheader VARCHAR(200),
    intro_template TEXT,  -- Personalization template

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, pending_approval, approved, scheduled, sent, failed

    -- Approval
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMPTZ,

    -- Delivery
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    esp_campaign_id VARCHAR(255),  -- External ESP campaign ID

    -- Metrics (aggregated)
    total_recipients INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opens INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_bounces INTEGER DEFAULT 0,
    total_unsubscribes INTEGER DEFAULT 0,
    total_complaints INTEGER DEFAULT 0,

    -- Version Tracking
    version INTEGER NOT NULL DEFAULT 1,
    ai_model_used VARCHAR(100),
    prompt_version_used INTEGER,
    generation_metadata JSONB,  -- Config snapshot, timing, etc.

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_newsletter_issues_config ON newsletter_issues(configuration_id);
CREATE INDEX idx_newsletter_issues_segment ON newsletter_issues(segment_id);
CREATE INDEX idx_newsletter_issues_status ON newsletter_issues(status);
CREATE INDEX idx_newsletter_issues_scheduled ON newsletter_issues(scheduled_for);
CREATE UNIQUE INDEX idx_newsletter_issues_number ON newsletter_issues(configuration_id, issue_number);
```

### Go Domain Type

```go
type NewsletterIssue struct {
    ID                  uuid.UUID      `json:"id"`
    ConfigurationID     uuid.UUID      `json:"configuration_id"`
    SegmentID           uuid.UUID      `json:"segment_id"`

    // Identification
    IssueNumber         int            `json:"issue_number"`
    IssueDate           time.Time      `json:"issue_date"`

    // Content
    SubjectLines        []string       `json:"subject_lines"`
    SelectedSubjectLine *string        `json:"selected_subject_line,omitempty"`
    Preheader           *string        `json:"preheader,omitempty"`
    IntroTemplate       *string        `json:"intro_template,omitempty"`

    // Status
    Status              IssueStatus    `json:"status"`

    // Approval
    ApprovedBy          *uuid.UUID     `json:"approved_by,omitempty"`
    ApprovedAt          *time.Time     `json:"approved_at,omitempty"`
    RejectionReason     *string        `json:"rejection_reason,omitempty"`
    RejectedBy          *uuid.UUID     `json:"rejected_by,omitempty"`
    RejectedAt          *time.Time     `json:"rejected_at,omitempty"`

    // Delivery
    ScheduledFor        *time.Time     `json:"scheduled_for,omitempty"`
    SentAt              *time.Time     `json:"sent_at,omitempty"`
    ESPCampaignID       *string        `json:"esp_campaign_id,omitempty"`

    // Metrics
    TotalRecipients     int            `json:"total_recipients"`
    TotalDelivered      int            `json:"total_delivered"`
    TotalOpens          int            `json:"total_opens"`
    TotalClicks         int            `json:"total_clicks"`
    TotalBounces        int            `json:"total_bounces"`
    TotalUnsubscribes   int            `json:"total_unsubscribes"`
    TotalComplaints     int            `json:"total_complaints"`

    // Version
    Version             int            `json:"version"`
    AIModelUsed         *string        `json:"ai_model_used,omitempty"`
    PromptVersionUsed   *int           `json:"prompt_version_used,omitempty"`
    GenerationMetadata  map[string]interface{} `json:"generation_metadata,omitempty"`

    // Relationships
    Blocks              []NewsletterBlock `json:"blocks,omitempty"`

    // Metadata
    CreatedBy           *uuid.UUID     `json:"created_by,omitempty"`
    CreatedAt           time.Time      `json:"created_at"`
    UpdatedAt           time.Time      `json:"updated_at"`
}

type IssueStatus string
const (
    StatusDraft           IssueStatus = "draft"
    StatusPendingApproval IssueStatus = "pending_approval"
    StatusApproved        IssueStatus = "approved"
    StatusScheduled       IssueStatus = "scheduled"
    StatusSent            IssueStatus = "sent"
    StatusFailed          IssueStatus = "failed"
)
```

---

## 7. Newsletter Blocks

### Table: `newsletter_blocks`

Content blocks within newsletter issues.

```sql
CREATE TABLE newsletter_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,
    content_item_id UUID REFERENCES content_items(id),

    -- Block Configuration
    block_type VARCHAR(30) NOT NULL,  -- hero, news, content, events, spotlight
    position INTEGER NOT NULL,  -- Order within newsletter

    -- Generated Copy
    title VARCHAR(500),
    teaser TEXT,  -- 30-60 words
    cta_label VARCHAR(100),
    cta_url VARCHAR(2000),

    -- Categorization
    is_promotional BOOLEAN NOT NULL DEFAULT false,
    topic_tags TEXT[] DEFAULT '{}',

    -- Metrics
    clicks INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_newsletter_blocks_issue ON newsletter_blocks(issue_id);
CREATE INDEX idx_newsletter_blocks_content ON newsletter_blocks(content_item_id);
CREATE UNIQUE INDEX idx_newsletter_blocks_position ON newsletter_blocks(issue_id, position);
```

### Go Domain Type

```go
type NewsletterBlock struct {
    ID            uuid.UUID   `json:"id"`
    IssueID       uuid.UUID   `json:"issue_id"`
    ContentItemID *uuid.UUID  `json:"content_item_id,omitempty"`

    // Configuration
    BlockType     BlockType   `json:"block_type"`
    Position      int         `json:"position"`

    // Content
    Title         *string     `json:"title,omitempty"`
    Teaser        *string     `json:"teaser,omitempty"`
    CTALabel      *string     `json:"cta_label,omitempty"`
    CTAURL        *string     `json:"cta_url,omitempty"`

    // Categorization
    IsPromotional bool        `json:"is_promotional"`
    TopicTags     []string    `json:"topic_tags"`

    // Metrics
    Clicks        int         `json:"clicks"`

    // Relationships
    ContentItem   *ContentItem `json:"content_item,omitempty"`

    // Metadata
    CreatedAt     time.Time   `json:"created_at"`
    UpdatedAt     time.Time   `json:"updated_at"`
}

type BlockType string
const (
    BlockHero     BlockType = "hero"
    BlockNews     BlockType = "news"
    BlockContent  BlockType = "content"
    BlockEvents   BlockType = "events"
    BlockSpotlight BlockType = "spotlight"
)
```

---

## 8. Test Variants

### Table: `test_variants`

A/B test configurations and results.

```sql
CREATE TABLE test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,

    -- Test Configuration
    test_type VARCHAR(30) NOT NULL,  -- subject_line, hero_topic, cta_framing, send_time
    variant_name VARCHAR(100) NOT NULL,
    variant_value TEXT NOT NULL,  -- The actual variant content

    -- Assignment
    assigned_contacts INTEGER DEFAULT 0,
    assignment_percentage DECIMAL(5,2),  -- Percentage of segment

    -- Results
    opens INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    open_rate DECIMAL(5,4) DEFAULT 0,
    click_rate DECIMAL(5,4) DEFAULT 0,

    -- Winner Determination
    is_winner BOOLEAN DEFAULT false,
    winner_declared_at TIMESTAMPTZ,
    statistical_significance DECIMAL(5,4),  -- p-value

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_test_variants_issue ON test_variants(issue_id);
CREATE INDEX idx_test_variants_type ON test_variants(test_type);
CREATE INDEX idx_test_variants_winner ON test_variants(is_winner) WHERE is_winner = true;
```

### Go Domain Type

```go
type TestVariant struct {
    ID                     uuid.UUID   `json:"id"`
    IssueID                uuid.UUID   `json:"issue_id"`

    // Configuration
    TestType               TestType    `json:"test_type"`
    VariantName            string      `json:"variant_name"`
    VariantValue           string      `json:"variant_value"`

    // Assignment
    AssignedContacts       int         `json:"assigned_contacts"`
    AssignmentPercentage   *float64    `json:"assignment_percentage,omitempty"`

    // Results
    Opens                  int         `json:"opens"`
    Clicks                 int         `json:"clicks"`
    OpenRate               float64     `json:"open_rate"`
    ClickRate              float64     `json:"click_rate"`

    // Winner
    IsWinner               bool        `json:"is_winner"`
    WinnerDeclaredAt       *time.Time  `json:"winner_declared_at,omitempty"`
    StatisticalSignificance *float64   `json:"statistical_significance,omitempty"`

    // Metadata
    CreatedAt              time.Time   `json:"created_at"`
    UpdatedAt              time.Time   `json:"updated_at"`
}

type TestType string
const (
    TestSubjectLine TestType = "subject_line"
    TestHeroTopic   TestType = "hero_topic"
    TestCTAFraming  TestType = "cta_framing"
    TestSendTime    TestType = "send_time"
)
```

---

## 9. Engagement Events

### Table: `engagement_events`

Tracking clicks, opens, and other engagement.

```sql
CREATE TABLE engagement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    issue_id UUID NOT NULL REFERENCES newsletter_issues(id),
    block_id UUID REFERENCES newsletter_blocks(id),
    variant_id UUID REFERENCES test_variants(id),

    -- Event Data
    event_type VARCHAR(30) NOT NULL,  -- open, click, unsubscribe, bounce, complaint
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Click-specific
    clicked_url VARCHAR(2000),

    -- Attribution
    topic_tag VARCHAR(100),
    framework_tag VARCHAR(100),
    content_type VARCHAR(50),
    block_position INTEGER,

    -- UTM Tracking
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),

    -- Device/Client
    device_type VARCHAR(20),  -- desktop, mobile, tablet
    email_client VARCHAR(100),
    ip_address INET,
    user_agent TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_engagement_events_contact ON engagement_events(contact_id);
CREATE INDEX idx_engagement_events_issue ON engagement_events(issue_id);
CREATE INDEX idx_engagement_events_block ON engagement_events(block_id);
CREATE INDEX idx_engagement_events_type ON engagement_events(event_type);
CREATE INDEX idx_engagement_events_timestamp ON engagement_events(event_timestamp DESC);
CREATE INDEX idx_engagement_events_topic ON engagement_events(topic_tag);

-- Partitioning for large tables (optional)
-- CREATE TABLE engagement_events_2025_01 PARTITION OF engagement_events
--     FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Go Domain Type

```go
type EngagementEvent struct {
    ID              uuid.UUID   `json:"id"`
    ContactID       uuid.UUID   `json:"contact_id"`
    IssueID         uuid.UUID   `json:"issue_id"`
    BlockID         *uuid.UUID  `json:"block_id,omitempty"`
    VariantID       *uuid.UUID  `json:"variant_id,omitempty"`

    // Event
    EventType       EventType   `json:"event_type"`
    EventTimestamp  time.Time   `json:"event_timestamp"`

    // Click
    ClickedURL      *string     `json:"clicked_url,omitempty"`

    // Attribution
    TopicTag        *string     `json:"topic_tag,omitempty"`
    FrameworkTag    *string     `json:"framework_tag,omitempty"`
    ContentType     *string     `json:"content_type,omitempty"`
    BlockPosition   *int        `json:"block_position,omitempty"`

    // UTM
    UTMSource       *string     `json:"utm_source,omitempty"`
    UTMMedium       *string     `json:"utm_medium,omitempty"`
    UTMCampaign     *string     `json:"utm_campaign,omitempty"`
    UTMContent      *string     `json:"utm_content,omitempty"`

    // Device
    DeviceType      *string     `json:"device_type,omitempty"`
    EmailClient     *string     `json:"email_client,omitempty"`
    IPAddress       *string     `json:"ip_address,omitempty"`
    UserAgent       *string     `json:"user_agent,omitempty"`

    // Metadata
    CreatedAt       time.Time   `json:"created_at"`
}

type EventType string
const (
    EventOpen        EventType = "open"
    EventClick       EventType = "click"
    EventUnsubscribe EventType = "unsubscribe"
    EventBounce      EventType = "bounce"
    EventComplaint   EventType = "complaint"
)
```

---

## 10. Migration Scripts

### Up Migration: `000008_newsletter_system.up.sql`

```sql
-- Newsletter System Tables
-- Migration: 000008_newsletter_system

BEGIN;

-- 1. Content Sources (must be created first due to FK reference)
CREATE TABLE content_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_type VARCHAR(50) NOT NULL,
    feed_url VARCHAR(2000),
    api_config JSONB,
    default_content_type VARCHAR(50),
    default_topic_tags TEXT[] DEFAULT '{}',
    default_framework_tags TEXT[] DEFAULT '{}',
    trust_score DECIMAL(3,2) NOT NULL DEFAULT 0.80,
    min_trust_threshold DECIMAL(3,2) DEFAULT 0.50,
    freshness_days INTEGER DEFAULT 45,
    poll_interval_minutes INTEGER DEFAULT 60,
    last_polled_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Segments
CREATE TABLE segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    role_cluster VARCHAR(50),
    industries TEXT[],
    regions TEXT[],
    company_size_bands TEXT[],
    compliance_frameworks TEXT[],
    partner_tags TEXT[],
    min_engagement_score DECIMAL(5,2),
    topic_interests TEXT[],
    exclude_unsubscribed BOOLEAN NOT NULL DEFAULT true,
    exclude_bounced BOOLEAN NOT NULL DEFAULT true,
    exclude_high_touch BOOLEAN NOT NULL DEFAULT false,
    max_newsletters_per_30_days INTEGER DEFAULT 4,
    contact_count INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Contacts
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company VARCHAR(255),
    job_title VARCHAR(255),
    role_category VARCHAR(50),
    seniority_band VARCHAR(20),
    industry VARCHAR(100),
    region VARCHAR(50),
    company_size_band VARCHAR(20),
    primary_framework VARCHAR(50),
    secondary_frameworks TEXT[],
    partner_tags TEXT[],
    engagement_score DECIMAL(5,2) DEFAULT 0,
    last_10_interactions JSONB DEFAULT '[]',
    last_webinar_attendance TIMESTAMPTZ,
    topic_scores JSONB DEFAULT '{}',
    is_subscribed BOOLEAN NOT NULL DEFAULT true,
    unsubscribed_at TIMESTAMPTZ,
    is_bounced BOOLEAN NOT NULL DEFAULT false,
    bounced_at TIMESTAMPTZ,
    is_high_touch BOOLEAN NOT NULL DEFAULT false,
    last_newsletter_sent TIMESTAMPTZ,
    newsletters_sent_30_days INTEGER DEFAULT 0,
    primary_segment_id UUID REFERENCES segments(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Newsletter Configurations
CREATE TABLE newsletter_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_id UUID REFERENCES segments(id),
    cadence VARCHAR(20) NOT NULL DEFAULT 'bi-weekly',
    send_day_of_week INTEGER,
    send_time_utc TIME,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    max_blocks INTEGER NOT NULL DEFAULT 6,
    education_ratio_min DECIMAL(3,2) NOT NULL DEFAULT 0.60,
    content_freshness_days INTEGER NOT NULL DEFAULT 45,
    hero_topic_priority VARCHAR(100),
    framework_focus VARCHAR(50),
    subject_line_style VARCHAR(50) DEFAULT 'pain_first',
    max_metaphors INTEGER DEFAULT 2,
    banned_phrases TEXT[],
    approval_tier VARCHAR(10) NOT NULL DEFAULT 'tier1',
    risk_level VARCHAR(10) NOT NULL DEFAULT 'standard',
    ai_provider VARCHAR(50) DEFAULT 'openai',
    ai_model VARCHAR(100) DEFAULT 'gpt-4',
    prompt_version INTEGER DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Content Items
CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES content_sources(id),
    article_id UUID REFERENCES articles(id),
    title VARCHAR(500) NOT NULL,
    url VARCHAR(2000) NOT NULL UNIQUE,
    summary TEXT,
    content TEXT,
    content_type VARCHAR(50) NOT NULL,
    topic_tags TEXT[] NOT NULL DEFAULT '{}',
    framework_tags TEXT[] DEFAULT '{}',
    industry_tags TEXT[] DEFAULT '{}',
    buyer_stage VARCHAR(20),
    partner_tags TEXT[] DEFAULT '{}',
    author VARCHAR(255),
    publish_date TIMESTAMPTZ NOT NULL,
    word_count INTEGER,
    reading_time_minutes INTEGER,
    image_url VARCHAR(2000),
    trust_score DECIMAL(3,2) DEFAULT 1.0,
    relevance_score DECIMAL(5,2) DEFAULT 0,
    historical_ctr DECIMAL(5,4) DEFAULT 0,
    historical_opens INTEGER DEFAULT 0,
    historical_clicks INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    indexed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Newsletter Issues
CREATE TABLE newsletter_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id UUID NOT NULL REFERENCES newsletter_configurations(id),
    segment_id UUID NOT NULL REFERENCES segments(id),
    issue_number INTEGER NOT NULL,
    issue_date DATE NOT NULL,
    subject_lines JSONB NOT NULL DEFAULT '[]',
    selected_subject_line VARCHAR(255),
    preheader VARCHAR(200),
    intro_template TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    esp_campaign_id VARCHAR(255),
    total_recipients INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opens INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_bounces INTEGER DEFAULT 0,
    total_unsubscribes INTEGER DEFAULT 0,
    total_complaints INTEGER DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    ai_model_used VARCHAR(100),
    prompt_version_used INTEGER,
    generation_metadata JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Newsletter Blocks
CREATE TABLE newsletter_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,
    content_item_id UUID REFERENCES content_items(id),
    block_type VARCHAR(30) NOT NULL,
    position INTEGER NOT NULL,
    title VARCHAR(500),
    teaser TEXT,
    cta_label VARCHAR(100),
    cta_url VARCHAR(2000),
    is_promotional BOOLEAN NOT NULL DEFAULT false,
    topic_tags TEXT[] DEFAULT '{}',
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Test Variants
CREATE TABLE test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,
    test_type VARCHAR(30) NOT NULL,
    variant_name VARCHAR(100) NOT NULL,
    variant_value TEXT NOT NULL,
    assigned_contacts INTEGER DEFAULT 0,
    assignment_percentage DECIMAL(5,2),
    opens INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    open_rate DECIMAL(5,4) DEFAULT 0,
    click_rate DECIMAL(5,4) DEFAULT 0,
    is_winner BOOLEAN DEFAULT false,
    winner_declared_at TIMESTAMPTZ,
    statistical_significance DECIMAL(5,4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Engagement Events
CREATE TABLE engagement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    issue_id UUID NOT NULL REFERENCES newsletter_issues(id),
    block_id UUID REFERENCES newsletter_blocks(id),
    variant_id UUID REFERENCES test_variants(id),
    event_type VARCHAR(30) NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clicked_url VARCHAR(2000),
    topic_tag VARCHAR(100),
    framework_tag VARCHAR(100),
    content_type VARCHAR(50),
    block_position INTEGER,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    device_type VARCHAR(20),
    email_client VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX idx_content_sources_active ON content_sources(is_active);
CREATE INDEX idx_content_sources_type ON content_sources(source_type);

CREATE INDEX idx_segments_active ON segments(is_active);
CREATE INDEX idx_segments_role_cluster ON segments(role_cluster);

CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_segment ON contacts(primary_segment_id);
CREATE INDEX idx_contacts_subscribed ON contacts(is_subscribed) WHERE is_subscribed = true;
CREATE INDEX idx_contacts_industry ON contacts(industry);
CREATE INDEX idx_contacts_role ON contacts(role_category);
CREATE INDEX idx_contacts_framework ON contacts(primary_framework);

CREATE INDEX idx_newsletter_configs_segment ON newsletter_configurations(segment_id);
CREATE INDEX idx_newsletter_configs_active ON newsletter_configurations(is_active);

CREATE INDEX idx_content_items_source ON content_items(source_id);
CREATE INDEX idx_content_items_article ON content_items(article_id);
CREATE INDEX idx_content_items_publish ON content_items(publish_date DESC);
CREATE INDEX idx_content_items_type ON content_items(content_type);
CREATE INDEX idx_content_items_topics ON content_items USING GIN(topic_tags);
CREATE INDEX idx_content_items_frameworks ON content_items USING GIN(framework_tags);
CREATE INDEX idx_content_items_active ON content_items(is_active) WHERE is_active = true;

CREATE INDEX idx_newsletter_issues_config ON newsletter_issues(configuration_id);
CREATE INDEX idx_newsletter_issues_segment ON newsletter_issues(segment_id);
CREATE INDEX idx_newsletter_issues_status ON newsletter_issues(status);
CREATE INDEX idx_newsletter_issues_scheduled ON newsletter_issues(scheduled_for);
CREATE UNIQUE INDEX idx_newsletter_issues_number ON newsletter_issues(configuration_id, issue_number);

CREATE INDEX idx_newsletter_blocks_issue ON newsletter_blocks(issue_id);
CREATE INDEX idx_newsletter_blocks_content ON newsletter_blocks(content_item_id);
CREATE UNIQUE INDEX idx_newsletter_blocks_position ON newsletter_blocks(issue_id, position);

CREATE INDEX idx_test_variants_issue ON test_variants(issue_id);
CREATE INDEX idx_test_variants_type ON test_variants(test_type);
CREATE INDEX idx_test_variants_winner ON test_variants(is_winner) WHERE is_winner = true;

CREATE INDEX idx_engagement_events_contact ON engagement_events(contact_id);
CREATE INDEX idx_engagement_events_issue ON engagement_events(issue_id);
CREATE INDEX idx_engagement_events_block ON engagement_events(block_id);
CREATE INDEX idx_engagement_events_type ON engagement_events(event_type);
CREATE INDEX idx_engagement_events_timestamp ON engagement_events(event_timestamp DESC);
CREATE INDEX idx_engagement_events_topic ON engagement_events(topic_tag);

COMMIT;
```

### Down Migration: `000008_newsletter_system.down.sql`

```sql
-- Newsletter System Rollback
-- Migration: 000008_newsletter_system

BEGIN;

DROP TABLE IF EXISTS engagement_events CASCADE;
DROP TABLE IF EXISTS test_variants CASCADE;
DROP TABLE IF EXISTS newsletter_blocks CASCADE;
DROP TABLE IF EXISTS newsletter_issues CASCADE;
DROP TABLE IF EXISTS content_items CASCADE;
DROP TABLE IF EXISTS newsletter_configurations CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS segments CASCADE;
DROP TABLE IF EXISTS content_sources CASCADE;

COMMIT;
```

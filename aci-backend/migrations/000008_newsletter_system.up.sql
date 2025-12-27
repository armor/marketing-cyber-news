-- Migration 000008: AI-Powered Newsletter Automation System
-- Description: Complete schema for newsletter automation including content ingestion,
--              audience segmentation, AI-driven content curation, and engagement tracking
-- Author: Database Developer Agent
-- Date: 2025-12-17

-- ============================================================================
-- STEP 1: Create ENUM Types
-- ============================================================================

-- Content source type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_source_type') THEN
        CREATE TYPE content_source_type AS ENUM (
            'rss',
            'api',
            'manual'
        );
    END IF;
END$$;

-- Content type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type_enum') THEN
        CREATE TYPE content_type_enum AS ENUM (
            'blog',
            'news',
            'case_study',
            'webinar',
            'product_update',
            'event'
        );
    END IF;
END$$;

-- Cadence type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cadence_type') THEN
        CREATE TYPE cadence_type AS ENUM (
            'weekly',
            'bi_weekly',
            'monthly'
        );
    END IF;
END$$;

-- Subject line style enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subject_line_style') THEN
        CREATE TYPE subject_line_style AS ENUM (
            'pain_first',
            'opportunity_first',
            'visionary'
        );
    END IF;
END$$;

-- Approval tier enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_tier') THEN
        CREATE TYPE approval_tier AS ENUM (
            'tier1',
            'tier2'
        );
    END IF;
END$$;

-- Risk level enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
        CREATE TYPE risk_level AS ENUM (
            'standard',
            'high',
            'experimental'
        );
    END IF;
END$$;

-- Issue status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_status') THEN
        CREATE TYPE issue_status AS ENUM (
            'draft',
            'pending_approval',
            'approved',
            'scheduled',
            'sent',
            'failed'
        );
    END IF;
END$$;

-- Block type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'block_type') THEN
        CREATE TYPE block_type AS ENUM (
            'hero',
            'news',
            'content',
            'events',
            'spotlight'
        );
    END IF;
END$$;

-- Test type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_type') THEN
        CREATE TYPE test_type AS ENUM (
            'subject_line',
            'hero_topic',
            'cta_framing',
            'send_time'
        );
    END IF;
END$$;

-- Engagement event type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'engagement_event_type') THEN
        CREATE TYPE engagement_event_type AS ENUM (
            'sent',
            'delivered',
            'opened',
            'clicked',
            'bounced',
            'unsubscribed',
            'complained'
        );
    END IF;
END$$;

-- ============================================================================
-- STEP 2: Create content_sources table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Source Configuration
    source_type content_source_type NOT NULL,
    feed_url VARCHAR(2000),
    api_config JSONB DEFAULT '{}',

    -- Default Tags
    default_content_type VARCHAR(50),
    default_topic_tags TEXT[] DEFAULT '{}',
    default_framework_tags TEXT[] DEFAULT '{}',

    -- Trust Configuration
    trust_score DECIMAL(3,2) NOT NULL DEFAULT 0.80 CHECK (trust_score >= 0 AND trust_score <= 1),
    min_trust_threshold DECIMAL(3,2) DEFAULT 0.50 CHECK (min_trust_threshold >= 0 AND min_trust_threshold <= 1),

    -- Freshness
    freshness_days INTEGER DEFAULT 45 CHECK (freshness_days > 0),

    -- Polling Configuration
    poll_interval_minutes INTEGER DEFAULT 60 CHECK (poll_interval_minutes > 0),
    last_polled_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    error_count INTEGER DEFAULT 0 CHECK (error_count >= 0),
    last_error TEXT,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_internal BOOLEAN NOT NULL DEFAULT false,

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for content_sources
CREATE INDEX IF NOT EXISTS idx_content_sources_active ON content_sources(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_content_sources_type ON content_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_content_sources_internal ON content_sources(is_internal);

COMMENT ON TABLE content_sources IS 'Feed configurations for content ingestion from RSS, APIs, and manual sources';

-- ============================================================================
-- STEP 3: Create segments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Segmentation Criteria
    role_cluster VARCHAR(50),
    industries TEXT[] DEFAULT '{}',
    regions TEXT[] DEFAULT '{}',
    company_size_bands TEXT[] DEFAULT '{}',
    compliance_frameworks TEXT[] DEFAULT '{}',
    partner_tags TEXT[] DEFAULT '{}',

    -- Behavioral Criteria
    min_engagement_score DECIMAL(5,2) CHECK (min_engagement_score >= 0),
    topic_interests TEXT[] DEFAULT '{}',

    -- Exclusion Rules
    exclude_unsubscribed BOOLEAN NOT NULL DEFAULT true,
    exclude_bounced BOOLEAN NOT NULL DEFAULT true,
    exclude_high_touch BOOLEAN NOT NULL DEFAULT false,

    -- Frequency Controls
    max_newsletters_per_30_days INTEGER DEFAULT 4 CHECK (max_newsletters_per_30_days > 0),

    -- Metadata
    contact_count INTEGER DEFAULT 0 CHECK (contact_count >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for segments
CREATE INDEX IF NOT EXISTS idx_segments_active ON segments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_segments_role_cluster ON segments(role_cluster);
CREATE INDEX IF NOT EXISTS idx_segments_industries ON segments USING GIN(industries);
CREATE INDEX IF NOT EXISTS idx_segments_frameworks ON segments USING GIN(compliance_frameworks);

COMMENT ON TABLE segments IS 'Audience segment definitions based on role, industry, framework, and behavioral attributes';

-- ============================================================================
-- STEP 4: Create contacts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,

    -- Firmographic Data
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company VARCHAR(255),
    job_title VARCHAR(255),
    role_category VARCHAR(50),
    industry VARCHAR(100),
    region VARCHAR(50),
    company_size_band VARCHAR(20),

    -- Compliance/Framework
    compliance_frameworks TEXT[] DEFAULT '{}',
    primary_framework VARCHAR(50),

    -- Partner Ecosystem
    partner_tags TEXT[] DEFAULT '{}',

    -- Behavioral Data
    engagement_score DECIMAL(5,2) DEFAULT 0 CHECK (engagement_score >= 0),
    topic_preferences JSONB DEFAULT '{}',
    content_affinities JSONB DEFAULT '{}',

    -- Subscription Status
    is_subscribed BOOLEAN NOT NULL DEFAULT true,
    suppressed_at TIMESTAMPTZ,
    bounce_count INTEGER DEFAULT 0 CHECK (bounce_count >= 0),
    spam_complaint_at TIMESTAMPTZ,

    -- External Integration
    hubspot_contact_id VARCHAR(255),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_subscribed ON contacts(is_subscribed) WHERE is_subscribed = true;
CREATE INDEX IF NOT EXISTS idx_contacts_industry ON contacts(industry);
CREATE INDEX IF NOT EXISTS idx_contacts_role ON contacts(role_category);
CREATE INDEX IF NOT EXISTS idx_contacts_framework ON contacts(primary_framework);
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot ON contacts(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_engagement ON contacts(engagement_score DESC);

COMMENT ON TABLE contacts IS 'Individual recipients with firmographic and behavioral data';

-- ============================================================================
-- STEP 5: Create content_items table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES content_sources(id) ON DELETE RESTRICT,
    external_id VARCHAR(255),

    -- Content Data
    title VARCHAR(500) NOT NULL,
    url VARCHAR(2000) NOT NULL UNIQUE,
    summary TEXT,
    full_content TEXT,

    -- Classification
    content_type content_type_enum NOT NULL,
    topic_tags TEXT[] NOT NULL DEFAULT '{}',
    framework_tags TEXT[] DEFAULT '{}',
    industry_tags TEXT[] DEFAULT '{}',
    buyer_stage VARCHAR(20),

    -- Publication Metadata
    publish_date TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Scoring
    trust_score DECIMAL(3,2) DEFAULT 1.0 CHECK (trust_score >= 0 AND trust_score <= 1),
    relevance_score DECIMAL(3,2) DEFAULT 1.0 CHECK (relevance_score >= 0 AND relevance_score <= 1),
    historical_ctr DECIMAL(5,4) DEFAULT 0 CHECK (historical_ctr >= 0),

    -- Usage Tracking
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    last_used_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    zinc_indexed_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for content_items
CREATE INDEX IF NOT EXISTS idx_content_items_source ON content_items(source_id);
CREATE INDEX IF NOT EXISTS idx_content_items_external ON content_items(external_id);
CREATE INDEX IF NOT EXISTS idx_content_items_publish_date ON content_items(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(content_type);
CREATE INDEX IF NOT EXISTS idx_content_items_topics ON content_items USING GIN(topic_tags);
CREATE INDEX IF NOT EXISTS idx_content_items_frameworks ON content_items USING GIN(framework_tags);
CREATE INDEX IF NOT EXISTS idx_content_items_active ON content_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_content_items_usage ON content_items(usage_count DESC, last_used_at DESC NULLS LAST);

COMMENT ON TABLE content_items IS 'Ingested content from internal and external sources for newsletter curation';

-- ============================================================================
-- STEP 6: Create newsletter_configurations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS newsletter_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,

    -- Cadence Settings
    cadence cadence_type NOT NULL DEFAULT 'bi_weekly',
    send_day_of_week INTEGER CHECK (send_day_of_week >= 0 AND send_day_of_week <= 6),
    send_time_utc TIME,
    timezone VARCHAR(50) DEFAULT 'America/New_York',

    -- Content Mix Settings
    max_blocks INTEGER NOT NULL DEFAULT 6 CHECK (max_blocks > 0),
    education_ratio_min DECIMAL(3,2) NOT NULL DEFAULT 0.60 CHECK (education_ratio_min >= 0 AND education_ratio_min <= 1),
    content_freshness_days INTEGER NOT NULL DEFAULT 45 CHECK (content_freshness_days > 0),
    hero_topic_priority VARCHAR(100),
    framework_focus VARCHAR(50),

    -- Brand Voice Settings
    subject_line_style subject_line_style DEFAULT 'pain_first',
    max_metaphors INTEGER DEFAULT 2 CHECK (max_metaphors >= 0),
    banned_phrases TEXT[] DEFAULT '{}',

    -- Approval Settings
    approval_tier approval_tier NOT NULL DEFAULT 'tier1',
    risk_level risk_level NOT NULL DEFAULT 'standard',

    -- AI Provider Settings
    ai_provider VARCHAR(50) DEFAULT 'openai',
    ai_model VARCHAR(100) DEFAULT 'gpt-4',
    prompt_version INTEGER DEFAULT 1 CHECK (prompt_version > 0),

    -- ESP Settings
    esp_provider VARCHAR(50),
    esp_list_id VARCHAR(255),

    -- Schedule
    next_send_date TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for newsletter_configurations
CREATE INDEX IF NOT EXISTS idx_newsletter_configs_segment ON newsletter_configurations(segment_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_configs_active ON newsletter_configurations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_newsletter_configs_next_send ON newsletter_configurations(next_send_date) WHERE is_active = true;

COMMENT ON TABLE newsletter_configurations IS 'Global and segment-level settings controlling newsletter generation and delivery';

-- ============================================================================
-- STEP 7: Create newsletter_issues table
-- ============================================================================

CREATE TABLE IF NOT EXISTS newsletter_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id UUID NOT NULL REFERENCES newsletter_configurations(id) ON DELETE RESTRICT,
    segment_id UUID NOT NULL REFERENCES segments(id) ON DELETE RESTRICT,

    -- Issue Identification
    issue_number INTEGER NOT NULL,
    issue_date DATE NOT NULL,

    -- Generated Content
    subject_lines JSONB NOT NULL DEFAULT '[]',
    selected_subject_line VARCHAR(255),
    preheader VARCHAR(200),
    intro_template TEXT,
    html_content TEXT,

    -- Status
    status issue_status NOT NULL DEFAULT 'draft',

    -- Approval
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    rejection_reason TEXT,

    -- Delivery
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0 CHECK (total_recipients >= 0),
    total_delivered INTEGER DEFAULT 0 CHECK (total_delivered >= 0),
    total_opens INTEGER DEFAULT 0 CHECK (total_opens >= 0),
    total_clicks INTEGER DEFAULT 0 CHECK (total_clicks >= 0),
    total_unsubscribes INTEGER DEFAULT 0 CHECK (total_unsubscribes >= 0),
    total_bounces INTEGER DEFAULT 0 CHECK (total_bounces >= 0),

    -- ESP Integration
    esp_campaign_id VARCHAR(255),

    -- Version Tracking
    generation_metadata JSONB DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for newsletter_issues
CREATE INDEX IF NOT EXISTS idx_newsletter_issues_config ON newsletter_issues(configuration_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_issues_segment ON newsletter_issues(segment_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_issues_status ON newsletter_issues(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_issues_scheduled ON newsletter_issues(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_newsletter_issues_date ON newsletter_issues(issue_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_issues_number ON newsletter_issues(configuration_id, issue_number);

COMMENT ON TABLE newsletter_issues IS 'Generated newsletter instances with approval workflow and delivery tracking';

-- ============================================================================
-- STEP 8: Create newsletter_blocks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS newsletter_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,
    content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,

    -- Block Configuration
    block_type block_type NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),

    -- Generated Copy
    title VARCHAR(500),
    teaser TEXT,
    cta_label VARCHAR(100),
    cta_url VARCHAR(2000),

    -- Categorization
    is_promotional BOOLEAN NOT NULL DEFAULT false,
    topic_tags TEXT[] DEFAULT '{}',

    -- A/B Testing
    variant_id UUID,

    -- Metrics
    clicks INTEGER DEFAULT 0 CHECK (clicks >= 0),
    impressions INTEGER DEFAULT 0 CHECK (impressions >= 0),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_issue_position UNIQUE (issue_id, position)
);

-- Indexes for newsletter_blocks
CREATE INDEX IF NOT EXISTS idx_newsletter_blocks_issue ON newsletter_blocks(issue_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_blocks_content ON newsletter_blocks(content_item_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_blocks_type ON newsletter_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_newsletter_blocks_variant ON newsletter_blocks(variant_id);

COMMENT ON TABLE newsletter_blocks IS 'Content blocks within newsletter issues with position and engagement tracking';

-- ============================================================================
-- STEP 9: Create test_variants table
-- ============================================================================

CREATE TABLE IF NOT EXISTS test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,

    -- Test Configuration
    test_type test_type NOT NULL,
    variant_name VARCHAR(100) NOT NULL,
    variant_value TEXT NOT NULL,

    -- Assignment
    assigned_contacts INTEGER DEFAULT 0 CHECK (assigned_contacts >= 0),

    -- Metrics
    opens INTEGER DEFAULT 0 CHECK (opens >= 0),
    clicks INTEGER DEFAULT 0 CHECK (clicks >= 0),
    open_rate DECIMAL(5,4) DEFAULT 0 CHECK (open_rate >= 0 AND open_rate <= 1),
    click_rate DECIMAL(5,4) DEFAULT 0 CHECK (click_rate >= 0 AND click_rate <= 1),

    -- Results
    is_winner BOOLEAN DEFAULT false,
    statistical_significance DECIMAL(5,4),
    winner_declared_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_test_variant UNIQUE (issue_id, test_type, variant_name)
);

-- Indexes for test_variants
CREATE INDEX IF NOT EXISTS idx_test_variants_issue ON test_variants(issue_id);
CREATE INDEX IF NOT EXISTS idx_test_variants_type ON test_variants(test_type);
CREATE INDEX IF NOT EXISTS idx_test_variants_winner ON test_variants(is_winner) WHERE is_winner = true;

COMMENT ON TABLE test_variants IS 'A/B test variants for subject lines, hero topics, CTAs, and send times';

-- ============================================================================
-- STEP 10: Create engagement_events table
-- ============================================================================

CREATE TABLE IF NOT EXISTS engagement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,
    block_id UUID REFERENCES newsletter_blocks(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES test_variants(id) ON DELETE SET NULL,

    -- Event Data
    event_type engagement_event_type NOT NULL,
    url VARCHAR(2000),

    -- UTM Tracking
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),

    -- Event Metadata
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for engagement_events
CREATE INDEX IF NOT EXISTS idx_engagement_events_contact ON engagement_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_engagement_events_issue ON engagement_events(issue_id);
CREATE INDEX IF NOT EXISTS idx_engagement_events_block ON engagement_events(block_id);
CREATE INDEX IF NOT EXISTS idx_engagement_events_variant ON engagement_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_engagement_events_type ON engagement_events(event_type);
CREATE INDEX IF NOT EXISTS idx_engagement_events_timestamp ON engagement_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_contact_timestamp ON engagement_events(contact_id, event_timestamp DESC);

COMMENT ON TABLE engagement_events IS 'Granular tracking of all newsletter engagement events (opens, clicks, bounces, etc.)';

-- ============================================================================
-- STEP 11: Create contact_segment_membership junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_segment_membership (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    segment_id UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE,

    -- Membership metadata
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_primary BOOLEAN DEFAULT false,

    PRIMARY KEY (contact_id, segment_id)
);

-- Indexes for contact_segment_membership
CREATE INDEX IF NOT EXISTS idx_contact_segment_contact ON contact_segment_membership(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_segment_segment ON contact_segment_membership(segment_id);
CREATE INDEX IF NOT EXISTS idx_contact_segment_primary ON contact_segment_membership(contact_id, is_primary) WHERE is_primary = true;

COMMENT ON TABLE contact_segment_membership IS 'Junction table linking contacts to multiple segments';

-- ============================================================================
-- STEP 12: Create triggers for automatic timestamp updates
-- ============================================================================

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT t.table_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
          AND c.column_name = 'updated_at'
          AND t.table_name IN (
              'content_sources',
              'segments',
              'contacts',
              'content_items',
              'newsletter_configurations',
              'newsletter_issues',
              'newsletter_blocks',
              'test_variants'
          )
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END$$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON SCHEMA public IS 'Newsletter Automation System - Migration 000008 applied successfully';

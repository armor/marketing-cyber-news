-- =============================================================================
-- ACI (Armor Cyber Intelligence) Database Schema
-- PostgreSQL 18+ with pgvector 0.8.1 extension
-- Last Updated: December 2025
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE severity_level AS ENUM ('critical', 'high', 'medium', 'low', 'informational');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'needs_review');
CREATE TYPE alert_type AS ENUM ('category', 'keyword', 'vendor', 'cve', 'severity', 'threat_actor');
CREATE TYPE delivery_method AS ENUM ('email', 'websocket', 'both');
CREATE TYPE source_type AS ENUM ('government', 'vendor', 'research', 'news', 'blog');
CREATE TYPE threat_type AS ENUM ('malware', 'ransomware', 'phishing', 'vulnerability', 'data_breach', 'apt', 'ddos', 'insider_threat', 'supply_chain', 'other');
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- =============================================================================
-- USERS & AUTHENTICATION
-- =============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    company VARCHAR(200),
    avatar_url VARCHAR(500),
    armor_customer_id VARCHAR(100),
    role user_role DEFAULT 'user',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_armor_customer ON users(armor_customer_id) WHERE armor_customer_id IS NOT NULL;

-- Refresh tokens for JWT rotation
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    user_agent VARCHAR(500),
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    notification_frequency VARCHAR(20) DEFAULT 'daily' CHECK (notification_frequency IN ('realtime', 'daily', 'weekly')),
    preferred_categories TEXT[] DEFAULT '{}',
    severity_threshold severity_level DEFAULT 'medium',
    timezone VARCHAR(50) DEFAULT 'UTC',
    digest_time TIME DEFAULT '09:00:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- =============================================================================
-- CONTENT SOURCES
-- =============================================================================

-- Sources table (cybersecurity news sources)
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    url VARCHAR(500) NOT NULL,
    logo_url VARCHAR(500),
    source_type source_type DEFAULT 'news',
    reliability_score DECIMAL(3,2) DEFAULT 0.80 CHECK (reliability_score >= 0 AND reliability_score <= 1),
    is_competitor BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    scrape_frequency_hours INTEGER DEFAULT 1,
    last_scraped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sources_active ON sources(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_sources_type ON sources(source_type);

-- =============================================================================
-- CATEGORIES
-- =============================================================================

-- Categories table (cybersecurity-specific)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = TRUE;

-- Insert default cybersecurity categories
INSERT INTO categories (name, slug, description, icon, color, display_order) VALUES
    ('Data Breaches', 'data-breaches', 'Data breach incidents and exposures affecting organizations', 'shield-off', '#DC2626', 1),
    ('Vulnerabilities', 'vulnerabilities', 'Security vulnerabilities, CVEs, and patch information', 'bug', '#EA580C', 2),
    ('Threat Intelligence', 'threat-intelligence', 'Threat actor activity, campaigns, and TTPs', 'target', '#D97706', 3),
    ('Ransomware', 'ransomware', 'Ransomware attacks, variants, and prevention', 'lock', '#CA8A04', 4),
    ('Compliance', 'compliance', 'Regulatory updates, compliance requirements, and standards', 'clipboard-check', '#65A30D', 5),
    ('Cloud Security', 'cloud-security', 'Cloud platform security issues and misconfigurations', 'cloud', '#0891B2', 6),
    ('Identity & Access', 'identity-access', 'IAM, authentication, and access control security', 'user-check', '#7C3AED', 7),
    ('Incident Reports', 'incident-reports', 'Security incident analyses and post-mortems', 'file-warning', '#DB2777', 8)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- ARTICLES
-- =============================================================================

-- Articles table
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT,

    -- Classification
    category_id UUID NOT NULL REFERENCES categories(id),
    severity severity_level DEFAULT 'medium',
    tags TEXT[] DEFAULT '{}',

    -- Source information
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    source_url VARCHAR(1000),

    -- Security-specific fields
    related_cves TEXT[] DEFAULT '{}',
    mitre_attack_ids TEXT[] DEFAULT '{}',
    affected_vendors TEXT[] DEFAULT '{}',
    threat_actors TEXT[] DEFAULT '{}',

    -- AI enrichment
    ai_analysis JSONB DEFAULT '{}',
    threat_type threat_type,

    -- Armor.com integration
    armor_relevance DECIMAL(3,2) DEFAULT 0.50 CHECK (armor_relevance >= 0 AND armor_relevance <= 1),
    armor_cta_type VARCHAR(50),
    armor_cta_url VARCHAR(500),

    -- Content filtering
    competitor_score DECIMAL(3,2) DEFAULT 0.00 CHECK (competitor_score >= 0 AND competitor_score <= 1),
    is_competitor_favorable BOOLEAN DEFAULT FALSE,

    -- Review & publishing
    review_status review_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,

    -- Metadata
    reading_time_minutes INTEGER,
    view_count INTEGER DEFAULT 0,

    -- Vector embedding for semantic search (1536 dimensions for OpenAI embeddings)
    embedding vector(1536),

    -- Timestamps
    published_at TIMESTAMPTZ DEFAULT NOW(),
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for articles
CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_severity ON articles(severity);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_status ON articles(review_status);
CREATE INDEX idx_articles_published ON articles(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX idx_articles_cves ON articles USING GIN(related_cves);
CREATE INDEX idx_articles_vendors ON articles USING GIN(affected_vendors);
CREATE INDEX idx_articles_threat_actors ON articles USING GIN(threat_actors);

-- Full-text search index
CREATE INDEX idx_articles_search ON articles USING GIN(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, ''))
);

-- Vector similarity search index (HNSW for better query performance - pgvector 0.8+)
-- HNSW provides better speed-recall tradeoff than IVFFlat
CREATE INDEX idx_articles_embedding ON articles USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Composite indexes for common queries
CREATE INDEX idx_articles_category_severity ON articles(category_id, severity);
CREATE INDEX idx_articles_published_severity ON articles(published_at DESC, severity) WHERE is_published = TRUE;

-- =============================================================================
-- USER INTERACTIONS
-- =============================================================================

-- Bookmarks
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_article ON bookmarks(article_id);

-- Article read history
CREATE TABLE article_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    read_duration_seconds INTEGER,
    UNIQUE(user_id, article_id)
);

CREATE INDEX idx_article_reads_user ON article_reads(user_id);
CREATE INDEX idx_article_reads_article ON article_reads(article_id);

-- =============================================================================
-- ALERTS
-- =============================================================================

-- Alert subscriptions
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    type alert_type NOT NULL,
    value VARCHAR(200) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    delivery_method delivery_method DEFAULT 'both',
    match_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, type, value)
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_type_value ON alerts(type, value);
CREATE INDEX idx_alerts_enabled ON alerts(enabled) WHERE enabled = TRUE;

-- Alert history (for tracking matches)
CREATE TABLE alert_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMPTZ
);

CREATE INDEX idx_alert_matches_alert ON alert_matches(alert_id);
CREATE INDEX idx_alert_matches_article ON alert_matches(article_id);

-- =============================================================================
-- N8N INTEGRATION
-- =============================================================================

-- Webhook logs for n8n integration
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    error_message TEXT,
    articles_created INTEGER DEFAULT 0,
    articles_updated INTEGER DEFAULT 0,
    workflow_id VARCHAR(100),
    execution_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_workflow ON webhook_logs(workflow_id);

-- =============================================================================
-- AUDIT & ANALYTICS
-- =============================================================================

-- Audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Daily statistics (materialized for dashboard performance)
CREATE TABLE daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    total_articles INTEGER DEFAULT 0,
    articles_by_severity JSONB DEFAULT '{}',
    articles_by_category JSONB DEFAULT '{}',
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    unique_cves INTEGER DEFAULT 0,
    unique_vendors INTEGER DEFAULT 0,
    top_vendors JSONB DEFAULT '[]',
    top_threat_actors JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_stats_date ON daily_stats(date DESC);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for full-text search
CREATE OR REPLACE FUNCTION search_articles(
    search_query TEXT,
    category_filter TEXT DEFAULT NULL,
    severity_filter severity_level DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title VARCHAR,
    slug VARCHAR,
    summary TEXT,
    category_slug VARCHAR,
    severity severity_level,
    published_at TIMESTAMPTZ,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.title,
        a.slug,
        a.summary,
        c.slug as category_slug,
        a.severity,
        a.published_at,
        ts_rank(
            to_tsvector('english', coalesce(a.title, '') || ' ' || coalesce(a.summary, '') || ' ' || coalesce(a.content, '')),
            plainto_tsquery('english', search_query)
        ) as rank
    FROM articles a
    JOIN categories c ON a.category_id = c.id
    WHERE a.is_published = TRUE
    AND (category_filter IS NULL OR c.slug = category_filter)
    AND (severity_filter IS NULL OR a.severity = severity_filter)
    AND to_tsvector('english', coalesce(a.title, '') || ' ' || coalesce(a.summary, '') || ' ' || coalesce(a.content, ''))
        @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC, a.published_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function for semantic search using vector similarity
CREATE OR REPLACE FUNCTION semantic_search_articles(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INTEGER DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    title VARCHAR,
    slug VARCHAR,
    summary TEXT,
    severity severity_level,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.title,
        a.slug,
        a.summary,
        a.severity,
        1 - (a.embedding <=> query_embedding) as similarity
    FROM articles a
    WHERE a.is_published = TRUE
    AND a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
    ORDER BY a.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily stats
CREATE OR REPLACE FUNCTION update_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    stats_record RECORD;
BEGIN
    SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        jsonb_object_agg(severity, cnt) as by_severity,
        COUNT(DISTINCT unnest_cves) as unique_cves
    INTO stats_record
    FROM articles a
    LEFT JOIN LATERAL unnest(related_cves) as unnest_cves ON true
    WHERE DATE(published_at) = target_date
    AND is_published = TRUE
    GROUP BY DATE(published_at);

    INSERT INTO daily_stats (date, total_articles, critical_count, high_count, articles_by_severity, unique_cves)
    VALUES (target_date, COALESCE(stats_record.total, 0), COALESCE(stats_record.critical, 0),
            COALESCE(stats_record.high, 0), COALESCE(stats_record.by_severity, '{}'),
            COALESCE(stats_record.unique_cves, 0))
    ON CONFLICT (date) DO UPDATE SET
        total_articles = EXCLUDED.total_articles,
        critical_count = EXCLUDED.critical_count,
        high_count = EXCLUDED.high_count,
        articles_by_severity = EXCLUDED.articles_by_severity,
        unique_cves = EXCLUDED.unique_cves;
END;
$$ LANGUAGE plpgsql;

-- Function to check alerts for new article
CREATE OR REPLACE FUNCTION check_article_alerts(article_id UUID)
RETURNS INTEGER AS $$
DECLARE
    article_record RECORD;
    alert_record RECORD;
    match_count INTEGER := 0;
BEGIN
    -- Get article details
    SELECT a.*, c.slug as category_slug
    INTO article_record
    FROM articles a
    JOIN categories c ON a.category_id = c.id
    WHERE a.id = article_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Check all enabled alerts
    FOR alert_record IN
        SELECT * FROM alerts WHERE enabled = TRUE
    LOOP
        -- Check if alert matches
        IF (alert_record.type = 'category' AND alert_record.value = article_record.category_slug) OR
           (alert_record.type = 'severity' AND alert_record.value = article_record.severity::TEXT) OR
           (alert_record.type = 'vendor' AND alert_record.value = ANY(article_record.affected_vendors)) OR
           (alert_record.type = 'cve' AND alert_record.value = ANY(article_record.related_cves)) OR
           (alert_record.type = 'threat_actor' AND alert_record.value = ANY(article_record.threat_actors)) OR
           (alert_record.type = 'keyword' AND (
               article_record.title ILIKE '%' || alert_record.value || '%' OR
               article_record.summary ILIKE '%' || alert_record.value || '%'
           ))
        THEN
            -- Create alert match
            INSERT INTO alert_matches (alert_id, article_id)
            VALUES (alert_record.id, article_id)
            ON CONFLICT DO NOTHING;

            -- Update alert stats
            UPDATE alerts
            SET match_count = match_count + 1, last_triggered_at = NOW()
            WHERE id = alert_record.id;

            match_count := match_count + 1;
        END IF;
    END LOOP;

    RETURN match_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check alerts on new article
CREATE OR REPLACE FUNCTION trigger_check_alerts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_published = TRUE AND (OLD IS NULL OR OLD.is_published = FALSE) THEN
        PERFORM check_article_alerts(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_check_alerts
    AFTER INSERT OR UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION trigger_check_alerts();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for articles with category info
CREATE VIEW articles_with_category AS
SELECT
    a.*,
    c.name as category_name,
    c.slug as category_slug,
    c.icon as category_icon,
    c.color as category_color,
    s.name as source_name,
    s.logo_url as source_logo_url,
    s.reliability_score as source_reliability
FROM articles a
JOIN categories c ON a.category_id = c.id
LEFT JOIN sources s ON a.source_id = s.id;

-- View for dashboard statistics
CREATE VIEW dashboard_stats AS
SELECT
    COUNT(*) as total_articles,
    COUNT(*) FILTER (WHERE DATE(published_at) = CURRENT_DATE) as articles_today,
    COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '7 days') as articles_this_week,
    COUNT(*) FILTER (WHERE severity = 'critical' AND DATE(published_at) = CURRENT_DATE) as critical_today,
    jsonb_object_agg(severity, severity_count) as severity_breakdown
FROM articles a
CROSS JOIN LATERAL (
    SELECT severity, COUNT(*) as severity_count
    FROM articles
    WHERE is_published = TRUE
    GROUP BY severity
) s
WHERE a.is_published = TRUE;

-- =============================================================================
-- SEED DATA: Sources
-- =============================================================================

INSERT INTO sources (name, url, source_type, reliability_score, is_competitor) VALUES
    ('CISA', 'https://www.cisa.gov', 'government', 1.00, FALSE),
    ('NIST NVD', 'https://nvd.nist.gov', 'government', 1.00, FALSE),
    ('US-CERT', 'https://www.us-cert.gov', 'government', 1.00, FALSE),
    ('Krebs on Security', 'https://krebsonsecurity.com', 'blog', 0.95, FALSE),
    ('Bleeping Computer', 'https://www.bleepingcomputer.com', 'news', 0.90, FALSE),
    ('The Hacker News', 'https://thehackernews.com', 'news', 0.85, FALSE),
    ('Dark Reading', 'https://www.darkreading.com', 'news', 0.85, FALSE),
    ('SecurityWeek', 'https://www.securityweek.com', 'news', 0.85, FALSE),
    ('Threatpost', 'https://threatpost.com', 'news', 0.80, FALSE),
    ('SC Magazine', 'https://www.scmagazine.com', 'news', 0.80, FALSE)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE articles IS 'Cybersecurity news articles with AI enrichment and Armor.com integration';
COMMENT ON COLUMN articles.armor_relevance IS 'Score 0-1 indicating relevance to Armor.com services';
COMMENT ON COLUMN articles.competitor_score IS 'Score 0-1 indicating how favorable content is to competitors';
COMMENT ON COLUMN articles.embedding IS 'Vector embedding for semantic search (1536 dims for OpenAI)';
COMMENT ON TABLE alerts IS 'User alert subscriptions for real-time notifications';
COMMENT ON TABLE webhook_logs IS 'Audit log for n8n webhook integrations';

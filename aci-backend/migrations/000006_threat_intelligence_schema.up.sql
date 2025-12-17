-- Migration 000006: Enhanced Threat Intelligence Schema
-- Description: Deep dive analysis, external references, industries, recommendations, and user subscription tiers
-- Author: Database Developer Agent
-- Date: 2025-12-15

-- ============================================================================
-- 1. USER SUBSCRIPTION TIER
-- ============================================================================

-- Add subscription tier column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free';

-- Add check constraint for valid subscription tiers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_subscription_tier'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT check_subscription_tier
        CHECK (subscription_tier IN ('free', 'premium', 'enterprise'));
    END IF;
END $$;

-- Create index for faster subscription tier queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

-- ============================================================================
-- 2. EXTERNAL REFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS article_external_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_article_external_refs_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT chk_external_ref_title_not_empty CHECK (LENGTH(title) >= 1),
    CONSTRAINT chk_external_ref_url_not_empty CHECK (LENGTH(url) >= 1),
    CONSTRAINT chk_external_ref_source_not_empty CHECK (LENGTH(source) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_article_external_refs_article_id ON article_external_references(article_id);
CREATE INDEX IF NOT EXISTS idx_article_external_refs_source ON article_external_references(source);
CREATE INDEX IF NOT EXISTS idx_article_external_refs_published_at ON article_external_references(published_at DESC);

-- ============================================================================
-- 3. INDUSTRIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS article_industries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    impact_level VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_article_industries_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT chk_impact_level CHECK (impact_level IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT chk_industry_name_not_empty CHECK (LENGTH(name) >= 1),
    CONSTRAINT chk_industry_details_not_empty CHECK (LENGTH(details) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_article_industries_article_id ON article_industries(article_id);
CREATE INDEX IF NOT EXISTS idx_article_industries_name ON article_industries(name);
CREATE INDEX IF NOT EXISTS idx_article_industries_impact_level ON article_industries(impact_level);
CREATE INDEX IF NOT EXISTS idx_article_industries_name_article_id ON article_industries(name, article_id);

-- ============================================================================
-- 4. RECOMMENDATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS article_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_article_recommendations_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT chk_priority CHECK (priority IN ('immediate', 'high', 'medium', 'low')),
    CONSTRAINT chk_category CHECK (category IN ('patch', 'monitor', 'mitigate', 'investigate', 'configure', 'update')),
    CONSTRAINT chk_recommendation_title_not_empty CHECK (LENGTH(title) >= 1),
    CONSTRAINT chk_recommendation_description_not_empty CHECK (LENGTH(description) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_article_recommendations_article_id ON article_recommendations(article_id);
CREATE INDEX IF NOT EXISTS idx_article_recommendations_priority ON article_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_article_recommendations_category ON article_recommendations(category);

-- ============================================================================
-- 5. DEEP DIVE MAIN TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS article_deep_dives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL UNIQUE,
    executive_summary TEXT NOT NULL,
    required_tier VARCHAR(50) NOT NULL DEFAULT 'premium',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_deep_dive_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT chk_required_tier CHECK (required_tier IN ('free', 'premium', 'enterprise')),
    CONSTRAINT chk_executive_summary_not_empty CHECK (LENGTH(executive_summary) >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deep_dives_article_id ON article_deep_dives(article_id);
CREATE INDEX IF NOT EXISTS idx_deep_dives_required_tier ON article_deep_dives(required_tier);

-- Apply updated_at trigger
CREATE TRIGGER update_article_deep_dives_updated_at
    BEFORE UPDATE ON article_deep_dives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. TECHNICAL ANALYSIS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS deep_dive_technical_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deep_dive_id UUID NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    attack_chain JSONB NOT NULL DEFAULT '[]'::JSONB,
    indicators JSONB NOT NULL DEFAULT '[]'::JSONB,
    detection_methods JSONB NOT NULL DEFAULT '[]'::JSONB,
    mitigation_strategies JSONB NOT NULL DEFAULT '[]'::JSONB,
    tools_used JSONB DEFAULT '[]'::JSONB,
    vulnerabilities JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tech_analysis_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    CONSTRAINT chk_tech_analysis_summary_not_empty CHECK (LENGTH(summary) >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tech_analysis_deep_dive_id ON deep_dive_technical_analysis(deep_dive_id);

-- GIN indexes for JSONB array searches
CREATE INDEX IF NOT EXISTS idx_tech_analysis_attack_chain ON deep_dive_technical_analysis USING GIN(attack_chain);
CREATE INDEX IF NOT EXISTS idx_tech_analysis_indicators ON deep_dive_technical_analysis USING GIN(indicators);
CREATE INDEX IF NOT EXISTS idx_tech_analysis_vulnerabilities ON deep_dive_technical_analysis USING GIN(vulnerabilities);

-- ============================================================================
-- 7. TIMELINE EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS deep_dive_timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deep_dive_id UUID NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_timeline_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    CONSTRAINT chk_timeline_title_not_empty CHECK (LENGTH(title) >= 1),
    CONSTRAINT chk_timeline_description_not_empty CHECK (LENGTH(description) >= 1),
    CONSTRAINT chk_timeline_source_not_empty CHECK (LENGTH(source) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_timeline_deep_dive_id ON deep_dive_timeline_events(deep_dive_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_date ON deep_dive_timeline_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_deep_dive_event_date ON deep_dive_timeline_events(deep_dive_id, event_date DESC);

-- ============================================================================
-- 8. MITRE ATT&CK TECHNIQUES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS deep_dive_mitre_techniques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deep_dive_id UUID NOT NULL,
    technique_id VARCHAR(50) NOT NULL,
    name VARCHAR(500) NOT NULL,
    tactic VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mitre_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    CONSTRAINT chk_mitre_technique_id_not_empty CHECK (LENGTH(technique_id) >= 1),
    CONSTRAINT chk_mitre_name_not_empty CHECK (LENGTH(name) >= 1),
    CONSTRAINT chk_mitre_tactic_not_empty CHECK (LENGTH(tactic) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_mitre_deep_dive_id ON deep_dive_mitre_techniques(deep_dive_id);
CREATE INDEX IF NOT EXISTS idx_mitre_technique_id ON deep_dive_mitre_techniques(technique_id);
CREATE INDEX IF NOT EXISTS idx_mitre_tactic ON deep_dive_mitre_techniques(tactic);

-- ============================================================================
-- 9. IOCS FOR DEEP DIVE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS deep_dive_iocs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deep_dive_id UUID NOT NULL,
    ioc_type VARCHAR(50) NOT NULL,
    value TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ioc_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    CONSTRAINT chk_ioc_type CHECK (ioc_type IN ('ip', 'domain', 'hash', 'url', 'email', 'file')),
    CONSTRAINT chk_ioc_value_not_empty CHECK (LENGTH(value) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_deep_dive_iocs_deep_dive_id ON deep_dive_iocs(deep_dive_id);
CREATE INDEX IF NOT EXISTS idx_deep_dive_iocs_type ON deep_dive_iocs(ioc_type);
CREATE INDEX IF NOT EXISTS idx_deep_dive_iocs_value ON deep_dive_iocs(value);

-- ============================================================================
-- 10. THREAT ACTOR PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS deep_dive_threat_actors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deep_dive_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    aliases JSONB DEFAULT '[]'::JSONB,
    motivation VARCHAR(50) NOT NULL,
    origin VARCHAR(255),
    target_sectors JSONB NOT NULL DEFAULT '[]'::JSONB,
    known_techniques JSONB DEFAULT '[]'::JSONB,
    first_seen TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_threat_actor_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    CONSTRAINT chk_threat_actor_motivation CHECK (motivation IN ('financial', 'espionage', 'hacktivism', 'terrorism', 'unknown')),
    CONSTRAINT chk_threat_actor_name_not_empty CHECK (LENGTH(name) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_threat_actors_deep_dive_id ON deep_dive_threat_actors(deep_dive_id);
CREATE INDEX IF NOT EXISTS idx_threat_actors_name ON deep_dive_threat_actors(name);
CREATE INDEX IF NOT EXISTS idx_threat_actors_motivation ON deep_dive_threat_actors(motivation);

-- GIN indexes for JSONB array searches
CREATE INDEX IF NOT EXISTS idx_threat_actors_target_sectors ON deep_dive_threat_actors USING GIN(target_sectors);
CREATE INDEX IF NOT EXISTS idx_threat_actors_known_techniques ON deep_dive_threat_actors USING GIN(known_techniques);

-- ============================================================================
-- 11. RELATED THREATS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS deep_dive_related_threats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deep_dive_id UUID NOT NULL,
    related_article_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_related_threat_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    CONSTRAINT fk_related_threat_article FOREIGN KEY (related_article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT unique_related_threat UNIQUE (deep_dive_id, related_article_id)
);

CREATE INDEX IF NOT EXISTS idx_related_threats_deep_dive_id ON deep_dive_related_threats(deep_dive_id);
CREATE INDEX IF NOT EXISTS idx_related_threats_article_id ON deep_dive_related_threats(related_article_id);

-- ============================================================================
-- 12. AFFECTED PRODUCTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS deep_dive_affected_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deep_dive_id UUID NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_affected_product_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    CONSTRAINT chk_product_name_not_empty CHECK (LENGTH(product_name) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_affected_products_deep_dive_id ON deep_dive_affected_products(deep_dive_id);
CREATE INDEX IF NOT EXISTS idx_affected_products_name ON deep_dive_affected_products(product_name);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has access to deep dive content
CREATE OR REPLACE FUNCTION user_has_deep_dive_access(
    user_subscription_tier VARCHAR,
    required_tier VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    tier_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    -- Define tier hierarchy (higher number = higher tier)
    tier_hierarchy := CASE user_subscription_tier
        WHEN 'enterprise' THEN 3
        WHEN 'premium' THEN 2
        WHEN 'free' THEN 1
        ELSE 0
    END;

    required_hierarchy := CASE required_tier
        WHEN 'enterprise' THEN 3
        WHEN 'premium' THEN 2
        WHEN 'free' THEN 1
        ELSE 0
    END;

    RETURN tier_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get deep dive summary for article
CREATE OR REPLACE FUNCTION get_deep_dive_summary(article_id_param UUID)
RETURNS TABLE (
    has_deep_dive BOOLEAN,
    required_tier VARCHAR,
    executive_summary TEXT,
    timeline_event_count BIGINT,
    mitre_technique_count BIGINT,
    ioc_count BIGINT,
    threat_actor_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TRUE as has_deep_dive,
        dd.required_tier,
        dd.executive_summary,
        (SELECT COUNT(*) FROM deep_dive_timeline_events WHERE deep_dive_id = dd.id) as timeline_event_count,
        (SELECT COUNT(*) FROM deep_dive_mitre_techniques WHERE deep_dive_id = dd.id) as mitre_technique_count,
        (SELECT COUNT(*) FROM deep_dive_iocs WHERE deep_dive_id = dd.id) as ioc_count,
        (SELECT COUNT(*) FROM deep_dive_threat_actors WHERE deep_dive_id = dd.id) as threat_actor_count
    FROM article_deep_dives dd
    WHERE dd.article_id = article_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get articles with deep dive filtered by industry
CREATE OR REPLACE FUNCTION get_articles_by_industry_with_deep_dive(
    industry_name_param VARCHAR,
    limit_param INTEGER DEFAULT 20,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    article_id UUID,
    article_title VARCHAR,
    article_severity VARCHAR,
    impact_level VARCHAR,
    industry_details TEXT,
    has_deep_dive BOOLEAN,
    published_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        a.id as article_id,
        a.title as article_title,
        a.severity as article_severity,
        ai.impact_level,
        ai.details as industry_details,
        EXISTS(SELECT 1 FROM article_deep_dives WHERE article_id = a.id) as has_deep_dive,
        a.published_at
    FROM articles a
    JOIN article_industries ai ON a.id = ai.article_id
    WHERE ai.name = industry_name_param
      AND a.is_published = TRUE
    ORDER BY a.published_at DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE article_external_references IS 'External reference links for articles with publication dates';
COMMENT ON TABLE article_industries IS 'Industries affected by article threats with impact assessment';
COMMENT ON TABLE article_recommendations IS 'Actionable security recommendations for articles';
COMMENT ON TABLE article_deep_dives IS 'Main deep dive analysis table with access control';
COMMENT ON TABLE deep_dive_technical_analysis IS 'Technical analysis with attack chains, IOCs, and mitigation strategies';
COMMENT ON TABLE deep_dive_timeline_events IS 'Chronological timeline of threat events';
COMMENT ON TABLE deep_dive_mitre_techniques IS 'MITRE ATT&CK techniques used in the threat';
COMMENT ON TABLE deep_dive_iocs IS 'Indicators of Compromise for threat detection';
COMMENT ON TABLE deep_dive_threat_actors IS 'Threat actor profiles with motivations and targets';
COMMENT ON TABLE deep_dive_related_threats IS 'Related articles for threat correlation';
COMMENT ON TABLE deep_dive_affected_products IS 'Products and versions affected by the threat';

COMMENT ON COLUMN users.subscription_tier IS 'User subscription tier: free, premium, or enterprise';
COMMENT ON COLUMN article_deep_dives.required_tier IS 'Minimum subscription tier required to access this deep dive';
COMMENT ON COLUMN deep_dive_technical_analysis.attack_chain IS 'Array of attack stages in chronological order (JSONB)';
COMMENT ON COLUMN deep_dive_technical_analysis.indicators IS 'Array of behavioral indicators (JSONB)';
COMMENT ON COLUMN deep_dive_threat_actors.motivation IS 'Primary motivation: financial, espionage, hacktivism, terrorism, unknown';

COMMENT ON FUNCTION user_has_deep_dive_access(VARCHAR, VARCHAR) IS 'Check if user subscription tier grants access to deep dive content';
COMMENT ON FUNCTION get_deep_dive_summary(UUID) IS 'Get summary statistics for article deep dive';
COMMENT ON FUNCTION get_articles_by_industry_with_deep_dive(VARCHAR, INTEGER, INTEGER) IS 'Get articles filtered by industry with deep dive availability';

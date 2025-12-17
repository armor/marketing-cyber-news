-- Migration 000006: Enhanced Threat Intelligence Schema (Rollback)
-- Description: Remove deep dive analysis, external references, industries, recommendations, and user subscription tiers
-- Author: Database Developer Agent
-- Date: 2025-12-15

-- ============================================================================
-- DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS get_articles_by_industry_with_deep_dive(VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_deep_dive_summary(UUID);
DROP FUNCTION IF EXISTS user_has_deep_dive_access(VARCHAR, VARCHAR);

-- ============================================================================
-- DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_article_deep_dives_updated_at ON article_deep_dives;

-- ============================================================================
-- DROP INDEXES (explicit cleanup)
-- ============================================================================

-- Affected products indexes
DROP INDEX IF EXISTS idx_affected_products_name;
DROP INDEX IF EXISTS idx_affected_products_deep_dive_id;

-- Related threats indexes
DROP INDEX IF EXISTS idx_related_threats_article_id;
DROP INDEX IF EXISTS idx_related_threats_deep_dive_id;

-- Threat actors indexes
DROP INDEX IF EXISTS idx_threat_actors_known_techniques;
DROP INDEX IF EXISTS idx_threat_actors_target_sectors;
DROP INDEX IF EXISTS idx_threat_actors_motivation;
DROP INDEX IF EXISTS idx_threat_actors_name;
DROP INDEX IF EXISTS idx_threat_actors_deep_dive_id;

-- IOCs indexes
DROP INDEX IF EXISTS idx_deep_dive_iocs_value;
DROP INDEX IF EXISTS idx_deep_dive_iocs_type;
DROP INDEX IF EXISTS idx_deep_dive_iocs_deep_dive_id;

-- MITRE techniques indexes
DROP INDEX IF EXISTS idx_mitre_tactic;
DROP INDEX IF EXISTS idx_mitre_technique_id;
DROP INDEX IF EXISTS idx_mitre_deep_dive_id;

-- Timeline events indexes
DROP INDEX IF EXISTS idx_timeline_deep_dive_event_date;
DROP INDEX IF EXISTS idx_timeline_event_date;
DROP INDEX IF EXISTS idx_timeline_deep_dive_id;

-- Technical analysis indexes
DROP INDEX IF EXISTS idx_tech_analysis_vulnerabilities;
DROP INDEX IF EXISTS idx_tech_analysis_indicators;
DROP INDEX IF EXISTS idx_tech_analysis_attack_chain;
DROP INDEX IF EXISTS idx_tech_analysis_deep_dive_id;

-- Deep dive indexes
DROP INDEX IF EXISTS idx_deep_dives_required_tier;
DROP INDEX IF EXISTS idx_deep_dives_article_id;

-- Recommendations indexes
DROP INDEX IF EXISTS idx_article_recommendations_category;
DROP INDEX IF EXISTS idx_article_recommendations_priority;
DROP INDEX IF EXISTS idx_article_recommendations_article_id;

-- Industries indexes
DROP INDEX IF EXISTS idx_article_industries_name_article_id;
DROP INDEX IF EXISTS idx_article_industries_impact_level;
DROP INDEX IF EXISTS idx_article_industries_name;
DROP INDEX IF EXISTS idx_article_industries_article_id;

-- External references indexes
DROP INDEX IF EXISTS idx_article_external_refs_published_at;
DROP INDEX IF EXISTS idx_article_external_refs_source;
DROP INDEX IF EXISTS idx_article_external_refs_article_id;

-- User subscription tier index
DROP INDEX IF EXISTS idx_users_subscription_tier;

-- ============================================================================
-- DROP TABLES (CASCADE handles foreign key dependencies)
-- ============================================================================

DROP TABLE IF EXISTS deep_dive_affected_products CASCADE;
DROP TABLE IF EXISTS deep_dive_related_threats CASCADE;
DROP TABLE IF EXISTS deep_dive_threat_actors CASCADE;
DROP TABLE IF EXISTS deep_dive_iocs CASCADE;
DROP TABLE IF EXISTS deep_dive_mitre_techniques CASCADE;
DROP TABLE IF EXISTS deep_dive_timeline_events CASCADE;
DROP TABLE IF EXISTS deep_dive_technical_analysis CASCADE;
DROP TABLE IF EXISTS article_deep_dives CASCADE;
DROP TABLE IF EXISTS article_recommendations CASCADE;
DROP TABLE IF EXISTS article_industries CASCADE;
DROP TABLE IF EXISTS article_external_references CASCADE;

-- ============================================================================
-- REMOVE USER SUBSCRIPTION TIER
-- ============================================================================

-- Drop constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_subscription_tier;

-- Drop column
ALTER TABLE users DROP COLUMN IF EXISTS subscription_tier;

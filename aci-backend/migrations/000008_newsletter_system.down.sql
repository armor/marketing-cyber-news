-- Rollback: Newsletter Automation System
-- This migration drops all tables and ENUM types created in 000008_newsletter_system.up.sql
-- Tables are dropped in reverse dependency order to handle foreign key constraints

-- Drop tables (CASCADE is used to handle any dependent objects)
DROP TABLE IF EXISTS engagement_events CASCADE;
DROP TABLE IF EXISTS test_variants CASCADE;
DROP TABLE IF EXISTS newsletter_blocks CASCADE;
DROP TABLE IF EXISTS newsletter_issues CASCADE;
DROP TABLE IF EXISTS newsletter_configurations CASCADE;
DROP TABLE IF EXISTS content_items CASCADE;
DROP TABLE IF EXISTS contact_segment_membership CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS segments CASCADE;
DROP TABLE IF EXISTS content_sources CASCADE;

-- Drop ENUM types (must be dropped after tables that use them)
DROP TYPE IF EXISTS engagement_event_type;
DROP TYPE IF EXISTS test_type;
DROP TYPE IF EXISTS block_type;
DROP TYPE IF EXISTS issue_status;
DROP TYPE IF EXISTS risk_level;
DROP TYPE IF EXISTS approval_tier;
DROP TYPE IF EXISTS subject_line_style;
DROP TYPE IF EXISTS cadence_type;
DROP TYPE IF EXISTS content_type_enum;
DROP TYPE IF EXISTS content_source_type;

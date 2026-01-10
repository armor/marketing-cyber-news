-- Migration Rollback: 000012_voice_agents
-- Description: Drop voice transformation system tables
-- Created: 2026-01-10

-- Drop tables in reverse order of creation (respecting foreign key constraints)

-- Drop text_transformations first (references voice_agents and users)
DROP TABLE IF EXISTS text_transformations;

-- Drop voice_agent_examples (references voice_agents)
DROP TABLE IF EXISTS voice_agent_examples;

-- Drop voice_agent_style_rules (references voice_agents)
DROP TABLE IF EXISTS voice_agent_style_rules;

-- Drop voice_agents last (no outgoing references)
DROP TABLE IF EXISTS voice_agents;
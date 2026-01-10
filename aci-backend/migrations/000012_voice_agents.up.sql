-- Migration: 000012_voice_agents
-- Description: Create voice transformation system tables for brand voice AI agents
-- Created: 2026-01-10

-- =============================================================================
-- Voice Agents Table
-- =============================================================================
-- Primary entity representing a configurable transformation persona

CREATE TABLE IF NOT EXISTS voice_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'wand',
    color VARCHAR(20) DEFAULT '#6366F1',
    system_prompt TEXT NOT NULL,
    temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 1),
    max_tokens INTEGER DEFAULT 2000 CHECK (max_tokens >= 100 AND max_tokens <= 4000),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
    sort_order INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for voice_agents
CREATE INDEX IF NOT EXISTS idx_voice_agents_status
    ON voice_agents(status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_voice_agents_sort
    ON voice_agents(sort_order)
    WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_voice_agents_created_by
    ON voice_agents(created_by);

-- Comments
COMMENT ON TABLE voice_agents IS 'Configurable AI voice agents for text transformation';
COMMENT ON COLUMN voice_agents.name IS 'Display name (e.g., Brand Voice, SME Voice)';
COMMENT ON COLUMN voice_agents.icon IS 'Lucide icon name for UI display';
COMMENT ON COLUMN voice_agents.color IS 'Hex color code for UI accent';
COMMENT ON COLUMN voice_agents.system_prompt IS 'LLM system prompt template';
COMMENT ON COLUMN voice_agents.temperature IS 'Default LLM temperature (0.0-1.0)';
COMMENT ON COLUMN voice_agents.max_tokens IS 'Maximum output tokens (100-4000)';
COMMENT ON COLUMN voice_agents.status IS 'Visibility: draft, active, inactive';
COMMENT ON COLUMN voice_agents.version IS 'Prompt version for tracking changes';
COMMENT ON COLUMN voice_agents.deleted_at IS 'Soft delete timestamp';

-- =============================================================================
-- Style Rules Table
-- =============================================================================
-- Guidelines (do/don't) for each voice agent

CREATE TABLE IF NOT EXISTS voice_agent_style_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES voice_agents(id) ON DELETE CASCADE,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('do', 'dont')),
    rule_text TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for style_rules
CREATE INDEX IF NOT EXISTS idx_style_rules_agent
    ON voice_agent_style_rules(agent_id);

CREATE INDEX IF NOT EXISTS idx_style_rules_type
    ON voice_agent_style_rules(agent_id, rule_type);

-- Comments
COMMENT ON TABLE voice_agent_style_rules IS 'Style guidelines (do/dont) for voice agents';
COMMENT ON COLUMN voice_agent_style_rules.rule_type IS 'do = behaviors to follow, dont = behaviors to avoid';
COMMENT ON COLUMN voice_agent_style_rules.rule_text IS 'The actual guideline text';

-- =============================================================================
-- Examples Table
-- =============================================================================
-- Before/after transformation examples for each voice agent

CREATE TABLE IF NOT EXISTS voice_agent_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES voice_agents(id) ON DELETE CASCADE,
    before_text TEXT NOT NULL,
    after_text TEXT NOT NULL,
    context TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for examples
CREATE INDEX IF NOT EXISTS idx_examples_agent
    ON voice_agent_examples(agent_id);

-- Comments
COMMENT ON TABLE voice_agent_examples IS 'Before/after text examples demonstrating transformation quality';
COMMENT ON COLUMN voice_agent_examples.before_text IS 'Original text before transformation';
COMMENT ON COLUMN voice_agent_examples.after_text IS 'Text after transformation';
COMMENT ON COLUMN voice_agent_examples.context IS 'When to use this example';

-- =============================================================================
-- Text Transformations Table (Audit Trail)
-- =============================================================================
-- Records all transformation requests and selections for compliance

CREATE TABLE IF NOT EXISTS text_transformations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    agent_id UUID REFERENCES voice_agents(id) ON DELETE SET NULL,
    agent_config_snapshot JSONB,
    original_text TEXT NOT NULL,
    transformed_text TEXT NOT NULL,
    transformation_index INTEGER DEFAULT 0 CHECK (transformation_index >= 0 AND transformation_index <= 4),
    total_options INTEGER DEFAULT 3,
    field_path VARCHAR(255),
    entity_type VARCHAR(50),
    entity_id UUID,
    tokens_used INTEGER,
    latency_ms INTEGER,
    transformed_by UUID NOT NULL REFERENCES users(id),
    selected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transformations
CREATE INDEX IF NOT EXISTS idx_transformations_user
    ON text_transformations(transformed_by);

CREATE INDEX IF NOT EXISTS idx_transformations_entity
    ON text_transformations(entity_type, entity_id)
    WHERE entity_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transformations_date
    ON text_transformations(selected_at DESC);

CREATE INDEX IF NOT EXISTS idx_transformations_request
    ON text_transformations(request_id);

CREATE INDEX IF NOT EXISTS idx_transformations_agent
    ON text_transformations(agent_id)
    WHERE agent_id IS NOT NULL;

-- Comments
COMMENT ON TABLE text_transformations IS 'Audit trail for all text transformations';
COMMENT ON COLUMN text_transformations.request_id IS 'Links generation request to selection (groups 3 options)';
COMMENT ON COLUMN text_transformations.agent_config_snapshot IS 'Frozen agent config at transform time';
COMMENT ON COLUMN text_transformations.transformation_index IS '0=conservative, 1=moderate, 2=bold';
COMMENT ON COLUMN text_transformations.field_path IS 'UI field identifier (e.g., claim_text)';
COMMENT ON COLUMN text_transformations.entity_type IS 'Related entity type (e.g., claim, newsletter)';
COMMENT ON COLUMN text_transformations.tokens_used IS 'Total LLM tokens consumed';
COMMENT ON COLUMN text_transformations.latency_ms IS 'Processing time in milliseconds';
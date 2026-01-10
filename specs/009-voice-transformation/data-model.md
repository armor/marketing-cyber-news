# Data Model: Voice Transformation System

**Feature**: 009-voice-transformation
**Date**: 2026-01-10
**Database**: PostgreSQL 16

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           voice_agents                                   │
│─────────────────────────────────────────────────────────────────────────│
│ PK  id: UUID                                                            │
│     name: VARCHAR(100) UNIQUE NOT NULL                                  │
│     description: TEXT                                                   │
│     icon: VARCHAR(50) DEFAULT 'wand'                                    │
│     color: VARCHAR(20) DEFAULT '#6366F1'                                │
│     system_prompt: TEXT NOT NULL                                        │
│     temperature: DECIMAL(3,2) DEFAULT 0.7                               │
│     max_tokens: INTEGER DEFAULT 2000                                    │
│     status: VARCHAR(20) DEFAULT 'draft'                                 │
│     sort_order: INTEGER DEFAULT 0                                       │
│     version: INTEGER DEFAULT 1                                          │
│ FK  created_by: UUID → users(id)                                        │
│     created_at: TIMESTAMPTZ DEFAULT NOW()                               │
│     updated_at: TIMESTAMPTZ DEFAULT NOW()                               │
│     deleted_at: TIMESTAMPTZ                                             │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────┐
│  style_rules    │ │   examples      │ │      text_transformations       │
│─────────────────│ │─────────────────│ │─────────────────────────────────│
│ PK id: UUID     │ │ PK id: UUID     │ │ PK id: UUID                     │
│ FK agent_id     │ │ FK agent_id     │ │    request_id: UUID NOT NULL    │
│    rule_type    │ │    before_text  │ │ FK agent_id                     │
│    rule_text    │ │    after_text   │ │    agent_config_snapshot: JSONB │
│    sort_order   │ │    context      │ │    original_text: TEXT NOT NULL │
│    created_at   │ │    sort_order   │ │    transformed_text: TEXT       │
└─────────────────┘ │    created_at   │ │    transformation_index: INT    │
                    └─────────────────┘ │    total_options: INT DEFAULT 3 │
                                        │    field_path: VARCHAR(255)     │
                                        │    entity_type: VARCHAR(50)     │
                                        │    entity_id: UUID              │
                                        │    tokens_used: INTEGER         │
                                        │    latency_ms: INTEGER          │
                                        │ FK transformed_by → users(id)   │
                                        │    selected_at: TIMESTAMPTZ     │
                                        └─────────────────────────────────┘
```

---

## Entity Definitions

### VoiceAgent

The primary entity representing a configurable transformation persona.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Display name (e.g., "Brand Voice") |
| description | TEXT | | Longer description for UI |
| icon | VARCHAR(50) | DEFAULT 'wand' | Lucide icon name |
| color | VARCHAR(20) | DEFAULT '#6366F1' | UI accent color (hex) |
| system_prompt | TEXT | NOT NULL | LLM system prompt template |
| temperature | DECIMAL(3,2) | DEFAULT 0.7, CHECK (0 ≤ x ≤ 1) | Default LLM temperature |
| max_tokens | INTEGER | DEFAULT 2000, CHECK (100 ≤ x ≤ 4000) | Maximum output tokens |
| status | VARCHAR(20) | DEFAULT 'draft', CHECK IN ('active', 'inactive', 'draft') | Visibility status |
| sort_order | INTEGER | DEFAULT 0 | UI ordering (ascending) |
| version | INTEGER | DEFAULT 1 | Prompt version for tracking changes |
| created_by | UUID | FK users(id) | Creator reference |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |
| deleted_at | TIMESTAMPTZ | NULL | Soft delete timestamp |

**Validation Rules:**
- `name` must be unique and non-empty
- `temperature` must be between 0.0 and 1.0
- `max_tokens` must be between 100 and 4000
- `status` must be one of: 'active', 'inactive', 'draft'
- `system_prompt` must be non-empty

**State Transitions:**
```
draft → active (admin publishes)
active → inactive (admin deactivates)
inactive → active (admin reactivates)
any → deleted (soft delete via deleted_at)
```

---

### StyleRule

Guidelines for an agent that indicate behaviors to follow ("do") or avoid ("don't").

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| agent_id | UUID | FK voice_agents(id) ON DELETE CASCADE | Parent agent |
| rule_type | VARCHAR(20) | NOT NULL, CHECK IN ('do', 'dont') | Rule category |
| rule_text | TEXT | NOT NULL | Rule content |
| sort_order | INTEGER | DEFAULT 0 | Display order within type |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Validation Rules:**
- `rule_type` must be 'do' or 'dont'
- `rule_text` must be non-empty
- Cascades delete when parent agent is deleted

---

### TransformationExample

Before/after text pairs that demonstrate expected transformation quality.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| agent_id | UUID | FK voice_agents(id) ON DELETE CASCADE | Parent agent |
| before_text | TEXT | NOT NULL | Original text example |
| after_text | TEXT | NOT NULL | Transformed text example |
| context | TEXT | | When to use this example |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Validation Rules:**
- `before_text` and `after_text` must be non-empty
- Cascades delete when parent agent is deleted

---

### TextTransformation

Audit trail for all transformation requests and selections.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| request_id | UUID | NOT NULL | Links generation request to selection |
| agent_id | UUID | FK voice_agents(id) ON DELETE SET NULL | Agent used (null if deleted) |
| agent_config_snapshot | JSONB | | Frozen agent config at transform time |
| original_text | TEXT | NOT NULL | Input text |
| transformed_text | TEXT | NOT NULL | Selected output |
| transformation_index | INTEGER | DEFAULT 0, CHECK (0 ≤ x ≤ 2) | Which option (0=conservative, 1=moderate, 2=bold) |
| total_options | INTEGER | DEFAULT 3 | Number of options generated |
| field_path | VARCHAR(255) | | UI field identifier (e.g., 'claim_text') |
| entity_type | VARCHAR(50) | | Related entity type (e.g., 'claim', 'newsletter') |
| entity_id | UUID | | Related entity ID |
| tokens_used | INTEGER | | Total LLM tokens consumed |
| latency_ms | INTEGER | | Processing time in milliseconds |
| transformed_by | UUID | FK users(id), NOT NULL | User who performed transformation |
| selected_at | TIMESTAMPTZ | DEFAULT NOW() | When user selected this option |

**Validation Rules:**
- `request_id`, `original_text`, `transformed_text`, `transformed_by` are required
- `transformation_index` must be 0, 1, or 2
- `agent_id` can be null if agent was deleted after transformation

---

## Indexes

```sql
-- Voice Agents
CREATE INDEX idx_voice_agents_status ON voice_agents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_voice_agents_sort ON voice_agents(sort_order) WHERE status = 'active' AND deleted_at IS NULL;

-- Style Rules
CREATE INDEX idx_style_rules_agent ON voice_agent_style_rules(agent_id);
CREATE INDEX idx_style_rules_type ON voice_agent_style_rules(agent_id, rule_type);

-- Examples
CREATE INDEX idx_examples_agent ON voice_agent_examples(agent_id);

-- Transformations
CREATE INDEX idx_transformations_user ON text_transformations(transformed_by);
CREATE INDEX idx_transformations_entity ON text_transformations(entity_type, entity_id);
CREATE INDEX idx_transformations_date ON text_transformations(selected_at DESC);
CREATE INDEX idx_transformations_request ON text_transformations(request_id);
```

---

## Domain Model (Go)

```go
package domain

import (
    "time"

    "github.com/google/uuid"
)

// VoiceAgentStatus represents the visibility state of an agent
type VoiceAgentStatus string

const (
    VoiceAgentStatusDraft    VoiceAgentStatus = "draft"
    VoiceAgentStatusActive   VoiceAgentStatus = "active"
    VoiceAgentStatusInactive VoiceAgentStatus = "inactive"
)

// RuleType represents style rule categories
type RuleType string

const (
    RuleTypeDo   RuleType = "do"
    RuleTypeDont RuleType = "dont"
)

// VoiceAgent represents a configurable transformation persona
type VoiceAgent struct {
    ID           uuid.UUID        `json:"id" db:"id"`
    Name         string           `json:"name" db:"name" validate:"required,max=100"`
    Description  string           `json:"description" db:"description"`
    Icon         string           `json:"icon" db:"icon"`
    Color        string           `json:"color" db:"color"`
    SystemPrompt string           `json:"system_prompt" db:"system_prompt" validate:"required"`
    Temperature  float64          `json:"temperature" db:"temperature" validate:"gte=0,lte=1"`
    MaxTokens    int              `json:"max_tokens" db:"max_tokens" validate:"gte=100,lte=4000"`
    Status       VoiceAgentStatus `json:"status" db:"status"`
    SortOrder    int              `json:"sort_order" db:"sort_order"`
    Version      int              `json:"version" db:"version"`
    CreatedBy    uuid.UUID        `json:"created_by" db:"created_by"`
    CreatedAt    time.Time        `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time        `json:"updated_at" db:"updated_at"`
    DeletedAt    *time.Time       `json:"deleted_at,omitempty" db:"deleted_at"`

    // Loaded via joins
    StyleRules []StyleRule `json:"style_rules,omitempty"`
    Examples   []Example   `json:"examples,omitempty"`
}

// StyleRule represents a do/don't guideline for an agent
type StyleRule struct {
    ID        uuid.UUID `json:"id" db:"id"`
    AgentID   uuid.UUID `json:"agent_id" db:"agent_id"`
    RuleType  RuleType  `json:"rule_type" db:"rule_type" validate:"required,oneof=do dont"`
    RuleText  string    `json:"rule_text" db:"rule_text" validate:"required"`
    SortOrder int       `json:"sort_order" db:"sort_order"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Example represents a before/after transformation example
type Example struct {
    ID         uuid.UUID `json:"id" db:"id"`
    AgentID    uuid.UUID `json:"agent_id" db:"agent_id"`
    BeforeText string    `json:"before_text" db:"before_text" validate:"required"`
    AfterText  string    `json:"after_text" db:"after_text" validate:"required"`
    Context    string    `json:"context" db:"context"`
    SortOrder  int       `json:"sort_order" db:"sort_order"`
    CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// TextTransformation represents an audit record of a transformation
type TextTransformation struct {
    ID                    uuid.UUID  `json:"id" db:"id"`
    RequestID             uuid.UUID  `json:"request_id" db:"request_id" validate:"required"`
    AgentID               *uuid.UUID `json:"agent_id" db:"agent_id"`
    AgentConfigSnapshot   []byte     `json:"agent_config_snapshot" db:"agent_config_snapshot"`
    OriginalText          string     `json:"original_text" db:"original_text" validate:"required"`
    TransformedText       string     `json:"transformed_text" db:"transformed_text" validate:"required"`
    TransformationIndex   int        `json:"transformation_index" db:"transformation_index" validate:"gte=0,lte=2"`
    TotalOptions          int        `json:"total_options" db:"total_options"`
    FieldPath             string     `json:"field_path" db:"field_path"`
    EntityType            string     `json:"entity_type" db:"entity_type"`
    EntityID              *uuid.UUID `json:"entity_id" db:"entity_id"`
    TokensUsed            int        `json:"tokens_used" db:"tokens_used"`
    LatencyMs             int        `json:"latency_ms" db:"latency_ms"`
    TransformedBy         uuid.UUID  `json:"transformed_by" db:"transformed_by" validate:"required"`
    SelectedAt            time.Time  `json:"selected_at" db:"selected_at"`
}

// TransformRequest represents an incoming transformation request
type TransformRequest struct {
    AgentID    uuid.UUID  `json:"agent_id" validate:"required"`
    Text       string     `json:"text" validate:"required,min=10,max=10000"`
    NumOptions int        `json:"num_options" validate:"gte=1,lte=5"`
    FieldPath  string     `json:"field_path"`
    EntityType string     `json:"entity_type"`
    EntityID   *uuid.UUID `json:"entity_id"`
}

// TransformOption represents one of the transformation alternatives
type TransformOption struct {
    Index       int     `json:"index"`
    Label       string  `json:"label"`
    Text        string  `json:"text"`
    Temperature float64 `json:"temperature"`
    TokensUsed  int     `json:"tokens_used"`
}

// TransformResponse represents the API response for a transformation
type TransformResponse struct {
    RequestID  uuid.UUID         `json:"request_id"`
    AgentID    uuid.UUID         `json:"agent_id"`
    AgentName  string            `json:"agent_name"`
    Options    []TransformOption `json:"options"`
    LatencyMs  int               `json:"latency_ms"`
}
```

---

## TypeScript Types (Frontend)

```typescript
// Voice Agent Types
export type VoiceAgentStatus = 'draft' | 'active' | 'inactive';
export type RuleType = 'do' | 'dont';

export interface VoiceAgent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  status: VoiceAgentStatus;
  sort_order: number;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  style_rules?: StyleRule[];
  examples?: Example[];
}

export interface StyleRule {
  id: string;
  agent_id: string;
  rule_type: RuleType;
  rule_text: string;
  sort_order: number;
  created_at: string;
}

export interface Example {
  id: string;
  agent_id: string;
  before_text: string;
  after_text: string;
  context?: string;
  sort_order: number;
  created_at: string;
}

// Transform Request/Response Types
export interface TransformRequest {
  agent_id: string;
  text: string;
  num_options?: number;
  field_path?: string;
  entity_type?: string;
  entity_id?: string;
}

export interface TransformOption {
  index: number;
  label: 'conservative' | 'moderate' | 'bold';
  text: string;
  temperature: number;
  tokens_used: number;
}

export interface TransformResponse {
  request_id: string;
  agent_id: string;
  agent_name: string;
  options: TransformOption[];
  latency_ms: number;
}

// Selection Request
export interface SelectTransformRequest {
  request_id: string;
  transformation_index: number;
  field_path?: string;
  entity_type?: string;
  entity_id?: string;
}
```

---

## Migration SQL

See `aci-backend/migrations/000012_voice_agents.up.sql` for the complete migration.

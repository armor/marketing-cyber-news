# Quickstart: Voice Transformation System

**Feature**: 009-voice-transformation
**Date**: 2026-01-10

This guide helps developers get started with the Voice Transformation System implementation.

---

## Prerequisites

- Go 1.24+
- Node.js 22+
- PostgreSQL 16 running locally or via Docker
- Redis 7 running locally or via Docker
- OpenRouter API key (for LLM access)

## Quick Setup

### 1. Database Migration

```bash
cd aci-backend

# Create migration file
cat > migrations/000012_voice_agents.up.sql << 'EOF'
-- Voice Agents table
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

-- Style Rules table
CREATE TABLE IF NOT EXISTS voice_agent_style_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES voice_agents(id) ON DELETE CASCADE,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('do', 'dont')),
    rule_text TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Examples table
CREATE TABLE IF NOT EXISTS voice_agent_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES voice_agents(id) ON DELETE CASCADE,
    before_text TEXT NOT NULL,
    after_text TEXT NOT NULL,
    context TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Text Transformations audit table
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
    transformed_by UUID REFERENCES users(id) NOT NULL,
    selected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voice_agents_status ON voice_agents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_voice_agents_sort ON voice_agents(sort_order) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_style_rules_agent ON voice_agent_style_rules(agent_id);
CREATE INDEX idx_style_rules_type ON voice_agent_style_rules(agent_id, rule_type);
CREATE INDEX idx_examples_agent ON voice_agent_examples(agent_id);
CREATE INDEX idx_transformations_user ON text_transformations(transformed_by);
CREATE INDEX idx_transformations_entity ON text_transformations(entity_type, entity_id);
CREATE INDEX idx_transformations_date ON text_transformations(selected_at DESC);
CREATE INDEX idx_transformations_request ON text_transformations(request_id);
EOF

# Run migration
psql $DATABASE_URL -f migrations/000012_voice_agents.up.sql
```

### 2. Seed Default Voice Agents

```bash
cat > scripts/seed-voice-agents.sql << 'EOF'
-- Brand Voice Agent
INSERT INTO voice_agents (id, name, description, icon, color, system_prompt, temperature, status, sort_order)
VALUES (
    gen_random_uuid(),
    'Brand Voice',
    'Transform text to match Armor''s confident, empowering brand voice',
    'wand',
    '#6366F1',
    'You are a text transformation assistant specializing in Armor''s Brand Voice.

Core characteristics:
- Confident: Use assertive, direct language without hedging
- Empowering: Frame the reader as the hero solving real human risks
- Visionary: Sound forward-thinking and practical, not buzzword-heavy
- Human-centric: Highlight how security impacts people, teams, customers

Transform the provided text to match this voice while preserving the core message.',
    0.7,
    'active',
    1
);

-- SME Voice Agent
INSERT INTO voice_agents (id, name, description, icon, color, system_prompt, temperature, status, sort_order)
VALUES (
    gen_random_uuid(),
    'SME Voice',
    'Transform text for technical, authoritative subject matter expert tone',
    'graduation-cap',
    '#059669',
    'You are a text transformation assistant specializing in Subject Matter Expert voice.

Core characteristics:
- Authoritative: Demonstrate deep expertise without condescension
- Evidence-based: Reference data, research, and industry standards
- Precise: Use accurate technical terminology appropriately
- Educational: Help readers understand complex concepts

Transform the provided text to match this voice while preserving the core message.',
    0.5,
    'active',
    2
);

-- Compliance Voice Agent
INSERT INTO voice_agents (id, name, description, icon, color, system_prompt, temperature, status, sort_order)
VALUES (
    gen_random_uuid(),
    'Compliance Voice',
    'Transform text for regulatory and compliance-appropriate language',
    'shield-check',
    '#DC2626',
    'You are a text transformation assistant specializing in Compliance Voice.

Core characteristics:
- Precise: Use exact regulatory terminology
- Conservative: Avoid claims that could create liability
- Factual: Stick to verifiable statements
- Structured: Use clear, unambiguous language

Transform the provided text to match this voice while preserving the core message.',
    0.3,
    'active',
    3
);

-- Voice of Customer Agent
INSERT INTO voice_agents (id, name, description, icon, color, system_prompt, temperature, status, sort_order)
VALUES (
    gen_random_uuid(),
    'Voice of Customer',
    'Transform text to sound like authentic customer testimonials',
    'user-check',
    '#F59E0B',
    'You are a text transformation assistant specializing in Voice of Customer.

Core characteristics:
- Authentic: Sound like a real person sharing their experience
- Specific: Include concrete details and outcomes
- Relatable: Use everyday language, not marketing speak
- Outcome-focused: Emphasize results and benefits experienced

Transform the provided text to match this voice while preserving the core message.',
    0.6,
    'active',
    4
);
EOF

psql $DATABASE_URL -f scripts/seed-voice-agents.sql
```

### 3. Environment Variables

Add to your `.env` or ConfigMap:

```bash
# LLM Configuration
OPENROUTER_API_KEY=your-api-key
OPENROUTER_MODEL=anthropic/claude-3-sonnet

# Rate Limiting
REDIS_URL=redis://localhost:6379/0
TRANSFORM_RATE_LIMIT=30
TRANSFORM_RATE_WINDOW=1h

# Feature Flag (optional)
VOICE_TRANSFORM_ENABLED=true
```

## Development Workflow

### Backend First

```bash
cd aci-backend

# 1. Run existing tests to establish baseline
go test ./...

# 2. Create domain types
mkdir -p internal/domain/voice

# 3. Create repository layer
mkdir -p internal/repository/voice

# 4. Create service layer
mkdir -p internal/service/voice

# 5. Create handlers
# Files go in internal/api/handlers/

# 6. Run tests after each layer
go test ./internal/domain/voice/...
go test ./internal/repository/voice/...
go test ./internal/service/voice/...

# 7. Run wiring tests
go test ./tests/integration/... -v
```

### Frontend Second

```bash
cd aci-frontend

# 1. Create API client
# src/api/voice.ts

# 2. Create context and hooks
mkdir -p src/contexts
mkdir -p src/hooks

# 3. Create components
mkdir -p src/components/voice

# 4. Run unit tests
npm run test

# 5. Run E2E tests
npm run test:e2e -- --grep "voice transformation"
```

## Key Patterns

### Parallel LLM Calls (Go)

```go
import "golang.org/x/sync/errgroup"

func (s *TransformService) Transform(ctx context.Context, agent *VoiceAgent, text string) ([]TransformOption, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([]TransformOption, 3)

    temps := []float64{0.3, 0.5, 0.7}
    labels := []string{"conservative", "moderate", "bold"}

    for i := 0; i < 3; i++ {
        i := i // capture
        g.Go(func() error {
            resp, err := s.llm.Complete(ctx, agent.SystemPrompt, text, temps[i])
            if err != nil {
                return err
            }
            results[i] = TransformOption{
                Index: i,
                Label: labels[i],
                Text: resp.Text,
                Temperature: temps[i],
                TokensUsed: resp.TokensUsed,
            }
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### Input Sanitization

```go
var injectionPatterns = []*regexp.Regexp{
    regexp.MustCompile(`(?i)(ignore|forget|disregard)\s+(previous|above|all)`),
    regexp.MustCompile(`(?i)you\s+are\s+now`),
    regexp.MustCompile(`(?i)pretend\s+(you|to\s+be)`),
    regexp.MustCompile(`(?i)(system|assistant)\s*:\s*`),
}

func (s *Sanitizer) Check(text string) error {
    for _, pattern := range injectionPatterns {
        if pattern.MatchString(text) {
            return ErrPromptInjectionDetected
        }
    }
    return nil
}
```

### React Hook Pattern

```typescript
export function useTransformation() {
  const queryClient = useQueryClient();

  const transformMutation = useMutation({
    mutationFn: ({ agentId, text }: TransformParams) =>
      voiceApi.transform(agentId, text),
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const selectMutation = useMutation({
    mutationFn: (params: SelectParams) =>
      voiceApi.selectTransformation(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transformations'] });
    },
  });

  return {
    transform: transformMutation.mutateAsync,
    select: selectMutation.mutateAsync,
    isTransforming: transformMutation.isPending,
    options: transformMutation.data?.options,
  };
}
```

## Testing Commands

```bash
# Backend
cd aci-backend
go test ./...                          # All tests
go test ./tests/integration/... -v     # Wiring tests only
go test -run TestTransform ./...       # Specific tests

# Frontend
cd aci-frontend
npm run test                           # Unit tests
npm run test:e2e                       # E2E tests
npm run test:e2e -- --grep "voice"     # Voice-specific E2E

# Full validation
cd aci-backend && go build ./... && go test ./...
cd aci-frontend && npm run build && npm run test
```

## API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/voice-agents` | GET | List active agents |
| `/v1/voice-agents/{id}` | GET | Get agent with rules/examples |
| `/v1/voice-agents/{id}/transform` | POST | Transform text |
| `/v1/transformations/select` | POST | Record selection |
| `/v1/transformations` | GET | Audit history (admin) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Rate limit errors | Check Redis connection, verify user auth |
| Slow transformations | Check OpenRouter latency, verify parallel calls |
| Empty responses | Check agent system_prompt, verify text length |
| 401 on admin routes | Verify JWT has admin role |

## References

- [Specification](./spec.md)
- [Data Model](./data-model.md)
- [Research](./research.md)
- [OpenAPI: Voice Agents](./contracts/voice-agents.yaml)
- [OpenAPI: Transformations](./contracts/transformations.yaml)

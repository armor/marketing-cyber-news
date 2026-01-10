# 009 - Voice Transformation System

## Overview

A multi-agent text transformation system that rewrites content in configurable "voices" (Brand Voice, SME Voice, Compliance Voice, Voice of Customer). Users invoke transformation on any text field via magic wand button, keyboard shortcut, or context menu. The system generates 3 transformation options with different intensity levels for side-by-side comparison.

**Status**: Approved (12-expert dialectic debate review completed)

## Requirements

### Brand Voice Characteristics (Primary Voice)

| Characteristic | Description |
|----------------|-------------|
| **Confident** | Use assertive, direct language without hedging |
| **Empowering** | Frame reader as the hero solving real human risks |
| **Visionary** | Sound forward-thinking and practical, not buzzword-heavy |
| **Human-centric** | Highlight how security impacts people, teams, customers |

### Brand Voice Style Rules

#### DO
- Use active voice and strong verbs ("You can reduce...", "Your team can move faster...")
- Lead with their pain, not Armor's pride
- Incorporate aspirational metaphors sparingly ("treating your cloud as a living ecosystem")
- Balance storytelling with factual clarity
- Position Armor as a partner that helps reduce risk

#### DON'T
- Use fear-based language or alarmist tone
- Make unsubstantiated claims ("100% secure", "guaranteed compliance")
- Use war/battle metaphors
- Use buzzwords: "revolutionary", "game-changer", "paradigm shift", "synergy", "cutting-edge"
- Use passive voice

### Voice Agent Definitions

| Agent | Core Characteristics | Primary Use Case |
|-------|---------------------|------------------|
| **Brand Voice** | Confident, empowering, visionary, human-centric | Marketing content, website copy |
| **SME Voice** | Technical accuracy, authoritative, evidence-based | Technical blogs, whitepapers |
| **Compliance Voice** | Risk-aware, measured, audit-defensible | Regulatory content, claims |
| **Voice of Customer** | Authentic, outcome-focused, relatable | Testimonials, case studies |

### Transformation Intensities

| Level | Temperature | Description |
|-------|-------------|-------------|
| **Conservative** | 0.3 | Minimal changes, preserve structure |
| **Moderate** | 0.5 | Balanced transformation |
| **Bold** | 0.7 | Significant rewrite |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend                                     │
│  VoiceTransformationProvider → useTransformableText hook            │
│  TransformableTextarea → VoiceTransformationPanel (side-by-side)    │
└────────────────────────────────────┬────────────────────────────────┘
                                     │ POST /v1/transform
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend API                                  │
│  RateLimiter → Sanitizer → VoiceAgentHandler → TransformationService│
└────────────────────────────────────┬────────────────────────────────┘
                                     │ Parallel (errgroup)
            ┌────────────────────────┼────────────────────────┐
            ▼                        ▼                        ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Conservative    │   │   Moderate       │   │     Bold         │
│  (temp 0.3)      │   │  (temp 0.5)      │   │   (temp 0.7)     │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

## Database Schema

### Tables

#### voice_agents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Agent name |
| description | TEXT | | Agent description |
| icon | VARCHAR(50) | DEFAULT 'wand' | Lucide icon name |
| color | VARCHAR(20) | DEFAULT '#6366F1' | UI color (hex) |
| system_prompt | TEXT | NOT NULL | LLM system prompt |
| temperature | DECIMAL(3,2) | DEFAULT 0.7, CHECK 0-1 | Default temperature |
| max_tokens | INTEGER | DEFAULT 2000, CHECK 100-4000 | Token limit |
| status | VARCHAR(20) | DEFAULT 'draft' | active, inactive, draft |
| sort_order | INTEGER | DEFAULT 0 | UI ordering |
| version | INTEGER | DEFAULT 1 | Prompt version |
| created_by | UUID | FK users(id) | Creator reference |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |
| deleted_at | TIMESTAMPTZ | | Soft delete timestamp |

#### voice_agent_style_rules

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| agent_id | UUID | FK voice_agents(id) CASCADE | Parent agent |
| rule_type | VARCHAR(20) | NOT NULL, CHECK ('do', 'dont') | Rule category |
| rule_text | TEXT | NOT NULL | Rule content |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

#### voice_agent_examples

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| agent_id | UUID | FK voice_agents(id) CASCADE | Parent agent |
| before_text | TEXT | NOT NULL | Original text example |
| after_text | TEXT | NOT NULL | Transformed text example |
| context | TEXT | | When to use this example |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

#### text_transformations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| request_id | UUID | NOT NULL | Links request to selection |
| agent_id | UUID | FK voice_agents(id) | Agent used |
| agent_config_snapshot | JSONB | | Frozen agent config at time |
| original_text | TEXT | NOT NULL | Input text |
| transformed_text | TEXT | NOT NULL | Selected output |
| transformation_index | INTEGER | DEFAULT 0 | Which option selected |
| total_options | INTEGER | DEFAULT 3 | Options generated |
| field_path | VARCHAR(255) | | UI field identifier |
| entity_type | VARCHAR(50) | | Related entity type |
| entity_id | UUID | | Related entity ID |
| tokens_used | INTEGER | | LLM tokens consumed |
| latency_ms | INTEGER | | Processing time |
| transformed_by | UUID | FK users(id), NOT NULL | User who transformed |
| selected_at | TIMESTAMPTZ | DEFAULT NOW() | Selection timestamp |

### Indexes

```sql
CREATE INDEX idx_voice_agents_status ON voice_agents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_voice_agents_sort ON voice_agents(sort_order) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_style_rules_agent ON voice_agent_style_rules(agent_id);
CREATE INDEX idx_examples_agent ON voice_agent_examples(agent_id);
CREATE INDEX idx_transformations_user ON text_transformations(transformed_by);
CREATE INDEX idx_transformations_entity ON text_transformations(entity_type, entity_id);
CREATE INDEX idx_transformations_date ON text_transformations(selected_at DESC);
CREATE INDEX idx_transformations_request ON text_transformations(request_id);
```

## API Specification

### Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/v1/voice-agents` | List all agents | Admin |
| GET | `/v1/voice-agents/active` | List active agents | User |
| GET | `/v1/voice-agents/:id` | Get agent details | User |
| POST | `/v1/voice-agents` | Create agent | Admin |
| PUT | `/v1/voice-agents/:id` | Update agent | Admin |
| DELETE | `/v1/voice-agents/:id` | Soft delete agent | Admin |
| POST | `/v1/voice-agents/:id/rules` | Add style rule | Admin |
| DELETE | `/v1/voice-agents/:id/rules/:ruleId` | Remove style rule | Admin |
| POST | `/v1/voice-agents/:id/examples` | Add example | Admin |
| DELETE | `/v1/voice-agents/:id/examples/:exampleId` | Remove example | Admin |
| POST | `/v1/transform` | Transform text (rate limited: 30/hr) | User |
| POST | `/v1/transform/select` | Record selection | User |
| GET | `/v1/transform/history` | User transformation history | User |

### Request/Response Contracts

#### POST /v1/transform

**Request**
```json
{
  "agent_id": "uuid",
  "text": "string (10-10000 chars)",
  "num_options": 3,
  "field_path": "claim_text",
  "entity_type": "claim",
  "entity_id": "uuid"
}
```

**Response**
```json
{
  "data": {
    "request_id": "uuid",
    "agent_id": "uuid",
    "agent_name": "Brand Voice",
    "options": [
      {
        "index": 0,
        "label": "conservative",
        "text": "Transformed text...",
        "temperature": 0.3,
        "tokens_used": 150
      },
      {
        "index": 1,
        "label": "moderate",
        "text": "Transformed text...",
        "temperature": 0.5,
        "tokens_used": 180
      },
      {
        "index": 2,
        "label": "bold",
        "text": "Transformed text...",
        "temperature": 0.7,
        "tokens_used": 200
      }
    ],
    "latency_ms": 2500
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AGENT_NOT_FOUND | 404 | Voice agent does not exist |
| TEXT_TOO_SHORT | 400 | Input text < 10 characters |
| TEXT_TOO_LONG | 400 | Input text > 10000 characters |
| RATE_LIMITED | 429 | Exceeded 30 transforms/hour |
| LLM_UNAVAILABLE | 503 | LLM service down |
| LLM_TIMEOUT | 504 | LLM request timed out |
| TRANSFORM_FAILED | 500 | Transformation error |
| PROMPT_INJECTION_DETECTED | 400 | Malicious input detected |

## Security

### Prompt Injection Defense

The system sanitizes input text before sending to LLM:

```go
// Blocked patterns
var instructionPatterns = []*regexp.Regexp{
    regexp.MustCompile(`(?i)(ignore|forget|disregard)\s+(previous|above|all|prior)\s+(instructions?|prompts?|context)`),
    regexp.MustCompile(`(?i)you\s+are\s+now`),
    regexp.MustCompile(`(?i)pretend\s+(you|to\s+be)`),
    regexp.MustCompile(`(?i)act\s+as\s+(if|a)`),
    regexp.MustCompile(`(?i)(system|assistant)\s*:\s*`),
    regexp.MustCompile(`(?i)output\s+(the|your)\s+(system\s+)?prompt`),
}
```

### Rate Limiting

| Limit | Value | Scope |
|-------|-------|-------|
| Per-user transforms | 30/hour | User ID |
| Global throttle | 1000/hour | System-wide |

## Frontend Components

### Files to Create

| File | Purpose |
|------|---------|
| `src/contexts/VoiceTransformationContext.tsx` | Global state, keyboard shortcuts |
| `src/hooks/useTransformableText.ts` | Core transformation hook |
| `src/hooks/useVoiceAgents.ts` | TanStack Query for agents |
| `src/hooks/useTransformText.ts` | Transform mutation |
| `src/components/transformation/TransformableTextarea.tsx` | Enhanced textarea |
| `src/components/transformation/TransformToolbar.tsx` | Magic wand button |
| `src/components/transformation/VoiceTransformationPanel.tsx` | Side-by-side UI |
| `src/components/transformation/TransformLoadingSkeleton.tsx` | Loading state |

### UX Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Loading State** | Immediate skeleton on click, streaming text |
| **Error Handling** | Toast with error code, retry button |
| **Mobile** | Sheet (slide-up) instead of Popover |
| **Accessibility** | ARIA labels, focus management, keyboard nav |
| **Undo** | "Restore Original" button with 1-level history |
| **Shortcut** | Configurable, default Ctrl+Shift+T |

### Hook Interface

```typescript
const transform = useTransformableText({
  initialValue: '',
  onChange: (value) => { /* ... */ },
  enabled: true,
  defaultAgentId: 'brand-voice',
  fieldId: 'newsletter-teaser',
  minLength: 10,
});

// Returns
{
  value,
  setValue,
  inputProps,           // Spread on textarea
  transformState: {
    isOpen,
    isLoading,
    options,
    selectedAgentId,
    error,
  },
  openTransformPanel,
  closeTransformPanel,
  applyTransformation,
  requestTransformations,
  regenerateTransformations,
}
```

## Backend Components

### Files to Create

| File | Purpose |
|------|---------|
| `migrations/000012_voice_agents.up.sql` | Database schema |
| `migrations/000012_voice_agents.down.sql` | Rollback |
| `internal/domain/voice_agent.go` | Domain models |
| `internal/repository/voice_agent_repository.go` | PostgreSQL CRUD |
| `internal/repository/transformation_repository.go` | Audit log |
| `internal/service/voice_agent_service.go` | Agent management |
| `internal/service/transformation_service.go` | Core transform logic |
| `internal/api/handlers/voice_agent_handler.go` | HTTP handlers |
| `pkg/sanitizer/llm_sanitizer.go` | Prompt injection defense |
| `internal/llm/mock_client.go` | Test fixtures |

### Files to Modify

| File | Change |
|------|--------|
| `internal/api/routes.go` | Add voice agent routes |
| `cmd/server/main.go` | Wire up services |
| `internal/middleware/ratelimit.go` | Add transform limits |

## Implementation Phases

### Phase 0: Pre-Development
- Define all DTOs with validation
- Design prompt injection sanitization
- Create LLM mock fixtures
- Design loading/error UX mockups

### Phase 1: Backend Foundation (Days 1-3)
- Create database migration
- Implement domain models
- Implement repositories
- Create VoiceAgentService (CRUD)
- Seed 4 default voice agents

### Phase 2: Transformation Service (Days 4-6)
- Implement TransformationService with errgroup
- Add prompt injection sanitizer
- Integrate with llm.ClientAdapter
- Add structured logging (zerolog)
- Add OpenTelemetry spans

### Phase 3: Backend API (Days 7-8)
- Implement VoiceAgentHandler
- Add rate limiting middleware
- Register routes
- Wire up in main.go
- Add feature flag check

### Phase 4: Frontend Core (Days 9-12)
- Create VoiceTransformationContext
- Implement useTransformableText hook
- Build TransformableTextarea
- Create VoiceTransformationPanel
- Add loading skeleton
- Add error handling

### Phase 5: Integration & Testing (Days 13-15)
- Integrate with ClaimForm
- Add keyboard shortcut (configurable)
- E2E tests with console error capture
- API integration tests
- LLM mock tests

### Phase 6: Admin UI (Deferred)
- VoiceAgentsPage
- VoiceAgentForm
- Preview capability

## Testing Requirements

### E2E Test Pattern (Per CLAUDE.md)

```typescript
const consoleErrors: string[] = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

const [response] = await Promise.all([
  page.waitForResponse(r =>
    r.url().includes('/v1/transform') &&
    r.request().method() === 'POST'
  ),
  page.click('[data-testid="transform-button"]')
]);

expect(response.status()).toBe(200);
const data = await response.json();
expect(data.data.options).toHaveLength(3);
expect(consoleErrors).toHaveLength(0);
```

### Test Coverage Requirements

| Area | Required Tests |
|------|----------------|
| **Unit** | Sanitizer patterns, prompt building, validation |
| **Integration** | API endpoints, rate limiting, auth |
| **E2E** | Transform flow, error handling, keyboard shortcuts |
| **Security** | Prompt injection attempts |

## Verification Commands

```bash
# Backend tests
cd aci-backend
go test ./internal/service/... -run TestVoiceAgent -v
go test ./internal/service/... -run TestTransformation -v
go test ./pkg/sanitizer/... -v

# Frontend tests
cd aci-frontend
npm run test -- --grep "VoiceTransformation"
npm run test:e2e -- --grep "voice transformation"

# API verification
curl http://localhost:8080/v1/voice-agents/active
```

## Acceptance Criteria

- [ ] Users can invoke transformation via magic wand button on any textarea
- [ ] System generates 3 transformation options (conservative, moderate, bold)
- [ ] Users can compare options side-by-side and apply selected version
- [ ] Transformation is audited with original text, selected version, and user
- [ ] Rate limiting enforces 30 transforms/hour per user
- [ ] Prompt injection attempts are blocked and logged
- [ ] LLM unavailability shows graceful error with retry option
- [ ] Admin users can manage voice agent definitions
- [ ] All E2E tests pass with zero console errors

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM latency (2-5s) | Parallel calls (errgroup), loading skeleton |
| Prompt injection | Sanitization layer, pattern detection |
| Token costs | Rate limiting (30/hr), token estimation |
| JSON parsing failures | Retry logic, structured output prompts |
| Feature failure | Feature flag kill switch |

## References

- [Approved Plan](/Users/phillipboles/.claude/plans/breezy-yawning-yeti.md)
- [12-Agent Debate Output](/Users/phillipboles/.claude/plans/breezy-yawning-yeti-agent-a97468f.md)
- [Brand Guidelines](../docs/brand-guidelines.md)

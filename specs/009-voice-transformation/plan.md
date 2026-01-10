# Implementation Plan: Voice Transformation System

**Branch**: `009-voice-transformation` | **Date**: 2026-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-voice-transformation/spec.md`

## Summary

Build a multi-agent text transformation system that rewrites content in configurable voices (Brand Voice, SME Voice, Compliance Voice, Voice of Customer). Users invoke transformation via magic wand button, keyboard shortcut (Ctrl+Shift+T), or context menu. System generates 3 transformation options at different temperature levels (Conservative 0.3, Moderate 0.5, Bold 0.7) for side-by-side comparison using parallel LLM calls.

## Technical Context

**Language/Version**: Go 1.24 (backend), TypeScript 5.9 (frontend)
**Primary Dependencies**: Chi v5.2, React 19, TanStack Query v5, shadcn/ui
**Storage**: PostgreSQL 16, Redis 7 (rate limiting)
**Testing**: Go testing + testify, Vitest (unit), Playwright (E2E)
**Target Platform**: Kubernetes (OKE), Docker containers
**Project Type**: Web application (frontend + backend)
**Performance Goals**: <5s transformation response, 100 concurrent requests
**Constraints**: 30 transforms/hour rate limit, 10-10000 character input
**Scale/Scope**: Multi-tenant, 4 default voice agents, audit trail

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Project Bounds | ✅ Pass | Within existing aci-backend/aci-frontend |
| II. Parallel Execution | ✅ Pass | Wave-based structure allows parallelism |
| III. Parallel Structure | ✅ Pass | Backend/Frontend can develop in parallel after contracts |
| IV. Lean Increments | ✅ Pass | P1 features first, then P2/P3 |
| V. Artifact Traceability | ✅ Pass | Spec → Plan → Tasks → Code |
| VI. Contract-First | ✅ Pass | OpenAPI contracts in Phase 1 |
| VII. Backend-First | ✅ Pass | API before UI implementation |
| VIII. Test-First | ✅ Pass | Tests written before implementation |
| IX. Wiring Tests | ✅ Pass | Router integration tests verify handler registration |
| X. Test Completeness | ✅ Pass | Unit + Integration + E2E coverage |
| XI. Deterministic Tests | ✅ Pass | Mocked LLM responses for tests |
| XII. Quality Gates | ✅ Pass | Review agents after each wave |
| XIII. API-First | ✅ Pass | REST endpoints defined before UI |
| XIV. Configuration | ✅ Pass | Environment variables, no hardcoded values |
| XV. Observability | ✅ Pass | OpenTelemetry spans, zerolog structured logging |
| XVI. PM Ownership | ✅ Pass | PM gates at pre/mid/post implementation |
| XVII. Post-Wave Review | ✅ Pass | 6 reviewers per wave |
| XVIII. Design Tokens | ✅ Pass | Using existing CSS variables |
| XIX. Playwright E2E | ✅ Pass | Deep behavior verification required |

## PM Review Gates

*Per Constitution Principle XVI - Product Manager Ownership*

| Gate | Phase | Status | Reviewer | Date |
|------|-------|--------|----------|------|
| **PM-1** | Pre-Implementation | [ ] Pending | | |
| **PM-2** | Mid-Implementation | [ ] Pending | | |
| **PM-3** | Pre-Release | [ ] Pending | | |

## Post-Wave Review (MANDATORY)

*Per Constitution Principle XVII - Post-Wave Review & Quality Assurance (NON-NEGOTIABLE)*

**After EVERY wave completion, ALL of the following agents MUST review:**

| Reviewer | Agent | Focus Area | Required |
|----------|-------|------------|----------|
| Product Manager | `product-manager-agent` | Business alignment, user value, scope compliance | YES |
| UI Designer | `ui-ux-designer` | Visual design, layout, component consistency | YES |
| UX Designer | `ux-designer` | Usability, user flows, accessibility | YES |
| Visualization | `reviz-visualization` | Charts, graphs, data visualization quality | YES (if applicable) |
| Code Reviewer | `code-reviewer` | Code quality, patterns, maintainability | YES |
| Security Reviewer | `security-reviewer` | Security vulnerabilities, OWASP compliance | YES |

**Requirements:**
- All 6 reviewers must complete review before wave is marked complete
- All task ratings must be ≥ 5 for wave to pass
- Checklist sign-offs required per spec requirements
- Wave summary report created in `specs/009-voice-transformation/wave-reports/wave-N-report.md`

**PM-1 Deliverables** (Required before Phase 2):
- [ ] Approved spec with prioritized backlog
- [ ] Success metrics defined
- [ ] Gap analysis completed (Critical items addressed)
- [ ] pm-review.md created in `specs/009-voice-transformation/`

**PM-2 Deliverables** (Required at Phase 3 midpoint):
- [ ] Feature completeness check
- [ ] Scope validation (no creep)
- [ ] Risk assessment updated

**PM-3 Deliverables** (Required before deployment):
- [ ] UAT sign-off
- [ ] Launch readiness confirmed
- [ ] Documentation approval
- [ ] Product verification checklist completed (60+ items)

## Project Structure

### Documentation (this feature)

```text
specs/009-voice-transformation/
├── plan.md              # This file
├── research.md          # Phase 0 output (complete)
├── data-model.md        # Phase 1 output (complete)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output - OpenAPI specs
│   ├── voice-agents.yaml
│   └── transformations.yaml
├── checklists/
│   └── requirements.md  # Specification quality checklist
├── wave-reports/        # Post-wave review reports
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
aci-backend/
├── internal/
│   ├── domain/
│   │   └── voice/           # Voice agent domain types
│   │       ├── agent.go
│   │       ├── rule.go
│   │       ├── example.go
│   │       └── transformation.go
│   ├── repository/
│   │   └── voice/           # Database operations
│   │       ├── agent_repo.go
│   │       ├── agent_repo_test.go
│   │       └── transformation_repo.go
│   ├── service/
│   │   └── voice/           # Business logic
│   │       ├── agent_service.go
│   │       ├── transform_service.go
│   │       ├── sanitizer.go
│   │       └── llm_client.go
│   ├── api/
│   │   └── handlers/
│   │       ├── voice_agent_handler.go
│   │       ├── transform_handler.go
│   │       └── voice_routes.go
│   └── middleware/
│       └── ratelimit.go
├── migrations/
│   └── 000012_voice_agents.up.sql
└── tests/
    ├── unit/
    ├── integration/
    │   └── voice_routes_test.go  # Wiring tests
    └── contract/

aci-frontend/
├── src/
│   ├── api/
│   │   └── voice.ts             # API client
│   ├── components/
│   │   └── voice/
│   │       ├── TransformButton.tsx
│   │       ├── TransformPanel.tsx
│   │       ├── TransformOption.tsx
│   │       └── AgentSelector.tsx
│   ├── contexts/
│   │   └── VoiceTransformContext.tsx
│   ├── hooks/
│   │   ├── useVoiceAgents.ts
│   │   └── useTransformation.ts
│   └── pages/
│       └── admin/
│           └── VoiceAgentsPage.tsx
└── tests/
    └── e2e/
        └── voice-transformation.spec.ts
```

**Structure Decision**: Web application structure with separate backend (`aci-backend/`) and frontend (`aci-frontend/`) directories matching existing codebase patterns.

## Test Coverage Strategy

### Test Pyramid

| Level | Coverage | Tools | Purpose |
|-------|----------|-------|---------|
| **Unit** | Domain logic, services | Go testing, Vitest | Business rules isolation |
| **Integration** | Repository + DB, API routes | testcontainers | Database operations |
| **Wiring** | Handler ↔ Router connection | Go testing | Verify route registration |
| **Contract** | API request/response | Go testing | OpenAPI compliance |
| **E2E** | Full user flows | Playwright | Behavior verification |

### Wiring Tests (MANDATORY)

Wiring tests verify that handlers are properly registered with the router. This catches issues where:
- Handler methods exist but aren't wired to routes
- Routes point to wrong handlers
- Middleware isn't applied correctly

**Pattern for Go Chi Router:**

```go
// tests/integration/voice_routes_test.go
package integration

import (
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/go-chi/chi/v5"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestVoiceAgentRoutes_AreWired(t *testing.T) {
    // Setup router with actual handlers
    r := chi.NewRouter()
    handler := NewVoiceAgentHandler(mockService)
    RegisterVoiceRoutes(r, handler)

    tests := []struct {
        name       string
        method     string
        path       string
        wantStatus int // Expected status (not 404/405 = wired correctly)
    }{
        {"List agents", "GET", "/v1/voice-agents", http.StatusOK},
        {"Get agent", "GET", "/v1/voice-agents/123", http.StatusOK},
        {"Create agent", "POST", "/v1/voice-agents", http.StatusCreated},
        {"Update agent", "PUT", "/v1/voice-agents/123", http.StatusOK},
        {"Delete agent", "DELETE", "/v1/voice-agents/123", http.StatusNoContent},
        {"Transform text", "POST", "/v1/voice-agents/123/transform", http.StatusOK},
        {"Select transform", "POST", "/v1/transformations/select", http.StatusCreated},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(tt.method, tt.path, nil)
            rec := httptest.NewRecorder()

            r.ServeHTTP(rec, req)

            // Route exists if we don't get 404 (Not Found) or 405 (Method Not Allowed)
            assert.NotEqual(t, http.StatusNotFound, rec.Code,
                "Route %s %s is not registered", tt.method, tt.path)
            assert.NotEqual(t, http.StatusMethodNotAllowed, rec.Code,
                "Method %s not allowed for %s", tt.method, tt.path)
        })
    }
}

func TestVoiceAgentRoutes_MiddlewareApplied(t *testing.T) {
    r := chi.NewRouter()
    handler := NewVoiceAgentHandler(mockService)
    RegisterVoiceRoutes(r, handler)

    // Test that auth middleware is applied
    req := httptest.NewRequest("GET", "/v1/voice-agents", nil)
    // No auth header
    rec := httptest.NewRecorder()

    r.ServeHTTP(rec, req)

    assert.Equal(t, http.StatusUnauthorized, rec.Code,
        "Auth middleware not applied to voice agent routes")
}

func TestVoiceAgentRoutes_RateLimitApplied(t *testing.T) {
    r := chi.NewRouter()
    handler := NewVoiceAgentHandler(mockService)
    RegisterVoiceRoutes(r, handler)

    // Make requests up to rate limit
    for i := 0; i < 31; i++ {
        req := httptest.NewRequest("POST", "/v1/voice-agents/123/transform", nil)
        req.Header.Set("Authorization", "Bearer valid-token")
        rec := httptest.NewRecorder()
        r.ServeHTTP(rec, req)

        if i >= 30 {
            assert.Equal(t, http.StatusTooManyRequests, rec.Code,
                "Rate limit not applied after 30 requests")
        }
    }
}
```

**Pattern for Frontend API Client:**

```typescript
// tests/integration/voice-api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { voiceApi } from '@/api/voice';

describe('Voice API Client Wiring', () => {
  it('listAgents calls correct endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }))
    );

    await voiceApi.listAgents();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/v1/voice-agents'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('transform calls correct endpoint with agent ID', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { options: [] } }))
    );

    await voiceApi.transform('agent-123', 'sample text');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/v1/voice-agents/agent-123/transform'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
```

## Implementation Phases

### Phase 0: Research ✅ COMPLETE

See [research.md](./research.md) for resolved technical decisions:
- LLM integration patterns (errgroup for parallel calls)
- Prompt injection defense (3-layer defense)
- Rate limiting strategies (sliding window with Redis)
- LLM client adapter pattern
- Keyboard shortcut implementation
- Mobile sheet vs popover strategy
- Default voice agent seed data
- Audit trail schema design

### Phase 1: Design & Contracts ✅ COMPLETE

**Deliverables:**
- [x] Data model documentation (`data-model.md`)
- [x] OpenAPI contracts (`contracts/voice-agents.yaml`, `contracts/transformations.yaml`)
- [x] Quickstart guide (`quickstart.md`)

### Phase 2: Task Generation

**Deliverables:**
- [ ] Task list (`tasks.md`) via `/speckit.tasks`
- [ ] PM-1 review and approval

### Phase 3: Backend Implementation

#### Wave 3.1: Database & Domain (Parallel-Safe)

| Task | Type | Dependencies |
|------|------|--------------|
| Create migration 000012_voice_agents.up.sql | Migration | None |
| Implement VoiceAgent domain types | Domain | None |
| Implement StyleRule domain types | Domain | None |
| Implement Example domain types | Domain | None |
| Implement TextTransformation domain types | Domain | None |
| Write domain unit tests | Test | Domain types |
| Create wiring test skeleton | Test | None |

#### Wave 3.2: Repository Layer

| Task | Type | Dependencies |
|------|------|--------------|
| Implement VoiceAgentRepository | Repository | Migration, Domain |
| Implement TransformationRepository | Repository | Migration, Domain |
| Write repository integration tests | Test | Repositories |
| Seed default voice agents | Data | Migration |

#### Wave 3.3: Service Layer

| Task | Type | Dependencies |
|------|------|--------------|
| Implement LLMClient interface | Service | None |
| Implement OpenRouterLLMClient | Service | LLMClient |
| Implement InputSanitizer | Service | None |
| Implement VoiceAgentService | Service | Repository |
| Implement TransformationService | Service | Repository, LLMClient, Sanitizer |
| Write service unit tests with mocks | Test | Services |

#### Wave 3.4: API Layer

| Task | Type | Dependencies |
|------|------|--------------|
| Implement VoiceAgentHandler | Handler | Service |
| Implement TransformHandler | Handler | Service |
| Register routes in voice_routes.go | Router | Handlers |
| Add rate limiting middleware | Middleware | None |
| Write handler unit tests | Test | Handlers |
| Write wiring integration tests | Test | Router, Handlers |
| Write contract tests | Test | OpenAPI spec |

### Phase 4: Frontend Implementation

#### Wave 4.1: API & State

| Task | Type | Dependencies |
|------|------|--------------|
| Create voice API client | API | OpenAPI spec |
| Create VoiceTransformContext | Context | API client |
| Create useVoiceAgents hook | Hook | Context |
| Create useTransformation hook | Hook | Context |
| Write API client wiring tests | Test | API client |
| Write hook unit tests | Test | Hooks |

#### Wave 4.2: Components

| Task | Type | Dependencies |
|------|------|--------------|
| Create TransformButton component | Component | Hooks |
| Create AgentSelector component | Component | Hooks |
| Create TransformOption component | Component | None |
| Create TransformPanel (desktop popover) | Component | TransformOption |
| Create TransformSheet (mobile) | Component | TransformOption |
| Write component unit tests | Test | Components |

#### Wave 4.3: Integration

| Task | Type | Dependencies |
|------|------|--------------|
| Add TransformButton to text fields | Integration | Components |
| Implement keyboard shortcut handler | Feature | Context |
| Create VoiceAgentsPage (admin) | Page | Components |
| Add route to admin section | Router | Page |
| Write Playwright E2E tests | Test | Full integration |

### Phase 5: Quality Gates

| Gate | Command | Pass Criteria |
|------|---------|---------------|
| Backend Build | `cd aci-backend && go build ./...` | Zero errors |
| Backend Tests | `cd aci-backend && go test ./...` | 100% pass |
| Backend Lint | `cd aci-backend && golangci-lint run` | Zero warnings |
| Wiring Tests | `cd aci-backend && go test ./tests/integration/...` | All routes verified |
| Frontend Build | `cd aci-frontend && npm run build` | Zero errors |
| Frontend Tests | `cd aci-frontend && npm run test` | 100% pass |
| Frontend Lint | `cd aci-frontend && npm run lint` | Zero warnings |
| E2E Tests | `cd aci-frontend && npm run test:e2e` | 100% pass |
| Security Review | `security-reviewer` agent | Zero high/critical |
| Code Review | `code-reviewer` agent | All findings addressed |

### Phase 6: Deployment

| Task | Dependencies |
|------|--------------|
| Update ConfigMap with new env vars | Quality gates pass |
| Build and push Docker images | Quality gates pass |
| Apply Kubernetes manifests | Images available |
| Run smoke tests | Deployment complete |
| PM-3 sign-off | Smoke tests pass |

## Complexity Tracking

> No constitution violations requiring justification.

## Quality Gate Commands

```bash
# Backend
cd aci-backend
go build ./...
go test ./...
go test ./tests/integration/... -v  # Wiring tests
golangci-lint run

# Frontend
cd aci-frontend
npm run build
npm run test
npm run lint
npm run test:e2e

# Full validation
npm run test:e2e -- --grep "voice transformation"
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM latency exceeds 5s | Parallel calls, loading skeleton, timeout handling |
| Prompt injection bypass | 3-layer defense, logging, regular pattern updates |
| Rate limit frustration | Clear messaging, consider tier adjustments |
| Handler/route mismatch | Wiring tests catch registration issues early |
| Inconsistent transformation quality | Before/after examples, admin-tunable params |

## References

- [Specification](./spec.md)
- [Research](./research.md)
- [Data Model](./data-model.md)
- [Original Technical Spec](../009-brand-voice.md)

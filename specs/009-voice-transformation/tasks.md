# Tasks: Voice Transformation System

**Input**: Design documents from `/specs/009-voice-transformation/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Included per CLAUDE.md deep E2E testing requirements and constitution Test-First principle.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Task Completion Tracking (MANDATORY)

*Per Constitution Principle XVII - Post-Wave Review & Quality Assurance (NON-NEGOTIABLE)*

**Each completed task MUST include:**

| Field | Description | Example |
|-------|-------------|---------|
| **Status** | DONE or FAILED_REVIEW | DONE |
| **Reviewer** | Agent that reviewed | `code-reviewer` |
| **Rating** | 1-10 quality score | 8 |
| **Notes** | Review findings | "Clean implementation, minor refactor suggested" |

**Rating Scale:**
- 9-10: Excellent - Exemplary implementation
- 7-8: Good - Meets all requirements with minor suggestions
- 5-6: Acceptable - Meets minimum requirements, improvements needed
- 3-4: Below Standard - Significant issues requiring rework
- 1-2: Unacceptable - Major defects, must be redone

**CRITICAL**: Wave is NOT complete until ALL tasks have ratings ≥ 5

## Path Conventions

- **Backend**: `aci-backend/internal/` (Go 1.24)
- **Frontend**: `aci-frontend/src/` (TypeScript/React 19)
- **Migrations**: `aci-backend/migrations/`
- **Backend Tests**: `aci-backend/tests/`
- **Frontend Tests**: `aci-frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, database schema, and base infrastructure

- [ ] T001 Create database migration in `aci-backend/migrations/000012_voice_agents.up.sql`
- [ ] T002 [P] Create migration rollback in `aci-backend/migrations/000012_voice_agents.down.sql`
- [ ] T003 Run migration and verify schema in database
- [ ] T004 [P] Create seed script for default voice agents in `aci-backend/scripts/seed-voice-agents.sql`
- [ ] T005 [P] Add environment variables to `deployments/k8s/configmap.yaml` (OPENROUTER_API_KEY, rate limit config)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain types and infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete AND PM-1 gate passes

### Domain Types (Backend)

- [ ] T006 [P] Create VoiceAgent domain type in `aci-backend/internal/domain/voice/agent.go`
- [ ] T007 [P] Create StyleRule domain type in `aci-backend/internal/domain/voice/rule.go`
- [ ] T008 [P] Create TransformationExample domain type in `aci-backend/internal/domain/voice/example.go`
- [ ] T009 [P] Create TextTransformation domain type in `aci-backend/internal/domain/voice/transformation.go`
- [ ] T010 [P] Create TransformRequest/TransformResponse types in `aci-backend/internal/domain/voice/transform_types.go`
- [ ] T011 Write domain type unit tests in `aci-backend/internal/domain/voice/agent_test.go`

### Repository Layer (Backend)

- [ ] T012 [P] Create VoiceAgentRepository interface in `aci-backend/internal/repository/voice/interfaces.go`
- [ ] T013 [P] Create TransformationRepository interface in `aci-backend/internal/repository/voice/interfaces.go`
- [ ] T014 Implement VoiceAgentRepository in `aci-backend/internal/repository/voice/agent_repo.go`
- [ ] T015 Implement TransformationRepository in `aci-backend/internal/repository/voice/transformation_repo.go`
- [ ] T016 Write repository integration tests in `aci-backend/internal/repository/voice/agent_repo_test.go`

### Service Infrastructure (Backend)

- [ ] T017 [P] Create LLMClient interface in `aci-backend/internal/service/voice/llm_client.go`
- [ ] T018 Implement OpenRouterLLMClient in `aci-backend/internal/service/voice/openrouter_client.go`
- [ ] T019 [P] Implement InputSanitizer with injection patterns in `aci-backend/internal/service/voice/sanitizer.go`
- [ ] T020 Write sanitizer unit tests in `aci-backend/internal/service/voice/sanitizer_test.go`
- [ ] T021 [P] Create MockLLMClient for testing in `aci-backend/internal/service/voice/mock_llm_client.go`

### Rate Limiting (Backend)

- [ ] T022 [P] Implement rate limiting middleware in `aci-backend/internal/middleware/ratelimit.go`
- [ ] T023 Write rate limiting middleware tests in `aci-backend/internal/middleware/ratelimit_test.go`

### TypeScript Types (Frontend)

- [ ] T024 [P] Create VoiceAgent types in `aci-frontend/src/types/voice.ts`
- [ ] T025 [P] Create Transform request/response types in `aci-frontend/src/types/voice.ts`

### Wiring Test Infrastructure

- [ ] T026 Create wiring test skeleton in `aci-backend/tests/integration/voice_routes_test.go`

### PM-1 Gate (Required before Phase 3)

*Per Constitution Principle XVI - Product Manager Ownership*

- [ ] T027 PM-1: Verify spec approval with prioritized backlog
- [ ] T028 PM-1: Confirm success metrics defined and measurable
- [ ] T029 PM-1: Verify gap analysis completed (Critical items addressed)
- [ ] T030 PM-1: Ensure pm-review.md exists in `specs/009-voice-transformation/`
- [ ] T031 PM-1: Obtain PM sign-off for user story implementation

**Checkpoint**: Foundation ready AND PM-1 passed - user story implementation can now begin

---

## Phase 3: User Story 1 - Transform Marketing Text with Brand Voice (Priority: P1) 🎯 MVP

**Goal**: Users can transform text using a voice agent and select from 3 options

**Independent Test**: Click magic wand → select agent → see 3 options → apply one → verify text replaced

### Tests for User Story 1

- [ ] T032 [P] [US1] Contract test for POST /voice-agents/{id}/transform in `aci-backend/tests/contract/transform_test.go`
- [ ] T033 [P] [US1] Contract test for POST /transformations/select in `aci-backend/tests/contract/transform_test.go`
- [ ] T034 [P] [US1] Wiring test for transform routes in `aci-backend/tests/integration/voice_routes_test.go`
- [ ] T035 [P] [US1] E2E test for transformation flow in `aci-frontend/tests/e2e/voice-transformation.spec.ts`

### Backend Implementation for User Story 1

- [ ] T036 [US1] Implement VoiceAgentService (list active, get by ID) in `aci-backend/internal/service/voice/agent_service.go`
- [ ] T037 [US1] Implement TransformationService with parallel LLM calls in `aci-backend/internal/service/voice/transform_service.go`
- [ ] T038 [US1] Write TransformationService unit tests in `aci-backend/internal/service/voice/transform_service_test.go`
- [ ] T039 [US1] Implement VoiceAgentHandler (ListAgents, GetAgent) in `aci-backend/internal/api/handlers/voice_agent_handler.go`
- [ ] T040 [US1] Implement TransformHandler (Transform, SelectTransformation) in `aci-backend/internal/api/handlers/transform_handler.go`
- [ ] T041 [US1] Register voice routes in `aci-backend/internal/api/handlers/voice_routes.go`
- [ ] T042 [US1] Write handler unit tests in `aci-backend/internal/api/handlers/voice_agent_handler_test.go`
- [ ] T043 [US1] Run wiring tests to verify route registration

### Frontend Implementation for User Story 1

- [ ] T044 [P] [US1] Create voice API client in `aci-frontend/src/api/voice.ts`
- [ ] T045 [P] [US1] Create VoiceTransformContext in `aci-frontend/src/contexts/VoiceTransformContext.tsx`
- [ ] T046 [US1] Create useVoiceAgents hook in `aci-frontend/src/hooks/useVoiceAgents.ts`
- [ ] T047 [US1] Create useTransformation hook in `aci-frontend/src/hooks/useTransformation.ts`
- [ ] T048 [P] [US1] Create TransformOption component in `aci-frontend/src/components/voice/TransformOption.tsx`
- [ ] T049 [P] [US1] Create AgentSelector component in `aci-frontend/src/components/voice/AgentSelector.tsx`
- [ ] T050 [US1] Create TransformPanel (desktop popover) in `aci-frontend/src/components/voice/TransformPanel.tsx`
- [ ] T051 [US1] Create TransformSheet (mobile) in `aci-frontend/src/components/voice/TransformSheet.tsx`
- [ ] T052 [US1] Create TransformButton component in `aci-frontend/src/components/voice/TransformButton.tsx`
- [ ] T053 [US1] Write API client wiring tests in `aci-frontend/tests/integration/voice-api.test.ts`
- [ ] T054 [US1] Write component unit tests in `aci-frontend/tests/unit/voice/`
- [ ] T055 [US1] Add TransformButton to ClaimForm in `aci-frontend/src/components/newsletter/claims/ClaimForm.tsx`
- [ ] T056 [US1] Run E2E tests to verify full flow

**Checkpoint**: User Story 1 complete - users can transform text with any voice agent

---

## Phase 4: User Story 2 - Quick Transform with Keyboard Shortcut (Priority: P1)

**Goal**: Power users can trigger transformation with Ctrl+Shift+T keyboard shortcut

**Independent Test**: Focus on text field → press Ctrl+Shift+T → panel opens

### Tests for User Story 2

- [ ] T057 [P] [US2] E2E test for keyboard shortcut in `aci-frontend/tests/e2e/voice-transformation.spec.ts`
- [ ] T058 [P] [US2] Unit test for keyboard handler in `aci-frontend/tests/unit/voice/keyboard-handler.test.ts`

### Implementation for User Story 2

- [ ] T059 [US2] Implement keyboard shortcut handler in VoiceTransformContext `aci-frontend/src/contexts/VoiceTransformContext.tsx`
- [ ] T060 [US2] Add shortcut configuration to localStorage in `aci-frontend/src/contexts/VoiceTransformContext.tsx`
- [ ] T061 [US2] Add focus detection for active text field in `aci-frontend/src/contexts/VoiceTransformContext.tsx`
- [ ] T062 [US2] Run E2E tests to verify keyboard flow

**Checkpoint**: User Story 2 complete - keyboard shortcut works on text fields

---

## Phase 5: User Story 3 - Admin Manages Voice Agents (Priority: P2)

**Goal**: Administrators can create, edit, and delete voice agent configurations

**Independent Test**: Login as admin → navigate to voice agents page → CRUD operations work

### Tests for User Story 3

- [ ] T063 [P] [US3] Contract tests for voice agent CRUD in `aci-backend/tests/contract/voice_agent_test.go`
- [ ] T064 [P] [US3] Contract tests for style rules CRUD in `aci-backend/tests/contract/style_rules_test.go`
- [ ] T065 [P] [US3] Contract tests for examples CRUD in `aci-backend/tests/contract/examples_test.go`
- [ ] T066 [P] [US3] Wiring tests for admin routes in `aci-backend/tests/integration/voice_routes_test.go`
- [ ] T067 [P] [US3] E2E test for admin voice agent page in `aci-frontend/tests/e2e/admin-voice-agents.spec.ts`

### Backend Implementation for User Story 3

- [ ] T068 [US3] Add CRUD methods to VoiceAgentService in `aci-backend/internal/service/voice/agent_service.go`
- [ ] T069 [US3] Implement StyleRuleService in `aci-backend/internal/service/voice/rule_service.go`
- [ ] T070 [US3] Implement ExampleService in `aci-backend/internal/service/voice/example_service.go`
- [ ] T071 [US3] Add CRUD handlers to VoiceAgentHandler in `aci-backend/internal/api/handlers/voice_agent_handler.go`
- [ ] T072 [US3] Add StyleRuleHandler in `aci-backend/internal/api/handlers/style_rule_handler.go`
- [ ] T073 [US3] Add ExampleHandler in `aci-backend/internal/api/handlers/example_handler.go`
- [ ] T074 [US3] Register admin routes with auth middleware in `aci-backend/internal/api/handlers/voice_routes.go`
- [ ] T075 [US3] Write service unit tests in `aci-backend/internal/service/voice/agent_service_test.go`
- [ ] T076 [US3] Run wiring tests to verify admin routes

### Frontend Implementation for User Story 3

- [ ] T077 [P] [US3] Extend voice API client for admin operations in `aci-frontend/src/api/voice.ts`
- [ ] T078 [P] [US3] Create useVoiceAgentAdmin hook in `aci-frontend/src/hooks/useVoiceAgentAdmin.ts`
- [ ] T079 [P] [US3] Create VoiceAgentForm component in `aci-frontend/src/components/voice/admin/VoiceAgentForm.tsx`
- [ ] T080 [P] [US3] Create StyleRuleEditor component in `aci-frontend/src/components/voice/admin/StyleRuleEditor.tsx`
- [ ] T081 [P] [US3] Create ExampleEditor component in `aci-frontend/src/components/voice/admin/ExampleEditor.tsx`
- [ ] T082 [US3] Create VoiceAgentsPage in `aci-frontend/src/pages/admin/VoiceAgentsPage.tsx`
- [ ] T083 [US3] Add route to admin section in `aci-frontend/src/App.tsx`
- [ ] T084 [US3] Add link to admin sidebar in `aci-frontend/src/components/layout/AppSidebar.tsx`
- [ ] T085 [US3] Write component unit tests in `aci-frontend/tests/unit/voice/admin/`
- [ ] T086 [US3] Run E2E tests to verify admin flow

**Checkpoint**: User Story 3 complete - admins can manage voice agents

---

## Phase 6: User Story 4 - Technical Writer Uses SME Voice (Priority: P2)

**Goal**: Multiple voice agents available with distinct transformation styles

**Independent Test**: Transform same text with Brand Voice vs SME Voice → get different outputs

### Tests for User Story 4

- [ ] T087 [P] [US4] E2E test for agent switching in `aci-frontend/tests/e2e/voice-transformation.spec.ts`

### Implementation for User Story 4

- [ ] T088 [US4] Verify SME Voice agent exists in seed data
- [ ] T089 [US4] Add Compliance Voice agent to seed script in `aci-backend/scripts/seed-voice-agents.sql`
- [ ] T090 [US4] Add Voice of Customer agent to seed script in `aci-backend/scripts/seed-voice-agents.sql`
- [ ] T091 [US4] Verify agent selector shows all active agents
- [ ] T092 [US4] Run E2E tests to verify agent switching

**Checkpoint**: User Story 4 complete - multiple voice agents available

---

## Phase 7: User Story 5 - Track Transformation History (Priority: P3)

**Goal**: Audit trail of all transformations for compliance review

**Independent Test**: Perform transformations → view history → filter by user/date

### Tests for User Story 5

- [ ] T093 [P] [US5] Contract tests for GET /transformations in `aci-backend/tests/contract/transformation_history_test.go`
- [ ] T094 [P] [US5] E2E test for history viewing in `aci-frontend/tests/e2e/transformation-history.spec.ts`

### Backend Implementation for User Story 5

- [ ] T095 [US5] Add ListTransformations to TransformationService in `aci-backend/internal/service/voice/transform_service.go`
- [ ] T096 [US5] Add GetTransformation to TransformationService in `aci-backend/internal/service/voice/transform_service.go`
- [ ] T097 [US5] Implement TransformationHistoryHandler in `aci-backend/internal/api/handlers/transformation_history_handler.go`
- [ ] T098 [US5] Register history routes in `aci-backend/internal/api/handlers/voice_routes.go`
- [ ] T099 [US5] Write handler tests in `aci-backend/internal/api/handlers/transformation_history_handler_test.go`

### Frontend Implementation for User Story 5

- [ ] T100 [P] [US5] Extend voice API client for history in `aci-frontend/src/api/voice.ts`
- [ ] T101 [P] [US5] Create useTransformationHistory hook in `aci-frontend/src/hooks/useTransformationHistory.ts`
- [ ] T102 [P] [US5] Create TransformationHistoryTable component in `aci-frontend/src/components/voice/history/TransformationHistoryTable.tsx`
- [ ] T103 [US5] Create TransformationHistoryPage in `aci-frontend/src/pages/admin/TransformationHistoryPage.tsx`
- [ ] T104 [US5] Add route to admin section in `aci-frontend/src/App.tsx`
- [ ] T105 [US5] Run E2E tests to verify history flow

**Checkpoint**: User Story 5 complete - transformation history viewable

---

## Phase 8: PM-2 Gate Review

**Purpose**: Mid-implementation PM alignment check (Constitution Principle XVI)

**PM-2 Gate Deliverables**:
- [ ] T106 Feature completeness check - verify P1 stories functional
- [ ] T107 Scope validation - confirm no scope creep
- [ ] T108 Risk assessment - document implementation risks
- [ ] T109 PM-2 sign-off obtained (document in pm-review.md)

**Checkpoint**: PM-2 gate passed - proceed to polish phase

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T110 [P] Add ARIA labels and keyboard navigation to components
- [ ] T111 [P] Add focus management for transform panel open/close
- [ ] T112 [P] Add loading skeleton UI for transformation in progress
- [ ] T113 [P] Add error boundary to voice components
- [ ] T114 Add OpenTelemetry tracing spans to TransformationService
- [ ] T115 Add zerolog structured logging to voice handlers
- [ ] T116 [P] Run security review with security-reviewer agent
- [ ] T117 [P] Run code review with code-reviewer agent
- [ ] T118 Run full E2E test suite
- [ ] T119 Update quickstart.md with final verification steps

---

## Phase 10: PM-3 Gate & Release Verification

**Purpose**: Final PM verification before deployment (Constitution Principle XVI)

**PM-3 Gate Deliverables**:
- [ ] T120 UAT sign-off - all acceptance scenarios pass
- [ ] T121 User journey validation - end-to-end testing complete
- [ ] T122 Documentation approval - README, API docs, guides complete
- [ ] T123 Performance verification - <5s transformation response verified
- [ ] T124 Security validation - OWASP compliance verified
- [ ] T125 Product verification checklist completed (60+ items)
- [ ] T126 PM-3 sign-off obtained (document in pm-review.md)

**Checkpoint**: PM-3 gate passed - ready for production deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 - can run in parallel after Foundational
  - US3 and US4 are both P2 - can run in parallel after US1/US2
  - US5 is P3 - can run after US3/US4
- **Polish (Phase 9)**: Depends on all user stories being complete
- **Release (Phase 10)**: Depends on Polish completion

### User Story Dependencies

```
Setup (Phase 1)
    ↓
Foundational (Phase 2)
    ↓
    ├── US1: Transform Text (P1) ──┬──→ US3: Admin CRUD (P2) ──┬──→ US5: History (P3)
    │                              │                           │
    └── US2: Keyboard (P1) ────────┴──→ US4: Multi-Agent (P2) ─┘
```

- **User Story 1 (P1)**: Core transformation - no dependencies on other stories
- **User Story 2 (P1)**: Keyboard shortcut - no dependencies, can parallel with US1
- **User Story 3 (P2)**: Admin CRUD - builds on US1 foundation
- **User Story 4 (P2)**: Multi-agent - builds on US1 foundation
- **User Story 5 (P3)**: History - requires transformation data from US1

### Within Each User Story

- Tests written and verified to FAIL before implementation
- Models/types before services
- Services before handlers
- Backend before frontend (API must exist)
- Core implementation before integration points
- Story complete with passing tests before next story

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T001 (migration) ──→ T003 (run migration)
T002 (rollback) [P]
T004 (seed script) [P]
T005 (env vars) [P]
```

**Phase 2 (Foundational)**:
```
T006-T010 (domain types) [P] ──→ T011 (domain tests)
T012-T013 (repo interfaces) [P] ──→ T014-T015 (repo impl) ──→ T016 (repo tests)
T017 (LLM interface) ──→ T018 (OpenRouter impl)
T019-T021 (sanitizer, mock) [P] ──→ T020 (sanitizer tests)
T022-T026 (middleware, types, wiring) [P]
```

**Phase 3 (US1)**:
```
T032-T035 (all tests) [P] ──→ T036-T037 (services) ──→ T039-T041 (handlers) ──→ T043 (wiring)
T044-T045 (API, context) [P] ──→ T046-T047 (hooks) ──→ T048-T051 (components) [P] ──→ T055-T056 (integration)
```

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "T032 Contract test for POST /voice-agents/{id}/transform"
Task: "T033 Contract test for POST /transformations/select"
Task: "T034 Wiring test for transform routes"
Task: "T035 E2E test for transformation flow"

# Launch all parallelizable frontend components:
Task: "T048 Create TransformOption component"
Task: "T049 Create AgentSelector component"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Transform Text)
4. Complete Phase 4: User Story 2 (Keyboard Shortcut)
5. **STOP and VALIDATE**: Test US1 and US2 independently
6. Deploy/demo if ready - this is the MVP!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Test independently → Deploy/Demo (MVP!)
3. Add US3 → Test independently → Admin can customize
4. Add US4 → Test independently → Multiple voices available
5. Add US5 → Test independently → Full audit trail
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With 3 developers after Foundational phase:

- **Developer A**: User Story 1 (Transform)
- **Developer B**: User Story 2 (Keyboard)
- **Developer C**: User Story 3 (Admin) - starts after A establishes patterns

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 126 |
| **Phase 1 (Setup)** | 5 |
| **Phase 2 (Foundational)** | 26 |
| **Phase 3 (US1 - Transform)** | 25 |
| **Phase 4 (US2 - Keyboard)** | 6 |
| **Phase 5 (US3 - Admin)** | 24 |
| **Phase 6 (US4 - Multi-Agent)** | 6 |
| **Phase 7 (US5 - History)** | 13 |
| **Phase 8 (PM-2)** | 4 |
| **Phase 9 (Polish)** | 10 |
| **Phase 10 (PM-3)** | 7 |
| **Parallelizable Tasks** | 54 |

**MVP Scope**: User Stories 1 + 2 (31 tasks after Foundational)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

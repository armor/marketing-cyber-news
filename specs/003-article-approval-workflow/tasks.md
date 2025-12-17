# Tasks: Article Approval Workflow

**Input**: Design documents from `/specs/003-article-approval-workflow/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/approval-api.yaml, research.md, quickstart.md
**Tech Stack**: Go 1.22+ (backend), TypeScript 5.9 (frontend), PostgreSQL 14+, React 19.2, TanStack Query v5

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## User Story Mapping

| ID | Story | Priority | Description |
|----|-------|----------|-------------|
| US1 | Marketing Approval | P1 | Marketing gate approval/rejection |
| US2 | Sequential Gate Progression | P1 | 5-gate sequential workflow |
| US3 | Article Release | P1 | Release fully-approved articles |
| US4 | Rejection from Pipeline | P2 | Reject with reason, remove from queue |
| US5 | Super Admin Override | P2 | Multi-gate approval power |
| US6 | Admin Role Management | P2 | Assign/change user roles |
| US7 | Approval Audit Trail | P3 | View approval history |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and domain type setup

- [ ] T001 [P] Create database migration file `aci-backend/migrations/000007_approval_workflow.up.sql`
- [ ] T002 [P] Create rollback migration file `aci-backend/migrations/000007_approval_workflow.down.sql`
- [ ] T003 [P] Create approval domain types in `aci-backend/internal/domain/approval.go`
- [ ] T004 [P] Create approval TypeScript types in `aci-frontend/src/types/approval.ts`
- [ ] T005 Run database migration in Kubernetes: `kubectl exec -n aci-backend deploy/postgres -- psql -U aci_user -d aci_db -f /migrations/000007_approval_workflow.up.sql`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

- [ ] T006 [P] Create approval repository interface in `aci-backend/internal/repository/approval_repository.go`
- [ ] T007 [P] Implement approval repository in `aci-backend/internal/repository/postgres/approval_repo.go`
- [ ] T008 [P] Create role authorization middleware in `aci-backend/internal/api/middleware/role_auth.go`
- [ ] T009 Create approval service with business logic in `aci-backend/internal/service/approval_service.go`
- [ ] T010 [P] Create approval DTOs in `aci-backend/internal/api/dto/approval_dto.go`
- [ ] T011 [P] Create approval API service in `aci-frontend/src/services/api/approvals.ts`
- [ ] T012 [P] Create approval TanStack Query hooks in `aci-frontend/src/hooks/useApprovalQueue.ts`
- [ ] T013 Register approval routes in `aci-backend/internal/api/router.go`

### PM-1 Gate (Required before Phase 3)

- [ ] T014 PM-1: Verify spec approval with prioritized backlog
- [ ] T015 PM-1: Confirm success metrics defined and measurable
- [ ] T016 PM-1: Verify gap analysis completed (Critical items addressed)
- [ ] T017 PM-1: Ensure pm-review.md exists in `specs/003-article-approval-workflow/`
- [ ] T018 PM-1: Obtain PM sign-off for user story implementation

**Checkpoint**: Foundation ready AND PM-1 passed - user story implementation can now begin

---

## Phase 3: User Story 1 - Marketing Approval (Priority: P1)

**Goal**: Marketing team can view queue and approve/reject articles at marketing gate

**Independent Test**: Login as marketing role, view pending articles, approve one, verify status changes to pending_branding

### Backend Implementation for US1

- [ ] T019 [P] [US1] Implement GET /api/v1/approvals/queue handler in `aci-backend/internal/api/handlers/approval_handler.go`
- [ ] T020 [P] [US1] Implement POST /api/v1/articles/{id}/approve handler in `aci-backend/internal/api/handlers/approval_handler.go`
- [ ] T021 [P] [US1] Implement POST /api/v1/articles/{id}/reject handler in `aci-backend/internal/api/handlers/approval_handler.go`
- [ ] T022 [US1] Add approval queue query to repository with status filter in `aci-backend/internal/repository/postgres/approval_repo.go`
- [ ] T023 [US1] Implement role-to-gate validation in approval service `aci-backend/internal/service/approval_service.go`
- [ ] T024 [US1] Add audit logging for approve/reject actions in `aci-backend/internal/service/approval_service.go`

### Frontend Implementation for US1

- [ ] T025 [P] [US1] Create ApprovalQueue component in `aci-frontend/src/components/approval/ApprovalQueue.tsx`
- [ ] T026 [P] [US1] Create ApprovalCard component in `aci-frontend/src/components/approval/ApprovalCard.tsx`
- [ ] T027 [P] [US1] Create ApproveButton with confirmation dialog in `aci-frontend/src/components/approval/ApproveButton.tsx`
- [ ] T028 [P] [US1] Create RejectButton with reason modal in `aci-frontend/src/components/approval/RejectButton.tsx`
- [ ] T029 [US1] Create ApprovalPage integrating queue and action components in `aci-frontend/src/pages/ApprovalPage.tsx`
- [ ] T030 [US1] Add /approvals route to App.tsx with role-based protection in `aci-frontend/src/App.tsx`

### Playwright E2E Tests for US1

- [ ] T031 [US1] Create Playwright test for marketing login and queue display in `aci-frontend/tests/e2e/approval-marketing.spec.ts`
- [ ] T032 [US1] Create Playwright test for approve action flow in `aci-frontend/tests/e2e/approval-marketing.spec.ts`
- [ ] T033 [US1] Create Playwright test for reject action with reason in `aci-frontend/tests/e2e/approval-marketing.spec.ts`

### Post-Wave 1 Review

- [ ] T034 [US1] Security review with `security-reviewer` agent
- [ ] T035 [US1] Code review with `code-reviewer` agent

**Checkpoint**: User Story 1 complete - Marketing approval workflow functional

---

## Phase 4: User Story 2 - Sequential Gate Progression (Priority: P1)

**Goal**: Articles progress through all 5 gates in sequence: Marketing → Branding → SOC L1 → SOC L3 → CISO

**Independent Test**: Complete marketing approval, login as branding, approve, verify status changes to pending_soc_l1

### Backend Implementation for US2

- [ ] T036 [US2] Implement status transition logic in approval service `aci-backend/internal/service/approval_service.go`
- [ ] T037 [US2] Add gate order validation (prevent skipping gates) in `aci-backend/internal/service/approval_service.go`
- [ ] T038 [US2] Create article_approvals record on each gate approval in `aci-backend/internal/repository/postgres/approval_repo.go`

### Frontend Implementation for US2

- [ ] T039 [P] [US2] Create ApprovalProgress component (green/yellow/gray gates) in `aci-frontend/src/components/approval/ApprovalProgress.tsx`
- [ ] T040 [US2] Update ApprovalCard to show progress indicator in `aci-frontend/src/components/approval/ApprovalCard.tsx`
- [ ] T041 [US2] Update queue hook to filter by user's role gate in `aci-frontend/src/hooks/useApprovalQueue.ts`

### Playwright E2E Tests for US2

- [ ] T042 [US2] Create Playwright test for full 5-gate progression in `aci-frontend/tests/e2e/approval-progression.spec.ts`
- [ ] T043 [US2] Create Playwright test for gate skip prevention (403 error) in `aci-frontend/tests/e2e/approval-progression.spec.ts`

### Post-Wave 2 Review

- [ ] T044 [US2] Security review with `security-reviewer` agent
- [ ] T045 [US2] Code review with `code-reviewer` agent

**Checkpoint**: User Story 2 complete - Full sequential gate progression working

---

## Phase 5: User Story 3 - Article Release (Priority: P1)

**Goal**: Admin/CISO/super_admin can release fully-approved articles for public viewing

**Independent Test**: Complete all 5 gates, login as admin, click Release, verify article visible to regular users

### Backend Implementation for US3

- [ ] T046 [US3] Implement POST /api/v1/articles/{id}/release handler in `aci-backend/internal/api/handlers/approval_handler.go`
- [ ] T047 [US3] Add release validation (must be in 'approved' status) in `aci-backend/internal/service/approval_service.go`
- [ ] T048 [US3] Update article query to filter by released status for public feed in `aci-backend/internal/repository/postgres/article_repo.go`

### Frontend Implementation for US3

- [ ] T049 [P] [US3] Create ReleaseButton component in `aci-frontend/src/components/approval/ReleaseButton.tsx`
- [ ] T050 [US3] Add release action to approved articles in ApprovalPage in `aci-frontend/src/pages/ApprovalPage.tsx`
- [ ] T051 [US3] Update threat list to only show released articles for non-admin users in `aci-frontend/src/pages/ThreatsPage.tsx`

### Playwright E2E Tests for US3

- [ ] T052 [US3] Create Playwright test for release action on fully-approved article in `aci-frontend/tests/e2e/approval-release.spec.ts`
- [ ] T053 [US3] Create Playwright test verifying released article visible to regular user in `aci-frontend/tests/e2e/approval-release.spec.ts`

### Post-Wave 3 Review

- [ ] T054 [US3] Security review with `security-reviewer` agent
- [ ] T055 [US3] Code review with `code-reviewer` agent

**Checkpoint**: User Story 3 complete - P1 stories all functional, MVP ready for demo

---

## Phase 6: User Story 4 - Rejection from Pipeline (Priority: P2)

**Goal**: Any approver can reject articles with mandatory reason, removing them from all queues

**Independent Test**: Login as SOC L3, reject an article, verify it disappears from all queues and shows rejection reason

### Backend Implementation for US4

- [ ] T056 [US4] Implement rejection with mandatory reason validation in `aci-backend/internal/service/approval_service.go`
- [ ] T057 [US4] Update queue queries to exclude rejected articles in `aci-backend/internal/repository/postgres/approval_repo.go`
- [ ] T058 [US4] Store rejection metadata (reason, rejector, timestamp) in `aci-backend/internal/repository/postgres/approval_repo.go`

### Frontend Implementation for US4

- [ ] T059 [US4] Update RejectButton to require reason (min 10 chars) in `aci-frontend/src/components/approval/RejectButton.tsx`
- [ ] T060 [US4] Add rejection details display to article view in `aci-frontend/src/components/approval/ApprovalCard.tsx`

### Playwright E2E Tests for US4

- [ ] T061 [US4] Create Playwright test for rejection with reason in `aci-frontend/tests/e2e/approval-rejection.spec.ts`
- [ ] T062 [US4] Create Playwright test verifying rejected article removed from queues in `aci-frontend/tests/e2e/approval-rejection.spec.ts`

**Checkpoint**: User Story 4 complete - Rejection workflow functional

---

## Phase 7: User Story 5 - Super Admin Override (Priority: P2)

**Goal**: Super_admin can approve at any gate and has CISO release power

**Independent Test**: Login as super_admin, view all pending articles across gates, approve through multiple gates sequentially

### Backend Implementation for US5

- [ ] T063 [US5] Update role authorization to grant super_admin all gate access in `aci-backend/internal/api/middleware/role_auth.go`
- [ ] T064 [US5] Update queue endpoint to show all gates for admin/super_admin in `aci-backend/internal/api/handlers/approval_handler.go`

### Frontend Implementation for US5

- [ ] T065 [US5] Update queue filtering to show all pending articles for super_admin in `aci-frontend/src/hooks/useApprovalQueue.ts`
- [ ] T066 [US5] Add gate selector for admin/super_admin in ApprovalPage in `aci-frontend/src/pages/ApprovalPage.tsx`

### Playwright E2E Tests for US5

- [ ] T067 [US5] Create Playwright test for super_admin multi-gate approval in `aci-frontend/tests/e2e/approval-superadmin.spec.ts`

**Checkpoint**: User Story 5 complete - Super admin override working

---

## Phase 8: User Story 6 - Admin Role Management (Priority: P2)

**Goal**: Admin can assign/change user roles for approval workflow

**Independent Test**: Login as admin, change user from 'user' to 'marketing', logout, login as that user, verify marketing queue access

### Backend Implementation for US6

- [ ] T068 [US6] Implement PUT /api/v1/users/{id}/role handler in `aci-backend/internal/api/handlers/admin_handler.go`
- [ ] T069 [US6] Add admin-only authorization check for role change in `aci-backend/internal/api/middleware/role_auth.go`
- [ ] T070 [US6] Add audit logging for role changes in `aci-backend/internal/service/user_service.go`

### Frontend Implementation for US6

- [ ] T071 [P] [US6] Create RoleSelector component in `aci-frontend/src/components/admin/RoleSelector.tsx`
- [ ] T072 [US6] Add role management section to AdminPage in `aci-frontend/src/pages/AdminPage.tsx`

### Playwright E2E Tests for US6

- [ ] T073 [US6] Create Playwright test for role assignment and verification in `aci-frontend/tests/e2e/admin-role-management.spec.ts`

**Checkpoint**: User Story 6 complete - Role management functional

---

## Phase 9: User Story 7 - Approval Audit Trail (Priority: P3)

**Goal**: View complete approval history for any article with timestamps and approvers

**Independent Test**: View approved article, open history modal, verify all 5 gate approvals listed with correct approvers

### Backend Implementation for US7

- [ ] T074 [US7] Implement GET /api/v1/articles/{id}/approval-history handler in `aci-backend/internal/api/handlers/approval_handler.go`
- [ ] T075 [US7] Create approval history query with approver names in `aci-backend/internal/repository/postgres/approval_repo.go`

### Frontend Implementation for US7

- [ ] T076 [P] [US7] Create ApprovalHistoryModal component in `aci-frontend/src/components/approval/ApprovalHistoryModal.tsx`
- [ ] T077 [P] [US7] Create useApprovalHistory hook in `aci-frontend/src/hooks/useApprovalHistory.ts`
- [ ] T078 [US7] Add history button to ApprovalCard in `aci-frontend/src/components/approval/ApprovalCard.tsx`

### Playwright E2E Tests for US7

- [ ] T079 [US7] Create Playwright test for approval history display in `aci-frontend/tests/e2e/approval-history.spec.ts`

**Checkpoint**: User Story 7 complete - All user stories implemented

---

## Phase 10: PM-2 Gate Review

**Purpose**: Mid-implementation PM alignment check

- [ ] T080 Feature completeness check - verify P1 stories functional (US1, US2, US3)
- [ ] T081 Scope validation - confirm no scope creep
- [ ] T082 Risk assessment - document implementation risks
- [ ] T083 PM-2 sign-off obtained (document in pm-review.md)

**Checkpoint**: PM-2 gate passed

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T084 [P] Implement POST /api/v1/articles/{id}/reset handler for admin article reset in `aci-backend/internal/api/handlers/approval_handler.go`
- [ ] T085 [P] Add toast notifications for all approval actions in `aci-frontend/src/components/approval/`
- [ ] T086 [P] Add loading skeletons to ApprovalQueue in `aci-frontend/src/components/approval/ApprovalQueue.tsx`
- [ ] T087 [P] Add empty state UI for queues with no pending articles in `aci-frontend/src/components/approval/ApprovalQueue.tsx`
- [ ] T088 [P] Update API documentation in `aci-backend/docs/API.md`
- [ ] T089 Code cleanup - ensure no nested ifs, guard clauses used throughout
- [ ] T090 Verify all config values externalized (no hardcoded values)
- [ ] T091 Run quickstart.md validation against K8s deployment

---

## Phase 12: PM-3 Gate & Release Verification

**Purpose**: Final PM verification before deployment

- [ ] T092 UAT sign-off - all acceptance scenarios pass via Playwright
- [ ] T093 User journey validation - end-to-end testing complete with real data
- [ ] T094 Documentation approval - README, API docs, quickstart complete
- [ ] T095 Performance verification - <2s queue load, <1s approval action
- [ ] T096 Security validation - RBAC enforcement, audit logging verified
- [ ] T097 Playwright E2E full regression - all tests pass against K8s
- [ ] T098 Product verification checklist completed (60+ items)
- [ ] T099 PM-3 sign-off obtained (document in pm-review.md)

**Checkpoint**: PM-3 gate passed - ready for production deployment

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → PM-1 Gate
                                               ↓
                                    [User Stories Can Begin]
                                               ↓
Phase 3 (US1) ─┬─→ Phase 4 (US2) ─→ Phase 5 (US3) ─→ [MVP Complete]
               │
               └─→ Phase 6 (US4) ─┬─→ Phase 7 (US5)
                                  │
                                  └─→ Phase 8 (US6) ─→ Phase 9 (US7)
                                               ↓
                                    Phase 10 (PM-2) → Phase 11 (Polish) → Phase 12 (PM-3)
```

### User Story Dependencies

| Story | Can Start After | Dependencies |
|-------|-----------------|--------------|
| US1 | Phase 2 complete | None - first gate |
| US2 | US1 complete | Needs marketing gate working |
| US3 | US2 complete | Needs all gates working |
| US4 | Phase 2 complete | None - independent |
| US5 | US1 complete | Needs at least one gate |
| US6 | Phase 2 complete | None - independent |
| US7 | US2 complete | Needs approval records |

### Parallel Opportunities

```bash
# Phase 1 - All parallel
T001, T002, T003, T004 can run simultaneously

# Phase 2 - Repository and middleware parallel
T006, T007, T008, T010, T011, T012 can run in parallel

# US1 Backend - Handlers parallel
T019, T020, T021 can run in parallel

# US1 Frontend - Components parallel
T025, T026, T027, T028 can run in parallel

# Independent User Stories - After foundation
US4 (rejection) and US6 (role management) can run parallel to US1-US3
```

---

## Summary

| Phase | Tasks | Stories | Description |
|-------|-------|---------|-------------|
| 1 | 5 | - | Setup & Migrations |
| 2 | 8 | - | Foundational Infrastructure |
| PM-1 | 5 | - | Pre-Implementation Gate |
| 3 | 17 | US1 | Marketing Approval |
| 4 | 10 | US2 | Sequential Progression |
| 5 | 10 | US3 | Article Release |
| 6 | 7 | US4 | Rejection |
| 7 | 5 | US5 | Super Admin Override |
| 8 | 6 | US6 | Role Management |
| 9 | 6 | US7 | Audit Trail |
| PM-2 | 4 | - | Mid-Implementation Gate |
| 11 | 8 | - | Polish |
| PM-3 | 8 | - | Release Gate |
| **Total** | **99** | **7** | |

### Task Counts by Story

| Story | Backend | Frontend | E2E Tests | Total |
|-------|---------|----------|-----------|-------|
| US1 | 6 | 6 | 3 | 15 |
| US2 | 3 | 3 | 2 | 8 |
| US3 | 3 | 3 | 2 | 8 |
| US4 | 3 | 2 | 2 | 7 |
| US5 | 2 | 2 | 1 | 5 |
| US6 | 3 | 2 | 1 | 6 |
| US7 | 2 | 3 | 1 | 6 |

### MVP Scope (P1 Stories Only)

Complete Phases 1-5 for minimum viable product:
- Marketing approval working
- Full 5-gate progression
- Article release for approved content
- **~40 tasks to MVP**

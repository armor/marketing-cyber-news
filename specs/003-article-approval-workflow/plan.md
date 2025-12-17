# Implementation Plan: Article Approval Workflow

**Branch**: `003-article-approval-workflow` | **Date**: 2025-12-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-article-approval-workflow/spec.md`

## Summary

A multi-gate content approval system that requires articles to pass through 5 sequential approval stages (Marketing, Branding, SOC L1, SOC L3, CISO) before release. The system includes 8 user roles with hierarchical permissions, providing a robust RBAC foundation. Each gate can approve (pass to next) or reject (remove from pipeline with reason). Only fully-approved articles can be released for public viewing.

## Technical Context

**Language/Version**: Go 1.22+ (backend), TypeScript 5.9 (frontend)
**Primary Dependencies**: Chi v5 (router), PostgreSQL 14+ (database), React 19.2 (UI), TanStack Query v5 (data fetching)
**Storage**: PostgreSQL with new enums, columns on articles table, and article_approvals junction table
**Testing**: testify (Go), Vitest (TypeScript)
**Target Platform**: Linux server (backend), Web browser (frontend)
**Project Type**: Web application (backend + frontend)
**Performance Goals**: <2s queue load, <1s approval action, 100 concurrent approvals
**Constraints**: <500ms p95 for queue queries, audit log creation <100ms
**Scale/Scope**: ~1000 articles, ~50 active approvers, ~100 approvals/day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. License Compliance | PASS | No new dependencies with license issues |
| II. Security First | PASS | RBAC with audit logging, no auth bypasses |
| III. Integration Integrity | PASS | REST API communication, no direct code linking |
| IV. Operational Safety | PASS | Rollback via migration down scripts |
| V. Validation Gates | PASS | Pre-commit hooks apply |
| VI. Mandatory Review Process | PASS | Security + code review required |
| VII. Documentation Discipline | PASS | API docs, data model docs planned |
| VIII. Test-First Development | PASS | TDD with 4-case coverage |
| IX. Clean Code Standards | PASS | Guard clauses, no hardcoded values |
| X. Observable Systems | PASS | Structured logging, metrics |
| XI. Parallel-First Orchestration | PASS | Phases/waves structure defined |
| XII. User Experience Excellence | PASS | UX review for approval UI |
| XIII. API-First Design | PASS | Contracts defined before implementation |
| XIV. Demonstrable Verification | PASS | E2E tests for approval flows |
| XV. Submodule-Centric Development | N/A | Code in aci-backend/aci-frontend, not submodules |
| XVI. Product Manager Ownership | PASS | PM gates defined |
| XVII. Post-Wave Review | PASS | Multi-agent reviews after each wave |

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
| Visualization | `reviz-visualization` | Charts, graphs, data visualization quality | N/A |
| Code Reviewer | `code-reviewer` | Code quality, patterns, maintainability | YES |
| Security Reviewer | `security-reviewer` | Security vulnerabilities, OWASP compliance | YES |

**Requirements:**
- All 5 reviewers must complete review before wave is marked complete
- All task ratings must be >= 5 for wave to pass
- Checklist sign-offs required per spec requirements
- Wave summary report created in `specs/003-article-approval-workflow/wave-reports/wave-N-report.md`

**PM-1 Deliverables** (Required before Phase 2):
- [ ] Approved spec with prioritized backlog
- [ ] Success metrics defined
- [ ] Gap analysis completed (Critical items addressed)
- [ ] pm-review.md created in `specs/003-article-approval-workflow/`

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
specs/003-article-approval-workflow/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # API contracts
│   └── approval-api.yaml
└── tasks.md             # Phase 2 output
```

### Source Code

```text
aci-backend/
├── internal/
│   ├── domain/
│   │   └── approval.go           # Approval enums, types
│   ├── repository/postgres/
│   │   └── approval_repo.go      # Approval data access
│   ├── service/
│   │   └── approval_service.go   # Approval business logic
│   └── api/
│       ├── handlers/
│       │   └── approval_handler.go
│       ├── dto/
│       │   └── approval_dto.go
│       └── middleware/
│           └── role_auth.go      # Role-based middleware
├── migrations/
│   ├── 000007_approval_workflow.up.sql
│   └── 000007_approval_workflow.down.sql
└── tests/
    ├── unit/
    │   └── approval_test.go
    └── integration/
        └── approval_integration_test.go

aci-frontend/
├── src/
│   ├── types/
│   │   └── approval.ts
│   ├── services/api/
│   │   └── approvals.ts
│   ├── hooks/
│   │   ├── useApprovalQueue.ts
│   │   └── useApprovalHistory.ts
│   ├── components/approval/
│   │   ├── ApprovalQueue.tsx
│   │   ├── ApprovalCard.tsx
│   │   ├── ApprovalProgress.tsx
│   │   ├── ApproveButton.tsx
│   │   ├── RejectButton.tsx
│   │   └── ApprovalHistoryModal.tsx
│   └── pages/
│       └── ApprovalPage.tsx
└── tests/
    └── approval/
        └── ApprovalQueue.test.tsx
```

**Structure Decision**: Web application with existing Go backend (aci-backend) and React frontend (aci-frontend). Approval workflow extends existing Article and User models with new domain types, handlers, and UI components.

## Complexity Tracking

No constitution violations requiring justification.

## Implementation Phases

### Phase 1: Setup & Infrastructure
**Wave 1.1** (Parallel):
- [P] Create database migration for approval enums and columns
- [P] Create approval domain types in Go

### Phase 2: Foundation
**Wave 2.1** (Parallel):
- [P] Implement approval repository (CRUD operations)
- [P] Implement role validation middleware

**Wave 2.2** (Sequential - depends on 2.1):
- Implement approval service with business logic

### Phase 3: API Layer
**Wave 3.1** (Parallel):
- [P] Implement GET /api/v1/approvals/queue handler
- [P] Implement POST /api/v1/articles/{id}/approve handler
- [P] Implement POST /api/v1/articles/{id}/reject handler
- [P] Implement POST /api/v1/articles/{id}/release handler

**Wave 3.2** (Parallel):
- [P] Implement GET /api/v1/articles/{id}/approval-history handler
- [P] Implement PUT /api/v1/users/{id}/role handler

### Phase 4: Frontend
**Wave 4.1** (Parallel):
- [P] Create TypeScript types for approval
- [P] Create approval API service

**Wave 4.2** (Parallel):
- [P] Create ApprovalQueue component
- [P] Create ApprovalCard component
- [P] Create ApprovalProgress component

**Wave 4.3** (Parallel):
- [P] Create ApproveButton with confirmation
- [P] Create RejectButton with reason modal
- [P] Create ApprovalHistoryModal

**Wave 4.4** (Sequential):
- Create ApprovalPage integrating all components

### Phase 5: Testing & Polish
**Wave 5.1** (Parallel):
- [P] Write backend unit tests (4-case coverage)
- [P] Write backend integration tests
- [P] Write frontend component tests

**Wave 5.2** (Sequential):
- E2E approval flow testing

### Phase 6: Documentation & Review
**Wave 6.1** (Parallel):
- [P] Update API documentation
- [P] Create user guide for approval workflow
- [P] Security review
- [P] Code review

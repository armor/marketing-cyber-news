# Development Standards Checklist

**Purpose**: Requirements quality validation for UX consistency, API-first development, code quality standards, wave-based reviews, Kubernetes deployment, and end-to-end integration
**Feature**: 003-article-approval-workflow
**Created**: 2025-12-16
**Depth**: Comprehensive (formal release gate)
**Audience**: Wave reviewers, PR reviewers, feature completion gate

---

## API-First Development Requirements

- [ ] CHK001 - Is a complete OpenAPI 3.0+ specification documented in `contracts/` before any backend implementation begins? [Completeness, Gap]
- [ ] CHK002 - Are all API endpoints defined with request/response schemas, status codes, and error responses? [Completeness, Spec §FR-023 to FR-028]
- [ ] CHK003 - Are pagination requirements specified with default and maximum page sizes? [Clarity, Spec §FR-015]
- [ ] CHK004 - Are sorting and filtering parameters documented for queue endpoints? [Completeness, Spec §FR-016, FR-018]
- [ ] CHK005 - Is the API versioning strategy documented (e.g., `/api/v1/`)? [Gap]
- [ ] CHK006 - Are authentication requirements (JWT Bearer) specified for all protected endpoints? [Completeness, Spec §contracts/approval-api.yaml]
- [ ] CHK007 - Are error response formats standardized with error codes and messages? [Consistency, Spec §contracts/approval-api.yaml]
- [ ] CHK008 - Is the API contract committed to version control before frontend development begins? [Gap, Process]

---

## Frontend/Backend Contract Alignment

- [ ] CHK009 - Are TypeScript types generated from or aligned with OpenAPI schemas? [Consistency, Gap]
- [ ] CHK010 - Is mock data structure defined to match API response schemas exactly? [Completeness, Gap]
- [ ] CHK011 - Are frontend service methods documented to call exact API endpoints from the contract? [Consistency, Spec §plan.md Phase 4]
- [ ] CHK012 - Are loading, error, and empty states defined for all data-fetching components? [Coverage, Gap]
- [ ] CHK013 - Is the frontend mock service worker (MSW) configuration aligned with API contract? [Consistency, Gap]
- [ ] CHK014 - Are API field names (camelCase vs snake_case) transformation rules documented? [Clarity, Gap]

---

## UX Standards & Consistency

- [ ] CHK015 - Are UI components using the existing design system (shadcn/ui)? [Consistency, Spec §plan.md]
- [ ] CHK016 - Are visual hierarchy requirements defined for approval queue cards? [Clarity, Gap]
- [ ] CHK017 - Are confirmation dialog requirements specified for approve/reject actions? [Completeness, Gap]
- [ ] CHK018 - Is the approval progress indicator (green/yellow/gray gates) visually specified? [Clarity, Spec §User Story 7]
- [ ] CHK019 - Are toast notification requirements defined for approval action feedback? [Coverage, Gap]
- [ ] CHK020 - Are form validation requirements specified for rejection reason input (min 10 chars)? [Clarity, Spec §contracts/approval-api.yaml]
- [ ] CHK021 - Are accessibility requirements (ARIA labels, keyboard navigation) defined for approval components? [Coverage, Gap]
- [ ] CHK022 - Is responsive behavior documented for approval queue on mobile viewports? [Gap, Spec §Out of Scope mentions mobile-optimized excluded]

---

## Code Quality Standards (DRY, SOLID, Clean Code)

- [ ] CHK023 - Are requirements specified to prohibit nested if statements in favor of guard clauses? [Clarity, CLAUDE.md]
- [ ] CHK024 - Is there a requirement that all configuration values be externalized (no hardcoded values)? [Clarity, CLAUDE.md]
- [ ] CHK025 - Are single-responsibility principle requirements defined for service/handler separation? [Gap]
- [ ] CHK026 - Are DRY requirements documented to prevent duplicate role-to-gate mapping logic? [Completeness, Spec §research.md Decision 5]
- [ ] CHK027 - Is there a requirement for early returns over deep nesting in handlers? [Clarity, Spec §research.md]
- [ ] CHK028 - Are interface/abstraction requirements defined for repository pattern? [Gap, Spec §plan.md]

---

## Security Review Requirements (Per Wave)

- [ ] CHK029 - Is security review explicitly required at each wave completion? [Completeness, Spec §plan.md Post-Wave Review]
- [ ] CHK030 - Are RBAC requirements tested for all role/gate combinations? [Coverage, Spec §FR-008 to FR-013]
- [ ] CHK031 - Is there a requirement to validate that no approval bypass paths exist? [Coverage, Gap]
- [ ] CHK032 - Are input validation requirements specified for all user-submitted data? [Completeness, Spec §contracts/approval-api.yaml]
- [ ] CHK033 - Is audit logging required for all state-changing operations? [Completeness, Spec §FR-019 to FR-022]
- [ ] CHK034 - Are security findings required to be fully remediated before wave completion? [Clarity, CLAUDE.md]
- [ ] CHK035 - Is SQL injection prevention addressed through parameterized queries requirement? [Gap]

---

## Code Review Requirements (Per Wave)

- [ ] CHK036 - Is code review explicitly required at each wave completion? [Completeness, Spec §plan.md Post-Wave Review]
- [ ] CHK037 - Are code review findings required to be remediated before next wave? [Clarity, CLAUDE.md]
- [ ] CHK038 - Is code reviewer agent (`code-reviewer`) specified for quality gate? [Completeness, Spec §plan.md]
- [ ] CHK039 - Are all critical findings required to be addressed (not just acknowledged)? [Clarity, CLAUDE.md]
- [ ] CHK040 - Is there a requirement for test coverage thresholds (80%+)? [Measurability, Spec §SC-010]

---

## Kubernetes Deployment Requirements

- [ ] CHK041 - Is Kubernetes-only deployment explicitly required (no Docker Compose, no local installs)? [Completeness, User Requirement]
- [ ] CHK042 - Are deployment manifests documented for aci-backend service? [Completeness, Gap]
- [ ] CHK043 - Are ConfigMap and Secret requirements defined for approval workflow configuration? [Gap]
- [ ] CHK044 - Is the migration execution strategy documented for Kubernetes environment? [Gap]
- [ ] CHK045 - Are health check endpoints defined for approval service readiness? [Gap]
- [ ] CHK046 - Is the namespace requirement documented (e.g., `aci-backend`)? [Clarity, Gap]
- [ ] CHK047 - Are resource limits (CPU, memory) requirements specified for approval components? [Gap]

---

## End-to-End Integration Requirements

- [ ] CHK048 - Is end-to-end testing with real backend data required before feature completion? [Completeness, User Requirement]
- [ ] CHK049 - Are data ingestion requirements documented (articles entering via n8n webhook)? [Completeness, Spec §Assumptions]
- [ ] CHK050 - Is the full approval flow testable from pending_marketing to released status? [Coverage, Spec §User Story 2]
- [ ] CHK051 - Are integration tests required to run against Kubernetes-deployed services? [Completeness, User Requirement]
- [ ] CHK052 - Is database connectivity from frontend-to-backend-to-postgres verified in requirements? [Gap]
- [ ] CHK053 - Are test user creation scripts documented for each approver role? [Completeness, Spec §quickstart.md]

---

## Mock Data & Development Strategy

- [ ] CHK054 - Is MSW (Mock Service Worker) mock data aligned with API contract schemas? [Consistency, Gap]
- [ ] CHK055 - Are mock data fixtures comprehensive enough to test all approval statuses? [Coverage, Gap]
- [ ] CHK056 - Is the toggle between mock and real backend documented for development? [Clarity, Gap]
- [ ] CHK057 - Are mock responses for error scenarios (403, 404, 400) defined? [Completeness, Gap]
- [ ] CHK058 - Is mock data cleanup documented for integration test environments? [Gap]

---

## Wave-Based Delivery Requirements

- [ ] CHK059 - Are waves defined with clear deliverables in plan.md? [Completeness, Spec §plan.md]
- [ ] CHK060 - Is the wave completion criteria documented (all tasks complete, reviews passed)? [Clarity, Spec §plan.md]
- [ ] CHK061 - Are parallel vs sequential task dependencies clearly defined? [Clarity, Spec §plan.md]
- [ ] CHK062 - Is security-reviewer agent required for each wave? [Completeness, Spec §plan.md Post-Wave Review]
- [ ] CHK063 - Is code-reviewer agent required for each wave? [Completeness, Spec §plan.md Post-Wave Review]
- [ ] CHK064 - Are product-manager-agent, ui-ux-designer, and ux-designer reviews required per wave? [Completeness, Spec §plan.md Post-Wave Review]
- [ ] CHK065 - Is a wave report required in `wave-reports/wave-N-report.md`? [Completeness, Spec §plan.md]

---

## Playwright E2E UI Testing Requirements (MANDATORY)

**Tools Available**: Playwright MCP, Playwright Browser Extension

- [ ] CHK066 - Is Playwright configured with `playwright.config.ts` for the approval workflow feature? [Completeness, Gap]
- [ ] CHK067 - Are login/authentication E2E tests defined to validate UI interaction works correctly? [Coverage, User Requirement]
- [ ] CHK068 - Are Playwright tests required for each user story acceptance scenario (not just code review)? [Completeness, User Requirement]
- [ ] CHK069 - Is there a requirement that approval queue displays correctly via actual browser interaction? [Coverage, Spec §User Story 1]
- [ ] CHK070 - Are Playwright tests defined to validate the approve button click → status change flow? [Coverage, Spec §User Story 1]
- [ ] CHK071 - Are Playwright tests defined for reject action with reason modal interaction? [Coverage, Spec §User Story 4]
- [ ] CHK072 - Is role-based queue visibility validated through UI login as different roles? [Coverage, Spec §FR-014]
- [ ] CHK073 - Are Playwright tests defined for the full sequential gate progression (marketing → branding → SOC L1 → SOC L3 → CISO)? [Coverage, Spec §User Story 2]
- [ ] CHK074 - Is the release action validated through UI interaction for fully-approved articles? [Coverage, Spec §User Story 3]
- [ ] CHK075 - Are error state UI validations defined (403 when wrong role, 400 when wrong gate)? [Coverage, Gap]
- [ ] CHK076 - Is toast notification appearance validated through Playwright after approval/rejection? [Coverage, Gap]
- [ ] CHK077 - Are confirmation dialog interactions tested (approve confirmation, reject reason modal)? [Coverage, Gap]
- [ ] CHK078 - Is the approval progress indicator (green/yellow/gray) validated visually through Playwright screenshots? [Coverage, Spec §User Story 7]
- [ ] CHK079 - Are Playwright tests run against Kubernetes-deployed backend (not mocks) for validation? [Completeness, User Requirement]
- [ ] CHK080 - Is there a requirement that feature is NOT complete until Playwright E2E tests pass with real data? [Completeness, User Requirement]
- [ ] CHK081 - Are admin role management UI flows validated through Playwright (assign role, verify queue access)? [Coverage, Spec §User Story 6]
- [ ] CHK082 - Is super_admin multi-gate approval validated through sequential UI interaction? [Coverage, Spec §User Story 5]
- [ ] CHK083 - Are Playwright test screenshots captured for visual regression and documentation? [Completeness, Gap]
- [ ] CHK084 - Is the approval history modal/panel validated through Playwright interaction? [Coverage, Spec §User Story 7]

---

## Feature Completion Gate

- [ ] CHK085 - Is end-to-end functionality with ingested data required before marking complete? [Completeness, User Requirement]
- [ ] CHK086 - Are all P1 user stories functional and validated through Playwright UI tests? [Coverage, Spec §User Stories 1-3]
- [ ] CHK087 - Is PM-3 gate sign-off required before feature release? [Completeness, Spec §PM Acceptance Criteria]
- [ ] CHK088 - Are all acceptance scenarios verified against real data via UI interaction (not just API tests)? [Measurability, Spec §User Scenarios]
- [ ] CHK089 - Is the system working end-to-end with backend data validated through Playwright browser tests? [Completeness, User Requirement]
- [ ] CHK090 - Is there clear evidence (screenshots, test reports) that UI interactions work correctly? [Measurability, User Requirement]

---

## Summary

| Category | Item Count |
|----------|------------|
| API-First Development | 8 |
| Frontend/Backend Contract | 6 |
| UX Standards | 8 |
| Code Quality (DRY/SOLID) | 6 |
| Security Review (Per Wave) | 7 |
| Code Review (Per Wave) | 5 |
| Kubernetes Deployment | 7 |
| End-to-End Integration | 6 |
| Mock Data Strategy | 5 |
| Wave-Based Delivery | 7 |
| **Playwright E2E UI Testing** | **19** |
| Feature Completion | 6 |
| **Total** | **90** |

---

## Traceability Summary

- **Spec References**: 42 items (47%)
- **Gap Markers**: 33 items (37%)
- **User Requirements (Playwright/E2E)**: 15 items (16%)

All items follow the "Unit Tests for Requirements" pattern - testing whether requirements are complete, clear, consistent, and measurable rather than testing implementation behavior.

**Key Addition**: Playwright E2E UI Testing section ensures validation through actual browser interaction, not just code review. Feature is NOT complete until Playwright tests pass with real Kubernetes-deployed backend data.

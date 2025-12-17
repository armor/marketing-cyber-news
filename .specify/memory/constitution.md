<!--
SYNC IMPACT REPORT
==================
Version Change: 2.5.0 → 2.6.0 (MINOR: Added Playwright E2E Testing principle)

Modified Principles:
- Principle VIII (Test-First Development) - Added E2E test requirements

Added Sections:
- Principle XIX: Playwright End-to-End Testing (NON-NEGOTIABLE)
- Gate 12: Playwright E2E Validation

Removed Sections: None

Templates Requiring Updates:
- .specify/templates/plan-template.md - ⚠ Add E2E test requirements
- .specify/templates/spec-template.md - ⚠ Add E2E test acceptance criteria
- .specify/templates/tasks-template.md - ⚠ Add E2E test tasks to each phase

Follow-up TODOs:
- [ ] Add `npm run test:e2e` script to frontend package.json
- [ ] Create Playwright test base configuration
- [ ] Add E2E test templates for common user flows
==================
-->

# Armor Master Integration Constitution

## Core Principles

### I. License Compliance (NON-NEGOTIABLE)

All integration work MUST respect the license boundaries of managed components:

- **GPL Isolation**: Guardicore Monkey (GPL 3.0) MUST remain strictly isolated.
  No modifications to GPL-licensed code. API-only integration via REST.
  Separate Docker container execution required.
- **Apache 2.0 Components**: SigNoz integration permits full modification and
  redistribution under Apache 2.0 terms.
- **Proprietary Boundaries**: Platform UI code MUST NOT be exposed or
  redistributed outside authorized channels.
- **Contamination Prevention**: Pre-commit hooks MUST block any GPL code from
  entering this repository's source files.

**Rationale**: Legal compliance protects the organization from license violations
and ensures sustainable use of open-source components.

### II. Security First (NON-NEGOTIABLE)

All changes MUST prioritize security over convenience:

- **Secret Protection**: Secrets (AWS keys, API tokens, private keys, passwords)
  MUST NEVER be committed. Pre-commit hooks enforce detection and blocking.
- **Sensitive Files**: Files matching patterns `.env`, `.pem`, `credentials.*`
  MUST be blocked from commits.
- **OWASP Compliance**: All code MUST be reviewed for OWASP Top 10 vulnerabilities
  (SQL injection, XSS, command injection, CSRF, authentication bypass, etc.).
- **No Authentication Bypasses (CRITICAL)**: NEVER add code that bypasses
  security checks, even for testing:
  - NO "if test mode, skip auth" conditionals
  - NO "return default user when not authenticated" fallbacks
  - NO "disable security for development" flags
  - Testing MUST use proper credentials via .env.local or test configuration
- **Audit Trail**: Security-relevant operations MUST be logged and traceable.
- **Defense in Depth**: Multiple layers of protection (hooks, validation,
  review) MUST be maintained.
- **Security Task Tracking**: All security findings MUST be converted to tracked,
  actionable tasks with priority levels. No security item shall remain as
  "just a recommendation."

**Rationale**: A meta-repository managing multiple security-sensitive components
requires strict security hygiene to prevent credential leaks and unauthorized access.

### III. Integration Integrity

Component integrations MUST preserve isolation and stability:

- **Submodule Boundaries**: Each submodule represents a distinct component with
  its own lifecycle. Cross-contamination MUST be prevented.
- **API-Only Communication**: Inter-component communication MUST occur via
  defined APIs (REST, gRPC). No direct code linking or shared libraries.
- **Read-Only Enforcement**: GPL-licensed submodules (Monkey) MUST remain
  read-only. Hooks MUST block modification attempts.
- **Version Pinning**: Submodule versions MUST be explicitly pinned and updated
  through controlled processes.

**Rationale**: Clean integration boundaries enable independent component updates
and prevent cascading failures or license complications.

### IV. Operational Safety

All operations MUST include safeguards against destructive actions:

- **Force Push Protection**: Force pushes to `main`, `master`, `develop`, and
  `release` branches MUST be blocked by pre-push hooks.
- **Remote Verification**: Pushes to GPL upstream repositories MUST be blocked
  to prevent accidental contributions that could create legal obligations.
- **Submodule Sync Validation**: Submodule state MUST be validated before
  push operations.
- **Rollback Capability**: All deployment operations MUST support rollback
  procedures.
- **Graceful Degradation**: When external systems fail, the system MUST degrade
  gracefully rather than halt completely.

**Rationale**: A management repository orchestrating production components
requires operational guardrails to prevent accidental damage.

### V. Validation Gates

Changes MUST pass automated validation before acceptance:

- **Pre-commit Validation**: Secret detection, GPL contamination check,
  submodule protection, and sensitive file blocking MUST pass.
- **Pre-push Validation**: Branch protection, remote verification, and
  submodule sync MUST be validated.
- **Commit Message Standards**: Conventional commit format encouraged.
  AI/Claude branding MUST NOT appear in commit messages.
- **Configuration Validation**: All configuration files MUST pass schema
  validation (`make validate`).

**Rationale**: Automated gates catch errors early and enforce consistency
without relying solely on human review.

### VI. Mandatory Review Process

All changes MUST undergo appropriate review:

- **Security Review**: Changes touching security configuration, hooks, or
  credentials MUST be reviewed by `security-reviewer` agent or equivalent.
- **Code Review**: All code changes MUST be reviewed by `code-reviewer` agent
  or equivalent before merge.
- **License Review**: Changes affecting submodule configurations or adding
  new dependencies MUST include license compliance verification.
- **Architecture Review**: Structural changes MUST be reviewed by
  `backend-architect` before implementation begins.
- **UX Review**: User-facing changes MUST be validated by `ux-designer` agent
  for usability and consistency.
- **Product Manager Review**: All implementation plans, specifications, and
  final deliverables MUST be reviewed by `product-manager-agent` at designated
  gates (PM-1, PM-2, PM-3).

**Rationale**: Multi-layer review ensures that license compliance, security,
and architectural integrity are maintained across all changes.

### VII. Documentation Discipline

Project state MUST be accurately documented:

- **README Currency**: The repository README MUST accurately reflect current
  architecture, commands, and component status.
- **License Documentation**: License compliance strategy MUST be documented
  in `docs/legal/license-compliance.md`.
- **Change Documentation**: Significant changes MUST be documented in
  appropriate locations (architecture docs, deployment guides).
- **Hook Documentation**: Git hook behavior MUST be documented so contributors
  understand enforcement mechanisms.
- **API Documentation**: All public APIs MUST include OpenAPI/Swagger
  specifications with request/response examples.
- **Code Documentation**: Non-obvious logic MUST include inline comments
  explaining rationale. Architecture Decision Records (ADRs) for significant
  design choices.

**Rationale**: A meta-repository's primary value is coordination and clarity;
documentation is essential for maintainability.

### VIII. Test-First Development (NON-NEGOTIABLE)

All feature development MUST follow Test-Driven Development (TDD):

- **Tests Before Implementation**: Tests MUST be written BEFORE implementation code.
- **Red-Green-Refactor**: Tests MUST fail before implementation (Red), then pass
  after implementation (Green), then be refactored for quality.
- **Four-Case Testing Mandate (CRITICAL)**: ALL functions, methods, and endpoints
  MUST have tests covering these FOUR categories - no exceptions:

  | Case Type | Description | Example |
  |-----------|-------------|---------|
  | **Happy Path** | Success scenarios with valid inputs | `test_create_user_with_valid_email()` |
  | **Fail Case** | Error handling with invalid inputs, exceptions | `test_create_user_with_duplicate_email_raises_error()` |
  | **Null Case** | Handling of None, null, empty, missing values | `test_create_user_with_none_email_returns_validation_error()` |
  | **Edge Case** | Boundary conditions, extreme values, unusual scenarios | `test_create_user_with_max_length_username()` |

- **Test Implementation Patterns**:
  ```python
  # Happy Path: Verify successful operation
  def test_function_happy_path():
      result = function_under_test(valid_input)
      assert result == expected_success_output

  # Fail Case: Verify error handling
  def test_function_fail_invalid_input():
      with pytest.raises(ExpectedException):
          function_under_test(invalid_input)

  # Null Case: Verify null/empty handling
  def test_function_null_none_input():
      result = function_under_test(None)
      # Assert appropriate behavior

  def test_function_null_empty_string():
      result = function_under_test("")
      # Assert appropriate behavior

  # Edge Case: Verify boundary conditions
  def test_function_edge_max_value():
      result = function_under_test(MAX_ALLOWED_VALUE)
      assert result == expected_boundary_output
  ```

- **Coverage Requirements**:
  - Unit tests: 100% code coverage target
  - Integration tests: All API endpoints and user journeys
  - Contract tests: All external API integrations

**Rationale**: TDD ensures requirements are captured upfront, prevents regression,
and produces testable, modular code. The four-case mandate ensures comprehensive
coverage that catches defects before production. A test suite without all four
cases is incomplete and unreliable.

### IX. Clean Code Standards (NON-NEGOTIABLE)

Code quality MUST adhere to clean code principles:

- **No Nested If Statements**: Use guard clauses, early returns, polymorphism,
  or strategy patterns instead. Nested conditionals create complexity debt.
- **No Hardcoded Values**: All configuration MUST be externalized via environment
  variables, configuration files, or named constants.
- **Single Responsibility Principle (SRP)**: Classes and functions MUST have
  one reason to change.
- **Self-Documenting Code**: Clear naming; comments only for non-obvious rationale.
- **DRY (Don't Repeat Yourself)**: Applied judiciously; premature abstraction
  is prohibited.
- **Type Safety**: Type hints/annotations on ALL functions and parameters.
  No `any` types in TypeScript.

**Rationale**: Clean code reduces cognitive load, improves maintainability, and
enables faster onboarding of new contributors.

### X. Observable Systems

All systems MUST be observable through metrics, logging, and tracing:

- **Structured Logging (MANDATORY)**: JSON format with consistent log levels
  (DEBUG, INFO, WARN, ERROR), correlation IDs for request tracing, and context
  fields where applicable.
- **Metrics Emission (MANDATORY)**: Expose key operational metrics including
  request latency histograms, error rates, queue depths, and resource utilization.
- **Distributed Tracing**: Propagate trace context (W3C Trace Context standard)
  for inter-service communication.
- **Health Endpoints (MANDATORY)**: All services MUST expose `/health` or
  `/healthz` for liveness and `/ready` for readiness checks.
- **SigNoz Integration**: Observability data MUST flow to SigNoz monitoring
  as the primary observability backend.

**Rationale**: Observability enables debugging, performance monitoring, and
operational excellence. Without it, issues manifest as user complaints rather
than actionable alerts.

### XI. Parallel-First Orchestration (NON-NEGOTIABLE)

Independent tasks MUST be executed in parallel when possible:

- **Parallelization Identification**: Orchestrators MUST identify parallelizable
  tasks during decomposition.
- **Phases and Waves Structure (MANDATORY)**: ALL implementation plans, task
  lists, and project breakdowns MUST be organized into phases and waves:
  - **Phases**: Major sequential milestones that represent logical project stages
    - Phase 1: Setup/Infrastructure
    - Phase 2: Foundation/Core
    - Phase 3+: Feature implementation waves
    - Final Phase: Polish/Integration
  - **Waves**: Parallelizable work batches within each phase
    - Wave N.1, N.2, N.3... within each Phase N
    - Each wave contains tasks that CAN and SHOULD execute simultaneously
  - **Example Structure**:
    ```
    Phase 1: Setup
      Wave 1.1: [P] Create project structure, [P] Initialize dependencies
    Phase 2: Foundation
      Wave 2.1: [P] Database schema, [P] Auth framework
      Wave 2.2: API routing (depends on 2.1)
    Phase 3: Features
      Wave 3.1: [P] Feature A models, [P] Feature B models
      Wave 3.2: [P] Feature A service, [P] Feature B service
    ```
- **Wave Composition Rules**:
  - Tasks in the same wave MUST NOT have dependencies on each other
  - Tasks in the same wave MUST modify different files
  - Tasks marked [P] can run in parallel within their wave
  - Tasks without [P] are sequential within their wave
- **File-Level Locking**: Distributed locks prevent concurrent modifications
  to the same file.
- **Coordination Documents**: Agent coordination MUST be tracked in
  `agents/coordination/` directory.
- **Sequential Fallback**: When conflicts detected, fall back to sequential
  execution with documented reason.
- **Dependency Resolution**: Task queues MUST use topological sorting for
  dependency-aware execution.
- **Team Distribution**: Plans MUST include guidance for distributing waves
  across multiple developers for maximum parallelization.
- **Post-Wave Reviews (MANDATORY)**: After each wave completes, mandatory
  reviews MUST occur per Principle XVII before proceeding to the next wave.

**Rationale**: Parallel execution maximizes throughput and minimizes wall-clock
time for complex multi-domain tasks. Phases and waves provide clear structure
for team coordination and resource allocation. Plans without phase/wave structure
cannot be efficiently parallelized.

### XII. User Experience Excellence

All user-facing features MUST follow established UX standards:

- **UX Before Implementation**: UX design MUST precede implementation for
  every new user-facing feature.
- **Apple HIG Reference**: Apple Human Interface Guidelines serve as the
  reference standard for simplicity and navigation patterns.
- **Intuitive Navigation**: Users MUST understand the interface without training.
- **Error Messages**: MUST be actionable and user-friendly, not technical jargon.
- **Performance**: UI MUST maintain 60fps, API responses under 200ms for
  user-facing operations.
- **Accessibility**: WCAG compliance with ARIA labels on all interactive elements.

**Rationale**: Superior UX drives adoption and reduces support burden. Complex
interfaces increase cognitive load and error rates.

### XIII. API-First Design (NON-NEGOTIABLE)

All features with external interfaces MUST follow API-First methodology:

- **Contract Before Code (MANDATORY)**: API contracts MUST be defined before
  implementation begins using OpenAPI 3.0+ for REST, Protocol Buffers for gRPC.
- **OpenAPI Before UI (CRITICAL)**: NO UI implementation may begin until the
  corresponding OpenAPI specification exists and is reviewed. The sequence is:
  1. Define OpenAPI spec in `specs/[feature]/contracts/`
  2. Review and approve spec
  3. Generate MSW mocks from spec
  4. Begin UI implementation using mocks
  5. Implement backend against same spec
- **Contract Location**: API specifications stored in `specs/[feature]/contracts/`
  or `api/` directory.
- **Mock-Spec Synchronization (MANDATORY)**: MSW mock handlers MUST be generated
  from or validated against the OpenAPI spec. Mocks MUST return values matching
  the spec's response schemas exactly. Manual mock creation that diverges from
  spec is prohibited.
- **Contract Tests (MANDATORY)**: All API contracts MUST have corresponding
  tests validating:
  - Frontend API services match OpenAPI endpoint definitions
  - Request/response types match OpenAPI schemas
  - All HTTP methods and status codes are handled correctly
  - Mock handlers return spec-compliant responses
- **Interface Validation (MANDATORY)**: TypeScript types MUST be generated from
  or validated against OpenAPI schemas. No manual type definitions that could
  diverge from the API contract.
- **Breaking Change Policy**: Follow semantic versioning for API changes.
  Deprecated endpoints MUST maintain backward compatibility for at least
  2 minor versions.

**Rationale**: API-First ensures consistent interfaces, enables parallel
frontend/backend development, and catches contract violations before runtime.
OpenAPI-before-UI prevents UI implementation against imaginary APIs.

### XIV. Demonstrable Verification (NON-NEGOTIABLE)

Before claiming ANY feature is "complete" or "working", MUST provide
demonstrable proof:

- **Test Actual Application**: Not just code review - verify the running system.
- **Provide Evidence**: Command output, HTTP responses, screenshots, test results.
- **Verify Environment**: Check in the actual deployment environment, not just local.
- **Re-verify After Changes**: Any fix or modification requires re-verification.
- **Test Critical Paths**: All user journeys MUST be tested end-to-end.

**Common Verification Failures to Avoid**:
- "I created the file" (without reading it back to confirm)
- "I deployed the service" (without checking it's running)
- "I added the link" (without clicking to verify it works)
- "I wrote the code" (without executing it)
- "It should work" (without demonstrating it actually does)

**Verification Failure Protocol**:
1. Do NOT claim completion - work is not done if it doesn't work
2. Fix the issue immediately
3. Re-verify after fix
4. Repeat until verification passes
5. Report completion WITH verification evidence

**Rationale**: Unverified work wastes everyone's time when it fails in actual use.
Users should never discover that "completed" work doesn't function.

### XV. Submodule-Centric Development (NON-NEGOTIABLE)

All application code MUST reside within submodules, NOT in the main repository:

- **Code Location (CRITICAL)**: ALL source code for applications (frontend, backend,
  agents, services, libraries) MUST live in the `/submodules/` directory. The main
  repository is for orchestration, configuration, and documentation ONLY.
- **No Root-Level Source Code**: The main repository MUST NOT contain application
  source code in `/src/`, `/apps/`, `/libs/`, or similar directories at the root level.
  Exception: Scripts in `.specify/scripts/` and git hooks in `.githooks/` are permitted.
- **Why Submodules**: We use Git submodules to:
  - Keep original upstream projects clean and unmodified
  - Enable cross-integration between multiple projects
  - Maintain clear license boundaries (GPL isolation)
  - Allow independent versioning and release cycles
  - Facilitate parallel development across teams
- **Git Focus**: All code commits, reviews, and change tracking MUST occur within
  the appropriate submodule repositories. The main repository tracks submodule
  version pins only.
- **Submodule Structure**:
  ```
  /submodules/
  ├── signoz/              # SigNoz monitoring (Apache 2.0) - READ REFERENCE
  ├── platform/            # Armor Platform UI (Proprietary) - PRIMARY DEVELOPMENT
  ├── caldera/             # MITRE Caldera (Apache 2.0)
  │   ├── caldera/         # Core Caldera server
  │   └── sandcat/         # Go agent
  ├── monkey/              # Guardicore Monkey (GPL 3.0 - READ ONLY)
  └── armor-phalanx/       # Armor Phalanx services
  ```

#### Dual-Submodule Architecture (CRITICAL)

For frontend integration work, two submodules serve distinct roles:

| Submodule | Role | Permissions | Purpose |
|-----------|------|-------------|---------|
| `signoz/` | **Source/Reference** | READ | Existing SigNoz UI with Ant Design components. Reference for functionality to migrate. |
| `platform/` | **Destination/Development** | READ/WRITE | Nx monorepo where ALL new development occurs. New shadcn/Reaviz components built here. |

**Migration Strategy**: Migrate & Replace
1. Study existing functionality in `signoz/frontend/`
2. Build new implementation in `platform/` using modern stack
3. Gradually replace signoz imports with platform components
4. signoz submodule remains read-only (upstream reference)

#### Platform Submodule Structure (Nx Monorepo)

```
/submodules/platform/
├── apps/                           # Deployable applications
│   ├── monitoring-console/         # SigNoz-equivalent monitoring UI
│   ├── security-posture-console/   # Security posture dashboard
│   ├── threat-management-console/  # Threat management
│   ├── infrastructure-console/     # Infrastructure monitoring
│   ├── account-console/            # User/org management
│   ├── marketplace-console/        # Plugin marketplace
│   ├── reports-console/            # Reporting
│   ├── support-console/            # Support tools
│   └── root-console/               # Root admin
│
├── libs/                           # Shared libraries
│   ├── shared/                     # Cross-cutting utilities
│   │   ├── ui/                     # shadcn/ui core components
│   │   ├── utils/                  # Shared utilities
│   │   └── types/                  # Shared TypeScript types
│   ├── monitoring/                 # Monitoring-specific libs
│   │   ├── ui-charts/              # Reaviz chart components (ALL CHARTS HERE)
│   │   ├── ui-flows/               # React Flow/Reagraph components
│   │   └── api/                    # Monitoring API hooks
│   ├── security/                   # Security domain libs
│   ├── mitre/                      # MITRE ATT&CK integration
│   ├── react-api-support/          # API utilities
│   └── react-ui-threat-hunting/    # Threat hunting UI
```

#### Reaviz Component Library (platform/libs/monitoring/ui-charts/)

ALL chart and visualization components MUST be built in `platform/libs/monitoring/ui-charts/`:

| Component | Library | Location |
|-----------|---------|----------|
| Line/Area/Bar Charts | Reaviz | `libs/monitoring/ui-charts/src/charts/` |
| Sparklines | Reaviz | `libs/monitoring/ui-charts/src/sparklines/` |
| Flame Graphs | Reaviz | `libs/monitoring/ui-charts/src/flame/` |
| Heatmaps | Reaviz | `libs/monitoring/ui-charts/src/heatmaps/` |
| Sankey Diagrams | Reaviz | `libs/monitoring/ui-charts/src/sankey/` |
| Network Graphs | Reagraph | `libs/monitoring/ui-flows/src/graphs/` |
| Flow Diagrams | Reaflow | `libs/monitoring/ui-flows/src/flows/` |
| Service Maps | React Flow | `libs/monitoring/ui-flows/src/maps/` |

- **Change Workflow**: To modify application code:
  1. Navigate to the appropriate submodule directory
  2. Create branch, make changes, commit within the submodule
  3. Push changes to the submodule's remote repository
  4. Update the submodule pin in the main repository
  5. Commit the submodule pin update to the main repository
- **Pre-commit Enforcement**: Hooks MUST block commits that introduce application
  source code outside of `/submodules/`. Configuration, documentation, and
  orchestration files are permitted.
- **Review Boundaries**: Code reviews happen in submodule repositories.
  Main repository PRs review only: submodule version updates, configuration
  changes, documentation, and orchestration scripts.

**Rationale**: Centralizing code in submodules ensures clean separation of concerns,
proper license isolation, independent versioning, and focused code review. The main
repository serves as the integration layer, not a monolithic codebase. This structure
enables cross-project integration while keeping original codebases pristine. The
dual-submodule model (signoz=reference, platform=development) enables migration
without modifying upstream projects.

### XVI. Product Manager Ownership (NON-NEGOTIABLE)

All project deliverables MUST have Product Manager oversight throughout the lifecycle:

- **PM Gate Structure (CRITICAL)**: Three mandatory PM review gates:

  | Gate | Phase | Focus | Deliverables |
  |------|-------|-------|--------------|
  | **PM-1** | Pre-Implementation | Scope & Requirements | Approved spec, prioritized backlog, success metrics |
  | **PM-2** | Mid-Implementation | Progress & Alignment | Feature completeness check, scope validation, risk assessment |
  | **PM-3** | Pre-Release | Final Verification | UAT sign-off, launch readiness, documentation approval |

- **PM Review Responsibilities**:
  - **Gap Analysis**: Identify missing user stories, edge cases, and integration requirements
  - **RICE Prioritization**: Score and prioritize improvement suggestions using Reach, Impact, Confidence, Effort
  - **Actionable Task Creation**: Convert gaps into specific, trackable work items with acceptance criteria
  - **Constitution Compliance**: Verify deliverables meet all constitutional principles
  - **Verification Checklists**: Create comprehensive checklists for feature, API, security, and performance validation

- **PM Review Deliverables**:
  - Executive summary with recommendation (APPROVE, APPROVE WITH CHANGES, REQUIRES REVISION, REJECT)
  - Numbered gap list with severity ratings (Critical, High, Medium, Low)
  - RICE-scored improvement suggestions
  - Actionable task list (TASK-PM-XXX format)
  - Product verification checklist (60+ items for comprehensive coverage)

- **Integration Requirements**:
  - PM reviews MUST be documented in `specs/[feature]/pm-review.md`
  - PM gates MUST be tracked in implementation plans
  - PM sign-off REQUIRED before phase transitions
  - PM verification REQUIRED before production deployment

**Rationale**: Product Manager oversight ensures deliverables meet user needs, business
objectives, and quality standards. PM gates catch scope creep, missing requirements,
and integration gaps before they become costly post-release issues. No feature ships
without explicit PM approval at each gate.

### XVII. Post-Wave Review & Quality Assurance (NON-NEGOTIABLE)

After each wave completes, mandatory multi-agent review MUST occur before proceeding:

- **Mandatory Post-Wave Reviewers (CRITICAL)**: After EVERY wave completion, ALL of
  the following agents MUST review the implementation:

  | Reviewer | Agent | Focus Area | Required |
  |----------|-------|------------|----------|
  | Product Manager | `product-manager-agent` | Business alignment, user value, scope compliance | YES |
  | UI Designer | `ui-ux-designer` | Visual design, layout, component consistency | YES |
  | UX Designer | `ux-designer` | Usability, user flows, accessibility | YES |
  | Visualization | `reviz-visualization` | Charts, graphs, data visualization quality | YES (if applicable) |
  | Code Reviewer | `code-reviewer` | Code quality, patterns, maintainability | YES |
  | Security Reviewer | `security-reviewer` | Security vulnerabilities, OWASP compliance | YES |

- **Task Completion Tracking (CRITICAL)**: Each task MUST be marked with:

  | Field | Description | Example |
  |-------|-------------|---------|
  | **Status** | DONE or FAILED_REVIEW | DONE |
  | **Reviewer** | Agent that reviewed | `code-reviewer` |
  | **Rating** | 1-10 quality score | 8 |
  | **Notes** | Review findings | "Clean implementation, minor refactor suggested" |

  ```markdown
  ## Task Completion Format
  - [x] T001: Implement login form
    - Status: DONE
    - Reviewed By: code-reviewer (8/10), security-reviewer (9/10), ux-designer (7/10)
    - Notes: Minor accessibility improvements needed for screen readers

  - [ ] T002: Add password reset
    - Status: FAILED_REVIEW
    - Reviewed By: security-reviewer (4/10)
    - Notes: Missing rate limiting, CSRF protection incomplete
  ```

- **Review Rating Scale**:

  | Rating | Quality Level | Action Required |
  |--------|---------------|-----------------|
  | 9-10 | Excellent | Approve, no changes needed |
  | 7-8 | Good | Approve with minor suggestions |
  | 5-6 | Acceptable | Approve with required improvements tracked |
  | 3-4 | Below Standard | Requires revision before approval |
  | 1-2 | Unacceptable | Reject, major rework needed |

- **Checklist Sign-off (CRITICAL)**: All reviews MUST include checklist completion:
  - Feature verification checklist MUST be completed
  - Security checklist MUST be completed
  - Accessibility checklist MUST be completed
  - Performance checklist MUST be completed (if applicable)
  - Checklists stored in `specs/[feature]/checklists/` directory

- **Post-Wave Documentation (MANDATORY)**: After each wave, documentation MUST be:
  - **Created**: New documentation for new features/components
  - **Updated**: Existing documentation modified to reflect changes
  - **Completed**: Any draft documentation finalized

  Required documentation updates per wave:
  - API documentation (if endpoints added/changed)
  - Component documentation (if UI components added/changed)
  - Architecture documentation (if structural changes made)
  - User guides (if user-facing behavior changed)
  - Test documentation (test coverage reports, test plans)

- **Wave Sign-off Criteria**: A wave is NOT complete until:
  1. All tasks marked DONE with ratings ≥ 5 from ALL mandatory reviewers
  2. All FAILED_REVIEW tasks either fixed or moved to next wave with justification
  3. All checklists completed and signed off
  4. All documentation created/updated/completed
  5. Wave summary report generated in `specs/[feature]/wave-reports/`

- **Wave Summary Report Format**:
  ```markdown
  # Wave X.Y Summary Report
  **Date**: YYYY-MM-DD
  **Feature**: [feature-name]

  ## Tasks Completed
  | Task | Status | PM | UI | UX | Viz | Code | Security | Avg |
  |------|--------|----|----|----|----|------|----------|-----|
  | T001 | DONE   | 8  | 9  | 7  | -  | 8    | 9        | 8.2 |

  ## Documentation Updates
  - [x] API docs updated
  - [x] Component docs created
  - [ ] User guide pending (deferred to Wave X.Z)

  ## Checklist Completion
  - [x] Feature checklist: 45/45 items
  - [x] Security checklist: 30/30 items
  - [x] Accessibility checklist: 25/25 items

  ## Issues Identified
  - Issue #1: [description] → Tracked as T0XX
  - Issue #2: [description] → Fixed in this wave

  ## Sign-offs
  - PM: @reviewer-name ✓
  - UI: @reviewer-name ✓
  - UX: @reviewer-name ✓
  - Code: @reviewer-name ✓
  - Security: @reviewer-name ✓
  ```

**Rationale**: Post-wave reviews ensure quality gates are enforced continuously throughout
development, not just at major milestones. Multi-agent review catches issues from multiple
perspectives (code quality, security, UX, business alignment). Numeric ratings provide
objective quality tracking. Documentation requirements prevent knowledge gaps from
accumulating. This approach shifts quality left and reduces costly late-stage discoveries.

### XVIII. Iteration Quality Gates (NON-NEGOTIABLE)

Every development iteration (wave, feature, or commit) MUST pass automated quality gates:

- **Mandatory Quality Checks (CRITICAL)**: The following commands MUST pass with zero
  errors on EVERY iteration, before proceeding to the next task or wave:

  | Stack | Commands | Pass Criteria |
  |-------|----------|---------------|
  | **Frontend** | `npm run lint` | 0 errors (warnings OK) |
  | **Frontend** | `npm run test` | 95%+ pass rate |
  | **Frontend** | `npm run test:contract` | 100% pass (spec compliance) |
  | **Backend (Go)** | `go vet ./...` | 0 issues |
  | **Backend (Go)** | `go test ./...` | 95%+ pass rate |

- **Quality Gate Task Format**: Every wave in tasks.md MUST include quality gate tasks:
  ```markdown
  ### Post-Wave N Review & Commit

  - [ ] TXX-QA **Quality Gate**: Run lint + test (frontend/backend) - must pass
  - [ ] TXX-CT **Contract Test**: Run `npm run test:contract` - verify spec compliance
  - [ ] TXX-R1 Code review with `code-reviewer` agent
  - [ ] TXX-R2 Security review with `security-reviewer` agent
  - [ ] TXX-GIT Git commit with `git-manager` agent
  ```

- **Contract Testing at Unit Level (MANDATORY)**: Frontend API services MUST be validated
  against OpenAPI specs as unit tests, not just integration tests:
  ```typescript
  // Example: approvals.contract.test.ts
  import { parseOpenAPISpec } from '@/test/openapi-parser';
  import { approvalsApi } from '@/services/api/approvals';

  describe('Approvals API Contract', () => {
    const spec = parseOpenAPISpec('specs/003-article-approval-workflow/contracts/approval-api.yaml');

    it('getQueue matches OpenAPI spec', () => {
      expect(approvalsApi.getQueue).toMatchEndpoint(spec, 'GET /api/v1/approvals/queue');
    });

    it('approveArticle matches OpenAPI spec', () => {
      expect(approvalsApi.approveArticle).toMatchEndpoint(spec, 'POST /api/v1/articles/{id}/approve');
    });
  });
  ```

- **Pre-Implementation Validation**: Before starting any UI component implementation:
  1. Verify OpenAPI spec exists for all required endpoints
  2. Verify MSW mock handlers are generated from spec
  3. Verify TypeScript types are derived from spec schemas

- **Failure Protocol**: If quality gates fail:
  1. STOP - Do not proceed to next task or wave
  2. FIX - Address all failing tests/lints immediately
  3. RE-RUN - Execute quality checks again
  4. VERIFY - Confirm all checks pass
  5. CONTINUE - Only then proceed to next task

- **Iteration Checkpoint Script**: Run after each wave:
  ```bash
  # Frontend checks
  cd aci-frontend && npm run lint && npm run test && npm run test:contract

  # Backend checks
  cd aci-backend && go vet ./... && go test ./...
  ```

**Rationale**: Continuous quality validation catches issues immediately when they're
cheapest to fix. Contract testing at the unit level ensures frontend-backend alignment
before integration, preventing costly late-stage discovery of API mismatches. Every
iteration that passes quality gates maintains a deployable, working state.

### XIX. Playwright End-to-End Testing (NON-NEGOTIABLE)

Every feature MUST have Playwright end-to-end tests that verify the feature works in
a real browser environment with actual user interactions:

- **E2E Test Coverage (MANDATORY)**: Every user-facing feature MUST have Playwright
  E2E tests that cover:

  | Requirement | Description | Example |
  |-------------|-------------|---------|
  | **Login Flow** | Test MUST authenticate using real login flow | `await page.fill('[name="email"]', 'test@example.com')` |
  | **Navigation** | Test MUST navigate to the feature via UI | `await page.click('nav >> text=Threats')` |
  | **Feature Interaction** | Test MUST click/interact with feature elements | `await page.click('[data-testid="threat-card"]')` |
  | **Console Error Check** | Test MUST verify no console errors occur | `page.on('console', checkForErrors)` |
  | **Expected Behavior** | Test MUST verify feature responds correctly | `await expect(page.locator('.detail-view')).toBeVisible()` |

- **E2E Test Structure (MANDATORY)**:
  ```typescript
  // tests/e2e/[feature].spec.ts
  import { test, expect, Page } from '@playwright/test';

  // Capture console errors
  const consoleErrors: string[] = [];

  test.describe('[Feature Name] E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Clear error log
      consoleErrors.length = 0;

      // Listen for console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Login flow - MUST use actual authentication
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_USER_EMAIL!);
      await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD!);
      await page.click('button[type="submit"]');
      await page.waitForURL(/dashboard|home/);
    });

    test.afterEach(async () => {
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should navigate to feature and interact with elements', async ({ page }) => {
      // Navigate to feature
      await page.click('nav >> text=Feature');
      await page.waitForSelector('[data-testid="feature-list"]');

      // Interact with feature elements
      await page.click('[data-testid="feature-item"]:first-child');

      // Verify expected behavior
      await expect(page.locator('[data-testid="feature-detail"]')).toBeVisible();
    });
  });
  ```

- **Console Error Handling (CRITICAL)**: E2E tests MUST capture and assert on console
  errors. The test MUST FAIL if any console.error messages are logged during test
  execution. All console errors MUST be handled in application code before E2E tests
  can pass.

- **Test Environment Requirements**:
  - Tests MUST run against a real application instance (dev server or staging)
  - Tests MUST NOT mock authentication - use real test credentials
  - Tests MUST use proper test user accounts created for E2E testing
  - Test credentials MUST be stored in environment variables, never hardcoded

- **E2E Test File Organization**:
  ```
  tests/
  └── e2e/
      ├── auth.setup.ts         # Shared authentication setup
      ├── auth.spec.ts          # Login/logout E2E tests
      ├── dashboard.spec.ts     # Dashboard feature E2E tests
      ├── threats.spec.ts       # Threats feature E2E tests
      ├── [feature].spec.ts     # Feature-specific E2E tests
      └── fixtures/
          └── test-data.ts      # Test data generators
  ```

- **Feature Completion Requirement (CRITICAL)**: A feature is NOT considered complete
  until:
  1. Playwright E2E test exists for the feature
  2. Test performs actual login flow (no auth bypass)
  3. Test navigates to the feature via UI
  4. Test interacts with all critical feature elements
  5. Test asserts no console errors occur
  6. Test verifies expected feature behavior
  7. Test passes in CI/CD pipeline

- **Quality Gate Integration**: E2E tests MUST be included in quality gate checks:
  ```bash
  # Run E2E tests as part of quality gate
  npm run test:e2e
  ```

  | Command | Pass Criteria |
  |---------|---------------|
  | `npm run test:e2e` | 100% pass (all E2E tests green) |

**Rationale**: E2E tests catch integration issues, console errors, and user experience
problems that unit and contract tests cannot detect. By requiring actual login flows
and navigation, E2E tests verify the complete user journey works as expected. Console
error checking ensures that runtime errors are caught and fixed before deployment,
preventing degraded user experience in production.

## Security Requirements

This section codifies security standards that apply across all components:

### Access Control

- Repository access MUST follow principle of least privilege
- Submodule credentials (if any) MUST be managed via secure secret storage
- CI/CD pipelines MUST NOT expose secrets in logs or artifacts

### Monitoring

- Security events MUST be logged to SigNoz monitoring
- Failed validation attempts SHOULD trigger alerts
- Submodule update operations MUST be auditable

### Incident Response

- Security incidents MUST be reported via documented channels
- Compromised credentials MUST trigger immediate rotation
- Post-incident reviews MUST be documented

## Review Gates

All changes to this repository MUST pass the following gates:

### Gate 1: Automated Validation

- [ ] Pre-commit hooks pass (secrets, GPL, submodules, sensitive files)
- [ ] Pre-push hooks pass (branch protection, remote verification)
- [ ] Configuration validation passes (`make validate`)
- [ ] All automated tests pass

### Gate 2: License Compliance

- [ ] No GPL code introduced to repository source
- [ ] Submodule updates reviewed for license changes
- [ ] New dependencies verified for license compatibility

### Gate 3: Security Review

- [ ] Security-sensitive changes reviewed by security-reviewer
- [ ] No secrets or credentials in changeset
- [ ] OWASP Top 10 compliance verified
- [ ] Audit logging maintained for security operations

### Gate 4: Code Review

- [ ] Code changes reviewed by code-reviewer
- [ ] Clean code standards verified (no nested ifs, no hardcoded values)
- [ ] Commit messages follow conventional format
- [ ] Documentation updated if behavior changes

### Gate 5: Architecture Review (if applicable)

- [ ] Structural changes reviewed by backend-architect
- [ ] Integration patterns verified against principles
- [ ] API contracts defined before implementation
- [ ] Rollback procedures documented for deployments

### Gate 6: UX Review (if applicable)

- [ ] User-facing changes reviewed by ux-designer
- [ ] Accessibility requirements verified
- [ ] Error messages are user-friendly

### Gate 7: Verification Evidence

- [ ] Demonstrable proof of functionality provided
- [ ] All critical paths tested end-to-end
- [ ] Test results documented

### Gate 8: Test Coverage

- [ ] All functions have Happy Path tests
- [ ] All functions have Fail Case tests
- [ ] All functions have Null Case tests
- [ ] All functions have Edge Case tests
- [ ] 100% code coverage achieved

### Gate 9: Product Manager Review

- [ ] PM-1 gate passed (Pre-Implementation scope approval)
- [ ] PM-2 gate passed (Mid-Implementation alignment check)
- [ ] PM-3 gate passed (Pre-Release final verification)
- [ ] Gap analysis completed with all Critical items addressed
- [ ] RICE-prioritized improvements incorporated or deferred with justification
- [ ] Product verification checklist completed (60+ items)
- [ ] PM sign-off obtained for production deployment

### Gate 10: Post-Wave Validation

- [ ] All mandatory reviewers have reviewed (PM, UI, UX, Code, Security)
- [ ] All tasks have ratings ≥ 5 from all reviewers
- [ ] All checklists completed and signed off
- [ ] Documentation created/updated/completed for wave
- [ ] Wave summary report generated
- [ ] No FAILED_REVIEW tasks remaining (or justified deferral)

### Gate 11: Iteration Quality Validation

- [ ] Frontend lint passes: `npm run lint` (0 errors)
- [ ] Frontend tests pass: `npm run test` (95%+ pass rate)
- [ ] Frontend contract tests pass: `npm run test:contract` (100% compliance)
- [ ] Backend vet passes: `go vet ./...` (0 issues)
- [ ] Backend tests pass: `go test ./...` (95%+ pass rate)
- [ ] OpenAPI spec exists before UI implementation began
- [ ] MSW mocks generated from/validated against OpenAPI spec
- [ ] TypeScript types derived from OpenAPI schemas
- [ ] Interface validation confirms frontend-backend alignment

### Gate 12: Playwright E2E Validation

- [ ] Playwright E2E test exists for each user-facing feature
- [ ] E2E tests use real authentication flow (no auth bypass)
- [ ] E2E tests navigate to features via UI (not direct URL)
- [ ] E2E tests interact with feature elements (clicks, forms, etc.)
- [ ] E2E tests capture console errors and assert none occurred
- [ ] E2E tests verify expected feature behavior
- [ ] E2E tests pass: `npm run test:e2e` (100% pass rate)
- [ ] No console.error messages during test execution
- [ ] Test credentials stored in environment variables (not hardcoded)
- [ ] E2E tests integrated into CI/CD pipeline

## Governance

### Authority

This constitution supersedes all other practices within the Armor Master
Integration repository. Conflicts between this document and other guidance
MUST be resolved in favor of the constitution.

### Amendment Process

1. **Proposal**: Amendments MUST be proposed via pull request modifying this
   file with clear rationale.
2. **Review**: Amendment PRs MUST be reviewed by at least one security-reviewer
   AND one code-reviewer.
3. **Impact Assessment**: Proposer MUST document impact on dependent templates
   and provide migration plan if breaking changes are introduced.
4. **Approval**: Amendments require explicit approval before merge.
5. **Propagation**: After merge, dependent artifacts MUST be updated to reflect
   constitutional changes.

### Version Policy

- **MAJOR** version: Backward-incompatible changes (principle removal,
  fundamental redefinition)
- **MINOR** version: New principles added, material guidance expansion
- **PATCH** version: Clarifications, wording improvements, non-semantic changes

### Compliance Review

- All PRs and code reviews MUST verify compliance with constitutional principles
- Complexity beyond these principles MUST be justified in writing
- Violations discovered post-merge MUST be remediated immediately

### Model Selection Strategy

Model selection MUST follow these guidelines:
- **Haiku**: Fast, deterministic tasks (tests, exploration, docs, simple fixes)
- **Sonnet**: Complex reasoning, architecture, code review, implementation
- **Opus**: Orchestration, complex multi-domain planning

**Pattern**: Sonnet (plan) → Haiku (execute) → Sonnet (review)

### Runtime Guidance

For day-to-day development guidance, consult:
- `docs/development/contributing.md` for contribution workflow
- `docs/development/git-workflow.md` for git operations
- `docs/legal/license-compliance.md` for license questions

## Referenced Project-Specific Constitutions

The following project constitutions contain domain-specific principles that
may be referenced but are not universally applicable:

### Multi-Agent Orchestration Framework (multiagent_coding)
- **Agent Specialization**: Single domain per agent, max 5000 tokens context
- **Minimal Context Handoffs**: <5k tokens passed between agents

### SigNoz (signoz)
- **OpenTelemetry Native**: OTEL-only instrumentation, no vendor lock-in
- **Observability Native (Self-Monitoring)**: Dogfooding own instrumentation

**Version**: 2.6.0 | **Ratified**: 2025-12-10 | **Last Amended**: 2025-12-16

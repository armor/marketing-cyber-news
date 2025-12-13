# Implementation Plan: NEXUS Frontend Dashboard

**Branch**: `002-nexus-frontend` | **Date**: 2024-12-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-nexus-frontend/spec.md`

## Summary

Implement the NEXUS by Armor frontend dashboard - a cybersecurity threat intelligence interface with real-time updates, data visualizations, and threat management capabilities. The frontend will be built as a React SPA using Vite, with shadcn/ui for components, Reviz for charts, and Ant Design as fallback for complex components. It integrates with the existing Go backend API (001-aci-backend) via REST and WebSocket.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.2
**Primary Dependencies**: Vite 7.2, shadcn/ui, Reviz, Ant Design, TanStack Query, react-router-dom 7.x
**Storage**: N/A (frontend only - backend handles persistence)
**Testing**: Vitest + React Testing Library + Playwright (E2E)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
**Project Type**: Web application (frontend only, backend exists in 001-aci-backend)
**Performance Goals**: Dashboard load < 3s, interactions < 500ms, 60fps animations
**Constraints**: < 500KB initial bundle, WebSocket reconnection < 5s
**Scale/Scope**: ~15 pages, ~50 components, 500 concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| II. Security First | PASS | HttpOnly cookies for JWT, no client-side token storage |
| VIII. Test-First Development | PENDING | Tests planned in Phase 2 |
| IX. Clean Code Standards | PENDING | Will enforce via ESLint rules |
| X. Observable Systems | PASS | OpenTelemetry + SigNoz (console for dev) |
| XI. Parallel-First Orchestration | PASS | Phases/Waves structure defined |
| XII. User Experience Excellence | PASS | Dark theme, responsive, WCAG compliant |
| XIII. API-First Design | PASS | Backend contracts exist in 001-aci-backend |
| XIV. Demonstrable Verification | PENDING | Verification in Phase 3 |
| XVI. PM Ownership | PENDING | PM gates defined, awaiting reviews |

**Gate Result**: PASS - Proceed to Phase 0

## PM Review Gates

*Per Constitution Principle XVI - Product Manager Ownership*

| Gate | Phase | Status | Reviewer | Date |
|------|-------|--------|----------|------|
| **PM-1** | Pre-Implementation | [ ] Pending | | |
| **PM-2** | Mid-Implementation | [ ] Pending | | |
| **PM-3** | Pre-Release | [ ] Pending | | |

**PM-1 Deliverables** (Required before Phase 2):
- [ ] Approved spec with prioritized backlog
- [ ] Success metrics defined
- [ ] Gap analysis completed (Critical items addressed)
- [ ] pm-review.md created in `specs/002-nexus-frontend/`

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
specs/002-nexus-frontend/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (frontend contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
aci-frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── charts/          # Reviz chart components
│   │   ├── layout/          # Layout components (Header, Sidebar)
│   │   └── threat/          # Threat-specific components
│   ├── pages/               # Route pages
│   │   ├── Dashboard/
│   │   ├── Threats/
│   │   ├── Alerts/
│   │   ├── Bookmarks/
│   │   ├── Analytics/
│   │   ├── Admin/
│   │   └── Settings/
│   ├── services/            # API and WebSocket services
│   │   ├── api/             # REST API client
│   │   └── websocket/       # WebSocket client
│   ├── hooks/               # Custom React hooks
│   ├── stores/              # State management (React Context)
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   └── styles/              # Global styles and theme
├── tests/
│   ├── unit/                # Vitest unit tests
│   ├── integration/         # Component integration tests
│   └── e2e/                 # Playwright E2E tests
├── public/                  # Static assets
└── vite.config.ts
```

**Structure Decision**: Frontend-only application integrating with existing Go backend (001-aci-backend). The frontend follows a feature-based organization with shared components in `components/ui/` and domain-specific components in `components/threat/`.

## Complexity Tracking

No constitution violations requiring justification.

## Phase Overview

### Phase 1: Setup & Foundation
- Wave 1.1: [P] Project configuration, [P] shadcn/ui setup, [P] Reviz setup
- Wave 1.2: [P] Theme configuration, [P] Router setup, [P] Layout components

### Phase 2: Core Features (P1)
- Wave 2.1: [P] API client, [P] WebSocket client, [P] Auth context
- Wave 2.2: [P] Dashboard page, [P] Threat list page
- Wave 2.3: [P] Threat detail page, [P] Filter components

### Phase 3: Secondary Features (P2)
- Wave 3.1: [P] Bookmarks page, [P] Alerts page
- Wave 3.2: [P] Real-time notifications, [P] Activity feed

### Phase 4: Tertiary Features (P3)
- Wave 4.1: [P] Analytics page, [P] Admin review queue
- Wave 4.2: [P] Settings page, [P] User preferences

### Phase 5: Polish & Integration
- Wave 5.1: [P] Error boundaries, [P] Loading states
- Wave 5.2: [P] E2E tests, [P] Performance optimization
- Wave 5.3: Documentation, deployment verification

## Next Steps

1. Run `/speckit.tasks` to generate detailed task breakdown
2. Complete PM-1 review gate
3. Begin Phase 1 implementation

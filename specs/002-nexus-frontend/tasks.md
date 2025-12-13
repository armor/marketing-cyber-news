# Tasks: NEXUS Frontend Dashboard

**Input**: Design documents from `/specs/002-nexus-frontend/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are included per Constitution Principle VIII (Test-First Development).

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

**CRITICAL**: Wave is NOT complete until ALL tasks have ratings >= 5

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

### Wave 1.1: Project Bootstrap
- [ ] T001 [P] Initialize Vite 7.2 + React 19 + TypeScript 5.9 project in aci-frontend/
- [ ] T002 [P] Configure TypeScript strict mode in aci-frontend/tsconfig.json
- [ ] T003 [P] Configure ESLint + Prettier in aci-frontend/.eslintrc.cjs and aci-frontend/.prettierrc

### Wave 1.2: Styling & Testing Setup
- [ ] T004 [P] Install and configure Tailwind CSS 4.0 with dark theme in aci-frontend/tailwind.config.ts
- [ ] T005 [P] Install shadcn/ui and configure components.json in aci-frontend/
- [ ] T006 [P] Install and configure Vitest + React Testing Library in aci-frontend/vitest.config.ts
- [ ] T007 [P] Install and configure Playwright in aci-frontend/playwright.config.ts

### Wave 1.3: Design Tokens & Theming (NO HARDCODED VALUES)

*Per Constitution Principle IX - Clean Code Standards: No Hardcoded Values*

**CRITICAL**: All CSS values (colors, spacing, motion, typography) MUST be tokenized for easy reskinning.

- [ ] T008 [P] Create design tokens configuration in aci-frontend/src/styles/tokens/index.ts
- [ ] T009 [P] Create color palette tokens (brand, semantic, severity) in aci-frontend/src/styles/tokens/colors.ts
- [ ] T010 [P] Create motion/animation tokens (durations, easings) in aci-frontend/src/styles/tokens/motion.ts
- [ ] T011 [P] Create typography scale tokens (font sizes, weights, line heights) in aci-frontend/src/styles/tokens/typography.ts
- [ ] T012 [P] Create spacing scale tokens (padding, margin, gap) in aci-frontend/src/styles/tokens/spacing.ts
- [ ] T013 [P] Create shadow tokens (elevation levels) in aci-frontend/src/styles/tokens/shadows.ts
- [ ] T014 [P] Create border tokens (radius, width) in aci-frontend/src/styles/tokens/borders.ts
- [ ] T015 Create CSS custom properties from tokens in aci-frontend/src/styles/variables.css
- [ ] T016 Update Tailwind config to use design tokens in aci-frontend/tailwind.config.ts
- [ ] T017 Create ThemeProvider context for runtime theme switching in aci-frontend/src/stores/ThemeContext.tsx

**Token Structure Example**:
```typescript
// colors.ts - NO hardcoded hex values in components
export const colors = {
  brand: {
    primary: 'var(--color-brand-primary)',      // Cyber blue
    secondary: 'var(--color-brand-secondary)',
    accent: 'var(--color-brand-accent)',
  },
  severity: {
    critical: 'var(--color-severity-critical)', // Red
    high: 'var(--color-severity-high)',         // Orange
    medium: 'var(--color-severity-medium)',     // Yellow
    low: 'var(--color-severity-low)',           // Green
  },
  semantic: {
    success: 'var(--color-semantic-success)',
    warning: 'var(--color-semantic-warning)',
    error: 'var(--color-semantic-error)',
    info: 'var(--color-semantic-info)',
  },
  background: {
    primary: 'var(--color-bg-primary)',
    secondary: 'var(--color-bg-secondary)',
    elevated: 'var(--color-bg-elevated)',
  },
  text: {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    muted: 'var(--color-text-muted)',
  },
};

// motion.ts - NO hardcoded ms values in components
export const motion = {
  duration: {
    instant: 'var(--motion-duration-instant)',   // 0ms
    fast: 'var(--motion-duration-fast)',         // 150ms
    normal: 'var(--motion-duration-normal)',     // 300ms
    slow: 'var(--motion-duration-slow)',         // 500ms
  },
  easing: {
    default: 'var(--motion-easing-default)',
    easeIn: 'var(--motion-easing-in)',
    easeOut: 'var(--motion-easing-out)',
    easeInOut: 'var(--motion-easing-in-out)',
    spring: 'var(--motion-easing-spring)',
  },
};
```

### Wave 1.4: Directory Structure
- [ ] T018 Create project directory structure per plan.md in aci-frontend/src/

**Checkpoint**: Project bootstrapped with all dependencies installed, design tokens configured for reskinning

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**WARNING**: No user story work can begin until this phase is complete AND PM-1 gate passes

### Wave 2.1: TypeScript Types
- [ ] T019 [P] Create Threat types in aci-frontend/src/types/threat.ts
- [ ] T020 [P] Create User and Auth types in aci-frontend/src/types/user.ts
- [ ] T021 [P] Create Alert types in aci-frontend/src/types/alert.ts
- [ ] T022 [P] Create Bookmark types in aci-frontend/src/types/bookmark.ts
- [ ] T023 [P] Create API response types in aci-frontend/src/types/api.ts
- [ ] T024 [P] Create WebSocket message types in aci-frontend/src/types/websocket.ts

### Wave 2.2: API Client Infrastructure
- [ ] T025 Create base API client with credentials handling in aci-frontend/src/services/api/client.ts
- [ ] T026 [P] Create API error handling utilities in aci-frontend/src/services/api/errors.ts
- [ ] T027 [P] Configure TanStack Query client in aci-frontend/src/services/api/queryClient.ts

### Wave 2.3: Authentication Context
- [ ] T028 Create AuthContext provider in aci-frontend/src/stores/AuthContext.tsx
- [ ] T029 [P] Create auth API functions in aci-frontend/src/services/api/auth.ts
- [ ] T030 [P] Create useAuth hook in aci-frontend/src/hooks/useAuth.ts

### Wave 2.4: Routing Infrastructure
- [ ] T031 Configure React Router v7 with routes in aci-frontend/src/App.tsx
- [ ] T032 [P] Create ProtectedRoute component in aci-frontend/src/components/layout/ProtectedRoute.tsx
- [ ] T033 [P] Create PublicRoute component in aci-frontend/src/components/layout/PublicRoute.tsx

### Wave 2.5: Base Layout Components (USE DESIGN TOKENS ONLY)
- [ ] T034 [P] Create Header component with navigation in aci-frontend/src/components/layout/Header.tsx
- [ ] T035 [P] Create Sidebar component with nav links in aci-frontend/src/components/layout/Sidebar.tsx
- [ ] T036 [P] Create Footer component in aci-frontend/src/components/layout/Footer.tsx
- [ ] T037 Create MainLayout wrapper component in aci-frontend/src/components/layout/MainLayout.tsx

### Wave 2.6: Shared UI Components (shadcn/ui - VERIFY TOKEN USAGE)
- [ ] T038 [P] Add Button component via shadcn/ui in aci-frontend/src/components/ui/button.tsx
- [ ] T039 [P] Add Card component via shadcn/ui in aci-frontend/src/components/ui/card.tsx
- [ ] T040 [P] Add Badge component via shadcn/ui in aci-frontend/src/components/ui/badge.tsx
- [ ] T041 [P] Add Input component via shadcn/ui in aci-frontend/src/components/ui/input.tsx
- [ ] T042 [P] Add Select component via shadcn/ui in aci-frontend/src/components/ui/select.tsx
- [ ] T043 [P] Add Dialog component via shadcn/ui in aci-frontend/src/components/ui/dialog.tsx
- [ ] T044 [P] Add Skeleton component via shadcn/ui in aci-frontend/src/components/ui/skeleton.tsx
- [ ] T045 [P] Add Toast component via shadcn/ui in aci-frontend/src/components/ui/toast.tsx

### Wave 2.7: Error Handling & Loading States
- [ ] T046 [P] Create ErrorBoundary component in aci-frontend/src/components/ErrorBoundary.tsx
- [ ] T047 [P] Create LoadingSpinner component in aci-frontend/src/components/ui/LoadingSpinner.tsx
- [ ] T048 [P] Create EmptyState component in aci-frontend/src/components/ui/EmptyState.tsx

### Wave 2.8: MSW Mock Setup
- [ ] T049 [P] Configure MSW browser worker in aci-frontend/src/mocks/browser.ts
- [ ] T050 [P] Create mock handlers for auth endpoints in aci-frontend/src/mocks/handlers/auth.ts
- [ ] T051 [P] Create mock data fixtures in aci-frontend/src/mocks/fixtures/

### PM-1 Gate (Required before Phase 3)

*Per Constitution Principle XVI - Product Manager Ownership*

- [ ] T052 PM-1: Verify spec approval with prioritized backlog
- [ ] T053 PM-1: Confirm success metrics defined and measurable
- [ ] T054 PM-1: Verify gap analysis completed (Critical items addressed)
- [ ] T055 PM-1: Create pm-review.md in specs/002-nexus-frontend/
- [ ] T056 PM-1: Obtain PM sign-off for user story implementation

**Checkpoint**: Foundation ready AND PM-1 passed - user story implementation can now begin

---

## Phase 3: User Story 1 - Threat Dashboard Overview (Priority: P1)

**Goal**: Security analyst can view comprehensive dashboard with threat metrics, severity distribution, timeline, and activity feed

**Independent Test**: Log in and view dashboard page - see metric cards, severity chart, timeline chart, and activity feed

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T057 [P] [US1] Unit test for MetricCard component in aci-frontend/tests/unit/components/dashboard/MetricCard.test.tsx
- [ ] T058 [P] [US1] Unit test for SeverityDonut chart in aci-frontend/tests/unit/components/charts/SeverityDonut.test.tsx
- [ ] T059 [P] [US1] Unit test for ThreatTimeline chart in aci-frontend/tests/unit/components/charts/ThreatTimeline.test.tsx
- [ ] T060 [P] [US1] Unit test for ActivityFeed component in aci-frontend/tests/unit/components/dashboard/ActivityFeed.test.tsx
- [ ] T061 [P] [US1] Integration test for Dashboard page in aci-frontend/tests/integration/Dashboard.test.tsx

### Implementation for User Story 1

#### Wave 3.1: Dashboard API Layer
- [ ] T062 [P] [US1] Create dashboard API functions in aci-frontend/src/services/api/dashboard.ts
- [ ] T063 [P] [US1] Create useDashboardSummary hook in aci-frontend/src/hooks/useDashboardSummary.ts
- [ ] T064 [P] [US1] Create mock handlers for dashboard endpoints in aci-frontend/src/mocks/handlers/dashboard.ts

#### Wave 3.2: Chart Components (Reviz - USE DESIGN TOKENS FOR COLORS/MOTION)
- [ ] T065 [P] [US1] Create SeverityDonut chart component in aci-frontend/src/components/charts/SeverityDonut.tsx
- [ ] T066 [P] [US1] Create ThreatTimeline chart component in aci-frontend/src/components/charts/ThreatTimeline.tsx
- [ ] T067 [P] [US1] Create chart theme utilities using design tokens in aci-frontend/src/utils/chartTheme.ts

#### Wave 3.3: Dashboard Components
- [ ] T068 [P] [US1] Create MetricCard component in aci-frontend/src/components/dashboard/MetricCard.tsx
- [ ] T069 [P] [US1] Create MetricCardsGrid component in aci-frontend/src/components/dashboard/MetricCardsGrid.tsx
- [ ] T070 [P] [US1] Create ActivityFeed component in aci-frontend/src/components/dashboard/ActivityFeed.tsx
- [ ] T071 [P] [US1] Create ActivityItem component in aci-frontend/src/components/dashboard/ActivityItem.tsx

#### Wave 3.4: Dashboard Page Assembly
- [ ] T072 [US1] Create DashboardPage component in aci-frontend/src/pages/DashboardPage.tsx
- [ ] T073 [US1] Add Dashboard route to App.tsx router configuration
- [ ] T074 [US1] Create dashboard loading skeleton in aci-frontend/src/components/dashboard/DashboardSkeleton.tsx

**Checkpoint**: User Story 1 (Dashboard) fully functional and testable independently

---

## Phase 4: User Story 2 - Threat Browsing and Filtering (Priority: P1)

**Goal**: Security analyst can browse threats, apply filters, search, and paginate through results

**Independent Test**: Navigate to threats page, apply severity/category filters, search for CVE, scroll for pagination

### Tests for User Story 2

- [ ] T075 [P] [US2] Unit test for ThreatCard component in aci-frontend/tests/unit/components/threat/ThreatCard.test.tsx
- [ ] T076 [P] [US2] Unit test for FilterPanel component in aci-frontend/tests/unit/components/threat/FilterPanel.test.tsx
- [ ] T077 [P] [US2] Unit test for useThreats hook in aci-frontend/tests/unit/hooks/useThreats.test.ts
- [ ] T078 [P] [US2] Integration test for Threats page in aci-frontend/tests/integration/ThreatsPage.test.tsx

### Implementation for User Story 2

#### Wave 4.1: Threats API Layer
- [ ] T079 [P] [US2] Create threats API functions in aci-frontend/src/services/api/threats.ts
- [ ] T080 [P] [US2] Create useThreats hook with pagination in aci-frontend/src/hooks/useThreats.ts
- [ ] T081 [P] [US2] Create useThreatFilters hook in aci-frontend/src/hooks/useThreatFilters.ts
- [ ] T082 [P] [US2] Create mock handlers for threats endpoints in aci-frontend/src/mocks/handlers/threats.ts

#### Wave 4.2: Filter Components (USE DESIGN TOKENS)
- [ ] T083 [P] [US2] Create SeverityFilter component in aci-frontend/src/components/threat/filters/SeverityFilter.tsx
- [ ] T084 [P] [US2] Create CategoryFilter component in aci-frontend/src/components/threat/filters/CategoryFilter.tsx
- [ ] T085 [P] [US2] Create SourceFilter component in aci-frontend/src/components/threat/filters/SourceFilter.tsx
- [ ] T086 [P] [US2] Create DateRangeFilter component in aci-frontend/src/components/threat/filters/DateRangeFilter.tsx
- [ ] T087 [P] [US2] Create SearchInput component in aci-frontend/src/components/threat/filters/SearchInput.tsx

#### Wave 4.3: Threat List Components (USE SEVERITY COLOR TOKENS)
- [ ] T088 [P] [US2] Create ThreatCard component in aci-frontend/src/components/threat/ThreatCard.tsx
- [ ] T089 [P] [US2] Create SeverityBadge component using severity color tokens in aci-frontend/src/components/threat/SeverityBadge.tsx
- [ ] T090 [P] [US2] Create ThreatList component in aci-frontend/src/components/threat/ThreatList.tsx
- [ ] T091 [P] [US2] Create Pagination component in aci-frontend/src/components/ui/Pagination.tsx

#### Wave 4.4: Threats Page Assembly
- [ ] T092 [US2] Create FilterPanel container component in aci-frontend/src/components/threat/FilterPanel.tsx
- [ ] T093 [US2] Create ThreatsPage component in aci-frontend/src/pages/ThreatsPage.tsx
- [ ] T094 [US2] Add Threats route to App.tsx router configuration
- [ ] T095 [US2] Create threats loading skeleton in aci-frontend/src/components/threat/ThreatsSkeleton.tsx

**Checkpoint**: User Story 2 (Threat Browsing) fully functional and testable independently

---

## Phase 5: User Story 3 - Threat Detail View (Priority: P1)

**Goal**: Security analyst can view detailed threat information with CVEs, tags, and bookmark functionality

**Independent Test**: Click on a threat card, view full detail with CVEs and Armor CTA, bookmark the threat

### Tests for User Story 3

- [ ] T096 [P] [US3] Unit test for ThreatDetail component in aci-frontend/tests/unit/components/threat/ThreatDetail.test.tsx
- [ ] T097 [P] [US3] Unit test for CVEList component in aci-frontend/tests/unit/components/threat/CVEList.test.tsx
- [ ] T098 [P] [US3] Unit test for useThreat hook in aci-frontend/tests/unit/hooks/useThreat.test.ts
- [ ] T099 [P] [US3] Integration test for ThreatDetail page in aci-frontend/tests/integration/ThreatDetail.test.tsx

### Implementation for User Story 3

#### Wave 5.1: Threat Detail API Layer
- [ ] T100 [P] [US3] Create getThreat API function in aci-frontend/src/services/api/threats.ts
- [ ] T101 [P] [US3] Create useThreat hook in aci-frontend/src/hooks/useThreat.ts
- [ ] T102 [P] [US3] Create bookmark API functions in aci-frontend/src/services/api/bookmarks.ts
- [ ] T103 [P] [US3] Create useToggleBookmark hook in aci-frontend/src/hooks/useToggleBookmark.ts

#### Wave 5.2: Threat Detail Components (USE DESIGN TOKENS)
- [ ] T104 [P] [US3] Create ThreatHeader component in aci-frontend/src/components/threat/ThreatHeader.tsx
- [ ] T105 [P] [US3] Create ThreatContent component (markdown render) in aci-frontend/src/components/threat/ThreatContent.tsx
- [ ] T106 [P] [US3] Create CVEList component in aci-frontend/src/components/threat/CVEList.tsx
- [ ] T107 [P] [US3] Create CVEBadge component using severity tokens in aci-frontend/src/components/threat/CVEBadge.tsx
- [ ] T108 [P] [US3] Create ArmorCTA component using brand tokens in aci-frontend/src/components/threat/ArmorCTA.tsx
- [ ] T109 [P] [US3] Create BookmarkButton component in aci-frontend/src/components/threat/BookmarkButton.tsx

#### Wave 5.3: Threat Detail Page Assembly
- [ ] T110 [US3] Create ThreatDetailPage component in aci-frontend/src/pages/ThreatDetailPage.tsx
- [ ] T111 [US3] Add ThreatDetail route to App.tsx router configuration
- [ ] T112 [US3] Create threat detail loading skeleton in aci-frontend/src/components/threat/ThreatDetailSkeleton.tsx

**Checkpoint**: User Story 3 (Threat Detail) fully functional and testable independently

---

## Phase 6: PM-2 Gate Review

**Purpose**: Mid-implementation PM alignment check (Constitution Principle XVI)

**PM-2 Gate Deliverables**:
- [ ] T113 PM-2: Feature completeness check - verify P1 stories functional
- [ ] T114 PM-2: Scope validation - confirm no scope creep
- [ ] T115 PM-2: Risk assessment - document implementation risks
- [ ] T116 PM-2: Update pm-review.md with PM-2 sign-off

**Checkpoint**: PM-2 gate passed - proceed to P2 stories

---

## Phase 7: User Story 4 - Real-time Notifications (Priority: P2)

**Goal**: User receives real-time notifications when new threats arrive via WebSocket

**Independent Test**: Connect via WebSocket, trigger new threat, verify notification badge updates

### Tests for User Story 4

- [ ] T117 [P] [US4] Unit test for WebSocketClient in aci-frontend/tests/unit/services/websocket/WebSocketClient.test.ts
- [ ] T118 [P] [US4] Unit test for NotificationBadge in aci-frontend/tests/unit/components/NotificationBadge.test.tsx
- [ ] T119 [P] [US4] Unit test for useWebSocket hook in aci-frontend/tests/unit/hooks/useWebSocket.test.ts
- [ ] T120 [P] [US4] Integration test for real-time updates in aci-frontend/tests/integration/RealTimeUpdates.test.tsx

### Implementation for User Story 4

#### Wave 7.1: WebSocket Infrastructure
- [ ] T121 [US4] Create WebSocketClient class in aci-frontend/src/services/websocket/WebSocketClient.ts
- [ ] T122 [P] [US4] Create WebSocketContext provider in aci-frontend/src/stores/WebSocketContext.tsx
- [ ] T123 [P] [US4] Create useWebSocket hook in aci-frontend/src/hooks/useWebSocket.ts

#### Wave 7.2: Notification Components (USE DESIGN TOKENS FOR ANIMATIONS)
- [ ] T124 [P] [US4] Create NotificationContext provider in aci-frontend/src/stores/NotificationContext.tsx
- [ ] T125 [P] [US4] Create NotificationBadge component using motion tokens in aci-frontend/src/components/notifications/NotificationBadge.tsx
- [ ] T126 [P] [US4] Create NotificationDropdown component in aci-frontend/src/components/notifications/NotificationDropdown.tsx
- [ ] T127 [P] [US4] Create NotificationItem component in aci-frontend/src/components/notifications/NotificationItem.tsx

#### Wave 7.3: Real-time Integration
- [ ] T128 [US4] Update Header component with NotificationBadge in aci-frontend/src/components/layout/Header.tsx
- [ ] T129 [US4] Update ActivityFeed to show real-time updates in aci-frontend/src/components/dashboard/ActivityFeed.tsx
- [ ] T130 [US4] Create ConnectionStatusIndicator using semantic colors in aci-frontend/src/components/ui/ConnectionStatusIndicator.tsx

**Checkpoint**: User Story 4 (Real-time Notifications) fully functional

---

## Phase 8: User Story 5 - Bookmark Management (Priority: P2)

**Goal**: User can manage bookmarked threats on a dedicated bookmarks page

**Independent Test**: Bookmark a threat, navigate to Bookmarks page, verify threat appears, remove bookmark

### Tests for User Story 5

- [ ] T131 [P] [US5] Unit test for BookmarkList component in aci-frontend/tests/unit/components/bookmark/BookmarkList.test.tsx
- [ ] T132 [P] [US5] Unit test for useBookmarks hook in aci-frontend/tests/unit/hooks/useBookmarks.test.ts
- [ ] T133 [P] [US5] Integration test for Bookmarks page in aci-frontend/tests/integration/BookmarksPage.test.tsx

### Implementation for User Story 5

#### Wave 8.1: Bookmarks API Layer
- [ ] T134 [P] [US5] Create bookmarks API functions in aci-frontend/src/services/api/bookmarks.ts
- [ ] T135 [P] [US5] Create useBookmarks hook in aci-frontend/src/hooks/useBookmarks.ts
- [ ] T136 [P] [US5] Create mock handlers for bookmarks endpoints in aci-frontend/src/mocks/handlers/bookmarks.ts

#### Wave 8.2: Bookmarks Components (USE DESIGN TOKENS)
- [ ] T137 [P] [US5] Create BookmarkCard component in aci-frontend/src/components/bookmark/BookmarkCard.tsx
- [ ] T138 [P] [US5] Create BookmarkList component in aci-frontend/src/components/bookmark/BookmarkList.tsx
- [ ] T139 [P] [US5] Create EmptyBookmarks state in aci-frontend/src/components/bookmark/EmptyBookmarks.tsx

#### Wave 8.3: Bookmarks Page Assembly
- [ ] T140 [US5] Create BookmarksPage component in aci-frontend/src/pages/BookmarksPage.tsx
- [ ] T141 [US5] Add Bookmarks route to App.tsx router configuration
- [ ] T142 [US5] Add Bookmarks nav link to Sidebar in aci-frontend/src/components/layout/Sidebar.tsx

**Checkpoint**: User Story 5 (Bookmark Management) fully functional

---

## Phase 9: User Story 6 - Alert Configuration (Priority: P2)

**Goal**: User can create, edit, and manage custom alert rules

**Independent Test**: Navigate to Alerts, create alert with criteria, verify it appears in list with match count

### Tests for User Story 6

- [ ] T143 [P] [US6] Unit test for AlertForm component in aci-frontend/tests/unit/components/alert/AlertForm.test.tsx
- [ ] T144 [P] [US6] Unit test for AlertList component in aci-frontend/tests/unit/components/alert/AlertList.test.tsx
- [ ] T145 [P] [US6] Unit test for useAlerts hook in aci-frontend/tests/unit/hooks/useAlerts.test.ts
- [ ] T146 [P] [US6] Integration test for Alerts page in aci-frontend/tests/integration/AlertsPage.test.tsx

### Implementation for User Story 6

#### Wave 9.1: Alerts API Layer
- [ ] T147 [P] [US6] Create alerts API functions in aci-frontend/src/services/api/alerts.ts
- [ ] T148 [P] [US6] Create useAlerts hook in aci-frontend/src/hooks/useAlerts.ts
- [ ] T149 [P] [US6] Create useCreateAlert hook in aci-frontend/src/hooks/useCreateAlert.ts
- [ ] T150 [P] [US6] Create mock handlers for alerts endpoints in aci-frontend/src/mocks/handlers/alerts.ts

#### Wave 9.2: Alert Form Components (USE DESIGN TOKENS)
- [ ] T151 [P] [US6] Create AlertForm component in aci-frontend/src/components/alert/AlertForm.tsx
- [ ] T152 [P] [US6] Create KeywordsInput component in aci-frontend/src/components/alert/KeywordsInput.tsx
- [ ] T153 [P] [US6] Create AlertCriteriaSelector in aci-frontend/src/components/alert/AlertCriteriaSelector.tsx
- [ ] T154 [P] [US6] Create CreateAlertDialog component using motion tokens in aci-frontend/src/components/alert/CreateAlertDialog.tsx

#### Wave 9.3: Alert List Components
- [ ] T155 [P] [US6] Create AlertCard component in aci-frontend/src/components/alert/AlertCard.tsx
- [ ] T156 [P] [US6] Create AlertList component in aci-frontend/src/components/alert/AlertList.tsx
- [ ] T157 [P] [US6] Create AlertToggle component in aci-frontend/src/components/alert/AlertToggle.tsx

#### Wave 9.4: Alerts Page Assembly
- [ ] T158 [US6] Create AlertsPage component in aci-frontend/src/pages/AlertsPage.tsx
- [ ] T159 [US6] Add Alerts route to App.tsx router configuration
- [ ] T160 [US6] Add Alerts nav link to Sidebar in aci-frontend/src/components/layout/Sidebar.tsx

**Checkpoint**: User Story 6 (Alert Configuration) fully functional

---

## Phase 10: User Story 7 - Analytics and Trends (Priority: P3)

**Goal**: CISO can view analytics with threat trends, category breakdown, and source analysis

**Independent Test**: Navigate to Analytics, verify trend chart with date ranges, category and source charts

### Tests for User Story 7

- [ ] T161 [P] [US7] Unit test for TrendChart in aci-frontend/tests/unit/components/charts/TrendChart.test.tsx
- [ ] T162 [P] [US7] Unit test for CategoryBreakdown in aci-frontend/tests/unit/components/charts/CategoryBreakdown.test.tsx
- [ ] T163 [P] [US7] Integration test for Analytics page in aci-frontend/tests/integration/AnalyticsPage.test.tsx

### Implementation for User Story 7

#### Wave 10.1: Analytics API Layer
- [ ] T164 [P] [US7] Create analytics API functions in aci-frontend/src/services/api/analytics.ts
- [ ] T165 [P] [US7] Create useAnalytics hook in aci-frontend/src/hooks/useAnalytics.ts
- [ ] T166 [P] [US7] Create mock handlers for analytics endpoints in aci-frontend/src/mocks/handlers/analytics.ts

#### Wave 10.2: Analytics Chart Components (USE DESIGN TOKENS FOR ALL CHART COLORS)
- [ ] T167 [P] [US7] Create TrendChart component (Reviz) using chart color tokens in aci-frontend/src/components/charts/TrendChart.tsx
- [ ] T168 [P] [US7] Create CategoryBreakdown chart using design tokens in aci-frontend/src/components/charts/CategoryBreakdown.tsx
- [ ] T169 [P] [US7] Create SourceAnalysis chart using design tokens in aci-frontend/src/components/charts/SourceAnalysis.tsx
- [ ] T170 [P] [US7] Create TimeRangeSelector component in aci-frontend/src/components/analytics/TimeRangeSelector.tsx

#### Wave 10.3: Analytics Page Assembly
- [ ] T171 [US7] Create AnalyticsPage component in aci-frontend/src/pages/AnalyticsPage.tsx
- [ ] T172 [US7] Add Analytics route to App.tsx router configuration
- [ ] T173 [US7] Add Analytics nav link to Sidebar in aci-frontend/src/components/layout/Sidebar.tsx

**Checkpoint**: User Story 7 (Analytics) fully functional

---

## Phase 11: User Story 8 - Admin Content Review (Priority: P3)

**Goal**: Admin can review and moderate pending content in a review queue

**Independent Test**: Log in as admin, access Admin section, view review queue, approve/reject content

### Tests for User Story 8

- [ ] T174 [P] [US8] Unit test for ReviewQueue in aci-frontend/tests/unit/components/admin/ReviewQueue.test.tsx
- [ ] T175 [P] [US8] Unit test for ContentReviewCard in aci-frontend/tests/unit/components/admin/ContentReviewCard.test.tsx
- [ ] T176 [P] [US8] Integration test for Admin page in aci-frontend/tests/integration/AdminPage.test.tsx

### Implementation for User Story 8

#### Wave 11.1: Admin API Layer
- [ ] T177 [P] [US8] Create admin API functions in aci-frontend/src/services/api/admin.ts
- [ ] T178 [P] [US8] Create useReviewQueue hook in aci-frontend/src/hooks/useReviewQueue.ts
- [ ] T179 [P] [US8] Create mock handlers for admin endpoints in aci-frontend/src/mocks/handlers/admin.ts

#### Wave 11.2: Admin Components (USE DESIGN TOKENS)
- [ ] T180 [P] [US8] Create ContentReviewCard component in aci-frontend/src/components/admin/ContentReviewCard.tsx
- [ ] T181 [P] [US8] Create ReviewQueue component in aci-frontend/src/components/admin/ReviewQueue.tsx
- [ ] T182 [P] [US8] Create ApproveRejectButtons using semantic color tokens in aci-frontend/src/components/admin/ApproveRejectButtons.tsx
- [ ] T183 [P] [US8] Create AdminGuard component in aci-frontend/src/components/admin/AdminGuard.tsx

#### Wave 11.3: Admin Page Assembly
- [ ] T184 [US8] Create AdminPage component in aci-frontend/src/pages/AdminPage.tsx
- [ ] T185 [US8] Add Admin route (protected) to App.tsx router configuration
- [ ] T186 [US8] Add Admin nav link (role-based) to Sidebar in aci-frontend/src/components/layout/Sidebar.tsx

**Checkpoint**: User Story 8 (Admin Review) fully functional

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Wave 12.1: Performance Optimization
- [ ] T187 [P] Configure route-based code splitting in aci-frontend/src/App.tsx
- [ ] T188 [P] Add React.memo to expensive components throughout aci-frontend/src/components/
- [ ] T189 [P] Configure bundle size budget in aci-frontend/vite.config.ts

### Wave 12.2: Accessibility
- [ ] T190 [P] Add ARIA labels to all interactive elements in aci-frontend/src/components/
- [ ] T191 [P] Ensure keyboard navigation works for all components
- [ ] T192 [P] Add skip links to MainLayout in aci-frontend/src/components/layout/MainLayout.tsx

### Wave 12.3: Observability
- [ ] T193 [P] Configure OpenTelemetry browser instrumentation in aci-frontend/src/utils/telemetry.ts
- [ ] T194 [P] Add error tracking to ErrorBoundary in aci-frontend/src/components/ErrorBoundary.tsx
- [ ] T195 [P] Add performance metrics collection in aci-frontend/src/utils/metrics.ts

### Wave 12.4: E2E Tests
- [ ] T196 [P] E2E test for login flow in aci-frontend/tests/e2e/auth.spec.ts
- [ ] T197 [P] E2E test for dashboard in aci-frontend/tests/e2e/dashboard.spec.ts
- [ ] T198 [P] E2E test for threat browsing in aci-frontend/tests/e2e/threats.spec.ts
- [ ] T199 [P] E2E test for bookmark flow in aci-frontend/tests/e2e/bookmarks.spec.ts
- [ ] T200 [P] E2E test for alert creation in aci-frontend/tests/e2e/alerts.spec.ts

### Wave 12.5: Documentation
- [ ] T201 [P] Update README.md with project documentation in aci-frontend/README.md
- [ ] T202 [P] Create component documentation in aci-frontend/docs/components.md
- [ ] T203 Run quickstart.md validation to verify developer experience

### Wave 12.6: Design Token Audit (CRITICAL)
- [ ] T204 [P] Audit all components for hardcoded colors - replace with tokens
- [ ] T205 [P] Audit all components for hardcoded motion/animations - replace with tokens
- [ ] T206 [P] Verify all typography uses typography tokens
- [ ] T207 Create reskinning guide in aci-frontend/docs/theming.md

---

## Phase 13: PM-3 Gate & Release Verification

**Purpose**: Final PM verification before deployment (Constitution Principle XVI)

**PM-3 Gate Deliverables**:
- [ ] T208 PM-3: UAT sign-off - all acceptance scenarios pass
- [ ] T209 PM-3: User journey validation - end-to-end testing complete
- [ ] T210 PM-3: Documentation approval - README, API docs, guides complete
- [ ] T211 PM-3: Performance verification - targets met (<3s load, <500ms interactions)
- [ ] T212 PM-3: Security validation - OWASP compliance verified
- [ ] T213 PM-3: Design token audit passed - no hardcoded CSS values
- [ ] T214 PM-3: Product verification checklist completed (60+ items)
- [ ] T215 PM-3: Final sign-off obtained (document in pm-review.md)

**Checkpoint**: PM-3 gate passed - ready for production deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5, P1)**: All depend on Foundational phase completion
  - US1 (Dashboard), US2 (Browsing), US3 (Detail) can proceed in parallel
- **PM-2 Gate (Phase 6)**: Depends on P1 stories complete
- **User Stories (Phase 7-9, P2)**: Depend on PM-2 gate
  - US4 (Notifications), US5 (Bookmarks), US6 (Alerts) can proceed in parallel
- **User Stories (Phase 10-11, P3)**: Can start after P2 or in parallel
  - US7 (Analytics), US8 (Admin) can proceed in parallel
- **Polish (Phase 12)**: Depends on all user stories being complete
- **PM-3 Gate (Phase 13)**: Final validation before release

### User Story Dependencies

| Story | Dependencies | Can Parallel With |
|-------|--------------|-------------------|
| US1 (Dashboard) | Phase 2 | US2, US3 |
| US2 (Browsing) | Phase 2 | US1, US3 |
| US3 (Detail) | Phase 2, T092 (bookmarks API) | US1, US2 |
| US4 (Notifications) | Phase 2 | US5, US6 |
| US5 (Bookmarks) | T092-T093 (bookmarks from US3) | US4, US6 |
| US6 (Alerts) | Phase 2 | US4, US5 |
| US7 (Analytics) | Phase 2 | US8 |
| US8 (Admin) | Phase 2 | US7 |

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. API layer before components
3. Individual components before page assembly
4. Story complete before moving to next priority

### Parallel Opportunities

```bash
# Wave 1.1 - All can run in parallel:
T001: Initialize Vite project
T002: Configure TypeScript
T003: Configure ESLint + Prettier

# Wave 1.3 - All design tokens in parallel:
T008-T014: All design token files (colors, motion, typography, spacing, shadows, borders)

# Wave 2.1 - All types can be created in parallel:
T019-T024: All type definition files

# Wave 3.2 - All chart components in parallel:
T065: SeverityDonut (using design tokens)
T066: ThreatTimeline (using motion tokens)
T067: Chart theme utilities

# P1 Stories - All three can start together after Phase 2:
US1: Dashboard (Phase 3)
US2: Browsing (Phase 4)
US3: Detail (Phase 5)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Dashboard)
4. **STOP and VALIDATE**: Test Dashboard independently
5. Deploy/demo if ready - this is your MVP!

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 (Dashboard) -> Test independently -> Demo (MVP!)
3. Add User Story 2 (Browsing) -> Test independently -> Demo
4. Add User Story 3 (Detail) -> Test independently -> Demo
5. PM-2 Gate -> Validate P1 complete
6. Add P2 Stories (4, 5, 6) -> Test independently -> Demo
7. Add P3 Stories (7, 8) -> Test independently -> Demo
8. Polish Phase -> Performance, accessibility, E2E
9. PM-3 Gate -> Production release

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Dashboard)
   - Developer B: User Story 2 (Browsing)
   - Developer C: User Story 3 (Detail)
3. Stories complete and integrate independently
4. PM-2 gate after P1 complete
5. Continue with P2/P3 in parallel

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 215 |
| **Setup Phase (incl. Design Tokens)** | 18 tasks |
| **Foundational Phase** | 38 tasks |
| **US1 (Dashboard)** | 18 tasks |
| **US2 (Browsing)** | 21 tasks |
| **US3 (Detail)** | 17 tasks |
| **US4 (Notifications)** | 14 tasks |
| **US5 (Bookmarks)** | 12 tasks |
| **US6 (Alerts)** | 18 tasks |
| **US7 (Analytics)** | 13 tasks |
| **US8 (Admin)** | 13 tasks |
| **Polish Phase (incl. Token Audit)** | 21 tasks |
| **PM Gates** | 12 tasks |
| **Parallel Opportunities** | 160+ tasks marked [P] |
| **MVP Scope** | Phases 1-3 (US1 Dashboard) |
| **Design Token Tasks** | 14 tasks (Wave 1.3 + Wave 12.6) |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

## Design Token Requirements (CRITICAL - NO HARDCODED VALUES)

*Per Constitution Principle IX - Clean Code Standards*

**ALL components MUST use design tokens for:**
- Colors (use `colors.ts` tokens, never hardcoded hex/rgb)
- Motion/animations (use `motion.ts` duration and easing tokens)
- Typography (use `typography.ts` font size, weight, line-height tokens)
- Spacing (use `spacing.ts` padding, margin, gap tokens)
- Shadows (use `shadows.ts` elevation tokens)
- Borders (use `borders.ts` radius and width tokens)

**Enforcement:**
- Code reviews MUST reject hardcoded CSS values
- Wave 12.6 Design Token Audit is a blocking gate before PM-3
- T213 (PM-3 Gate) requires design token audit passed

**Reskinning Goal:**
To reskin the application, only these files should need modification:
1. `aci-frontend/src/styles/variables.css` (CSS custom property values)
2. `aci-frontend/tailwind.config.ts` (Tailwind theme extension)
3. `aci-frontend/src/styles/tokens/*.ts` (token definitions)

**NO component files should need modification to change the visual theme.**

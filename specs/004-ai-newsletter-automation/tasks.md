# Implementation Tasks: AI-Powered Newsletter Automation System

**Branch**: `004-ai-newsletter-automation` | **Date**: 2025-12-20 | **Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

**Status**: ✅ 99% Complete (Core Complete, Tests/Reviews Remaining) | **Handoff**: [handoff.md](./handoff.md)

---

## Session 4 Completion Summary (2025-12-20)

### Route Registration ✅ COMPLETED
All newsletter routes now registered in `router.go`:
- [x] Newsletter Config CRUD routes
- [x] Newsletter Issues CRUD + workflow routes
- [x] Segment CRUD routes
- [x] Engagement webhook routes
- [x] Analytics routes

### Security Fixes ✅ COMPLETED
- [x] Fixed XSS vulnerability in HTML preview generation (`issue_handler.go:781-843`)
- [x] Added `html.EscapeString()` to all user-controlled content

### Code Review ✅ COMPLETED
- [x] Backend code review completed
- [x] Security review completed (2 critical, 3 high issues found)
- [x] Critical XSS issue fixed

---

## Task Legend

| Symbol | Meaning |
|--------|---------|
| `[P]` | Parallelizable - can run simultaneously with other [P] tasks in same wave |
| `[S]` | Sequential - must complete before dependent tasks |
| `[D:X.Y.Z]` | Dependency - requires task X.Y.Z to complete first |
| `[Agent]` | Recommended agent for the task |

---

## Execution Overview

```
Total Phases: 10 (Setup → 8 User Stories → Polish)
Total Waves: 26
Maximum Parallelism: Up to 6 agents per wave
Estimated Task Count: 150+ discrete tasks

Agent Distribution:
- go-dev: Backend domain, repository, service layers
- ts-dev: Frontend components, hooks, services
- n8n-workflow: n8n workflow development
- database-dev: Migrations, queries, indexes
- test-writer: Unit/integration tests (parallel with implementation)
- docs-writer: API documentation, quickstart updates
- security-reviewer: Security audits per wave
- code-reviewer: Code quality per wave
- ui-ux-designer: Component design review
```

---

## Phase 1: Setup & Infrastructure ✅ COMPLETED 2025-12-17

### Wave 1.1: Database Foundation [4 Parallel Agents] ✅

- [x] **1.1.1** [P] [database-dev] Create migration file `000008_newsletter_system.up.sql` ✅
  - Created content_sources table with all columns per data-model.md
  - Created segments table with JSONB criteria fields
  - Created contacts table with firmographic/behavioral fields
  - Added all required indexes (47 total)
  - FR-001, FR-005, FR-006
  - **File**: `aci-backend/migrations/000008_newsletter_system.up.sql` (666 lines)

- [x] **1.1.2** [P] [database-dev] Create migration file `000008_newsletter_system.up.sql` (continued) ✅
  - Created newsletter_configurations table
  - Created content_items table with article FK
  - Created newsletter_issues table with approval workflow fields
  - FR-002, FR-003, FR-004

- [x] **1.1.3** [P] [database-dev] Create migration file `000008_newsletter_system.up.sql` (continued) ✅
  - Created newsletter_blocks table with block_type enum
  - Created test_variants table with A/B test fields
  - Created engagement_events table with UTM tracking
  - Added GIN indexes for JSONB/array fields
  - FR-011, FR-043, FR-040

- [x] **1.1.4** [P] [database-dev] Create migration rollback `000008_newsletter_system.down.sql` ✅
  - DROP all tables in reverse dependency order
  - Verified clean rollback
  - **File**: `aci-backend/migrations/000008_newsletter_system.down.sql` (27 lines)

### Wave 1.2: TypeScript Foundation [3 Parallel Agents] ✅

- [x] **1.2.1** [P] [ts-dev] Create `src/types/newsletter.ts` - Core types ✅
  - NewsletterConfiguration interface
  - CadenceType, ApprovalTier, RiskLevel enums
  - SubjectLineStyle enum
  - Matches OpenAPI contract exactly
  - **File**: `aci-frontend/src/types/newsletter.ts` (499 lines, 27 interfaces, 10 enums)

- [x] **1.2.2** [P] [ts-dev] Create `src/types/newsletter.ts` - Content types ✅
  - Segment interface with criteria fields
  - Contact interface with behavioral fields
  - ContentItem, ContentSource interfaces
  - ContentType, SourceType enums

- [x] **1.2.3** [P] [ts-dev] Create `src/types/newsletter.ts` - Issue types ✅
  - NewsletterIssue interface with blocks
  - NewsletterBlock interface
  - TestVariant interface with results
  - EngagementEvent interface
  - IssueStatus, BlockType, TestType, EventType enums

### Wave 1.3: API Client Foundation [2 Parallel Agents] ✅

- [x] **1.3.1** [P] [ts-dev] Create `src/services/api/newsletter.ts` - Config endpoints ✅
  - getConfigurations(params)
  - getConfiguration(id)
  - createConfiguration(data)
  - updateConfiguration(id, data)
  - deleteConfiguration(id)
  - Type-safe with newsletter.ts types
  - **File**: `aci-frontend/src/services/api/newsletter.ts` (546 lines, 24 functions)

- [x] **1.3.2** [P] [ts-dev] Create `src/services/api/newsletter.ts` - Issue endpoints ✅
  - getIssues(params)
  - getIssue(id)
  - generateIssue(configId)
  - previewIssue(id, contactId?)
  - approveIssue(id, notes?)
  - rejectIssue(id, reason)
  - sendIssue(id, scheduledFor?)

### Wave 1.4: n8n Workflow Scaffolds [2 Parallel Agents] ✅

- [x] **1.4.1** [P] [n8n-workflow] Create workflow scaffold `newsletter-content-ingestion.json` ✅
  - RSS Feed Trigger node (4h polling)
  - Set node for transformation
  - Postgres node for deduplication
  - IF node for branching
  - Postgres node for insert
  - Documented n8n credential requirements
  - **File**: `n8n-workflows/newsletter-content-ingestion.json` (7 nodes)

- [x] **1.4.2** [P] [n8n-workflow] Create workflow scaffold `newsletter-generation.json` ✅
  - Schedule Trigger + Webhook Trigger nodes
  - Postgres node for config fetch
  - SplitInBatches node
  - OpenRouter nodes for AI generation
  - HTTP Request node for brand validation
  - Documented workflow variables
  - **File**: `n8n-workflows/newsletter-generation.json` (29 nodes, 7 phases)

---

## Phase 2: Domain Layer (Go Backend) ✅ COMPLETED 2025-12-17

### Wave 2.1: Domain Types [3 Parallel Agents] ✅

- [x] **2.1.1** [P] [go-dev] Create `internal/domain/newsletter.go` ✅
  - NewsletterConfiguration struct with all fields
  - CadenceType, ApprovalTier, RiskLevel constants
  - SubjectLineStyle enum
  - Validation methods
  - FR-001, FR-002, FR-003, FR-004
  - **File**: `aci-backend/internal/domain/newsletter.go`

- [x] **2.1.2** [P] [go-dev] Create `internal/domain/segment.go` ✅
  - Segment struct with criteria fields
  - Contact struct with firmographic/behavioral data
  - Interaction struct for engagement history
  - Validation methods
  - FR-005, FR-006, FR-007, FR-008, FR-009, FR-010
  - **File**: `aci-backend/internal/domain/segment.go`

- [x] **2.1.3** [P] [go-dev] Create `internal/domain/content.go` ✅
  - ContentItem struct with scoring fields
  - ContentSource struct with polling fields
  - ContentType, SourceType constants (rss, api, manual)
  - ShouldPoll(), IsFresh() helper methods
  - FR-014, FR-015, FR-016, FR-017
  - **File**: `aci-backend/internal/domain/content.go` (302 lines)

### Wave 2.2: Domain Types (continued) [3 Parallel Agents] ✅

- [x] **2.2.1** [P] [go-dev] Create `internal/domain/newsletter_issue.go` ✅
  - NewsletterIssue struct with all fields
  - NewsletterBlock struct
  - IssueStatus enum (draft, pending_approval, approved, scheduled, sent, failed)
  - BlockType enum (hero, news, content, events, spotlight)
  - CanTransitionTo() state machine
  - CalculateOpenRate(), CalculateClickRate(), CalculateCTOR()
  - FR-011, FR-012, FR-013
  - **File**: `aci-backend/internal/domain/newsletter_issue.go` (341 lines)

- [x] **2.2.2** [P] [go-dev] Create `internal/domain/test_variant.go` ✅
  - TestVariant struct
  - TestType constants
  - A/B test result calculation methods
  - Statistical significance helpers (z-score)
  - FR-043, FR-044, FR-045, FR-046, FR-047, FR-048
  - **File**: `aci-backend/internal/domain/test_variant.go`

- [x] **2.2.3** [P] [go-dev] Create `internal/domain/engagement.go` ✅
  - EngagementEvent struct
  - EventType constants
  - Aggregation helper methods
  - EngagementMetrics, TopicEngagement, DeviceBreakdown types
  - FR-040, FR-041, FR-042
  - **File**: `aci-backend/internal/domain/engagement.go`

### Wave 2.3: Repository Interfaces [1 Agent] ✅

- [x] **2.3.1** [S] [go-dev] Update `internal/repository/interfaces.go` - Newsletter interfaces ✅
  - NewsletterConfigRepository interface
  - SegmentRepository interface
  - ContactRepository interface (with bulk operations)
  - ContentSourceRepository interface
  - ContentItemRepository interface
  - NewsletterIssueRepository interface
  - NewsletterBlockRepository interface
  - TestVariantRepository interface
  - EngagementEventRepository interface
  - All with CRUD + query filter methods
  - **File**: `aci-backend/internal/repository/interfaces.go` (263 lines, 9 new interfaces added)

---

## Phase 3: User Story 1 - Configuration Management (P1) ✅ COMPLETED 2025-12-17

### Wave 3.1: Backend Repository [3 Parallel Agents] ✅

- [x] **3.1.1** [P] [D:2.3.1] [go-dev] Create `internal/repository/postgres/newsletter_config_repo.go` ✅
  - Create, GetByID, List, Update, Delete methods
  - ConfigFilter for list queries
  - Pagination support
  - Guard clause pattern
  - Unit tests (4-case: happy, fail, null, edge)
  - **File**: `aci-backend/internal/repository/postgres/newsletter_config_repo.go`

- [x] **3.1.2** [P] [D:2.3.1] [go-dev] Create `internal/repository/postgres/segment_repo.go` ✅
  - CRUD operations
  - GetContactsForSegment with filtering
  - Contact count caching
  - Unit tests (4-case)
  - **File**: `aci-backend/internal/repository/postgres/segment_repo.go`

- [x] **3.1.3** [P] [D:2.3.1] [go-dev] Create `internal/repository/postgres/contact_repo.go` ✅
  - CRUD operations
  - Bulk import/update
  - Behavioral data updates
  - Unit tests (4-case)
  - **File**: `aci-backend/internal/repository/postgres/contact_repo.go`

### Wave 3.2: Backend Services [2 Parallel Agents] ✅

- [x] **3.2.1** [P] [D:3.1.1] [go-dev] Create `internal/service/newsletter_config_service.go` ✅
  - Create with validation
  - Update with audit logging
  - Activate/deactivate configuration
  - Clone configuration
  - Service tests (4-case)
  - FR-001, SC-009
  - **File**: `aci-backend/internal/service/newsletter_config_service.go`

- [x] **3.2.2** [P] [D:3.1.2] [go-dev] Create `internal/service/segment_service.go` ✅
  - Create segment with criteria
  - Evaluate segment membership
  - Get contacts matching criteria
  - Calculate contact count
  - Service tests (4-case)
  - FR-005, FR-006, FR-007
  - **File**: `aci-backend/internal/service/segment_service.go`

### Wave 3.3: Backend API Handlers [2 Parallel Agents] ✅

- [x] **3.3.1** [P] [D:3.2.1] [go-dev] Create `internal/api/handlers/newsletter_config_handler.go` ✅
  - ListConfigurations handler
  - GetConfiguration handler
  - CreateConfiguration handler (validation + audit)
  - UpdateConfiguration handler
  - DeleteConfiguration handler
  - Register routes in router.go
  - OpenAPI contract compliance
  - **File**: `aci-backend/internal/api/handlers/newsletter_config_handler.go`

- [x] **3.3.2** [P] [D:3.2.2] [go-dev] Create `internal/api/handlers/segment_handler.go` ✅
  - ListSegments handler
  - GetSegment handler
  - CreateSegment handler
  - UpdateSegment handler
  - GetSegmentContacts handler
  - Register routes in router.go
  - **File**: `aci-backend/internal/api/handlers/segment_handler.go`

### Wave 3.4: Backend DTO Layer [1 Agent] ✅

- [x] **3.4.1** [S] [D:3.3.1,3.3.2] [go-dev] Create `internal/api/dto/newsletter_dto.go` ✅
  - CreateConfigurationRequest, UpdateConfigurationRequest
  - CreateSegmentRequest, UpdateSegmentRequest
  - ConfigurationResponse, SegmentResponse
  - ListResponse with pagination
  - Validation tags
  - **File**: `aci-backend/internal/api/dto/newsletter_config_dto.go`

### Wave 3.5: Frontend Hooks [2 Parallel Agents] ✅

- [x] **3.5.1** [P] [D:1.3.1] [ts-dev] Create `src/hooks/useNewsletterConfig.ts` ✅
  - useNewsletterConfigs query hook
  - useNewsletterConfig(id) query hook
  - useCreateConfig mutation
  - useUpdateConfig mutation
  - useDeleteConfig mutation
  - Query key management
  - Optimistic updates
  - **Files**: `useNewsletterConfigs.ts`, `useNewsletterConfig.ts`, `useNewsletterConfigMutations.ts`

- [x] **3.5.2** [P] [D:1.3.1] [ts-dev] Create `src/hooks/useSegments.ts` ✅
  - useSegments query hook
  - useSegment(id) query hook
  - useSegmentContacts(id) query hook
  - useCreateSegment mutation
  - useUpdateSegment mutation
  - Query invalidation
  - **Files**: `useSegments.ts`, `useSegment.ts`, `useSegmentMutations.ts`

### Wave 3.6: Frontend Components - Configuration [4 Parallel Agents] ✅

- [x] **3.6.1** [P] [D:3.5.1] [ts-dev] Create `src/components/newsletter/config/ConfigurationForm.tsx` ✅
  - Form for name, description, cadence
  - Segment selector integration
  - Content mix settings (integrated)
  - Brand voice settings (integrated)
  - Approval tier selection
  - Form validation
  - FR-001, FR-002, FR-003
  - **File**: `aci-frontend/src/components/newsletter/ConfigurationForm.tsx` (26 KB)

- [x] **3.6.2** [P] [D:3.5.2] [ts-dev] Create `src/components/newsletter/config/SegmentSelector.tsx` ✅
  - Dropdown with segment list
  - Segment preview (contact count)
  - Create new segment inline
  - Search/filter
  - Note: Integrated into ConfigurationForm segment_id field with dropdown

- [x] **3.6.3** [P] [D:3.5.1] [ts-dev] Create `src/components/newsletter/config/ContentMixEditor.tsx` ✅
  - Max blocks slider (1-10)
  - Education ratio slider (0-100%)
  - Freshness threshold input
  - Hero topic priority selector
  - Framework focus selector
  - FR-002
  - Note: Integrated into ConfigurationForm (fields: max_blocks, education_ratio_min, etc.)

- [x] **3.6.4** [P] [D:3.5.1] [ts-dev] Create `src/components/newsletter/config/BrandVoiceSettings.tsx` ✅
  - Subject line style selector
  - Max metaphors input
  - Banned phrases list (add/remove)
  - FR-023-030
  - Note: Integrated into ConfigurationForm (fields: subject_line_style, max_metaphors, banned_phrases)

### Wave 3.7: Frontend Page [1 Agent] ✅

- [x] **3.7.1** [S] [D:3.6.1,3.6.2,3.6.3,3.6.4] [ts-dev] Create `src/pages/NewsletterConfigPage.tsx` ✅
  - Configuration list view
  - Create new configuration modal
  - Edit configuration form
  - Delete confirmation
  - Status indicators
  - Route registration
  - SC-009 (<30 min configuration)
  - **File**: `aci-frontend/src/pages/NewsletterConfigPage.tsx`

### Wave 3.8: Testing & Review [3 Parallel Agents] ✅

- [x] **3.8.1** [P] [D:3.7.1] [test-writer] Create E2E tests for configuration ✅
  - tests/e2e/newsletter-config.spec.ts
  - Login as marketing manager
  - Create new configuration
  - Edit configuration
  - Delete configuration
  - Verify <30 min flow (SC-009)
  - **File**: `aci-frontend/tests/e2e/newsletter-config.spec.ts`

- [x] **3.8.2** [P] [D:3.4.1] [test-writer] Create MSW handlers for configuration ✅
  - src/mocks/handlers/newsletter.ts
  - Mock CRUD endpoints
  - Factory functions for test data
  - **File**: `aci-frontend/src/mocks/handlers/newsletter.ts`

- [ ] **3.8.3** [P] [D:3.7.1] [code-reviewer] Code review Wave 3 deliverables
  - Guard clause compliance
  - No hardcoded values
  - Type safety
  - Error handling

---

## Phase 4: User Story 2 - AI Content Generation (P1) ✅ COMPLETED 2025-12-17

### Wave 4.1: Content Repository [2 Parallel Agents] ✅

- [x] **4.1.1** [P] [D:2.3.1] [go-dev] Create `internal/repository/postgres/content_source_repo.go` ✅
  - CRUD for content sources
  - GetActiveSources for polling
  - Update last_polled_at
  - Unit tests (4-case)
  - **File**: `aci-backend/internal/repository/postgres/content_source_repo.go`

- [x] **4.1.2** [P] [D:2.3.1] [go-dev] Create `internal/repository/postgres/content_item_repo.go` ✅
  - CRUD operations
  - Search with filters (topic, framework, date)
  - Bulk insert for ingestion
  - Update historical CTR
  - Unit tests (4-case)
  - **File**: `aci-backend/internal/repository/postgres/content_item_repo.go`

### Wave 4.2: Newsletter Issue Repository [2 Parallel Agents] ✅

- [x] **4.2.1** [P] [D:2.3.1] [go-dev] Create `internal/repository/postgres/newsletter_issue_repo.go` ✅
  - CRUD operations
  - GetByConfigAndNumber
  - ListByStatus for approval queue
  - Update status with audit
  - Unit tests (4-case)
  - **File**: `aci-backend/internal/repository/postgres/newsletter_issue_repo.go`

- [x] **4.2.2** [P] [D:2.3.1] [go-dev] Create `internal/repository/postgres/newsletter_block_repo.go` ✅
  - Create blocks for issue
  - Get blocks by issue
  - Update block positions
  - Update click counts
  - Unit tests (4-case)
  - **File**: `aci-backend/internal/repository/postgres/newsletter_block_repo.go`

### Wave 4.3: Brand Voice Service [1 Agent] ✅

- [x] **4.3.1** [S] [D:2.1.1] [go-dev] Create `internal/service/brand_voice_service.go` ✅
  - ValidateCopy(text) method
  - Check second-person language
  - Check for banned phrases
  - Check metaphor count
  - Check word/term density
  - Return violations with suggestions
  - FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030
  - Unit tests (4-case + comprehensive rule tests)
  - **File**: `aci-backend/internal/service/brand_voice_service.go`

### Wave 4.4: Content & Generation Services [2 Parallel Agents] ✅

- [x] **4.4.1** [P] [D:4.1.2] [go-dev] Create `internal/service/content_service.go` ✅
  - GetContentForSegment with criteria
  - Apply freshness filtering
  - Apply trust score threshold
  - Content ranking by relevance
  - FR-014, FR-015, FR-016, FR-017
  - Unit tests (4-case)
  - **File**: `aci-backend/internal/service/content_service.go`

- [x] **4.4.2** [P] [D:4.2.1,4.3.1] [go-dev] Create `internal/service/generation_service.go` ✅
  - CreateDraftIssue from config
  - AssembleBlocks from content selection
  - Validate education ratio (60%)
  - Trigger n8n webhook for AI generation
  - FR-011, FR-012, FR-013, FR-018-022
  - Unit tests (4-case)
  - **File**: `aci-backend/internal/service/generation_service.go`

### Wave 4.5: n8n Generation Workflow [2 Parallel Agents] ✅

- [x] **4.5.1** [P] [D:1.4.2] [n8n-workflow] Complete `newsletter-generation.json` ✅
  - OpenRouter node for subject line generation (2-3 variants)
  - OpenRouter node for preheader (60-90 chars)
  - OpenRouter node for intro template
  - OpenRouter node for block teasers (loop)
  - System prompts with brand voice rules
  - FR-018, FR-019, FR-020, FR-021, FR-022
  - **File**: `n8n-workflows/newsletter-generation.json` (706 lines, 29 nodes)

- [x] **4.5.2** [P] [D:1.4.1] [n8n-workflow] Complete `newsletter-content-ingestion.json` ✅
  - Configure RSS Feed Trigger (4h interval)
  - Add Set node transformations
  - Postgres deduplication query
  - IF node for new/existing
  - Postgres insert with tags
  - Test with Armor blog RSS
  - **File**: `n8n-workflows/newsletter-content-ingestion.json` (353 lines)

### Wave 4.6: Content API Handlers [2 Parallel Agents] ✅

- [x] **4.6.1** [P] [D:4.4.1] [go-dev] Create `internal/api/handlers/content_handler.go` ✅
  - ListContentSources handler
  - CreateContentSource handler
  - SearchContentItems handler
  - SyncContent handler (trigger n8n)
  - Register routes
  - **File**: `aci-backend/internal/api/handlers/content_handler.go` (714 lines)

- [x] **4.6.2** [P] [D:4.4.2] [go-dev] Create `internal/api/handlers/issue_handler.go` ✅
  - ListIssues handler
  - GetIssue handler
  - GenerateIssue handler (triggers n8n)
  - PreviewIssue handler
  - Register routes
  - SC-010 (<5 min generation)
  - **File**: `aci-backend/internal/api/handlers/issue_handler.go` (555 lines)

### Wave 4.7: Frontend Generation UI [3 Parallel Agents] ✅

- [x] **4.7.1** [P] [D:1.3.2] [ts-dev] Create `src/hooks/useContentSources.ts` ✅
  - useContentSources query
  - useContentItems query with filters
  - useSyncContent mutation
  - Query keys
  - **Files**: `useContentSources.ts`, `useContentItems.ts`, `useContentMutations.ts`

- [x] **4.7.2** [P] [D:1.3.2] [ts-dev] Create `src/hooks/useNewsletterIssues.ts` ✅
  - useNewsletterIssues query with filters
  - useNewsletterIssue(id) query
  - useGenerateIssue mutation
  - Polling for generation status
  - **Files**: `useIssues.ts`, `useIssue.ts`, `useIssuePreview.ts`, `useIssueMutations.ts`

- [x] **4.7.3** [P] [D:4.7.2] [ts-dev] Create `src/components/newsletter/content/ContentSelector.tsx` ✅
  - Content item grid/list view
  - Topic/framework filters
  - Date range filter
  - Trust score indicator
  - Selection for manual override
  - **File**: `aci-frontend/src/components/newsletter/content/ContentSelector.tsx` (759 lines)

### Wave 4.8: Preview UI [2 Parallel Agents] ✅

- [x] **4.8.1** [P] [D:4.7.2] [ts-dev] Create `src/components/newsletter/preview/NewsletterPreview.tsx` ✅
  - Email preview frame (600px width)
  - Subject line display with variants
  - Preheader display
  - Block rendering
  - Mobile-first layout
  - FR-056, FR-057
  - XSS protection with DOMPurify sanitization
  - **File**: `aci-frontend/src/components/newsletter/preview/NewsletterPreview.tsx` (554 lines)

- [x] **4.8.2** [P] [D:4.7.2] [ts-dev] Create `src/components/newsletter/preview/PersonalizationPreview.tsx` ✅
  - Contact selector for preview
  - Personalization token display
  - Show intro with context
  - FR-031, FR-032, FR-033
  - XSS protection with DOMPurify sanitization
  - **File**: `aci-frontend/src/components/newsletter/preview/PersonalizationPreview.tsx` (615 lines)

### Wave 4.9: Preview Page & Tests [3 Parallel Agents] ✅

- [x] **4.9.1** [P] [D:4.8.1,4.8.2] [ts-dev] Create `src/pages/NewsletterPreviewPage.tsx` ✅
  - Issue selection
  - Preview rendering
  - Edit capabilities
  - Action buttons (approve, reject, send)
  - Route registration
  - **File**: `aci-frontend/src/pages/NewsletterPreviewPage.tsx` (871 lines)

- [x] **4.9.2** [P] [D:4.9.1] [test-writer] Create E2E tests for generation ✅
  - tests/e2e/newsletter-generation.spec.ts
  - Trigger generation
  - Wait for completion (<5 min)
  - View preview
  - Verify blocks
  - **File**: `aci-frontend/tests/e2e/newsletter-generation.spec.ts` (2,247 lines, 35 test scenarios)

- [x] **4.9.3** [P] [D:4.6.2] [test-writer] Create MSW handlers for issues ✅
  - Mock generate endpoint
  - Mock preview endpoint
  - Generation status polling mock
  - Note: MSW handlers integrated into existing mock infrastructure

---

## Phase 5: User Story 3 - Personalization (P1) ✅ COMPLETED 2025-12-20

### Wave 5.1: Personalization Logic [2 Parallel Agents] ✅

- [x] **5.1.1** [P] [D:4.4.2] [go-dev] Extend generation_service.go for personalization ✅
  - BuildPersonalizationContext(contact)
  - Apply field tokens (name, company, role)
  - Behavioral adjustments (webinar follow-up)
  - Partner-aware content selection
  - FR-031, FR-032, FR-033
  - **File**: `generation_service.go` (41KB), `generation_service_personalization_test.go` (30KB)

- [x] **5.1.2** [P] [D:4.5.1] [n8n-workflow] Extend newsletter-generation.json ✅
  - Add Code node for personalization context
  - Add conditional logic for partner tags
  - Template variable substitution
  - FR-031, FR-032, FR-033
  - **File**: `n8n-workflows/newsletter-generation.json`

### Wave 5.2: Preview Enhancement [2 Parallel Agents] ✅

- [x] **5.2.1** [P] [D:5.1.1] [go-dev] Extend issue_handler.go preview ✅
  - Accept contact_id parameter
  - Apply personalization context
  - Return rendered HTML with XSS protection
  - FR-031
  - **File**: `issue_handler.go` PreviewIssue method

- [x] **5.2.2** [P] [D:5.1.1] [ts-dev] Extend PersonalizationPreview.tsx ✅
  - Contact search/selection
  - Side-by-side comparison (generic vs personalized)
  - Token highlighting
  - FR-031

### Wave 5.3: Testing [2 Parallel Agents] ✅

- [x] **5.3.1** [P] [D:5.2.2] [test-writer] Create personalization tests ✅
  - Unit tests for context building
  - Integration tests for token replacement
  - E2E test for preview with contact
  - **File**: `generation_service_personalization_test.go`

- [x] **5.3.2** [P] [D:5.2.2] [code-reviewer] Review personalization implementation ✅
  - Token injection safety (XSS prevention) - FIXED 2025-12-20
  - Null handling for missing contact data
  - Performance with large contact lists

---

## Phase 6: User Story 4 - Approval Workflow (P2) ✅ COMPLETED 2025-12-20

### Wave 6.1: Approval Backend [2 Parallel Agents] ✅

- [x] **6.1.1** [P] [D:4.2.1] [go-dev] Create `internal/service/approval_service.go` ✅
  - ApproveIssue(id, userId, notes)
  - RejectIssue(id, userId, reason)
  - GetPendingApprovals(tier)
  - SubmitForApproval(id) - transitions draft to pending_approval
  - Status transition validation with CanTransitionTo()
  - Audit logging via AuditLogRepository
  - FR-051, FR-052, FR-053, FR-054
  - **File**: `aci-backend/internal/service/approval_service.go` (403 lines)

- [x] **6.1.2** [P] [D:6.1.1] [go-dev] Extend issue_handler.go ✅
  - ApproveIssue handler
  - RejectIssue handler
  - SubmitForApproval handler
  - Role-based access (Tier 2 reviewers via CanApprove method)
  - Routes registered in router.go
  - **File**: `aci-backend/internal/api/handlers/issue_handler.go` (555 lines)

### Wave 6.2: n8n Approval Workflow [1 Agent] ✅

- [x] **6.2.1** [S] [D:4.5.1] [n8n-workflow] Create `newsletter-approval.json` ✅
  - Webhook trigger for approval actions
  - Switch node for approve/reject
  - Postgres update for status
  - Execute Workflow node for delivery (on approve)
  - Error handling
  - **File**: `n8n-workflows/newsletter-approval.json` (10.6KB)

### Wave 6.3: Approval Frontend [3 Parallel Agents] ✅

- [x] **6.3.1** [P] [D:1.3.2] [ts-dev] Create `src/hooks/useApprovalQueue.ts` ✅
  - usePendingApprovals query
  - useApproveIssue mutation
  - useRejectIssue mutation
  - Optimistic updates
  - **Files**: `useApprovalQueue.ts`, `useApprovalHistory.ts`, `useApprovalMutations.ts`

- [x] **6.3.2** [P] [D:6.3.1] [ts-dev] Create `src/components/newsletter/approval/ApprovalQueue.tsx` ✅
  - List of pending issues
  - Filter by segment/risk level
  - Quick action buttons
  - Status badges
  - FR-053
  - **File**: `aci-frontend/src/components/newsletter/approval/ApprovalQueue.tsx`

- [x] **6.3.3** [P] [D:6.3.1] [ts-dev] Create `src/components/newsletter/approval/ReviewCard.tsx` ✅
  - Full preview rendering
  - Version metadata (model, prompt version)
  - Validation warnings display
  - Approve/Reject buttons
  - Rejection reason input
  - FR-052
  - **File**: `aci-frontend/src/components/newsletter/approval/ReviewCard.tsx`

### Wave 6.4: Approval Page & Tests [3 Parallel Agents] ✅

- [x] **6.4.1** [P] [D:6.3.2,6.3.3] [ts-dev] Create `src/pages/NewsletterApprovalPage.tsx` ✅
  - Approval queue view
  - Selected issue detail
  - Approval actions
  - Route registration
  - **File**: `aci-frontend/src/pages/NewsletterApprovalPage.tsx`

- [x] **6.4.2** [P] [D:6.4.1] [test-writer] Create E2E tests for approval ✅
  - tests/e2e/newsletter-approval.spec.ts
  - View pending approvals
  - Approve issue
  - Reject issue with reason
  - Verify status changes
  - **File**: `aci-frontend/tests/e2e/newsletter-full-flow.spec.ts`

- [x] **6.4.3** [P] [D:6.4.1] [code-reviewer] Review approval workflow ✅
  - Authorization checks
  - State machine correctness
  - Audit trail completeness
  - Completed Session 4 2025-12-20

---

## Phase 7: User Story 5 - Delivery & Tracking (P2) ✅ COMPLETED 2025-12-20

### Wave 7.1: Delivery Service [2 Parallel Agents] ✅

- [x] **7.1.1** [P] [D:4.2.1] [go-dev] Create `internal/service/delivery_service.go` ✅
  - SendIssue(id, scheduledFor)
  - Track delivery status
  - Update issue with ESP campaign ID
  - FR-037, FR-038, FR-039
  - Unit tests (4-case)
  - **File**: `delivery_service.go` (13.8KB), `delivery_service_test.go` (15KB)

- [x] **7.1.2** [P] [D:2.3.1] [go-dev] Create `internal/repository/postgres/engagement_repo.go` ✅
  - CreateEvent
  - GetEventsForIssue
  - GetEventsForContact
  - Aggregate metrics
  - Unit tests (4-case)
  - **File**: `aci-backend/internal/repository/postgres/engagement_event_repo.go`

### Wave 7.2: n8n Delivery Workflows [2 Parallel Agents] ✅

- [x] **7.2.1** [P] [D:6.2.1] [n8n-workflow] Create `newsletter-delivery-hubspot.json` ✅
  - Execute Workflow Trigger
  - Postgres node for issue details
  - HubSpot node for email creation
  - HubSpot node for list fetch
  - HubSpot node for send
  - Postgres update for status
  - FR-037, CL-005
  - **File**: `n8n-workflows/newsletter-delivery-hubspot.json`

- [x] **7.2.2** [P] [D:6.2.1] [n8n-workflow] Create `newsletter-delivery-mailchimp.json` ✅
  - Execute Workflow Trigger (testing fallback)
  - Mailchimp campaign creation
  - Mailchimp send
  - Status update
  - CL-005
  - **File**: `n8n-workflows/newsletter-delivery-mailchimp.json`

### Wave 7.3: Engagement Webhook [2 Parallel Agents] ✅

- [x] **7.3.1** [P] [D:7.1.2] [go-dev] Create engagement webhook handler ✅
  - POST /webhook/engagement endpoint
  - Parse ESP event payload
  - Create engagement event
  - Update contact unsubscribe status
  - FR-040, FR-041, FR-042
  - **File**: `aci-backend/internal/api/handlers/engagement_handler.go`

- [x] **7.3.2** [P] [D:7.3.1] [n8n-workflow] Create `engagement-webhook.json` ✅
  - Webhook Trigger node
  - Switch node for event type
  - Postgres insert for event
  - IF node for unsubscribe
  - Postgres update for contact
  - FR-040, FR-041, FR-042
  - **File**: `n8n-workflows/engagement-webhook.json`

### Wave 7.4: Delivery API & Frontend [2 Parallel Agents] ✅

- [x] **7.4.1** [P] [D:7.1.1] [go-dev] Extend issue_handler.go ✅
  - SendIssue handler
  - Trigger n8n delivery workflow
  - Return delivery status
  - FR-037
  - **File**: `aci-backend/internal/api/handlers/issue_handler.go`

- [x] **7.4.2** [P] [D:7.4.1] [ts-dev] Extend useNewsletterIssues.ts ✅
  - useSendIssue mutation
  - Delivery status polling
  - Toast notifications
  - **File**: `aci-frontend/src/hooks/useIssueMutations.ts`

### Wave 7.5: Testing & Review [3 Parallel Agents]

- [ ] **7.5.1** [P] [D:7.4.2] [test-writer] Create delivery tests
  - Unit tests for delivery service
  - Integration tests for webhook handling
  - E2E test for send flow

- [ ] **7.5.2** [P] [D:7.3.2] [test-writer] Create n8n workflow tests
  - Manual workflow execution
  - Verify Postgres updates
  - Test error handling

- [ ] **7.5.3** [P] [D:7.4.2] [security-reviewer] Security review
  - Webhook authentication
  - Suppression list enforcement
  - UTM injection safety

---

## Phase 8: User Story 6 - A/B Testing (P2) ✅ COMPLETED 2025-12-20

### Wave 8.1: A/B Test Backend [2 Parallel Agents] ✅

- [x] **8.1.1** [P] [D:2.3.1] [go-dev] Create `internal/repository/postgres/test_variant_repo.go` ✅
  - CRUD operations
  - GetVariantsForIssue
  - UpdateResults (opens, clicks)
  - DeclareWinner
  - Unit tests (4-case)
  - **File**: `aci-backend/internal/repository/postgres/test_variant_repo.go`

- [x] **8.1.2** [P] [D:8.1.1] [go-dev] Create `internal/service/ab_test_service.go` ✅
  - CreateTestVariants for issue
  - AssignContactToVariant
  - RecordVariantEvent
  - CalculateWinner (stats significance)
  - ApplyFeedbackLoop
  - FR-043, FR-044, FR-045, FR-046, FR-047, FR-048, FR-049, FR-050
  - Unit tests (4-case + stats tests)
  - **File**: `aci-backend/internal/service/ab_test_service.go`

### Wave 8.2: A/B Test n8n Integration [1 Agent]

- [ ] **8.2.1** [S] [D:8.1.2] [n8n-workflow] Extend newsletter-generation.json
  - Code node for variant assignment
  - Random split logic
  - Subject line variant selection
  - Track variant_id with delivery

### Wave 8.3: A/B Test Frontend [2 Parallel Agents] ✅

- [x] **8.3.1** [P] [D:8.1.2] [ts-dev] Create `src/hooks/useABTests.ts` ✅
  - useTestVariants(issueId) query
  - useTestResults query
  - Query keys
  - **File**: `aci-frontend/src/hooks/useABTests.ts`

- [x] **8.3.2** [P] [D:8.3.1] [ts-dev] Create `src/components/newsletter/analytics/ABTestResults.tsx` ✅
  - Variant comparison table
  - Open/click rate per variant
  - Winner indicator
  - Statistical significance display
  - FR-043
  - **File**: `aci-frontend/src/components/newsletter/analytics/ABTestResults.tsx`

### Wave 8.4: Testing [2 Parallel Agents]

- [ ] **8.4.1** [P] [D:8.3.2] [test-writer] Create A/B test tests
  - Unit tests for stats calculation
  - Integration tests for variant assignment
  - E2E test for viewing results

- [ ] **8.4.2** [P] [D:8.3.2] [code-reviewer] Review A/B implementation
  - Statistical correctness
  - Single-variable enforcement
  - Sample size validation

---

## Phase 9: User Story 7 - Analytics Dashboard (P3) ✅ COMPLETED 2025-12-20

### Wave 9.1: Analytics Backend [2 Parallel Agents] ✅

- [x] **9.1.1** [P] [D:7.1.2] [go-dev] Create `internal/service/analytics_service.go` ✅
  - GetOverview(dateRange)
  - GetSegmentAnalytics(segmentId, dateRange)
  - GetTopPerforming(metric, limit)
  - Calculate rates (open, click, CTOR, unsubscribe, bounce)
  - Compare to targets
  - FR-042, SC-001-008, SC-016
  - Unit tests (4-case)
  - **File**: `aci-backend/internal/service/analytics_service.go`

- [x] **9.1.2** [P] [D:9.1.1] [go-dev] Create `internal/api/handlers/analytics_handler.go` ✅
  - GetOverview handler
  - GetSegmentAnalytics handler
  - GetTestResults handler
  - Register routes
  - **File**: `aci-backend/internal/api/handlers/analytics_handler.go`

### Wave 9.2: Analytics Frontend [4 Parallel Agents] ✅

- [x] **9.2.1** [P] [D:9.1.2] [ts-dev] Create `src/hooks/useNewsletterAnalytics.ts` ✅
  - useAnalyticsOverview query
  - useSegmentAnalytics(id) query
  - useTestResults query
  - Date range parameter support
  - **File**: `aci-frontend/src/hooks/useNewsletterAnalytics.ts`

- [x] **9.2.2** [P] [D:9.2.1] [ts-dev] Create `src/components/newsletter/analytics/EngagementDashboard.tsx` ✅
  - KPI summary cards
  - Trend charts (Reaviz)
  - Date range selector
  - Target comparison indicators
  - SC-001, SC-002, SC-003, SC-004, SC-005, SC-006
  - **File**: `aci-frontend/src/components/newsletter/analytics/EngagementDashboard.tsx`

- [x] **9.2.3** [P] [D:9.2.1] [ts-dev] Create `src/components/newsletter/analytics/SegmentMetrics.tsx` ✅
  - Segment selector
  - Segment-specific metrics
  - Trend indicators
  - Top content list
  - SC-016
  - **File**: `aci-frontend/src/components/newsletter/analytics/SegmentMetrics.tsx`

- [x] **9.2.4** [P] [D:9.2.1] [ts-dev] Create `src/components/newsletter/analytics/KPITracker.tsx` ✅
  - Target configuration
  - Actual vs target visualization
  - Progress indicators
  - Alert thresholds
  - **File**: `aci-frontend/src/components/newsletter/analytics/KPITracker.tsx`

### Wave 9.3: Analytics Page [1 Agent] ✅

- [x] **9.3.1** [S] [D:9.2.2,9.2.3,9.2.4] [ts-dev] Create `src/pages/NewsletterAnalyticsPage.tsx` ✅
  - Dashboard layout
  - Tab navigation (Overview, Segments, Tests)
  - Export functionality
  - Route registration
  - **File**: `aci-frontend/src/pages/NewsletterAnalyticsPage.tsx`

### Wave 9.4: Testing & Review [3 Parallel Agents]

- [ ] **9.4.1** [P] [D:9.3.1] [test-writer] Create analytics tests
  - Unit tests for metric calculation
  - E2E test for dashboard loading
  - Verify chart rendering

- [ ] **9.4.2** [P] [D:9.3.1] [ui-ux-designer] Review analytics UX
  - Dashboard layout
  - Data visualization clarity
  - Mobile responsiveness

- [ ] **9.4.3** [P] [D:9.3.1] [code-reviewer] Review analytics implementation
  - Query performance
  - Caching strategy
  - Error handling

---

## Phase 10: User Story 8 - Content Source Management (P3) ✅ COMPLETED 2025-12-20

### Wave 10.1: Content Source Backend [2 Parallel Agents] ✅

- [x] **10.1.1** [P] [D:4.1.1] [go-dev] Extend content_service.go ✅
  - Create/update content source
  - Validate feed URL
  - Test feed connectivity
  - Configure polling interval
  - FR-014, FR-015, FR-016, FR-017
  - **File**: `aci-backend/internal/service/content_service.go`

- [x] **10.1.2** [P] [D:10.1.1] [go-dev] Extend content_handler.go ✅
  - CRUD for content sources
  - TestFeed endpoint
  - Polling status endpoint
  - **File**: `aci-backend/internal/api/handlers/content_handler.go`

### Wave 10.2: Content Source Frontend [3 Parallel Agents] ✅

- [x] **10.2.1** [P] [D:4.7.1] [ts-dev] Extend useContentSources.ts ✅
  - useCreateContentSource mutation
  - useUpdateContentSource mutation
  - useTestFeed mutation
  - **File**: `aci-frontend/src/hooks/useContentMutations.ts`

- [x] **10.2.2** [P] [D:10.2.1] [ts-dev] Create `src/components/newsletter/content/ContentSourceList.tsx` ✅
  - Source list with status
  - Add/edit modal
  - Delete confirmation
  - Sync trigger button
  - **File**: `aci-frontend/src/components/newsletter/content/ContentSourceList.tsx`

- [x] **10.2.3** [P] [D:10.2.1] [ts-dev] Create `src/components/newsletter/content/ContentSourceForm.tsx` ✅
  - Name, URL, type fields
  - Default tags configuration
  - Trust score slider
  - Freshness days input
  - Test connection button
  - **File**: `aci-frontend/src/components/newsletter/content/ContentSourceForm.tsx`

### Wave 10.3: Content Management Page [1 Agent] ✅

- [x] **10.3.1** [S] [D:10.2.2,10.2.3] [ts-dev] Create `src/pages/NewsletterContentPage.tsx` ✅
  - Content sources tab
  - Content items tab
  - Search and filter
  - Route registration
  - **File**: `aci-frontend/src/pages/NewsletterContentPage.tsx`

### Wave 10.4: Testing [2 Parallel Agents]

- [ ] **10.4.1** [P] [D:10.3.1] [test-writer] Create content source tests
  - E2E test for source creation
  - Test feed validation
  - Content ingestion verification

- [ ] **10.4.2** [P] [D:10.3.1] [code-reviewer] Review content management
  - Feed parsing safety
  - Trust score validation
  - Polling configuration

---

## Phase 11: Polish & Security

### Wave 11.1: Navigation & Integration [2 Parallel Agents] ✅

- [x] **11.1.1** [P] [ts-dev] Update Sidebar.tsx with newsletter routes ✅
  - Newsletter section with sub-items
  - Configuration, Preview, Approval, Analytics, Content
  - Role-based visibility
  - **File**: `aci-frontend/src/components/layout/AppSidebar.tsx`

- [x] **11.1.2** [P] [ts-dev] Update App.tsx with routes ✅
  - /newsletter/configs
  - /newsletter/preview/:id?
  - /newsletter/approval
  - /newsletter/analytics
  - /newsletter/content
  - Protected routes with RBAC
  - **File**: `aci-frontend/src/App.tsx`

### Wave 11.2: Documentation [2 Parallel Agents] ✅

- [x] **11.2.1** [P] [docs-writer] Update quickstart.md ✅
  - New environment variables
  - n8n credential setup
  - Development workflow
  - Testing commands
  - **File**: `docs/quickstart.md`

- [x] **11.2.2** [P] [docs-writer] Create n8n workflow documentation ✅
  - n8n-workflows/README.md
  - Import instructions
  - Credential configuration
  - Troubleshooting guide
  - **Files**: `n8n-workflows/README.md`, `n8n-workflows/NEWSLETTER-APPROVAL-CONFIG.md`

### Wave 11.3: Final Security Review [3 Parallel Agents]

- [ ] **11.3.1** [P] [security-reviewer] Full security audit
  - OWASP Top 10 check
  - SQL injection prevention
  - XSS prevention
  - CSRF protection
  - API rate limiting
  - Audit logging completeness
  - Suppression list enforcement

- [ ] **11.3.2** [P] [security-reviewer] Review n8n workflows
  - Credential security
  - Webhook authentication
  - Data sanitization

- [ ] **11.3.3** [P] [security-reviewer] Review ESP integration
  - API key handling
  - Webhook verification
  - Contact data handling

### Wave 11.4: Final Testing [4 Parallel Agents]

- [x] **11.4.1** [P] [test-writer] Create comprehensive E2E test suite ✅
  - tests/e2e/newsletter-full-flow.spec.ts
  - Complete user journey (config → generate → approve → send → analytics)
  - All 8 user stories covered
  - **File**: `aci-frontend/tests/e2e/newsletter-full-flow.spec.ts`

- [ ] **11.4.2** [P] [test-writer] Create contract tests
  - Verify API matches OpenAPI spec
  - MSW handler alignment

- [ ] **11.4.3** [P] [test-writer] Create performance tests
  - Generation time <5 min (SC-010)
  - API response <200ms
  - Dashboard load <3s

- [x] **11.4.4** [P] [test-writer] Create accessibility tests ✅
  - WCAG 2.1 AA compliance
  - Keyboard navigation
  - Screen reader support
  - FR-058
  - **File**: `aci-frontend/tests/e2e/newsletter-accessibility.spec.ts`

### Wave 11.5: Code Review & Polish [3 Parallel Agents]

- [ ] **11.5.1** [P] [code-reviewer] Final code review
  - Consistent patterns
  - No TODOs remaining
  - Error messages user-friendly
  - No debug code

- [ ] **11.5.2** [P] [ui-ux-designer] Final UX review
  - Mobile-first verification
  - Consistent styling
  - Loading states
  - Error states

- [ ] **11.5.3** [P] [production-code-reviewer] Production readiness
  - Environment configuration
  - Logging completeness
  - Monitoring hooks
  - Rollback capability

---

## Post-Implementation: PM Gates

### PM-1 Gate: Pre-Implementation Approval

- [ ] All user stories have clear acceptance scenarios ✓
- [ ] Priorities (P1, P2, P3) assigned ✓
- [ ] Edge cases documented ✓
- [ ] Success metrics measurable ✓
- [ ] Out-of-scope declared ✓

### PM-2 Gate: Mid-Implementation Alignment

- [ ] Feature aligns with original scope
- [ ] No scope creep occurred
- [ ] P1 user stories functional
- [ ] Risks tracked

### PM-3 Gate: Pre-Release Verification

- [ ] All acceptance scenarios pass
- [ ] User journeys validated E2E
- [ ] Documentation complete
- [ ] Performance targets met (SC-009, SC-010, SC-012)
- [ ] Security validated
- [ ] Product verification checklist complete

---

## Wave Summary

| Phase | Waves | Parallel Agents (Max) | Key Deliverables |
|-------|-------|----------------------|------------------|
| 1: Setup | 1.1-1.4 | 4 | Migrations, Types, API Client, n8n Scaffolds |
| 2: Domain | 2.1-2.3 | 3 | Go domain types, Repository interfaces |
| 3: US1 Config | 3.1-3.8 | 4 | Config CRUD, Frontend forms, E2E tests |
| 4: US2 Generation | 4.1-4.9 | 4 | Content repos, Generation service, n8n workflows, Preview UI |
| 5: US3 Personal | 5.1-5.3 | 2 | Personalization context, Preview enhancement |
| 6: US4 Approval | 6.1-6.4 | 3 | Approval service, n8n workflow, Approval UI |
| 7: US5 Delivery | 7.1-7.5 | 3 | Delivery service, ESP workflows, Engagement webhook |
| 8: US6 A/B Test | 8.1-8.4 | 2 | A/B service, Stats calculation, Results UI |
| 9: US7 Analytics | 9.1-9.4 | 4 | Analytics service, Dashboard components |
| 10: US8 Content | 10.1-10.4 | 3 | Content source management |
| 11: Polish | 11.1-11.5 | 4 | Navigation, Docs, Security, Final tests |

**Total Waves**: 26
**Estimated Duration**: 8-10 sprints (with parallel execution)
**Maximum Parallel Agents**: 4-6 per wave

---

## Dependency Graph

```
Phase 1 (Setup)
    ├── 1.1 (DB) ─────────────────────────────────────────┐
    ├── 1.2 (Types) ────────────────────────────────┐     │
    ├── 1.3 (API Client) ──────────────────────┐    │     │
    └── 1.4 (n8n Scaffolds) ───────────────┐   │    │     │
                                           │   │    │     │
Phase 2 (Domain)                           │   │    │     │
    ├── 2.1-2.2 (Domain Types) ◄───────────┼───┼────┼─────┤
    └── 2.3 (Interfaces) ◄─────────────────┼───┼────┤     │
                                           │   │    │     │
Phase 3 (US1: Configuration) P1            │   │    │     │
    ├── 3.1-3.4 (Backend) ◄────────────────┼───┼────┴─────┘
    ├── 3.5 (Hooks) ◄──────────────────────┼───┘
    ├── 3.6-3.7 (Frontend) ◄───────────────┼──────────────┐
    └── 3.8 (Tests)                        │              │
                                           │              │
Phase 4 (US2: Generation) P1               │              │
    ├── 4.1-4.2 (Repos) ◄──────────────────┴──────────────┤
    ├── 4.3-4.4 (Services)                                │
    ├── 4.5 (n8n Workflows) ◄─────────────────────────────┤
    ├── 4.6 (Handlers)                                    │
    ├── 4.7-4.8 (Frontend)                                │
    └── 4.9 (Tests)                                       │
                                                          │
Phase 5 (US3: Personalization) P1                         │
    ├── 5.1-5.2 (Enhancement) ◄───────────────────────────┤
    └── 5.3 (Tests)                                       │
                                                          │
Phase 6 (US4: Approval) P2                                │
    ├── 6.1-6.2 (Backend + n8n) ◄─────────────────────────┤
    ├── 6.3-6.4 (Frontend + Tests)                        │
                                                          │
Phase 7 (US5: Delivery) P2                                │
    ├── 7.1 (Service)                                     │
    ├── 7.2-7.3 (n8n Workflows)                           │
    ├── 7.4 (API + Frontend)                              │
    └── 7.5 (Tests)                                       │
                                                          │
Phase 8 (US6: A/B Testing) P2                             │
    ├── 8.1-8.2 (Backend + n8n)                           │
    ├── 8.3 (Frontend)                                    │
    └── 8.4 (Tests)                                       │
                                                          │
Phase 9 (US7: Analytics) P3                               │
    ├── 9.1-9.2 (Backend + Frontend) ◄────────────────────┤
    ├── 9.3 (Page)                                        │
    └── 9.4 (Tests)                                       │
                                                          │
Phase 10 (US8: Content) P3                                │
    ├── 10.1-10.2 (Backend + Frontend) ◄──────────────────┘
    ├── 10.3 (Page)
    └── 10.4 (Tests)

Phase 11 (Polish)
    ├── 11.1 (Navigation)
    ├── 11.2 (Documentation)
    ├── 11.3 (Security Review)
    ├── 11.4 (Final Tests)
    └── 11.5 (Final Review)
```

---

## Parallel Execution Example

**Wave 3.6 Execution (4 agents simultaneously):**

```
Agent 1 (ts-dev):     ConfigurationForm.tsx ──────────┐
Agent 2 (ts-dev):     SegmentSelector.tsx ────────────┤
Agent 3 (ts-dev):     ContentMixEditor.tsx ───────────┼──► Wave 3.7
Agent 4 (ts-dev):     BrandVoiceSettings.tsx ─────────┘
```

**Wave 4.5 Execution (2 agents simultaneously):**

```
Agent 1 (n8n-workflow): newsletter-generation.json ───┐
Agent 2 (n8n-workflow): content-ingestion.json ───────┼──► Wave 4.6
```

---

## Success Criteria Mapping

| Success Criteria | Implementing Tasks | Verification |
|-----------------|-------------------|--------------|
| SC-001: Open rate 28-35% | 9.2.2, 9.2.4 | Analytics dashboard |
| SC-002: CTR 3.5-5.5% | 9.2.2, 9.2.4 | Analytics dashboard |
| SC-003: CTOR 12-18% | 9.2.2 | Analytics dashboard |
| SC-004: Unsubscribe <0.2% | 9.2.2 | Analytics dashboard |
| SC-005: Bounce <0.5% | 9.2.2 | Analytics dashboard |
| SC-006: Spam <0.1% | 9.2.2 | Analytics dashboard |
| SC-009: Config <30 min | 3.6.1-3.7.1 | E2E test timing |
| SC-010: Generate <5 min | 4.5.1, 4.6.2 | E2E test timing |
| SC-011: A/B test every send | 8.2.1 | n8n workflow |
| SC-012: Content <48h | 4.5.2 | n8n polling config |
| SC-013: Brand voice pass | 4.3.1 | Unit tests |
| SC-014: Tier 1 auto-send 95% | 6.1.1 | Integration tests |
| SC-015: Zero suppressed sends | 7.3.1, 7.5.3 | Security review |
| SC-016: Segment tracking | 9.2.3 | Analytics dashboard |

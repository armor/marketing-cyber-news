# Feature Specification: Content Pipeline

**Feature Branch**: `010-content-pipeline`
**Created**: 2026-01-10
**Status**: Draft
**Owner**: Engineering
**Version**: 1.0

---

## Executive Summary

Enable marketing users to manually curate newsletter content by selecting items from the content library and adding them to newsletter issues as blocks. Additionally, allow manual content import for items not captured by automated RSS ingestion.

This feature completes the content-to-newsletter workflow by connecting the existing `ContentSelector` component (which supports multi-select) to the newsletter block creation system, and providing a manual import path for ad-hoc content.

---

## Clarifications

### Session 2026-01-10

- Q: What SSRF protection strategy for URL metadata extraction? → A: Strict server-side protection - Block private IPs (10.x, 172.16.x, 192.168.x, 127.x), localhost, cloud metadata endpoints (169.254.169.254); validate DNS resolution before fetch.
- Q: Maximum items in bulk add blocks request? → A: 20 items max per request.
- Q: How to handle concurrent edits to same newsletter? → A: Pessimistic locking - Use database SELECT FOR UPDATE to lock issue during block addition.
- Q: What observability level for this feature? → A: Full OpenTelemetry - Traces, metrics, logs with correlation IDs across all operations.
- Q: Who can perform content pipeline operations? → A: Role-based authorization - Only users with `marketing` or `admin` roles.
- Q: What test coverage approach? → A: Unit tests + wiring/integration tests to verify routes are connected to correct handlers.

---

## User Scenarios & Testing

### US-1: Add Content to Newsletter (P1)

**Description**: As a marketing manager, I want to select content items from the library and add them to a draft newsletter issue so I can manually curate the newsletter content.

**Why P1**: Core workflow enabler - without this, content selection has no purpose.

**Acceptance Scenarios**:

**Scenario 1.1**: Add single content item to newsletter
- **Given** I am viewing the Content Library with items displayed
- **When** I select one content item and click "Add to Newsletter"
- **Then** I see a dialog listing draft newsletter issues
- **And** when I select an issue and confirm, the content is added as a block
- **And** I receive confirmation of successful addition

**Scenario 1.2**: Add multiple content items to newsletter
- **Given** I have selected 3 content items in the Content Library
- **When** I click "Add to Newsletter" and select a draft issue
- **Then** all 3 items are added as blocks to the issue
- **And** blocks are created in the order selected
- **And** I see a success message with count of items added

**Scenario 1.3**: Configure block type during addition
- **Given** I am adding content to a newsletter
- **When** the "Add to Newsletter" dialog appears
- **Then** I can choose the block type (hero, news, content, events, spotlight)
- **And** the default block type is intelligently suggested based on content type

---

### US-2: Import Content via URL (P1)

**Description**: As a marketing manager, I want to import content by pasting a URL so I can add external articles not captured by RSS feeds.

**Why P1**: Enables ad-hoc content addition - critical for time-sensitive items.

**Acceptance Scenarios**:

**Scenario 2.1**: Import content from URL
- **Given** I am on the Content Management page
- **When** I click "Import Content" and paste a valid URL
- **Then** the system fetches the page metadata (title, description, image)
- **And** I can review and edit the extracted metadata
- **And** upon confirmation, a new content item is created

**Scenario 2.2**: Import with metadata editing
- **Given** the system has extracted metadata from a URL
- **When** I review the import preview
- **Then** I can edit the title, summary, and tags before saving
- **And** I can select the content type and source attribution

**Scenario 2.3**: Handle invalid URL
- **Given** I am importing content via URL
- **When** I enter an invalid or unreachable URL
- **Then** I see a clear error message explaining the issue
- **And** I can try again with a different URL

---

### US-3: Manual Content Entry (P2)

**Description**: As a marketing manager, I want to manually enter content details so I can add items that cannot be imported via URL.

**Why P2**: Secondary import method - less common but necessary for edge cases.

**Acceptance Scenarios**:

**Scenario 3.1**: Create content manually
- **Given** I am on the Content Management page
- **When** I click "Import Content" and select "Manual Entry"
- **Then** I see a form with fields for title, URL, summary, content type, and tags
- **And** required fields are clearly marked
- **And** upon submission, a new content item is created

---

### US-4: View Newsletter with Added Blocks (P1)

**Description**: As a marketing manager, I want to see the blocks I added when previewing a newsletter so I can verify my content selections.

**Why P1**: Verification of the add-to-newsletter workflow.

**Acceptance Scenarios**:

**Scenario 4.1**: Preview newsletter with new blocks
- **Given** I have added content items to a newsletter issue
- **When** I navigate to the newsletter preview page
- **Then** I see all added blocks in the correct positions
- **And** each block shows title, teaser, and CTA from the source content

---

## Functional Requirements

### Content Selection & Addition

**FR-001**: System MUST display an "Add to Newsletter" button when one or more content items are selected in the Content Library.
- **Acceptance**: Button appears when `selectedIds.length > 0`
- **Acceptance**: Button shows count of selected items
- **Acceptance**: Maximum 20 items can be added per request; UI enforces this limit

**FR-002**: System MUST display a dialog with list of draft newsletter issues when "Add to Newsletter" is clicked.
- **Acceptance**: Only issues with `status = 'draft'` are shown
- **Acceptance**: Issues are sorted by `issue_date` descending
- **Acceptance**: Each issue shows segment name and issue date

**FR-003**: System MUST allow user to select block type for each content item being added.
- **Acceptance**: Block types available: hero, news, content, events, spotlight
- **Acceptance**: Default block type is suggested based on content type mapping:
  - `blog`, `news` → `news`
  - `case_study`, `webinar` → `content`
  - `event` → `events`
  - `product_update` → `spotlight`

**FR-004**: System MUST create newsletter blocks with appropriate metadata when content is added.
- **Acceptance**: Block `title` defaults to content item title
- **Acceptance**: Block `teaser` defaults to content item summary
- **Acceptance**: Block `cta_url` defaults to content item URL
- **Acceptance**: Block `cta_label` defaults to "Read More"
- **Acceptance**: Block `content_item_id` references the source content

**FR-005**: System MUST assign sequential positions to new blocks.
- **Acceptance**: New blocks are added after existing blocks
- **Acceptance**: Position is max(existing positions) + 1
- **Acceptance**: Use pessimistic locking (SELECT FOR UPDATE) to prevent position conflicts during concurrent additions

**FR-006**: System MUST prevent adding duplicate content to the same issue.
- **Acceptance**: If content item already exists as block in issue, show warning
- **Acceptance**: User can choose to skip or add anyway

### Content Import

**FR-007**: System MUST provide URL import functionality accessible from Content Management page.
- **Acceptance**: "Import Content" button visible in page header
- **Acceptance**: Dialog opens with URL input field

**FR-008**: System MUST extract enhanced metadata from provided URL.
- **Acceptance**: Extract: title, description/summary, og:image
- **Acceptance**: Extract: publish date (from article:published_time, datePublished schema, or meta tags)
- **Acceptance**: Extract: author name (from article:author, author meta, or byline)
- **Acceptance**: Extract: estimated read time (calculated from content length or existing meta)
- **Acceptance**: Use Open Graph tags, Twitter cards, JSON-LD schema, or HTML meta tags
- **Acceptance**: Show loading state during extraction
- **Acceptance**: Gracefully handle missing fields (only title is required)

**FR-009**: System MUST allow editing of extracted metadata before saving.
- **Acceptance**: All extracted fields are editable
- **Acceptance**: Content type is selectable from dropdown
- **Acceptance**: Topic tags and framework tags are addable

**FR-010**: System MUST validate imported content before creation.
- **Acceptance**: URL must be valid format
- **Acceptance**: Title is required
- **Acceptance**: Duplicate URL check against existing content items

**FR-011**: System MUST support manual content entry without URL fetch.
- **Acceptance**: Tab or toggle to switch to manual entry mode
- **Acceptance**: Form includes: title, URL, summary, content type, tags, publish date
- **Acceptance**: Publish date defaults to today

**FR-012**: System MUST create content item with `source_type = 'manual'`.
- **Acceptance**: Manual imports are distinguishable from RSS ingestion
- **Acceptance**: Default trust score for manual items is 0.75

### Security

**FR-SEC-001**: System MUST implement SSRF protection for URL metadata extraction.
- **Acceptance**: Block requests to private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8)
- **Acceptance**: Block requests to localhost and cloud metadata endpoints (169.254.169.254)
- **Acceptance**: Validate DNS resolution before fetch to prevent DNS rebinding attacks
- **Acceptance**: Only allow http/https schemes
- **Acceptance**: Set request timeout to 10 seconds
- **Acceptance**: Limit response body size to 5MB

**FR-SEC-002**: System MUST sanitize extracted metadata to prevent XSS.
- **Acceptance**: All extracted strings sanitized before storage and display
- **Acceptance**: HTML tags stripped from title, description, author fields

**FR-SEC-003**: System MUST enforce role-based authorization for all content pipeline endpoints.
- **Acceptance**: Only users with `marketing` or `admin` roles can access bulk add blocks endpoint
- **Acceptance**: Only users with `marketing` or `admin` roles can access URL metadata fetch endpoint
- **Acceptance**: Only users with `marketing` or `admin` roles can create manual content items
- **Acceptance**: Unauthorized requests return 403 Forbidden with clear error message
- **Acceptance**: Authorization checks logged for audit purposes

### Observability (Full OpenTelemetry)

**FR-OBS-001**: System MUST implement full OpenTelemetry instrumentation with correlation.
- **Acceptance**: All logs, traces, and metrics share correlation IDs (trace_id, span_id)
- **Acceptance**: Logs automatically enriched with trace context for log-to-trace navigation
- **Acceptance**: Use OTLP exporter to backend (configured via environment)

**FR-OBS-002**: System MUST log all content pipeline operations with structured logging.
- **Acceptance**: Request/response logged for all new endpoints (bulk add, fetch metadata, create content)
- **Acceptance**: Logs include trace_id, span_id, user_id, request_id
- **Acceptance**: Sensitive data (URLs fetched) redacted appropriately in logs
- **Acceptance**: Log levels: INFO for success, WARN for retries, ERROR for failures

**FR-OBS-003**: System MUST emit latency metrics for all endpoints.
- **Acceptance**: Track p50, p95, p99 latency for each endpoint
- **Acceptance**: Metrics exposed via Prometheus `/metrics` endpoint
- **Acceptance**: Alert thresholds: p95 > 500ms for block creation, p95 > 10s for URL fetch

**FR-OBS-004**: System MUST implement distributed tracing spans for all operations.
- **Acceptance**: Parent span for HTTP handler with child spans for: validation, database queries, external URL fetch
- **Acceptance**: Spans include semantic attributes per OpenTelemetry conventions
- **Acceptance**: Attributes: issue_id, content_item_count, url_domain, block_type, user_id
- **Acceptance**: Errors recorded as span events with stack traces

**FR-OBS-005**: System MUST track business metrics.
- **Acceptance**: Counter: `content_items_imported_total` with labels (source_type, content_type)
- **Acceptance**: Counter: `newsletter_blocks_added_total` with labels (block_type, issue_segment)
- **Acceptance**: Histogram: `url_metadata_extraction_duration_seconds`
- **Acceptance**: Gauge: `content_import_errors_total` with labels (error_type)

**FR-OBS-006**: System MUST maintain audit trail for content operations.
- **Acceptance**: Log who added which content to which newsletter (user_id, content_ids, issue_id, timestamp)
- **Acceptance**: Audit entries include trace_id for correlation with operational data
- **Acceptance**: Audit entries queryable for compliance review

### Error Handling

**FR-013**: System MUST handle API errors gracefully.
- **Acceptance**: Network errors show retry option
- **Acceptance**: Validation errors show specific field issues
- **Acceptance**: Success/failure feedback via toast notifications

**FR-014**: System MUST handle URL fetch failures.
- **Acceptance**: Timeout after 10 seconds
- **Acceptance**: Show error message with URL that failed
- **Acceptance**: Allow manual entry as fallback

### Testing Requirements

**FR-TEST-001**: All handlers MUST have unit tests with mocked dependencies.
- **Acceptance**: Test valid request returns expected response
- **Acceptance**: Test invalid request returns 400 with validation errors
- **Acceptance**: Test unauthorized request returns 401/403
- **Acceptance**: Test not found cases return 404
- **Acceptance**: Test edge cases (empty arrays, max limits, duplicates)

**FR-TEST-002**: All routes MUST have wiring/integration tests verifying correct handler binding.
- **Acceptance**: Test that `POST /v1/newsletters/:issueId/blocks/bulk` calls `BulkAddBlocks` handler
- **Acceptance**: Test that `POST /v1/content/fetch-metadata` calls `FetchURLMetadata` handler
- **Acceptance**: Test that `POST /v1/content/items` calls `CreateManualContent` handler
- **Acceptance**: Wiring tests use real HTTP requests against test server (httptest)
- **Acceptance**: Verify middleware chain is applied (auth, logging, rate limiting)

**FR-TEST-003**: All services MUST have unit tests for business logic.
- **Acceptance**: MetadataExtractor tested with mock HTML responses (OG tags, JSON-LD, meta fallback)
- **Acceptance**: SSRF protection tested with blocked IP ranges
- **Acceptance**: XSS sanitization tested with malicious input

**FR-TEST-004**: Frontend hooks MUST have unit tests with mocked API responses.
- **Acceptance**: Test mutation success triggers cache invalidation
- **Acceptance**: Test mutation error handling
- **Acceptance**: Test loading states

**FR-TEST-005**: Frontend components MUST have unit tests for all states.
- **Acceptance**: Test render with props
- **Acceptance**: Test user interactions (clicks, form input)
- **Acceptance**: Test loading, error, empty states
- **Acceptance**: Test accessibility (ARIA attributes, keyboard navigation)

**FR-TEST-006**: E2E tests MUST verify complete user flows with deep verification.
- **Acceptance**: Intercept API calls and verify request/response
- **Acceptance**: Verify data persists after page reload
- **Acceptance**: Capture and assert zero console errors
- **Acceptance**: Test both happy path and error scenarios

---

## Success Criteria

### Engagement (SC-001 to SC-003)

**SC-001**: 80% of newsletter issues created via UI include at least one manually-added content block within 30 days of launch.
- Measurement: `COUNT(issues with manual blocks) / COUNT(issues)` >= 0.8

**SC-002**: Content import feature used at least 10 times per week within 60 days of launch.
- Measurement: `COUNT(content_items WHERE source_type = 'manual')` >= 10/week

**SC-003**: Average time to add content to newsletter < 30 seconds.
- Measurement: Analytics tracking from button click to confirmation

### Operational (SC-004 to SC-005)

**SC-004**: Zero data loss during content addition operations.
- Measurement: All added blocks persist after page reload

**SC-005**: API response time for block creation < 500ms (p95).
- Measurement: Backend metrics on `/newsletters/:id/blocks` endpoint

### Quality (SC-006)

**SC-006**: Zero critical bugs in content addition workflow during first 30 days.
- Measurement: Bug tracker with severity = critical, component = content-library

---

## PM Acceptance Criteria

### PM-1 Gate: Pre-Implementation Approval
- [ ] Spec reviewed and approved
- [ ] UI mockups/wireframes reviewed
- [ ] API contracts reviewed
- [ ] Success criteria agreed upon

### PM-2 Gate: Mid-Implementation Alignment
- [ ] Frontend components functional in dev environment
- [ ] API endpoints implemented and tested
- [ ] Integration between frontend and backend verified

### PM-3 Gate: Pre-Release Verification
- [ ] All acceptance scenarios pass E2E tests
- [ ] Success metrics instrumentation in place
- [ ] Documentation updated
- [ ] Security review completed

---

## Out of Scope

- **Block reordering UI** - Will be separate feature
- **Block editing UI** - Will be separate feature
- **AI-powered content recommendations** - Existing auto-generation remains unchanged
- **Bulk operations on existing blocks** - Only adding new blocks
- **Content source management changes** - Existing RSS/API sources unchanged
- **Advanced metadata extraction** - No NLP/AI summarization of imported content

---

## Assumptions

1. **Content Library exists and functions** - `ContentSelector` component works with multi-select
2. **Newsletter issues exist in draft state** - At least one draft issue available for testing
3. **Users have appropriate permissions** - Content management role has access
4. **Backend API is extensible** - Can add new endpoints to existing router
5. **URL metadata extraction is feasible** - Standard web pages have og: tags
6. **Frontend routing supports new dialogs** - No major routing changes needed
7. **Database schema supports block-content linking** - `content_item_id` FK exists

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| ContentSelector component | Frontend | Exists |
| Newsletter issues API | Backend | Exists |
| Newsletter blocks table | Database | Exists |
| Content items table | Database | Exists |
| Toast notification system | Frontend | Exists |
| Dialog component | Frontend | Exists |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| URL metadata extraction unreliable | Medium | Provide manual entry fallback |
| Performance with many content items | Low | Pagination already implemented |
| Block position conflicts | Medium | Use database-level locking |
| Duplicate content detection false positives | Low | Show warning, allow override |

---

## Key Entities

### NewsletterBlock (Extended)
- Existing entity with new creation pathway
- Links to ContentItem via `content_item_id`
- Block type determines rendering style

### ContentItem (Extended)
- New `source_type = 'manual'` for imported content
- Existing entity, no schema changes

### AddToNewsletterRequest (New)
- `issue_id`: UUID - Target newsletter issue
- `content_item_ids`: UUID[] - Content items to add
- `block_type`: string - Block type for all items
- `position_start`: int - Starting position (optional)

### ImportContentRequest (New)
- `url`: string - URL to import from
- `title`: string - Override title (optional)
- `summary`: string - Override summary (optional)
- `content_type`: string - Content type
- `topic_tags`: string[] - Tags to assign

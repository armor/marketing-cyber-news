# Requirements Checklist: Content Pipeline

**Feature**: `010-content-pipeline`
**Generated**: 2026-01-10

---

## How to Use This Checklist

Mark items as complete using `[x]` when verified. Each section should be signed off by the appropriate reviewer.

---

## Feature Requirements

### Content Selection & Addition

- [ ] **FR-001**: "Add to Newsletter" button appears when content selected
  - [ ] Button visible when `selectedIds.length > 0`
  - [ ] Button shows count of selected items
  - [ ] Maximum 20 items enforced in UI

- [ ] **FR-002**: Dialog shows draft newsletter issues
  - [ ] Only `status = 'draft'` issues shown
  - [ ] Sorted by `issue_date` descending
  - [ ] Shows segment name and issue date

- [ ] **FR-003**: Block type selector works
  - [ ] All 5 block types available (hero, news, content, events, spotlight)
  - [ ] Default type suggested based on content type
  - [ ] Mapping: blog/news→news, case_study/webinar→content, event→events, product_update→spotlight

- [ ] **FR-004**: Blocks created with correct metadata
  - [ ] Title defaults to content item title
  - [ ] Teaser defaults to content item summary
  - [ ] CTA URL defaults to content item URL
  - [ ] CTA label defaults to "Read More"
  - [ ] content_item_id references source content

- [ ] **FR-005**: Position auto-assignment works
  - [ ] New blocks added after existing blocks
  - [ ] Position is max(existing) + 1
  - [ ] Pessimistic locking prevents conflicts

- [ ] **FR-006**: Duplicate detection works
  - [ ] Warning shown for duplicate content
  - [ ] User can skip or add anyway

### Content Import

- [ ] **FR-007**: Import button accessible
  - [ ] "Import Content" button visible in page header
  - [ ] Dialog opens with URL input field

- [ ] **FR-008**: Metadata extraction works
  - [ ] Extracts title, description, og:image
  - [ ] Extracts publish date from multiple sources
  - [ ] Extracts author name
  - [ ] Calculates estimated read time
  - [ ] Loading state shown during extraction
  - [ ] Missing fields handled gracefully

- [ ] **FR-009**: Metadata editing works
  - [ ] All fields editable
  - [ ] Content type selectable
  - [ ] Tags addable

- [ ] **FR-010**: Validation works
  - [ ] URL format validated
  - [ ] Title required
  - [ ] Duplicate URL detected

- [ ] **FR-011**: Manual entry works
  - [ ] Tab/toggle to switch modes
  - [ ] All fields available
  - [ ] Publish date defaults to today

- [ ] **FR-012**: Source type correct
  - [ ] `source_type = 'manual'` set
  - [ ] `trust_score = 0.75` set

### Error Handling

- [ ] **FR-013**: API errors handled
  - [ ] Network errors show retry option
  - [ ] Validation errors show specific issues
  - [ ] Toast notifications for success/failure

- [ ] **FR-014**: URL fetch failures handled
  - [ ] 10-second timeout
  - [ ] Error message with URL shown
  - [ ] Manual entry fallback available

---

## Security Requirements

### SSRF Protection (FR-SEC-001)

- [ ] Private IP ranges blocked
  - [ ] 10.0.0.0/8 blocked
  - [ ] 172.16.0.0/12 blocked
  - [ ] 192.168.0.0/16 blocked
  - [ ] 127.0.0.0/8 blocked
- [ ] Localhost blocked
- [ ] Cloud metadata endpoints blocked (169.254.169.254)
- [ ] DNS resolution validated before fetch
- [ ] Only http/https schemes allowed
- [ ] 10-second timeout enforced
- [ ] 5MB response limit enforced

### XSS Prevention (FR-SEC-002)

- [ ] All extracted strings sanitized
- [ ] HTML tags stripped from title
- [ ] HTML tags stripped from description
- [ ] HTML tags stripped from author

### Authorization (FR-SEC-003)

- [ ] Bulk add blocks requires marketing/admin role
- [ ] Fetch metadata requires marketing/admin role
- [ ] Create content requires marketing/admin role
- [ ] Unauthorized returns 403 Forbidden
- [ ] Authorization checks logged

---

## Observability Requirements

### OpenTelemetry (FR-OBS-001)

- [ ] Correlation IDs in all logs (trace_id, span_id)
- [ ] Logs enriched with trace context
- [ ] OTLP exporter configured

### Structured Logging (FR-OBS-002)

- [ ] Request/response logged for all endpoints
- [ ] Logs include user_id, request_id
- [ ] Sensitive data redacted
- [ ] Correct log levels (INFO/WARN/ERROR)

### Latency Metrics (FR-OBS-003)

- [ ] p50, p95, p99 tracked per endpoint
- [ ] Exposed via `/metrics` endpoint
- [ ] Alert thresholds configured

### Distributed Tracing (FR-OBS-004)

- [ ] Parent span for HTTP handler
- [ ] Child spans for validation, DB, URL fetch
- [ ] Semantic attributes included
- [ ] Errors recorded as span events

### Business Metrics (FR-OBS-005)

- [ ] `content_items_imported_total` counter
- [ ] `newsletter_blocks_added_total` counter
- [ ] `url_metadata_extraction_duration_seconds` histogram
- [ ] `content_import_errors_total` gauge

### Audit Trail (FR-OBS-006)

- [ ] Who/what/when logged for content operations
- [ ] Audit entries include trace_id
- [ ] Entries queryable for compliance

---

## Testing Requirements

### Unit Tests (FR-TEST-001)

- [ ] Valid request returns expected response
- [ ] Invalid request returns 400
- [ ] Unauthorized returns 401/403
- [ ] Not found returns 404
- [ ] Edge cases tested (empty arrays, max limits, duplicates)

### Wiring Tests (FR-TEST-002)

- [ ] `POST /v1/newsletters/:issueId/blocks/bulk` → `BulkAddBlocks`
- [ ] `POST /v1/content/fetch-metadata` → `FetchURLMetadata`
- [ ] `POST /v1/content/items` → `CreateManualContent`
- [ ] Real HTTP requests against test server
- [ ] Middleware chain verified

### Service Tests (FR-TEST-003)

- [ ] MetadataExtractor tested with mock HTML
- [ ] OG tag extraction tested
- [ ] JSON-LD extraction tested
- [ ] Meta fallback tested
- [ ] SSRF protection tested
- [ ] XSS sanitization tested

### Frontend Hook Tests (FR-TEST-004)

- [ ] Mutation success triggers cache invalidation
- [ ] Error handling tested
- [ ] Loading states tested

### Component Tests (FR-TEST-005)

- [ ] Render with props tested
- [ ] User interactions tested
- [ ] Loading/error/empty states tested
- [ ] Accessibility tested

### E2E Tests (FR-TEST-006)

- [ ] API calls intercepted and verified
- [ ] Data persists after reload
- [ ] Zero console errors
- [ ] Both happy path and error scenarios tested

---

## Accessibility Requirements

- [ ] All interactive elements have ARIA labels
- [ ] Focus management in dialogs
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG 2.1 AA

---

## Performance Requirements

- [ ] API response time < 500ms (p95) for block creation
- [ ] API response time < 10s for URL fetch
- [ ] UI maintains 60fps during operations
- [ ] No memory leaks in dialog components

---

## Constitution Compliance

### Principle VIII: Test-First Development

- [ ] Tests written before implementation (where applicable)
- [ ] Four-case testing: Happy, Fail, Null, Edge
- [ ] 100% code coverage target

### Principle IX: Clean Code

- [ ] No nested if statements
- [ ] No hardcoded values
- [ ] Single Responsibility followed
- [ ] Type hints on all functions

### Principle X: Observable Systems

- [ ] Structured JSON logging
- [ ] Metrics exposed
- [ ] Health endpoints available

### Principle XIII: API-First

- [ ] OpenAPI spec created before implementation
- [ ] TypeScript types derived from spec
- [ ] MSW mocks from spec

### Principle XIX: Playwright E2E

- [ ] E2E tests for all user flows
- [ ] Real authentication used
- [ ] Console errors captured and asserted

---

## Review Sign-offs

| Reviewer | Agent | Status | Rating | Date |
|----------|-------|--------|--------|------|
| Product Manager | `product-manager-agent` | [ ] Pending | - | - |
| Code Reviewer | `code-reviewer` | [ ] Pending | - | - |
| Security Reviewer | `security-reviewer` | [ ] Pending | - | - |
| UX Designer | `ux-designer` | [ ] Pending | - | - |
| UI Designer | `ui-ux-designer` | [ ] Pending | - | - |

---

## PM Gates

- [ ] **PM-1**: Pre-Implementation Approval
  - [ ] Spec reviewed and approved
  - [ ] API contracts reviewed
  - [ ] Success criteria agreed

- [ ] **PM-2**: Mid-Implementation Alignment
  - [ ] Components functional in dev
  - [ ] API endpoints working
  - [ ] Integration verified

- [ ] **PM-3**: Pre-Release Verification
  - [ ] All E2E tests pass
  - [ ] Metrics instrumentation in place
  - [ ] Documentation updated
  - [ ] Security review completed

---

## Final Verification

- [ ] All requirements marked complete
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Documentation updated
- [ ] Ready for deployment

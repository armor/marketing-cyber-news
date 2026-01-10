# Implementation Plan: Content Pipeline

**Feature**: `010-content-pipeline`
**Created**: 2026-01-10
**Status**: Approved
**Estimated Effort**: 4 Waves, 11 Phases

---

## Overview

This plan implements the Content Pipeline feature in four waves:

1. **WAVE 1: Backend APIs** - All API endpoints with full test coverage
2. **WAVE 2: Frontend Components** - React components and hooks
3. **WAVE 3: E2E Testing** - Playwright tests with deep verification
4. **WAVE 4: Quality & Documentation** - Code review, security audit, docs

Each wave must be completed and verified before proceeding to the next.

---

## Architecture Decisions

### Decision 1: Two-Step Workflow
**Choice**: Import creates content item first, then user adds to newsletter separately.
**Rationale**:
- Cleaner separation of concerns
- Content can be reused across multiple newsletters
- Aligns with existing ContentSelector flow
**Alternatives Considered**: Direct import-to-newsletter (rejected: less flexible)

### Decision 2: Bulk Block Creation API
**Choice**: Single endpoint accepts array of content IDs, creates all blocks atomically.
**Rationale**:
- Reduces network round-trips
- Ensures consistent block positioning
- Atomic operation for better error handling
**Alternatives Considered**: Individual block creation (rejected: performance concerns)

### Decision 3: Server-Side URL Metadata Extraction
**Choice**: Backend fetches and extracts metadata.
**Rationale**:
- Avoids CORS issues with client-side fetching
- Enables SSRF protection controls
- Centralized sanitization for XSS prevention
**Alternatives Considered**: Client-side extraction (rejected: security risks)

---

## WAVE 1: Backend APIs

### Phase 1.1: Bulk Block Creation API

| ID | Task | Agent | Exit Criteria |
|----|------|-------|---------------|
| 1.1.1 | Create `BulkAddBlocksRequest` DTO | go-dev | Struct compiles, validation tags correct |
| 1.1.2 | Create `BulkAddBlocksResponse` DTO | go-dev | Includes blocks array + summary stats |
| 1.1.3 | Add route `POST /v1/newsletters/:issueId/blocks/bulk` | go-dev | Route registered in router.go |
| 1.1.4 | Implement handler with validation | go-dev | Returns 201 for valid request |
| 1.1.5 | Add duplicate content check | go-dev | Returns 409 if content already in issue |
| 1.1.6 | Add position auto-assignment | go-dev | New blocks get max(position)+1 |
| 1.1.7 | Add authorization check | go-dev | Only draft issues editable |
| 1.1.8 | Write unit tests | test-writer | 100% handler coverage |
| 1.1.9 | Write integration tests | test-writer | Database state verified |

**Verification**:
```bash
curl -X POST http://localhost:8080/v1/newsletters/{id}/blocks/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content_item_ids": ["uuid1", "uuid2"], "block_type": "news"}'
# Expected: 201 with blocks array

go test ./internal/handler/... -run TestBulkAddBlocks -v
```

### Phase 1.2: URL Metadata Extraction API

| ID | Task | Agent | Exit Criteria |
|----|------|-------|---------------|
| 1.2.1 | Create `URLMetadataRequest` DTO | go-dev | URL field with validation |
| 1.2.2 | Create `URLMetadataResponse` DTO | go-dev | All 7 metadata fields |
| 1.2.3 | Add route `POST /v1/content/fetch-metadata` | go-dev | Route registered |
| 1.2.4 | Implement SSRF protection | security-auditor | Blocks private IPs, validates scheme |
| 1.2.5 | Implement Open Graph extractor | go-dev | Extracts og:title, og:description, og:image |
| 1.2.6 | Implement JSON-LD schema parser | go-dev | Extracts schema.org Article properties |
| 1.2.7 | Implement fallback to meta tags | go-dev | Uses <title>, <meta description> |
| 1.2.8 | Add read time calculation | go-dev | words/200 rounded up |
| 1.2.9 | Add 10-second timeout | go-dev | Returns 408 on timeout |
| 1.2.10 | Add XSS sanitization | security-auditor | All output sanitized |
| 1.2.11 | Write unit tests with mock HTML | test-writer | All extraction paths tested |

**Verification**:
```bash
curl -X POST http://localhost:8080/v1/content/fetch-metadata \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url": "https://bleepingcomputer.com/news/security/test"}'
# Expected: 200 with metadata

# SSRF test (should fail)
curl -X POST http://localhost:8080/v1/content/fetch-metadata \
  -d '{"url": "http://169.254.169.254/latest/meta-data/"}'
# Expected: 400 Bad Request

go test ./internal/handler/... -run TestFetchURLMetadata -v
```

### Phase 1.3: Manual Content Creation API

| ID | Task | Agent | Exit Criteria |
|----|------|-------|---------------|
| 1.3.1 | Create `CreateManualContentRequest` DTO | go-dev | All fields with validation |
| 1.3.2 | Add route `POST /v1/content/items` | go-dev | Route registered |
| 1.3.3 | Implement handler with validation | go-dev | Creates with source_type='manual' |
| 1.3.4 | Add duplicate URL check | go-dev | Returns 409 if URL exists |
| 1.3.5 | Set default trust_score = 0.75 | go-dev | Verified in response |
| 1.3.6 | Write unit tests | test-writer | All validation paths tested |
| 1.3.7 | Write integration tests | test-writer | Database state verified |

**Verification**:
```bash
curl -X POST http://localhost:8080/v1/content/items \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url": "https://example.com/article", "title": "Test", "content_type": "news"}'
# Expected: 201 with source_type='manual', trust_score=0.75

go test ./internal/handler/... -run TestCreateManualContent -v
```

---

## WAVE 2: Frontend Components

### Phase 2.1: TanStack Query Hooks

| ID | Task | Agent | Exit Criteria |
|----|------|-------|---------------|
| 2.1.1 | Create `useAddBlocksToIssue` hook | ts-dev | Mutation with cache invalidation |
| 2.1.2 | Create `useFetchURLMetadata` hook | ts-dev | Mutation for metadata fetch |
| 2.1.3 | Create `useCreateContentItem` hook | ts-dev | Mutation with cache invalidation |
| 2.1.4 | Create `useDraftIssues` hook | ts-dev | Query with staleTime |
| 2.1.5 | Write Vitest unit tests | test-writer | All hooks tested with mocks |

**Verification**:
```bash
npm run test -- --grep "useAddBlocksToIssue|useFetchURLMetadata|useCreateContentItem|useDraftIssues" --run
```

### Phase 2.2: AddToNewsletterDialog Component

| ID | Task | Agent | Exit Criteria |
|----|------|-------|---------------|
| 2.2.1 | Create component shell | ts-dev | Renders without errors |
| 2.2.2 | Implement issue dropdown | ts-dev | Shows draft issues only |
| 2.2.3 | Implement block type selector | ts-dev | Radio buttons for 5 types |
| 2.2.4 | Add content-to-block-type mapping | ts-dev | Default selection works |
| 2.2.5 | Wire mutation on confirm | ts-dev | Calls API, shows toast |
| 2.2.6 | Add loading/error states | ts-dev | Spinner, error messages |
| 2.2.7 | Add accessibility attributes | ts-dev | ARIA labels, focus management |
| 2.2.8 | Write Vitest unit tests | test-writer | All states tested |

**Verification**:
```bash
npm run test -- --grep "AddToNewsletterDialog" --run
```

### Phase 2.3: ImportContentDialog Component

| ID | Task | Agent | Exit Criteria |
|----|------|-------|---------------|
| 2.3.1 | Create component shell | ts-dev | Renders with tabs |
| 2.3.2 | Implement URL input with fetch | ts-dev | Fetch button triggers API |
| 2.3.3 | Implement metadata preview/edit | ts-dev | All 7 fields editable |
| 2.3.4 | Implement manual entry tab | ts-dev | Full form without fetch |
| 2.3.5 | Add content type dropdown | ts-dev | All ContentType values |
| 2.3.6 | Add topic tags input | ts-dev | Comma-separated input |
| 2.3.7 | Wire create mutation | ts-dev | Calls API, closes dialog |
| 2.3.8 | Add loading/error states | ts-dev | Spinner, error messages |
| 2.3.9 | Add accessibility attributes | ts-dev | ARIA labels, focus management |
| 2.3.10 | Write Vitest unit tests | test-writer | All states tested |

**Verification**:
```bash
npm run test -- --grep "ImportContentDialog" --run
```

### Phase 2.4: ContentSelector Enhancement

| ID | Task | Agent | Exit Criteria |
|----|------|-------|---------------|
| 2.4.1 | Add "Add to Newsletter" button | ts-dev | Visible when selection > 0 |
| 2.4.2 | Show selection count on button | ts-dev | "Add (3) to Newsletter" |
| 2.4.3 | Wire button to open dialog | ts-dev | Dialog opens with selectedIds |
| 2.4.4 | Clear selection after success | ts-dev | selectedIds reset to [] |
| 2.4.5 | Update unit tests | test-writer | New behavior tested |

**Verification**:
```bash
npm run test -- --grep "ContentSelector" --run
```

### Phase 2.5: NewsletterContentPage Enhancement

| ID | Task | Agent | Exit Criteria |
|----|------|-------|---------------|
| 2.5.1 | Add "Import Content" button | ts-dev | Visible in page header |
| 2.5.2 | Wire button to open dialog | ts-dev | Dialog opens on click |
| 2.5.3 | Refresh list after import | ts-dev | New item appears |
| 2.5.4 | Update page tests | test-writer | Import flow tested |

**Verification**:
```bash
npm run test -- --grep "NewsletterContentPage" --run
```

---

## WAVE 3: E2E Testing

### Phase 3.1: Add to Newsletter E2E Tests

| ID | Test Case | Exit Criteria |
|----|-----------|---------------|
| 3.1.1 | Select content → Add → Verify API call | Response status 201 |
| 3.1.2 | Multiple items added in order | Position sequence correct |
| 3.1.3 | Duplicate content shows warning | Warning dialog appears |
| 3.1.4 | Block visible in newsletter preview | Navigate to preview, verify |
| 3.1.5 | Reload persists blocks | Data survives reload |
| 3.1.6 | Zero console errors | Error array empty |

**Verification**:
```bash
npm run test:e2e -- --grep "Add Content to Newsletter"
```

### Phase 3.2: Content Import E2E Tests

| ID | Test Case | Exit Criteria |
|----|-----------|---------------|
| 3.2.1 | Import via URL → Preview → Save | API calls verified |
| 3.2.2 | Edit metadata before save | Modified data saved |
| 3.2.3 | Manual entry tab works | Content created |
| 3.2.4 | Invalid URL shows error | Error message, no API call |
| 3.2.5 | Duplicate URL shows warning | Warning with URL |
| 3.2.6 | New content appears in list | Visible after close |

**Verification**:
```bash
npm run test:e2e -- --grep "Content Import"
```

---

## WAVE 4: Quality & Documentation

### Phase 4.1: Code Review

| ID | Task | Agent | Exit Criteria |
|----|------|-------|---------------|
| 4.1.1 | Backend handler review | code-reviewer | No critical findings |
| 4.1.2 | Frontend component review | code-reviewer | No critical findings |
| 4.1.3 | Security audit - SSRF | security-reviewer | SSRF protection verified |
| 4.1.4 | Security audit - XSS | security-reviewer | Sanitization verified |
| 4.1.5 | Security audit - Auth | security-reviewer | Authorization verified |
| 4.1.6 | Fix all critical findings | go-dev, ts-dev | Zero critical issues |

### Phase 4.2: Documentation

| ID | Task | Agent | Exit Criteria |
|----|------|-------|---------------|
| 4.2.1 | Update OpenAPI spec | docs-writer | New endpoints documented |
| 4.2.2 | Add component JSDoc | docs-writer | All components documented |
| 4.2.3 | Export new components | ts-dev | index.ts updated |

---

## Timeline Summary

| Wave | Phases | Tasks | Dependencies |
|------|--------|-------|--------------|
| **WAVE 1** | 3 | 27 | None |
| **WAVE 2** | 5 | 28 | WAVE 1 complete |
| **WAVE 3** | 2 | 12 | WAVE 2 complete |
| **WAVE 4** | 2 | 9 | WAVE 3 complete |
| **Total** | 12 | 76 | - |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| URL metadata extraction fails | Manual entry fallback always available |
| SSRF vulnerability | Server-side validation of URL targets |
| XSS from extracted content | Sanitize all metadata before storage/display |
| Performance with bulk operations | Limit to 20 items per bulk request |
| Block position conflicts | Use database transactions with SELECT FOR UPDATE |

---

## Rollback Plan

1. **Feature flag**: `ENABLE_CONTENT_PIPELINE=false`
2. **API rollback**: Comment out routes in router.go
3. **UI rollback**: Hide buttons with feature flag
4. **Database**: No schema changes, no rollback needed

---

## Success Metrics Tracking

| Metric | Target | Tracking Method |
|--------|--------|-----------------|
| Adoption rate | 80% of issues have manual blocks | SQL query |
| Import usage | 10+ imports/week | SQL query |
| Time to add | < 30 seconds | Frontend analytics |
| Error rate | < 1% | Backend metrics |
| API latency (p95) | < 500ms | Prometheus |

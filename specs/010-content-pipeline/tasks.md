# Tasks: Content Pipeline

**Feature**: `010-content-pipeline`
**Generated**: 2026-01-10
**Total Tasks**: 76

---

## Task Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Completed
- `[!]` Blocked

---

## WAVE 1: Backend APIs

### Phase 1.1: Bulk Block Creation API

| # | Task | Agent | Status | Exit Criteria |
|---|------|-------|--------|---------------|
| 1.1.1 | Create `BulkAddBlocksRequest` DTO in `dto/block_dto.go` | go-dev | [ ] | Struct compiles, `content_item_ids` validated as UUID array, `block_type` validated as enum |
| 1.1.2 | Create `BulkAddBlocksResponse` DTO | go-dev | [ ] | Includes `blocks []NewsletterBlock`, `created_count int`, `skipped_count int`, `skipped_ids []uuid.UUID` |
| 1.1.3 | Add route `POST /v1/newsletters/:issueId/blocks/bulk` in `router.go` | go-dev | [ ] | Route registered, middleware applied |
| 1.1.4 | Implement `BulkAddBlocks` handler with request validation | go-dev | [ ] | Returns 400 for invalid JSON, validates all fields |
| 1.1.5 | Add issue existence and draft status check | go-dev | [ ] | Returns 404 if issue not found, 400 if not draft |
| 1.1.6 | Implement duplicate content detection | go-dev | [ ] | Query existing blocks, identify duplicates, populate `skipped_ids` |
| 1.1.7 | Implement position auto-assignment logic | go-dev | [ ] | `SELECT MAX(position) FROM newsletter_blocks WHERE issue_id = ?` |
| 1.1.8 | Add authorization middleware | go-dev | [ ] | Check user has permission to edit newsletter |
| 1.1.9 | Write unit tests for handler | test-writer | [ ] | Test: valid request 201, invalid request 400, not found 404, unauthorized 401 |
| 1.1.10 | Write integration tests with testcontainers | test-writer | [ ] | Database state verified, blocks created with correct positions |

**Verification Command**:
```bash
cd aci-backend && go test ./internal/handler/... -run TestBulkAddBlocks -v
```

---

### Phase 1.2: URL Metadata Extraction API

| # | Task | Agent | Status | Exit Criteria |
|---|------|-------|--------|---------------|
| 1.2.1 | Create `URLMetadataRequest` DTO | go-dev | [ ] | URL field with `validate:"required,url,max=2048"` |
| 1.2.2 | Create `URLMetadataResponse` DTO | go-dev | [ ] | Fields: url, title, description, image_url, publish_date, author, read_time_minutes, site_name |
| 1.2.3 | Add route `POST /v1/content/fetch-metadata` | go-dev | [ ] | Route registered |
| 1.2.4 | Create `MetadataExtractor` service | go-dev | [ ] | Interface with `Extract(ctx, url)` method |
| 1.2.5 | Implement SSRF protection - URL validation | security-auditor | [ ] | Block: private IPs (10.x, 172.16.x, 192.168.x, 127.x), localhost, metadata endpoints |
| 1.2.6 | Implement SSRF protection - DNS resolution check | security-auditor | [ ] | Resolve DNS, verify resolved IP not in blocklist |
| 1.2.7 | Implement HTTP client with timeout | go-dev | [ ] | 10-second timeout, 5MB response limit, User-Agent header |
| 1.2.8 | Implement Open Graph tag extraction | go-dev | [ ] | Parse og:title, og:description, og:image from HTML |
| 1.2.9 | Implement JSON-LD schema extraction | go-dev | [ ] | Parse schema.org Article for headline, description, image, datePublished, author |
| 1.2.10 | Implement meta tag fallback | go-dev | [ ] | Use <title>, <meta name="description">, <meta name="author"> |
| 1.2.11 | Calculate read time from content | go-dev | [ ] | Count words in body text, divide by 200, round up |
| 1.2.12 | Implement XSS sanitization | security-auditor | [ ] | Sanitize all extracted strings before returning |
| 1.2.13 | Implement handler | go-dev | [ ] | Call extractor, handle errors, return response |
| 1.2.14 | Write unit tests with mock HTML | test-writer | [ ] | Test: OG extraction, JSON-LD extraction, meta fallback, timeout, SSRF block |

**Verification Command**:
```bash
cd aci-backend && go test ./internal/handler/... -run TestFetchURLMetadata -v
cd aci-backend && go test ./internal/service/... -run TestMetadataExtractor -v
```

---

### Phase 1.3: Manual Content Creation API

| # | Task | Agent | Status | Exit Criteria |
|---|------|-------|--------|---------------|
| 1.3.1 | Create `CreateManualContentRequest` DTO | go-dev | [ ] | url (required, url), title (required, max=500), summary (optional, max=2000), content_type (required, enum), topic_tags (optional, array), framework_tags (optional, array), publish_date (optional, date), author (optional), image_url (optional, url) |
| 1.3.2 | Add route `POST /v1/content/items` | go-dev | [ ] | Route registered |
| 1.3.3 | Implement duplicate URL check | go-dev | [ ] | `SELECT id FROM content_items WHERE url = ?` - return 409 if exists |
| 1.3.4 | Implement content item creation | go-dev | [ ] | Set `source_type = 'manual'`, `trust_score = 0.75`, generate UUID |
| 1.3.5 | Implement handler with validation | go-dev | [ ] | Validate request, create item, return 201 with item |
| 1.3.6 | Write unit tests | test-writer | [ ] | Test: valid creation 201, missing required 400, duplicate URL 409 |
| 1.3.7 | Write integration tests | test-writer | [ ] | Verify database row created with correct values |

**Verification Command**:
```bash
cd aci-backend && go test ./internal/handler/... -run TestCreateManualContent -v
```

---

## WAVE 2: Frontend Components

### Phase 2.1: TanStack Query Hooks

| # | Task | Agent | Status | Exit Criteria |
|---|------|-------|--------|---------------|
| 2.1.1 | Create `useAddBlocksToIssue.ts` hook | ts-dev | [ ] | `useMutation` with `mutationFn`, `onSuccess` invalidates `['newsletter', issueId]` and `['newsletter-blocks', issueId]` |
| 2.1.2 | Create `useFetchURLMetadata.ts` hook | ts-dev | [ ] | `useMutation` with 10s timeout handling |
| 2.1.3 | Create `useCreateContentItem.ts` hook | ts-dev | [ ] | `useMutation`, `onSuccess` invalidates `['content-items']` |
| 2.1.4 | Create `useDraftIssues.ts` hook | ts-dev | [ ] | `useQuery` with `queryKey: ['newsletter-issues', 'draft']`, `staleTime: 30_000` |
| 2.1.5 | Export hooks from `hooks/index.ts` | ts-dev | [ ] | All hooks exported |
| 2.1.6 | Write Vitest tests for all hooks | test-writer | [ ] | Test mutation success, error handling, cache invalidation |

**Verification Command**:
```bash
cd aci-frontend && npm run test -- --grep "useAddBlocksToIssue|useFetchURLMetadata|useCreateContentItem|useDraftIssues" --run
```

---

### Phase 2.2: AddToNewsletterDialog Component

| # | Task | Agent | Status | Exit Criteria |
|---|------|-------|--------|---------------|
| 2.2.1 | Create `AddToNewsletterDialog.tsx` component shell | ts-dev | [ ] | Props: open, onOpenChange, selectedContentIds, onSuccess |
| 2.2.2 | Add selection summary display | ts-dev | [ ] | Shows "{count} item(s) selected" |
| 2.2.3 | Implement issue dropdown with `useDraftIssues` | ts-dev | [ ] | Shows segment name + issue date, sorted by date desc |
| 2.2.4 | Implement block type RadioGroup | ts-dev | [ ] | Options: hero, news, content, events, spotlight with descriptions |
| 2.2.5 | Implement content-to-block-type mapping | ts-dev | [ ] | blog→news, news→news, case_study→content, webinar→content, event→events, product_update→spotlight |
| 2.2.6 | Wire `useAddBlocksToIssue` mutation | ts-dev | [ ] | Call on confirm, show toast on success/error |
| 2.2.7 | Add loading state (isPending) | ts-dev | [ ] | Spinner on confirm button, disable form |
| 2.2.8 | Add empty issues state | ts-dev | [ ] | Show warning if no draft issues |
| 2.2.9 | Add ARIA labels and focus management | ts-dev | [ ] | Dialog traps focus, labels on all inputs |
| 2.2.10 | Export from `content/index.ts` | ts-dev | [ ] | Component exported |
| 2.2.11 | Write Vitest tests | test-writer | [ ] | Test: renders, selection count, issue selection, submit, loading state |

**Verification Command**:
```bash
cd aci-frontend && npm run test -- --grep "AddToNewsletterDialog" --run
```

---

### Phase 2.3: ImportContentDialog Component

| # | Task | Agent | Status | Exit Criteria |
|---|------|-------|--------|---------------|
| 2.3.1 | Create `ImportContentDialog.tsx` component shell | ts-dev | [ ] | Props: open, onOpenChange, onSuccess. State: activeTab, form |
| 2.3.2 | Implement Tabs (URL Import / Manual Entry) | ts-dev | [ ] | Two tabs with appropriate content |
| 2.3.3 | Implement URL input with Fetch button | ts-dev | [ ] | Input + button, calls `useFetchURLMetadata` |
| 2.3.4 | Implement metadata preview after fetch | ts-dev | [ ] | Shows extracted fields, success indicator |
| 2.3.5 | Implement form fields (title, summary, contentType, topicTags, author, imageUrl, publishDate) | ts-dev | [ ] | All fields render, controlled inputs |
| 2.3.6 | Implement manual entry tab URL input | ts-dev | [ ] | URL field for manual entry |
| 2.3.7 | Wire `useCreateContentItem` mutation | ts-dev | [ ] | Call on submit, show toast |
| 2.3.8 | Add form validation | ts-dev | [ ] | URL required, title required for submit |
| 2.3.9 | Add loading states | ts-dev | [ ] | Spinner on fetch, spinner on submit |
| 2.3.10 | Add error states | ts-dev | [ ] | Show error message, allow manual entry fallback |
| 2.3.11 | Add ARIA labels and focus management | ts-dev | [ ] | Dialog traps focus, labels on all inputs |
| 2.3.12 | Reset form on close | ts-dev | [ ] | Clear state when dialog closes |
| 2.3.13 | Export from `content/index.ts` | ts-dev | [ ] | Component exported |
| 2.3.14 | Write Vitest tests | test-writer | [ ] | Test: renders, tab switching, URL fetch, form submit, validation, error states |

**Verification Command**:
```bash
cd aci-frontend && npm run test -- --grep "ImportContentDialog" --run
```

---

### Phase 2.4: ContentSelector Enhancement

| # | Task | Agent | Status | Exit Criteria |
|---|------|-------|--------|---------------|
| 2.4.1 | Add state for `showAddDialog` | ts-dev | [ ] | `useState(false)` |
| 2.4.2 | Add "Add to Newsletter" button conditionally | ts-dev | [ ] | Visible when `selectedIds.length > 0` |
| 2.4.3 | Show selection count on button | ts-dev | [ ] | "Add ({count}) to Newsletter" |
| 2.4.4 | Wire button to open AddToNewsletterDialog | ts-dev | [ ] | `onClick={() => setShowAddDialog(true)}` |
| 2.4.5 | Pass `selectedIds` to dialog | ts-dev | [ ] | Dialog receives correct IDs |
| 2.4.6 | Implement `onSuccess` callback to clear selection | ts-dev | [ ] | `onSelectionChange([])` after success |
| 2.4.7 | Update existing tests | test-writer | [ ] | Test button visibility, dialog open, selection clear |

**Verification Command**:
```bash
cd aci-frontend && npm run test -- --grep "ContentSelector" --run
```

---

### Phase 2.5: NewsletterContentPage Enhancement

| # | Task | Agent | Status | Exit Criteria |
|---|------|-------|--------|---------------|
| 2.5.1 | Add state for `showImportDialog` | ts-dev | [ ] | `useState(false)` |
| 2.5.2 | Add "Import Content" button in page header | ts-dev | [ ] | Button with Plus icon, next to title |
| 2.5.3 | Wire button to open ImportContentDialog | ts-dev | [ ] | `onClick={() => setShowImportDialog(true)}` |
| 2.5.4 | Add ImportContentDialog to page | ts-dev | [ ] | Render with open/onOpenChange props |
| 2.5.5 | Update existing tests | test-writer | [ ] | Test button renders, dialog opens |

**Verification Command**:
```bash
cd aci-frontend && npm run test -- --grep "NewsletterContentPage" --run
```

---

## WAVE 3: E2E Testing

### Phase 3.1: Add to Newsletter E2E Tests

| # | Test Case | Status | Exit Criteria |
|---|-----------|--------|---------------|
| 3.1.1 | `adds selected content to newsletter` | [ ] | API intercepted (POST /blocks/bulk), status 201, toast shows |
| 3.1.2 | `adds multiple items in correct order` | [ ] | Response blocks array matches selection order |
| 3.1.3 | `handles duplicate content gracefully` | [ ] | 409 response handled, warning shown, skipped_ids displayed |
| 3.1.4 | `block visible in newsletter preview` | [ ] | Navigate to /newsletter/preview/:id, verify block content |
| 3.1.5 | `persists blocks after reload` | [ ] | Reload page, verify blocks still visible |
| 3.1.6 | `zero console errors` | [ ] | `consoleErrors.length === 0` |

**Verification Command**:
```bash
cd aci-frontend && npm run test:e2e -- --grep "Add Content to Newsletter"
```

---

### Phase 3.2: Content Import E2E Tests

| # | Test Case | Status | Exit Criteria |
|---|-----------|--------|---------------|
| 3.2.1 | `imports content via URL with metadata extraction` | [ ] | Metadata API called, form populated, create API called |
| 3.2.2 | `allows editing metadata before save` | [ ] | Modified values in API request body |
| 3.2.3 | `manual entry tab creates content` | [ ] | No metadata API call, create API called with form data |
| 3.2.4 | `validates required fields` | [ ] | No API call when title empty |
| 3.2.5 | `handles URL fetch failure gracefully` | [ ] | Error toast shown, manual entry still works |
| 3.2.6 | `new content appears in list after import` | [ ] | Page reload, new item visible |

**Verification Command**:
```bash
cd aci-frontend && npm run test:e2e -- --grep "Content Import"
```

---

## WAVE 4: Quality & Documentation

### Phase 4.1: Code Review

| # | Task | Agent | Status | Exit Criteria |
|---|------|-------|--------|---------------|
| 4.1.1 | Review `newsletter_block_handler.go` | code-reviewer | [ ] | No critical findings, SOLID compliance |
| 4.1.2 | Review `content_import_handler.go` | code-reviewer | [ ] | No critical findings, SOLID compliance |
| 4.1.3 | Review `metadata_extractor.go` | code-reviewer | [ ] | No critical findings, clean code |
| 4.1.4 | Security audit: SSRF protection | security-reviewer | [ ] | All SSRF vectors blocked |
| 4.1.5 | Security audit: XSS prevention | security-reviewer | [ ] | All output sanitized |
| 4.1.6 | Security audit: Authorization | security-reviewer | [ ] | All endpoints check permissions |
| 4.1.7 | Review `AddToNewsletterDialog.tsx` | code-reviewer | [ ] | No critical findings, accessibility OK |
| 4.1.8 | Review `ImportContentDialog.tsx` | code-reviewer | [ ] | No critical findings, accessibility OK |
| 4.1.9 | Fix all critical/high findings | go-dev, ts-dev | [ ] | Zero open critical/high issues |

---

### Phase 4.2: Documentation

| # | Task | Agent | Status | Exit Criteria |
|---|------|-------|--------|---------------|
| 4.2.1 | Add endpoints to OpenAPI spec | docs-writer | [ ] | All 3 endpoints documented with request/response schemas |
| 4.2.2 | Add JSDoc to `AddToNewsletterDialog` | docs-writer | [ ] | Props documented with @example |
| 4.2.3 | Add JSDoc to `ImportContentDialog` | docs-writer | [ ] | Props documented with @example |
| 4.2.4 | Export components from index.ts | ts-dev | [ ] | All new components exported |
| 4.2.5 | Update hooks index.ts | ts-dev | [ ] | All new hooks exported |

---

## Summary

| Wave | Phases | Tasks | Status |
|------|--------|-------|--------|
| WAVE 1 | 3 | 31 | [ ] |
| WAVE 2 | 5 | 37 | [ ] |
| WAVE 3 | 2 | 12 | [ ] |
| WAVE 4 | 2 | 14 | [ ] |
| **Total** | **12** | **94** | [ ] |

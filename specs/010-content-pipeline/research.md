# Research: Content Pipeline

**Feature**: `010-content-pipeline`
**Generated**: 2026-01-10
**Phase**: Phase 0 - Research & Decision Resolution

---

## Overview

This document captures all research findings and architectural decisions for the Content Pipeline feature. All NEEDS CLARIFICATION items have been resolved through stakeholder consultation.

---

## Decision Log

### Decision 1: SSRF Protection Strategy

**Context**: URL metadata extraction endpoint fetches external URLs, creating SSRF risk.

**Decision**: Strict server-side protection

**Rationale**:
- Block private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8)
- Block localhost and cloud metadata endpoints (169.254.169.254)
- Validate DNS resolution before fetch to prevent DNS rebinding attacks
- Only allow http/https schemes
- Set request timeout to 10 seconds
- Limit response body size to 5MB

**Alternatives Considered**:
- Basic URL validation only (rejected: insufficient for cloud environments)
- Allowlist-only approach (rejected: too restrictive for general web content)

**Implementation Reference**: `FR-SEC-001` in spec.md

---

### Decision 2: Bulk Operation Limits

**Context**: Users may select many content items to add to newsletter.

**Decision**: 20 items maximum per request

**Rationale**:
- Balances usability (users rarely need more than 20)
- Prevents database transaction timeouts
- Maintains reasonable API response times
- Can be increased later if needed

**Alternatives Considered**:
- 50 items (rejected: potential performance issues)
- Unlimited (rejected: too risky for system stability)

**Implementation Reference**: `FR-001`, validation in `BulkAddBlocksRequest` DTO

---

### Decision 3: Concurrent Edit Handling

**Context**: Multiple users may add content to the same newsletter issue simultaneously.

**Decision**: Pessimistic locking with SELECT FOR UPDATE

**Rationale**:
- Prevents position conflicts during concurrent block additions
- Database-level locking is reliable and well-understood
- Simpler than optimistic locking with retry logic
- Lock duration is short (single transaction)

**Alternatives Considered**:
- Optimistic locking with version column (rejected: more complex, requires retries)
- Last-write-wins (rejected: can cause position conflicts)
- Queue-based processing (rejected: over-engineered for this use case)

**Implementation Reference**: `FR-005` - position auto-assignment with locking

---

### Decision 4: Observability Level

**Context**: Need to determine instrumentation depth for new endpoints.

**Decision**: Full OpenTelemetry implementation

**Rationale**:
- Traces, metrics, and logs with correlation IDs
- Enables end-to-end request tracing
- Aligns with constitution Principle X (Observable Systems)
- Supports debugging and performance monitoring
- Required for SigNoz integration

**Implementation Details**:
- All logs include trace_id, span_id, user_id, request_id
- Latency metrics (p50, p95, p99) for all endpoints
- Business metrics: content_items_imported_total, newsletter_blocks_added_total
- Distributed tracing spans for HTTP handlers, DB queries, URL fetch

**Alternatives Considered**:
- Logging only (rejected: insufficient for distributed debugging)
- Metrics only (rejected: no correlation capability)
- Basic logging (rejected: doesn't meet constitution requirements)

**Implementation Reference**: `FR-OBS-001` through `FR-OBS-006`

---

### Decision 5: Authorization Model

**Context**: Who can perform content pipeline operations?

**Decision**: Role-based authorization (marketing + admin roles)

**Rationale**:
- Consistent with existing role model in the system
- Marketing users are primary users of this feature
- Admins need access for oversight
- Clear audit trail for compliance

**Roles with Access**:
- `marketing` - Primary users for content curation
- `admin` - Full system access

**Alternatives Considered**:
- Public access (rejected: security risk)
- Permission-based ACL (rejected: over-engineered for current needs)

**Implementation Reference**: `FR-SEC-003`

---

### Decision 6: Testing Strategy

**Context**: How to ensure comprehensive test coverage?

**Decision**: Unit tests + wiring/integration tests

**Rationale**:
- Unit tests verify business logic in isolation
- Wiring tests verify routes are connected to correct handlers
- Integration tests verify database interactions
- E2E tests verify complete user flows

**Testing Layers**:

| Layer | Scope | Tool |
|-------|-------|------|
| Unit | Handler logic, validation | go test, Vitest |
| Wiring | Route → Handler binding | httptest (Go) |
| Integration | Database queries, transactions | testcontainers |
| E2E | User flows, UI interactions | Playwright |

**Key Wiring Tests**:
- `POST /v1/newsletters/:issueId/blocks/bulk` → `BulkAddBlocks` handler
- `POST /v1/content/fetch-metadata` → `FetchURLMetadata` handler
- `POST /v1/content/items` → `CreateManualContent` handler

**Implementation Reference**: `FR-TEST-001` through `FR-TEST-006`

---

## Technology Research

### URL Metadata Extraction

**Libraries Evaluated**:

| Library | Language | Pros | Cons |
|---------|----------|------|------|
| `colly` | Go | Fast, concurrent | Complex for simple use |
| `goquery` | Go | jQuery-like selectors | Manual parsing needed |
| `x/net/html` | Go | Standard library | Low-level |

**Decision**: Use `goquery` for HTML parsing with custom extractors for:
- Open Graph tags (`og:*`)
- JSON-LD schema (`application/ld+json`)
- Standard meta tags (fallback)

**Extraction Priority**:
1. Open Graph tags (most common)
2. JSON-LD schema.org Article (structured data)
3. Twitter cards (fallback)
4. HTML meta tags (last resort)

### Read Time Calculation

**Formula**: `ceil(word_count / 200)`

**Rationale**:
- 200 WPM is standard reading speed
- Used by Medium, dev.to, and other platforms
- Simple, deterministic calculation

**Word Counting**:
- Strip HTML tags from body content
- Split on whitespace
- Count non-empty tokens

---

## Existing Codebase Patterns

### Backend Patterns (aci-backend/)

**Handler Pattern**:
```go
func (h *Handler) Method(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    // Parse request
    // Validate
    // Call service
    // Return response
}
```

**Service Pattern**:
```go
type Service interface {
    Method(ctx context.Context, req Request) (Response, error)
}
```

**Repository Pattern**:
```go
type Repository interface {
    Create(ctx context.Context, entity Entity) error
    GetByID(ctx context.Context, id uuid.UUID) (*Entity, error)
}
```

### Frontend Patterns (aci-frontend/)

**Hook Pattern (TanStack Query)**:
```typescript
export function useOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Request) => api.post('/endpoint', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['related'] });
    },
  });
}
```

**Dialog Component Pattern**:
```typescript
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Feature-specific props
  onSuccess?: () => void;
}
```

---

## Dependencies Identified

### Backend Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `goquery` | HTML parsing | latest |
| `golang.org/x/net/html` | HTML tokenizer | latest |
| `microcosm-cc/bluemonday` | XSS sanitization | latest |

### Frontend Dependencies

All required dependencies already present:
- TanStack Query v5 (mutations, queries)
- shadcn/ui (Dialog, Select, RadioGroup)
- react-hook-form (form management)
- Lucide React (icons)

---

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| SSRF vulnerability | Medium | High | Comprehensive IP blocking + DNS validation |
| XSS from metadata | Medium | High | bluemonday sanitization |
| Position conflicts | Low | Medium | Pessimistic locking |
| URL fetch timeout | Medium | Low | 10s timeout + manual fallback |
| Rate limiting issues | Low | Low | Backend rate limiting middleware |

---

## Open Items

None - all clarifications resolved.

---

## References

- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Open Graph Protocol](https://ogp.me/)
- [Schema.org Article](https://schema.org/Article)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)

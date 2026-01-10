# Quickstart: Content Pipeline

**Feature**: `010-content-pipeline`
**Branch**: `010-content-pipeline`

---

## Prerequisites

Before starting development:

1. **Environment Setup**
   ```bash
   # Start development servers
   cd aci-backend && make run    # Backend at :8080
   cd aci-frontend && npm run dev # Frontend at :5173
   ```

2. **Database Ready**
   - PostgreSQL running with latest migrations
   - Test data seeded (at least one draft newsletter issue)

3. **Test User**
   - `marketing@test.com` / `TestPass123` (marketing role)

---

## Quick Development Commands

### Backend (Go)

```bash
cd aci-backend

# Run all tests
go test ./...

# Run specific handler tests
go test ./internal/handler/... -run TestBulkAddBlocks -v
go test ./internal/handler/... -run TestFetchURLMetadata -v
go test ./internal/handler/... -run TestCreateManualContent -v

# Run with race detection
go test -race ./...

# Generate mocks (if using mockgen)
go generate ./...
```

### Frontend (TypeScript/React)

```bash
cd aci-frontend

# Run unit tests
npm run test

# Run specific test file
npm run test -- --grep "AddToNewsletterDialog" --run
npm run test -- --grep "ImportContentDialog" --run
npm run test -- --grep "useAddBlocksToIssue" --run

# Run E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- --grep "Content Pipeline"

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

---

## API Testing (curl)

### 1. Authenticate

```bash
# Get JWT token
TOKEN=$(curl -s -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marketing@test.com","password":"TestPass123"}' \
  | jq -r '.data.access_token')

echo "Token: $TOKEN"
```

### 2. Get Draft Issues

```bash
curl -X GET "http://localhost:8080/v1/newsletters/issues?status=draft" \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

### 3. Bulk Add Blocks

```bash
# Replace ISSUE_ID and CONTENT_IDs with actual UUIDs
curl -X POST "http://localhost:8080/v1/newsletters/{ISSUE_ID}/blocks/bulk" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content_item_ids": [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    ],
    "block_type": "news"
  }' | jq
```

### 4. Fetch URL Metadata

```bash
curl -X POST http://localhost:8080/v1/content/fetch-metadata \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.bleepingcomputer.com/news/security/example"
  }' | jq
```

### 5. Create Manual Content

```bash
curl -X POST http://localhost:8080/v1/content/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "title": "Test Security Article",
    "summary": "A test article about security",
    "content_type": "news",
    "topic_tags": ["ransomware", "threat-intel"]
  }' | jq
```

---

## File Locations

### Backend Files to Create/Modify

```
aci-backend/
├── internal/
│   ├── dto/
│   │   └── block_dto.go          # BulkAddBlocksRequest/Response
│   │   └── content_dto.go        # URLMetadataRequest/Response, CreateManualContentRequest
│   ├── handler/
│   │   └── newsletter_block_handler.go  # BulkAddBlocks handler
│   │   └── content_import_handler.go    # FetchURLMetadata, CreateManualContent
│   ├── service/
│   │   └── metadata_extractor.go        # URL metadata extraction service
│   │   └── content_service.go           # Add CreateManualContent method
│   │   └── newsletter_block_service.go  # Add BulkAddBlocks method
│   └── api/
│       └── router.go              # Add new routes
```

### Frontend Files to Create/Modify

```
aci-frontend/
├── src/
│   ├── hooks/
│   │   └── useAddBlocksToIssue.ts    # Mutation hook
│   │   └── useFetchURLMetadata.ts    # Mutation hook
│   │   └── useCreateContentItem.ts   # Mutation hook
│   │   └── useDraftIssues.ts         # Query hook
│   ├── components/
│   │   └── newsletter/
│   │       └── content/
│   │           └── AddToNewsletterDialog.tsx
│   │           └── ImportContentDialog.tsx
│   │           └── ContentSelector.tsx  # Modify
│   └── pages/
│       └── NewsletterContentPage.tsx    # Modify
```

---

## Implementation Order

Follow waves in `tasks.md`:

### WAVE 1: Backend APIs (Do First)
1. Phase 1.1: Bulk Block Creation API
2. Phase 1.2: URL Metadata Extraction API
3. Phase 1.3: Manual Content Creation API

### WAVE 2: Frontend (After Backend Complete)
4. Phase 2.1: TanStack Query Hooks
5. Phase 2.2: AddToNewsletterDialog
6. Phase 2.3: ImportContentDialog
7. Phase 2.4: ContentSelector Enhancement
8. Phase 2.5: NewsletterContentPage Enhancement

### WAVE 3: E2E Testing
9. Phase 3.1: Add to Newsletter E2E Tests
10. Phase 3.2: Content Import E2E Tests

### WAVE 4: Quality & Docs
11. Phase 4.1: Code Review
12. Phase 4.2: Documentation

---

## Key Patterns to Follow

### Backend Handler Pattern

```go
func (h *NewsletterBlockHandler) BulkAddBlocks(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // 1. Extract path parameter
    issueID, err := uuid.Parse(chi.URLParam(r, "issueId"))
    if err != nil {
        h.respondError(w, http.StatusBadRequest, "INVALID_ISSUE_ID", "Invalid issue ID format")
        return
    }

    // 2. Parse and validate request body
    var req dto.BulkAddBlocksRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        h.respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON")
        return
    }
    if err := h.validator.Struct(req); err != nil {
        h.respondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
        return
    }

    // 3. Call service
    result, err := h.service.BulkAddBlocks(ctx, issueID, req)
    if err != nil {
        // Handle specific errors
        h.handleServiceError(w, err)
        return
    }

    // 4. Return success response
    h.respondJSON(w, http.StatusCreated, result)
}
```

### Frontend Hook Pattern

```typescript
export function useAddBlocksToIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ issueId, request }: {
      issueId: string;
      request: BulkAddBlocksRequest;
    }) => {
      const response = await api.post<{ data: BulkAddBlocksResponse }>(
        `/newsletters/${issueId}/blocks/bulk`,
        request
      );
      return response.data.data;
    },
    onSuccess: (_, { issueId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['newsletter', issueId] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-blocks', issueId] });
    },
  });
}
```

### Dialog Component Pattern

```typescript
interface AddToNewsletterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContentIds: string[];
  onSuccess?: () => void;
}

export function AddToNewsletterDialog({
  open,
  onOpenChange,
  selectedContentIds,
  onSuccess,
}: AddToNewsletterDialogProps) {
  const { data: draftIssues } = useDraftIssues();
  const { mutate, isPending } = useAddBlocksToIssue();
  const { toast } = useToast();

  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  const [blockType, setBlockType] = useState<BlockType>('news');

  const handleSubmit = () => {
    mutate(
      { issueId: selectedIssueId, request: { content_item_ids: selectedContentIds, block_type: blockType } },
      {
        onSuccess: (result) => {
          toast({ title: `Added ${result.created_count} blocks` });
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error) => {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Dialog content */}
    </Dialog>
  );
}
```

---

## Verification Checklist

After each phase, verify:

- [ ] Unit tests pass: `go test ./...` or `npm run test`
- [ ] No lint errors: `npm run lint`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] API returns expected responses (curl tests above)
- [ ] E2E tests pass: `npm run test:e2e`

---

## Common Issues

### SSRF Blocked URLs

If URL metadata fetch fails with `INVALID_URL`:
- Check if URL resolves to private IP
- Check if URL is localhost or cloud metadata endpoint
- Use a public URL for testing

### Position Conflicts

If blocks have duplicate positions:
- Check database transaction isolation
- Verify SELECT FOR UPDATE is working
- Check for race conditions in tests

### Cache Not Updating

If UI doesn't reflect changes:
- Verify query invalidation in mutation onSuccess
- Check queryKey matches
- Try `queryClient.refetchQueries()`

---

## Resources

- **Spec**: `specs/010-content-pipeline/spec.md`
- **API Contract**: `specs/010-content-pipeline/contracts/content-pipeline-api.yaml`
- **Tasks**: `specs/010-content-pipeline/tasks.md`
- **Data Model**: `specs/010-content-pipeline/data-model.md`

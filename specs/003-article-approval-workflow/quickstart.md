# Quickstart: Article Approval Workflow

**Feature**: 003-article-approval-workflow
**Date**: 2025-12-16

## Prerequisites

- Go 1.22+ installed
- Node.js 20+ installed
- PostgreSQL 14+ running
- ACI backend service (001-aci-backend) deployed
- ACI frontend (002-nexus-frontend) set up

## Database Migration

### 1. Apply the migration

```bash
cd aci-backend

# Run migration up
make migrate-up
# Or directly:
migrate -path migrations -database "postgres://aci_user:aci_password@localhost:5432/aci_db?sslmode=disable" up
```

### 2. Verify migration

```sql
-- Check new enum types exist
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'approval_status'::regtype;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'approval_gate'::regtype;

-- Check new columns on articles table
\d articles

-- Check article_approvals table
\d article_approvals
```

## Backend Development

### 1. Create domain types

Create `aci-backend/internal/domain/approval.go`:

```go
package domain

import (
    "errors"
    "time"
    "github.com/google/uuid"
)

type ApprovalStatus string
type ApprovalGate string
type UserRole string

// ApprovalStatus values
const (
    StatusPendingMarketing ApprovalStatus = "pending_marketing"
    StatusPendingBranding  ApprovalStatus = "pending_branding"
    StatusPendingSocL1     ApprovalStatus = "pending_soc_l1"
    StatusPendingSocL3     ApprovalStatus = "pending_soc_l3"
    StatusPendingCISO      ApprovalStatus = "pending_ciso"
    StatusApproved         ApprovalStatus = "approved"
    StatusRejected         ApprovalStatus = "rejected"
    StatusReleased         ApprovalStatus = "released"
)

// ApprovalGate values
const (
    GateMarketing ApprovalGate = "marketing"
    GateBranding  ApprovalGate = "branding"
    GateSocL1     ApprovalGate = "soc_l1"
    GateSocL3     ApprovalGate = "soc_l3"
    GateCISO      ApprovalGate = "ciso"
)

// UserRole values (extending existing)
const (
    RoleUser       UserRole = "user"
    RoleMarketing  UserRole = "marketing"
    RoleBranding   UserRole = "branding"
    RoleSocLevel1  UserRole = "soc_level_1"
    RoleSocLevel3  UserRole = "soc_level_3"
    RoleCISO       UserRole = "ciso"
    RoleAdmin      UserRole = "admin"
    RoleSuperAdmin UserRole = "super_admin"
)

type ArticleApproval struct {
    ID         uuid.UUID    `json:"id" db:"id"`
    ArticleID  uuid.UUID    `json:"article_id" db:"article_id"`
    Gate       ApprovalGate `json:"gate" db:"gate"`
    ApprovedBy uuid.UUID    `json:"approved_by" db:"approved_by"`
    ApprovedAt time.Time    `json:"approved_at" db:"approved_at"`
    Notes      *string      `json:"notes,omitempty" db:"notes"`
}
```

### 2. Create approval repository

Create `aci-backend/internal/repository/postgres/approval_repo.go`:

```go
package postgres

import (
    "context"
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
)

type ApprovalRepository struct {
    db *sqlx.DB
}

func NewApprovalRepository(db *sqlx.DB) *ApprovalRepository {
    return &ApprovalRepository{db: db}
}

func (r *ApprovalRepository) GetQueueByStatus(ctx context.Context, status string, limit, offset int) ([]Article, int, error) {
    // Implementation
}

func (r *ApprovalRepository) CreateApproval(ctx context.Context, approval *ArticleApproval) error {
    // Implementation
}

func (r *ApprovalRepository) GetApprovalHistory(ctx context.Context, articleID uuid.UUID) ([]ArticleApproval, error) {
    // Implementation
}
```

### 3. Create approval handler

Create `aci-backend/internal/api/handlers/approval_handler.go`:

```go
package handlers

import (
    "encoding/json"
    "net/http"
)

type ApprovalHandler struct {
    service *ApprovalService
}

func NewApprovalHandler(service *ApprovalService) *ApprovalHandler {
    return &ApprovalHandler{service: service}
}

func (h *ApprovalHandler) GetQueue(w http.ResponseWriter, r *http.Request) {
    // Implementation
}

func (h *ApprovalHandler) Approve(w http.ResponseWriter, r *http.Request) {
    // Implementation
}

func (h *ApprovalHandler) Reject(w http.ResponseWriter, r *http.Request) {
    // Implementation
}

func (h *ApprovalHandler) Release(w http.ResponseWriter, r *http.Request) {
    // Implementation
}
```

### 4. Register routes

Add to `aci-backend/internal/api/router.go`:

```go
// Approval routes
r.Route("/approvals", func(r chi.Router) {
    r.Use(middleware.Auth(jwtService))
    r.Get("/queue", approvalHandler.GetQueue)
})

r.Route("/articles/{id}", func(r chi.Router) {
    r.Use(middleware.Auth(jwtService))
    r.Post("/approve", approvalHandler.Approve)
    r.Post("/reject", approvalHandler.Reject)
    r.Post("/release", approvalHandler.Release)
    r.Get("/approval-history", approvalHandler.GetApprovalHistory)
})
```

## Frontend Development

### 1. Create TypeScript types

Create `aci-frontend/src/types/approval.ts`:

```typescript
export type ApprovalStatus =
  | 'pending_marketing'
  | 'pending_branding'
  | 'pending_soc_l1'
  | 'pending_soc_l3'
  | 'pending_ciso'
  | 'approved'
  | 'rejected'
  | 'released';

export type ApprovalGate =
  | 'marketing'
  | 'branding'
  | 'soc_l1'
  | 'soc_l3'
  | 'ciso';

export type UserRole =
  | 'user'
  | 'marketing'
  | 'branding'
  | 'soc_level_1'
  | 'soc_level_3'
  | 'ciso'
  | 'admin'
  | 'super_admin';

export interface ArticleForApproval {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  approvalStatus: ApprovalStatus;
  rejected: boolean;
  createdAt: string;
  approvalProgress: ApprovalProgress;
}

export interface ApprovalProgress {
  completedGates: ApprovalGate[];
  currentGate?: ApprovalGate;
  pendingGates: ApprovalGate[];
  totalGates: number;
  completedCount: number;
}
```

### 2. Create API service

Create `aci-frontend/src/services/api/approvals.ts`:

```typescript
import { apiClient } from './client';
import type { ArticleForApproval, ApprovalHistory } from '../../types/approval';

export const approvalService = {
  getQueue: async (params?: { page?: number; pageSize?: number }) => {
    const response = await apiClient.get('/approvals/queue', { params });
    return response.data;
  },

  approve: async (articleId: string, notes?: string) => {
    const response = await apiClient.post(`/articles/${articleId}/approve`, { notes });
    return response.data;
  },

  reject: async (articleId: string, reason: string) => {
    const response = await apiClient.post(`/articles/${articleId}/reject`, { reason });
    return response.data;
  },

  release: async (articleId: string) => {
    const response = await apiClient.post(`/articles/${articleId}/release`);
    return response.data;
  },

  getHistory: async (articleId: string) => {
    const response = await apiClient.get(`/articles/${articleId}/approval-history`);
    return response.data;
  },
};
```

### 3. Create TanStack Query hooks

Create `aci-frontend/src/hooks/useApprovalQueue.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalService } from '../services/api/approvals';

export function useApprovalQueue(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['approvals', 'queue', params],
    queryFn: () => approvalService.getQueue(params),
  });
}

export function useApproveArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, notes }: { articleId: string; notes?: string }) =>
      approvalService.approve(articleId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'queue'] });
    },
  });
}

export function useRejectArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, reason }: { articleId: string; reason: string }) =>
      approvalService.reject(articleId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'queue'] });
    },
  });
}
```

### 4. Create approval page route

Add to `aci-frontend/src/App.tsx`:

```tsx
import { ApprovalPage } from './pages/ApprovalPage';

// In routes:
<Route
  path="/approvals"
  element={
    <ProtectedRoute allowedRoles={['marketing', 'branding', 'soc_level_1', 'soc_level_3', 'ciso', 'admin', 'super_admin']}>
      <ApprovalPage />
    </ProtectedRoute>
  }
/>
```

## Testing

### Run backend tests

```bash
cd aci-backend
go test ./internal/service/approval_test.go -v
go test ./internal/api/handlers/approval_handler_test.go -v
```

### Run frontend tests

```bash
cd aci-frontend
npm test -- --grep "Approval"
```

### Manual testing flow

1. Create test users with different roles:
```sql
-- Create marketing approver
INSERT INTO users (email, password_hash, name, role)
VALUES ('marketing@test.com', '$2a$10$...', 'Marketing User', 'marketing');

-- Create branding approver
INSERT INTO users (email, password_hash, name, role)
VALUES ('branding@test.com', '$2a$10$...', 'Branding User', 'branding');
```

2. Test approval flow:
```bash
# Login as marketing user
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marketing@test.com","password":"password"}'

# Get approval queue
curl -X GET http://localhost:8080/api/v1/approvals/queue \
  -H "Authorization: Bearer <token>"

# Approve article
curl -X POST http://localhost:8080/api/v1/articles/<article-id>/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Looks good!"}'
```

## Configuration

### Environment Variables

```bash
# Add to .env
APPROVAL_DEFAULT_PAGE_SIZE=20
APPROVAL_MAX_PAGE_SIZE=100
```

### Feature Flags

```go
// config/approval.go
type ApprovalConfig struct {
    DefaultPageSize int `env:"APPROVAL_DEFAULT_PAGE_SIZE" envDefault:"20"`
    MaxPageSize     int `env:"APPROVAL_MAX_PAGE_SIZE" envDefault:"100"`
}
```

## Troubleshooting

### Migration fails with enum already exists
```sql
-- Drop and recreate if needed (dev only!)
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS approval_gate CASCADE;
```

### User cannot see approval queue
- Verify user role is set correctly: `SELECT role FROM users WHERE email = 'user@test.com';`
- Check role mapping in middleware

### Approval action returns 403
- Verify the article is at the correct gate for the user's role
- Check if article is already rejected

## Next Steps

After implementation:
1. Run security review with `security-reviewer` agent
2. Run code review with `code-reviewer` agent
3. Complete PM-1 gate checklist
4. Generate tasks with `/speckit.tasks`

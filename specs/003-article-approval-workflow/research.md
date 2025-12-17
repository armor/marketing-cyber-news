# Research: Article Approval Workflow

**Feature**: 003-article-approval-workflow
**Date**: 2025-12-16
**Status**: Complete

## Overview

Research findings for implementing a multi-gate article approval workflow with role-based access control. All technical decisions are resolved with rationale.

---

## Decision 1: Role Storage Strategy

**Question**: How should user roles be stored and validated?

**Decision**: Extend existing PostgreSQL `user_role` enum type with new values

**Rationale**:
- Existing system already uses `user_role` enum in users table
- Adding enum values via ALTER TYPE is backward-compatible
- Type safety at database level prevents invalid roles
- Consistent with existing codebase patterns

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Separate roles table with M:N | Over-engineering for single-role-per-user requirement |
| JSON array of roles | No type safety, harder to query |
| String column | No validation, prone to typos |

**Implementation**:
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'branding';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'soc_level_1';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'soc_level_3';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ciso';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
```

---

## Decision 2: Approval Status State Machine

**Question**: How should article approval status be tracked?

**Decision**: Use PostgreSQL enum type `approval_status` on articles table

**Rationale**:
- Clear state machine with defined transitions
- Database-level validation of status values
- Efficient indexing for queue queries
- Self-documenting schema

**State Transitions**:
```
pending_marketing --[approve]--> pending_branding
pending_branding --[approve]--> pending_soc_l1
pending_soc_l1 --[approve]--> pending_soc_l3
pending_soc_l3 --[approve]--> pending_ciso
pending_ciso --[approve]--> approved
approved --[release]--> released

ANY_STATUS --[reject]--> rejected
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Integer status codes | Not self-documenting, error-prone |
| String status | No validation, inconsistent values possible |
| Separate workflow table | Over-engineering, harder to query |

---

## Decision 3: Approval History Storage

**Question**: How should individual gate approvals be tracked?

**Decision**: Junction table `article_approvals` with unique constraint on (article_id, gate)

**Rationale**:
- Captures who approved at each gate and when
- Prevents duplicate approvals for same gate
- Supports audit trail requirements
- Enables historical queries

**Schema**:
```sql
CREATE TABLE article_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  gate approval_gate NOT NULL,
  approved_by UUID NOT NULL REFERENCES users(id),
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(article_id, gate)
);
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| JSONB array on articles | Harder to query, no referential integrity |
| Audit log only | No direct querying capability |
| Columns per gate on articles | Inflexible, many nullable columns |

---

## Decision 4: Rejection Handling

**Question**: How should article rejections be tracked?

**Decision**: Boolean flag + metadata columns on articles table

**Rationale**:
- Simple boolean for filtering rejected articles from queues
- Dedicated columns for rejection reason, rejector, timestamp
- Matches spec requirement for `rejected = true` flag
- Easy to query and display

**Columns Added**:
```sql
ALTER TABLE articles ADD COLUMN rejected BOOLEAN DEFAULT false;
ALTER TABLE articles ADD COLUMN rejection_reason TEXT;
ALTER TABLE articles ADD COLUMN rejected_by UUID REFERENCES users(id);
ALTER TABLE articles ADD COLUMN rejected_at TIMESTAMPTZ;
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Status-only (no boolean) | Boolean simplifies WHERE clause filtering |
| Separate rejections table | Over-engineering for simple requirement |

---

## Decision 5: Role-to-Gate Mapping

**Question**: How should role permissions for gates be enforced?

**Decision**: Middleware function with static mapping + database validation

**Rationale**:
- Clear, explicit mapping in code
- Easy to audit and modify
- Middleware enforces before handler logic
- Special handling for admin/super_admin roles

**Mapping**:
```go
var roleGateMapping = map[UserRole][]ApprovalGate{
    RoleMarketing:   {GateMarketing},
    RoleBranding:    {GateBranding},
    RoleSocLevel1:   {GateSocL1},
    RoleSocLevel3:   {GateSocL3},
    RoleCISO:        {GateCISO},
    RoleAdmin:       {GateMarketing, GateBranding, GateSocL1, GateSocL3, GateCISO},
    RoleSuperAdmin:  {GateMarketing, GateBranding, GateSocL1, GateSocL3, GateCISO},
}
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Database lookup table | Unnecessary DB roundtrip for static data |
| Configuration file | Less type-safe, requires parsing |

---

## Decision 6: Queue Query Strategy

**Question**: How should role-specific approval queues be efficiently queried?

**Decision**: Index on approval_status column + filtered queries

**Rationale**:
- Single index serves all queue queries
- Filter by status enum value matches role's target gate
- Pagination with keyset or offset-limit
- Sort by created_at, severity, or category

**Index**:
```sql
CREATE INDEX idx_articles_approval_status ON articles(approval_status);
```

**Query Pattern**:
```sql
SELECT a.* FROM articles a
WHERE a.approval_status = 'pending_marketing'
  AND a.rejected = false
ORDER BY a.created_at DESC
LIMIT 20 OFFSET 0;
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Materialized view per queue | Over-engineering, sync complexity |
| Separate queue table | Redundant data, sync issues |

---

## Decision 7: API Endpoint Design

**Question**: What API structure should be used for approval operations?

**Decision**: Resource-based REST with action verbs as sub-resources

**Rationale**:
- Consistent with existing API patterns
- Clear semantics for approve/reject/release actions
- Separate queue endpoint for listing
- History as sub-resource of article

**Endpoints**:
```
GET    /api/v1/approvals/queue        - List articles pending approval for current user's role
POST   /api/v1/articles/{id}/approve  - Approve article at current gate
POST   /api/v1/articles/{id}/reject   - Reject article from pipeline
POST   /api/v1/articles/{id}/release  - Release fully-approved article
GET    /api/v1/articles/{id}/approval-history - Get approval chain
PUT    /api/v1/users/{id}/role        - Update user role (admin only)
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| `/api/v1/approvals/{id}` PATCH | Unclear semantics for approve vs reject |
| RPC-style `/api/v1/approve` | Less RESTful, harder to document |

---

## Decision 8: Frontend State Management

**Question**: How should approval queue and actions be managed in frontend?

**Decision**: TanStack Query with optimistic updates

**Rationale**:
- Consistent with existing frontend patterns
- Built-in caching and invalidation
- Optimistic updates for responsive UX
- Automatic refetching on focus/reconnect

**Hooks**:
```typescript
// hooks/useApprovalQueue.ts
export function useApprovalQueue(filters?: ApprovalFilters) {
  return useQuery({
    queryKey: ['approvals', 'queue', filters],
    queryFn: () => approvalService.getQueue(filters),
  });
}

// hooks/useApproveArticle.ts
export function useApproveArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { articleId: string; notes?: string }) =>
      approvalService.approve(params.articleId, params.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'queue'] });
    },
  });
}
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Redux/Zustand | Unnecessary for server state, adds complexity |
| Local state only | No caching, redundant fetches |

---

## Decision 9: Audit Logging Integration

**Question**: How should approval actions be logged for compliance?

**Decision**: Leverage existing audit_logs table with approval-specific action types

**Rationale**:
- Audit infrastructure already exists (000005_audit_schema)
- Consistent logging pattern across system
- Captures user, action, resource, timestamps
- Supports compliance queries

**Action Types**:
```
article.approved
article.rejected
article.released
user.role_changed
```

**Log Entry**:
```sql
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_value, ip_address, user_agent)
VALUES ($1, 'article.approved', 'article', $2, $3, $4, $5);
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Separate approval_audit table | Fragmented audit trail |
| Application-level logging only | Not queryable, no structure |

---

## Decision 10: Error Handling Strategy

**Question**: What errors should approval operations return?

**Decision**: Specific error codes with descriptive messages

**Rationale**:
- Clear feedback for frontend to display
- Distinguishes between authorization and validation errors
- Supports internationalization if needed

**Error Codes**:
| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `INVALID_GATE` | Article not at expected approval gate |
| 400 | `MISSING_REASON` | Rejection reason required but not provided |
| 400 | `NOT_FULLY_APPROVED` | Release attempted on non-approved article |
| 403 | `INSUFFICIENT_ROLE` | User role cannot approve at this gate |
| 404 | `ARTICLE_NOT_FOUND` | Article ID does not exist |
| 409 | `ALREADY_REJECTED` | Article already rejected |

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Generic 400/403 | Hard to display specific user feedback |
| Exception-based | Less predictable API behavior |

---

## Technology Best Practices Applied

### Go Backend
- Use guard clauses for early returns in handlers
- Wrap database operations in transactions for approve/reject
- Use structured logging with zerolog for audit trail
- Return domain errors from service layer, map to HTTP in handler

### React Frontend
- Use shadcn/ui components for consistent styling
- Implement loading states with skeleton components
- Use toast notifications for action feedback
- Implement confirmation dialogs for approve/reject

### PostgreSQL
- Use enum types for type safety
- Add indexes for common query patterns
- Use UUID primary keys consistently
- Implement CASCADE delete for referential integrity

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Can one user have multiple roles? | No - single role per user for MVP |
| What happens to in-progress approvals when role changes? | Previous approvals remain valid |
| Should admin require all gates or just release? | Admin can approve at any gate + release |
| Is rejection reason required? | Yes - mandatory per spec |

---

## Summary

All technical decisions for the article approval workflow have been resolved. The implementation will:

1. Extend existing PostgreSQL enums for roles and add approval_status enum
2. Add columns to articles table for approval status and rejection metadata
3. Create article_approvals junction table for tracking gate approvals
4. Implement REST API endpoints following existing patterns
5. Use TanStack Query for frontend state management
6. Leverage existing audit_logs infrastructure for compliance
7. Enforce role-based access via middleware with static mapping

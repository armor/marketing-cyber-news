# Data Model: Article Approval Workflow

**Feature**: 003-article-approval-workflow
**Date**: 2025-12-16
**Status**: Complete

## Overview

This document defines the data model extensions required for the article approval workflow feature. The design extends existing User and Article entities with new enums, columns, and a junction table for tracking approvals.

---

## Enums

### UserRole (Extended)

Extends existing `user_role` enum type with approval-specific roles.

```sql
-- Existing values: 'user', 'admin'
-- New values to add:
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'branding';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'soc_level_1';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'soc_level_3';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ciso';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
```

| Value | Permission Level | Gate Access | Description |
|-------|------------------|-------------|-------------|
| `user` | 1 | None | Standard user, read-only |
| `marketing` | 2 | Marketing | Marketing approval gate |
| `branding` | 3 | Branding | Branding approval gate |
| `soc_level_1` | 4 | SOC L1 | Initial SOC review |
| `soc_level_3` | 5 | SOC L3 | Senior SOC review |
| `ciso` | 6 | CISO | Final security approval |
| `admin` | 7 | All Gates | Full system administration |
| `super_admin` | 8 | All Gates + CISO Power | Highest privilege level |

**Go Type Definition**:
```go
type UserRole string

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

func (r UserRole) IsValid() bool {
    switch r {
    case RoleUser, RoleMarketing, RoleBranding, RoleSocLevel1,
         RoleSocLevel3, RoleCISO, RoleAdmin, RoleSuperAdmin:
        return true
    }
    return false
}

func (r UserRole) CanApproveGate(gate ApprovalGate) bool {
    switch r {
    case RoleAdmin, RoleSuperAdmin:
        return true
    case RoleMarketing:
        return gate == GateMarketing
    case RoleBranding:
        return gate == GateBranding
    case RoleSocLevel1:
        return gate == GateSocL1
    case RoleSocLevel3:
        return gate == GateSocL3
    case RoleCISO:
        return gate == GateCISO
    }
    return false
}
```

**TypeScript Type Definition**:
```typescript
export type UserRole =
  | 'user'
  | 'marketing'
  | 'branding'
  | 'soc_level_1'
  | 'soc_level_3'
  | 'ciso'
  | 'admin'
  | 'super_admin';

export const ROLE_PERMISSIONS: Record<UserRole, number> = {
  user: 1,
  marketing: 2,
  branding: 3,
  soc_level_1: 4,
  soc_level_3: 5,
  ciso: 6,
  admin: 7,
  super_admin: 8,
};
```

---

### ApprovalStatus (New)

Represents the current approval state of an article.

```sql
CREATE TYPE approval_status AS ENUM (
  'pending_marketing',
  'pending_branding',
  'pending_soc_l1',
  'pending_soc_l3',
  'pending_ciso',
  'approved',
  'rejected',
  'released'
);
```

| Value | Description | Next States |
|-------|-------------|-------------|
| `pending_marketing` | Awaiting marketing approval | pending_branding, rejected |
| `pending_branding` | Awaiting branding approval | pending_soc_l1, rejected |
| `pending_soc_l1` | Awaiting SOC Level 1 review | pending_soc_l3, rejected |
| `pending_soc_l3` | Awaiting SOC Level 3 review | pending_ciso, rejected |
| `pending_ciso` | Awaiting CISO approval | approved, rejected |
| `approved` | All gates passed | released |
| `rejected` | Removed from pipeline | pending_marketing (admin reset) |
| `released` | Published and visible | (terminal state) |

**Go Type Definition**:
```go
type ApprovalStatus string

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

func (s ApprovalStatus) NextOnApprove() (ApprovalStatus, error) {
    switch s {
    case StatusPendingMarketing:
        return StatusPendingBranding, nil
    case StatusPendingBranding:
        return StatusPendingSocL1, nil
    case StatusPendingSocL1:
        return StatusPendingSocL3, nil
    case StatusPendingSocL3:
        return StatusPendingCISO, nil
    case StatusPendingCISO:
        return StatusApproved, nil
    default:
        return "", errors.New("cannot approve from current status")
    }
}

func (s ApprovalStatus) RequiredGate() ApprovalGate {
    switch s {
    case StatusPendingMarketing:
        return GateMarketing
    case StatusPendingBranding:
        return GateBranding
    case StatusPendingSocL1:
        return GateSocL1
    case StatusPendingSocL3:
        return GateSocL3
    case StatusPendingCISO:
        return GateCISO
    default:
        return ""
    }
}
```

**TypeScript Type Definition**:
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

export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending_marketing: 'Pending Marketing',
  pending_branding: 'Pending Branding',
  pending_soc_l1: 'Pending SOC L1',
  pending_soc_l3: 'Pending SOC L3',
  pending_ciso: 'Pending CISO',
  approved: 'Approved',
  rejected: 'Rejected',
  released: 'Released',
};
```

---

### ApprovalGate (New)

Represents individual approval gates in the workflow.

```sql
CREATE TYPE approval_gate AS ENUM (
  'marketing',
  'branding',
  'soc_l1',
  'soc_l3',
  'ciso'
);
```

| Value | Order | Required Role | Description |
|-------|-------|---------------|-------------|
| `marketing` | 1 | marketing, admin, super_admin | Marketing review |
| `branding` | 2 | branding, admin, super_admin | Branding review |
| `soc_l1` | 3 | soc_level_1, admin, super_admin | SOC Level 1 review |
| `soc_l3` | 4 | soc_level_3, admin, super_admin | SOC Level 3 review |
| `ciso` | 5 | ciso, admin, super_admin | CISO final approval |

**Go Type Definition**:
```go
type ApprovalGate string

const (
    GateMarketing ApprovalGate = "marketing"
    GateBranding  ApprovalGate = "branding"
    GateSocL1     ApprovalGate = "soc_l1"
    GateSocL3     ApprovalGate = "soc_l3"
    GateCISO      ApprovalGate = "ciso"
)

var GateOrder = []ApprovalGate{
    GateMarketing,
    GateBranding,
    GateSocL1,
    GateSocL3,
    GateCISO,
}
```

**TypeScript Type Definition**:
```typescript
export type ApprovalGate =
  | 'marketing'
  | 'branding'
  | 'soc_l1'
  | 'soc_l3'
  | 'ciso';

export const GATE_ORDER: ApprovalGate[] = [
  'marketing',
  'branding',
  'soc_l1',
  'soc_l3',
  'ciso',
];

export const GATE_LABELS: Record<ApprovalGate, string> = {
  marketing: 'Marketing',
  branding: 'Branding',
  soc_l1: 'SOC Level 1',
  soc_l3: 'SOC Level 3',
  ciso: 'CISO',
};
```

---

## Entity Extensions

### Article (Extended)

New columns added to existing `articles` table for approval workflow.

```sql
-- Add new columns to articles table
ALTER TABLE articles
  ADD COLUMN approval_status approval_status DEFAULT 'pending_marketing',
  ADD COLUMN rejected BOOLEAN DEFAULT false,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN rejected_by UUID REFERENCES users(id),
  ADD COLUMN rejected_at TIMESTAMPTZ,
  ADD COLUMN released_at TIMESTAMPTZ,
  ADD COLUMN released_by UUID REFERENCES users(id);

-- Create indexes
CREATE INDEX idx_articles_approval_status ON articles(approval_status);
CREATE INDEX idx_articles_rejected ON articles(rejected) WHERE rejected = true;
CREATE INDEX idx_articles_approval_released ON articles(released_at) WHERE released_at IS NOT NULL;
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `approval_status` | approval_status | NO | 'pending_marketing' | Current approval state |
| `rejected` | BOOLEAN | NO | false | Quick-filter flag for rejected articles |
| `rejection_reason` | TEXT | YES | NULL | Required when rejected |
| `rejected_by` | UUID (FK users) | YES | NULL | User who rejected |
| `rejected_at` | TIMESTAMPTZ | YES | NULL | Rejection timestamp |
| `released_at` | TIMESTAMPTZ | YES | NULL | Public release timestamp |
| `released_by` | UUID (FK users) | YES | NULL | User who released |

**Go Struct Extension**:
```go
type Article struct {
    // ... existing fields ...

    // Approval workflow fields
    ApprovalStatus  ApprovalStatus `json:"approval_status" db:"approval_status"`
    Rejected        bool           `json:"rejected" db:"rejected"`
    RejectionReason *string        `json:"rejection_reason,omitempty" db:"rejection_reason"`
    RejectedBy      *uuid.UUID     `json:"rejected_by,omitempty" db:"rejected_by"`
    RejectedAt      *time.Time     `json:"rejected_at,omitempty" db:"rejected_at"`
    ReleasedAt      *time.Time     `json:"released_at,omitempty" db:"released_at"`
    ReleasedBy      *uuid.UUID     `json:"released_by,omitempty" db:"released_by"`
}
```

**TypeScript Interface Extension**:
```typescript
export interface Article {
  // ... existing fields ...

  // Approval workflow fields
  approvalStatus: ApprovalStatus;
  rejected: boolean;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  releasedAt?: string;
  releasedBy?: string;
}
```

---

## New Entities

### ArticleApproval

Junction table tracking individual gate approvals.

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

-- Indexes
CREATE INDEX idx_article_approvals_article ON article_approvals(article_id);
CREATE INDEX idx_article_approvals_gate ON article_approvals(gate);
CREATE INDEX idx_article_approvals_approved_by ON article_approvals(approved_by);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `article_id` | UUID (FK articles) | NO | - | Article reference |
| `gate` | approval_gate | NO | - | Which gate was approved |
| `approved_by` | UUID (FK users) | NO | - | Approver's user ID |
| `approved_at` | TIMESTAMPTZ | NO | NOW() | Approval timestamp |
| `notes` | TEXT | YES | NULL | Optional approval notes |

**Constraints**:
- `UNIQUE(article_id, gate)`: Each gate can only be approved once per article
- `ON DELETE CASCADE`: Approvals deleted when article is deleted

**Go Struct**:
```go
type ArticleApproval struct {
    ID         uuid.UUID    `json:"id" db:"id"`
    ArticleID  uuid.UUID    `json:"article_id" db:"article_id"`
    Gate       ApprovalGate `json:"gate" db:"gate"`
    ApprovedBy uuid.UUID    `json:"approved_by" db:"approved_by"`
    ApprovedAt time.Time    `json:"approved_at" db:"approved_at"`
    Notes      *string      `json:"notes,omitempty" db:"notes"`

    // Joined fields (not stored)
    ApproverName  string `json:"approver_name,omitempty" db:"approver_name"`
    ApproverEmail string `json:"approver_email,omitempty" db:"approver_email"`
}
```

**TypeScript Interface**:
```typescript
export interface ArticleApproval {
  id: string;
  articleId: string;
  gate: ApprovalGate;
  approvedBy: string;
  approvedAt: string;
  notes?: string;

  // Joined fields
  approverName?: string;
  approverEmail?: string;
}
```

---

## Relationships

```
┌─────────────┐       ┌──────────────────────┐       ┌─────────────┐
│   users     │       │  article_approvals   │       │  articles   │
├─────────────┤       ├──────────────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ approved_by (FK)     │       │ id (PK)     │
│ role        │       │ article_id (FK)──────┼──────►│ approval_   │
│ ...         │       │ gate                 │       │   status    │
└─────────────┘       │ approved_at          │       │ rejected    │
      │               │ notes                │       │ rejected_by │◄──┐
      │               └──────────────────────┘       │   (FK)      │   │
      │                                              │ released_by │◄──┤
      └──────────────────────────────────────────────┤   (FK)      │   │
                                                     └─────────────┘   │
                                                           │           │
                                                           └───────────┘
```

---

## Validation Rules

### Article Approval Status Transitions

| From Status | Allowed Transitions | Trigger |
|-------------|---------------------|---------|
| pending_marketing | pending_branding | Marketing approval |
| pending_marketing | rejected | Marketing rejection |
| pending_branding | pending_soc_l1 | Branding approval |
| pending_branding | rejected | Branding rejection |
| pending_soc_l1 | pending_soc_l3 | SOC L1 approval |
| pending_soc_l1 | rejected | SOC L1 rejection |
| pending_soc_l3 | pending_ciso | SOC L3 approval |
| pending_soc_l3 | rejected | SOC L3 rejection |
| pending_ciso | approved | CISO approval |
| pending_ciso | rejected | CISO rejection |
| approved | released | Admin/CISO release action |
| rejected | pending_marketing | Admin reset |

### Role-Gate Authorization

| Role | Can Approve Gates | Can Reject | Can Release | Can Reset |
|------|-------------------|------------|-------------|-----------|
| user | None | No | No | No |
| marketing | marketing | Yes (marketing) | No | No |
| branding | branding | Yes (branding) | No | No |
| soc_level_1 | soc_l1 | Yes (soc_l1) | No | No |
| soc_level_3 | soc_l3 | Yes (soc_l3) | No | No |
| ciso | ciso | Yes (ciso) | Yes | No |
| admin | All | Yes (all) | Yes | Yes |
| super_admin | All | Yes (all) | Yes | Yes |

### Data Validation

```go
func (a *Article) ValidateApproval() error {
    if a.Rejected && a.RejectionReason == nil {
        return errors.New("rejection_reason required when rejected is true")
    }
    if a.Rejected && a.RejectedBy == nil {
        return errors.New("rejected_by required when rejected is true")
    }
    if a.ApprovalStatus == StatusReleased && a.ReleasedAt == nil {
        return errors.New("released_at required when status is released")
    }
    return nil
}
```

---

## Database Migration

### Up Migration (000007_approval_workflow.up.sql)

```sql
-- Add new enum values to user_role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'marketing' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'marketing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'branding' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'branding';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'soc_level_1' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'soc_level_1';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'soc_level_3' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'soc_level_3';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ciso' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'ciso';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'super_admin';
    END IF;
END$$;

-- Create approval_status enum
CREATE TYPE approval_status AS ENUM (
    'pending_marketing',
    'pending_branding',
    'pending_soc_l1',
    'pending_soc_l3',
    'pending_ciso',
    'approved',
    'rejected',
    'released'
);

-- Create approval_gate enum
CREATE TYPE approval_gate AS ENUM (
    'marketing',
    'branding',
    'soc_l1',
    'soc_l3',
    'ciso'
);

-- Add approval columns to articles table
ALTER TABLE articles
    ADD COLUMN approval_status approval_status DEFAULT 'pending_marketing',
    ADD COLUMN rejected BOOLEAN DEFAULT false,
    ADD COLUMN rejection_reason TEXT,
    ADD COLUMN rejected_by UUID REFERENCES users(id),
    ADD COLUMN rejected_at TIMESTAMPTZ,
    ADD COLUMN released_at TIMESTAMPTZ,
    ADD COLUMN released_by UUID REFERENCES users(id);

-- Create article_approvals table
CREATE TABLE article_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    gate approval_gate NOT NULL,
    approved_by UUID NOT NULL REFERENCES users(id),
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(article_id, gate)
);

-- Create indexes
CREATE INDEX idx_articles_approval_status ON articles(approval_status);
CREATE INDEX idx_articles_rejected ON articles(rejected) WHERE rejected = true;
CREATE INDEX idx_articles_approval_released ON articles(released_at) WHERE released_at IS NOT NULL;
CREATE INDEX idx_article_approvals_article ON article_approvals(article_id);
CREATE INDEX idx_article_approvals_gate ON article_approvals(gate);
CREATE INDEX idx_article_approvals_approved_by ON article_approvals(approved_by);

-- Update existing articles to pending_marketing status
UPDATE articles SET approval_status = 'pending_marketing' WHERE approval_status IS NULL;
```

### Down Migration (000007_approval_workflow.down.sql)

```sql
-- Drop indexes
DROP INDEX IF EXISTS idx_article_approvals_approved_by;
DROP INDEX IF EXISTS idx_article_approvals_gate;
DROP INDEX IF EXISTS idx_article_approvals_article;
DROP INDEX IF EXISTS idx_articles_approval_released;
DROP INDEX IF EXISTS idx_articles_rejected;
DROP INDEX IF EXISTS idx_articles_approval_status;

-- Drop article_approvals table
DROP TABLE IF EXISTS article_approvals;

-- Remove approval columns from articles
ALTER TABLE articles
    DROP COLUMN IF EXISTS released_by,
    DROP COLUMN IF EXISTS released_at,
    DROP COLUMN IF EXISTS rejected_at,
    DROP COLUMN IF EXISTS rejected_by,
    DROP COLUMN IF EXISTS rejection_reason,
    DROP COLUMN IF EXISTS rejected,
    DROP COLUMN IF EXISTS approval_status;

-- Drop enums (note: cannot remove individual enum values in PostgreSQL)
DROP TYPE IF EXISTS approval_gate;
DROP TYPE IF EXISTS approval_status;

-- Note: Cannot easily remove enum values from user_role without recreation
-- The new role values will remain but won't be used
```

---

## Query Patterns

### Get Approval Queue for Role

```sql
SELECT a.*, c.name as category_name, s.name as source_name
FROM articles a
JOIN categories c ON a.category_id = c.id
JOIN sources s ON a.source_id = s.id
WHERE a.approval_status = $1  -- e.g., 'pending_marketing'
  AND a.rejected = false
ORDER BY a.created_at DESC
LIMIT $2 OFFSET $3;
```

### Get Approval History for Article

```sql
SELECT aa.*, u.name as approver_name, u.email as approver_email
FROM article_approvals aa
JOIN users u ON aa.approved_by = u.id
WHERE aa.article_id = $1
ORDER BY aa.approved_at ASC;
```

### Count Articles per Status

```sql
SELECT approval_status, COUNT(*) as count
FROM articles
WHERE rejected = false
GROUP BY approval_status;
```

### Get Articles Pending Any Approval (for Admin Dashboard)

```sql
SELECT approval_status, COUNT(*) as pending_count
FROM articles
WHERE approval_status IN ('pending_marketing', 'pending_branding', 'pending_soc_l1', 'pending_soc_l3', 'pending_ciso')
  AND rejected = false
GROUP BY approval_status
ORDER BY approval_status;
```

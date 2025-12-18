-- Migration 000007: Article Approval Workflow
-- Description: 5-gate approval workflow (Marketing → Branding → SOC L1 → SOC L3 → CISO)
-- Author: Database Developer Agent
-- Date: 2025-12-16

-- ============================================================================
-- STEP 1: Create user_role ENUM from existing VARCHAR role column
-- ============================================================================

-- Create user_role enum with existing values plus new approval roles
DO $$
BEGIN
    -- Create enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'user',
            'admin',
            'analyst',
            'viewer',
            'marketing',
            'branding',
            'soc_level_1',
            'soc_level_3',
            'ciso',
            'super_admin'
        );
    END IF;
END$$;

-- Migrate users.role from VARCHAR to user_role enum
DO $$
BEGIN
    -- Add temporary column with enum type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role_enum'
    ) THEN
        ALTER TABLE users ADD COLUMN role_enum user_role;

        -- Copy existing role values to enum column (only 'user' and 'admin' exist currently)
        UPDATE users SET role_enum = role::user_role;

        -- Drop old VARCHAR column and rename enum column
        ALTER TABLE users DROP COLUMN role;
        ALTER TABLE users RENAME COLUMN role_enum TO role;

        -- Set default and NOT NULL constraint
        ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'::user_role;
        ALTER TABLE users ALTER COLUMN role SET NOT NULL;
    END IF;
END$$;

-- ============================================================================
-- STEP 2: Create approval workflow enums
-- ============================================================================

-- Create approval_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
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
    END IF;
END$$;

-- Create approval_gate enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_gate') THEN
        CREATE TYPE approval_gate AS ENUM (
            'marketing',
            'branding',
            'soc_l1',
            'soc_l3',
            'ciso'
        );
    END IF;
END$$;

-- ============================================================================
-- STEP 3: Extend articles table with approval workflow columns
-- ============================================================================

-- Add approval columns to articles table (idempotent)
DO $$
BEGIN
    -- approval_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE articles ADD COLUMN approval_status approval_status DEFAULT 'pending_marketing';
    END IF;

    -- rejected flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'rejected'
    ) THEN
        ALTER TABLE articles ADD COLUMN rejected BOOLEAN DEFAULT false NOT NULL;
    END IF;

    -- rejection_reason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE articles ADD COLUMN rejection_reason TEXT;
    END IF;

    -- rejected_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'rejected_by'
    ) THEN
        ALTER TABLE articles ADD COLUMN rejected_by UUID REFERENCES users(id);
    END IF;

    -- rejected_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE articles ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- released_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'released_at'
    ) THEN
        ALTER TABLE articles ADD COLUMN released_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- released_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'released_by'
    ) THEN
        ALTER TABLE articles ADD COLUMN released_by UUID REFERENCES users(id);
    END IF;
END$$;

-- Add validation constraints
DO $$
BEGIN
    -- Ensure rejection_reason is provided when rejected = true
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_articles_rejection_reason_required'
    ) THEN
        ALTER TABLE articles ADD CONSTRAINT chk_articles_rejection_reason_required
            CHECK (NOT rejected OR (rejected AND rejection_reason IS NOT NULL));
    END IF;

    -- Ensure rejected_by is set when rejected = true
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_articles_rejected_by_required'
    ) THEN
        ALTER TABLE articles ADD CONSTRAINT chk_articles_rejected_by_required
            CHECK (NOT rejected OR (rejected AND rejected_by IS NOT NULL));
    END IF;

    -- Ensure released_at is set when status = released
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_articles_released_at_required'
    ) THEN
        ALTER TABLE articles ADD CONSTRAINT chk_articles_released_at_required
            CHECK (approval_status != 'released' OR (approval_status = 'released' AND released_at IS NOT NULL));
    END IF;
END$$;

-- ============================================================================
-- STEP 4: Create article_approvals junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS article_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL,
    gate approval_gate NOT NULL,
    approved_by UUID NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes TEXT,

    -- Foreign key constraints
    CONSTRAINT fk_article_approvals_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT fk_article_approvals_approved_by FOREIGN KEY (approved_by)
        REFERENCES users(id) ON DELETE RESTRICT,

    -- Unique constraint: one approval per gate per article
    CONSTRAINT uq_article_approvals_article_gate UNIQUE(article_id, gate)
);

-- ============================================================================
-- STEP 5: Create indexes for performance
-- ============================================================================

-- Articles table indexes
CREATE INDEX IF NOT EXISTS idx_articles_approval_status ON articles(approval_status);
CREATE INDEX IF NOT EXISTS idx_articles_rejected ON articles(rejected) WHERE rejected = true;
CREATE INDEX IF NOT EXISTS idx_articles_approval_released ON articles(released_at) WHERE released_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_rejected_by ON articles(rejected_by) WHERE rejected_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_released_by ON articles(released_by) WHERE released_by IS NOT NULL;

-- Article approvals table indexes
CREATE INDEX IF NOT EXISTS idx_article_approvals_article ON article_approvals(article_id);
CREATE INDEX IF NOT EXISTS idx_article_approvals_gate ON article_approvals(gate);
CREATE INDEX IF NOT EXISTS idx_article_approvals_approved_by ON article_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_article_approvals_approved_at ON article_approvals(approved_at DESC);

-- Composite index for approval history queries
CREATE INDEX IF NOT EXISTS idx_article_approvals_article_approved_at ON article_approvals(article_id, approved_at);

-- ============================================================================
-- STEP 6: Initialize existing articles with pending_marketing status
-- ============================================================================

-- Set all existing articles to pending_marketing status
UPDATE articles
SET approval_status = 'pending_marketing'
WHERE approval_status IS NULL;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TYPE user_role IS 'User roles: user, admin, analyst, viewer, marketing, branding, soc_level_1, soc_level_3, ciso, super_admin';
COMMENT ON TYPE approval_status IS 'Article approval states in 5-gate workflow';
COMMENT ON TYPE approval_gate IS 'Individual approval gates: marketing, branding, soc_l1, soc_l3, ciso';

COMMENT ON TABLE article_approvals IS 'Junction table tracking individual gate approvals for articles';
COMMENT ON COLUMN articles.approval_status IS 'Current approval workflow state';
COMMENT ON COLUMN articles.rejected IS 'Quick-filter flag for rejected articles';
COMMENT ON COLUMN articles.rejection_reason IS 'Required when article is rejected';
COMMENT ON COLUMN articles.rejected_by IS 'User who rejected the article';
COMMENT ON COLUMN articles.rejected_at IS 'Timestamp of rejection';
COMMENT ON COLUMN articles.released_at IS 'Timestamp when article was released to public';
COMMENT ON COLUMN articles.released_by IS 'User who released the article';

COMMENT ON COLUMN article_approvals.gate IS 'Which approval gate was passed';
COMMENT ON COLUMN article_approvals.approved_by IS 'User who approved this gate';
COMMENT ON COLUMN article_approvals.approved_at IS 'Timestamp of approval';
COMMENT ON COLUMN article_approvals.notes IS 'Optional notes from approver';

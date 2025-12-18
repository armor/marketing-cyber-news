-- Migration 000007: Article Approval Workflow - ROLLBACK
-- Description: Removes 5-gate approval workflow schema changes
-- Author: Database Developer Agent
-- Date: 2025-12-16

-- ============================================================================
-- STEP 1: Drop indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_article_approvals_article_approved_at;
DROP INDEX IF EXISTS idx_article_approvals_approved_at;
DROP INDEX IF EXISTS idx_article_approvals_approved_by;
DROP INDEX IF EXISTS idx_article_approvals_gate;
DROP INDEX IF EXISTS idx_article_approvals_article;

DROP INDEX IF EXISTS idx_articles_released_by;
DROP INDEX IF EXISTS idx_articles_rejected_by;
DROP INDEX IF EXISTS idx_articles_approval_released;
DROP INDEX IF EXISTS idx_articles_rejected;
DROP INDEX IF EXISTS idx_articles_approval_status;

-- ============================================================================
-- STEP 2: Drop article_approvals junction table
-- ============================================================================

DROP TABLE IF EXISTS article_approvals;

-- ============================================================================
-- STEP 3: Remove approval workflow columns from articles table
-- ============================================================================

ALTER TABLE articles DROP CONSTRAINT IF EXISTS chk_articles_released_at_required;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS chk_articles_rejected_by_required;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS chk_articles_rejection_reason_required;

ALTER TABLE articles DROP COLUMN IF EXISTS released_by;
ALTER TABLE articles DROP COLUMN IF EXISTS released_at;
ALTER TABLE articles DROP COLUMN IF EXISTS rejected_at;
ALTER TABLE articles DROP COLUMN IF EXISTS rejected_by;
ALTER TABLE articles DROP COLUMN IF EXISTS rejection_reason;
ALTER TABLE articles DROP COLUMN IF EXISTS rejected;
ALTER TABLE articles DROP COLUMN IF EXISTS approval_status;

-- ============================================================================
-- STEP 4: Drop approval workflow enum types
-- ============================================================================

DROP TYPE IF EXISTS approval_gate;
DROP TYPE IF EXISTS approval_status;

-- ============================================================================
-- STEP 5: Revert users.role from user_role ENUM back to VARCHAR
-- ============================================================================

DO $$
BEGIN
    -- Add temporary VARCHAR column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role_varchar'
    ) THEN
        ALTER TABLE users ADD COLUMN role_varchar VARCHAR(20);

        -- Copy enum values back to VARCHAR
        UPDATE users SET role_varchar = role::text;

        -- Drop enum column
        ALTER TABLE users DROP COLUMN role;

        -- Rename VARCHAR column back to role
        ALTER TABLE users RENAME COLUMN role_varchar TO role;

        -- Add back original constraints
        ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
        ALTER TABLE users ALTER COLUMN role SET NOT NULL;

        -- Recreate CHECK constraint for original roles
        ALTER TABLE users ADD CONSTRAINT chk_role_valid
            CHECK (role IN ('user', 'admin', 'analyst', 'viewer'));
    END IF;
END$$;

-- ============================================================================
-- STEP 6: Drop user_role enum type
-- ============================================================================

-- Note: This will only succeed if no other tables reference user_role
-- If migration fails here, it means user_role is still in use
DROP TYPE IF EXISTS user_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN users.role IS 'User role: user, admin, analyst, viewer (reverted to VARCHAR from ENUM)';

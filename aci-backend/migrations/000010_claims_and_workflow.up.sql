-- Migration 000010: Claims Library and Extended Approval Workflow
-- Description: Adds compliance/VoC roles, claims library table, and 7-gate approval workflow
-- Author: Phase 1 Gap Closure Implementation
-- Date: 2025-01-09

-- ============================================================================
-- STEP 1: Extend user_role ENUM with new roles
-- ============================================================================

-- Add compliance_sme role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'compliance_sme'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'compliance_sme';
    END IF;
END$$;

-- Add voc_expert role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'voc_expert'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'voc_expert';
    END IF;
END$$;

-- Add designer role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'designer'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'designer';
    END IF;
END$$;

-- ============================================================================
-- STEP 2: Extend approval_gate ENUM with VoC and Compliance gates
-- ============================================================================

-- Add voc gate (after branding)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'voc'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_gate')
    ) THEN
        ALTER TYPE approval_gate ADD VALUE 'voc' AFTER 'branding';
    END IF;
END$$;

-- Add compliance gate (after soc_l3)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'compliance'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_gate')
    ) THEN
        ALTER TYPE approval_gate ADD VALUE 'compliance' AFTER 'soc_l3';
    END IF;
END$$;

-- ============================================================================
-- STEP 3: Extend approval_status ENUM with pending_voc and pending_compliance
-- ============================================================================

-- Add pending_voc status (after pending_branding)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'pending_voc'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status')
    ) THEN
        ALTER TYPE approval_status ADD VALUE 'pending_voc' AFTER 'pending_branding';
    END IF;
END$$;

-- Add pending_compliance status (after pending_soc_l3)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'pending_compliance'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status')
    ) THEN
        ALTER TYPE approval_status ADD VALUE 'pending_compliance' AFTER 'pending_soc_l3';
    END IF;
END$$;

-- ============================================================================
-- STEP 4: Create claim_type ENUM
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_type') THEN
        CREATE TYPE claim_type AS ENUM (
            'claim',
            'disclaimer',
            'do_not_say'
        );
    END IF;
END$$;

-- ============================================================================
-- STEP 5: Create claim_approval_status ENUM
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_approval_status') THEN
        CREATE TYPE claim_approval_status AS ENUM (
            'pending',
            'approved',
            'rejected',
            'expired'
        );
    END IF;
END$$;

-- ============================================================================
-- STEP 6: Create claims_library table
-- ============================================================================

CREATE TABLE IF NOT EXISTS claims_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core content
    claim_text TEXT NOT NULL,
    claim_type claim_type NOT NULL,
    category VARCHAR(100) NOT NULL,

    -- Approval workflow
    approval_status claim_approval_status NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Reference and tracking
    source_reference TEXT,
    usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
    last_used_at TIMESTAMPTZ,

    -- Tags for categorization
    tags TEXT[] DEFAULT '{}',
    notes TEXT,

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for claims_library
CREATE INDEX IF NOT EXISTS idx_claims_library_type ON claims_library(claim_type);
CREATE INDEX IF NOT EXISTS idx_claims_library_category ON claims_library(category);
CREATE INDEX IF NOT EXISTS idx_claims_library_status ON claims_library(approval_status);
CREATE INDEX IF NOT EXISTS idx_claims_library_approved ON claims_library(approval_status)
    WHERE approval_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_claims_library_expires ON claims_library(expires_at)
    WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claims_library_tags ON claims_library USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_claims_library_usage ON claims_library(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_claims_library_text_search ON claims_library
    USING GIN(to_tsvector('english', claim_text));
CREATE INDEX IF NOT EXISTS idx_claims_library_created_by ON claims_library(created_by);

-- Add constraints
DO $$
BEGIN
    -- Ensure rejection_reason is provided when status is rejected
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_claims_rejection_reason_required'
    ) THEN
        ALTER TABLE claims_library ADD CONSTRAINT chk_claims_rejection_reason_required
            CHECK (approval_status != 'rejected' OR (approval_status = 'rejected' AND rejection_reason IS NOT NULL));
    END IF;

    -- Ensure approved_by is set when status is approved
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_claims_approved_by_required'
    ) THEN
        ALTER TABLE claims_library ADD CONSTRAINT chk_claims_approved_by_required
            CHECK (approval_status != 'approved' OR (approval_status = 'approved' AND approved_by IS NOT NULL));
    END IF;
END$$;

COMMENT ON TABLE claims_library IS 'Pre-approved marketing claims, disclaimers, and do-not-say items for newsletter compliance';
COMMENT ON COLUMN claims_library.claim_type IS 'Type: claim (positive assertion), disclaimer (legal caveat), do_not_say (forbidden phrases)';
COMMENT ON COLUMN claims_library.source_reference IS 'Legal or compliance document reference supporting this claim';
COMMENT ON COLUMN claims_library.usage_count IS 'Number of times this claim has been linked to newsletter blocks';

-- ============================================================================
-- STEP 7: Add claims_references column to newsletter_blocks
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'newsletter_blocks' AND column_name = 'claims_references'
    ) THEN
        ALTER TABLE newsletter_blocks ADD COLUMN claims_references UUID[] DEFAULT '{}';
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_newsletter_blocks_claims ON newsletter_blocks
    USING GIN(claims_references);

COMMENT ON COLUMN newsletter_blocks.claims_references IS 'Array of claims_library IDs linked to this block for compliance tracking';

-- ============================================================================
-- STEP 8: Create issue_approvals table for multi-gate approval tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,
    gate approval_gate NOT NULL,
    approved_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,

    -- Unique constraint: one approval per gate per issue
    CONSTRAINT uq_issue_approvals_issue_gate UNIQUE(issue_id, gate)
);

-- Indexes for issue_approvals
CREATE INDEX IF NOT EXISTS idx_issue_approvals_issue ON issue_approvals(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_approvals_gate ON issue_approvals(gate);
CREATE INDEX IF NOT EXISTS idx_issue_approvals_approved_by ON issue_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_issue_approvals_approved_at ON issue_approvals(approved_at DESC);

COMMENT ON TABLE issue_approvals IS 'Tracks individual gate approvals for newsletter issues in 7-gate workflow';
COMMENT ON COLUMN issue_approvals.gate IS 'Which approval gate: marketing, branding, voc, soc_l1, soc_l3, compliance, ciso';

-- ============================================================================
-- STEP 9: Add VoC and compliance fields to newsletter_issues
-- ============================================================================

DO $$
BEGIN
    -- VoC notes field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'newsletter_issues' AND column_name = 'voc_notes'
    ) THEN
        ALTER TABLE newsletter_issues ADD COLUMN voc_notes TEXT;
    END IF;

    -- Compliance notes field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'newsletter_issues' AND column_name = 'compliance_notes'
    ) THEN
        ALTER TABLE newsletter_issues ADD COLUMN compliance_notes TEXT;
    END IF;

    -- Current approval stage tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'newsletter_issues' AND column_name = 'current_approval_stage'
    ) THEN
        ALTER TABLE newsletter_issues ADD COLUMN current_approval_stage VARCHAR(50);
    END IF;
END$$;

COMMENT ON COLUMN newsletter_issues.voc_notes IS 'Notes from VoC expert review on customer language alignment';
COMMENT ON COLUMN newsletter_issues.compliance_notes IS 'Notes from Compliance SME review on claims validation';

-- ============================================================================
-- STEP 10: Create trigger for claims_library updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_claims_library_updated_at ON claims_library;
CREATE TRIGGER update_claims_library_updated_at
    BEFORE UPDATE ON claims_library
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 11: Update comments for documentation
-- ============================================================================

COMMENT ON TYPE user_role IS 'User roles: user, admin, analyst, viewer, marketing, branding, soc_level_1, soc_level_3, ciso, super_admin, compliance_sme, voc_expert, designer';
COMMENT ON TYPE approval_gate IS 'Approval gates in 7-gate workflow: marketing, branding, voc, soc_l1, soc_l3, compliance, ciso';
COMMENT ON TYPE approval_status IS 'Approval states in 7-gate workflow including pending_voc and pending_compliance';
COMMENT ON TYPE claim_type IS 'Types of claims: claim (positive assertion), disclaimer (legal caveat), do_not_say (forbidden)';
COMMENT ON TYPE claim_approval_status IS 'Claims library approval states: pending, approved, rejected, expired';

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON SCHEMA public IS 'Newsletter Automation System - Migration 000010 (Claims & Workflow) applied successfully';

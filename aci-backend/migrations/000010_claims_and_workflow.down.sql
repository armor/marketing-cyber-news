-- Migration 000010 Down: Claims Library and Extended Approval Workflow Rollback
-- Description: Removes claims library table and extended workflow columns
-- Author: Phase 1 Gap Closure Implementation
-- Date: 2025-01-09
--
-- NOTE: PostgreSQL does not support removing values from ENUM types.
-- The new enum values (compliance_sme, voc_expert, designer, voc, compliance,
-- pending_voc, pending_compliance) will remain but become unused.
-- To fully remove them, you would need to recreate the ENUM types.

-- ============================================================================
-- STEP 1: Remove trigger
-- ============================================================================

DROP TRIGGER IF EXISTS update_claims_library_updated_at ON claims_library;

-- ============================================================================
-- STEP 2: Remove columns from newsletter_issues
-- ============================================================================

ALTER TABLE newsletter_issues DROP COLUMN IF EXISTS voc_notes;
ALTER TABLE newsletter_issues DROP COLUMN IF EXISTS compliance_notes;
ALTER TABLE newsletter_issues DROP COLUMN IF EXISTS current_approval_stage;

-- ============================================================================
-- STEP 3: Remove claims_references column from newsletter_blocks
-- ============================================================================

DROP INDEX IF EXISTS idx_newsletter_blocks_claims;
ALTER TABLE newsletter_blocks DROP COLUMN IF EXISTS claims_references;

-- ============================================================================
-- STEP 4: Drop issue_approvals table
-- ============================================================================

DROP TABLE IF EXISTS issue_approvals;

-- ============================================================================
-- STEP 5: Drop claims_library table
-- ============================================================================

DROP TABLE IF EXISTS claims_library;

-- ============================================================================
-- STEP 6: Drop custom ENUM types
-- ============================================================================

DROP TYPE IF EXISTS claim_approval_status;
DROP TYPE IF EXISTS claim_type;

-- ============================================================================
-- NOTE: Cannot remove enum values from user_role, approval_gate, approval_status
-- The following values will remain but be unused:
-- - user_role: compliance_sme, voc_expert, designer
-- - approval_gate: voc, compliance
-- - approval_status: pending_voc, pending_compliance
--
-- To fully clean up, you would need to:
-- 1. Update all rows using the new values to use old values
-- 2. Recreate the ENUM types without the new values
-- 3. Migrate the columns to use the new ENUM types
-- ============================================================================

COMMENT ON SCHEMA public IS 'Newsletter Automation System - Migration 000010 rolled back (ENUMs preserved)';

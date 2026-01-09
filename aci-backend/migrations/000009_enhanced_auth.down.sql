-- Migration 000009 DOWN: Revert Enhanced Authentication System
-- Warning: This will delete all invitation, verification, approval, and login attempt data

-- Drop helper functions
DROP FUNCTION IF EXISTS cleanup_old_login_attempts();
DROP FUNCTION IF EXISTS cleanup_expired_verification_tokens();
DROP FUNCTION IF EXISTS cleanup_expired_invitations();
DROP FUNCTION IF EXISTS unlock_user_account(UUID);
DROP FUNCTION IF EXISTS lock_user_account(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_recent_failed_logins(VARCHAR, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS record_login_attempt(VARCHAR, VARCHAR, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS is_user_locked(UUID);

-- Drop tables
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS user_approval_requests;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS user_invitations;
DROP TABLE IF EXISTS system_settings;

-- Remove columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS failed_login_count;
ALTER TABLE users DROP COLUMN IF EXISTS locked_until;
ALTER TABLE users DROP COLUMN IF EXISTS force_password_change;
ALTER TABLE users DROP COLUMN IF EXISTS status;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_tier;

-- Drop constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_subscription_tier_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_email_armor_domain;

-- Restore original email format constraint
ALTER TABLE users ADD CONSTRAINT chk_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Drop custom types
DROP TYPE IF EXISTS signup_mode;
DROP TYPE IF EXISTS user_status;

-- Migration 000009: Enhanced Authentication System
-- Description: Adds user status, signup modes, invitations, approvals, lockout
-- Author: Database Developer Agent
-- Date: 2025-01-08

-- ============================================================================
-- STEP 1: Create user_status ENUM
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM (
            'pending_verification',
            'pending_approval',
            'active',
            'suspended',
            'deactivated'
        );
    END IF;
END$$;

-- ============================================================================
-- STEP 2: Create signup_mode ENUM
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signup_mode') THEN
        CREATE TYPE signup_mode AS ENUM (
            'open',
            'email_verification',
            'admin_approval',
            'invitation_only'
        );
    END IF;
END$$;

-- ============================================================================
-- STEP 3: Extend users table with new columns
-- ============================================================================

-- Add status column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        ALTER TABLE users ADD COLUMN status user_status NOT NULL DEFAULT 'active';
    END IF;
END$$;

-- Add force_password_change column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'force_password_change'
    ) THEN
        ALTER TABLE users ADD COLUMN force_password_change BOOLEAN NOT NULL DEFAULT false;
    END IF;
END$$;

-- Add locked_until column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'locked_until'
    ) THEN
        ALTER TABLE users ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
    END IF;
END$$;

-- Add failed_login_count column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'failed_login_count'
    ) THEN
        ALTER TABLE users ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0;
    END IF;
END$$;

-- Add subscription_tier column if not exists (referenced in domain model)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free';
    END IF;
END$$;

-- Drop existing email format constraint and add armor.com domain constraint
DO $$
BEGIN
    -- Drop old email format constraint if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_email_format'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT chk_email_format;
    END IF;

    -- Add new constraint requiring @armor.com domain
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_email_armor_domain'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_email_armor_domain
            CHECK (email ~* '^[A-Za-z0-9._%+-]+@armor\.com$');
    END IF;
END$$;

-- Add subscription tier constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscription_tier_valid'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_subscription_tier_valid
            CHECK (subscription_tier IN ('free', 'premium', 'enterprise'));
    END IF;
END$$;

-- ============================================================================
-- STEP 4: Create user_invitations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    invited_by UUID NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_user_invitations_invited_by FOREIGN KEY (invited_by)
        REFERENCES users(id) ON DELETE CASCADE,

    -- Email must be @armor.com domain
    CONSTRAINT chk_invitation_email_armor_domain
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@armor\.com$'),

    -- Expiry must be in future at creation
    CONSTRAINT chk_invitation_expires_future
        CHECK (expires_at > created_at)
);

-- ============================================================================
-- STEP 5: Create email_verification_tokens table
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_email_verification_tokens_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,

    -- Expiry must be in future at creation
    CONSTRAINT chk_verification_expires_future
        CHECK (expires_at > created_at)
);

-- ============================================================================
-- STEP 6: Create user_approval_requests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_user_approval_requests_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_approval_requests_reviewed_by FOREIGN KEY (reviewed_by)
        REFERENCES users(id) ON DELETE SET NULL,

    -- Status constraint
    CONSTRAINT chk_approval_status_valid
        CHECK (status IN ('pending', 'approved', 'rejected')),

    -- Rejection reason required when rejected
    CONSTRAINT chk_rejection_reason_required
        CHECK (status != 'rejected' OR (status = 'rejected' AND rejection_reason IS NOT NULL)),

    -- One request per user
    CONSTRAINT uq_user_approval_requests_user UNIQUE (user_id)
);

-- ============================================================================
-- STEP 7: Create login_attempts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STEP 8: Create system_settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_system_settings_updated_by FOREIGN KEY (updated_by)
        REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- STEP 9: Create indexes
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until)
    WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_force_password_change ON users(force_password_change)
    WHERE force_password_change = true;

-- User invitations indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON user_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token_hash ON user_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_invitations_pending ON user_invitations(expires_at)
    WHERE accepted_at IS NULL;

-- Email verification tokens indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

-- User approval requests indexes
CREATE INDEX IF NOT EXISTS idx_user_approval_requests_user_id ON user_approval_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_approval_requests_status ON user_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_approval_requests_pending ON user_approval_requests(created_at DESC)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_user_approval_requests_reviewed_by ON user_approval_requests(reviewed_by)
    WHERE reviewed_by IS NOT NULL;

-- Login attempts indexes
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_failures ON login_attempts(email, attempted_at DESC)
    WHERE success = false;

-- ============================================================================
-- STEP 10: Insert default system settings
-- ============================================================================

INSERT INTO system_settings (key, value, description)
VALUES
    ('signup_mode', '"open"'::jsonb, 'Registration mode: open, email_verification, admin_approval, invitation_only'),
    ('lockout_threshold', '5'::jsonb, 'Number of failed login attempts before account lockout'),
    ('lockout_duration_minutes', '30'::jsonb, 'Duration of account lockout in minutes'),
    ('invitation_expiry_hours', '72'::jsonb, 'Hours until invitation link expires'),
    ('verification_expiry_hours', '24'::jsonb, 'Hours until email verification link expires'),
    ('allowed_email_domain', '"armor.com"'::jsonb, 'Required email domain for registration')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- STEP 11: Create helper functions
-- ============================================================================

-- Function to check if user is locked
CREATE OR REPLACE FUNCTION is_user_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT locked_until INTO v_locked_until
    FROM users
    WHERE id = p_user_id;

    IF v_locked_until IS NULL THEN
        RETURN false;
    END IF;

    RETURN v_locked_until > CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_email VARCHAR(255),
    p_ip_address VARCHAR(45),
    p_user_agent TEXT,
    p_success BOOLEAN
)
RETURNS UUID AS $$
DECLARE
    v_attempt_id UUID;
BEGIN
    INSERT INTO login_attempts (email, ip_address, user_agent, success)
    VALUES (p_email, p_ip_address, p_user_agent, p_success)
    RETURNING id INTO v_attempt_id;

    RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent failed login count
CREATE OR REPLACE FUNCTION get_recent_failed_logins(
    p_email VARCHAR(255),
    p_since TIMESTAMP WITH TIME ZONE
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM login_attempts
    WHERE email = p_email
      AND success = false
      AND attempted_at >= p_since;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to lock user account
CREATE OR REPLACE FUNCTION lock_user_account(
    p_user_id UUID,
    p_duration_minutes INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET locked_until = CURRENT_TIMESTAMP + (p_duration_minutes || ' minutes')::INTERVAL,
        failed_login_count = failed_login_count + 1
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to unlock user account and reset failed count
CREATE OR REPLACE FUNCTION unlock_user_account(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET locked_until = NULL,
        failed_login_count = 0
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM user_invitations
    WHERE expires_at < CURRENT_TIMESTAMP
      AND accepted_at IS NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired verification tokens
CREATE OR REPLACE FUNCTION cleanup_expired_verification_tokens()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM email_verification_tokens
    WHERE expires_at < CURRENT_TIMESTAMP
      AND verified_at IS NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old login attempts (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM login_attempts
    WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 12: Apply triggers
-- ============================================================================

-- Trigger for user_invitations updated_at (if we add updated_at later)
-- Currently not needed as invitations are immutable after creation

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TYPE user_status IS 'User account states: pending_verification, pending_approval, active, suspended, deactivated';
COMMENT ON TYPE signup_mode IS 'Registration modes: open, email_verification, admin_approval, invitation_only';

COMMENT ON TABLE user_invitations IS 'Invitations for new users (invitation_only mode)';
COMMENT ON TABLE email_verification_tokens IS 'Email verification tokens (email_verification mode)';
COMMENT ON TABLE user_approval_requests IS 'User registration approval requests (admin_approval mode)';
COMMENT ON TABLE login_attempts IS 'Login attempt tracking for security and lockout';
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';

COMMENT ON COLUMN users.status IS 'Account status determining access level';
COMMENT ON COLUMN users.force_password_change IS 'User must change password on next login';
COMMENT ON COLUMN users.locked_until IS 'Account locked until this timestamp due to failed logins';
COMMENT ON COLUMN users.failed_login_count IS 'Number of consecutive failed login attempts';

COMMENT ON FUNCTION is_user_locked IS 'Check if user account is currently locked';
COMMENT ON FUNCTION record_login_attempt IS 'Record a login attempt for security tracking';
COMMENT ON FUNCTION get_recent_failed_logins IS 'Get count of recent failed login attempts';
COMMENT ON FUNCTION lock_user_account IS 'Lock user account for specified duration';
COMMENT ON FUNCTION unlock_user_account IS 'Unlock user account and reset failed count';
COMMENT ON FUNCTION cleanup_expired_invitations IS 'Remove expired and unused invitations';
COMMENT ON FUNCTION cleanup_expired_verification_tokens IS 'Remove expired and unused verification tokens';
COMMENT ON FUNCTION cleanup_old_login_attempts IS 'Remove login attempts older than 30 days';

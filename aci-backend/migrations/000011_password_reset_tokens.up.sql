-- Migration: 000011_password_reset_tokens
-- Description: Create password reset tokens table for forgot password functionality
-- Created: 2026-01-09

-- =============================================================================
-- Password Reset Tokens Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index to ensure only one active (unused, non-expired) token per user
-- Note: This validates at query time, old tokens are cleaned up by DeleteForUser/DeleteExpired
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_active_user
    ON password_reset_tokens(user_id)
    WHERE used_at IS NULL;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
    ON password_reset_tokens(token_hash)
    WHERE used_at IS NULL AND expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
    ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
    ON password_reset_tokens(expires_at)
    WHERE used_at IS NULL;

-- Comment on table
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens for forgot password functionality';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration timestamp (typically 1 hour)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'When the token was used to reset password';

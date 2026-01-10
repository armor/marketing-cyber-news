-- Migration: 000011_password_reset_tokens (DOWN)
-- Description: Remove password reset tokens table
-- Created: 2026-01-09

DROP TABLE IF EXISTS password_reset_tokens CASCADE;

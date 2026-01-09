-- Seed Test Users for E2E Testing
-- Description: Test users with various roles for 7-gate approval workflow testing
-- Note: Run AFTER migrations, only in test/dev environments
-- Password: TestPass123! (bcrypt hashed)

-- Password hash for 'TestPass123!' using bcrypt cost 10
-- Generated with: bcrypt.hashSync('TestPass123!', 10)
-- Hash: $2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQb9xjGZNvRa6jEQaLJv3Iix5KKm

DO $$
DECLARE
    password_hash TEXT := '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQb9xjGZNvRa6jEQaLJv3Iix5KKm';
BEGIN
    -- Marketing user (Gate 1)
    INSERT INTO users (id, email, password_hash, name, role, status, subscription_tier, email_verified, created_at, updated_at)
    VALUES (
        'aaaaaaaa-0001-0000-0000-000000000001',
        'marketing@test.com',
        password_hash,
        'Marketing User',
        'marketing',
        'active',
        'enterprise',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    -- Branding user (Gate 2)
    INSERT INTO users (id, email, password_hash, name, role, status, subscription_tier, email_verified, created_at, updated_at)
    VALUES (
        'aaaaaaaa-0002-0000-0000-000000000002',
        'branding@test.com',
        password_hash,
        'Branding User',
        'branding',
        'active',
        'enterprise',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    -- Designer user (Gate 2 - alternate)
    INSERT INTO users (id, email, password_hash, name, role, status, subscription_tier, email_verified, created_at, updated_at)
    VALUES (
        'aaaaaaaa-0003-0000-0000-000000000003',
        'designer@test.com',
        password_hash,
        'Designer User',
        'designer',
        'active',
        'enterprise',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    -- VoC Expert user (Gate 3)
    INSERT INTO users (id, email, password_hash, name, role, status, subscription_tier, email_verified, created_at, updated_at)
    VALUES (
        'aaaaaaaa-0004-0000-0000-000000000004',
        'voc@test.com',
        password_hash,
        'VoC Expert User',
        'voc_expert',
        'active',
        'enterprise',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    -- SOC Level 1 user (Gate 4)
    INSERT INTO users (id, email, password_hash, name, role, status, subscription_tier, email_verified, created_at, updated_at)
    VALUES (
        'aaaaaaaa-0005-0000-0000-000000000005',
        'soc1@test.com',
        password_hash,
        'SOC Level 1 User',
        'soc_level_1',
        'active',
        'enterprise',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    -- SOC Level 3 user (Gate 5)
    INSERT INTO users (id, email, password_hash, name, role, status, subscription_tier, email_verified, created_at, updated_at)
    VALUES (
        'aaaaaaaa-0006-0000-0000-000000000006',
        'soc3@test.com',
        password_hash,
        'SOC Level 3 User',
        'soc_level_3',
        'active',
        'enterprise',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    -- Compliance SME user (Gate 6)
    INSERT INTO users (id, email, password_hash, name, role, status, subscription_tier, email_verified, created_at, updated_at)
    VALUES (
        'aaaaaaaa-0007-0000-0000-000000000007',
        'compliance@test.com',
        password_hash,
        'Compliance SME User',
        'compliance_sme',
        'active',
        'enterprise',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    -- CISO user (Gate 7)
    INSERT INTO users (id, email, password_hash, name, role, status, subscription_tier, email_verified, created_at, updated_at)
    VALUES (
        'aaaaaaaa-0008-0000-0000-000000000008',
        'ciso@test.com',
        password_hash,
        'CISO User',
        'ciso',
        'active',
        'enterprise',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    -- Admin user
    INSERT INTO users (id, email, password_hash, name, role, status, subscription_tier, email_verified, created_at, updated_at)
    VALUES (
        'aaaaaaaa-0009-0000-0000-000000000009',
        'admin@test.com',
        password_hash,
        'Admin User',
        'admin',
        'active',
        'enterprise',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    -- Regular test user (viewer)
    INSERT INTO users (id, email, password_hash, name, role, status, subscription_tier, email_verified, created_at, updated_at)
    VALUES (
        'aaaaaaaa-0010-0000-0000-000000000010',
        'test@example.com',
        password_hash,
        'Test User',
        'user',
        'active',
        'free',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    RAISE NOTICE 'Test users seeded successfully';
END $$;

-- Verify test users
SELECT email, role, status FROM users WHERE email LIKE '%@test.com' OR email = 'test@example.com' ORDER BY role;

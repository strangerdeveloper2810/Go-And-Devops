-- Tạo bảng users trong schema auth.
-- Migration chạy theo thứ tự: 001, 002, 003... giống Knex/Prisma migrations.

CREATE TABLE IF NOT EXISTS auth.users (
    id            BIGSERIAL    PRIMARY KEY,            -- BIGSERIAL = auto-increment 64-bit
    email         VARCHAR(320) NOT NULL UNIQUE,         -- 320 = max email length theo RFC
    password_hash VARCHAR(255) NOT NULL,                -- bcrypt hash luôn 60 chars, 255 để dư
    name          VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url    TEXT         NOT NULL DEFAULT '',
    status        VARCHAR(20)  NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'invited', 'migrated')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),  -- TIMESTAMPTZ = có timezone
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index cho query thường xuyên — tăng tốc SELECT WHERE email = ?
CREATE INDEX idx_users_email  ON auth.users (email);
CREATE INDEX idx_users_status ON auth.users (status);
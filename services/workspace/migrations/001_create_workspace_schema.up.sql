-- Tạo schema workspace và các bảng domain: users (projection), workspaces,
-- roles, workspace_members, projects. Migration chạy theo thứ tự 001, 002...
CREATE SCHEMA IF NOT EXISTS workspace;

-- users = BẢN PROJECTION đọc từ Kafka (auth.user.events), KHÔNG phải nguồn gốc.
-- id KHÔNG dùng BIGSERIAL: nó chính là auth user id đẩy sang → gán trực tiếp.
CREATE TABLE IF NOT EXISTS workspace.users (
    id         BIGINT       PRIMARY KEY,            -- = auth user id (không auto-increment)
    email      VARCHAR(320) NOT NULL DEFAULT '',    -- 320 = max email length theo RFC
    name       VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url TEXT         NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- workspaces = tenant. Soft delete qua deleted_at (NULL = còn sống).
CREATE TABLE IF NOT EXISTS workspace.workspaces (
    id         BIGSERIAL    PRIMARY KEY,
    slug       VARCHAR(255) NOT NULL UNIQUE,        -- định danh URL-friendly, duy nhất toàn hệ thống
    name       VARCHAR(255) NOT NULL,
    owner_id   BIGINT       NOT NULL,               -- user id chủ workspace
    plan       VARCHAR(20)  NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ                          -- NULL = chưa xóa
);

-- roles: system roles có workspace_id NULL (dùng chung), custom roles gắn workspace.
CREATE TABLE IF NOT EXISTS workspace.roles (
    id           BIGSERIAL   PRIMARY KEY,
    workspace_id BIGINT,                            -- NULL = system role
    name         VARCHAR(64) NOT NULL,
    permissions  JSONB       NOT NULL DEFAULT '{}',
    is_system    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- workspace_members: bảng nối user ↔ workspace + role. Một user chỉ 1 lần / workspace.
CREATE TABLE IF NOT EXISTS workspace.workspace_members (
    id           BIGSERIAL   PRIMARY KEY,
    workspace_id BIGINT      NOT NULL REFERENCES workspace.workspaces (id),
    user_id      BIGINT      NOT NULL REFERENCES workspace.users (id),
    role_id      BIGINT      NOT NULL REFERENCES workspace.roles (id),
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, user_id)
);

-- projects: thuộc về 1 workspace, key duy nhất trong phạm vi workspace. Soft delete.
CREATE TABLE IF NOT EXISTS workspace.projects (
    id           BIGSERIAL    PRIMARY KEY,
    workspace_id BIGINT       NOT NULL REFERENCES workspace.workspaces (id),
    key          VARCHAR(20)  NOT NULL,             -- ví dụ "PMV", "ENG"
    name         VARCHAR(255) NOT NULL,
    lead_id      BIGINT,                            -- user id lead (nullable)
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,                       -- NULL = chưa xóa
    UNIQUE (workspace_id, key)
);

-- Seed system roles: mọi workspace dùng chung 'owner' và 'member'.
-- Guard NOT EXISTS → chạy lại migration KHÔNG seed trùng (idempotent).
INSERT INTO workspace.roles (workspace_id, name, permissions, is_system)
SELECT NULL, r.name, '{}'::jsonb, TRUE
FROM (VALUES ('owner'), ('member')) AS r(name)
WHERE NOT EXISTS (
    SELECT 1 FROM workspace.roles x
    WHERE x.name = r.name AND x.workspace_id IS NULL
);

-- Index cho FK + cột query thường xuyên (IF NOT EXISTS → re-run an toàn).
CREATE INDEX IF NOT EXISTS idx_workspaces_slug       ON workspace.workspaces (slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id   ON workspace.workspaces (owner_id);
CREATE INDEX IF NOT EXISTS idx_roles_workspace_id    ON workspace.roles (workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_workspace_id  ON workspace.workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id       ON workspace.workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_members_role_id       ON workspace.workspace_members (role_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON workspace.projects (workspace_id);

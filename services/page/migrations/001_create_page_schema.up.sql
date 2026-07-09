-- Tạo schema page và các bảng: projection read-models (workspaces, members, users)
-- đọc từ Kafka, cùng domain tables spaces + pages. Migration chạy theo thứ tự 001, 002...
CREATE SCHEMA IF NOT EXISTS page;

-- workspaces_projection = BẢN PROJECTION đọc từ Kafka (workspace.events), KHÔNG phải nguồn gốc.
-- id KHÔNG dùng BIGSERIAL: nó chính là workspace id đẩy sang → gán trực tiếp.
-- Dùng để authz (membership) + hiển thị, không hard-FK cross-service.
CREATE TABLE IF NOT EXISTS page.workspaces_projection (
    id   BIGINT       PRIMARY KEY,                     -- = workspace id (không auto-increment)
    slug VARCHAR(255) NOT NULL DEFAULT '',             -- định danh URL-friendly của workspace
    name VARCHAR(255) NOT NULL DEFAULT ''
);

-- members_projection = BẢN PROJECTION quyền thành viên (workspace.events).
-- Nguồn authz chính: page-service kiểm tra user có thuộc workspace không qua bảng này.
-- PK ghép (workspace_id, user_id): một user chỉ 1 dòng / workspace.
CREATE TABLE IF NOT EXISTS page.members_projection (
    workspace_id BIGINT      NOT NULL,                 -- cross-service ref, KHÔNG hard FK
    user_id      BIGINT      NOT NULL,                 -- cross-service ref, KHÔNG hard FK
    role         VARCHAR(64) NOT NULL DEFAULT '',      -- tên role phẳng (owner/member...) để check nhanh
    PRIMARY KEY (workspace_id, user_id)
);

-- users_projection = BẢN PROJECTION đọc từ Kafka (auth.user.events).
-- id chính là auth user id đẩy sang → gán trực tiếp (không serial ở service này).
CREATE TABLE IF NOT EXISTS page.users_projection (
    id         BIGINT       PRIMARY KEY,               -- = auth user id (không auto-increment)
    email      VARCHAR(320) NOT NULL DEFAULT '',       -- 320 = max email length theo RFC
    name       VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url TEXT         NOT NULL DEFAULT ''
);

-- spaces = container chứa pages (kiểu Confluence Space). page-service SỞ HỮU bảng này.
-- workspace_id là cross-service ref (KHÔNG hard FK), authz qua members_projection.
-- Soft delete qua deleted_at (NULL = còn sống).
CREATE TABLE IF NOT EXISTS page.spaces (
    id           BIGSERIAL    PRIMARY KEY,
    workspace_id BIGINT       NOT NULL,                -- cross-service ref, KHÔNG hard FK
    key          VARCHAR(50)  NOT NULL,                -- ví dụ "DOCS", "ENG"; unique toàn cục qua partial index
    name         VARCHAR(255) NOT NULL,
    owner_id     BIGINT       NOT NULL,                -- user id chủ space
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ                           -- NULL = chưa xóa
);

-- pages = nội dung tài liệu, phân cấp cây qua parent_id (self-FK). page-service SỞ HỮU.
-- space_id hard-FK trong cùng schema; parent_id self-FK (page con thuộc page cha cùng bảng).
-- author_id là cross-service ref (KHÔNG hard FK). Soft delete qua deleted_at.
CREATE TABLE IF NOT EXISTS page.pages (
    id           BIGSERIAL    PRIMARY KEY,
    space_id     BIGINT       NOT NULL REFERENCES page.spaces (id),
    parent_id    BIGINT       REFERENCES page.pages (id),   -- NULL = page gốc (root); self-FK dựng cây
    title        VARCHAR(500) NOT NULL,
    slug         VARCHAR(255) NOT NULL,                     -- URL-friendly; unique trong space qua partial index
    content_html TEXT         NOT NULL DEFAULT '',          -- HTML render sẵn (đọc nhanh)
    content_text TEXT         NOT NULL DEFAULT '',          -- plain text (full-text search sau này)
    author_id    BIGINT       NOT NULL,                     -- cross-service ref, KHÔNG hard FK
    version      INT          NOT NULL DEFAULT 1,           -- optimistic version, tăng mỗi lần sửa
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ                                -- NULL = chưa xóa
);

-- Index cho FK + cột query thường xuyên (IF NOT EXISTS → re-run an toàn / idempotent).
CREATE INDEX IF NOT EXISTS idx_members_proj_user_id ON page.members_projection (user_id);
CREATE INDEX IF NOT EXISTS idx_spaces_workspace_id  ON page.spaces (workspace_id);
CREATE INDEX IF NOT EXISTS idx_pages_space_id       ON page.pages (space_id);
CREATE INDEX IF NOT EXISTS idx_pages_parent_id      ON page.pages (parent_id);

-- Space key DUY NHẤT TOÀN HỆ THỐNG (Jira/Confluence-style), chỉ giữa space CÒN SỐNG (partial):
-- key trùng giữa 2 workspace gây nhập nhằng cross-tenant (bài học từ project-key ở workspace-service).
-- Partial WHERE deleted_at IS NULL → key đã xoá mềm được tái sử dụng, reads/writes đồng nhất.
CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_key_global ON page.spaces (key) WHERE deleted_at IS NULL;

-- Slug page DUY NHẤT TRONG 1 SPACE, chỉ giữa page CÒN SỐNG (partial): URL /space/<key>/<slug>
-- không được trùng trong cùng space. Slug đã xoá mềm được tái sử dụng.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_space_slug ON page.pages (space_id, slug) WHERE deleted_at IS NULL;

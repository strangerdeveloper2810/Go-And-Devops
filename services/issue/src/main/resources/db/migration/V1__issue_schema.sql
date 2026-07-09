-- V1 — Issue-service domain schema (Jira core) + Kafka read-model projections.
-- Flyway chạy file theo thứ tự version: V1, V2, ... (giống Knex/Prisma migrations).
-- Mọi bảng đều qualify bằng "issue." để không phụ thuộc search_path khi test tay.
CREATE SCHEMA IF NOT EXISTS issue;

-- ---------------------------------------------------------------------------
-- CONFIG: type system (issue types, workflows, custom fields, screens)
-- project_id NULL = hàng "system" dùng chung mọi project (seed ở V2, read-only).
-- ---------------------------------------------------------------------------

-- issue_types: Epic/Story/Task/Bug/Subtask. is_subtask = loại nằm dưới 1 issue cha.
CREATE TABLE IF NOT EXISTS issue.issue_types (
    id         BIGSERIAL    PRIMARY KEY,
    project_id BIGINT,                                 -- NULL = system default type
    key        VARCHAR(64)  NOT NULL,                  -- 'epic','story','task','bug','subtask'
    name       VARCHAR(128) NOT NULL,
    icon       VARCHAR(64)  NOT NULL DEFAULT '',
    is_subtask BOOLEAN      NOT NULL DEFAULT FALSE,     -- TRUE với Subtask
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, key)
);

-- workflows: states + transitions lưu JSONB (không FK vào cột status của issues).
CREATE TABLE IF NOT EXISTS issue.workflows (
    id          BIGSERIAL    PRIMARY KEY,
    project_id  BIGINT,                                -- NULL = system default workflow
    name        VARCHAR(128) NOT NULL,
    states      JSONB        NOT NULL DEFAULT '[]',     -- vd ["To Do","In Progress",...]
    transitions JSONB        NOT NULL DEFAULT '[]',     -- vd [{"from":..,"to":..,"name":..}]
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- custom_fields: field tuỳ biến per-project. type giới hạn bằng CHECK (enum-ish).
CREATE TABLE IF NOT EXISTS issue.custom_fields (
    id         BIGSERIAL    PRIMARY KEY,
    project_id BIGINT,                                 -- NULL = system field
    key        VARCHAR(64)  NOT NULL,
    name       VARCHAR(128) NOT NULL,
    type       VARCHAR(20)  NOT NULL
               CHECK (type IN ('text', 'number', 'select', 'user', 'date')),
    config     JSONB        NOT NULL DEFAULT '{}',      -- vd {"options":[...]} cho select
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, key)
);

-- field_screens: field nào hiển thị cho từng issue_type (layout lưu JSONB).
CREATE TABLE IF NOT EXISTS issue.field_screens (
    id            BIGSERIAL   PRIMARY KEY,
    project_id    BIGINT,                              -- NULL = system screen
    issue_type_id BIGINT      NOT NULL REFERENCES issue.issue_types (id),
    field_layout  JSONB       NOT NULL DEFAULT '[]',    -- thứ tự + nhóm field trên form
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- SPRINTS + BOARDS (định nghĩa trước issues vì issues.sprint_id tham chiếu sprints)
-- ---------------------------------------------------------------------------

-- sprints: 1 sprint thuộc 1 project. state: planned -> active -> completed.
CREATE TABLE IF NOT EXISTS issue.sprints (
    id         BIGSERIAL    PRIMARY KEY,
    project_id BIGINT       NOT NULL,                  -- ref logic tới project (không FK: projection có thể trễ)
    name       VARCHAR(255) NOT NULL,
    goal       TEXT         NOT NULL DEFAULT '',
    state      VARCHAR(20)  NOT NULL DEFAULT 'planned'
               CHECK (state IN ('planned', 'active', 'completed')),
    start_date TIMESTAMPTZ,
    end_date   TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- boards: Scrum/Kanban. columns map state->cột, filter = điều kiện lọc issue (JSONB).
CREATE TABLE IF NOT EXISTS issue.boards (
    id         BIGSERIAL    PRIMARY KEY,
    project_id BIGINT       NOT NULL,                  -- ref logic tới project (không FK)
    name       VARCHAR(255) NOT NULL,
    type       VARCHAR(20)  NOT NULL DEFAULT 'scrum'
               CHECK (type IN ('scrum', 'kanban')),
    columns    JSONB        NOT NULL DEFAULT '[]',
    filter     JSONB        NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- ISSUES (bảng trung tâm) + bảng con
-- ---------------------------------------------------------------------------

-- issues: đơn vị công việc. key duy nhất trong project (vd "PMV-1"), soft delete.
-- project_id/assignee_id/reporter_id KHÔNG FK: chúng trỏ sang dữ liệu ở service khác
-- (chỉ có bản projection cục bộ, có thể trễ) → tránh chặn write vì projection chưa tới.
CREATE TABLE IF NOT EXISTS issue.issues (
    id           BIGSERIAL    PRIMARY KEY,
    project_id   BIGINT       NOT NULL,                -- ref logic tới project
    key          VARCHAR(64)  NOT NULL,                -- "<PROJECTKEY>-<n>"
    type_id      BIGINT       NOT NULL REFERENCES issue.issue_types (id),
    summary      VARCHAR(500) NOT NULL,
    description  TEXT         NOT NULL DEFAULT '',
    status       VARCHAR(64)  NOT NULL DEFAULT 'To Do',-- 1 trong workflow.states
    priority     VARCHAR(20)  NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('highest', 'high', 'medium', 'low', 'lowest')),
    assignee_id  BIGINT,                               -- user id (nullable)
    reporter_id  BIGINT       NOT NULL,                -- user tạo issue
    parent_id    BIGINT       REFERENCES issue.issues (id), -- self ref: subtask -> issue cha
    sprint_id    BIGINT       REFERENCES issue.sprints (id),
    story_points NUMERIC(6, 2),                        -- điểm ước lượng (nullable)
    labels       TEXT[]       NOT NULL DEFAULT '{}',   -- mảng nhãn tự do
    due_date     TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ                           -- NULL = chưa xóa
);

-- issue_field_values: giá trị custom field của 1 issue. value JSONB linh hoạt mọi type.
CREATE TABLE IF NOT EXISTS issue.issue_field_values (
    issue_id BIGINT NOT NULL REFERENCES issue.issues (id) ON DELETE CASCADE,
    field_id BIGINT NOT NULL REFERENCES issue.custom_fields (id),
    value    JSONB,
    PRIMARY KEY (issue_id, field_id)
);

-- issue_links: quan hệ giữa 2 issue. Chặn tự-link + cặp trùng ở tầng DB.
CREATE TABLE IF NOT EXISTS issue.issue_links (
    id            BIGSERIAL   PRIMARY KEY,
    from_issue_id BIGINT      NOT NULL REFERENCES issue.issues (id) ON DELETE CASCADE,
    to_issue_id   BIGINT      NOT NULL REFERENCES issue.issues (id) ON DELETE CASCADE,
    link_type     VARCHAR(20) NOT NULL
                  CHECK (link_type IN ('blocks', 'relates', 'duplicates')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (from_issue_id <> to_issue_id),             -- không tự link chính nó
    UNIQUE (from_issue_id, to_issue_id, link_type)    -- không link trùng cùng loại
);

-- issue_attachments: CHỈ lưu metadata; file thật do file-service giữ (file_id tham chiếu).
CREATE TABLE IF NOT EXISTS issue.issue_attachments (
    id          BIGSERIAL   PRIMARY KEY,
    issue_id    BIGINT      NOT NULL REFERENCES issue.issues (id) ON DELETE CASCADE,
    file_id     BIGINT      NOT NULL,                 -- ref sang file-service (không FK)
    filename    VARCHAR(512) NOT NULL DEFAULT '',
    uploaded_by BIGINT      NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- comments: mentions = mảng user id được @nhắc (notification-service tiêu thụ).
CREATE TABLE IF NOT EXISTS issue.comments (
    id         BIGSERIAL   PRIMARY KEY,
    issue_id   BIGINT      NOT NULL REFERENCES issue.issues (id) ON DELETE CASCADE,
    author_id  BIGINT      NOT NULL,
    body       TEXT        NOT NULL,
    body_html  TEXT        NOT NULL DEFAULT '',        -- HTML đã sanitize
    mentions   BIGINT[]    NOT NULL DEFAULT '{}',      -- user id được @mention
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- watchers: user theo dõi issue (1 user chỉ watch 1 lần / issue).
CREATE TABLE IF NOT EXISTS issue.watchers (
    issue_id   BIGINT      NOT NULL REFERENCES issue.issues (id) ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (issue_id, user_id)
);

-- sprint_issues: bảng nối sprint <-> issue + position (thứ tự rank trong sprint).
CREATE TABLE IF NOT EXISTS issue.sprint_issues (
    sprint_id BIGINT NOT NULL REFERENCES issue.sprints (id) ON DELETE CASCADE,
    issue_id  BIGINT NOT NULL REFERENCES issue.issues (id) ON DELETE CASCADE,
    position  BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (sprint_id, issue_id)
);

-- issue_key_seq: bộ đếm key per-project để cấp "<KEY>-<n>" nguyên tử (UPSERT + RETURNING).
CREATE TABLE IF NOT EXISTS issue.issue_key_seq (
    project_id BIGINT PRIMARY KEY,
    next_val   BIGINT NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------------
-- PROJECTIONS (read-model đọc từ Kafka; KHÔNG phải nguồn gốc dữ liệu).
-- id không dùng BIGSERIAL: gán trực tiếp từ id của service phát sự kiện.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS issue.workspaces_projection (
    id   BIGINT       PRIMARY KEY,                     -- = workspace id nguồn
    slug VARCHAR(255) NOT NULL DEFAULT '',
    name VARCHAR(255) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS issue.projects_projection (
    id           BIGINT       PRIMARY KEY,             -- = project id nguồn
    workspace_id BIGINT       NOT NULL,
    key          VARCHAR(20)  NOT NULL DEFAULT '',     -- dùng để dựng issue key
    name         VARCHAR(255) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS issue.members_projection (
    workspace_id BIGINT      NOT NULL,
    user_id      BIGINT      NOT NULL,
    role         VARCHAR(64) NOT NULL DEFAULT '',      -- 'owner'/'member' cho authz cục bộ
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS issue.users_projection (
    id         BIGINT       PRIMARY KEY,               -- = auth user id nguồn
    email      VARCHAR(320) NOT NULL DEFAULT '',
    name       VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url TEXT         NOT NULL DEFAULT ''
);

-- ---------------------------------------------------------------------------
-- INDEXES: FK + cột query nóng. IF NOT EXISTS -> re-run an toàn (idempotent).
-- ---------------------------------------------------------------------------

-- issues: partial UNIQUE(project_id,key) CHỈ trên hàng chưa soft-delete → khớp filter
-- đọc (WHERE deleted_at IS NULL), cho phép tái dùng key sau khi xoá mềm
-- (bài học từ bug slug ở workspace: đừng UNIQUE cứng khi có soft delete).
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_project_key
    ON issue.issues (project_id, key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_issues_project_status ON issue.issues (project_id, status);
CREATE INDEX IF NOT EXISTS idx_issues_assignee_id    ON issue.issues (assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_sprint_id      ON issue.issues (sprint_id);
CREATE INDEX IF NOT EXISTS idx_issues_type_id        ON issue.issues (type_id);
CREATE INDEX IF NOT EXISTS idx_issues_parent_id      ON issue.issues (parent_id);

CREATE INDEX IF NOT EXISTS idx_issue_types_project_id    ON issue.issue_types (project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_project_id      ON issue.workflows (project_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_project_id  ON issue.custom_fields (project_id);
CREATE INDEX IF NOT EXISTS idx_field_screens_type_id     ON issue.field_screens (issue_type_id);
CREATE INDEX IF NOT EXISTS idx_field_screens_project_id  ON issue.field_screens (project_id);

CREATE INDEX IF NOT EXISTS idx_field_values_field_id     ON issue.issue_field_values (field_id);
CREATE INDEX IF NOT EXISTS idx_issue_links_from          ON issue.issue_links (from_issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_links_to            ON issue.issue_links (to_issue_id);
CREATE INDEX IF NOT EXISTS idx_attachments_issue_id      ON issue.issue_attachments (issue_id);
CREATE INDEX IF NOT EXISTS idx_comments_issue_id         ON issue.comments (issue_id);
CREATE INDEX IF NOT EXISTS idx_watchers_user_id          ON issue.watchers (user_id);

CREATE INDEX IF NOT EXISTS idx_sprints_project_id        ON issue.sprints (project_id);
CREATE INDEX IF NOT EXISTS idx_sprint_issues_issue_id    ON issue.sprint_issues (issue_id);
CREATE INDEX IF NOT EXISTS idx_boards_project_id         ON issue.boards (project_id);

CREATE INDEX IF NOT EXISTS idx_projects_projection_ws_id ON issue.projects_projection (workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_projection_user   ON issue.members_projection (user_id);

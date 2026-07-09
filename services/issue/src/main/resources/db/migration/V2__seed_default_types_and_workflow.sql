-- V2 — Seed dữ liệu "system" dùng chung mọi project (project_id NULL).
-- Idempotent: dùng WHERE NOT EXISTS nên chạy lại KHÔNG tạo bản trùng.

-- Seed 5 issue type mặc định. is_subtask = TRUE chỉ với 'subtask'.
INSERT INTO issue.issue_types (project_id, key, name, icon, is_subtask)
SELECT NULL, t.key, t.name, t.icon, t.is_subtask
FROM (VALUES
    ('epic',    'Epic',    'epic',    FALSE),
    ('story',   'Story',   'story',   FALSE),
    ('task',    'Task',    'task',    FALSE),
    ('bug',     'Bug',     'bug',     FALSE),
    ('subtask', 'Subtask', 'subtask', TRUE)
) AS t(key, name, icon, is_subtask)
WHERE NOT EXISTS (
    SELECT 1 FROM issue.issue_types x
    WHERE x.project_id IS NULL AND x.key = t.key
);

-- Seed workflow mặc định: To Do -> In Progress -> In Review -> Done.
-- states = danh sách trạng thái; transitions = các bước chuyển hợp lệ (from/to/name).
INSERT INTO issue.workflows (project_id, name, states, transitions, is_default)
SELECT
    NULL,
    'Default Workflow',
    '["To Do", "In Progress", "In Review", "Done"]'::jsonb,
    '[
        {"from": "To Do",       "to": "In Progress", "name": "Start Progress"},
        {"from": "In Progress", "to": "In Review",   "name": "Submit for Review"},
        {"from": "In Progress", "to": "To Do",       "name": "Stop Progress"},
        {"from": "In Review",   "to": "In Progress", "name": "Reject"},
        {"from": "In Review",   "to": "Done",        "name": "Approve"},
        {"from": "Done",        "to": "In Progress", "name": "Reopen"}
    ]'::jsonb,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM issue.workflows x
    WHERE x.project_id IS NULL AND x.name = 'Default Workflow'
);

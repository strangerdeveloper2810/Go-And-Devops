-- Optimistic locking cho issues: cột version cho @Version (Hibernate).
-- Chặn lost-update khi 2 request cùng transition/update 1 issue (→ 409).
-- DEFAULT 0 để hàng đã tồn tại hợp lệ ngay; NOT NULL vì @Version quản lý.
ALTER TABLE issue.issues ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

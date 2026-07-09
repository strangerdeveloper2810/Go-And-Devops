-- Tạo schema file và bảng files (metadata của object lưu trên MinIO/S3).
-- file-service KHÔNG consume Kafka → không có bảng projection. Authz theo owner_id.
-- Migration chạy theo thứ tự 001, 002...
CREATE SCHEMA IF NOT EXISTS file;

-- files = metadata 1 object. Nội dung nhị phân nằm ở MinIO (bucket + s3_key),
-- Postgres chỉ giữ metadata + con trỏ tới object. Soft delete qua deleted_at (NULL = còn sống).
CREATE TABLE IF NOT EXISTS file.files (
    id           BIGSERIAL    PRIMARY KEY,
    owner_id     BIGINT       NOT NULL,               -- user id upload (= caller X-User-ID); dùng cho authz
    workspace_id BIGINT,                              -- NULL = file cá nhân, không thuộc workspace nào
    name         VARCHAR(500) NOT NULL,               -- tên file gốc lúc upload
    mime         VARCHAR(255) NOT NULL,               -- content-type, ví dụ "image/png"
    size         BIGINT       NOT NULL,               -- kích thước byte
    s3_key       VARCHAR(500) NOT NULL,               -- object key trong bucket (thường sinh từ UUID)
    s3_bucket    VARCHAR(255) NOT NULL,               -- tên bucket MinIO (pm-attachments, pm-avatars...)
    etag         VARCHAR(255) NOT NULL DEFAULT '',    -- ETag MinIO trả sau khi PutObject (kiểm tra toàn vẹn)
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ                          -- NULL = chưa xóa
);

-- Index cho cột query thường xuyên (IF NOT EXISTS → re-run an toàn / idempotent).
CREATE INDEX IF NOT EXISTS idx_files_owner_id     ON file.files (owner_id);
CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON file.files (workspace_id);

-- s3_key DUY NHẤT toàn hệ thống: 1 object key chỉ map tới đúng 1 hàng metadata,
-- tránh 2 file record cùng trỏ 1 object (double-delete / rò rỉ dữ liệu cross-record).
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_s3_key ON file.files (s3_key);

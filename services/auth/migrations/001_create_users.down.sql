-- Rollback: xóa schema auth và mọi thứ bên trong (gồm bảng users).
-- CASCADE tự xóa bảng users → không cần DROP TABLE riêng.
DROP SCHEMA IF EXISTS auth CASCADE;
-- Rollback: xóa schema workspace và mọi thứ bên trong (CASCADE tự xóa hết bảng).
DROP SCHEMA IF EXISTS workspace CASCADE;

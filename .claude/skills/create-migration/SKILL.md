---
name: create-migration
description: Use when adding or altering tables/columns/indexes in a service's Postgres schema — writes a new DB migration following PM Platform conventions (schema-qualified, partial-unique for soft-delete, idempotent) and verifies it applies. Works for Go services (golang-migrate *.up.sql) and the Java issue-service (Flyway V__.sql).
argument-hint: "<service> — <thay đổi schema>"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Create migration

Viết migration mới cho service theo mô tả: **$ARGUMENTS**. Đọc `services/CLAUDE.md` +
`../CLAUDE.md` (Patterns → Migration, Lessons) trước.

## Quy tắc BẮT BUỘC
- **Go service** (`services/<svc>/migrations/`): file cặp `NNN_<mô tả>.up.sql` + `.down.sql`,
  đánh số tiếp theo. **Java issue-service** (`services/issue/src/main/resources/db/migration/`):
  `V<next>__<mô tả>.sql` (Flyway tự apply lúc boot).
- `CREATE SCHEMA IF NOT EXISTS <svc>;` nếu chưa; mọi object schema-qualified (`<svc>.table`).
- **Idempotent**: `CREATE TABLE/INDEX IF NOT EXISTS`, seed dùng `WHERE NOT EXISTS`.
- **Soft-delete**: cột cần unique mà có `deleted_at` → **partial unique index**
  `CREATE UNIQUE INDEX ... ON <svc>.t (col) WHERE deleted_at IS NULL` (khớp filter đọc). KHÔNG
  dùng `UNIQUE` constraint cột (bao trùm cả row đã xoá).
- **Key global-unique** kiểu Jira nếu là project/space key.
- Cross-service ref (user_id, workspace_id...) **KHÔNG hard FK** (tránh chặn write vì projection trễ);
  chỉ index. FK trong cùng schema thì được.
- Index cho mọi FK + cột query thường xuyên.

## Bối cảnh (đọc trước)
Migration hiện có của service (đánh số tiếp):
!`ls services/*/migrations/ services/issue/src/main/resources/db/migration/ 2>/dev/null`

## Verify sau khi viết (KHÔNG persist — rollback)
Go: chạy trong transaction rollback trên postgres đang chạy:
```
{ echo 'BEGIN;'; cat services/<svc>/migrations/<new>.up.sql; echo 'ROLLBACK;'; } \
  | docker exec -i -e PGPASSWORD=postgres pm-postgres psql -U postgres -d pmdb -v ON_ERROR_STOP=1
```
Nếu đổi entity (Java @Entity/Go model) → cập nhật cho khớp; Java `ddl-auto: none` (Flyway sở hữu schema).
Xong gợi ý `/review`.

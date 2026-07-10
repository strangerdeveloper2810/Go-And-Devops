# CLAUDE.md — Backend services (Go/Java)

Bổ sung cho `../CLAUDE.md` (đọc phần "Patterns" + "Lessons" ở đó). Checklist khi động vào service.

## Pre-flight mỗi thay đổi Go
- [ ] Build/vet **module-mode** (như CI/prod, go.work che khuất khi dev):
      `GOWORK=off go -C services/<svc> build ./... && GOWORK=off go -C services/<svc> vet ./...`
- [ ] `gofmt -l services/<svc>` rỗng (trừ `*.pb.go`). Nếu bẩn: `gofmt -w <file>`.
- [ ] Sửa `.proto` → `cd proto && buf lint && buf generate`, verify `packages/proto-go` build.
- [ ] Đổi dependency → `GOWORK=off go -C services/<svc> mod tidy` (go.sum đầy đủ, tránh CI
      "missing go.sum entry"); rồi `go work sync` ở root.

## Rule nhanh (chi tiết ở ../CLAUDE.md → Lessons)
- Read query: LUÔN `WHERE deleted_at IS NULL`; JOIN bảng cha cũng filter.
- Authz: resolve resource → assert membership (LOCAL projection). Không tin body cho identity —
  chỉ header `X-User-ID` (đọc qua `middleware.RequireUser`).
- Kafka consumer: `FetchMessage` + commit thủ công SAU xử lý; lỗi tạm thời retry-tại-chỗ (KHÔNG
  `continue` — commit cumulative làm mất message). Handler idempotent. Mẫu: `workspace/.../consumer.go`.
- Kafka producer: `RequiredAcks: RequireAll`, best-effort, `context.WithoutCancel(ctx)`.
- Không hardcode secret; không hard FK cross-schema; key global-unique.
- Sentinel error ở service (`ErrNotFound/ErrNotMember/ErrConflict`) → handler map sang 400/403/404/409.

## Service mới → mirror `services/workspace`
Copy verbatim `internal/{database,observability,middleware}` (đổi import path `workspace`→`<svc>`),
mẫu `config.go` (prefix `PM_<SVC>`, `v.BindEnv("database.url")`, ports 80xx/90xx), thêm vào root
`go.work`, thêm reverse proxy ở gateway (route trần + catch-all, nhóm protected). Dùng
`/new-service` (`.claude/commands/`).

## Java (issue-service)
Flyway auto-apply migration lúc boot. `ddl-auto: none` (Flyway sở hữu schema; `validate` xung đột
Postgres array/JSONB). Build: `mvn -f services/issue/pom.xml -DskipTests package` (JAVA_HOME=17).
Optimistic lock: `@Version`. Authz mirror Go (X-User-ID + projection).

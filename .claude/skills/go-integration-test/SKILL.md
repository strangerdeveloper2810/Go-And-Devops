---
name: go-integration-test
description: Use when writing tests for a Go service (workspace/page/file/auth...) — scaffold focused integration tests (Postgres/Kafka testcontainers) + handler httptest theo triết lý test của PM Platform, cover đúng các lesson dễ sai (soft-delete, IDOR/membership 403, key global-unique 409, Kafka idempotency). ƯU TIÊN integration hơn full-E2E.
argument-hint: "<service> — <repo|service|handler|consumer> <thứ cần test>"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Go integration test (focused)

Viết test cho Go service theo mô tả: **$ARGUMENTS**. Đọc `../CLAUDE.md` (mục **Testing** + **Lessons**)
+ `services/CLAUDE.md` trước. Skill này = **kiến thức + scaffold "làm thế nào"**; khi cần *dispatch*
để viết trọn bộ test cho 1 thay đổi → dùng agent `test-author` (nó tự viết → chạy → sửa tới xanh).
Skill này bổ trợ: cung cấp mẫu + checklist để agent/người bám theo.

## Quy tắc BẮT BUỘC
- **ƯU TIÊN integration test focused**, KHÔNG viết full-E2E (đắt + flaky; đã có `scripts/*-integration-smoke.sh`
  chạy tay). Test hành vi + edge case, **không test implementation detail**.
- **Đặt cạnh code**: `*_test.go` cùng package với thứ đang test (`repository/`, `service/`, `handler/`).
- **Table-driven**: `tests := []struct{ name string; ... want ... }{...}` + `for _, tt := range tests {
  t.Run(tt.name, func(t *testing.T){...}) }`. Mỗi case 1 dòng bảng.
- **Cover đúng LESSON dễ sai** (mỗi cái ≥1 case):
  - **Soft-delete**: tạo row → soft-delete (`deleted_at=NOW()`) → read query phải KHÔNG trả (filter `WHERE deleted_at IS NULL`).
  - **IDOR / membership**: member đọc/mutate → 200; non-member → **403** (`ErrNotMember`); mutate sai role (không owner) → 403.
  - **Key global-unique** (project/space key): tạo trùng key ở workspace KHÁC vẫn **409** (`ErrConflict`).
  - **Kafka idempotency**: gửi lại (redeliver) cùng event → handler UPSERT → **KHÔNG nhân đôi** row (count không đổi).
- Constraint DB (partial-unique `WHERE deleted_at IS NULL`, soft-delete) phải test ở tầng **repo** với DB thật,
  không mock — mock che mất bug SQL.

## Repo / consumer test — Postgres/Kafka testcontainer
Dùng `testcontainers-go` (thêm vào `go.mod`: `github.com/testcontainers/testcontainers-go` +
`.../modules/postgres`, `.../modules/kafka`). Pattern:
1. `TestMain` (hoặc helper `setupDB(t)`) spin `postgres:16-alpine`, lấy DSN.
2. **Apply migration của service**: đọc `services/<svc>/migrations/*.up.sql` theo thứ tự, `db.Exec` từng file
   (schema `<svc>` được tạo trong migration). KHÔNG copy DDL tay — dùng đúng file migration để test bám schema thật.
3. Mỗi test: seed data → gọi repo method → assert. Cleanup bằng `t.Cleanup(func(){ container.Terminate(ctx) })`
   hoặc `TRUNCATE` giữa các case.
4. **Consumer**: spin Kafka module → publish `EventEnvelope` (proto.Marshal payload cụ thể) vào topic →
   chạy consumer/handler → assert projection table. **Publish 2 lần** cùng event → assert count không đổi (idempotent).

```go
func setupDB(t *testing.T) *sql.DB {
    ctx := context.Background()
    pg, err := postgres.Run(ctx, "postgres:16-alpine",
        postgres.WithDatabase("pmdb"), postgres.WithUsername("postgres"), postgres.WithPassword("postgres"),
        testcontainers.WithWaitStrategy(wait.ForListeningPort("5432/tcp")))
    if err != nil { t.Fatal(err) }
    t.Cleanup(func() { _ = pg.Terminate(ctx) })
    dsn, _ := pg.ConnectionString(ctx, "sslmode=disable")
    db, err := sql.Open("pgx", dsn); if err != nil { t.Fatal(err) }
    applyMigrations(t, db, "../../migrations") // Exec mọi *.up.sql theo thứ tự
    return db
}
```

## Handler test — httptest + service stub
- KHÔNG cần DB. **Stub service** (implement interface service, trả về giá trị/sentinel error mong muốn).
- `httptest.NewRecorder()` + `gin` router đăng ký handler; **set header `X-User-ID`** (identity gateway inject,
  service tin header này — không đọc identity từ body). Test thiếu header → 401.
- Assert **status + body**: map sentinel `ErrNotFound→404 / ErrNotMember→403 / ErrConflict→409` đúng như handler làm.
  Body lỗi khớp `{"error":{"code","message"}}`.

```go
req := httptest.NewRequest(http.MethodGet, "/workspaces/1", nil)
req.Header.Set("X-User-ID", "42")
w := httptest.NewRecorder()
router.ServeHTTP(w, req)
require.Equal(t, http.StatusForbidden, w.Code) // non-member → 403 (IDOR)
```

## Chạy & verify
```
GOWORK=off go -C services/<svc> test ./... -run <TestName> -v
GOWORK=off go -C services/<svc> test ./... -race     # trọn service, phát hiện data race
```
Thêm dependency test → `GOWORK=off go -C services/<svc> mod tidy` rồi `go work sync` (tránh CI "missing go.sum entry").
`gofmt -l` phải rỗng. Xong gợi ý `/review`.

Liên quan: authz/projection → `[[authz-projection]]`; event producer/consumer để test → `[[kafka-event]]`;
tầng handler→service→repo (interface để stub) → `[[clean-arch-layer]]`.

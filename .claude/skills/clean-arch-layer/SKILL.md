---
name: clean-arch-layer
description: Use when adding a feature/endpoint to a Go service that must flow through handler → service → repository — encodes PM Platform Clean Architecture (gin bind+validate, sentinel-error→HTTP mapping, authz/membership, soft-delete reads, DI wiring) mirroring services/workspace.
argument-hint: "<service> — <feature> (vd: workspace — archive workspace)"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Clean Architecture layer (Go)

Implement feature theo mô tả: **$ARGUMENTS**, xuyên 3 tầng `handler → service → repository`.
Đọc `../CLAUDE.md` (mục "Layer" + "Lessons") + `services/CLAUDE.md` trước. Bám verbatim
`services/workspace/internal/{handler,service,repository}/workspace.go` làm khuôn mẫu.

## Quy tắc BẮT BUỘC
- **Luồng 1 chiều**: `handler` (gin) → `service` (business + authz) → `repository` (SQL). Tầng trên
  chỉ biết tầng dưới **qua interface**; DI qua constructor `New*`. KHÔNG gọi tắt (handler→repo).
- **handler**: khai báo **request struct riêng** (`createXRequest` với `binding:"required"`),
  `c.ShouldBindJSON(&req)` lỗi → `400` + `errorBody("VALIDATION_ERROR", err.Error())`. Identity LUÔN
  lấy từ `middleware.UserID(c)` (header `X-User-ID` gateway inject) — **KHÔNG đọc từ body**. Success
  trả `c.JSON(status, gin.H{"<resource>": v})`; lỗi service → `h.respondErr(c, err)`.
- **respondErr** map sentinel → HTTP: `ErrNotFound`→404, `ErrNotMember`/`ErrNotOwner`→403,
  `ErrConflict`→409, còn lại→500. Dùng `errors.Is`, KHÔNG so chuỗi. Path param parse qua `idParam`.
- **service**: sentinel errors ở package (`var ErrNotFound = errors.New(...)`, `ErrNotMember`,
  `ErrConflict`...). Mọi thao tác scope-theo-workspace phải **assert membership** trước
  (`assertMember` → ErrNotMember; mutate cần owner → `assertOwner` → ErrNotOwner). Multi-step ghi →
  1 transaction (`db.BeginTx` + `defer tx.Rollback()` + `tx.Commit()`). **IDOR**: read/mutate theo id
  BẮT BUỘC check owner/membership — đừng để "user auth bất kỳ đọc resource người khác".
- **repository**: `XRepository` interface + struct `postgreXRepository` (`New*` trả **interface**,
  không trả struct). `$1` placeholder; `QueryRowContext` (1 dòng) / `QueryContext` (nhiều dòng) +
  `defer rows.Close()` + check `rows.Err()` sau vòng lặp. `INSERT ... RETURNING id, created_at` để
  đồng bộ struct. Wrap lỗi `fmt.Errorf("...: %w", err)`; `sql.ErrNoRows` để service `mapNotFound`.
- **Soft-delete**: MỌI query đọc thêm `WHERE deleted_at IS NULL`; **JOIN sang bảng cha cũng filter**
  (`w.deleted_at IS NULL` khi list qua workspace_members). Xoá = `SET deleted_at = NOW()` (soft),
  không `DELETE`. Nếu thêm cột unique có soft-delete → migration dùng partial unique index.
- **Key global-unique** kiểu Jira (project/space key) → check `ExistsByKey` toàn hệ thống, trùng → 409.

## Các bước
1. **Migration trước nếu đổi schema** → dùng skill `[[create-migration]]` (schema-qualified, idempotent,
   partial-unique cho cột unique soft-delete). Cập nhật `internal/model` cho khớp cột.
2. **repository**: thêm method vào interface + hiện thực `postgre*`. Đọc filter `deleted_at IS NULL`.
3. **service**: thêm method vào interface + struct; assert authz (membership/owner) → gọi repo → map
   `sql.ErrNoRows`→`ErrNotFound`. Phát Kafka event (nếu domain event) BEST-EFFORT sau commit
   (`context.WithoutCancel(ctx)`), không fail request.
4. **handler**: request struct + method; bind/validate → gọi service → `respondErr` / `gin.H`.
5. **Route**: đăng ký trong `internal/server/http.go` (nhóm protected). Nếu expose qua gateway → skill
   `[[gateway-proxy]]` (đăng ký CẢ route trần LẪN catch-all, tránh RedirectTrailingSlash bỏ auth).
6. **main.go**: đã wire `db→repo→service→handler→server` — chỉ thêm dependency mới nếu có repo mới.

## Verify (BẮT BUỘC trước khi claim xong)
Module-mode như CI (go.work che khuất khi dev):
```
GOWORK=off go -C services/<svc> build ./... && GOWORK=off go -C services/<svc> vet ./...
gofmt -l services/<svc>        # phải rỗng (trừ *.pb.go); bẩn → gofmt -w <file>
```
Đổi dependency → `GOWORK=off go -C services/<svc> mod tidy` rồi `go work sync`. Xong gợi ý `/review`.

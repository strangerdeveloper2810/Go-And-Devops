---
description: Add a REST endpoint to an existing service following repo patterns (handler→service→repo + gateway)
argument-hint: "<METHOD /path — service — mô tả>"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---
Thêm REST endpoint theo mô tả: **$ARGUMENTS** (vd "GET /api/v1/spaces/:id/pages/tree cho page-service").
Đọc `CLAUDE.md` + `services/CLAUDE.md` + service liên quan trước.

1. Xác định service + layer cần đụng. Đọc handler/service/repository hiện có để mirror style.
2. **Repository**: thêm method + vào interface (soft-delete filter, `$1` placeholder, `rows.Err()`).
3. **Service**: business logic + **authz** (assert membership/owner qua projection; sentinel error).
4. **Handler**: request DTO + binding/validate; gọi service; map sentinel error → HTTP status
   (400/403/404/409); response shape `{"<resource>": ...}` hoặc `{"error":{"code","message"}}`.
5. **Route**: đăng ký trong `internal/server/http.go` (nhóm `RequireUser()` nếu cần auth).
6. **Gateway** (nếu path prefix mới): thêm reverse proxy (route trần + catch-all, nhóm protected).
7. Verify: `GOWORK=off go -C services/<svc> build ./... && vet` + `gofmt -l`. Cân nhắc thêm test.

Java issue-service: Controller (`@RestControllerAdvice` map sentinel→status) → Service (authz projection)
→ Repository (JPA, soft-delete). `mvn -f services/issue/pom.xml -DskipTests compile` để verify.

Xong thì gợi ý chạy `/review`.

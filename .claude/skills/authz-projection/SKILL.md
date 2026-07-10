---
name: authz-projection
description: Use when a workspace-scoped Go service needs event-driven authorization — consume workspace.events + auth.user.events to build local *_projection tables (members/workspaces/users) and check membership LOCALLY without cross-schema queries, so every scoped endpoint can assert membership (owner-role for mutations).
argument-hint: "<service> — authz projection cho <resource scope-theo-workspace>"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Authz projection (event-driven membership)

Wire authz event-driven cho service theo mô tả: **$ARGUMENTS**. Đọc `../CLAUDE.md` (mục **Authz
event-driven** + **Kafka**) + `services/CLAUDE.md`. Mẫu canonical đã làm ĐÚNG pattern này:
- Consumer + dispatch: `services/page/internal/events/consumer.go`
- Migration projection tables: `services/page/migrations/001_create_page_schema.up.sql`
- Repo upsert idempotent: `services/page/internal/repository/member_projection.go`
- Nguồn phát event: `services/workspace/internal/events/producer.go` (+ `consumer.go`)

## Quy tắc BẮT BUỘC
- **KHÔNG query cross-schema.** Service scope-theo-workspace tự dựng read-model LOCAL từ Kafka:
  consume `workspace.events` (`workspace.created` → `workspaces_projection`; `member.added` /
  `member.removed` → `members_projection`; `project.created` → `projects_projection` nếu cần, KHÔNG
  cần thì bỏ qua) + `auth.user.events` (RAW `UserCreatedEvent` → `users_projection`).
- **`members_projection` = nguồn authz chính.** Mọi endpoint scope-theo-workspace **PHẢI** assert
  membership: resolve resource → lấy `workspace_id` → `memberRepo.Get(ctx, workspaceID, userID)`;
  không có dòng → sentinel `ErrNotMember` (handler map 403). Mutate (create/update/delete) cần
  **đúng role** (thường `owner`) → check `member.Role`.
- **Identity** chỉ từ header `X-User-ID` (qua `middleware.RequireUser`), KHÔNG đọc từ body/JWT.
- **Projection table**: PK = id/khoá thật đẩy sang (BIGINT, KHÔNG BIGSERIAL — gán trực tiếp id từ
  event); cross-service ref (`workspace_id`, `user_id`) **KHÔNG hard FK** (projection trễ, hard FK
  chặn write). `members_projection` PK ghép `(workspace_id, user_id)`. Chi tiết → `[[create-migration]]`.
- **Handler consumer idempotent**: repo `Upsert` = `INSERT ... ON CONFLICT (...) DO UPDATE`; `Remove`
  coi 0-row = thành công (redelivery/event trùng an toàn). Delivery rule (envelope, RequireAll,
  manual-commit, retry-tại-chỗ, poison skip) → theo `[[kafka-event]]`.
- **Soft-delete**: nếu domain table (spaces/pages...) có `deleted_at` → mọi read filter
  `WHERE deleted_at IS NULL`, JOIN bảng cha cũng filter; partial-unique index cho key global-unique.

## Các bước
1. **Migration** projection tables (`workspaces_projection`, `members_projection`, `users_projection`
   + `projects_projection` nếu cần) — dùng `[[create-migration]]`, mẫu `page` migration 001. Index
   `user_id` trên `members_projection` để tra ngược.
2. **Model + Repo**: `WorkspaceProjection` / `MemberProjection` / `UserProjection`; repo interface +
   `postgre*` struct trả interface, `Upsert` / `Get` / `Remove`. Mirror `page/internal/repository/*_projection.go`.
3. **Consumer**: dựng theo `[[kafka-event]]` — 2 Reader (workspace + user) cùng GroupID, dispatch
   `EventEnvelope.EventType`, upsert projection. Mẫu verbatim `page/internal/events/consumer.go`.
4. **Config**: `KafkaConfig{Brokers, UserEventsTopic, WorkspaceEventsTopic, ConsumerGroup}`
   (mapstructure), env prefix `PM_<SVC>`. Mẫu `page/internal/config/config.go`.
5. **Service authz**: mỗi method scope-theo-workspace gọi `memberRepo.Get(...)` → `ErrNotMember` /
   check role trước khi đọc/ghi domain.
6. **Wire main.go**: `NewConsumer(cfg.Kafka, wsProjRepo, memberRepo, userProjRepo, logger)`, chạy 2
   goroutine `RunWorkspaceEvents` / `RunUserEvents` với `consumerCtx` cancel lúc shutdown, gom lỗi
   qua `errCh`. Mẫu `services/page/cmd/page/main.go`.

## Verify
```
GOWORK=off go -C services/<svc> build ./... && GOWORK=off go -C services/<svc> vet ./...
gofmt -l services/<svc>   # phải rỗng (trừ *.pb.go)
```
Migration verify (rollback, không persist) theo `[[create-migration]]`. Xong gợi ý `/review`
(kiểm authz/IDOR: mọi endpoint đã assert membership chưa?).

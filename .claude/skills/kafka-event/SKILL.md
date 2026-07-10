---
name: kafka-event
description: Use when adding a Kafka producer or consumer to a Go service (publish/consume domain events) — encodes PM Platform's hardest delivery rules (EventEnvelope wrapping, RequiredAcks RequireAll, best-effort publish, manual-commit at-least-once consumer with in-place retry + poison skip, idempotent handler).
argument-hint: "<service> — <producer|consumer> <event/topic>"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Kafka event (producer / consumer)

Thêm Kafka producer/consumer cho service theo mô tả: **$ARGUMENTS**. Đọc `../CLAUDE.md`
(mục **Kafka**) + `services/CLAUDE.md` trước. Mẫu canonical:
- Producer envelope: `services/workspace/internal/events/producer.go`
- Producer RAW (ngoại lệ, không envelope): `services/auth/internal/events/producer.go`
- Consumer 1 topic: `services/workspace/internal/events/consumer.go`
- Consumer nhiều topic + dispatch: `services/page/internal/events/consumer.go`

## Quy tắc BẮT BUỘC
- **Bọc EventEnvelope** (`common.proto` → `pmv1.EventEnvelope{EventType, WorkspaceId, ActorId,
  OccurredAt, Payload}`): `Payload = proto.Marshal(<message cụ thể>)`. Consumer parse envelope →
  dispatch theo `EventType` → parse tiếp payload. **Ngoại lệ DUY NHẤT**: `auth.user.events` phát
  RAW `pmv1.UserCreatedEvent` (KHÔNG envelope) — giữ nguyên, đừng "chuẩn hoá".
- **Event type** khai báo hằng string (`eventTypeWorkspaceCreated = "workspace.created"`); producer
  và consumer PHẢI khớp chuỗi. Event consumer không quan tâm → nhánh `default` bỏ qua (vẫn commit).
- **Key = workspace_id** (hoặc user_id cho auth) `[]byte(strconv.FormatInt(...))` + `Balancer:
  &kafka.Hash{}` → cùng key vào cùng partition, giữ thứ tự trong 1 workspace.

### Producer
- `RequiredAcks: kafka.RequireAll` **TƯỜNG MINH**. Struct-literal `&kafka.Writer{}` để zero value =
  `RequireNone` (acks=0) → broker không ack, `WriteMessages` trả nil KỂ CẢ khi mất message →
  projection thiếu row vĩnh viễn. Bug âm thầm, khó lần.
- **Best-effort**: mọi lỗi (marshal / write) chỉ **LOG rồi return**, KHÔNG trả error, KHÔNG fail
  request — DB đã commit, không để lỗi Kafka làm hỏng flow người dùng.
- Phát SAU khi DB commit và có thể client đã disconnect → dùng `context.WithoutCancel(ctx)` để
  ctx cancel không huỷ việc phát event.
- `Close()` (flush) gọi ở `main.go` khi shutdown.

### Consumer (at-least-once — mẫu `workspace/.../consumer.go`)
- `kafka.NewReader` có `GroupID` (Kafka quản offset + rebalance). Nhiều topic → nhiều Reader cùng
  GroupID, mỗi topic 1 goroutine `Run...` (xem `page` consumer).
- Vòng lặp: `FetchMessage(ctx)` (KHÔNG tự commit như `ReadMessage`) → xử lý → **CHỈ**
  `CommitMessages(ctx, msg)` sau khi xử lý XONG.
- Lỗi tạm thời (DB down) → **retry CHÍNH message này TẠI CHỖ** có backoff (base 500ms → max 30s,
  `backoff *= 2`). **TUYỆT ĐỐI KHÔNG `continue`** sang message kế: kafka-go commit **cumulative**,
  bỏ message lỗi rồi commit message sau sẽ nuốt luôn offset message lỗi → MẤT hẳn.
- **Poison message** (unmarshal envelope/payload lỗi) → retry vô ích → **commit bỏ qua** (mẫu `page`
  bọc `errPoison` = `fmt.Errorf("...: %w: %w", err, errPoison)`, `errors.Is` để skip + commit).
- `ctx.Done()` / `context.Canceled` trong fetch/handle/`time.After(backoff)` → thoát êm, `return nil`.
- **Handler idempotent** (UPSERT `ON CONFLICT ... DO UPDATE`, Remove coi 0-row = OK) → nhận trùng
  do at-least-once vẫn an toàn. Projection table → xem `[[authz-projection]]` + `[[create-migration]]`.

## Wiring main.go
Producer: `events.NewProducer(cfg.Kafka, logger)`, inject vào service, `defer producer.Close()`.
Consumer: `events.NewConsumer(cfg.Kafka, <repos/svc>, logger)`; chạy trong goroutine với
`consumerCtx, consumerCancel := context.WithCancel(...)`, gom lỗi qua `errCh` (buffer = số goroutine),
`defer consumerCancel()` để FetchMessage thoát lúc shutdown. Mẫu: `services/page/cmd/page/main.go`.

## Verify
```
GOWORK=off go -C services/<svc> build ./... && GOWORK=off go -C services/<svc> vet ./...
gofmt -l services/<svc>   # phải rỗng (trừ *.pb.go)
```
Sửa `.proto` (thêm event message) → `cd proto && buf lint && buf generate`, verify `packages/proto-go`
build. Xong gợi ý `/review`.

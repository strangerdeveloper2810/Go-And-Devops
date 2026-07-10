---
name: add-grpc
description: Use when adding an internal gRPC message/RPC to a PM Platform service (e.g. auth AuthService, workspace WorkspaceService) — edits the .proto, runs buf generate, implements the server method mirroring services/auth/internal/server/grpc.go, and wires the caller (gateway) client on the 90xx port.
argument-hint: "<svc> — <RPC/message cần thêm>"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Add gRPC RPC/message

Thêm gRPC theo mô tả: **$ARGUMENTS**. gRPC = kênh nội bộ service↔service (đồng bộ), KHÁC REST
(FE→gateway). Đọc `proto/pm/v1/auth.proto` (mẫu proto) + `services/auth/internal/server/grpc.go`
(mẫu server impl) + `services/api-gateway/internal/middleware/jwt.go` (mẫu client dial) trước.

## Quy tắc BẮT BUỘC
- **Port gRPC = `90xx`** (bảng trong `../CLAUDE.md`: auth 9001, workspace 9002, issue 9003, page
  9004, file 9005). TUYỆT ĐỐI không đụng dải `91xx` (infra: MinIO 9100/9011) — bài học "address
  already in use".
- Proto style bám file hiện có: `package pm.v1;`, field number tăng dần KHÔNG tái sử dụng, message
  `XxxRequest`/`XxxResponse` cho mỗi RPC, `import "google/protobuf/timestamp.proto"` nếu cần time.
- Đây là API nội bộ — public register/login/CRUD vẫn ở REST qua gateway, KHÔNG model ở proto này.
- Server embed `pmv1.UnimplementedXxxServiceServer` (forward-compatible: proto thêm RPC → code cũ
  không vỡ). Lỗi "not found" → `status.Error(codes.NotFound, ...)`; lỗi hệ thống → `codes.Internal`.
  (Ngoại lệ VerifyToken: token sai KHÔNG trả gRPC error mà `Valid:false` để client phân biệt
  token-hết-hạn vs service-lỗi.)
- KHÔNG sửa tay file `*.pb.go` / `*_grpc.pb.go` (sinh tự động, bỏ qua khi gofmt).

## Các bước
1. **Sửa proto** `proto/pm/v1/<svc>.proto`: thêm `rpc Foo(FooRequest) returns (FooResponse);` vào
   block `service XxxService {}`, rồi thêm 2 message request/response.
2. **Generate** (buf remote plugin, out `../packages/proto-go`):
   ```
   cd proto && buf lint && buf generate
   ```
   → sinh/ cập nhật `packages/proto-go/pm/v1/<svc>.pb.go` + `<svc>_grpc.pb.go`. Verify build proto:
   `GOWORK=off go -C packages/proto-go build ./...`.
3. **Implement server** trong `services/<svc>/internal/server/grpc.go` — mirror method của
   `services/auth`: nhận `ctx, req`, gọi `a.svc.<Business>(...)`, map model→proto (dùng
   `timestamppb.New(t)` cho `time.Time`), trả `*pmv1.FooResponse`. Service đã `RegisterXxxServiceServer`
   trong `NewXxxGRPCServer` nên RPC mới tự có (không cần đăng ký lại). Listen cổng `cfg.Server.GRPCPort`.
4. **Client** (bên gọi, vd gateway): mirror `middleware/jwt.go` — 1 lần:
   `conn, _ := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))`
   (`addr` từ config, vd `cfg.Upstream.<Svc>Addr` = `<svc>:90xx`), `client := pmv1.NewXxxServiceClient(conn)`;
   mỗi request: `ctx, cancel := context.WithTimeout(..., 3*time.Second)` rồi `client.Foo(ctx, &pmv1.FooRequest{...})`.
   Thêm field addr vào `UpstreamConfig` nếu chưa có.

## Verify (bắt buộc trước khi claim xong)
```
cd proto && buf lint
GOWORK=off go -C packages/proto-go build ./...
GOWORK=off go -C services/<svc> build ./... && GOWORK=off go -C services/<svc> vet ./...
```
Nếu đổi go.mod (dep mới): `GOWORK=off go -C services/<svc> mod tidy` rồi `go work sync`. Xong gợi ý `/review`.

# CLAUDE.md — PM Platform

Guide cho **agentic coding** (hybrid: agent generate + người code tay). Đọc file này trước khi
sửa code. Mục tiêu: agent và người tạo ra code **cùng một convention**. Comment tiếng Việt cho
domain/business logic, tiếng Anh cho boilerplate — theo đúng codebase.

> Ngoài file này, có `services/CLAUDE.md` (backend Go) và `web/CLAUDE.md` (frontend) tự nạp khi
> làm trong thư mục tương ứng. Slash command trong `.claude/commands/`, subagent trong `.claude/agents/`.

## Sản phẩm
PM Platform = **Jira + Confluence + AI/MCP** nội bộ (thay Jira+Confluence subscription). Microservices,
event-driven. Design: `docs/plans/2026-05-24-pm-platform-design.md`.

## Kiến trúc
```
FE (React) ──REST──► api-gateway ──(reverse proxy + gRPC verify)──► services
                          │  JWTAuth verify token qua auth gRPC, inject X-User-ID / X-User-Email
                          ▼
  auth · workspace · issue · page · file   ──(Kafka events, EventEnvelope)──►  (loose coupling)
  1 Postgres, MỖI service 1 schema riêng (auth./workspace./issue./page./file.). MinIO cho file.
```
- **Không service nào query cross-schema.** Cần data service khác → gRPC (đồng bộ) hoặc **local
  projection** build từ Kafka events (bất đồng bộ, dùng cho authz).
- Gateway là điểm vào REST duy nhất cho FE; nó verify JWT rồi set header `X-User-ID` (int64) +
  `X-User-Email` → service tin danh tính này (không tự verify JWT, không đọc identity từ body).

### Services (stack + cổng)
| Service | Stack | HTTP | gRPC | Schema | Vai trò |
|---|---|---|---|---|---|
| api-gateway | Go/Gin | 8000 | 9000 | (Redis) | REST in, proxy + gRPC out |
| auth | Go/Gin | 8001 | 9001 | `auth` | register/login (JWT), user-directory, VerifyToken |
| workspace | Go/Gin | 8002 | 9002 | `workspace` | workspaces/projects/members/roles |
| issue | **Java/Spring** | 8003 | 9003 | `issue` | Jira core: issues/workflow/sprint/board |
| page | Go/Gin | 8004 | 9004 | `page` | Confluence: spaces/pages |
| file | Go | 8005 | 9005 | `file` | upload/download qua MinIO |

**Port scheme:** service HTTP `80xx`, gRPC `90xx`. **Hạ tầng (docker) để ở `91xx`** (MinIO S3
`9100`, console `9011`) — KHÔNG đụng dải gRPC service (bài học: minio 9000/9001 từng đụng
gateway/auth gRPC → "address already in use").

## Layout
```
services/<svc>/          # mỗi service 1 Go module (go.mod riêng) hoặc Maven (issue)
  cmd/<svc>/main.go       internal/{config,database,observability,middleware,model,repository,service,handler,server,events}
  migrations/*.up.sql     # golang-migrate style (Go); issue dùng Flyway
packages/proto-go/        # code Go sinh từ proto (buf generate)
proto/pm/v1/*.proto       # nguồn proto (buf)
infra/dev/docker-compose.yml   # postgres + kafka + minio (+ redis/es...)
scripts/*-integration-smoke.sh # E2E smoke (chạy tay)
docs/plans/               # design + implementation plans
.github/workflows/backend-ci.yml
```

## Lệnh hay dùng
```bash
# Build/test 1 Go module ở MODULE-MODE (như CI/prod — go.work chỉ để dev):
GOWORK=off go -C services/<svc> build ./...
GOWORK=off go -C services/<svc> vet ./...
gofmt -l services/<svc>            # phải rỗng (trừ *.pb.go)
go -C services/<svc> test ./...

# Java issue-service:
JAVA_HOME=/opt/homebrew/opt/openjdk@17 mvn -f services/issue/pom.xml -DskipTests package

# Proto (sau khi sửa .proto): cd proto && buf lint && buf generate
# Hạ tầng dev: docker compose -f infra/dev/docker-compose.yml up -d postgres kafka minio
# E2E smoke (cần hạ tầng): bash scripts/page-integration-smoke.sh   (xem web/ để env)
```
> Runtime dev: khuyến nghị **OrbStack** thay Docker Desktop (nhẹ + ổn định hơn trên macOS).

## Patterns BẮT BUỘC theo (để hybrid nhất quán)

**Thêm Go service mới** → **mirror `services/workspace`**: copy verbatim
`internal/{database,observability,middleware}` (chỉ đổi import path); `config.go` theo mẫu (env
prefix `PM_<SVC>`, `v.BindEnv("database.url")`, ports); thêm module vào root `go.work`. Xem
`.claude/commands/new-service.md`.

**Layer**: `handler` (gin, bind+validate, map sentinel error→HTTP) → `service` (business + authz,
sentinel errors `ErrNotFound/ErrNotMember/ErrConflict`) → `repository` (interface + `postgre*`
struct trả interface; `$1` placeholder; `QueryRowContext/QueryContext`; `defer rows.Close()`;
`rows.Err()`). DI qua constructor; `main.go` wire `db→repo→service→handler→server`.

**Gateway proxy** (thêm service vào gateway): đăng ký **CẢ route trần LẪN catch-all**
(`/x` + `/x/*proxyPath`) trong nhóm **protected** — nếu chỉ catch-all, gin `RedirectTrailingSlash`
sẽ 301 path trần TRƯỚC khi JWTAuth chạy (lộ redirect + bỏ auth). Xem `services/api-gateway/internal/server/http.go`.

**Kafka**:
- Event bọc `common.EventEnvelope{event_type, workspace_id, actor_id, payload}` (payload =
  proto.Marshal message cụ thể). Topic nhiều loại event → dispatch theo `event_type`.
  (Ngoại lệ: `auth.user.events` gửi raw `UserCreatedEvent`, không envelope — có sẵn từ trước.)
- **Producer**: `RequiredAcks: RequireAll` (struct-literal mặc định `RequireNone`=acks 0 → mất
  event âm thầm!). Best-effort: log lỗi, KHÔNG fail request. Dùng `context.WithoutCancel(ctx)`
  khi phát sau khi DB đã commit (client disconnect không được hủy event).
- **Consumer** (at-least-once): `FetchMessage` + `CommitMessages` THỦ CÔNG sau khi xử lý xong.
  Lỗi tạm thời → **retry tại chỗ có backoff**, KHÔNG `continue` (kafka-go commit **cumulative** →
  bỏ qua message lỗi rồi commit message sau sẽ MẤT nó). Poison message (unmarshal lỗi) → commit bỏ qua.
  Handler phải **idempotent** (upsert). Mẫu chuẩn: `services/workspace/internal/events/consumer.go`.

**Authz event-driven**: service scope theo workspace/project consume `workspace.events` +
`auth.user.events` → build `*_projection` tables (members/projects/users) → check membership LOCAL.
Mọi endpoint scope-theo-workspace phải assert membership; mutate cần đúng role (owner).

**Migration**: `CREATE SCHEMA IF NOT EXISTS <svc>;` tables schema-qualified; **partial unique
index** `WHERE deleted_at IS NULL` cho cột unique có soft-delete (khớp filter đọc); mọi thứ
`IF NOT EXISTS` (idempotent). Cross-service ref (user_id, workspace_id) **KHÔNG** hard FK (tránh
chặn write vì projection trễ).

## Lessons (rule rút từ audit — TUÂN THỦ)
1. **Soft-delete**: mọi read filter `WHERE deleted_at IS NULL`; JOIN sang bảng cha cũng filter (member của workspace đã xoá = không phải member).
2. **Key global-unique kiểu Jira**: project key / space key duy nhất TOÀN HỆ THỐNG (không chỉ per-workspace) → issue/page key `<KEY>-<n>` mới không nhập nhằng khi tra `/issues/{key}`.
3. **IDOR**: read/download resource theo id phải check owner/membership (đừng để "bất kỳ user auth nào đọc file/issue người khác").
4. **Optimistic locking** cho update đồng thời (JPA `@Version` / cột version) → 409 thay vì lost-update.
5. **Upload**: giới hạn size (MaxBytesReader), dọn temp file; server timeout đủ lớn cho file lớn.
6. **KHÔNG hardcode secret** trong code/script commit (dev placeholder cũng bị GitGuardian flag) — nạp từ `.env`/`.env.example` runtime.

## Testing
- **Ưu tiên integration test** per-service (repo/service test với Postgres testcontainer; Java
  `@DataJpaTest`/Testcontainers) — rẻ, focus. Đặt cạnh code (`*_test.go`, `src/test`).
- **Full E2E** (`scripts/*-integration-smoke.sh`, nhiều service + Kafka) ĐẮT + flaky timing → chỉ
  chạy **tay** (`workflow_dispatch` trong CI, hoặc local). Không gate mỗi PR.

## CI (`.github/workflows/backend-ci.yml`)
Mỗi PR: matrix động Go module (gofmt+vet+build+`test -race`, module-mode) + `golangci-lint`
(advisory) + `buf lint` + Java `mvn verify`. E2E là job **manual**. Code phải pass
`GOWORK=off -mod=readonly build+vet` + `gofmt` trước khi push (go.work che khuất → chạy check thật).

## Cách làm việc hybrid (agent + người)
- **Agent** khi thêm feature: bám patterns trên, tự verify build/gofmt module-mode, viết comment
  tiếng Việt domain / Anh boilerplate. Sau việc lớn → review đối kháng (agent `go-reviewer` /
  `/review`) + verify trước khi claim xong.
- **Người**: dùng `.claude/commands/` (vd `/new-service`, `/add-endpoint`, `/e2e`) làm scaffold rồi
  chỉnh tay. Sửa file này khi convention thay đổi.
- Việc lớn/nhiều nhánh độc lập → dùng git worktree (`.claude/worktrees/`, đã gitignore) + PR draft.

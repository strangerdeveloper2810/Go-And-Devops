# Workspace Service — Implementation Plan

Reference design: `2026-07-09-workspace-service-design.md`.
**Golden rule for every phase:** mirror `services/auth` patterns exactly, adapt to
workspace domain. Read the corresponding auth file before writing. Keep Vietnamese
comments on domain/business logic; English on copied boilerplate.

Constants (use verbatim):
- Go module: `github.com/pm-platform/workspace`
- Env prefix: `PM_WORKSPACE`; HTTP port 8002, gRPC port 9002
- DB schema: `workspace`; DSN via `PM_WORKSPACE_DATABASE_URL`
- Kafka: brokers `PM_WORKSPACE_KAFKA_BROKERS` (default `localhost:9094`), topic
  `auth.user.events`, consumer group `workspace-service`
- Headers from gateway: `X-User-ID` (int64 string), `X-User-Email`
- Kafka client: `github.com/segmentio/kafka-go`

---

## Phase A — Scaffold + boilerplate
Files: `services/workspace/{go.mod,Makefile,.env.example,.gitignore}`,
`internal/{config,database,observability,middleware}/*`.
- go.mod: module path above, `go 1.25`, `replace github.com/pm-platform/proto-go => ../../packages/proto-go`.
- Copy `internal/database/postgres.go`, `internal/observability/*`, `internal/middleware/{request_id,logger,metrics,recovery}.go` from auth verbatim (only change import path `auth`→`workspace`).
- `internal/config/config.go`: mirror auth's, BUT: no JWT struct; ADD `KafkaConfig{Brokers []string, UserEventsTopic string, ConsumerGroup string}`. Ports default 8002/9002. **Include `v.BindEnv("database.url")`** (the auth runtime bug). Kafka defaults: brokers `["localhost:9094"]`, topic `auth.user.events`, group `workspace-service`.
- Add `./services/workspace` to root `go.work` `use(...)`.
- `.env.example` + `.env` (gitignored) with `PM_WORKSPACE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/pmdb?sslmode=disable`, ports, `PM_WORKSPACE_KAFKA_BROKERS=localhost:9094`.
- Verify: `go build ./internal/...` (config/db/observability/middleware compile).

## Phase B — Proto
Files: `proto/pm/v1/workspace.proto` (new), append to `proto/pm/v1/auth.proto`.
- `workspace.proto`: package `pm.v1`, same options as auth.proto. Define messages `Workspace{id,slug,name,owner_id,plan,created_at}`, `Project{id,workspace_id,key,name,lead_id}`, `Member{user_id,workspace_id,role,joined_at}`, `Role{id,name,is_system}`; service `WorkspaceService{ GetWorkspace, ListWorkspaces(user_id), CheckMembership(workspace_id,user_id)→(is_member,role) }` with request/response messages. Reuse `common.proto` PageResponse where useful.
- `auth.proto`: add `message UserCreatedEvent { int64 user_id=1; string email=2; string name=3; string avatar_url=4; }` (produced by auth, consumed by workspace).
- Run `cd proto && buf generate`. Verify `packages/proto-go` builds and `pmv1.WorkspaceServiceServer`, `pmv1.NewWorkspaceServiceClient`, `pmv1.UserCreatedEvent` exist.

## Phase C — Migration + Models
Files: `services/workspace/migrations/001_create_workspace_schema.{up,down}.sql`, `internal/model/*.go`.
- Migration: `CREATE SCHEMA IF NOT EXISTS workspace;` then tables per design §3 (users projection with id as plain BIGINT PK — NOT serial; workspaces, roles, workspace_members, projects). Seed system roles `owner`,`member` (workspace_id NULL, is_system true). Indexes on FKs + `workspaces.slug`, `workspaces.owner_id`. down.sql: `DROP SCHEMA workspace CASCADE;`.
- Models: `Workspace, Project, Member, Role, User` structs with json + matching fields. Nullable → pointer or sql.Null* / `*time.Time` for deleted_at. Status/plan as string consts.

## Phase D — Repository
File: `internal/repository/*.go` (one file per aggregate or a grouped file). Mirror auth repo (context-first, `$1` placeholders, `QueryRowContext`/`QueryContext`, `defer rows.Close()`, `rows.Err()`, soft delete via `deleted_at`). Interfaces + `postgres*Repository` structs + constructors returning interface.
- WorkspaceRepository: Create, GetByID, GetBySlug, ListByMember(userID), Update, SoftDelete.
- MemberRepository: Add, ListByWorkspace, Get(ws,user), Remove.
- ProjectRepository: Create, ListByWorkspace.
- RoleRepository: ListByWorkspace (system + custom), GetByName.
- UserRepository (projection): Upsert(id,email,name,avatar), GetByID.
- Verify `go build ./internal/repository/`.

## Phase E — Service
File: `internal/service/*.go`. Business logic + authz helpers.
- `CreateWorkspace(ctx, ownerID, name)`: gen slug from name (+ dedupe suffix), insert workspace, add owner as member with role `owner`. Transaction if practical (use `*sql.DB` Begin/Commit).
- `ListMyWorkspaces(ctx, userID)`, `GetWorkspace(ctx, userID, id)` (assert membership), `UpdateWorkspace`/`DeleteWorkspace` (assert owner).
- Members: `AddMember(ctx, actorID, wsID, targetUserID, roleName)` (actor must be owner), `ListMembers`, `RemoveMember` (owner only).
- Projects: `CreateProject`, `ListProjects` (member).
- Roles: `ListRoles`.
- `EnsureUserAndDefaultWorkspace(ctx, user)`: called by Kafka consumer — upsert user projection + create default workspace if none (idempotent, slug `u-<id>-default`).
- Errors: sentinel-style (`ErrNotMember`, `ErrNotOwner`, `ErrNotFound`) so handler maps to HTTP status. Verify build.

## Phase F — Handler + HTTP server + RequireUser middleware
Files: `internal/handler/*.go`, `internal/server/http.go`, `internal/middleware/user.go`.
- `middleware/user.go`: `RequireUser()` reads `X-User-ID` header → parse int64 → `c.Set("user_id", ...)`; 401 if missing/invalid. Helper `middleware.UserID(c) int64`.
- Handlers: Gin, `ShouldBindJSON` + binding tags, request structs, map service sentinel errors → 400/403/404/409. Reuse errorBody pattern from auth handler.
- `server/http.go`: mirror auth — middleware stack + `/health /ready /metrics`, then `r.Group("/api/v1/workspaces")` with `RequireUser()`, all routes per design §4. Constructor `NewHTTPServer(cfg, logger, metrics, wsHandler)`.
- Verify build of handler + server packages.

## Phase G — gRPC server + main.go (full wire)
Files: `internal/server/grpc.go`, `cmd/workspace/main.go`.
- `grpc.go`: mirror auth `AuthGRPCServer` → `WorkspaceGRPCServer` embedding `pmv1.UnimplementedWorkspaceServiceServer`, health + reflection. Implement GetWorkspace, ListWorkspaces, CheckMembership by calling service. Map domain proto ↔ model.
- `main.go`: mirror auth — config→db→repos→services→handler→http+grpc, graceful shutdown. (Kafka consumer wired in Phase H.)
- Verify `go build ./...` for workspace module passes fully.

## Phase H — Kafka: consumer (workspace) + producer (auth)
Files: `services/workspace/internal/events/consumer.go`, wire in `cmd/workspace/main.go`; `services/auth/internal/events/producer.go`, wire in auth register path (`service/auth.go` Register or handler) + auth `main.go` + auth config (`KafkaConfig`, `PM_AUTH_KAFKA_BROKERS`).
- Producer (auth): `kafka.Writer` to topic `auth.user.events`, key=user_id bytes, value = `proto.Marshal(&pmv1.UserCreatedEvent{...})`. Emit after successful `repo.Create` in Register. Non-fatal on error (log; don't fail registration) — at-least-once best effort.
- Consumer (workspace): `kafka.Reader` (GroupID `workspace-service`), loop `ReadMessage`, `proto.Unmarshal` → `UserCreatedEvent` → `service.EnsureUserAndDefaultWorkspace`. Run in a goroutine from main.go, stop on shutdown context.
- Add `segmentio/kafka-go` + `google.golang.org/protobuf` to both go.mods (`go mod tidy`).
- Verify both modules `go build ./...`.

## Phase I — Gateway integration
File: `services/api-gateway/internal/middleware/jwt.go`, `internal/server/http.go`, `internal/config/config.go`, `.env.example`.
- `jwt.go` JWTAuth: after successful verify, also set request headers `c.Request.Header.Set("X-User-ID", strconv.FormatInt(resp.UserId,10))` and `X-User-Email` so proxied upstream receives identity.
- config: add `Upstream.WorkspaceHTTPAddr` (default `workspace-service:8002`).
- `http.go`: under the **protected** group (so JWTAuth runs), add reverse proxy `/api/v1/workspaces/*proxyPath` → workspace HTTP. (Same httputil pattern as auth proxy, but protected.)
- Verify gateway `go build ./...`.

## Phase J — Integration test (end-to-end)
- Bring up Postgres + Kafka: `docker compose -f infra/dev/docker-compose.yml up -d postgres kafka`.
- Apply auth migration (if fresh) + workspace migration to `pmdb`.
- Run auth (8001/9001, with `PM_AUTH_KAFKA_BROKERS=localhost:9094`), workspace (8002/9002), gateway (8000/9000, upstream workspace http `localhost:8002`).
- Test: register via gateway → (Kafka) workspace auto-creates default workspace + user projection; login → token; `POST /api/v1/workspaces` (X-User-ID injected) create → 201; `GET /api/v1/workspaces` lists default + new; add member; create project; gRPC CheckMembership. Report pass/fail per step. Clean up processes (leave infra).

---

Commit strategy: one commit per logical group is fine, but a single
`feat(workspace): full workspace service with Kafka user.created integration`
after integration passes is acceptable for this learning repo.

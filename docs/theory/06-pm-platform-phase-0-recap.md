# PM Platform — Phase 0 Foundation Recap

> Ghi chép lại những gì đã làm + học trong session ngày 2026-05-24/25.
> Phase 0 mục tiêu: setup foundation cho 14 microservice trước khi viết business logic.

---

## Bối cảnh

Project pivot từ "Poor Man's Vercel" (đã hoàn thành Phase 1 + 2 + JWT) sang **PM Platform** = Jira + Confluence + AI/MCP clone, vận hành nội bộ team thật, target pv mid-senior Go/microservice Q3 2026.

Design doc: `docs/plans/2026-05-24-pm-platform-design.md` (9 sections, 14 services).

Learning curriculum: `docs/plans/2026-01-10-devops-learning-curriculum.md` (đã rewrite cho PM Platform).

---

## Phase 0 progress (5/N steps đã làm)

| Step | Title | Commit | Files |
|---|---|---|---|
| 1 | Monorepo foundation | `75a8d80` | Turborepo, pnpm-workspace, folder layout |
| 2 | Infra dev compose | `4e0e5f8` | 16 containers, 3 profiles (core/observability/dev-tools) |
| 2.5 | Refactor monitoring → shared/ | `aa82dec` | Move config từ prod/ sang shared/ |
| 3 | Postgres schemas | `6f5fbdc` | 9 schemas + per-service users + grants |
| 4 | Proto setup | `78331bc` | Buf + common.proto + auth.proto + Go gen |
| 5 | api-gateway scaffold | `01911c1` | Service Go đầu tiên + convention template |

---

## Step 1 — Monorepo Foundation

### Mục tiêu

Setup khung monorepo cho 14 service + 1 FE + shared packages, không code service.

### Quyết định kỹ thuật

- **Monorepo tool**: Turborepo (đơn giản hơn Nx, đủ cho polyglot)
- **Package manager**: pnpm 10 (workspace, save disk space)
- **Folder split**: `apps/` (user-facing) + `services/` (backend) + `packages/` (shared TS) + `proto/` + `infra/{dev,prod,shared}` + `docs/`

### Khái niệm mới

**Turborepo task pipeline** (`turbo.json`):
- `dependsOn: ["^build"]` = build dependency packages trước
- `outputs` = path turbo cache để skip nếu input không đổi
- `globalDependencies` = file thay đổi → invalidate toàn bộ cache
- `dev: persistent: true` = task không tự exit

**`packageManager` field trong package.json**: Node Corepack tự dùng đúng phiên bản → tránh "works on my machine" do pnpm version khác.

**`.gitkeep` placeholder**: git không track empty dir → đặt file 0-byte để commit structure.

### Files quan trọng

```
package.json                         # Workspace root, scripts gọi turbo
pnpm-workspace.yaml                  # apps/*, packages/*, services/collab-server
turbo.json                           # Task pipeline
.gitignore                           # Mở rộng cho Go/Java/Node
.nvmrc                               # Pin Node 22
```

---

## Step 2 — Infra Dev Stack

### Mục tiêu

Docker compose chạy mọi backing service local cho dev.

### Quyết định kỹ thuật

- **Docker Compose Profile** để bật/tắt service nặng theo task
- **Core (always on)**: 8 containers (Postgres, Redis, Kafka, Schema Registry, Elasticsearch, MinIO, Traefik, MailHog)
- **observability profile**: 5 containers (Prometheus, Grafana, Loki, Tempo, OTel Collector)
- **dev-tools profile**: 3 containers (Adminer, Kafka UI, Redis Insight)
- **Monitoring config** chia chung `infra/shared/monitoring/` (dev + prod đều mount)

### Khái niệm mới

**Kafka KRaft mode**:
- Kafka 3.5+ bỏ Zookeeper → 1 process vừa làm `broker` vừa làm `controller`
- Cần `CLUSTER_ID` (UUID base64-url 22 char) sinh bằng `kafka-storage.sh random-uuid`
- Config: `KAFKA_PROCESS_ROLES=broker,controller`, `KAFKA_CONTROLLER_QUORUM_VOTERS=1@kafka:9093`

**Kafka Listener vs Advertised Listener**:
- Listener = port broker listen
- Advertised Listener = address broker trả về cho client khi connect
- 3 endpoint thường dùng:
  - `PLAINTEXT://kafka:9092` (container ↔ container)
  - `CONTROLLER://kafka:9093` (KRaft consensus, internal)
  - `EXTERNAL://localhost:9094` (host machine ↔ broker)

**pgvector**: extension Postgres cho vector similarity search, bật bằng `CREATE EXTENSION vector`. Hỗ trợ ANN index HNSW + IVFFlat, distance operator `<->` (L2), `<=>` (cosine), `<#>` (inner product).

**Init scripts pattern** (`/docker-entrypoint-initdb.d/`):
- Postgres image chỉ chạy mọi `*.sh` / `*.sql` trong dir này 1 lần duy nhất khi volume rỗng
- Reset = `docker compose down -v && up -d`
- Order = alphabetical (đặt prefix `00-`, `01-`, ...)

**OTel Collector pattern**:
```
Service → OTLP → otel-collector → fan-out:
                                  ├─ traces → Tempo
                                  ├─ logs → Loki
                                  └─ metrics → Prometheus (remote write)
```
Service chỉ biết 1 endpoint (collector). Đổi backend không sửa service.

**Prometheus remote_write**: Tempo/OTel ship metrics qua HTTP POST tới Prometheus. Bật bằng flag `--web.enable-remote-write-receiver`.

### Lệnh dùng được

```bash
cd infra/dev
cp .env.example .env
docker compose up -d                                # Core only
docker compose --profile observability up -d        # + monitoring
docker compose --profile dev-tools up -d            # + GUI
docker compose --profile observability --profile dev-tools up -d  # All
docker compose ps                                   # Status
docker compose logs -f kafka                        # Logs
docker compose down                                 # Stop
docker compose down -v                              # Stop + xoá volume (reset)
```

### Endpoints

| Service | URL |
|---|---|
| Postgres | `localhost:5432` (postgres/postgres) |
| Redis | `localhost:6379` (pwd: redis) |
| Kafka external | `localhost:9094` |
| Schema Registry | http://localhost:8081 |
| Elasticsearch | http://localhost:9200 |
| MinIO API / Console | http://localhost:9000 / http://localhost:9001 |
| Traefik Dashboard | http://localhost:8088 |
| MailHog | http://localhost:8025 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin/admin) |
| Adminer | http://localhost:8082 |
| Kafka UI | http://localhost:8083 |
| Redis Insight | http://localhost:8084 |

---

## Step 3 — Postgres Schemas

### Mục tiêu

Tạo 9 empty schemas + per-service users + grants. Tables KHÔNG tạo ở init, mà do mỗi service own qua migrations.

### Quyết định kỹ thuật

- **Schema-per-service** (không phải DB-per-service): 1 Postgres instance, mỗi service 1 schema riêng + 1 DB user riêng (chỉ access schema mình)
- **Least-privilege**: service `auth` chỉ access schema `auth`, không "trộm" được data sang schema khác
- **Idempotent SQL**: `CREATE SCHEMA IF NOT EXISTS` → safe re-run
- **`search_path` per role**: `ALTER ROLE auth_user SET search_path = auth, public` → service query không cần prefix `auth.`

### Pattern microservice quan trọng

**KHÔNG tạo bảng ở init-scripts**. Lý do:

| Concern | Init script | Service migration |
|---|---|---|
| Khi chạy | 1 lần lúc volume rỗng | Mỗi lần service deploy |
| Ai own | Infra | Service team |
| Schema evolution | Phải reset DB | Forward migration |
| Track version | Không | Migration table |
| Rollback | Không | Có (down migration) |

→ Init = setup namespace + permission. Service migration = own table lifecycle (golang-migrate / Flyway).

### Khái niệm mới

**`ALTER DEFAULT PRIVILEGES`** — khi `auth_user` tạo bảng mới trong schema `auth`, mặc định ai có quyền gì. Set 1 lần để mọi table tương lai tự inherit grant, không phải GRANT từng cái.

**Connection string format**:
```
postgres://<user>:<password>@<host>:<port>/<database>?sslmode=disable
postgres://auth_user:auth_pwd_dev@postgres:5432/pmdb?sslmode=disable
```

### Files quan trọng

```
infra/shared/postgres/schemas/
├── 001_auth.sql               # CREATE SCHEMA auth + grants
├── 002_workspace.sql
├── 003_issue.sql
├── 004_page.sql
├── 005_file.sql
├── 006_ai.sql
├── 007_notification.sql
├── 008_report.sql
└── 009_audit.sql

infra/dev/postgres/init-scripts/
├── 00-init.sh                 # Extensions + 9 users
└── 01-load-schemas.sh         # psql apply shared/schemas/*.sql
```

### Verify

```bash
docker exec -it pm-postgres psql -U postgres -d pmdb -c "\dn"
# Liệt kê 10 schemas (9 service + public)

docker exec -it pm-postgres psql -U auth_user -d pmdb -c "SHOW search_path;"
# Output: auth, public
```

---

## Step 4 — Proto Setup

### Mục tiêu

Setup Protobuf schemas + Buf toolchain + Go codegen. Java + TS gen defer phase sau.

### Quyết định kỹ thuật

- **Buf** thay raw `protoc` (modern wrapper, remote plugins qua Buf BSR, lint built-in)
- **Generated Go code → `packages/proto-go/`** (Go module riêng, services import qua replace directive)
- **Java + TS gen comment lại** trong `buf.gen.yaml`, bật khi cần

### Khái niệm mới

**Buf vs raw protoc**:
- 1 file `buf.yaml` thay chục flag
- Remote plugin qua Buf BSR (không cần cài `protoc-gen-go` local)
- Built-in lint + breaking change detection
- `paths=source_relative` = giữ folder structure như proto source

**`option go_package`** — bắt buộc cho Go gen:
```protobuf
option go_package = "github.com/pm-platform/proto-go/pm/v1;pmv1";
//                  └─ import path ─────────────────────┘ └ package name
```

**RPC response wrapper convention** — Buf STANDARD lint yêu cầu mọi RPC return `<MethodName>Response` chứ không return entity trực tiếp:
```protobuf
// ❌ rpc GetUser(GetUserRequest) returns (User);
// ✅ rpc GetUser(GetUserRequest) returns (GetUserResponse);
message GetUserResponse { User user = 1; }
```
Lý do: thêm field vào response sau (vd `Permission perms = 2;`) không break wire format.

**EventEnvelope pattern** — mọi event Kafka wrap trong envelope chung:
```protobuf
message EventEnvelope {
  string event_id = 1;
  string event_type = 2;       // 'issue.created', 'page.updated'
  string event_version = 3;
  int64  workspace_id = 4;     // Partition key
  int64  actor_id = 5;
  google.protobuf.Timestamp occurred_at = 6;
  string trace_id = 7;
  bytes  payload = 8;          // Service-specific message serialized
  map<string, string> metadata = 9;
}
```
Payload = `bytes` (serialize message khác). Consumer dispatch theo `event_type`. Cho phép cross-cutting fields không phải lặp.

**Schema evolution rules** (`breaking: use: WIRE_JSON`):
- ✅ Thêm field optional với tag mới
- ✅ Đổi tên field (wire dùng tag number)
- ❌ Đổi type field (string → int)
- ❌ Reuse tag number của field đã xoá
- ❌ Đổi `repeated` → scalar

### Generated code structure

`auth_grpc.pb.go` sinh ra:
```go
type AuthServiceServer interface {
    VerifyToken(context.Context, *VerifyTokenRequest) (*VerifyTokenResponse, error)
    GetUser(context.Context, *GetUserRequest) (*GetUserResponse, error)
    ListUsers(context.Context, *ListUsersRequest) (*ListUsersResponse, error)
}
type AuthServiceClient interface { ... }
func RegisterAuthServiceServer(s *grpc.Server, srv AuthServiceServer)
```

### Lệnh

```bash
pnpm proto:lint                 # = cd proto && buf lint
pnpm proto:gen                  # = cd proto && buf generate
cd packages/proto-go && go build ./...
```

---

## Step 5 — api-gateway Scaffold

### Mục tiêu

Setup convention cho 1 Go service hoàn chỉnh. 7 service Go còn lại sẽ copy template này.

### Stack chốt cho Go service

| Concern | Lib |
|---|---|
| HTTP | gin-gonic/gin |
| gRPC | google.golang.org/grpc + reflection + health protocol |
| Config | spf13/viper |
| Logging | stdlib `log/slog` JSON |
| Tracing | go.opentelemetry.io/otel + OTLP gRPC exporter |
| Metrics | prometheus/client_golang |
| UUID | google/uuid |
| HTTP→Trace bridge | otel-go contrib `otelgin` |

### Folder template (sẽ copy cho 7 service Go khác)

```
services/<svc>/
├── cmd/<svc>/main.go               # Wiring, signal handler, graceful shutdown
├── internal/
│   ├── config/                     # Viper config
│   ├── observability/              # slog + OTel trace + Prometheus metric
│   ├── server/
│   │   ├── http.go                 # Gin HTTP
│   │   └── grpc.go                 # gRPC + health
│   ├── handler/                    # Handlers
│   ├── middleware/                 # RequestID, Logger, Recovery, Metrics
│   └── client/                     # gRPC clients tới service khác
├── Dockerfile                      # Multi-stage, alpine, non-root, HEALTHCHECK
├── .dockerignore
├── Makefile                        # run, build, test, tidy, docker-build, docker-run
├── .env.example                    # Env vars prefix PM_<SVC>_*
├── go.mod                          # Replace proto-go local
└── go.sum
```

### Middleware order (matter!)

```
RequestID → otelgin → Logger → Metrics → Recovery → handler
```

- **RequestID** first vì các middleware sau cần log/trace với ID
- **otelgin** trước Logger vì Logger gắn trace_id từ span
- **Recovery** trước handler để catch panic

### Khái niệm mới

**Go Workspace (`go.work`)**:
- Go 1.18+ multi-module
- Khai báo các module local, IDE + `go build` resolve cross-module qua workspace
- Dev tool, không phải prod
- Production build từng service không thấy `go.work` → fallback `replace` directive trong `go.mod`

**Liveness vs Readiness**:
- **Liveness** (`/health`): "process còn sống không?" → restart container nếu fail
- **Readiness** (`/ready`): "có sẵn sàng nhận traffic chưa?" → load balancer thêm/bỏ instance khỏi pool

Khác biệt:
- Service mới boot, deps chưa connect → liveness OK, readiness FAIL
- Database tạm sập → liveness OK, readiness FAIL → traffic redirect, không restart
- Goroutine deadlock → liveness FAIL → restart

**gRPC standard health protocol** (`grpc_health_v1`):
- Service implement `Check(HealthCheckRequest) (HealthCheckResponse, error)`
- Kubernetes có `grpc_health_probe` tool tự dùng protocol này
- Trả status `SERVING` / `NOT_SERVING` / `UNKNOWN`

**gRPC Reflection**:
- Cho phép client (`grpcurl`, Postman) introspect service không cần .proto file
- Chỉ bật dev/staging, **tắt prod** (security)

**Graceful shutdown pattern**:
```go
sigCh := make(chan os.Signal, 1)
signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
<-sigCh                                            // Block tới signal
ctx, cancel := context.WithTimeout(..., 30*time.Second)
defer cancel()
httpSrv.Shutdown(ctx)                              // Drain HTTP
grpcSrv.GracefulStop()                             // Drain gRPC
// Cleanup: close DB, flush logs, flush tracer
```

**Viper config pattern**:
```go
v.SetEnvPrefix("PM_API_GATEWAY")
v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
v.AutomaticEnv()
// → struct field Server.HTTPPort tương ứng env PM_API_GATEWAY_SERVER_HTTP_PORT
```

**OTel trace propagation**:
- W3C `traceparent` header tự inject qua HTTP/gRPC khi setup `propagation.TraceContext{}`
- 1 trace = full path: FE → gateway → service → DB
- Span structure tự dispatch tới Tempo qua OTLP gRPC

**Multi-stage Dockerfile + build context**:
```bash
docker build -f services/api-gateway/Dockerfile -t pm-api-gateway:dev .
#            └ Dockerfile path ────────────────┘                  └ context = repo root
```
Context = `.` = repo root → cho phép COPY `packages/proto-go/` + `services/api-gateway/` cùng lúc.

### Validate run output

```
INFO starting api-gateway env=dev http_port=8000 grpc_port=9000
INFO http server listening addr=:8000
INFO grpc server listening addr=[::]:9000

GET /health   → {"status":"alive"}
GET /ready    → {"deps":{},"status":"ready"}
GET /api/v1/ping → {"pong":true}
GET /metrics  → # HELP go_gc_duration_seconds ...

SIGTERM → graceful shutdown OK
```

### Lệnh dùng được

```bash
cd services/api-gateway
cp .env.example .env

# Local dev
make run                 # go run với .env load

# Build binary
make build               # → bin/api-gateway

# Test
make test                # go test -race -cover

# Docker
make docker-build        # context = repo root
make docker-run

# Tidy deps
make tidy                # go mod tidy + go work sync

# Verify
curl localhost:8000/health
curl localhost:8000/api/v1/ping
curl localhost:8000/metrics | head -20
```

---

## Architecture decisions log

Quyết định đã chốt trong session này:

| # | Decision | Rationale |
|---|---|---|
| 1 | 14 services from start (Go 8 + Java 5 + Node 1) | Match design doc, learn microservice depth |
| 2 | Monorepo Turborepo | Đơn giản hơn Nx cho polyglot |
| 3 | Schema-per-service Postgres | Tiết kiệm resource, vẫn isolated qua user permission |
| 4 | Yjs collab edit từ phase 1 (Hocuspocus) | Retrofit sau = đập viết lại editor |
| 5 | Traefik + custom Go gateway | Học architecture, không lock-in Kong/Lua |
| 6 | Kafka KRaft (no Zookeeper) | Modern, nhẹ hơn |
| 7 | Postgres FTS phase 1 → Elasticsearch phase 3 | Cắt gọn MVP, demo migration story |
| 8 | pgvector (không Pinecone) | Tiết kiệm infra, đủ 1-10M vector |
| 9 | Dev local 5-6 tháng → deploy VPS 4GB lúc gần xong | Avoid VPS resource constraint sớm |
| 10 | E2E test out of MVP scope | Đỡ scope, unit + integration đủ pv |
| 11 | Microservice từ đầu (không monolith → tách) | Mục tiêu pv, không tối ưu time-to-market |
| 12 | Viper for config | Industry standard, pv recognition |
| 13 | Buf cho protobuf | Modern hơn raw protoc, remote plugin |
| 14 | Generated proto code thành package riêng | 1 lần gen, mọi service import |
| 15 | go.work + replace directive song song | Dev IDE work + prod docker build work |

---

## File structure cuối session

```
devops-for-se/
├── apps/                              # FE app (chưa có)
├── services/
│   └── api-gateway/                   # ✅ Service Go #1
│       ├── cmd/api-gateway/main.go
│       ├── internal/{config,observability,middleware,handler,server}/
│       ├── Dockerfile + .dockerignore + Makefile + .env.example
│       └── go.mod + go.sum
├── packages/
│   └── proto-go/                      # ✅ Generated Go bindings
│       ├── pm/v1/{common,auth}.pb.go + auth_grpc.pb.go
│       └── go.mod
├── proto/                             # ✅ Protobuf source
│   ├── buf.yaml + buf.gen.yaml
│   └── pm/v1/{common,auth}.proto
├── infra/
│   ├── dev/
│   │   ├── docker-compose.yml         # ✅ 16 containers, 3 profiles
│   │   ├── .env.example
│   │   ├── traefik/{traefik.yml,dynamic.yml}
│   │   └── postgres/init-scripts/{00-init.sh, 01-load-schemas.sh}
│   ├── prod/                          # Empty, phase 6
│   └── shared/
│       ├── monitoring/                # Prometheus, Grafana, Loki, Tempo, OTel
│       └── postgres/schemas/          # 9 SQL DDL files
├── docs/
│   ├── plans/
│   │   ├── 2026-01-10-devops-learning-curriculum.md
│   │   └── 2026-05-24-pm-platform-design.md
│   └── theory/
│       ├── 01-clean-architecture.md
│       ├── 02-go-syntax-basics.md
│       ├── 03-goroutine-channel.md
│       ├── 04-project-recap-phase1.md
│       ├── 05-dockerfile-multi-stage.md
│       └── 06-pm-platform-phase-0-recap.md      # ← file này
├── .github/workflows/                 # Empty (CI sẽ thêm)
├── go.work + go.work.sum
├── package.json + pnpm-workspace.yaml + turbo.json
├── .gitignore + .nvmrc
└── README.md
```

---

## Commands cheatsheet

### Repo root

```bash
pnpm install                    # Install all workspace deps
pnpm dev                        # Turbo dev all apps
pnpm build                      # Turbo build all
pnpm proto:lint                 # buf lint
pnpm proto:gen                  # buf generate
pnpm infra:dev:up               # docker compose up dev core
pnpm infra:dev:down             # docker compose down
```

### Per Go service (vd api-gateway)

```bash
cd services/api-gateway
make run                        # Local dev với .env
make build                      # Binary → bin/
make test                       # Unit test với race + coverage
make tidy                       # go mod tidy + go work sync
make docker-build               # Docker image
make docker-run                 # Run image
```

### Docker compose

```bash
cd infra/dev
docker compose up -d                                        # Core
docker compose --profile observability up -d                # + monitoring
docker compose --profile dev-tools up -d                    # + GUI
docker compose --profile observability --profile dev-tools up -d  # All
docker compose ps
docker compose logs -f <service>
docker compose down                                         # Stop
docker compose down -v                                      # Stop + xoá volume
```

### Postgres debug

```bash
# Liệt kê schemas
docker exec -it pm-postgres psql -U postgres -d pmdb -c "\dn"

# Connect as service user
docker exec -it pm-postgres psql -U auth_user -d pmdb

# Show search_path
docker exec -it pm-postgres psql -U auth_user -d pmdb -c "SHOW search_path;"
```

### Kafka debug

```bash
# Topic list
docker exec -it pm-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --list

# Create topic
docker exec -it pm-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 \
  --create --topic test --partitions 3 --replication-factor 1

# Produce message
docker exec -it pm-kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka:9092 --topic test

# Consume
docker exec -it pm-kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka:9092 --topic test --from-beginning
```

---

## Phỏng vấn hỏi gì (phần liên quan phase 0)

### Microservice + Protobuf

- "Tại sao gRPC giữa service, REST với FE?" → binary serialization (10x nhanh), HTTP/2 multiplexing, contract-first via proto, type-safe codegen. REST cho FE vì browser dễ debug + cache HTTP.
- "Protobuf schema evolution rules?" → field tag không bao giờ reuse, type không đổi, repeated/scalar không swap. Default `breaking: WIRE_JSON` cho phép rename field (chỉ tag matter).
- "EventEnvelope pattern là gì?" → wrapper chung cho mọi event Kafka, payload là `bytes`, consumer dispatch theo `event_type`. Pros: cross-cutting fields (trace_id, actor_id) không phải lặp.

### Kafka

- "KRaft mode khác gì với Zookeeper?" → bỏ Zookeeper, 1 process Kafka vừa làm broker vừa controller. Đơn giản deployment, latency thấp hơn.
- "Listener vs Advertised Listener?" → listener = port lắng nghe; advertised = address trả về client khi connect → sai = client connect address sai.
- "Partition key chiến lược?" → workspace_id → mọi event 1 workspace vào 1 partition → ordering guarantee per workspace. Trade-off: hot workspace = 1 partition busy.

### Postgres

- "Schema-per-service vs DB-per-service?" → schema = 1 instance, tiết kiệm RAM, isolation qua user permission. DB-per-service = strict isolation nhưng tốn resource. Team nhỏ chọn schema.
- "Tại sao init scripts không tạo bảng?" → init = setup namespace + permission. Tables thuộc service lifecycle → service migrations own (golang-migrate / Flyway) → có version tracking + rollback.
- "`search_path` để làm gì?" → set per role, query không cần prefix schema. Service `auth` chỉ thấy schema `auth` → "schema isolation" cấp postgres.

### Observability

- "OTel Collector tại sao cần?" → service chỉ biết 1 endpoint (collector), collector fan-out tới Tempo/Loki/Prometheus. Đổi backend không sửa service. Vendor-neutral.
- "Liveness vs Readiness?" → liveness = "còn sống" → restart nếu fail. Readiness = "sẵn sàng nhận traffic" → remove khỏi LB nếu fail. Service mới boot có thể liveness OK + readiness FAIL.
- "Trace propagation cross-service?" → W3C `traceparent` header inject bởi instrumentation lib. Span con kế thừa parent từ header → 1 trace tổng hợp full path.

### Docker / Build

- "Multi-stage Dockerfile lợi ích gì?" → image cuối ~25MB (alpine + binary) thay vì 1GB (full Go toolchain). Layer caching nhanh hơn.
- "Build context là gì?" → directory mà docker COPY pull từ. Context lớn = build chậm → `.dockerignore` rất quan trọng.
- "Non-root user trong container?" → security best practice. Container compromise → attacker không có root → privilege escalation khó hơn.

### Go

- "Go workspace để làm gì?" → multi-module local development. Service A import service B local mà không publish. Production build vẫn dùng go.mod replace directive.
- "Graceful shutdown pattern?" → signal handler → ngừng nhận traffic mới → drain in-flight → close resources → exit. Timeout tránh hang.
- "context propagation?" → mọi func nhận context.Context đầu tiên. Cancel propagate xuống chain. Goroutine respect ctx.Done(). Pattern fundamentally cho timeout/cancellation distributed.

### General

- "Monorepo vs polyrepo?" → mono: dễ refactor cross-service, atomic commit. Poly: thật giống enterprise, CI/CD split. Turborepo (mono) hợp solo dev + early stage.
- "Schema Registry?" → centralize Avro/Protobuf schema, consumer/producer fetch schema từ registry. Avoid embed schema trong mỗi message → message nhẹ hơn. Compatibility check (backward/forward) khi register schema mới.

---

## What's next (chưa làm)

### Phase 0 còn lại (~1-2 tuần)

- 7 Go service skeleton khác (auth, workspace, page, file, ai, mcp-server, realtime)
- 5 Java service skeleton (issue, search, notification, report, audit) — cần upgrade Java 17 → 21 hay giữ 17?
- 1 Node service skeleton (collab-server) — Hocuspocus
- FE skeleton (apps/web) — React + rsbuild + shadcn
- GitHub Actions CI (lint + test per stack)
- lefthook pre-commit (commitlint + go fmt + biome)
- Test docker compose up thật + verify mọi service connect được

### Phase 1 (4-5 tuần)

- auth service: register/login/OAuth Google/invite (kế thừa JWT đã có)
- workspace service: workspace/project/space/role/member/permission
- issue service (Java đầu tiên): Spring Boot 3 + JPA + Flyway + custom field/workflow
- page service: page tree + markdown editor (chưa collab)
- FE: login/invite/workspace/issue list/page tree

---

## Quote of session

> "Step-by-step learn (recommend)... mình setup 1 phần, giải thích tại sao, bạn đọc + hỏi. Chậm nhưng nhớ lâu, khớp 'học hiểu bản chất'"

→ Đã chọn approach này từ đầu phase 0. Tiếp tục cho các step sau.

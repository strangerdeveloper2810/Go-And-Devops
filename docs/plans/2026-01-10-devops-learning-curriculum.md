# DevOps Learning Curriculum - Poor Man's Vercel

> Chương trình học DevOps + Go Backend thông qua xây dựng Platform-as-a-Service từ đầu
>
> **Target**: Backend Go / Fullstack React + Go (mid-senior)
> **Target companies**: Axon, VNG, ANZ
> **Timeline**: 1.5 - 2 tháng

*Created: 2026-01-10 | Updated: 2026-02-22*

---

## Skills Map theo JD (Axon / VNG / ANZ)

Tổng hợp từ JD thực tế của 3 công ty + market research:

| Skill | Axon | VNG | ANZ | Plan Phase |
|-------|------|-----|-----|------------|
| Go fundamentals, idioms | Required | Required | Required | 1 DONE |
| REST API design | Required | Required | Required | 1 DONE |
| Clean Architecture / SOLID | Required | Required | Required | 1 DONE |
| PostgreSQL / SQL | Required | Required | Required | 1 DONE |
| Docker | Required | Required | Plus | 2 |
| **Testing (unit, integration, mock)** | Required | Required | Required | **3.1** |
| **Goroutine, concurrency patterns** | Required | Required | Required | **3.2** |
| **Microservices architecture** | Required | Required | Required | **3** |
| **Message Queue (Kafka/Redis)** | Required | Required | Plus | **3.2** |
| **gRPC** | Plus | Required | Plus | **NEW 3.6** |
| **DB optimization (indexing, N+1)** | Expected | Required | Expected | **NEW 3.1** |
| Kubernetes | Required | Plus | Plus | 4 |
| CI/CD | Required | Required | Plus | 3-5 |
| **AWS/Cloud basics** | Required | Plus | Plus | **NEW 4.6** |
| Monitoring (Prometheus/Grafana) | Plus | Plus | Plus | 5 |
| **GraphQL** | Axon dùng | - | - | Optional |
| **English communication** | Required | Required | Required | Self-study |
| System design interview | Required | Required | Required | Throughout |

---

## Phase 1: Go Fundamentals + REST API ---- DONE (2026-02-21 ~ 2026-02-22)

> Mục tiêu: Xây REST API hoàn chỉnh với Clean Architecture, connect database thật

### Module 1.1: Go Basics - DONE
- [x] Variables, types, zero values (so sánh JS)
- [x] Functions, multiple return values
- [x] Structs & methods (receiver thay class)
- [x] Interfaces (implicit implementation)
- [x] Pointers (`&` lấy địa chỉ, `*` đi tới địa chỉ)
- [x] Error handling (`if err != nil` thay try/catch)
- [x] Slices, maps, loops (chỉ có `for`)
- [x] Packages & modules (`go mod`, import)
- **Quiz**: 7/10 - yếu pointer và map check key
- **Theory**: [02-go-syntax-basics.md](../theory/02-go-syntax-basics.md)

### Module 1.2: Go Web Development (Gin) - DONE
- [x] Gin framework (`gin.New()`, `gin.Engine`)
- [x] Middleware (`Logger()`, `Recovery()`)
- [x] Route groups (`router.Group("/api/v1")`)
- [x] Request handling (`c.Param()`, `c.ShouldBindJSON()`)
- [x] Response format chuẩn (`SuccessResponse`, `ErrorResponse`)
- [x] REST conventions (số nhiều `/projects`, HTTP status codes)
- [x] Health check endpoints (`/health`, `/ready`)
- **Lab**: REST API 7 endpoints hoàn chỉnh

### Module 1.3: Database với Go - DONE
- [x] `database/sql` package + connection pool
- [x] PostgreSQL driver pgx (`_ "github.com/jackc/pgx/v5/stdlib"`)
- [x] Side effect import (đăng ký driver)
- [x] `db.Ping()` test connection thật
- [x] 3 SQL patterns: `db.Query()`, `db.QueryRow()`, `db.Exec()`
- [x] `rows.Scan()` map kết quả theo thứ tự SELECT
- [x] PostgreSQL `$1, $2` placeholders
- [x] `RETURNING` clause (lấy data sau INSERT/UPDATE)
- [x] Soft delete pattern (`SET deleted_at = NOW()`)
- [x] `RowsAffected()` check
- [ ] ~~Migrations (golang-migrate)~~ - dùng init-scripts, migrate sau
- [ ] ~~Query patterns (sqlc codegen)~~ - optional, sau này
- **Lab**: Full CRUD 5 methods tested với curl

### Module 1.4: Project Structure - DONE
- [x] Clean Architecture (Handler → Service → Repository)
- [x] Dependency Injection qua constructor
- [x] Configuration management (godotenv + `.env`)
- [x] DI wiring trong `main.go`
- [x] Interface cho loose coupling
- [x] Graceful shutdown (signal handling)
- **Theory**: [01-clean-architecture.md](../theory/01-clean-architecture.md)
- **Recap**: [04-project-recap-phase1.md](../theory/04-project-recap-phase1.md)

### Files đã tạo (Phase 1):
```
services/api/
├── cmd/api/main.go                   # Entry point + DI + graceful shutdown
├── internal/
│   ├── config/config.go              # Load .env
│   ├── database/postgres.go          # DB connection (pgx)
│   ├── handler/
│   │   ├── health.go                 # GET /health, /ready
│   │   ├── project.go                # CRUD handlers
│   │   ├── response.go               # SuccessResponse / ErrorResponse
│   │   └── routes.go                 # Route registration
│   ├── model/project.go              # Project struct
│   ├── service/project.go            # Interface + pass-through
│   └── repository/repository.go      # SQL queries (5 methods)
├── .env
├── Makefile
└── go.mod / go.sum

deployments/docker/
├── docker-compose.yml                # PostgreSQL + Redis + Adminer
└── init-scripts/
    └── 001_create_project.sql        # CREATE TABLE projects
```

---

## Phase 2: Containerization ---- NEXT

> Mục tiêu: Đóng gói Go API thành Docker image, chạy full stack trong containers

### Module 2.1: Dockerfile cho Go API

**Lý thuyết cần hiểu:**
- Container vs VM (nhẹ hơn, share OS kernel)
- Docker image = layers (mỗi instruction = 1 layer)
- Multi-stage build = build ở stage 1, copy binary sang stage 2 (image nhỏ)

**Tasks:**
- [ ] Viết `services/api/Dockerfile`
  - [ ] Stage 1 (`builder`): Dùng `golang:1.22-alpine`, copy source, `go build`
  - [ ] Stage 2 (`runner`): Dùng `alpine:3.19` hoặc `scratch`, copy binary
  - [ ] Expose port 8080
  - [ ] `CMD ["./api"]`
- [ ] Hiểu tại sao multi-stage (image 10MB thay vì 1GB)
- [ ] `.dockerignore` file (giống `.gitignore` cho Docker)
- [ ] Build & test local: `docker build -t pmv-api .`
- [ ] Run test: `docker run -p 8080:8080 pmv-api`

**So sánh JS:**
```
# Node.js Dockerfile thường ~200MB
# Go multi-stage Dockerfile ~10-15MB (static binary)
# Go scratch Dockerfile ~5-8MB (minimal)
```

### Module 2.2: Docker Compose Full Stack

**Lý thuyết cần hiểu:**
- Docker networking (containers communicate qua service name)
- `depends_on` + `condition: service_healthy`
- Environment variables trong container vs `.env` file

**Tasks:**
- [ ] Uncomment `api` service trong `docker-compose.yml`
- [ ] Config environment variables cho container
  - `DATABASE_URL=postgres://postgres:postgres@postgres:5432/pmv?sslmode=disable`
  - Lưu ý: `@postgres:` = service name (không phải `@localhost:`)
- [ ] `depends_on` → API đợi PostgreSQL healthy mới start
- [ ] Test: `docker compose up -d` → tất cả 4 services chạy
- [ ] Test: `curl http://localhost:8080/api/v1/projects`

**Kết quả:** 1 command `docker compose up -d` chạy toàn bộ stack

### Module 2.3: Image Optimization & Registry

**Lý thuyết cần hiểu:**
- Layer caching (order Dockerfile instructions = tận dụng cache)
- Image tagging strategies (`latest`, `v1.0.0`, `git-sha`)
- Container registry (Docker Hub, GitHub Container Registry)

**Tasks:**
- [ ] Optimize Dockerfile layer order:
  - COPY `go.mod` + `go.sum` trước → cache dependencies
  - COPY source sau → chỉ rebuild khi code thay đổi
- [ ] Tag image: `docker tag pmv-api:latest pmv-api:v1.0.0`
- [ ] Push lên Docker Hub hoặc GitHub Container Registry
- [ ] Security scan: `docker scout cve pmv-api`

### Files sẽ tạo/sửa (Phase 2):
```
services/api/
├── Dockerfile              # NEW - Multi-stage build
└── .dockerignore           # NEW - Ignore files khi build

deployments/docker/
└── docker-compose.yml      # EDIT - Uncomment api service
```

---

## Phase 3: Build "Poor Man's Vercel"

> Mục tiêu: Platform tự động deploy app từ GitHub repo

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ User push code lên GitHub                                    │
│         │                                                    │
│         ▼                                                    │
│ GitHub Webhook ──→ API Server ──→ Redis Queue                │
│                      (Go)           │                        │
│                        │            ▼                        │
│                        │      Builder Worker                 │
│                        │         (Go)                        │
│                        │            │                        │
│                        │     1. Git clone                    │
│                        │     2. Detect framework             │
│                        │     3. Build Docker image           │
│                        │            │                        │
│                        │            ▼                        │
│                        │      Deployer Service               │
│                        │         (Go)                        │
│                        │            │                        │
│                        │     1. Start container              │
│                        │     2. Health check                 │
│                        │     3. Register route               │
│                        │            │                        │
│                        │            ▼                        │
│                        │      Traefik Proxy                  │
│                        │            │                        │
│                        ▼            ▼                        │
│                    PostgreSQL   User's App                   │
│                    (metadata)   (running container)          │
│                                     │                        │
│                                     ▼                        │
│                              https://my-app.pmv.local        │
└─────────────────────────────────────────────────────────────┘
```

### Module 3.1: API Server - Mở rộng

**Lý thuyết cần hiểu:**
- JWT (JSON Web Token) - stateless authentication
- Middleware pattern trong Gin
- Webhook = HTTP callback (GitHub gọi API khi có push event)

**Tasks:**

#### 3.1.1 JWT Authentication
- [ ] Hiểu JWT structure (Header.Payload.Signature)
- [ ] Install: `go get github.com/golang-jwt/jwt/v5`
- [ ] Tạo `internal/middleware/auth.go`
  - [ ] `AuthMiddleware()` - extract + verify JWT từ header
  - [ ] Inject user info vào `c.Set("user_id", ...)`
- [ ] Tạo `internal/handler/auth.go`
  - [ ] `POST /api/v1/auth/register` - tạo user + hash password
  - [ ] `POST /api/v1/auth/login` - verify password + return JWT
- [ ] Tạo `internal/model/user.go` - User struct
- [ ] Tạo `internal/repository/user.go` - User CRUD
- [ ] Tạo `internal/service/auth.go` - Auth business logic
- [ ] SQL migration: `002_create_users.sql`
- [ ] Apply auth middleware cho project routes
- [ ] Test: login → get token → dùng token gọi API

#### 3.1.2 Deployment Management
- [ ] Tạo `internal/model/deployment.go`
  ```
  Deployment: id, project_id, status, commit_sha, image_tag,
              build_logs, deploy_url, created_at, updated_at
  ```
- [ ] Tạo `internal/repository/deployment.go`
- [ ] Tạo `internal/service/deployment.go`
- [ ] Tạo `internal/handler/deployment.go`
- [ ] Routes: `GET/POST /api/v1/projects/:id/deployments`
- [ ] SQL migration: `003_create_deployments.sql`

#### 3.1.3 Webhook Endpoint
- [ ] `POST /api/v1/webhooks/github` - nhận GitHub push event
- [ ] Verify webhook signature (HMAC-SHA256)
- [ ] Parse payload → extract repo URL, branch, commit SHA
- [ ] Push build job vào Redis queue
- [ ] Test: dùng curl simulate webhook

#### 3.1.4 Testing (QUAN TRỌNG - mọi JD đều hỏi)
- [ ] Hiểu Go testing (`_test.go` files, `go test`)
- [ ] **Table-driven tests** (Go convention, interview hay hỏi)
  ```go
  tests := []struct {
      name     string
      input    string
      expected int
      wantErr  bool
  }{...}
  for _, tt := range tests { t.Run(tt.name, func(t *testing.T) {...}) }
  ```
- [ ] **Mock interface** dùng `gomock` hoặc manual mock
- [ ] Unit test cho service layer (mock repository)
- [ ] Unit test cho handler layer (mock service, `httptest`)
- [ ] Integration test cho repository (test database thật)
- [ ] **Test coverage**: `go test -cover ./...`
- [ ] **Benchmark test**: `func BenchmarkXxx(b *testing.B)`
- [ ] `make test` chạy all tests

#### 3.1.5 Database Optimization (mid-senior cần biết)
- [ ] **Indexing**: tạo index cho columns hay query (WHERE, JOIN)
  ```sql
  CREATE INDEX idx_projects_status ON projects(status);
  CREATE INDEX idx_projects_name ON projects(name) WHERE deleted_at IS NULL;
  ```
- [ ] **EXPLAIN ANALYZE**: đọc query plan
- [ ] **N+1 Problem**: query trong loop → dùng JOIN hoặc batch query
- [ ] **Connection pool tuning**: MaxOpenConns, MaxIdleConns, ConnMaxLifetime
- [ ] **Pagination**: LIMIT/OFFSET hoặc cursor-based pagination
- [ ] Apply vào project: thêm pagination cho List endpoints

### Module 3.2: Builder Worker (Go service mới)

**Lý thuyết cần hiểu:**
- Worker pattern (consume jobs từ queue)
- Redis Pub/Sub hoặc List (LPUSH/BRPOP) làm queue
- Docker SDK for Go (build image programmatically)
- `os/exec` package (chạy commands từ Go)

**Tasks:**

#### 3.2.1 Project Setup
- [ ] Tạo `services/builder/` (Go module riêng)
  ```
  services/builder/
  ├── cmd/builder/main.go
  ├── internal/
  │   ├── config/config.go
  │   ├── queue/redis.go        # Redis consumer
  │   ├── git/clone.go          # Git operations
  │   ├── detect/framework.go   # Framework detection
  │   ├── build/docker.go       # Docker build
  │   └── notify/status.go      # Update build status
  ├── go.mod
  └── Dockerfile
  ```

#### 3.2.2 Redis Queue Consumer
- [ ] Install: `go get github.com/redis/go-redis/v9`
- [ ] `BRPOP` blocking consumer (đợi job từ queue)
- [ ] Job format: `{ project_id, repo_url, branch, commit_sha }`
- [ ] Graceful shutdown (stop consuming khi nhận signal)

#### 3.2.3 Git Clone
- [ ] `git clone --branch <branch> --depth 1 <url> <dir>`
- [ ] Dùng `os/exec.Command("git", "clone", ...)` hoặc go-git library
- [ ] Clone vào temp directory
- [ ] Cleanup sau khi build xong

#### 3.2.4 Framework Detection
- [ ] Check files trong repo:
  - `package.json` → Node.js
  - `go.mod` → Go
  - `requirements.txt` / `Pipfile` → Python
  - `Dockerfile` → user tự có Dockerfile
- [ ] Return framework type + config

#### 3.2.5 Dockerfile Generation & Build
- [ ] Generate Dockerfile dựa trên framework:
  - Node.js: `FROM node:20-alpine` + `npm install` + `npm start`
  - Go: multi-stage build
  - Python: `FROM python:3.12-slim` + `pip install` + `uvicorn`
- [ ] Dùng Docker SDK hoặc `docker build` command
- [ ] Tag image: `pmv-<project-id>:<commit-sha>`
- [ ] Stream build logs → update status qua Redis

#### 3.2.6 Status Updates
- [ ] Update deployment status trong PostgreSQL (qua API hoặc direct DB)
- [ ] Statuses: `queued` → `cloning` → `building` → `built` / `failed`
- [ ] Save build logs

### Module 3.3: Deployer Service (Go service mới)

**Lý thuyết cần hiểu:**
- Docker API (tạo/start/stop containers programmatically)
- Health checks (HTTP endpoint check container healthy)
- Rolling update (start new → health check → stop old)

**Tasks:**

#### 3.3.1 Project Setup
- [ ] Tạo `services/deployer/` (Go module riêng)
  ```
  services/deployer/
  ├── cmd/deployer/main.go
  ├── internal/
  │   ├── config/config.go
  │   ├── container/manager.go   # Docker container lifecycle
  │   ├── health/checker.go      # Health check
  │   ├── proxy/traefik.go       # Register route với Traefik
  │   └── queue/redis.go         # Listen deploy events
  ├── go.mod
  └── Dockerfile
  ```

#### 3.3.2 Container Manager
- [ ] Install: `go get github.com/docker/docker/client`
- [ ] `CreateContainer()` - tạo container từ built image
- [ ] `StartContainer()` - start container
- [ ] `StopContainer()` - graceful stop (SIGTERM → wait → SIGKILL)
- [ ] `RemoveContainer()` - cleanup
- [ ] Port management (assign dynamic port cho mỗi container)

#### 3.3.3 Health Checker
- [ ] HTTP health check endpoint (`/health` hoặc `/`)
- [ ] Retry logic (check 5 lần, mỗi lần cách 3s)
- [ ] Timeout per check (5s)
- [ ] Return healthy/unhealthy

#### 3.3.4 Rolling Update
- [ ] Start new container (v2)
- [ ] Health check v2
- [ ] Nếu healthy → switch traffic → stop old container (v1)
- [ ] Nếu unhealthy → rollback (giữ v1, remove v2)

#### 3.3.5 Route Registration
- [ ] Update Traefik config (dynamic) khi deploy thành công
- [ ] Map: `my-app.pmv.local` → `container-ip:port`

### Module 3.4: Traefik Proxy

**Lý thuyết cần hiểu:**
- Reverse proxy = nhận request → forward tới backend
- Dynamic configuration (Traefik tự phát hiện containers)
- TLS termination (HTTPS ở proxy, HTTP tới backend)

**Tasks:**
- [ ] Thêm Traefik vào `docker-compose.yml`
- [ ] Config Traefik dashboard (`:8082`)
- [ ] Docker provider (auto-detect containers via labels)
- [ ] Dynamic routing qua Docker labels:
  ```yaml
  labels:
    - "traefik.http.routers.myapp.rule=Host(`myapp.pmv.local`)"
  ```
- [ ] Wildcard DNS: `*.pmv.local` → `127.0.0.1`
- [ ] (Optional) Auto SSL với Let's Encrypt

### Module 3.5: Web UI (Next.js)

**Lý thuyết cần hiểu:**
- Next.js App Router (bạn đã biết React)
- Server Components vs Client Components
- Real-time updates (SSE hoặc WebSocket)

**Tasks:**
- [ ] Tạo `services/web/` (Next.js project)
- [ ] Dashboard page - list projects
- [ ] Project detail page - list deployments
- [ ] Create project form
- [ ] Deploy button
- [ ] Real-time deployment logs (SSE/WebSocket)
- [ ] Authentication (JWT flow)

### Module 3.6: gRPC (inter-service communication) - NEW

**Tại sao cần:** Axon dùng Protobuf, VNG yêu cầu gRPC, hầu hết microservices dùng gRPC thay REST cho internal communication.

**Lý thuyết cần hiểu:**
- gRPC vs REST: binary (Protobuf) vs text (JSON), nhanh hơn ~10x
- Protocol Buffers (`.proto` files) = schema definition
- Unary RPC, Server streaming, Client streaming, Bidirectional
- gRPC dùng cho internal (service ↔ service), REST dùng cho external (client ↔ API)

**Tasks:**
- [ ] Install: `go install google.golang.org/protobuf/cmd/protoc-gen-go@latest`
- [ ] Install: `go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest`
- [ ] Viết `.proto` file cho Builder service:
  ```protobuf
  service BuilderService {
    rpc TriggerBuild(BuildRequest) returns (BuildResponse);
    rpc GetBuildStatus(StatusRequest) returns (stream BuildLog); // streaming
  }
  ```
- [ ] Generate Go code từ proto: `protoc --go_out=. --go-grpc_out=.`
- [ ] Implement gRPC server trong Builder service
- [ ] Implement gRPC client trong API service
- [ ] So sánh performance gRPC vs REST (cùng data)
- [ ] **Lab**: API gọi Builder qua gRPC thay vì Redis queue

---

### Module 3.7: Go Concurrency thực hành - NEW

**Tại sao cần:** Mọi JD mid-senior đều hỏi goroutine/channel. Phase 1 chỉ học theory, cần thực hành.

**Tasks:**
- [ ] **Worker Pool pattern**: N goroutines xử lý jobs từ channel
  ```go
  jobs := make(chan Job, 100)
  for i := 0; i < numWorkers; i++ {
      go worker(jobs)
  }
  ```
- [ ] **Context cancellation**: `context.WithTimeout`, `context.WithCancel`
- [ ] **sync.WaitGroup**: đợi nhiều goroutines xong
- [ ] **sync.Mutex**: protect shared data (race condition)
- [ ] **select statement**: listen multiple channels
- [ ] **errgroup**: parallel tasks with error handling
- [ ] **Race detector**: `go test -race ./...`
- [ ] Apply vào project: Builder Worker dùng worker pool + context

---

### Files sẽ tạo (Phase 3):
```
services/
├── api/internal/
│   ├── middleware/auth.go          # JWT middleware
│   ├── handler/auth.go            # Login/Register
│   ├── handler/deployment.go      # Deployment CRUD
│   ├── model/user.go              # User struct
│   ├── model/deployment.go        # Deployment struct
│   ├── repository/user.go         # User queries
│   ├── repository/deployment.go   # Deployment queries
│   └── service/auth.go            # Auth logic
│
├── builder/                       # NEW SERVICE
│   ├── cmd/builder/main.go
│   ├── internal/
│   │   ├── queue/redis.go
│   │   ├── git/clone.go
│   │   ├── detect/framework.go
│   │   ├── build/docker.go
│   │   └── notify/status.go
│   ├── Dockerfile
│   └── go.mod
│
├── deployer/                      # NEW SERVICE
│   ├── cmd/deployer/main.go
│   ├── internal/
│   │   ├── container/manager.go
│   │   ├── health/checker.go
│   │   ├── proxy/traefik.go
│   │   └── queue/redis.go
│   ├── Dockerfile
│   └── go.mod
│
└── web/                           # NEW SERVICE
    ├── src/app/
    │   ├── page.tsx               # Dashboard
    │   ├── projects/[id]/page.tsx # Project detail
    │   └── login/page.tsx         # Auth
    ├── package.json
    └── Dockerfile

deployments/docker/
├── docker-compose.yml             # EDIT - thêm builder, deployer, traefik, web
└── init-scripts/
    ├── 001_create_project.sql
    ├── 002_create_users.sql       # NEW
    └── 003_create_deployments.sql # NEW
```

---

## Phase 4: Kubernetes

> Mục tiêu: Deploy toàn bộ stack lên Kubernetes, setup GitOps

### Module 4.1: K8s Concepts

**Lý thuyết cần hiểu:**
- K8s architecture (Control Plane: API Server, etcd, Scheduler, Controller Manager)
- Pod = smallest unit (1+ containers)
- Node = machine chạy pods
- Declarative config (YAML) vs imperative commands

**Tasks:**
- [ ] Install `kubectl` + local cluster (`kind` hoặc `minikube`)
- [ ] Chạy first pod: `kubectl run nginx --image=nginx`
- [ ] `kubectl get pods`, `kubectl describe pod`, `kubectl logs`
- [ ] Hiểu Pod lifecycle: Pending → Running → Succeeded/Failed
- [ ] Viết Pod YAML file đầu tiên

### Module 4.2: Workloads

**Lý thuyết cần hiểu:**
- Deployment = manage ReplicaSet = manage Pods (self-healing)
- Service = stable network endpoint cho pods
  - ClusterIP (internal), NodePort (external), LoadBalancer
- Ingress = HTTP routing (giống Traefik nhưng trong K8s)

**Tasks:**
- [ ] Viết `deployments/k8s/api-deployment.yaml`
  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: pmv-api
  spec:
    replicas: 2
    selector: ...
    template:
      spec:
        containers:
        - name: api
          image: pmv-api:latest
          ports:
          - containerPort: 8080
  ```
- [ ] Viết `api-service.yaml` (ClusterIP)
- [ ] Viết `ingress.yaml` (HTTP routing)
- [ ] Deploy PostgreSQL + Redis lên K8s
- [ ] Test: `kubectl apply -f deployments/k8s/`
- [ ] Scaling: `kubectl scale deployment pmv-api --replicas=3`

### Module 4.3: Configuration

**Lý thuyết cần hiểu:**
- ConfigMap = non-sensitive config (PORT, ENV)
- Secret = sensitive config (DATABASE_URL, JWT_SECRET) - base64 encoded
- Volume mount hoặc environment variables

**Tasks:**
- [ ] Tạo ConfigMap cho API config
- [ ] Tạo Secret cho database credentials
- [ ] Mount vào Deployment as env vars
- [ ] Namespace separation (dev/staging/prod)

### Module 4.4: Storage

**Lý thuyết cần hiểu:**
- PersistentVolume (PV) = physical storage
- PersistentVolumeClaim (PVC) = request storage
- StatefulSet = ordered pod management (cho databases)

**Tasks:**
- [ ] Viết `postgres-statefulset.yaml`
- [ ] Tạo PVC cho PostgreSQL data
- [ ] Viết `redis-statefulset.yaml`
- [ ] Test: delete pod → data vẫn còn

### Module 4.5: Helm & GitOps

**Lý thuyết cần hiểu:**
- Helm = package manager cho K8s (template YAML)
- Chart = collection of templates
- ArgoCD = GitOps operator (watch git repo → auto sync K8s)

**Tasks:**
- [ ] Tạo Helm chart: `deployments/helm/pmv/`
  ```
  pmv/
  ├── Chart.yaml
  ├── values.yaml          # Default values
  ├── values-dev.yaml      # Dev overrides
  ├── values-prod.yaml     # Prod overrides
  └── templates/
      ├── deployment.yaml
      ├── service.yaml
      ├── ingress.yaml
      ├── configmap.yaml
      └── secret.yaml
  ```
- [ ] `helm install pmv ./deployments/helm/pmv`
- [ ] Install ArgoCD trên cluster
- [ ] Config ArgoCD watch git repo
- [ ] Test: push code → CI build image → ArgoCD auto deploy

### Module 4.6: Cloud Basics (AWS) - NEW

**Tại sao cần:** Axon yêu cầu cloud experience, VNG/ANZ là plus. Ít nhất biết deploy lên cloud.

**Lý thuyết cần hiểu:**
- AWS core services: EC2 (VM), S3 (storage), RDS (managed DB), ECS/EKS (containers)
- IAM (permissions), VPC (networking), Security Groups (firewall)
- Infrastructure as Code (Terraform basics)

**Tasks:**
- [ ] Tạo AWS Free Tier account
- [ ] Deploy Go API lên EC2 (manual)
- [ ] Setup RDS PostgreSQL (managed database)
- [ ] Push Docker image lên ECR (Elastic Container Registry)
- [ ] (Optional) Deploy lên ECS Fargate (serverless containers)
- [ ] (Optional) Terraform: viết infrastructure as code
- [ ] **Lab**: Full stack chạy trên AWS (EC2 + RDS + Redis ElastiCache)

---

### Files sẽ tạo (Phase 4):
```
deployments/
├── k8s/                           # Raw K8s manifests
│   ├── namespace.yaml
│   ├── api-deployment.yaml
│   ├── api-service.yaml
│   ├── postgres-statefulset.yaml
│   ├── redis-statefulset.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   └── ingress.yaml
│
└── helm/                          # Helm charts
    └── pmv/
        ├── Chart.yaml
        ├── values.yaml
        ├── values-dev.yaml
        ├── values-prod.yaml
        └── templates/
            ├── deployment.yaml
            ├── service.yaml
            ├── ingress.yaml
            ├── configmap.yaml
            └── secret.yaml
```

---

## Phase 5: Observability

> Mục tiêu: Monitoring, logging, tracing production-ready

### Module 5.1: Metrics (Prometheus + Grafana)

**Lý thuyết cần hiểu:**
- Prometheus = pull-based metrics (scrape endpoints)
- Metrics types: Counter, Gauge, Histogram, Summary
- PromQL = query language cho Prometheus
- Grafana = visualization dashboards

**Tasks:**
- [ ] Thêm Prometheus + Grafana vào docker-compose
- [ ] Install `github.com/prometheus/client_golang`
- [ ] Expose metrics endpoint: `GET /metrics`
- [ ] Custom metrics trong Go API:
  - `http_requests_total` (Counter) - tổng requests
  - `http_request_duration_seconds` (Histogram) - latency
  - `http_requests_in_flight` (Gauge) - concurrent requests
  - `db_query_duration_seconds` (Histogram) - DB latency
- [ ] Viết `prometheus.yml` config (scrape targets)
- [ ] Tạo Grafana dashboard:
  - Request rate (requests/sec)
  - Error rate (% 5xx)
  - Latency p50/p95/p99
  - DB connection pool usage
- [ ] PromQL queries cơ bản:
  ```
  rate(http_requests_total[5m])
  histogram_quantile(0.95, http_request_duration_seconds)
  ```

### Module 5.2: Logging (Loki)

**Lý thuyết cần hiểu:**
- Structured logging (JSON) vs text logging
- Log levels: DEBUG, INFO, WARN, ERROR
- Loki = "Prometheus for logs" (index labels, not content)
- LogQL = query language cho Loki

**Tasks:**
- [ ] Install structured logger (`zerolog` hoặc `zap`)
- [ ] Replace `log.Printf` với structured logging
  ```go
  log.Info().
    Str("method", c.Request.Method).
    Str("path", c.Request.URL.Path).
    Int("status", statusCode).
    Dur("latency", duration).
    Msg("request completed")
  ```
- [ ] Thêm Loki + Promtail vào docker-compose
- [ ] Config Promtail scrape container logs
- [ ] Tạo Grafana dashboard cho logs
- [ ] LogQL queries:
  ```
  {app="pmv-api"} |= "error"
  {app="pmv-api"} | json | status >= 500
  ```

### Module 5.3: Tracing (Jaeger/Tempo)

**Lý thuyết cần hiểu:**
- Distributed tracing = follow request across services
- Span = 1 operation, Trace = collection of spans
- OpenTelemetry (OTel) = standard API for telemetry
- Context propagation (pass trace ID across HTTP calls)

**Tasks:**
- [ ] Install OpenTelemetry Go SDK
- [ ] Setup tracer provider
- [ ] Instrument HTTP handlers (auto tracing)
- [ ] Instrument database queries (manual spans)
- [ ] Propagate trace context giữa API → Builder → Deployer
- [ ] Thêm Jaeger hoặc Tempo vào docker-compose
- [ ] Visualize traces trong Grafana

### Module 5.4: Alerting

**Lý thuyết cần hiểu:**
- Alert rules (when to fire)
- Alert routing (who gets alerted)
- Severity levels (critical, warning, info)
- Runbooks (what to do when alert fires)

**Tasks:**
- [ ] Viết Prometheus alert rules:
  ```yaml
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
  ```
- [ ] Setup Alertmanager
- [ ] Config alert routing (Slack/Discord/email)
- [ ] Tạo runbooks cho common alerts
- [ ] Test: trigger alert → verify notification

### Files sẽ tạo (Phase 5):
```
deployments/docker/
├── docker-compose.yml             # EDIT - thêm prometheus, grafana, loki, jaeger
├── prometheus/
│   ├── prometheus.yml             # Scrape config
│   └── alert-rules.yml           # Alert rules
├── grafana/
│   ├── provisioning/
│   │   ├── datasources.yml       # Prometheus, Loki, Jaeger
│   │   └── dashboards.yml        # Auto-load dashboards
│   └── dashboards/
│       ├── api-overview.json      # Request rate, latency, errors
│       └── infrastructure.json    # DB, Redis, containers
├── loki/
│   └── loki-config.yml
└── promtail/
    └── promtail-config.yml

services/api/internal/
├── middleware/
│   ├── metrics.go                 # Prometheus metrics middleware
│   ├── logging.go                 # Structured logging middleware
│   └── tracing.go                 # OpenTelemetry middleware
└── telemetry/
    └── setup.go                   # Init tracer, meter providers
```

---

## CI/CD Pipeline (xuyên suốt Phase 3-5)

### GitHub Actions

```
Push code → GitHub Actions:
  1. Lint + Test
  2. Build Docker image
  3. Push image to registry
  4. (Phase 4) ArgoCD auto-sync to K8s
```

**Tasks:**
- [ ] `.github/workflows/ci.yml` - Lint, test, build
- [ ] `.github/workflows/cd.yml` - Build image, push registry
- [ ] (Phase 4) ArgoCD integration

---

## Interview Prep (song song với learning)

### System Design (Axon/VNG hay hỏi)
- [ ] Design URL shortener (basic)
- [ ] Design rate limiter (middleware)
- [ ] Design notification system (queue-based)
- [ ] Design deployment pipeline (chính project này)
- [ ] Practice: vẽ diagram, estimate scale, discuss trade-offs

### Go Interview Questions (thường gặp)
- [ ] Goroutine vs Thread
- [ ] Channel buffered vs unbuffered
- [ ] Context package - khi nào dùng, tại sao
- [ ] Interface implicit implementation - lợi ích
- [ ] Slice internal (backing array, len vs cap)
- [ ] Map concurrency safety (sync.Map vs mutex)
- [ ] Defer, panic, recover
- [ ] Garbage collector trong Go (tricolor mark & sweep)
- [ ] `init()` function execution order

### Coding Challenges (Go)
- [ ] LeetCode medium bằng Go (arrays, strings, maps)
- [ ] Implement concurrent-safe cache (goroutine + mutex)
- [ ] Implement rate limiter (token bucket)
- [ ] Implement worker pool pattern

---

## Deliverables

Khi hoàn thành tất cả phases:

| Deliverable | Phase |
|-------------|-------|
| REST API hoàn chỉnh (Go + Gin + PostgreSQL) | 1 |
| Dockerized application (multi-stage build) | 2 |
| Auto-deploy platform (GitHub push → live URL) | 3 |
| Kubernetes deployment + GitOps | 4 |
| Full observability stack (metrics, logs, traces, alerts) | 5 |
| CI/CD pipeline (GitHub Actions) | 3-5 |
| Portfolio project cho interview | All |

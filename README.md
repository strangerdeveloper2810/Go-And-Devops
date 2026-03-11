# Poor Man's Vercel

> Platform-as-a-Service xây dựng từ đầu - Học Go Backend + DevOps qua thực hành

```
┌─────────────────────────────────────────────────────────┐
│                   Poor Man's Vercel                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Web UI    │  │  API Server │  │   Builder   │     │
│  │  (Next.js)  │  │    (Go)     │  │   Worker    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                          │                │             │
│                   ┌──────┴──────┐        │             │
│                   │    Redis    │◄───────┘             │
│                   │   (Queue)   │                       │
│                   └─────────────┘                       │
│                          │                              │
│  ┌─────────────┐  ┌──────┴──────┐  ┌─────────────┐     │
│  │  PostgreSQL │  │   Docker    │  │   Traefik   │     │
│  │  (metadata) │  │   Engine    │  │   (proxy)   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer         | Technology                  |
| ------------- | --------------------------- |
| Backend       | Go (Gin framework)          |
| Database      | PostgreSQL                  |
| Cache/Queue   | Redis                       |
| Proxy         | Traefik                     |
| Container     | Docker                      |
| Orchestration | Kubernetes                  |
| CI/CD         | GitHub Actions + ArgoCD     |
| Monitoring    | Prometheus + Grafana + Loki |
| Frontend      | Next.js                     |

---

## Quick Start

### 1. Prerequisites

```bash
go version         # Go 1.22+
docker --version   # Docker hoặc OrbStack
```

### 2. Start Infrastructure

```bash
cd services/api

# Start PostgreSQL, Redis, Adminer
make docker-up

# Verify containers
docker ps
```

| Service    | URL                   | Mục đích              |
| ---------- | --------------------- | --------------------- |
| PostgreSQL | `localhost:5432`      | Database chính        |
| Redis      | `localhost:6379`      | Cache & Message Queue |
| Adminer    | http://localhost:8081 | Database UI           |

### 3. Run API Server

```bash
cd services/api

go mod tidy    # Download dependencies
make run       # Start server on :8080
```

### 4. Test API

```bash
# Health check
curl http://localhost:8080/health

# List projects
curl http://localhost:8080/api/v1/projects

# Create project
curl -X POST http://localhost:8080/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"my-app","git_url":"https://github.com/user/repo.git","branch":"main"}'

# Get by ID
curl http://localhost:8080/api/v1/projects/<uuid>

# Update
curl -X PUT http://localhost:8080/api/v1/projects/<uuid> \
  -H "Content-Type: application/json" \
  -d '{"name":"updated","git_url":"...","branch":"dev","status":"building"}'

# Delete (soft delete)
curl -X DELETE http://localhost:8080/api/v1/projects/<uuid>
```

---

## Project Structure

```
devops-for-se/
│
├── services/
│   └── api/                              # Go API Server
│       ├── cmd/api/
│       │   └── main.go                   # Entry point + DI wiring
│       ├── internal/
│       │   ├── config/config.go          # Environment variables (.env)
│       │   ├── database/postgres.go      # DB connection (pgx driver)
│       │   ├── handler/
│       │   │   ├── routes.go             # Route registration
│       │   │   ├── health.go             # Health check endpoints
│       │   │   ├── project.go            # Project CRUD handlers
│       │   │   └── response.go           # Response format chuẩn
│       │   ├── model/project.go          # Data structs (Entity)
│       │   ├── service/project.go        # Business logic layer
│       │   └── repository/repository.go  # SQL queries (database layer)
│       ├── Makefile                      # Dev commands
│       ├── .env                          # Environment config
│       └── go.mod / go.sum               # Dependencies
│
├── deployments/
│   └── docker/
│       ├── docker-compose.yml            # PostgreSQL + Redis + Adminer
│       └── init-scripts/
│           └── 001_create_project.sql    # DB schema
│
├── docs/
│   ├── plans/
│   │   └── 2026-01-10-devops-learning-curriculum.md
│   └── theory/                           # Bài học lý thuyết
│       ├── 01-clean-architecture.md
│       ├── 02-go-syntax-basics.md
│       ├── 03-goroutine-channel.md
│       └── 04-project-recap-phase1.md
│
└── README.md
```

---

## Architecture

```
Request → Router → Handler → Service → Repository → PostgreSQL
                                                   ← Response
```

| Layer      | Folder                 | Vai trò                     | So sánh Express/NestJS |
| ---------- | ---------------------- | --------------------------- | ---------------------- |
| Entry      | `cmd/api/main.go`      | DI wiring, start server     | `app.js` / `main.ts`   |
| Handler    | `internal/handler/`    | Parse request, trả response | Controller             |
| Service    | `internal/service/`    | Business logic              | Service                |
| Repository | `internal/repository/` | SQL queries                 | Repository             |
| Model      | `internal/model/`      | Data structs                | Entity / DTO           |

**Dependency flow:** Handler → Service → Repository (mỗi layer chỉ biết layer ngay dưới)

---

## API Endpoints

| Method | Endpoint               | Status | Mô tả               |
| ------ | ---------------------- | ------ | ------------------- |
| GET    | `/health`              | 200    | Health check        |
| GET    | `/ready`               | 200    | Readiness check     |
| GET    | `/api/v1/projects`     | 200    | List all projects   |
| GET    | `/api/v1/projects/:id` | 200    | Get project by ID   |
| POST   | `/api/v1/projects`     | 201    | Create new project  |
| PUT    | `/api/v1/projects/:id` | 200    | Update project      |
| DELETE | `/api/v1/projects/:id` | 204    | Soft delete project |

---

## Commands

### Go Commands

```bash
cd services/api

# --- Module & Dependencies ---
go mod init <module-name>      # Khởi tạo module mới (tạo go.mod)
go mod tidy                    # Dọn dẹp: thêm thiếu, xóa thừa dependencies
go get <package>               # Cài package mới (vd: go get github.com/gin-gonic/gin)
go get <package>@latest        # Update package lên version mới nhất
go get <package>@v1.2.3        # Cài đúng version cụ thể

# --- Build & Run ---
go run ./cmd/api               # Chạy trực tiếp (không tạo binary)
go build ./cmd/api             # Build ra binary
go build ./...                 # Build tất cả packages (check lỗi compile)

# --- Code Quality ---
go fmt ./...                   # Format code (tự động sửa style)
go vet ./...                   # Phát hiện lỗi tiềm ẩn (shadow vars, unused...)
go test ./...                  # Chạy tất cả tests
go test -v ./...               # Chạy tests với output chi tiết
go test -cover ./...           # Chạy tests + báo % coverage

# --- Debug & Info ---
go env                         # Xem tất cả Go environment variables
go env GOPATH                  # Xem 1 biến cụ thể
go list -m all                 # List tất cả dependencies đang dùng
go doc <package>               # Xem docs của package (vd: go doc fmt.Println)
```

### Makefile Commands

```bash
cd services/api

make run           # Chạy server (go run)
make build         # Build binary
make dev           # Live reload (cần air)
make test          # Chạy tests
make fmt           # Format code
make lint          # Lint code
make docker-up     # Start Docker containers
make docker-down   # Stop Docker containers
make docker-logs   # Xem Docker logs
make clean         # Dọn build artifacts
```

### Docker Commands

```bash
# --- Docker Compose (chạy từ root project) ---
docker compose -f deployments/docker/docker-compose.yml up -d       # Start tất cả containers
docker compose -f deployments/docker/docker-compose.yml down        # Stop containers (giữ data)
docker compose -f deployments/docker/docker-compose.yml down -v     # Stop + xóa data (reset DB)
docker compose -f deployments/docker/docker-compose.yml logs -f     # Xem logs realtime
docker compose -f deployments/docker/docker-compose.yml up -d --build  # Rebuild image rồi start

# --- Docker Image ---
docker build -t pmv-api:latest ./services/api                       # Build image từ Dockerfile
docker images                                                       # List tất cả images
docker tag pmv-api:latest pmv-api:1.0.0                             # Tag version cho image
docker rmi <image>                                                  # Xóa image

# --- Docker Container ---
docker ps                      # List containers đang chạy
docker ps -a                   # List tất cả containers (cả stopped)
docker logs <container>        # Xem logs 1 container
docker exec -it <container> sh # Vào shell bên trong container
docker stop <container>        # Stop container
docker rm <container>          # Xóa container
```

---

## Learning Progress

### Phase 1: Go Fundamentals + REST API - DONE

> Xây dựng REST API hoàn chỉnh với Clean Architecture

- [x] **Go Basics** - Variables, types, functions, structs, interfaces, pointers, error handling
- [x] **Gin Framework** - Router, middleware, request/response handling
- [x] **Clean Architecture** - Handler → Service → Repository + Dependency Injection
- [x] **PostgreSQL** - `database/sql` + pgx driver, connection pool
- [x] **Full CRUD** - 5 endpoints với SQL thật (Query, QueryRow, Exec)
- [x] **Docker Compose** - PostgreSQL + Redis + Adminer
- [x] **SQL Migration** - CREATE TABLE với init-scripts
- [ ] Database migrations (golang-migrate)
- [ ] Unit testing
- [ ] JWT Authentication

**Theory docs:**

- [Go Syntax Basics](docs/theory/02-go-syntax-basics.md) - So sánh Go vs JavaScript
- [Clean Architecture](docs/theory/01-clean-architecture.md) - Layers & dependency rule
- [Phase 1 Recap](docs/theory/04-project-recap-phase1.md) - Tổng hợp kiến thức

---

### Phase 2: Containerization - NEXT

> Đóng gói API thành Docker image, chạy full stack trong containers

- [ ] **Dockerfile** - Multi-stage build cho Go API
  - Stage 1: Build binary (Go compiler)
  - Stage 2: Run binary (Alpine/scratch - image nhỏ)
- [ ] **Docker Compose full stack** - API + PostgreSQL + Redis chạy trong containers
- [ ] **Image optimization** - Giảm image size, layer caching
- [ ] **Registry** - Push image lên Docker Hub / GitHub Container Registry
- [ ] **Image tagging** - Semantic versioning, git SHA tags

**Kết quả:** `docker compose up` chạy toàn bộ hệ thống, không cần cài Go trên máy

---

### Phase 3: Build "Poor Man's Vercel"

> Xây dựng platform deploy app tự động - core feature của project

#### 3.1 API Server (mở rộng)

- [ ] JWT Authentication middleware
- [ ] Deployment management (model + CRUD)
- [ ] Webhook endpoints (GitHub webhook trigger build)
- [ ] API tests (unit + integration)

#### 3.2 Builder Worker (Go service mới)

- [ ] Redis queue consumer (nhận build jobs)
- [ ] Git clone service (clone repo từ GitHub)
- [ ] Framework detection (Node.js, Go, Python)
- [ ] Dockerfile generation (tự tạo Dockerfile cho user's app)
- [ ] Docker image building (build image từ user's code)

#### 3.3 Deployer (Go service mới)

- [ ] Container lifecycle management (start, stop, restart)
- [ ] Health checks cho deployed containers
- [ ] Rolling updates (zero-downtime deploy)
- [ ] Route registration với Traefik

#### 3.4 Reverse Proxy (Traefik)

- [ ] Dynamic routing (request → đúng container)
- [ ] Auto SSL với Let's Encrypt
- [ ] Load balancing
- [ ] Dashboard

#### 3.5 Web UI (Next.js)

- [ ] Dashboard - list projects & deployments
- [ ] Real-time deployment logs (WebSocket/SSE)
- [ ] Project settings
- [ ] Deploy button

**Kết quả:** Push code lên GitHub → Webhook trigger → Auto build & deploy → Live URL

---

### Phase 4: Kubernetes

> Di chuyển từ Docker Compose sang Kubernetes cho production

- [ ] **K8s Architecture** - Control plane, nodes, pods
- [ ] **Local cluster** - Kind hoặc Minikube
- [ ] **Workloads** - Deployments, Services, Ingress
- [ ] **Configuration** - ConfigMaps, Secrets
- [ ] **Storage** - PersistentVolumes, StatefulSets (PostgreSQL on K8s)
- [ ] **Helm Charts** - Package K8s manifests
- [ ] **ArgoCD** - GitOps workflow (git push → auto deploy lên K8s)

**Kết quả:** Full GitOps pipeline - push code → CI build image → ArgoCD sync → K8s deploy

---

### Phase 5: Observability

> Monitoring, logging, tracing cho production system

- [ ] **Metrics** - Prometheus + Grafana dashboards
  - Custom Go metrics (request count, latency, error rate)
  - PromQL queries
- [ ] **Logging** - Loki + structured logging
  - Centralized log aggregation
  - LogQL queries
- [ ] **Tracing** - Jaeger/Tempo + OpenTelemetry
  - Distributed tracing across services
  - Trace context propagation
- [ ] **Alerting** - Alert rules, routing, on-call

**Kết quả:** Dashboard real-time cho toàn bộ system, alert khi có vấn đề

---

## Troubleshooting

### Docker containers không start

```bash
# Check containers
docker ps -a

# Check logs
docker compose -f deployments/docker/docker-compose.yml logs

# Reset hoàn toàn (xóa data)
docker compose -f deployments/docker/docker-compose.yml down -v
docker compose -f deployments/docker/docker-compose.yml up -d
```

### Port đã bị chiếm

```bash
# Check process dùng port 5432
lsof -i :5432

# Check process dùng port 8080
lsof -i :8080
```

### API không connect được database

```bash
# 1. Check Docker containers đang chạy
docker ps

# 2. Check database URL trong .env
cat services/api/.env

# 3. Test connect trực tiếp
psql postgres://postgres:postgres@localhost:5432/pmv
```

### go mod lỗi

```bash
cd services/api
go mod tidy
```

### Schema database cũ (sau khi đổi SQL migration)

```bash
# init-scripts chỉ chạy lần đầu → cần xóa volume
cd deployments/docker
docker compose down -v    # Xóa data
docker compose up -d      # Tạo lại từ đầu
```

---

## Resources

**Go:**

- [Go Tour](https://go.dev/tour/) - Interactive tutorial
- [Effective Go](https://go.dev/doc/effective_go) - Best practices
- [Go by Example](https://gobyexample.com/) - Học qua ví dụ

**Docker:**

- [Docker Docs](https://docs.docker.com/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

**Kubernetes:**

- [Kubernetes Docs](https://kubernetes.io/docs/)
- [Learn Kubernetes Basics](https://kubernetes.io/docs/tutorials/kubernetes-basics/)

**Project:**

- [Full Curriculum](docs/plans/2026-01-10-devops-learning-curriculum.md) - Chi tiết từng module
- [Theory Notes](docs/theory/) - Bài học lý thuyết tiếng Việt

# PM Platform

Internal project-management platform combining Jira-like issue tracking, Confluence-like documentation, and AI/MCP integration. A self-hosted replacement for a paid Atlassian subscription, built as an event-driven microservice project for Go + Java backend interview preparation.

## Status

**Phase 1 — Core services** (in progress)

Six backend services are implemented, event-driven, and covered by CI. The system already supports: register/login (JWT), workspaces/projects/members/roles, Jira-style issues (workflow, optimistic locking), Confluence-style spaces/pages, and file upload/download via MinIO — all reachable through the gateway.

| Milestone | State |
|---|---|
| auth · workspace · issue · page · file · api-gateway | ✅ built + merged |
| Kafka event bus + local authz projections | ✅ |
| Backend CI (build/vet/test + lint + buf + Java) | ✅ |
| Agentic coding setup (`.claude/`) | ✅ |
| Frontend (React) | ⏳ contract defined (`web/CLAUDE.md`), code pending |
| ai · mcp-server · realtime · search · notification · report · audit | ⏳ planned |

Target MVP: 5–6 months. Real internal team adoption Q4 2026.

## Project Goals

1. **Real internal use** — replace the team's Jira + Confluence subscription (4–5 → 10–20 users)
2. **Interview prep** — build a credible Go + microservice portfolio for mid-senior backend roles (target: Axon, VNG, ANZ)
3. **AI-native workflow** — deep LLM + MCP integration for daily team operations

## Architecture

Microservices, event-driven, one Postgres with **a private schema per service**. The gateway is the only REST entry point for the frontend: it verifies the JWT via the auth gRPC service, then injects `X-User-ID` / `X-User-Email` so downstream services trust that identity without re-verifying.

```
FE (React) ──REST──► api-gateway ──(reverse proxy + gRPC verify)──► services
                          │  JWTAuth verifies token via auth gRPC, injects X-User-ID / X-User-Email
                          ▼
  auth · workspace · issue · page · file  ──(Kafka events, EventEnvelope)──►  (loose coupling)
```

- **No service queries another service's schema.** Cross-service data goes over gRPC (sync) or a **local projection** built from Kafka events (async, used for authz).
- Services scoped by workspace/project consume `workspace.events` + `auth.user.events` → build `*_projection` tables → check membership **locally**.

### Implemented services

| Service | Stack | HTTP | gRPC | Schema | Role |
|---|---|---|---|---|---|
| api-gateway | Go / Gin | 8000 | 9000 | (Redis) | REST in, reverse proxy + gRPC verify out |
| auth | Go / Gin | 8001 | 9001 | `auth` | register/login (JWT), user directory, VerifyToken |
| workspace | Go / Gin | 8002 | 9002 | `workspace` | workspaces / projects / members / roles |
| issue | **Java / Spring** | 8003 | 9003 | `issue` | Jira core: issues / workflow / sprint / board |
| page | Go / Gin | 8004 | 9004 | `page` | Confluence: spaces / pages |
| file | Go | 8005 | 9005 | `file` | upload / download via MinIO |

**Port scheme**: services HTTP `80xx`, gRPC `90xx`. Infra lives on `91xx` (MinIO S3 `9100`, console `9011`) to avoid colliding with the gRPC range.

### Infrastructure (dev)

- **PostgreSQL 16** — schema-per-service
- **Kafka (KRaft)** — event bus (`EventEnvelope{event_type, workspace_id, actor_id, payload}`)
- **MinIO** — object storage for files
- (Planned) Redis, Elasticsearch, pgvector, OpenTelemetry + Prometheus + Grafana + Loki + Tempo

### Planned services (design)

`ai` (Claude + DeepSeek router, RAG), `mcp-server`, `realtime` (WebSocket), `search` (Elasticsearch), `notification`, `report`, `audit`, and a `collab-server` (Hocuspocus + Yjs) for collaborative editing. See the design doc for the full 14-service vision.

## Tech Stack

### Backend
- **Go 1.25** — Gin, gRPC, `database/sql` + pgx, golang-migrate, segmentio/kafka-go
- **Java 17** — Spring Boot 3.3, Spring Data JPA, Flyway, Spring Kafka, `@Version` optimistic locking
- **Proto** — buf (source in `proto/`, generated Go in `packages/proto-go/`)

### Frontend (planned)
- React 19, rsbuild, TypeScript strict; React Router v7, TanStack Query v5, Zustand
- TipTap + Yjs (collaborative editing); shadcn/ui + Tailwind CSS v4; Biome

### Communication
- **Sync**: REST (FE ↔ BE), gRPC + Protobuf (BE ↔ BE)
- **Async**: Kafka (at-least-once consumers, `RequireAll` producers)

## Repository Structure

```
.
├── services/                    # one Go module (go.mod) per service, or Maven (issue)
│   ├── api-gateway/  auth/  workspace/  page/  file/   # Go
│   ├── issue/                                          # Java / Spring (Maven)
│   └── CLAUDE.md                                       # backend conventions (agent + human)
├── packages/proto-go/           # Go code generated from proto (buf generate)
├── proto/pm/v1/                 # proto source (auth, workspace, issue, common)
├── infra/dev/docker-compose.yml # postgres + kafka + minio
├── scripts/*-integration-smoke.sh   # E2E smoke tests (run manually)
├── web/CLAUDE.md                # frontend conventions + API contract
├── docs/plans/                  # design docs + implementation plans
├── docs/theory/                 # learning notes (Vietnamese)
├── .github/workflows/backend-ci.yml
├── .claude/                     # agentic coding config (see below)
└── CLAUDE.md                    # root conventions + architecture
```

## Development

### Prerequisites
- Docker + Docker Compose (**OrbStack** recommended on macOS — lighter/more stable)
- Go 1.25+
- Java 17 (Temurin) + Maven (for issue-service)
- Buf CLI (Protobuf tooling)

### Build & test (module-mode, like CI/prod)

`go.work` is dev-only; CI and prod build each module in isolation with `GOWORK=off`, so verify that way:

```bash
# One Go service
GOWORK=off go -C services/<svc> build ./...
GOWORK=off go -C services/<svc> vet ./...
gofmt -l services/<svc>            # must be empty (except *.pb.go)
go   -C services/<svc> test ./...

# Java issue-service
JAVA_HOME=/opt/homebrew/opt/openjdk@17 mvn -f services/issue/pom.xml -DskipTests package

# Proto (after editing a .proto)
cd proto && buf lint && buf generate
```

### Run infra

```bash
docker compose -f infra/dev/docker-compose.yml up -d postgres kafka minio
```

### E2E smoke (manual)

Full E2E (multiple services + Kafka) is expensive and timing-flaky, so it runs **manually**, not on every PR:

```bash
bash scripts/page-integration-smoke.sh   # needs infra up
```

## Agentic Coding (`.claude/`)

This repo is set up for **hybrid development** — Claude generates code and a human writes code by hand, both following the same conventions. Config is committed (shared); only local overrides are gitignored.

- **Hierarchical `CLAUDE.md`** — root + `services/CLAUDE.md` (backend) + `web/CLAUDE.md` (frontend), auto-loaded by directory.
- **`.claude/agents/`** — specialized subagents: `backend-reviewer`, `frontend-reviewer` (adversarial review), `test-author` (integration/unit tests).
- **`.claude/commands/`** — slash commands you trigger deliberately: `/new-service`, `/add-endpoint`, `/review`, `/e2e`, PR lifecycle (`/create-pr`, `/review-pr`, `/merge-pr`), and `/ship` (orchestrator: verify → review BE/FE in parallel → write tests → open PR).
- **`.claude/skills/`** — model-invoked capabilities auto-loaded when relevant, e.g. `create-migration`.
- **`.claude/hooks/`** — `guard-bash` (block destructive commands), `session-context` (inject branch state), auto-`gofmt` on save.

> **Command vs skill**: a **command** is a human-triggered entrypoint (you type `/ship` — best for actions with side effects like merging). A **skill** is a capability Claude loads on its own when the context matches (e.g. it applies migration conventions automatically while writing SQL). PR/merge actions stay commands on purpose so nothing runs a merge without an explicit trigger.

## CI (`.github/workflows/backend-ci.yml`)

Every PR runs, per Go module: `gofmt` + `vet` + `build` + `test -race` (module-mode), plus `golangci-lint` (advisory), `buf lint`, and Java `mvn verify`. E2E is a **manual** (`workflow_dispatch`) job — not a per-PR gate. Code must pass `GOWORK=off -mod=readonly build + vet` + `gofmt` before pushing (`go.work` can hide breakage — run the real check).

## Conventions

- **Frontend**: arrow function by default; regular `function` only when `this` binding is required.
- **Backend Go**: `gofmt` + `golangci-lint`; Clean Architecture (`handler → service → repository`), DI via constructors.
- **Backend Java**: Spring Boot defaults; Flyway owns the schema.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, …).
- **Comment language**: Vietnamese for domain/business logic, English for boilerplate.
- **Docs**: theory notes (`docs/theory/`) in Vietnamese; UI Vietnamese-first.

See [`CLAUDE.md`](CLAUDE.md) for the full mandatory patterns (Kafka producer/consumer rules, gateway proxy, migrations, audit lessons) and [`docs/plans/2026-05-24-pm-platform-design.md`](docs/plans/2026-05-24-pm-platform-design.md) for the full system design.

## License

Internal project, not licensed for external distribution.

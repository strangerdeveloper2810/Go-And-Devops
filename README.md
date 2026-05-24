# PM Platform

Internal project management platform combining Jira-like issue tracking, Confluence-like documentation, and AI/MCP integration. Self-hosted replacement for paid Atlassian subscription, built as a microservice learning project for Go + Java backend interview preparation.

## Status

**Phase 0 — Foundation** (in progress, started May 2026)

Target MVP: 5-6 months. Real internal team adoption Q4 2026.

## Project Goals

1. **Real internal use**: Replace team's Jira + Confluence subscription (4-5 users → 10-20 users)
2. **Interview prep**: Build credible Go + microservice portfolio for mid-senior backend roles (target: Axon, VNG, ANZ — CV submission June-August 2026)
3. **AI-native workflow**: Deep integration of LLM and MCP server for daily team operations

## Architecture

**14 services**:

| Layer | Services |
|---|---|
| Edge | Traefik (TLS, routing) |
| Gateway | api-gateway (Go) |
| Core (Go) | auth, workspace, page, file, ai, mcp-server, realtime |
| Core (Java) | issue, search, notification, report, audit |
| Collab (Node) | collab-server (Hocuspocus + Yjs) |
| Frontend | React 19 + rsbuild + TypeScript |

**Infrastructure**:
- PostgreSQL 16 (schema-per-service) + pgvector
- Redis (cache, session, pub/sub)
- Kafka KRaft (event bus)
- Elasticsearch 8 (search)
- MinIO (object storage)
- OpenTelemetry + Prometheus + Grafana + Loki + Tempo

**AI providers**: Anthropic Claude (reasoning) + DeepSeek (cheap bulk) with cost budget and prompt caching.

## Tech Stack Summary

### Backend
- **Go**: Gin, gRPC, pgx + sqlc, golang-migrate, segmentio/kafka-go, OpenTelemetry
- **Java**: Spring Boot 3.x (Java 21), Spring Data JPA, Flyway, Spring Kafka, Spring Data Elasticsearch
- **Node**: Hocuspocus (TipTap's official Yjs server)

### Frontend
- React 19, rsbuild, TypeScript strict
- React Router v7, TanStack Query v5, Zustand
- TipTap + Yjs (collaborative editing)
- shadcn/ui + Tailwind CSS v4
- Biome (lint + format)

### Communication
- **Sync**: REST (FE↔BE), gRPC + Protobuf (BE↔BE)
- **Async**: Kafka with Avro/Protobuf schemas (Schema Registry)
- **Realtime**: WebSocket (general events via Redis pub/sub, Yjs binary via Hocuspocus)

### Tooling
- Monorepo: Turborepo
- CI/CD: GitHub Actions
- Container registry: GHCR
- Pre-commit: lefthook + commitlint

## Repository Structure

```
.
├── docs/
│   ├── plans/                                          # Design docs and roadmap
│   │   ├── 2026-05-24-pm-platform-design.md           # Full system design (9 sections)
│   │   └── 2026-01-10-devops-learning-curriculum.md   # Original learning curriculum (reference)
│   └── theory/                                         # Conceptual learning notes
│       ├── 01-clean-architecture.md
│       ├── 02-go-syntax-basics.md
│       ├── 03-goroutine-channel.md
│       ├── 04-project-recap-phase1.md
│       └── 05-dockerfile-multi-stage.md
└── (services + frontend coming in Phase 0)
```

## Roadmap

| Phase | Duration | Focus |
|---|---|---|
| 0 — Foundation | 2-3w | Monorepo, infra (docker compose), service skeletons, observability |
| 1 — Core CRUD | 4-5w | Auth, workspace, issue, page (no realtime/AI) |
| 2 — Realtime + Editor | 3-4w | Hocuspocus collab, TipTap+Yjs, Kanban board with WebSocket |
| 3 — Search + Notification | 3w | Elasticsearch indexing, email + Zalo bot |
| 4 — AI + MCP | 3-4w | Claude+DeepSeek router, RAG, MCP server for Claude Code/Cursor |
| 5 — Report + Audit + Polish | 2-3w | Burndown, velocity, audit log dashboard |
| 6 — Migration + Cutover | 2-3w | Jira/Confluence import tool, real team switch |

**Total**: 18-21 weeks.

See [`docs/plans/2026-05-24-pm-platform-design.md`](docs/plans/2026-05-24-pm-platform-design.md) for full design including data architecture, communication patterns, AI integration details, and migration strategy.

## Development

### Prerequisites (Phase 0+)
- Docker + Docker Compose (OrbStack on macOS recommended)
- Go 1.22+
- Java 21 (Temurin or GraalVM)
- Node.js 20+ with pnpm
- Buf CLI (Protobuf tooling)

### Quick Start

Pending Phase 0 completion. Will be:

```bash
pnpm install
docker compose -f infra/docker-compose.dev.yml up -d
pnpm turbo dev
```

## Conventions

### Code Style
- Frontend: Arrow function default; regular `function` only when `this` binding is required
- Backend Go: Standard `gofmt` + `golangci-lint`
- Backend Java: Spring Boot defaults + Checkstyle
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)

### Documentation Language
- Code comments: English
- Theory notes (`docs/theory/`): Vietnamese
- User-facing UI: Vietnamese default, English secondary

## License

Internal project, not licensed for external distribution.

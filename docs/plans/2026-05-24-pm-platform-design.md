# Project Management Platform — Design Document

**Date**: 2026-05-24
**Author**: Ethan Nguyen
**Status**: Design approved, ready for implementation

---

## 1. Overview & Scope

### Project

**Name**: Project Management Platform (PM Platform)

**Purpose**:
- Internal tool for managing tasks (Jira-like) + documentation (Confluence-like) + AI/MCP integration
- Operate internal team of 4-5 → 10-20 people
- Serve learning goal for mid-senior Go/microservice interview prep (Axon, VNG, ANZ), target CV submission June 2026

**Replaces**: Current Jira + Confluence subscription (cost cutting + AI integration)

### Scope MVP (5-6 months)

**Issue module (Jira-like)**:
- Workspace + Project + Sprint (2-week) + Board (Kanban + Scrum)
- Issue: Epic, Story, Task, Bug, Subtask + custom type
- Custom field, custom workflow (6 status: Backlog → To Do → In Progress → Code Review → QA → Done)
- Story point estimation, label, assignee, reporter
- Comment + @mention, attachment, issue link (blocks, relates, duplicates)

**Page module (Confluence-like)**:
- Space + Page hierarchy (parent/child tree)
- Rich text editor (TipTap), markdown, code block, table
- Embed image/file, Mermaid diagram, Jira issue link
- Page version, template (meeting note, retro, RFC)
- Real-time collaborative editing (Yjs CRDT + Hocuspocus)
- Comment + @mention

**Common module**:
- Auth: email+password + Google OAuth + email invite flow
- Role per project/space, custom permission matrix
- Notification: in-app + email + Zalo bot + AI daily digest
- Search: full-text issue + page (Postgres FTS phase 1, Elasticsearch phase 2)
- File: attachment via MinIO

**AI + MCP module**:
- Create issues from natural language
- Auto-summarize sprint, smart suggest (assignee/point/priority)
- Generate docs (PRD, RFC, retro)
- Q&A RAG over Confluence pages
- Translate Vietnamese ↔ English
- Auto-link related issues/pages
- Daily digest to Zalo + email
- MCP server: expose data + create/update from Claude Code/Cursor

**Migration module**:
- Import from Jira + Confluence (REST API + export files)
- Full migrate: issues, comments, attachments, pages, history

**Report + Audit module**:
- Burndown chart, velocity chart, sprint stats
- Audit log all actions (Kafka event consumer)

**Phase 2+ (out of MVP)**:
- React Native mobile app
- Webhook integration with GitHub/GitLab
- Advanced report dashboard
- Public API for 3rd party

### Non-goals (explicitly not in MVP)

- SaaS multi-tenant for external customers (self-host only)
- Billing / subscription system
- Marketplace plugin system
- Mobile native app
- Public API for 3rd party (only MCP internal)

### Constraints

- Local development for 5-6 months → deploy to 4GB VPS (upgrade if needed)
- 2 backend stacks: Go + Java (microservice)
- 1 frontend stack: React + rsbuild + TypeScript
- Real internal use → uptime important but not 99.99%

---

## 2. Service Architecture

### 14 Services + Stack Distribution

```
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (React + rsbuild)                  │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS / WSS
                  ┌────────▼────────┐
                  │  Traefik (TLS)  │  Edge: SSL, route, LB
                  └────────┬────────┘
                           │
                  ┌────────▼─────────┐
                  │ API Gateway (Go) │  JWT verify, rate limit, audit
                  └────────┬─────────┘
                           │ gRPC (sync) / Kafka (async)
   ┌───────────────────────┼───────────────────────────────┐
   │                       │                               │
┌──▼────┐  ┌────────┐  ┌──▼──────┐  ┌────────┐  ┌────────┐
│ auth  │  │workspace│  │ issue  │  │  page  │  │ search │
│ (Go)  │  │ (Go)   │  │(Java)  │  │  (Go)  │  │ (Java) │
└───────┘  └────────┘  └────────┘  └────────┘  └────────┘
┌───────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌─────────┐
│notify │  │  file  │  │   ai   │  │  mcp   │  │ collab  │
│(Java) │  │ (Go)   │  │  (Go)  │  │ (Go)   │  │ (Node)  │
└───────┘  └────────┘  └────────┘  └────────┘  └─────────┘
┌─────────┐  ┌───────┐  ┌────────┐
│realtime │  │report │  │ audit  │
│  (Go)   │  │(Java) │  │ (Java) │
└─────────┘  └───────┘  └────────┘
```

### Service Responsibility Matrix

| # | Service | Stack | DB | Sync API | Consume Events | Produce Events |
|---|---|---|---|---|---|---|
| 1 | api-gateway | Go/Gin | Redis cache | REST in, gRPC out | - | - |
| 2 | auth | Go/Gin | Postgres `auth` | gRPC | - | `user.created`, `user.invited` |
| 3 | workspace | Go/Gin | Postgres `workspace` | gRPC | `user.created` | `workspace.*`, `member.*`, `role.*` |
| 4 | issue | Java/Spring | Postgres `issue` | gRPC | `workspace.*` | `issue.*`, `sprint.*`, `comment.*` |
| 5 | page | Go/Gin | Postgres `page` | gRPC + WS | `workspace.*` | `page.*`, `page.commented` |
| 6 | search | Java/Spring | Elasticsearch | gRPC | `issue.*`, `page.*`, `comment.*` | - |
| 7 | notification | Java/Spring | Postgres `notification` | gRPC | `*.*` (relevant subset) | `notification.delivered` |
| 8 | file | Go | Postgres `file` + MinIO | REST + gRPC | - | `file.uploaded` |
| 9 | ai | Go | Postgres `ai` + pgvector | gRPC | `page.updated` (re-embed) | `ai.task.completed` |
| 10 | mcp-server | Go | - (gRPC to others) | MCP protocol (stdio/SSE) | - | - |
| 11 | realtime | Go | Redis (pub/sub) | WebSocket | `*.changed` (broadcast) | - |
| 12 | report | Java/Spring | Postgres `report` + cache | gRPC | `issue.*`, `sprint.*` | - |
| 13 | audit | Java/Spring | Postgres `audit` (append-only) | gRPC (query) | `*.*` (all events) | - |
| 14 | collab-server | Node.js (Hocuspocus) | Postgres `page` (yjs_state) | WebSocket (Yjs binary) | - | `page.collab.changed` |

**Stack distribution**: Go 8, Java 5, Node 1.

### Rationale per Stack Choice

**Go** (real-time, gateway, high concurrency, AI streaming):
- api-gateway, auth, workspace, page (Yjs WebSocket bridge), file, ai, mcp-server, realtime

**Java** (enterprise CRUD, JVM ecosystem strength):
- issue (custom field/workflow Jira-like = type system Java good fit)
- search (Elasticsearch native)
- notification (cron + email + Spring Scheduler)
- report (aggregation + Spring Data JPA)
- audit (immutable log + JPA)

**Node.js** (Yjs ecosystem):
- collab-server (Hocuspocus, TipTap team's official server)

---

## 3. Tech Stack Detail

### Backend - Go services

| Concern | Library |
|---|---|
| HTTP framework | Gin |
| gRPC | `google.golang.org/grpc` + `protoc-gen-go` |
| Protobuf | Buf (`buf build`, `buf lint`) |
| ORM/SQL | `pgx` + `sqlc` (type-safe, no runtime ORM) |
| Migration | `golang-migrate/migrate` |
| Validation | `go-playground/validator` |
| Config | `spf13/viper` |
| Logging | `log/slog` JSON structured |
| Tracing | `go.opentelemetry.io/otel` |
| Auth/JWT | `golang-jwt/jwt/v5` |
| Kafka client | `segmentio/kafka-go` or `confluent-kafka-go` |
| Redis client | `redis/go-redis/v9` |
| WebSocket | `coder/websocket` |
| Test | stdlib `testing` + `testify` + `testcontainers-go` |
| MinIO client | `minio/minio-go/v7` |
| MCP SDK | `mark3labs/mcp-go` |
| AI SDK | Anthropic + DeepSeek REST direct or `tmc/langchaingo` |

### Backend - Java services

| Concern | Library |
|---|---|
| Framework | Spring Boot 3.x (Java 21 LTS) |
| Build | Gradle Kotlin DSL |
| gRPC | `grpc-spring-boot-starter` |
| ORM | Spring Data JPA + Hibernate |
| Migration | Flyway |
| Validation | Jakarta Bean Validation |
| Config | Spring `application.yml` + profiles |
| Logging | Logback JSON encoder |
| Tracing | Micrometer + OpenTelemetry |
| Kafka client | Spring Kafka |
| Elasticsearch | Spring Data Elasticsearch + ES Java Client |
| Redis | Spring Data Redis (Lettuce) |
| Test | JUnit 5 + Testcontainers + Spring Boot Test |
| Email | Spring Mail (JavaMail) |
| Scheduler | Spring `@Scheduled` |

### Frontend

| Concern | Choice |
|---|---|
| Framework | React 19 |
| Bundler | rsbuild (Rspack-based) |
| Language | TypeScript strict |
| Routing | React Router v7 (data router mode) |
| Server state | TanStack Query v5 |
| Client state | Zustand |
| Form | React Hook Form + Zod |
| UI kit | shadcn/ui + Radix primitives + Tailwind CSS v4 |
| Icons | Lucide React |
| Editor (Page) | TipTap + Yjs collab extension |
| Markdown render | `react-markdown` + remark/rehype |
| Diagram | Mermaid + `excalidraw` embed |
| WebSocket | native + thin wrapper |
| HTTP | `ky` |
| i18n | `i18next` + `react-i18next` (vi default, en secondary) |
| Test | Vitest + Testing Library + MSW |
| Lint/format | Biome |
| Function style | Arrow function default, regular `function` only when `this` binding needed |

### Infrastructure

| Concern | Tool |
|---|---|
| Container | Docker + Docker Compose (dev), Docker Swarm or K3s (prod later) |
| Reverse proxy | Traefik v3 (TLS auto, label-config) |
| Database | PostgreSQL 16 (1 instance, schema-per-service) |
| Cache | Redis 7 |
| Search | Elasticsearch 8 (Java service) |
| Object storage | MinIO (S3-compatible) |
| Event bus | Kafka (KRaft mode) + Kafka UI |
| Schema registry | Confluent Schema Registry (Avro/Protobuf) |
| Migration tools | golang-migrate (Go), Flyway (Java) |
| Observability | Prometheus + Grafana + Loki (log) + Tempo (trace) |
| API gateway | Traefik (edge) + Custom Go gateway (BFF logic) |

### Dev tooling

| Concern | Tool |
|---|---|
| Monorepo manager | Turborepo |
| Pre-commit | lefthook |
| Commit lint | commitlint + Conventional Commits |
| CI/CD | GitHub Actions |
| Container registry | GHCR (GitHub Container Registry) |
| Secret | `.env` local + Doppler/Infisical (prod) |
| API docs | OpenAPI 3.1 + gRPC reflection |

---

## 4. Data Architecture

### Postgres - Schema per Service

1 Postgres instance, each service owns a schema with separate DB user. Services MUST NOT query cross-schema. Cross-data access happens via gRPC or Kafka events.

```
pmdb (Postgres 16)
├── auth          schema (owner: auth_user)
├── workspace     schema
├── issue         schema
├── page          schema
├── file          schema
├── ai            schema (+ pgvector extension)
├── notification  schema
├── report        schema
├── audit         schema
└── public        (extensions only)
```

### Key Tables per Service

#### `auth` schema
```sql
users (id, email, password_hash, name, avatar_url, status, ...)
oauth_accounts (user_id, provider, provider_uid, refresh_token, ...)
invites (id, email, workspace_id, role, token, expires_at, status, ...)
sessions (id, user_id, refresh_token_hash, user_agent, ip, expires_at, ...)
password_resets (user_id, token_hash, expires_at, ...)
```

#### `workspace` schema
```sql
workspaces (id, slug, name, owner_id, plan, ...)
workspace_members (workspace_id, user_id, role_id, joined_at, ...)
projects (id, workspace_id, key, name, lead_id, ...)
spaces (id, workspace_id, key, name, owner_id, ...)
roles (id, workspace_id, name, scope, permissions JSONB, is_system, ...)
project_members (project_id, user_id, role_id, ...)
space_members (space_id, user_id, role_id, ...)
```

#### `issue` schema (Java)
```sql
issue_types (id, project_id, key, name, icon, is_subtask, ...)
workflows (id, project_id, name, states JSONB, transitions JSONB, ...)
custom_fields (id, project_id, key, name, type, config JSONB, ...)
field_screens (id, project_id, issue_type_id, field_layout JSONB, ...)

issues (
  id, project_id, key, type_id, summary, description,
  status, priority, assignee_id, reporter_id,
  parent_id, sprint_id, story_points, labels TEXT[],
  due_date, created_at, updated_at, ...
)
issue_field_values (issue_id, field_id, value JSONB)
issue_links (id, from_issue_id, to_issue_id, link_type)
issue_attachments (id, issue_id, file_id, uploaded_by, ...)
comments (id, issue_id, author_id, body, body_html, mentions BIGINT[], ...)
watchers (issue_id, user_id)

sprints (id, project_id, name, goal, state, start_date, end_date, ...)
sprint_issues (sprint_id, issue_id, position)
boards (id, project_id, type, columns JSONB, filter JSONB, ...)
```

#### `page` schema
```sql
pages (
  id, space_id, parent_id, title, slug,
  yjs_state BYTEA,            -- Yjs Y.Doc binary
  content_html TEXT,          -- snapshot HTML for search/preview
  content_text TEXT,          -- plain text for FTS
  author_id, current_version, ...
)
page_versions (id, page_id, version, yjs_snapshot BYTEA, html, author_id, created_at)
page_comments (id, page_id, anchor_path TEXT, body, author_id, ...)
page_attachments (page_id, file_id, ...)
page_templates (id, space_id, name, yjs_state BYTEA, ...)
page_labels (page_id, label)
```

#### `file` schema
```sql
files (id, owner_id, workspace_id, name, mime, size, s3_key, s3_bucket, etag, ...)
file_acl (file_id, user_id, permission)
```

#### `ai` schema (+ pgvector)
```sql
CREATE EXTENSION vector;

embeddings (
  id, source_type ENUM('page','issue','comment'),
  source_id, chunk_idx, content TEXT,
  embedding vector(1536),
  model VARCHAR, updated_at, ...
)
ai_jobs (id, user_id, type, status, input JSONB, output JSONB,
  tokens_in, tokens_out, cost_usd, ...)
ai_chats (id, user_id, title, ...)
ai_messages (id, chat_id, role, content, metadata JSONB, ...)
mcp_audit (id, user_id, tool, input JSONB, output JSONB, called_at)
```

#### `notification` schema (Java)
```sql
notifications (id, user_id, type, title, body, link, read_at, created_at, ...)
notification_preferences (user_id, channel, type, enabled)
email_outbox (id, to_email, subject, body_html, status, retry_count, ...)
zalo_outbox (id, to_user_id, payload JSONB, status, ...)
digest_schedules (user_id, time, timezone, enabled)
```

#### `report` schema (Java)
```sql
sprint_stats_daily (sprint_id, snapshot_date, total_points, done_points, ...)
velocity_history (project_id, sprint_id, completed_points, ...)
user_activity_daily (user_id, date, issues_completed, comments_added, ...)
```

#### `audit` schema (Java)
```sql
audit_events (
  id BIGSERIAL,
  event_id UUID,
  event_type VARCHAR,
  actor_id BIGINT,
  workspace_id BIGINT,
  resource_type VARCHAR,
  resource_id VARCHAR,
  before JSONB,
  after JSONB,
  metadata JSONB,
  occurred_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ
)
-- append-only, partition by month, INSERT only
```

### Elasticsearch Indices

```
pm-issues-v1       # issue + comments
pm-pages-v1        # page + page comments
pm-users-v1        # user directory for mention
pm-attachments-v1  # filename + extracted text
```

Sync mechanism: Kafka consumer in search-service listens to `issue.*`, `page.*` events and upserts/deletes into ES.

### Redis Usage

| Key pattern | Purpose | TTL |
|---|---|---|
| `session:{token}` | Session cache | 24h |
| `ratelimit:{user_id}:{endpoint}` | API rate limit | 1m sliding |
| `cache:board:{board_id}` | Board view cache | 5m, invalidate on event |
| `presence:{workspace_id}` (Set) | Online users | heartbeat 30s |
| `realtime:sub:{user_id}` (pub/sub) | Push to user's WS | - |
| `lock:page:{page_id}` | Distributed lock | 30s |

### MinIO Buckets

```
pm-attachments      # User upload files
pm-avatars          # User avatar
pm-page-images      # Image in page content
pm-exports          # Export PDF, CSV
pm-backups          # DB backup (cron job)
```

### Vector Store

**pgvector inside Postgres `ai` schema** (no separate Pinecone/Weaviate). Phase 2 migrate to Qdrant if vector count > 1M.

### Backup Strategy

| Component | Strategy | Frequency |
|---|---|---|
| Postgres | `pg_dump` → MinIO `pm-backups` | Daily 3AM |
| MinIO | Replication → second VPS or Backblaze B2 | Daily |
| Elasticsearch | Snapshot → MinIO | Daily |
| Kafka | Retention 7 days, no backup (event replay from source) | - |
| Redis | RDB snapshot every 1h | Hourly |

---

## 5. Communication Patterns

### 1. Synchronous (request/response)

**FE → BE: REST / JSON**
- Edge: Traefik handles HTTPS, routes `/api/v1/*` to api-gateway
- api-gateway: verifies JWT, injects `X-User-Id` header, rate limits via Redis, forwards
- Format: REST, JSON, OpenAPI 3.1 contract

**BE service → BE service: gRPC + Protobuf**
- Schema definitions in `proto/` (monorepo)
- Buf generates Go + Java code
- mTLS optional phase 1, mandatory phase 2
- Default timeout 5s, deadline propagation
- Retry policy: idempotent calls 3 retries with exponential backoff
- Service discovery phase 1: Docker DNS (`auth-service:50051`)
- Service discovery phase 2: Consul / k8s service

Example gRPC contract:
```protobuf
service WorkspaceService {
  rpc GetWorkspace(GetWorkspaceRequest) returns (Workspace);
  rpc CheckPermission(CheckPermissionRequest) returns (CheckPermissionResponse);
  rpc ListMembers(ListMembersRequest) returns (ListMembersResponse);
}
```

### 2. Asynchronous (event-driven) — Kafka

**Topic strategy**

| Topic | Partitions | Retention | Producer | Consumer |
|---|---|---|---|---|
| `auth.user.events` | 6, key=user_id | 30d | auth | workspace, notification, audit |
| `workspace.events` | 6, key=workspace_id | 30d | workspace | issue, page, audit, notification |
| `issue.events` | 12, key=workspace_id | 30d | issue | search, notification, report, audit, ai |
| `page.events` | 12, key=workspace_id | 30d | page, collab | search, notification, audit, ai |
| `comment.events` | 6, key=workspace_id | 30d | issue, page | notification, audit, search |
| `file.events` | 3, key=workspace_id | 7d | file | audit |
| `notification.events` | 3 | 7d | notification | audit |
| `ai.events` | 3 | 7d | ai | audit |

Partition key strategy: `workspace_id` → all events of one workspace go to one partition → ordering guarantee per workspace.

**Event envelope schema**
```protobuf
message EventEnvelope {
  string event_id = 1;
  string event_type = 2;
  string event_version = 3;
  int64  workspace_id = 4;
  int64  actor_id = 5;
  google.protobuf.Timestamp occurred_at = 6;
  string trace_id = 7;
  bytes  payload = 8;
  map<string, string> metadata = 9;
}
```

**Reliability patterns**

| Pattern | Applied where |
|---|---|
| Outbox pattern | issue, page, workspace: insert event into `outbox` table within transaction, debezium/cron pushes to Kafka |
| Idempotency key | Consumers track `event_id` processed in `processed_events` table (notification, search, audit) |
| DLQ | Topic `*.dlq` for events that fail consumption > N times |
| Replay | audit-service can consume from offset 0 to rebuild state |

### 3. Realtime — WebSocket

**Path A: General realtime** (board update, notification, comment, presence)
- Service: realtime-service (Go)
- FE connects: `wss://app.example.com/ws?token=<jwt>`
- Per user session, subscribes topics: `workspace:{id}`, `project:{id}`, `board:{id}`, `user:{id}`
- Backend pushes via Redis pub/sub:
  ```
  notification-service → Redis PUBLISH user:42 {...}
  realtime-service     → SUBSCRIBE user:* → push to user 42 WS clients
  ```
- Multi-instance: multiple realtime pods subscribe Redis → any pod with active user connection delivers

**Path B: Collab edit** (Yjs binary)
- Service: collab-server (Hocuspocus Node)
- FE connects: `wss://app.example.com/collab/{page_id}?token=<jwt>`
- Hocuspocus manages Yjs awareness + sync protocol
- Persistence: `onStoreDocument` hook → INSERT/UPDATE `pages.yjs_state` Postgres
- On change: produce Kafka `page.collab.changed` → page-service creates version snapshot, search index, audit log
- Authorize: `onAuthenticate` hook → gRPC `workspace-service.CheckPermission`

### Cross-cutting

**Tracing**: W3C `traceparent` header propagated via HTTP, gRPC, Kafka headers. OpenTelemetry → Tempo. 1 trace = full path FE → gateway → service → DB → Kafka → consumer.

**Logging**: JSON structured, all logs include `trace_id`, `workspace_id`, `user_id`. Shipped to Loki via Promtail/Vector.

**Metrics**: Per service `*_requests_total`, `*_request_duration_seconds`, `kafka_consumer_lag`, `grpc_*`. Prometheus scrape → Grafana dashboards.

---

## 6. AI + MCP Integration

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  AI Service (Go)                     │
│  Provider Router                                    │
│    ├── Claude (Anthropic) — reasoning, complex     │
│    ├── DeepSeek — cheap bulk, code task            │
│    └── Fallback chain + cost budget per workspace  │
│                                                     │
│  Use case handlers                                 │
│  ├── IssueGenerator (NL → issue)                   │
│  ├── SprintSummarizer                              │
│  ├── SmartSuggester (assignee/point/priority)      │
│  ├── DocGenerator (PRD, RFC, retro)                │
│  ├── RAGQuery (Q&A over Conf pages)                │
│  ├── Translator (Vi ↔ En)                          │
│  ├── DailyDigest (cron → Zalo + email)             │
│  └── AutoLinker (suggest related issue/page)       │
│                                                     │
│  Pipeline primitives                               │
│  ├── PromptCache (Redis, key=hash(prompt+ctx))     │
│  ├── Embedder (DeepSeek/OpenAI embedding API)      │
│  ├── Retriever (pgvector ANN search)               │
│  ├── Reranker (cross-encoder, optional)            │
│  ├── ContextBuilder (chunk + dedupe + budget)      │
│  └── ToolCaller (function call → gRPC svc)         │
└─────────────────────────────────────────────────────┘
```

### Use Case Details

**Create issue from natural language**

Input: `"create 5 tasks for login feature: form UI, validation, API call, error handling, e2e test"`

Flow:
1. AI service receives request via api-gateway
2. Claude function calling with `create_issue` tool
3. Claude returns 5 tool_use blocks
4. AI service executes each → gRPC `IssueService.CreateIssue`
5. Returns list of created issues
6. FE refreshes board

System prompt includes project context (current sprint, team members, issue types, custom fields).

**Sprint summarize / daily digest**

Cron schedule (Spring `@Scheduled` in notification-service):
- 6PM daily: triggers digest for workspaces with opted-in users
- notification-service publishes Kafka `digest.requested`
- ai-service consumes → generates summary → pushes via Zalo bot + email

Context build:
- Query issue-service: completed today, in-progress, blocked
- Query page-service: pages edited today
- Build prompt with template "Today's standup digest..."
- Claude reasoning → format markdown
- Push via notification-service

**RAG Q&A over Confluence pages**

Indexing (async, consumer of `page.events`):
1. Page created/updated → ai-service consumes event
2. Extract text from Yjs/HTML → chunk 500-1000 tokens with overlap 100
3. Embed chunks via DeepSeek embedding API or OpenAI text-embedding-3-small
4. Upsert into `embeddings` table (pgvector)

Query:
1. User asks: "What's the team's release process?"
2. Embed query
3. pgvector ANN: `SELECT * FROM embeddings WHERE workspace_id=? ORDER BY embedding <=> $query LIMIT 20`
4. Optional rerank top-20 → top-5
5. Build prompt with context + question
6. Claude reasoning → answer with cited page links

Permission filter: vector query includes `WHERE workspace_id = ? AND space_id IN (user's accessible spaces)`.

**Smart suggest (assignee, story point)**

When user creates issue, FE requests AI suggestion:
- Past assignment data (similar issues assigned to whom)
- Current workload (in-progress issues per user)
- Claude/DeepSeek with context → top 3 candidates
- Story point: reference similar past issues, average point

### MCP Server

**Goal**: Developer in Claude Code/Cursor queries/creates issues, pages without leaving IDE.

**Stack**: `mark3labs/mcp-go`

**Transport**:
- `stdio` (Claude Code local)
- `sse` (HTTP-based, for Cursor + remote)

**Tools exposed**:
```
# Read
list_workspaces()
list_projects(workspace_id)
list_sprints(project_id, state="active")
get_issue(issue_key)
search_issues(query, jql)
search_pages(query, space_id)
get_page(page_id)
list_my_assigned_issues(status_in=[...])

# Write
create_issue(project_key, type, summary, description, assignee, sprint_id)
update_issue(issue_key, fields)
transition_issue(issue_key, status)
add_comment(issue_key, body)
create_page(space_id, parent_id, title, markdown)
update_page(page_id, markdown)
add_page_comment(page_id, anchor, body)

# AI
ask_docs(question)  # RAG
summarize_sprint(sprint_id)
```

**Auth**:
- Local stdio: long-lived API token in `~/.claude/mcp.json`
- SSE remote: OAuth flow → JWT

**Audit**: All MCP calls logged in `ai.mcp_audit` + Kafka `audit.events`.

### Cost Control

| Mechanism | Detail |
|---|---|
| Per-workspace budget | `ai_budgets` table: monthly $, soft + hard limits |
| Per-user rate limit | Redis sliding window |
| Prompt cache | Hash key cache 1h for repeated prompts (FAQ, common summary) |
| Cheaper model first | DeepSeek default, Claude only when explicit `mode=quality` |
| Token tracking | All calls record `tokens_in, tokens_out, cost_usd` in `ai_jobs` |
| Anthropic prompt caching | Use `cache_control` headers for long system prompts |

### Provider Abstraction

```go
type LLMProvider interface {
  Complete(ctx, req CompletionRequest) (CompletionResponse, error)
  Embed(ctx, texts []string) ([][]float32, error)
  Stream(ctx, req CompletionRequest) (<-chan Chunk, error)
}

type ClaudeProvider struct { ... }
type DeepSeekProvider struct { ... }

type AIRouter struct {
  primary  LLMProvider
  fallback LLMProvider
  budget   BudgetChecker
}
```

Provider swap without modifying use case code.

---

## 7. Frontend Architecture

### Folder Structure (Monolith Modular)

```
apps/web/
├── public/
├── src/
│   ├── app/
│   │   ├── router.tsx           # React Router v7 config
│   │   ├── providers.tsx        # QueryClient, AuthProvider, ThemeProvider
│   │   ├── layout/              # Shell: sidebar, topbar, breadcrumb
│   │   └── error-boundary.tsx
│   │
│   ├── modules/                 # Feature modules (future MFE candidates)
│   │   ├── auth/
│   │   ├── workspace/
│   │   ├── issue/               # Board, sprint, issue detail, backlog
│   │   ├── page/                # Page tree, editor, viewer
│   │   ├── search/
│   │   ├── ai/                  # Chat UI, RAG, generate
│   │   ├── notification/
│   │   ├── admin/               # Workspace settings, role, custom field
│   │   └── profile/
│   │
│   ├── shared/                  # Cross-module reusable
│   │   ├── ui/                  # shadcn/ui + custom
│   │   ├── hooks/
│   │   ├── components/
│   │   └── utils/
│   │
│   ├── core/                    # Infrastructure
│   │   ├── api/                 # ky client, JWT refresh interceptor
│   │   ├── auth/
│   │   ├── realtime/            # WebSocket client wrapper
│   │   ├── collab/              # Yjs + TipTap collab provider
│   │   ├── config/
│   │   ├── i18n/
│   │   └── error/
│   │
│   └── main.tsx
```

Each module exports a public boundary (`index.ts`) → future MFE split is straightforward.

### Routing

React Router v7 (data router mode):
```
/                              → redirect /workspaces
/login                         → LoginPage
/oauth/callback                → OAuthCallback
/invite/:token                 → InviteAcceptPage

/w/:workspaceSlug              → WorkspaceLayout
├── /projects                  → ProjectListPage
├── /projects/:projectKey
│   ├── /board                 → BoardPage
│   ├── /backlog               → BacklogPage
│   ├── /sprints               → SprintListPage
│   └── /issues/:issueKey      → IssueDetailPage
├── /spaces                    → SpaceListPage
├── /spaces/:spaceKey
│   ├── /pages                 → PageTreePage
│   └── /pages/:pageId         → PageEditorPage
├── /search                    → GlobalSearchPage
├── /notifications             → NotificationCenterPage
├── /ai                        → AIChatPage
└── /admin                     → AdminLayout
```

Route-level lazy load via `import('./modules/issue/pages/board')`.

### State Management

| State type | Tool | Use case |
|---|---|---|
| Server state | TanStack Query v5 | Fetch issue, page, sprint, user — cache, dedupe, optimistic update |
| Global client state | Zustand slices | Current user, current workspace, UI theme, sidebar collapsed |
| Form state | React Hook Form + Zod | Login, create issue, settings forms |
| Realtime push state | TanStack Query `setQueryData` | WS event mutates cache, no refetch |
| Collab edit state | Yjs Doc | Page editor binary state, awareness |
| URL state | React Router `searchParams` | Filter board, search query, sort |

Pattern: Server state lives in TanStack Query by default. Promote to Zustand only when shared across components and not easily passed via URL.

### Realtime Integration

```ts
// core/realtime/use-realtime.ts
const useRealtimeSubscribe = (channel: string, handler: EventHandler) => {
  // Connect WebSocket to /ws
  // Subscribe channel: workspace:{id}, board:{id}, user:{id}
};

const BoardPage = () => {
  const { data: issues } = useQuery(['board', boardId], fetchBoard);

  useRealtimeSubscribe(`board:${boardId}`, (event) => {
    if (event.type === 'issue.updated') {
      queryClient.setQueryData(['board', boardId], (old) =>
        updateIssueInBoard(old, event.payload)
      );
    }
  });
};
```

### Editor (TipTap + Yjs)

```ts
const editor = useEditor({
  extensions: [
    StarterKit.configure({ history: false }),
    Collaboration.configure({ document: ydoc }),
    CollaborationCursor.configure({ provider, user: { name, color } }),
    Mention.configure({ /* @user, @page */ }),
    CodeBlockLowlight,
    Image,
    Table,
    Mermaid,           // custom node
    JiraIssueEmbed,    // custom node
  ],
});

const provider = new HocuspocusProvider({
  url: WS_COLLAB_URL,
  name: `page:${pageId}`,
  token: jwtToken,
  document: ydoc,
});
```

Persistence flow: user types → Yjs update → Provider syncs to Hocuspocus → Hocuspocus debounces 2s → saves Postgres + produces Kafka event → other clients receive via awareness protocol.

### Design System

Base: shadcn/ui + Radix primitives + Tailwind CSS v4.

Tokens defined in `shared/ui/tokens.css`: color, radius, font. Light + dark mode via `data-theme` attribute.

Component layers:
- `shared/ui/primitives/` — Button, Input, Dialog, DropdownMenu
- `shared/ui/composite/` — IssueCard, SprintColumn, MentionInput
- `shared/ui/layout/` — PageHeader, Sidebar, EmptyState, Spinner

### API Client Layer

```ts
const api = ky.create({
  prefixUrl: '/api/v1',
  hooks: {
    beforeRequest: [addJwtHeader],
    afterResponse: [refreshOn401],
  },
});

export const issueApi = {
  list: (filter: Filter) => api.get('issues', { searchParams: filter }).json<Issue[]>(),
  create: (body: CreateIssue) => api.post('issues', { json: body }).json<Issue>(),
};

export const useIssues = (filter: Filter) =>
  useQuery({ queryKey: ['issues', filter], queryFn: () => issueApi.list(filter) });
```

### Code Style Convention

- Arrow function default
- Regular `function` only when `this` binding required (rare in modern React)
- TypeScript strict mode
- Biome for lint + format

### Performance

| Concern | Strategy |
|---|---|
| Bundle size | Route-level code split, lazy heavy modules (TipTap, Mermaid) |
| Render | Virtualize board column (TanStack Virtual), page tree |
| Image | MinIO + lazy load + responsive `srcset` |
| Search | Debounce 300ms, abort previous |
| Mobile | CSS Grid + responsive Tailwind, touch-friendly |

### Testing

| Level | Tool | Coverage target |
|---|---|---|
| Unit | Vitest + Testing Library | Utils, hooks, reducers |
| Component | Vitest + RTL | Forms, lists, complex UI |
| Integration | Vitest + MSW (mock API) | Module flows |

E2E testing out of MVP scope.

---

## 8. Migration Strategy

### Goal

Import full data from existing Jira + Confluence:
- Jira: projects, sprints, issues, comments, attachments, links, custom fields, workflows, users
- Confluence: spaces, pages with version history, page comments, attachments, labels

Minimum data loss, no downtime on production Jira/Conf, idempotent (re-runnable until cutover).

### Migration Tool (Go, one-time CLI)

```
services/migration-tool/
├── cmd/
│   ├── jira-import/main.go
│   ├── conf-import/main.go
│   └── verify/main.go
├── internal/
│   ├── jira/      # REST client v3
│   ├── conf/      # REST client + Storage Format parser
│   ├── mapper/    # Jira→PM, Conf→PM data mapping
│   ├── writer/    # Insert into target Postgres + MinIO
│   ├── state/     # Checkpoint progress (resume from last stop)
│   └── attach/    # Download → MinIO upload
└── config/migration.yml
```

### Data Source Strategy

Combine:
- Jira REST API for metadata + paginated issues
- Confluence REST `/rest/api/content?expand=body.storage,version,history`
- Attachments downloaded directly via API → push to MinIO

### Phases

**Phase 0 — Discovery (1-2 days)**
- Count workspaces, projects, sprints, issues, pages, attachments, total size
- Identify edge cases: non-standard custom fields, complex workflows, exotic Confluence macros
- Verify credentials: Jira/Conf API tokens

**Phase 1 — Schema Mapping (3-5 days)**

Build mapping tables:

| Jira | PM Platform |
|---|---|
| Jira project | `workspace.projects` |
| Jira board | `workspace.boards` |
| Jira sprint | `issue.sprints` |
| Jira issue | `issue.issues` (key preserved `PROJ-123`) |
| Jira issue type | `issue.issue_types` |
| Jira custom field | `issue.custom_fields` + `issue.issue_field_values` |
| Jira status | `issue.workflows.states` |
| Jira workflow transition | `issue.workflows.transitions` |
| Jira comment | `issue.comments` |
| Jira attachment | `file.files` + MinIO object |
| Jira link | `issue.issue_links` |
| Jira user | `auth.users` (dummy if no account yet) |

| Confluence | PM Platform |
|---|---|
| Conf space | `workspace.spaces` |
| Conf page | `page.pages` |
| Conf page version | `page.page_versions` |
| Conf storage format (XHTML) | Convert → TipTap JSON → Yjs Y.Doc |
| Conf macro | TipTap custom node or fallback HTML block |
| Conf comment | `page.page_comments` |
| Conf attachment | `file.files` + MinIO |
| Conf label | `page.page_labels` |

**Phase 2 — Build Tool (2-3 weeks)**
1. User import → invite emails for password setup, cache `jira_account_id → pm.user_id`
2. Workspace import → 1 workspace, projects/spaces under it
3. Issue import (largest, batched) → resolve assignee/reporter, insert issue + comments + attachments + links (defer cross-issue links)
4. Page import → fetch storage format XHTML → convert to TipTap JSON → encode to Yjs Y.Doc → insert page + versions + comments + attachments
5. Cross-link resolve → after all issues/pages inserted, build mapping and process Jira issue links + Conf-to-Jira mentions
6. Search index rebuild → trigger Kafka events → search-service indexes ES, ai-service embeds pages

**Phase 3 — Verify (2-3 days)**
- Issue count Jira vs PM
- Page count Conf vs PM
- Sample 50 random issues: deep compare summary, description, assignee, status
- Attachment count + size match
- Comment count per issue
- User mapping coverage
- Search index coverage (ES doc count vs PM count)

Output: HTML report with diff highlights.

**Phase 4 — Cutover (1 day, Big Bang switch)**
- T-7d: Final test migration run, verify clean
- T-1d: Freeze Jira/Conf — no edits, announce switch tomorrow
- T-0 (Friday evening):
  1. Run final delta sync
  2. Verify
  3. DNS/proxy switch
  4. Send team welcome email + invite links
- T+1 (Monday): Team starts using new PM, Jira/Conf read-only as fallback
- T+30: Decommission Jira/Conf subscription

### Idempotency

All inserts use `external_id` column (Jira issue key, Conf page ID) for dedup:

```sql
INSERT INTO issues (...)
VALUES (...)
ON CONFLICT (project_id, external_id) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  updated_at = NOW();
```

Tool can rerun safely. Crash recovery via state checkpoints.

### Rate Limit Handling

- Jira Cloud: 100 req/3s burst, 1000 req/h sustained
- Conf Cloud: similar
- Tool uses `golang.org/x/time/rate` limiter
- Exponential backoff on 429

### Edge Cases

| Issue | Strategy |
|---|---|
| Jira user deactivated | Create `status='inactive'` in auth.users, no invite |
| Custom field type unsupported | Fallback to string, log warning |
| Complex Conf macros (chart, gallery) | Convert to TipTap placeholder with raw HTML |
| Attachment > 100MB | Skip + log, manual upload later |
| Inline image in page | Upload MinIO, replace URL in TipTap JSON |
| Mention `@user` stale | Resolve via user-map, fallback to plain text |
| Subtask hierarchy | Topological sort: insert parent before child |

### Effort Estimate

| Phase | Time |
|---|---|
| Discovery | 1-2d |
| Schema mapping spec | 3-5d |
| Build core tool (Jira) | 1-1.5w |
| Build core tool (Conf) | 1w |
| Verify + edge cases | 3-5d |
| Cutover dry runs (x2) | 2d |
| Real cutover | 1d |
| **Total** | **~4-6 weeks** |

Migration tool development runs parallel with core service development. Starts after issue + page core CRUD is stable (~month 3-4).

---

## 9. Phase Roadmap

### Timeline Overview (5-6 months)

```
T 0 ─────── 1 ─────── 2 ─────── 3 ─────── 4 ─────── 5 ─────── 6
│ Setup    │ Core BE  │ Editor   │ Search   │ AI/MCP   │ Migrate │
│ + skel   │ + FE skel│ + Realtime│ + Notif  │ + polish │ + cutover│
```

### Phase 0 — Foundation (2-3 weeks)

Goal: Monorepo + infrastructure + all service skeletons compile/run.

| Task | Output |
|---|---|
| Monorepo Turborepo + workspace | `pnpm-workspace.yaml`, `turbo.json` |
| `proto/` package + Buf setup | Generated Go + Java code |
| Docker compose: Postgres + Redis + Kafka + ES + MinIO + Traefik | `docker-compose.dev.yml` |
| Postgres schema bootstrap (9 schemas) | Init SQL |
| Each Go service: Gin skeleton + health + gRPC skeleton | `main.go` runs |
| Each Java service: Spring Boot skeleton + gRPC | Boot + health |
| Hocuspocus skeleton | Node TS skeleton |
| FE rsbuild + React Router + shadcn setup | Hello world |
| api-gateway: route table + JWT verify stub | Forward to auth |
| GitHub Actions: build + lint + test per service | Pipeline green |
| Observability stack: Prometheus + Grafana + Loki | Basic dashboards |

Deliverable: `docker compose up` → all services start, FE loads, gateway forwards, gRPC ping pong. No business logic yet.

### Phase 1 — Core CRUD (4-5 weeks)

Goal: Basic operation of issue + page (no collab, no AI yet).

| Sprint | Focus |
|---|---|
| Sprint 1 (2w) | Auth: register + login + Google OAuth + invite. Workspace: workspace + project + space + role + member. FE: login + invite accept + workspace settings. |
| Sprint 2 (2w) | Issue: project, issue CRUD, issue type, custom field, custom workflow. FE: issue list, issue detail, create form, sprint, backlog. |
| Sprint 2.5 (1w) | Page: space, page tree, page CRUD (markdown editor first, no collab). FE: page tree sidebar, simple editor, viewer. Comment basic for issue + page. |

Deliverable: Usable for personal task management. Multi-user but not real-time.

### Phase 2 — Realtime + Editor (3-4 weeks)

| Sprint | Focus |
|---|---|
| Sprint 3 (2w) | collab-server (Hocuspocus): setup, auth hook, Postgres adapter. FE: TipTap + Yjs collab provider + cursor + mention. Migrate page editor to TipTap. |
| Sprint 4 (2w) | realtime-service: WebSocket + Redis pub/sub. Board: Kanban view with drag-drop. Real-time board update + comment + presence. File: MinIO upload + attachment for issue + page. |

Deliverable: 2 users co-editing pages, board drag visible real-time, file upload works.

### Phase 3 — Search + Notification (3 weeks)

| Sprint | Focus |
|---|---|
| Sprint 5 (2w) | search-service (Java): Elasticsearch indexes issue + page via Kafka consumer. FE: global search bar, search page with filters. |
| Sprint 6 (1w) | notification-service (Java): in-app notif + email (SMTP) + Zalo bot (webhook). FE: notification center, preferences. Mention → notify, assign → notify, comment → notify. |

Deliverable: Search works, notifications delivered across channels.

### Phase 4 — AI + MCP (3-4 weeks)

| Sprint | Focus |
|---|---|
| Sprint 7 (2w) | ai-service: Claude + DeepSeek provider router. pgvector setup. Indexing pipeline (consumes `page.events`). RAG Q&A endpoint. FE: AI chat panel. |
| Sprint 8 (1w) | AI use cases: create issue from NL, summarize sprint, smart suggest assignee/point, generate docs. FE integration via command palette. |
| Sprint 9 (1w) | mcp-server: tools exposed, stdio + SSE transport. Config template for Claude Code/Cursor. Daily digest cron (notification + AI). |

Deliverable: Use AI/MCP from IDE, AI assists issue/doc workflows.

### Phase 5 — Report + Audit + Polish (2-3 weeks)

| Sprint | Focus |
|---|---|
| Sprint 10 (2w) | report-service: burndown, velocity, sprint stats dashboard. audit-service: consume all events → append-only log, admin view audit. Polish UI, bug fixes, performance. |

### Phase 6 — Migration + Cutover (2-3 weeks)

| Sprint | Focus |
|---|---|
| Sprint 11-12 | migration-tool: Jira + Conf import. Dry run x2. Verify. Cutover weekend. Team starts real usage. |

### Cumulative Total

**18-21 weeks ≈ 5-6 months**. Matches deadline.

### Parallel Work Opportunities

Solo developer → mostly linear. Possible parallelization:
- End of Phase 1 → start designing migration mapping in parallel
- Phase 2 → while backend builds realtime, FE polishes UI
- Phase 4 AI/MCP can branch separately if there's bandwidth

### Risks + Mitigation

| Risk | Mitigation |
|---|---|
| Yjs/Hocuspocus learning curve | Phase 2 opening: dedicate full week to TipTap+Yjs, spike before Phase 0 |
| Java new to developer (Spring Boot, Gradle) | Phase 1: only 1 Java service (issue) → become familiar before adding 4 more in Phase 3-5 |
| Microservice complexity overwhelm | Phase 0 batches all skeleton setup at once, don't mix with feature work |
| VPS resource constraints at deploy | Plan to upgrade in Phase 6 |
| Complex Jira data migration | Dry runs early, schema mapping starts in Phase 1 |
| Scope creep | Strict scope per sprint, new features push to "phase 2+" |

### Definition of Done per Phase

- [ ] All tests pass (unit + integration)
- [ ] Docker compose up clean, all services healthy
- [ ] Documentation updated (README per service, OpenAPI/Proto)
- [ ] Self-demo (review by self)
- [ ] Memory note logs lessons learned

---

## Appendix A — Open Decisions

None at this time. All design decisions are captured in sections above.

## Appendix B — Glossary

| Term | Definition |
|---|---|
| Workspace | Top-level organization unit (1 per team) |
| Project | Issue tracking unit (Jira-equivalent) within workspace |
| Space | Documentation unit (Confluence-equivalent) within workspace |
| Issue | Work item: Epic, Story, Task, Bug, Subtask |
| Page | Documentation page with hierarchy and version history |
| Sprint | 2-week time-boxed iteration containing issues |
| Board | Kanban or Scrum view of issues |
| Workflow | State machine for issue status transitions |
| Outbox pattern | Reliability pattern: write event to local table within transaction, separate process publishes to message bus |
| CRDT | Conflict-free Replicated Data Type (used by Yjs for collab editing) |
| MCP | Model Context Protocol (Anthropic spec for LLM tool integration) |
| RAG | Retrieval-Augmented Generation (vector search + LLM completion) |

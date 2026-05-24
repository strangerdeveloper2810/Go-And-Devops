# Backend + DevOps Learning Curriculum — PM Platform

> Chương trình học Go Backend + Microservice + DevOps thông qua xây **PM Platform** (Jira + Confluence + AI/MCP) từ đầu.
>
> **Target role**: Backend Go / Fullstack React + Go (mid-senior)
> **Target companies**: Axon, VNG, ANZ
> **CV submission**: June - August 2026
> **Timeline**: 5-6 tháng (đồng bộ với MVP)

*Created: 2026-01-10 | Rewritten for PM Platform: 2026-05-25*

> **Lịch sử**: Curriculum gốc cho project "Poor Man's Vercel" (Phase 1 + 2 đã hoàn thành tháng 2-3/2026). Project pivot sang PM Platform để vận hành thật nội bộ + scope phù hợp pv mid-senior microservice. Foundation Go + Docker giữ lại, các phase tiếp theo viết lại theo design doc mới ([`2026-05-24-pm-platform-design.md`](./2026-05-24-pm-platform-design.md)).

---

## Skills Map theo JD (Axon / VNG / ANZ)

Cập nhật mapping skill ↔ phase. Tổng hợp từ JD thực tế + market 2026.

| Skill | Axon | VNG | ANZ | PM Platform Phase | Status |
|---|---|---|---|---|---|
| Go fundamentals, idioms | Req | Req | Req | Foundation | ✅ DONE |
| REST API design | Req | Req | Req | Phase 1 | ✅ DONE |
| Clean Architecture / SOLID | Req | Req | Req | Foundation | ✅ DONE |
| PostgreSQL / SQL | Req | Req | Req | Phase 1 | ✅ DONE |
| Docker, multi-stage build | Req | Req | Plus | Foundation | ✅ DONE |
| **JWT, OAuth** | Req | Req | Req | Phase 1 | ✅ DONE (old) → revisit |
| **Testing (unit, integration, mock)** | Req | Req | Req | Phase 1+ | 🔵 In curriculum |
| **Goroutine, concurrency patterns** | Req | Req | Req | Phase 0+ | 🔵 In curriculum |
| **Microservice architecture** | Req | Req | Req | Phase 0 → 5 | 🔵 In curriculum |
| **gRPC + Protobuf** | Plus | Req | Plus | Phase 0 | 🔵 In curriculum |
| **Kafka (event-driven)** | Req | Req | Plus | Phase 0+ | 🔵 In curriculum |
| **Schema Registry (Avro/Protobuf)** | Plus | Req | Plus | Phase 0+ | 🔵 In curriculum |
| **Java + Spring Boot 3** | Plus | Plus | Req | Phase 1+ | 🔵 In curriculum |
| **Elasticsearch** | Req | Req | Plus | Phase 3 | 🔵 In curriculum |
| **Redis (cache, pub/sub, rate limit)** | Req | Req | Plus | Phase 0+ | 🔵 In curriculum |
| **Object storage (MinIO/S3)** | Plus | Plus | Req | Phase 2 | 🔵 In curriculum |
| **WebSocket realtime** | Plus | Plus | Plus | Phase 2 | 🔵 In curriculum |
| **CRDT / collab edit (Yjs)** | - | - | - | Phase 2 | Bonus (rare in JD nhưng "wow" CV) |
| **DB optimization (index, N+1, EXPLAIN)** | Exp | Req | Exp | Phase 1+ | 🔵 In curriculum |
| **Outbox pattern, idempotency** | Req | Req | Req | Phase 0+ | 🔵 In curriculum |
| **Saga / distributed transaction** | Plus | Plus | Plus | Phase 5 | 🔵 In curriculum |
| **API Gateway (Traefik + custom Go)** | Req | Req | Plus | Phase 0 | 🔵 In curriculum |
| **Kubernetes** | Req | Plus | Plus | Phase 6 stretch | Optional |
| **CI/CD GitHub Actions** | Req | Req | Plus | Phase 0+ | 🔵 In curriculum |
| **Observability (Prometheus, Grafana, Loki, Tempo)** | Plus | Plus | Plus | Phase 0+ | 🔵 In curriculum |
| **OpenTelemetry distributed tracing** | Req | Req | Plus | Phase 0+ | 🔵 In curriculum |
| **AI/LLM integration (Claude, function call)** | Plus | Plus | Plus | Phase 4 | 🔵 In curriculum |
| **MCP server (Model Context Protocol)** | Plus | Plus | Plus | Phase 4 | 🔵 Unique CV point |
| **RAG (vector store, embedding)** | Plus | Plus | Plus | Phase 4 | 🔵 In curriculum |
| **AWS basics (EC2, RDS, S3, ECR)** | Req | Plus | Plus | Phase 6 stretch | Optional |
| **System design interview** | Req | Req | Req | Throughout | 🔵 Practice section |
| **English communication** | Req | Req | Req | Self-study | Self |

Legend: ✅ done (từ old project) · 🔵 sẽ học qua PM Platform · — không cần.

---

## Completed Foundation (từ project cũ)

> 2 phase này đã hoàn thành (Feb-Mar 2026) với project "Poor Man's Vercel". Kiến thức + theory files vẫn nguyên giá trị reference cho PM Platform.

### ✅ Phase A — Go Fundamentals + REST API (2026-02-21 ~ 22)

- Go basics: variables, structs, methods, interface, pointer, error handling, slice, map, goroutine concept
- Gin framework: routing, middleware, route group, request binding, response convention
- `database/sql` + pgx driver, connection pool, `db.Query/QueryRow/Exec`, `rows.Scan`, `$1` placeholder, soft delete, `RowsAffected`
- Clean Architecture (Handler → Service → Repository), constructor DI, graceful shutdown
- Theory:
  - [`02-go-syntax-basics.md`](../theory/02-go-syntax-basics.md)
  - [`03-goroutine-channel.md`](../theory/03-goroutine-channel.md)
  - [`01-clean-architecture.md`](../theory/01-clean-architecture.md) + [`01-clean-architecture-cheatsheet.md`](../theory/01-clean-architecture-cheatsheet.md)
  - [`04-project-recap-phase1.md`](../theory/04-project-recap-phase1.md)

**Điểm yếu cần ôn**: pointer (value vs pointer khi truyền function), map check key (`v, ok := m[key]`).

### ✅ Phase B — Containerization (2026-02-25)

- Dockerfile multi-stage build (~25-39MB image)
- Layer caching strategy (COPY go.mod trước → cache deps)
- Docker Compose service networking (service name = DNS)
- Image tagging, registry concept (Docker Hub, GHCR, ECR)
- Theory: [`05-dockerfile-multi-stage.md`](../theory/05-dockerfile-multi-stage.md)

### ✅ Phase C — JWT Authentication (2026-03-11)

- bcrypt hash + compare (salt auto-extract)
- JWT structure (Header.Payload.Signature), HS256 vs RS256
- Gin middleware: extract Bearer token, parse claims, inject `user_id` vào context
- Algorithm confusion attack (verify alg là HS256 trước khi check)
- DI wiring: `userRepo → authSvc(secret) → authHandler → SetupRoutes`

> 3 phase này sẽ **revisit + nâng cấp** trong PM Platform (clean version multi-service, không monolithic).

---

## PM Platform Curriculum — 7 Phase (5-6 tháng)

Mapping 1:1 với design doc roadmap. Mỗi phase: **mục tiêu học** + **khái niệm mới** + **deliverable** + **interview pv hỏi gì**.

---

### Phase 0 — Foundation & Infrastructure (2-3 tuần)

**Mục tiêu**: Monorepo + infrastructure + skeleton mọi service compile/run, observability baseline.

**Skills mới**:
- Monorepo tool (Turborepo)
- Protobuf + Buf CLI + gRPC code generation
- Docker compose multi-service (Postgres, Redis, Kafka KRaft, Elasticsearch, MinIO, Traefik, Prometheus, Grafana, Loki, Tempo)
- Schema-per-service Postgres (1 DB user / schema)
- Kafka topic strategy (partition key, retention)
- gRPC service skeleton (server reflection, health check protocol)
- OpenTelemetry instrumentation (trace, metric, log)
- GitHub Actions matrix build (Go + Java + Node parallel)
- Pre-commit hook (lefthook + commitlint)

**Theory cần đọc**:
- gRPC vs REST: binary serialization, HTTP/2 streaming, bidirectional
- Protobuf: schema evolution (backward compat), reserved fields, oneof
- Kafka KRaft: bỏ Zookeeper, controller quorum
- OpenTelemetry: W3C traceparent propagation
- Traefik: docker provider, label-based config

**Build**:
- 14 service skeleton (mỗi service: main.go/Application.java/index.ts + Dockerfile + health endpoint)
- `proto/pm/v1/common.proto` + 1 service proto (vd auth.proto)
- `infra/dev/docker-compose.yml`: full stack 4GB RAM
- 1 Grafana dashboard: services up/down + request rate

**Pv hay hỏi**:
- "Tại sao gRPC giữa service, REST với FE?" → binary efficiency, type-safety, streaming
- "Outbox pattern là gì?" → reliability dual-write
- "Schema-per-service vs DB-per-service?" → tradeoff resource vs strict isolation

---

### Phase 1 — Core CRUD (4-5 tuần)

**Mục tiêu**: Auth, Workspace, Issue, Page CRUD đầy đủ. Multi-user nhưng chưa real-time.

**Skills mới**:
- **Java Spring Boot 3.x** (Java 21 nếu upgrade): Spring Web, Spring Data JPA, Hibernate, Flyway migration, Gradle Kotlin DSL
- Spring Boot ↔ Go interop qua gRPC (proto chung)
- Custom JPA repository, JPA criteria query (cho Jira custom field/workflow dynamic)
- JSONB column trong Postgres + Spring Data
- Go validation (`go-playground/validator`) + Spring Bean Validation (Jakarta)
- sqlc code generation (type-safe Go query)
- golang-migrate vs Flyway: file naming convention, transaction handling
- Pagination: cursor-based (chuẩn modern), offset-limit (đơn giản)
- Rate limit middleware (Redis sliding window, token bucket)
- Google OAuth flow (authorization code + PKCE)
- Email invite flow (signed token + expiry)
- Role-based access control (RBAC) per project/space

**Theory cần đọc**:
- JPA lazy vs eager fetching, N+1 problem
- Hibernate first-level + second-level cache
- Postgres index types: B-tree, GIN (JSONB, full-text), partial index
- OAuth 2.0 PKCE flow

**Build**:
- auth-service (Go): register, login, OAuth Google, invite, JWT issue/refresh
- workspace-service (Go): workspace, project, space, role, member, permission check gRPC
- issue-service (Java): project, sprint, issue CRUD, custom field, custom workflow
- page-service (Go): page tree, page CRUD (markdown editor, no collab yet)
- FE: login, invite accept, workspace settings, issue list/detail, page tree/viewer
- 25-30% test coverage cho mỗi service

**Pv hay hỏi**:
- "JPA N+1 fix thế nào?" → `@EntityGraph`, JOIN FETCH, batch fetching
- "Cursor pagination implement ra sao?" → encoded cursor (id+timestamp), index strategy
- "JWT refresh token rotation?" → save hash trong DB, revoke on logout
- "RBAC scale với nhiều role/permission?" → permission matrix JSONB, in-memory check, Redis cache

---

### Phase 2 — Realtime + Collab Edit (3-4 tuần)

**Mục tiêu**: Yjs collab edit page + WebSocket realtime board, comment, presence.

**Skills mới**:
- **CRDT (Conflict-free Replicated Data Type)** lý thuyết: Y.Doc, awareness, sync protocol v2
- Hocuspocus server (Node TS): authentication hook, persistence hook, webhook
- TipTap editor + Yjs collab extension + collaboration cursor
- WebSocket scale pattern: Redis pub/sub fanout, sticky session vs broadcast all
- Go WebSocket: ping/pong heartbeat, backpressure, graceful close
- Optimistic UI update + reconciliation từ event
- Presence protocol: ephemeral, last-write-wins
- MinIO Go client: presigned URL upload (FE upload trực tiếp MinIO không qua API)
- Kanban board drag-drop UX (dnd-kit)
- TanStack Query `setQueryData` để mutate cache từ WS event

**Theory cần đọc**:
- CRDT vs OT (Operational Transform): convergence, commutativity
- WebSocket vs SSE vs long-polling
- Presigned URL: HMAC signature, expiry

**Build**:
- collab-server (Node TS, Hocuspocus): auth + Postgres persistence + Kafka producer
- realtime-service (Go): WebSocket gateway, Redis pub/sub multiplex
- file-service (Go): MinIO upload, presigned URL, virus scan stub
- FE: TipTap collab editor, Kanban board real-time, presence indicator, file attach

**Pv hay hỏi**:
- "WebSocket scale horizontal thế nào?" → Redis pub/sub + sticky session optional
- "Yjs CRDT vs OT khác gì?" → Yjs convergence guaranteed, OT cần central server
- "Optimistic update fail thì sao?" → rollback từ server event, hiển thị conflict UI
- "Presigned URL security?" → expiry ngắn, HMAC verify, content-type restriction

---

### Phase 3 — Search + Notification (3 tuần)

**Mục tiêu**: Elasticsearch indexing + notification multi-channel (in-app, email, Zalo bot).

**Skills mới**:
- **Elasticsearch 8**: mapping, analyzer, multi-field, ngram for typo, scoring tuning
- Spring Data Elasticsearch: repository pattern, ES Java Client
- Kafka consumer pattern (Spring Kafka): @KafkaListener, retry topic, DLQ
- Idempotent consumer (track `event_id`)
- ES bulk indexing, refresh policy (async vs sync)
- Search UX: highlight, facets/aggregations, autocomplete, fuzzy match
- Spring `@Scheduled`: cron, fixedDelay, parallel execution
- Email với Spring Mail: SMTP, HTML template (Thymeleaf), attachment
- Zalo OA bot: webhook signature verify, message API
- Notification preference: per-user, per-channel, per-event-type
- In-app notification: WebSocket push + read state

**Theory cần đọc**:
- Inverted index, term frequency-inverse document frequency (TF-IDF), BM25 ranking
- ES shard + replica strategy
- Email deliverability: SPF, DKIM, DMARC
- Kafka consumer group rebalance: sticky vs cooperative

**Build**:
- search-service (Java): consume `issue.*`, `page.*` events, upsert ES, query API
- notification-service (Java): consume mention/assign events, fan out in-app/email/zalo, preference engine
- FE: global search bar with debounce + filter + facets, notification center

**Pv hay hỏi**:
- "ES vs Postgres FTS khi nào nên dùng?" → > 1M doc, fuzzy match, facets → ES
- "Kafka consumer group rebalance là gì?" → partition reassign khi consumer join/leave
- "Email gửi không tới spam folder?" → SPF/DKIM, content rule, dedicated IP, warming
- "Idempotency consumer thế nào?" → unique key trong DB hoặc Redis SET NX

---

### Phase 4 — AI + MCP (3-4 tuần)

**Mục tiêu**: Claude + DeepSeek provider router, RAG trên Confluence pages, MCP server cho Claude Code/Cursor.

**Skills mới**:
- LLM API: Anthropic Claude (function calling, prompt caching, streaming), DeepSeek (OpenAI-compatible API)
- Provider abstraction interface, fallback chain, cost budget per workspace
- **pgvector**: vector column, ANN index (HNSW, IVFFlat), cosine similarity, `<=>` operator
- Embedding pipeline: text chunking strategy (token-aware), overlap, dedupe
- RAG: retrieve top-K + rerank + context budget + cite source
- Function calling / tool use: schema design, parallel tool execution
- Prompt engineering: system prompt, few-shot, chain-of-thought, structured output
- **MCP (Model Context Protocol)**: server spec, transport (stdio, SSE), tool definition
- `mark3labs/mcp-go` SDK
- Token cost tracking, budget enforcement, hard/soft limit
- Streaming response (SSE) qua Go channel → HTTP flush

**Theory cần đọc**:
- Transformer attention, embedding space, semantic similarity
- RAG vs fine-tuning tradeoff
- Vector index: HNSW (graph-based), IVFFlat (cluster-based), recall vs speed

**Build**:
- ai-service (Go): provider router, embedding pipeline (consume `page.events`), RAG endpoint, use case handlers (generate issue, summarize sprint, smart suggest, translate)
- mcp-server (Go): tools (list/get/create/update issue + page, RAG query), stdio + SSE transport
- FE: AI chat panel, RAG Q&A on docs, AI suggest UI (assignee, point)
- Daily digest cron → Zalo + email

**Pv hay hỏi**:
- "RAG vs fine-tuning khi nào dùng cái nào?" → RAG: data thay đổi nhanh + dễ debug source; fine-tune: behavior cố định + chi phí inference rẻ
- "Vector DB tự build (pgvector) vs dedicated (Qdrant/Pinecone)?" → pgvector đủ 1-10M vector, > 10M cần dedicated
- "Token cost optimize?" → prompt caching, cheaper model first, batch, response cache
- "MCP là gì?" → Anthropic spec cho LLM tool integration, stdio/SSE transport

---

### Phase 5 — Report + Audit + Polish (2-3 tuần)

**Mục tiêu**: Burndown/velocity dashboard + audit log + production polish.

**Skills mới**:
- Materialized view + scheduled refresh
- Event sourcing pattern (audit-service consume all events, append-only)
- Time-series aggregation: burndown daily snapshot, rolling window
- Spring Data aggregation queries, JPA `@Query` native vs JPQL
- Partition table by month (Postgres declarative partitioning)
- Chart library FE (Recharts hoặc Visx)
- Performance: query optimization, EXPLAIN ANALYZE, slow query log
- Load test cơ bản (k6 hoặc Apache Bench)
- **Distributed tracing analysis**: identify hot path, bottleneck
- Production checklist: graceful shutdown all services, connection pool tuning, health probe (liveness vs readiness)

**Theory cần đọc**:
- Event sourcing: state derived from events, replay, snapshot
- CQRS (Command Query Responsibility Segregation): read model vs write model
- Postgres partitioning: range, list, hash; constraint exclusion

**Build**:
- report-service (Java): burndown, velocity, user activity dashboards
- audit-service (Java): consume all events, append-only log, admin query API + UI
- Polish: error states, loading skeleton, empty states, mobile responsive
- Performance: index audit, slow query log review, frontend bundle analyze

**Pv hay hỏi**:
- "Event sourcing pros/cons?" → audit log free + replay; cons: complex query, schema evolution khó
- "Partition table khi nào cần?" → > 100M rows hoặc query luôn theo time range
- "Liveness vs readiness probe?" → liveness: restart nếu chết; readiness: remove khỏi LB nếu không sẵn sàng

---

### Phase 6 — Migration + Cutover (2-3 tuần)

**Mục tiêu**: Tool import full data từ Jira + Confluence, dry run, cutover production.

**Skills mới**:
- Jira REST API v3, JQL search, pagination, rate limit handling
- Confluence REST API, Storage Format (XHTML) parsing
- ETL pipeline: extract + transform + load với checkpoint
- Idempotency at scale (UPSERT với external_id)
- Data validation: count match, sample deep compare, attachment integrity check
- HTML → TipTap JSON → Yjs Y.Doc conversion
- Bulk Postgres insert (COPY vs INSERT, batch size tuning)
- Cron schedule + state machine + retry logic
- Cutover playbook: freeze, final sync, switch, rollback plan

**Build**:
- migration-tool (Go CLI): `jira-import`, `conf-import`, `verify` subcommands
- Schema mapping spec doc
- Dry run x2 cycles
- Production cutover weekend

**Pv hay hỏi**:
- "Big Bang switch vs Strangler Fig?" → Big Bang đơn giản; Strangler cho data lớn + uptime critical
- "Bulk insert optimize Postgres?" → COPY > batch INSERT > single INSERT; disable index trong khi load, rebuild sau
- "Idempotent ETL implement thế nào?" → external_id unique, ON CONFLICT DO UPDATE, checkpoint state file

---

## Cross-Phase: CI/CD + Observability (xuyên suốt)

### GitHub Actions

```
Push → CI:
  ├─ Lint (per stack)
  ├─ Test (per service, parallel)
  ├─ Build Docker image
  └─ Push GHCR (with semver + sha tag)

Tag release → CD:
  └─ Deploy VPS (SSH + docker compose pull + restart)
```

**Tasks dần làm theo phase**:
- Phase 0: lint + test workflow per stack (Go, Java, Node, FE)
- Phase 1: build + push image GHCR
- Phase 5: deploy workflow (SSH + compose)
- Phase 6: rollback workflow

### Observability

| Phase | Add |
|---|---|
| 0 | Prometheus scrape per service, basic Grafana dashboard |
| 1 | Loki log aggregation, log correlation by trace_id |
| 2 | Trace WebSocket lifecycle, Yjs sync latency metric |
| 3 | Kafka consumer lag dashboard, ES query latency |
| 4 | LLM token usage dashboard, cost per workspace |
| 5 | Alert rules (5xx rate, consumer lag, disk full), Slack/Zalo webhook |

---

## Interview Prep (song song learning)

### Go Interview Questions

Câu hỏi từ market 2026 cho mid-senior Go:

- Goroutine vs OS thread (M:N scheduler, GMP model)
- Channel buffered vs unbuffered (deadlock case)
- `context` package: WithTimeout, WithCancel, propagation
- Interface implicit implementation lợi ích (testability, dependency inversion)
- Slice internal: backing array, `len` vs `cap`, append behavior, memory leak case
- Map: not concurrent-safe, `sync.Map` use case, when prefer mutex
- `defer`: LIFO order, return value capture, panic recovery
- Generics (Go 1.18+): type parameter, constraint, when prefer interface
- Memory model: happens-before, escape analysis, stack vs heap
- Garbage collector: tricolor mark & sweep, GC tuning (GOGC, GOMEMLIMIT)
- Race detector: `go test -race`, common race patterns
- Error handling: errors.Is/As/Unwrap, sentinel vs typed, error wrapping
- Generics vs `interface{}` / `any`
- Embedding (struct + interface) vs inheritance
- Pointer receiver vs value receiver: when to use which

### Java/Spring Interview Questions

- Spring Boot auto-configuration cơ chế
- `@Transactional` propagation (REQUIRED, REQUIRES_NEW, NESTED), isolation level
- JPA fetch type lazy vs eager, `@EntityGraph`
- Bean scope (singleton, prototype, request), proxy mechanism
- Spring Security filter chain, authentication vs authorization
- Java virtual thread (Java 21 Project Loom) vs platform thread
- `CompletableFuture` chaining, exception handling
- `Optional` proper use, when not to use
- Garbage collector G1, ZGC, Shenandoah tradeoff
- Hibernate first-level vs second-level cache, query cache

### System Design (Axon/VNG hay hỏi)

Practice với PM Platform context — phần nào trong project mình apply gì:

- Design Twitter feed (timeline generation)
  - PM Platform analog: notification timeline, activity feed
- Design URL shortener (hash, base62, custom domain)
  - PM Platform: share link, presigned URL
- Design rate limiter (token bucket, sliding window)
  - PM Platform: api-gateway rate limit Redis
- Design notification system (queue-based fan-out)
  - PM Platform: notification-service Kafka consumer
- Design distributed cache (consistent hashing, eviction)
  - PM Platform: Redis cluster cho session/cache
- Design chat system (WebSocket, presence, message ordering)
  - PM Platform: realtime-service + Yjs collab
- Design search system (inverted index, ranking)
  - PM Platform: search-service Elasticsearch
- Design deployment system / CI-CD pipeline
  - PM Platform: GitHub Actions + GHCR + SSH deploy

### Distributed System Patterns

- Outbox pattern (transactional event publish)
- Saga (orchestration vs choreography)
- CQRS + event sourcing
- Idempotent consumer (event_id tracking)
- Dead Letter Queue
- Circuit breaker (hystrix style)
- Bulkhead isolation
- Retry with exponential backoff + jitter
- Distributed lock (Redis SET NX + EX, Zookeeper, etcd)
- Leader election (Raft, Paxos overview)
- Eventual consistency (read-your-writes, monotonic read)
- CAP theorem applied to specific tools (Postgres = CP, Cassandra = AP)

### Coding Challenges (Go practice)

Practice trên LeetCode + custom challenges:

- Concurrent-safe cache (LRU + mutex / sync.Map)
- Rate limiter (token bucket, sliding window log)
- Worker pool (channel + goroutine pool + context cancel)
- Pub/sub in-memory (subscriber list + broadcast)
- Connection pool (semaphore + sync.Pool)
- Producer-consumer (bounded buffer)
- Map-reduce (parallel split + merge)
- Top-K elements (heap, quickselect)
- Implement merge K sorted streams
- Implement basic distributed lock (Redis SETNX)

### English Communication

Self-study, mọi pv senior đều dùng tiếng Anh:

- Daily: read engineering blog (Netflix, Uber, Stripe, Cloudflare)
- Practice: explain PM Platform architecture bằng English, record + nghe lại
- Vocab: domain term (microservice, event-driven, consistency, throughput, latency)

---

## Deliverables cuối curriculum

Khi MVP hoàn thành (T+5-6 tháng):

| Deliverable | Phase |
|---|---|
| **PM Platform live** vận hành nội bộ team thật | All |
| **14 microservices** (Go 8 + Java 5 + Node 1) trong monorepo Turborepo | Phase 0+ |
| **Event-driven** Kafka với 8 topics, outbox pattern | Phase 0+ |
| **Real-time collab edit** Yjs + Hocuspocus production-grade | Phase 2 |
| **AI/MCP integration** Claude + DeepSeek + RAG + MCP server | Phase 4 |
| **Full observability** Prometheus + Grafana + Loki + Tempo + alerts | Phase 0-5 |
| **CI/CD pipeline** GitHub Actions: lint + test + build + deploy | Phase 0+ |
| **Migration tool** import full Jira/Conf data với checkpoint | Phase 6 |
| **Design doc** comprehensive 9-section system design | ✅ Done 2026-05-24 |
| **Portfolio** repo public + write-up cho mỗi phase | All |

CV bullet point ví dụ:
- "Architected and built PM Platform: 14-service polyglot microservice (Go + Java + Node), event-driven via Kafka, with real-time collaborative editing (Yjs CRDT) and AI/MCP integration (Claude + DeepSeek). Operating internally for team of 10+ users."
- "Designed schema-per-service Postgres + event sourcing audit log, with outbox pattern guaranteeing dual-write consistency."
- "Built custom Go API gateway + Traefik edge with JWT verify, rate limit (Redis sliding window), and OpenTelemetry distributed tracing."
- "Migrated production Jira + Confluence data (10K+ issues, 2K+ pages) to PM Platform with idempotent ETL tool and Big Bang cutover, zero data loss."

---

## References

- Design doc: [`2026-05-24-pm-platform-design.md`](./2026-05-24-pm-platform-design.md)
- Theory notes: `../theory/`
- Old project (Poor Man's Vercel) — Git history `f3c1a49` → `d6c05f7` cho reference Go fundamentals

---

*Curriculum này là living document. Cập nhật khi học được điều mới hoặc khi target/timeline thay đổi.*

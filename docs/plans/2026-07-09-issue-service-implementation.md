# Issue Service — Implementation Plan (Module 3)

> **For Claude:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` to implement this
> plan phase-by-phase, one commit per phase, verifying each `Verify:` block before moving on.

**Goal:** Build the Jira-core service of PM Platform: projects' issues (Epic/Story/Task/Bug/
Subtask) with a configurable type/workflow/custom-field system, comments, links, watchers,
attachments, sprints and boards — as a **Java 21 / Spring Boot 3.3** microservice that plugs
into the existing Go system via Postgres (`issue` schema), Kafka (protobuf events) and the
api-gateway.

**Architecture:** Layered Spring Boot (Controller → Service → Repository/JPA) on Postgres.
Cross-service data is **never queried directly** — issue-service keeps local **read-model
projections** (workspaces, projects, members, users) built from Kafka `workspace.events` +
`auth.user.events`, and does all authorization locally against those projections. It **produces**
`issue.events` (protobuf) consumed by search/notification/report/audit/ai. Identity is trusted
from the gateway via the `X-User-ID` / `X-User-Email` headers (same contract as workspace).

**Tech Stack:** Java 21, Spring Boot 3.3 (web, data-jpa, validation, actuator), Hibernate 6 +
PostgreSQL, Flyway (migrations, schema `issue`), Spring Kafka + `protobuf-java` (event
(de)serialization must match the Go producers), `grpc-server-spring-boot-starter` (net.devh)
for the internal gRPC query API, hypersistence-utils (JSONB / `text[]` mapping), Micrometer
+ Prometheus, Testcontainers (Postgres + Kafka) for tests, Gradle (Groovy DSL). Maven is an
acceptable substitute; the plan uses `./gradlew`.

---

## Constants (use verbatim)
- Gradle group/artifact: `com.pmplatform` / `issue-service`; base package `com.pmplatform.issue`.
- Service dir: `services/issue/`.
- Ports: HTTP **8003** (`server.port`), gRPC **9003** (`grpc.server.port`).
- Env prefix: **`PM_ISSUE`** (bind via `spring.config.import=optional:configtree:...` or explicit
  `@ConfigurationProperties` — see Phase A). DB URL var `PM_ISSUE_DATABASE_URL`.
- DB: schema **`issue`**, dedicated user (infra creates `issue_user`); Flyway `schemas: issue`,
  `default-schema: issue`. DSN example
  `jdbc:postgresql://localhost:5432/pmdb?currentSchema=issue` (user/pass from env).
- Kafka: brokers `PM_ISSUE_KAFKA_BROKERS` (default `localhost:9094`), consumer group
  **`issue-service`**. Consume topics **`workspace.events`** (key=workspace_id) and
  **`auth.user.events`** (key=user_id). Produce topic **`issue.events`** (12 partitions,
  key=workspace_id).
- Gateway headers (trusted): **`X-User-ID`** (int64 string), **`X-User-Email`**.
- Proto package: `pm.v1` (reuse `proto/pm/v1/`); new file `proto/pm/v1/issue.proto`.

---

## Prerequisites (cross-service — do FIRST, they block authz + events)

These touch OTHER services. issue-service cannot authorize requests or emit usable events
without them. Treat as Phase 0.

- **P0.1 — Event protos.** Define protobuf messages so Java and Go agree on the wire format:
  - `proto/pm/v1/workspace.proto`: add event messages `WorkspaceCreated`, `ProjectCreated`,
    `ProjectUpdated`, `MemberAdded`, `MemberRemoved` (+ an envelope `WorkspaceEvent{ oneof }`
    if you prefer one type per topic). Fields mirror the workspace models (ids, workspace_id,
    project_id, key, name, owner_id, user_id, role).
  - `proto/pm/v1/issue.proto` (new): the `issue.events` messages (`IssueCreated`,
    `IssueUpdated`, `IssueTransitioned`, `CommentAdded`, `IssueLinked`, `SprintStarted`,
    `SprintCompleted`) AND the internal gRPC `service IssueService { GetIssue; ListIssuesByProject;
    GetSprint; }`. Run `cd proto && buf generate` (Go side). Verify `packages/proto-go` builds.
- **P0.2 — workspace-service must PRODUCE `workspace.events`.** It currently only *consumes*
  `auth.user.events`. Add a Kafka producer (mirror `services/auth/internal/events/producer.go`)
  that emits `WorkspaceCreated` after `CreateWorkspace`, `ProjectCreated` after `CreateProject`,
  `MemberAdded`/`MemberRemoved` after those ops, keyed by `workspace_id`, best-effort (log on
  error, never fail the request). Without this, issue-service has no project→workspace mapping
  and no membership data → **cannot authorize**. Verify: register→create workspace→create
  project produces messages on `workspace.events` (inspect with a console consumer).
- **P0.3 — Kafka topic** `issue.events` exists (auto-create is on in dev; otherwise create with
  12 partitions). `workspace.events` likewise (6 partitions).

> If P0.2 is deferred, issue-service can fall back to a *synchronous* gRPC authz path
> (workspace `CheckMembership` + a new `GetProject`→workspace_id rpc), but the projection
> design below is the target and the rest of the plan assumes it.

---

## Testing strategy (apply in every phase)
- **JPA / repository:** `@DataJpaTest` + Testcontainers `PostgreSQLContainer` (real Postgres,
  Flyway-migrated). Assert queries, constraints, JSONB/array mapping.
- **Web:** `@WebMvcTest` + MockMvc with a stubbed service + a fake `X-User-ID` header; assert
  status codes and error bodies.
- **Kafka:** `@SpringBootTest` + Testcontainers `KafkaContainer`; publish a protobuf event,
  assert the projection row appears (idempotent on redelivery).
- **E2E:** Phase L script against real infra.
- Keep tests beside code: `src/test/java/com/pmplatform/issue/...`. Write the failing test first
  where practical (TDD), then the implementation, then green, then commit.

---

## Phase A — Scaffold Spring Boot project
**Files:** `services/issue/{build.gradle,settings.gradle,gradlew,gradle/…,Dockerfile,.gitignore,.env.example}`,
`src/main/java/com/pmplatform/issue/IssueApplication.java`,
`src/main/resources/application.yml`, `src/main/java/com/pmplatform/issue/config/*`.
- Generate via Spring Initializr (Boot 3.3.x, Java 21, Gradle-Groovy). Dependencies: `web`,
  `data-jpa`, `validation`, `actuator`, `postgresql`, `flyway-core`, `spring-kafka`,
  `com.google.protobuf:protobuf-java`, `net.devh:grpc-server-spring-boot-starter`,
  `io.hypersistence:hypersistence-utils-hibernate-63`, `micrometer-registry-prometheus`.
- `build.gradle`: add `com.google.protobuf` Gradle plugin pointing at `../../proto/pm/v1`
  (generate Java stubs + grpc-java) so events/gRPC share the monorepo `.proto` files.
- `application.yml`: `server.port: 8003`, `grpc.server.port: 9003`, datasource from
  `${PM_ISSUE_DATABASE_URL}` / `${PM_ISSUE_DATABASE_USER}` / `${PM_ISSUE_DATABASE_PASSWORD}`,
  `spring.jpa.hibernate.ddl-auto: validate` (Flyway owns schema), `flyway.schemas: [issue]`,
  `spring.kafka.bootstrap-servers: ${PM_ISSUE_KAFKA_BROKERS:localhost:9094}`,
  actuator exposing `health,info,prometheus`. Profiles `dev`/`prod`.
- `Dockerfile`: multi-stage (`gradle:8-jdk21` build → `eclipse-temurin:21-jre` runtime, copy the
  boot jar). Mirror the size discipline of the Go Dockerfiles.
- `.env.example`: `PM_ISSUE_DATABASE_URL`, `PM_ISSUE_DATABASE_USER=issue_user`,
  `PM_ISSUE_DATABASE_PASSWORD=...`, ports, `PM_ISSUE_KAFKA_BROKERS=localhost:9094`. `.env`
  gitignored (do NOT commit real secrets — see the workspace smoke-test lesson).
- **Verify:** `./gradlew build` succeeds; `./gradlew bootRun` starts and `GET
  http://localhost:8003/actuator/health` → `{"status":"UP"}` (DB down is fine to skip for now
  by pointing at the running `pm-postgres`).

## Phase B — Database schema (Flyway)
**Files:** `src/main/resources/db/migration/V1__issue_schema.sql`,
`V2__seed_default_types_and_workflow.sql`.
- `V1`: `CREATE SCHEMA IF NOT EXISTS issue;` then all domain tables (design §`issue` schema):
  `issue_types`, `workflows`, `custom_fields`, `field_screens`, `issues`, `issue_field_values`,
  `issue_links`, `issue_attachments`, `comments`, `watchers`, `sprints`, `sprint_issues`,
  `boards`. Use `BIGSERIAL` PKs; `issues.key` unique per project (`UNIQUE(project_id, key)`);
  `labels TEXT[]`; JSONB for `workflows.states/transitions`, `custom_fields.config`,
  `field_screens.field_layout`, `boards.columns/filter`, `issue_field_values.value`; soft delete
  `deleted_at` on `issues`; partial unique indexes filtering `deleted_at IS NULL` where relevant
  (learn from workspace finding #4). Add a per-project key counter table
  `issue_key_seq (project_id BIGINT PK, next_val BIGINT)` for atomic key allocation.
- **Projection tables** (read models, Kafka-fed, NOT authoritative): `workspaces_projection
  (id, slug, name)`, `projects_projection (id, workspace_id, key, name)`, `members_projection
  (workspace_id, user_id, role, PRIMARY KEY(workspace_id,user_id))`, `users_projection
  (id, email, name, avatar_url)`. Indexes on FKs.
- `V2`: seed default issue types (Epic, Story, Task, Bug, Subtask; `is_subtask` on Subtask) and a
  default workflow (`To Do → In Progress → In Review → Done`, transitions JSONB) as
  `project_id NULL` system rows (idempotent `WHERE NOT EXISTS`).
- **Verify:** `./gradlew bootRun`; Flyway applies; `docker exec pm-postgres psql -U postgres -d
  pmdb -c "\dt issue.*"` lists all tables; system issue-types + workflow present.

## Phase C — JPA entities + repositories
**Files:** `src/main/java/com/pmplatform/issue/domain/*.java`,
`src/main/java/com/pmplatform/issue/repository/*.java`.
- One `@Entity` per table under `domain/`. Use `@Table(schema="issue")`. Map JSONB with
  `@JdbcTypeCode(SqlTypes.JSON)` + a POJO/`JsonNode`; map `text[]` with hypersistence
  `@Type(ListArrayType.class)`. Enums (`IssueLinkType`, `SprintState`, `BoardType`, `Priority`)
  as `@Enumerated(EnumType.STRING)`. `Issue` holds `projectId`, `key`, `typeId`, `summary`,
  `description`, `status`, `priority`, `assigneeId`, `reporterId`, `parentId`, `sprintId`,
  `storyPoints`, `labels`, `dueDate`, timestamps, `deletedAt`.
- Repositories: `interface XRepository extends JpaRepository<X, Long>` + derived/`@Query`
  methods needed later (e.g. `findByProjectIdAndDeletedAtIsNull`, `existsByProjectIdAndKey`).
- **Verify:** `@DataJpaTest` (Testcontainers Postgres) round-trips an `Issue` with labels + a
  JSONB field value; `./gradlew test`.

## Phase D — Projections (Kafka consumers) — the authz foundation
**Files:** `event/WorkspaceEventsConsumer.java`, `event/UserEventsConsumer.java`,
`projection/ProjectionService.java`, projection repositories.
- Configure a Spring Kafka `ByteArrayDeserializer` consumer (group `issue-service`,
  **manual ack**, container `AckMode.MANUAL_IMMEDIATE`) for `workspace.events` and
  `auth.user.events`. Deserialize each record with the generated protobuf types.
- `WorkspaceEventsConsumer`: on `WorkspaceCreated`/`ProjectCreated`/`ProjectUpdated`/
  `MemberAdded`/`MemberRemoved` → upsert the matching projection row, then `ack`. Handlers
  **idempotent** (upsert/`ON CONFLICT`), so at-least-once redelivery is safe; only ack AFTER a
  successful DB write (mirror the workspace consumer fix).
- `UserEventsConsumer`: on `UserCreated` → upsert `users_projection`.
- **Verify:** Testcontainers Kafka test publishes a `ProjectCreated` protobuf → asserts
  `projects_projection` row exists and maps to its `workspace_id`; redelivering the same message
  leaves exactly one row.

## Phase E — Config type system (issue types, workflows, custom fields, screens)
**Files:** `service/IssueTypeService.java`, `service/WorkflowService.java`,
`service/CustomFieldService.java`, `service/FieldScreenService.java`, matching
`web/*Controller.java`, DTOs under `web/dto/`.
- Per-project CRUD for issue types, workflows (validate `states`/`transitions` JSON shape),
  custom fields (type: text/number/select/user/date + `config`), field screens (which fields show
  per type). System rows (project_id NULL) are read-only defaults; projects may add custom ones.
- Authz: caller must be a member of the project's workspace (resolve project→workspace via
  `projects_projection`, membership via `members_projection`); mutating type/workflow requires
  `owner`/admin role. Sentinel exceptions (`NotMemberException`, `NotOwnerException`,
  `NotFoundException`) mapped centrally in Phase I.
- **Verify:** MockMvc: create a custom field on a project the caller belongs to → 201; as a
  non-member → 403.

## Phase F — Issues core CRUD + workflow transitions
**Files:** `service/IssueService.java`, `service/KeyAllocator.java`,
`web/IssueController.java`, `event/IssueEventPublisher.java`.
- `KeyAllocator.next(projectId)`: in a transaction, `INSERT ... ON CONFLICT DO UPDATE
  SET next_val = issue_key_seq.next_val + 1 RETURNING next_val` → build `"<PROJECTKEY>-<n>"`
  using the project's key from `projects_projection`.
- Create issue (type must exist for project; validate required custom fields against the screen;
  persist `issue_field_values`), Get by key, List by project (filter by status/assignee/sprint/
  labels), Update fields, **Transition status** (only along the workflow's allowed transitions —
  reject illegal jumps with 409), soft Delete. Subtasks via `parentId`. Assign to sprint via
  `sprintId`.
- After each successful write, publish the corresponding `issue.events` protobuf
  (`IssueCreated`/`IssueUpdated`/`IssueTransitioned`) keyed by `workspace_id`, best-effort.
- Authz: any project member can create/edit issues; enforce membership on every call.
- **Verify:** `@SpringBootTest` (Testcontainers PG+Kafka): create project (seed a
  `projects_projection` + `members_projection` row) → create issue → key is `KEY-1`; illegal
  transition → 409; a legal transition emits one `IssueTransitioned` on `issue.events`.

## Phase G — Links, comments, watchers, mentions, attachments
**Files:** `service/{IssueLinkService,CommentService,WatcherService,AttachmentService}.java`,
controllers + DTOs.
- `issue_links` (blocks/relates/duplicates; prevent self-link + duplicate pair). `comments`
  (`body`, sanitized `body_html`, `mentions BIGINT[]` parsed from `@user` — validate each id
  exists in `users_projection`). `watchers` (add/remove; auto-watch reporter+assignee).
  `issue_attachments` store metadata only (`file_id` references file-service; upload itself is
  file-service's job — issue just links the id).
- Emit `CommentAdded` and `IssueLinked` events; mentions produce a notification-bound event
  (notification-service consumes `issue.events`).
- **Verify:** MockMvc: comment with a mention → 201 and `mentions` persisted; self-link → 400.

## Phase H — Sprints + boards
**Files:** `service/{SprintService,BoardService}.java`, controllers + DTOs.
- Sprints: create (name, goal, dates), `start` (state PLANNED→ACTIVE, one active sprint per
  board/project rule), `complete` (move unfinished issues out), rank via `sprint_issues.position`.
- Boards: Kanban/Scrum, `columns JSONB` (map workflow states→columns), `filter JSONB`. Board
  view query = issues of the project grouped by column with WIP counts (this is the read the
  gateway/report will hit most — index accordingly).
- Emit `SprintStarted`/`SprintCompleted`.
- **Verify:** create sprint → add 2 issues → start → board view returns them grouped by status.

## Phase I — REST layer: identity, authz, validation, error mapping
**Files:** `web/filter/CurrentUserFilter.java`, `web/CurrentUser.java`,
`web/GlobalExceptionHandler.java`, finalize all controllers.
- `CurrentUserFilter` (servlet `OncePerRequestFilter`): read `X-User-ID` → parse long → put a
  request-scoped `CurrentUser`; **401 `MISSING_USER`** if absent/invalid. Trust the header
  (gateway sets it after gRPC verify and strips inbound copies — same model as workspace
  `RequireUser`). Never read identity from the body.
- Route layout (gateway-visible): project-scoped `/api/v1/projects/{projectId}/issues`,
  `/…/sprints`, `/…/boards`, `/…/issue-types`; issue-scoped by key
  `/api/v1/issues/{issueKey}`, `/…/{issueKey}/comments`, `/…/{issueKey}/links`,
  `/…/{issueKey}/watchers`, `/…/{issueKey}/transitions`.
- `@RestControllerAdvice` maps sentinel exceptions → 400/401/403/404/409 with a body shaped
  like the Go services (`{"error":{"code","message"}}`); bean-validation errors → 400
  `VALIDATION_ERROR`.
- **Verify:** MockMvc across the matrix: missing header → 401; non-member → 403; unknown
  issue key → 404; illegal transition → 409.

## Phase J — gRPC query server (internal API)
**Files:** `grpc/IssueGrpcService.java` (+ generated stubs from `issue.proto`).
- Implement `IssueService` gRPC (`GetIssue`, `ListIssuesByProject`, `GetSprint`) with net.devh
  on **9003**; enable health + reflection. Map domain ↔ proto. This is for internal callers
  (mcp-server, gateway gRPC path); it is NOT how search/report get data (they consume
  `issue.events`).
- **Verify:** `grpcurl -plaintext localhost:9003 list` shows `pm.v1.IssueService`; `GetIssue`
  returns a created issue.

## Phase K — Gateway integration
**Files (Go, api-gateway):** `internal/config/config.go`, `internal/server/http.go`,
`.env.example`.
- Add upstream `Upstream.IssueHTTPAddr` (env `PM_API_GATEWAY_UPSTREAM_ISSUE_HTTP_ADDR`,
  default `issue-service:8003`). Under the **protected** group add a reverse proxy for both the
  bare-collection AND catch-all forms (learn from workspace gateway fix): register
  `/projects/*proxyPath` issue sub-routes and `/issues/*proxyPath` → issue HTTP, injecting the
  already-set `X-User-ID`/`X-User-Email`. (Note: `/projects/...` may overlap workspace routing —
  scope issue endpoints under `/projects/{id}/issues` and proxy only the `issues`/`sprints`/
  `boards` sub-paths, or expose them under a dedicated `/api/v1/issues` + `/api/v1/projects/{id}/
  issues` prefix owned by issue-service; decide and document to avoid route collisions.)
- **Verify:** gateway `go build ./...`; through the gateway, an authenticated
  `POST /api/v1/projects/{id}/issues` reaches issue-service (201), no redirect.

## Phase L — Integration test (end-to-end)
**Files:** `scripts/issue-integration-smoke.sh` (mirror `scripts/integration-smoke.sh`; load
secrets from `.env*`, never hardcode).
- Bring up infra (`pm-postgres`, `pm-kafka`) + run auth (8001/9001), workspace (8002/9002,
  **with the P0.2 producer**), issue (8003/9003), gateway (8000/9000).
- Flow via the gateway: register → login → create workspace → create project →
  *(Kafka)* issue-service projects the project+membership → `POST /projects/{id}/issues` creates
  `KEY-1` → transition To Do→In Progress → add a comment with a mention → create a sprint →
  add the issue → start sprint → fetch the board → gRPC `GetIssue`. Assert status per step; leave
  infra up, kill app processes on exit (bulletproof teardown by port).
- **Verify:** script exits 0 with all steps green.

---

## Commit strategy
One commit per phase (`feat(issue): <phase>`), plus P0 as its own commits in the touched
services/proto. A final `feat(issue): full issue-service (Jira core) with workspace projections
+ Kafka issue.events` once Phase L is green is acceptable for this learning repo. Keep Vietnamese
comments on domain/business logic; English on framework boilerplate — matching the Go services.

## Open decisions to confirm before/while building
- **Build tool:** Gradle (assumed) vs Maven — cosmetic, pick one and stay.
- **Event envelope:** one protobuf message per event type on the topic vs a single
  `oneof` envelope. Envelope simplifies the consumer switch; per-type is simpler to evolve.
- **Authz source:** projections (assumed, needs P0.2) vs synchronous workspace gRPC. Projections
  scale better and match the event-driven design; confirm P0.2 lands first.
- **`/projects/*` routing ownership** at the gateway between workspace and issue (Phase K note).

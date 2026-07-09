# Workspace Service — Design (Module 2)

**Date:** 2026-07-09
**Status:** Approved (brainstorm) → implementation
**Depends on:** auth-service (Task 1–13, done), api-gateway

## 1. Purpose

Second Go microservice of PM Platform. Owns the **workspace domain**: workspaces
(tenants), their members, projects, and roles. First event-driven service:
consumes `user.created` from auth via Kafka.

Mirrors auth-service architecture exactly (Clean Architecture: handler → service
→ repository, + gRPC server, + observability/middleware). Use `services/auth` as
the reference implementation for all shared patterns.

## 2. Decisions (from brainstorm)

| Axis | Decision |
|------|----------|
| Scope | Full domain: workspaces + workspace_members + projects + roles + local users projection |
| Kafka | Full: auth **produces** `user.created`; workspace **consumes** it |
| Trust model | Gateway verifies JWT then injects `X-User-ID` / `X-User-Email`; workspace trusts headers (internal network) |
| Event reaction | Both — upsert local user projection AND auto-create a default workspace + owner member |
| Kafka client | `github.com/segmentio/kafka-go` (simple, readable) |
| Ports | HTTP 8002, gRPC 9002, env prefix `PM_WORKSPACE` |

## 3. Data model — Postgres schema `workspace`

```
users               (id PK = auth user id, email, name, avatar_url, created_at)   -- projection from Kafka
workspaces          (id BIGSERIAL, slug UNIQUE, name, owner_id, plan DEFAULT 'free',
                     created_at, updated_at, deleted_at NULL)                       -- soft delete
roles               (id BIGSERIAL, workspace_id NULL, name, permissions JSONB,
                     is_system BOOL, created_at)                                    -- system roles have workspace_id NULL
workspace_members   (id BIGSERIAL, workspace_id FK, user_id FK->users, role_id FK->roles,
                     joined_at, UNIQUE(workspace_id, user_id))
projects            (id BIGSERIAL, workspace_id FK, key, name, lead_id,
                     created_at, updated_at, deleted_at NULL, UNIQUE(workspace_id, key))
```

System roles seeded on migration: `owner`, `member` (workspace_id NULL, is_system true).

## 4. API surface

### REST (FE → gateway proxy `/api/v1/workspaces/*` → workspace; reads `X-User-ID`)
- `POST   /api/v1/workspaces`               create (owner = caller); auto-adds owner member
- `GET    /api/v1/workspaces`               list workspaces the caller is a member of
- `GET    /api/v1/workspaces/:id`           get one (must be member)
- `PATCH  /api/v1/workspaces/:id`           update name/plan (must be owner)
- `DELETE /api/v1/workspaces/:id`           soft delete (must be owner)
- `POST   /api/v1/workspaces/:id/members`   add member {user_id, role}
- `GET    /api/v1/workspaces/:id/members`   list members
- `DELETE /api/v1/workspaces/:id/members/:uid` remove member (owner only)
- `POST   /api/v1/workspaces/:id/projects`  create project {key, name}
- `GET    /api/v1/workspaces/:id/projects`  list projects
- `GET    /api/v1/workspaces/:id/roles`     list roles (system + workspace custom)

### gRPC `WorkspaceService` (internal, for other services)
- `GetWorkspace(GetWorkspaceRequest{id}) → Workspace`
- `ListWorkspaces(ListWorkspacesRequest{user_id}) → ListWorkspacesResponse`
- `CheckMembership(CheckMembershipRequest{workspace_id, user_id}) → CheckMembershipResponse{is_member, role}`

## 5. Kafka event flow

Topic `auth.user.events`, key = user_id, value = protobuf `UserCreatedEvent`
(reuse `common.proto EventEnvelope` wrapping, or a dedicated message — see plan).

```
auth register  ──produce──▶  auth.user.events  ──consume──▶  workspace
                                                              1) UPSERT users projection
                                                              2) create "<name>'s Workspace"
                                                                 + owner member (idempotent)
```

Idempotency: consumer keyed by user_id; creating default workspace guarded by
"owner already has a default workspace?" check (slug `u-<user_id>-default`).

## 6. Trust model / auth

- Gateway `JWTAuth` (exists) verifies token, then **injects** `X-User-ID`,
  `X-User-Email` headers before proxying to any upstream.
- Gateway adds reverse proxy for `/api/v1/workspaces/*` → workspace HTTP (8002),
  under the **protected** group (JWT required).
- Workspace middleware `RequireUser` reads `X-User-ID` (abort 401 if missing/invalid).
  Workspace never sees the raw JWT.

## 7. Non-goals (this module)

- Spaces (Confluence) table — belongs to page-service.
- Custom permission enforcement engine (roles store JSONB permissions but we only
  enforce owner-vs-member for now).
- Kafka schema registry / Avro — use protobuf bytes directly.
- Outbox pattern / exactly-once — at-least-once + idempotent consumer is enough.

## 8. Build order

proto → migration → model → repository → service → handler → gRPC server →
HTTP server → main.go → Kafka consumer → auth Kafka producer → gateway
(inject headers + workspace proxy) → integration test.

Each step compiles; final step runs auth + workspace + gateway + Postgres + Kafka
end-to-end.

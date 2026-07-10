---
description: Scaffold a new Go microservice mirroring services/workspace (Clean Arch + gateway wiring)
---
Tạo Go service mới tên **$1** (vd `notification`), mirror `services/workspace` EXACT. Đọc
`CLAUDE.md` + `services/CLAUDE.md` trước.

Trước khi code, xác nhận với tôi: HTTP/gRPC port (theo scheme 80xx/90xx, tránh dải 91xx của hạ tầng),
schema DB (`$1`), và có cần Kafka consumer (authz projection) không.

Các bước:
1. `services/$1/go.mod` (module `github.com/pm-platform/$1`, `go 1.25.0`, replace proto-go => ../../packages/proto-go),
   copy require từ workspace. Thêm `./services/$1` vào root `go.work`.
2. Copy VERBATIM (đổi import path `workspace`→`$1`): `internal/{database/postgres.go, observability/*,
   middleware/{request_id,logger,metrics,recovery,user}.go}`.
3. `internal/config/config.go` theo mẫu workspace: env prefix `PM_$1` (uppercase), `v.BindEnv("database.url")`,
   ports mặc định, (KafkaConfig nếu cần consumer).
4. `migrations/001_create_$1_schema.up.sql` (+ down): `CREATE SCHEMA IF NOT EXISTS $1`, tables
   schema-qualified, partial-unique cho soft-delete, IF NOT EXISTS. (+ projection tables nếu authz event-driven.)
5. model → repository (interface + postgre*, $1 placeholder, soft-delete filter) → service (sentinel
   errors + authz) → handler (gin, bind+validate, map error) → server/http.go → cmd/$1/main.go (wire).
6. (Nếu consume events) `internal/events/consumer.go` mirror workspace: FetchMessage + commit-thủ-công +
   retry-tại-chỗ + idempotent.
7. Gateway: thêm upstream + reverse proxy (route trần + catch-all, nhóm protected) trong
   `services/api-gateway/internal/{config/config.go, server/http.go}` + `.env.example`.
8. `Makefile`, `.gitignore`, `.env.example` mirror workspace (KHÔNG hardcode secret; `.env` gitignored).

Verify mỗi bước: `GOWORK=off go -C services/$1 build ./... && vet` + `gofmt -l`. Cuối cùng chạy
`/review`. Comment tiếng Việt domain / Anh boilerplate.

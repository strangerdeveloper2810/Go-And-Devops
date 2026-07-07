# Auth Service + API Gateway JWT Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build auth-service (register, login, JWT, gRPC) + wire api-gateway JWT middleware and auth proxy routes.

**Architecture:** Auth service có 2 mặt: REST (Gin) cho FE gọi register/login qua api-gateway, gRPC cho service-to-service (VerifyToken, GetUser, ListUsers). API gateway proxy REST tới auth service, verify JWT ở middleware layer.

**Tech Stack:** Go 1.25, Gin, gRPC, pgx/v5, golang-jwt/v5, bcrypt, viper, slog, Docker multi-stage.

**Auth Flow:**
```
Register: FE → POST /api/v1/auth/register → api-gateway → auth-service REST → DB → return user
Login:    FE → POST /api/v1/auth/login    → api-gateway → auth-service REST → DB → return JWT pair
Verify:   FE → GET  /api/v1/projects       → api-gateway → JWT middleware → gRPC VerifyToken → auth-service
```

**Key Design Decisions:**
- Auth service tự issue JWT (access 15m + refresh 7d)
- Password hash bcrypt cost 12
- API gateway gọi gRPC VerifyToken — auth service là single source of truth
- Request/Response structs riêng trong handler
- Interface cho repository + service để testable

---

## 🎓 Concept Overview: Kiến trúc Clean Architecture trong Go

Trước khi code, hiểu bức tranh lớn:

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Handler  │ ──> │  Service │ ──> │   Repo   │ ──> │    DB    │
│ (Gin/HTTP)│     │(business)│     │ (SQL)    │     │(Postgres)│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
   Request          Logic            Data              Storage
   Parsing          Decisions        Access            Persistence
```

**Tại sao chia 3 lớp?**

| Lớp | Trách nhiệm | JS/Express so sánh |
|-----|-------------|-------------------|
| Handler | Parse request, format response | `req.body`, `res.json()` trong Express route |
| Service | Business logic, validation, orchestration | Phần middleware/service code bạn viết giữa request và DB |
| Repository | SQL queries, data access | Mongoose model, Prisma client, raw SQL |

**Tại sao không viết SQL trực tiếp trong handler?**

```go
// ❌ Tệ — SQL trong handler
func Login(c *gin.Context) {
    db.Query("SELECT * FROM users WHERE email = ?", email)
    // Không test được, không reuse được, thay đổi DB thì sửa khắp nơi
}

// ✅ Tốt — handler chỉ gọi service
func Login(c *gin.Context) {
    token, err := h.svc.Login(ctx, email, password)
    // Test được: mock service, không cần DB thật
}
```

**So sánh với React:** Giống như tách component UI (handler) khỏi custom hook chứa logic (service) khỏi API call (repository). UI chỉ render, hook chỉ xử lý state, API call chỉ fetch.

---

## Coding Conventions (phải theo)

| Concern | Pattern | JS equivalent |
|---------|---------|---------------|
| File header | `// Package X does Y.` | JSDoc `@module` |
| Config | Viper env-first, struct mapstructure tags | `process.env` + dotenv |
| Logging | slog JSON structured | pino, winston |
| Handler | Gin, request struct riêng có binding tags | Express route + Joi/Zod validation |
| Service | Interface + struct + constructor | Class với interface (ít gặp hơn trong JS) |
| Repository | Interface + struct + constructor | Repository pattern (Prisma, TypeORM) |
| Error | `fmt.Errorf("context: %w", err)` wrapping | `throw new Error()` + error chaining |
| Constructor | Return interface cho service/repo | Factory function trả về object |
| go.mod | Module path + replace directive | package.json + tsconfig paths |
| Makefile | Build tasks | npm scripts |

---

### Task 1: Scaffold auth-service

**Hiểu — go.mod và module system:**

Go module = npm package. `go.mod` = `package.json`. Module path `github.com/pm-platform/auth` là tên unique để import (giống `import { auth } from '@pm/auth'` trong JS).

```
go.mod          = package.json     (khai báo tên + dependencies)
go.sum          = package-lock.json (checksum verify)
go.work         = nx/turbo workspace (liên kết nhiều module local)
```

**`replace` directive trong go.mod:**
```go
replace github.com/pm-platform/proto-go => ../../packages/proto-go
```
= `"@pm/proto-go": "file:../../packages/proto-go"` trong package.json.
Giúp import proto code từ local thay vì phải publish lên GitHub.

**`go.work` dùng để làm gì?**
```
use (
    ./packages/proto-go
    ./services/api-gateway
    ./services/auth
)
```
Go workspace cho phép nhiều module cùng tồn tại trong 1 repo mà không cần `replace` directive. IDE (gopls) resolve import qua workspace, không cần publish package. Dev only — CI vẫn dùng `replace` trong go.mod.

**Files:**
- Create: `services/auth/go.mod`
- Create: `services/auth/Makefile`
- Create: `services/auth/Dockerfile`
- Create: `services/auth/.dockerignore`
- Create: `services/auth/.env.example`
- Modify: `go.work`

**Code skeleton:**

`services/auth/go.mod`:
```
module github.com/pm-platform/auth

go 1.25

require (
    github.com/gin-gonic/gin v1.10.0
    github.com/golang-jwt/jwt/v5 v5.2.1
    github.com/google/uuid v1.6.0
    github.com/jackc/pgx/v5 v5.7.1
    github.com/pm-platform/proto-go v0.0.0
    github.com/prometheus/client_golang v1.20.5
    github.com/spf13/viper v1.19.0
    go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin v0.57.0
    go.opentelemetry.io/otel v1.32.0
    go.opentelemetry.io/otel/exporters/otlp/otlptrace v1.32.0
    go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc v1.32.0
    go.opentelemetry.io/otel/sdk v1.32.0
    go.opentelemetry.io/otel/trace v1.32.0
    golang.org/x/crypto v0.28.0
    google.golang.org/grpc v1.69.4
)

replace github.com/pm-platform/proto-go => ../../packages/proto-go
```

`services/auth/Makefile` — copy từ api-gateway, đổi:
```makefile
SERVICE := auth
IMAGE   := pm-auth
```
Port: HTTP 8001, gRPC 9001.

`services/auth/Dockerfile` — copy từ api-gateway, đổi:
```dockerfile
COPY services/auth/ services/auth/
# ...
RUN ... -o /out/auth ./cmd/auth
# ...
COPY --from=builder /out/auth /usr/local/bin/auth
EXPOSE 8001 9001
ENTRYPOINT ["/usr/local/bin/auth"]
```

`services/auth/.env.example`:
```env
PM_AUTH_ENV=dev
PM_AUTH_LOG_LEVEL=debug
PM_AUTH_SERVER_HTTP_PORT=8001
PM_AUTH_SERVER_GRPC_PORT=9001
PM_AUTH_SERVER_READ_TIMEOUT=15s
PM_AUTH_SERVER_WRITE_TIMEOUT=15s
PM_AUTH_SERVER_SHUTDOWN_TIMEOUT=30s
PM_AUTH_DATABASE_URL=postgres://auth_user:auth_pass@localhost:5432/pmdb?sslmode=disable
PM_AUTH_JWT_ACCESS_SECRET=dev-access-secret-change-me
PM_AUTH_JWT_REFRESH_SECRET=dev-refresh-secret-change-me
PM_AUTH_JWT_ACCESS_TTL=15m
PM_AUTH_JWT_REFRESH_TTL=168h
PM_AUTH_OTEL_ENABLED=false
PM_AUTH_OTEL_SERVICE_NAME=auth-service
PM_AUTH_OTEL_OTLP_ENDPOINT=otel-collector:4317
PM_AUTH_OTEL_TRACE_SAMPLE_RATE=1.0
```

`go.work` — thêm:
```
use (
    ./packages/proto-go
    ./services/api-gateway
    ./services/auth
)
```

**Commit:**
```bash
git add services/auth/ go.work
git commit -m "chore(auth): scaffold service skeleton"
```

---

### Task 2: Config package

**Hiểu — Viper và config management:**

Viper = dotenv + config file loader trong Go. Load config từ nhiều nguồn theo priority: env vars > config file > defaults.

```go
v.SetEnvPrefix("PM_AUTH")       // Tất cả env vars bắt đầu bằng PM_AUTH_
v.AutomaticEnv()                // Tự động map PM_AUTH_SERVER_HTTP_PORT → server.http_port
```

**mapstructure tags** — cách Viper map config key vào struct field:
```go
type Config struct {
    Server ServerConfig `mapstructure:"server"`  // PM_AUTH_SERVER_HTTP_PORT → Server.HTTPPort
}
// So sánh JS: không có equivalent trực tiếp, gần giống destructuring:
// const { SERVER_HTTP_PORT } = process.env
```

**Tại sao dùng struct thay vì `os.Getenv()` rải rác?**
- Một chỗ validate tất cả config khi startup (fail fast)
- IDE autocomplete field
- Type-safe: `cfg.Server.HTTPPort` là int, không phải string cần parse

**`validate()` method** — chạy sau khi unmarshal, kiểm tra tất cả required fields:
```go
func (c *Config) validate() error {
    if c.Database.URL == "" {
        return fmt.Errorf("database.url is required")
    }
    // Fail ngay khi boot, không phải lúc đang xử lý request
}
```

**Files:**
- Create: `services/auth/internal/config/config.go`

**Code:**

```go
// Package config loads runtime configuration via Viper from env vars.
// Pattern giống api-gateway: env-first, struct-typed, validated on boot.
package config

import (
    "fmt"
    "strings"
    "time"

    "github.com/spf13/viper"
)

type Config struct {
    Env      string         `mapstructure:"env"`
    LogLevel string         `mapstructure:"log_level"`
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
    JWT      JWTConfig      `mapstructure:"jwt"`
    OTel     OTelConfig     `mapstructure:"otel"`
}

type ServerConfig struct {
    HTTPPort        int           `mapstructure:"http_port"`
    GRPCPort        int           `mapstructure:"grpc_port"`
    ReadTimeout     time.Duration `mapstructure:"read_timeout"`
    WriteTimeout    time.Duration `mapstructure:"write_timeout"`
    ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
}

type DatabaseConfig struct {
    URL string `mapstructure:"url"`
}

type JWTConfig struct {
    AccessSecret  string        `mapstructure:"access_secret"`
    RefreshSecret string        `mapstructure:"refresh_secret"`
    AccessTTL     time.Duration `mapstructure:"access_ttl"`
    RefreshTTL    time.Duration `mapstructure:"refresh_ttl"`
}

type OTelConfig struct {
    Enabled         bool    `mapstructure:"enabled"`
    ServiceName     string  `mapstructure:"service_name"`
    OTLPEndpoint    string  `mapstructure:"otlp_endpoint"`
    TraceSampleRate float64 `mapstructure:"trace_sample_rate"`
}

func Load() (*Config, error) {
    v := viper.New()
    v.SetEnvPrefix("PM_AUTH")
    v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
    v.AutomaticEnv()

    // Defaults
    v.SetDefault("env", "dev")
    v.SetDefault("log_level", "info")
    v.SetDefault("server.http_port", 8001)
    v.SetDefault("server.grpc_port", 9001)
    v.SetDefault("server.read_timeout", "15s")
    v.SetDefault("server.write_timeout", "15s")
    v.SetDefault("server.shutdown_timeout", "30s")
    v.SetDefault("jwt.access_ttl", "15m")
    v.SetDefault("jwt.refresh_ttl", "168h")
    v.SetDefault("otel.enabled", false)
    v.SetDefault("otel.service_name", "auth-service")
    v.SetDefault("otel.otlp_endpoint", "otel-collector:4317")
    v.SetDefault("otel.trace_sample_rate", 1.0)

    v.SetConfigName("config")
    v.SetConfigType("yaml")
    v.AddConfigPath(".")
    if err := v.ReadInConfig(); err != nil {
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            return nil, fmt.Errorf("read config file: %w", err)
        }
    }

    var cfg Config
    if err := v.Unmarshal(&cfg); err != nil {
        return nil, fmt.Errorf("unmarshal config: %w", err)
    }
    if err := cfg.validate(); err != nil {
        return nil, err
    }
    return &cfg, nil
}

func (c *Config) validate() error {
    if c.Env != "dev" && c.Env != "staging" && c.Env != "prod" {
        return fmt.Errorf("invalid env %q (want dev|staging|prod)", c.Env)
    }
    if c.Server.HTTPPort <= 0 || c.Server.HTTPPort > 65535 {
        return fmt.Errorf("invalid server.http_port %d", c.Server.HTTPPort)
    }
    if c.Server.GRPCPort <= 0 || c.Server.GRPCPort > 65535 {
        return fmt.Errorf("invalid server.grpc_port %d", c.Server.GRPCPort)
    }
    if c.Database.URL == "" {
        return fmt.Errorf("database.url is required")
    }
    if c.JWT.AccessSecret == "" {
        return fmt.Errorf("jwt.access_secret is required")
    }
    if c.JWT.RefreshSecret == "" {
        return fmt.Errorf("jwt.refresh_secret is required")
    }
    if c.OTel.Enabled && c.OTel.OTLPEndpoint == "" {
        return fmt.Errorf("otel.enabled=true but otel.otlp_endpoint is empty")
    }
    return nil
}
```

**Commit:**
```bash
git add services/auth/internal/config/config.go
git commit -m "feat(auth): add config package with database + JWT settings"
```

---

### Task 3: Model + Migration

**Hiểu — Model trong Go vs JS:**

```go
// Go: struct với tags để control JSON serialization
type User struct {
    ID           int64     `json:"id"`
    PasswordHash string    `json:"-"`      // "-" = never show in JSON (giống class private field)
}
```

```typescript
// JS/TS: class hoặc interface + class-transformer decorators
class User {
    id: number;
    @Exclude()  // = json:"-"
    passwordHash: string;
}
```

**Tại sao `json:"-"` cho PasswordHash?** — Security. Không bao giờ expose password hash ra API response, dù đã hash.

**Migration** — SQL files được chạy theo thứ tự để tạo/update database schema. Giống Knex.js migrations, Prisma migrations, hay TypeORM migrations. Mỗi file = 1 version thay đổi DB.

**`BIGSERIAL`** = auto-increment 64-bit integer (PostgreSQL). MySQL dùng `AUTO_INCREMENT`, JS ORM dùng `@PrimaryGeneratedColumn()`.

**`CHECK` constraint** — đảm bảo status chỉ nhận giá trị hợp lệ ở database level (không chỉ application level). Defense in depth.

**Files:**
- Create: `services/auth/internal/model/user.go`
- Create: `services/auth/migrations/001_create_users.up.sql`
- Create: `services/auth/migrations/001_create_users.down.sql`

**Code:**

`services/auth/internal/model/user.go`:
```go
// Package model defines domain types for the auth service.
// Plain structs — no ORM tags, no framework dependencies.
// Dữ liệu thuần, không phụ thuộc vào bất kỳ framework nào.
package model

import "time"

type User struct {
    ID           int64     `json:"id"`
    Email        string    `json:"email"`
    PasswordHash string    `json:"-"` // Không bao giờ expose ra JSON
    Name         string    `json:"name"`
    AvatarURL    string    `json:"avatar_url,omitempty"`
    Status       string    `json:"status"` // active | inactive | invited | migrated
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}

// Enum values cho User.Status — tránh magic strings rải rác trong code.
const (
    UserStatusActive   = "active"
    UserStatusInactive = "inactive"
    UserStatusInvited  = "invited"
    UserStatusMigrated = "migrated"
)
```

`services/auth/migrations/001_create_users.up.sql`:
```sql
-- Tạo bảng users trong schema auth.
-- Migration chạy theo thứ tự: 001, 002, 003... giống Knex/Prisma migrations.

CREATE TABLE IF NOT EXISTS auth.users (
    id            BIGSERIAL    PRIMARY KEY,            -- BIGSERIAL = auto-increment 64-bit
    email         VARCHAR(320) NOT NULL UNIQUE,         -- 320 = max email length theo RFC
    password_hash VARCHAR(255) NOT NULL,                -- bcrypt hash luôn 60 chars, 255 để dư
    name          VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url    TEXT         NOT NULL DEFAULT '',
    status        VARCHAR(20)  NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'invited', 'migrated')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),  -- TIMESTAMPTZ = có timezone
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index cho query thường xuyên — tăng tốc SELECT WHERE email = ?
CREATE INDEX idx_users_email  ON auth.users (email);
CREATE INDEX idx_users_status ON auth.users (status);
```

`services/auth/migrations/001_create_users.down.sql`:
```sql
-- Rollback: xóa bảng users.
DROP TABLE IF EXISTS auth.users;
```

**Commit:**
```bash
git add services/auth/internal/model/user.go services/auth/migrations/
git commit -m "feat(auth): add User model + create users migration"
```

---

### Task 4: Database Connection + Observability + Middleware

**Hiểu — `database/sql` vs ORM:**

Go không có ORM built-in. `database/sql` là abstraction layer — bạn viết SQL thật, nó xử lý connection pool, prepared statements, transactions. Giống như dùng `pg` (node-postgres) thay vì Prisma.

```go
// Go: sql.Open tạo pool, chưa connect thật
db, _ := sql.Open("pgx", dsn)
db.Ping() // ← mới test connect thật

// JS: pool.connect ngay lập tức
const pool = new Pool({ connectionString: dsn });
await pool.connect();
```

**Driver registration với blank import:**
```go
import _ "github.com/jackc/pgx/v5/stdlib" // _ = side-effect only import
```
`_` import = chỉ chạy `init()` function của package, không dùng function nào trực tiếp. Package pgx stdlib tự đăng ký driver "pgx" vào `database/sql`. Giống `import 'reflect-metadata'` trong TypeScript — import để có side effect.

**Observability packages — tại sao copy thay vì shared package?**

Phase 1 mỗi service tự chủ. Sau này thấy lặp quá thì extract ra shared package. Đây là "rule of three" — extract khi lặp 3 lần, không extract sớm quá (premature abstraction).

**Files:**
- Create: `services/auth/internal/database/postgres.go`
- Create: `services/auth/internal/observability/log.go` (copy + sửa import)
- Create: `services/auth/internal/observability/trace.go` (copy + sửa import)
- Create: `services/auth/internal/observability/metric.go` (copy + sửa import)
- Create: `services/auth/internal/middleware/request_id.go` (copy + sửa import)
- Create: `services/auth/internal/middleware/logger.go` (copy + sửa import)
- Create: `services/auth/internal/middleware/metrics.go` (copy + sửa import)
- Create: `services/auth/internal/middleware/recovery.go` (copy + sửa import)

**Code:**

`services/auth/internal/database/postgres.go`:
```go
// Package database cung cấp kết nối PostgreSQL cho auth service.
// Dùng database/sql + pgx driver — không ORM, viết SQL tay.
package database

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    // Side-effect import: đăng ký "pgx" driver vào database/sql.
    // Sau import này, sql.Open("pgx", ...) mới hoạt động.
    _ "github.com/jackc/pgx/v5/stdlib"
)

// Connect mở connection pool tới PostgreSQL và verify bằng Ping.
// Trả về *sql.DB — pool của các connections, an toàn cho concurrent use.
func Connect(ctx context.Context, databaseURL string) (*sql.DB, error) {
    // sql.Open chưa kết nối thật — chỉ tạo pool object.
    // Giống new Pool() trong node-postgres: tạo pool, chưa connect.
    db, err := sql.Open("pgx", databaseURL)
    if err != nil {
        return nil, fmt.Errorf("open database: %w", err)
    }

    // Pool config — giới hạn connection để không quá tải DB dev local.
    // Production cần tune mấy số này dựa trên workload + DB capacity.
    db.SetMaxOpenConns(25)        // Tối đa 25 connections mở đồng thời
    db.SetMaxIdleConns(5)         // Giữ 5 connections idle sẵn sàng
    db.SetConnMaxLifetime(5 * time.Minute)  // Đóng connection sau 5 phút
    db.SetConnMaxIdleTime(1 * time.Minute)  // Đóng idle connection sau 1 phút

    // PingContext test kết nối thật với timeout.
    // Nếu DB không tới được, fail ở đây — fail fast, không phải lúc xử lý request.
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel() // defer = cleanup khi function return (giống try-finally)
    if err := db.PingContext(ctx); err != nil {
        db.Close()
        return nil, fmt.Errorf("ping database: %w", err)
    }

    return db, nil
}
```

**Commit:**
```bash
git add services/auth/internal/database/ services/auth/internal/observability/ services/auth/internal/middleware/
git commit -m "feat(auth): add database connection + observability + middleware"
```

---

### Task 5: User Repository

**Hiểu — Repository pattern:**

Repository là lớp DUY NHẤT chứa SQL. Mọi truy vấn database đều qua repository. Điều này có nghĩa:
- Muốn đổi PostgreSQL → MySQL: chỉ sửa repository
- Muốn test service: mock repository, không cần DB thật
- Muốn audit tất cả query: chỉ cần xem 1 package

```go
// Interface = contract. Ai implement không quan trọng, miễn đúng contract.
type UserRepository interface {
    Create(ctx context.Context, user *model.User) error
    GetByEmail(ctx context.Context, email string) (*model.User, error)
}

// Implement PostgreSQL. Khi test: mockUserRepo cũng implement interface này.
type postgresUserRepo struct {
    db *sql.DB
}
```

**`*model.User` (pointer) vs `model.User` (value):**
- Pointer: truyền địa chỉ, function có thể sửa object gốc. Dùng cho Create (cần set ID, CreatedAt)
- Value: truyền bản copy. Dùng khi chỉ cần đọc.
- So sánh JS: mọi object trong JS đều là reference (pointer ngầm). Go bắt bạn chọn explicit.

**`QueryRowContext` vs `QueryContext`:**
- `QueryRowContext`: 1 row result. Không cần `rows.Close()` (tự động).
- `QueryContext`: nhiều rows. Phải `defer rows.Close()` để trả connection về pool.
- Giống: `pool.query()` trả về 1 row vs `pool.query()` trả về array.

**`rows.Scan()`**: Map từng cột SQL vào Go variables THEO THỨ TỰ. Không map theo tên cột. Sai thứ tự = sai dữ liệu.

**Files:**
- Create: `services/auth/internal/repository/user.go`

**Code:**

```go
// Package repository handles data access for auth service.
// Tất cả SQL queries đều nằm ở đây — handler/service không được viết SQL.
// Mục đích: một chỗ thay đổi khi đổi database, dễ mock khi test.
package repository

import (
    "context"
    "database/sql"
    "fmt"

    "github.com/pm-platform/auth/internal/model"
)

// UserRepository defines data access contract.
// Interface = hợp đồng: ai implement cũng được, miễn đúng methods này.
// Khi test: tạo mockUserRepo implement interface này, không cần DB thật.
type UserRepository interface {
    Create(ctx context.Context, user *model.User) error
    GetByEmail(ctx context.Context, email string) (*model.User, error)
    GetByID(ctx context.Context, id int64) (*model.User, error)
    ListByIDs(ctx context.Context, ids []int64) ([]*model.User, error)
    UpdateStatus(ctx context.Context, id int64, status string) error
}

// postgresUserRepo implements UserRepository with PostgreSQL + pgx.
// Viết thường = private (chỉ trong package repository truy cập được).
// Bên ngoài chỉ thấy UserRepository interface.
type postgresUserRepo struct {
    db *sql.DB // *sql.DB = pointer tới connection pool. Pool được share, không copy.
}

// NewUserRepository tạo PostgreSQL-backed UserRepository.
// Constructor return interface, không return struct — để bên ngoài không biết implementation.
func NewUserRepository(db *sql.DB) UserRepository {
    return &postgresUserRepo{db: db}
}

func (r *postgresUserRepo) Create(ctx context.Context, user *model.User) error {
    query := `
        INSERT INTO auth.users (email, password_hash, name, avatar_url, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at, updated_at`

    // $1, $2, ... = PostgreSQL placeholder. MySQL dùng ?, SQL Server dùng @p1.
    // pgx tự động escape parameters — không lo SQL injection.
    // QueryRowContext: trả về 1 row. Scan để đọc từng cột vào biến Go.
    err := r.db.QueryRowContext(ctx, query,
        user.Email, user.PasswordHash, user.Name, user.AvatarURL, user.Status,
    ).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
    if err != nil {
        return fmt.Errorf("insert user: %w", err) // %w = wrap error, giữ lại chain
    }
    return nil
}

func (r *postgresUserRepo) GetByEmail(ctx context.Context, email string) (*model.User, error) {
    query := `
        SELECT id, email, password_hash, name, avatar_url, status, created_at, updated_at
        FROM auth.users
        WHERE email = $1`

    user := &model.User{}
    // Scan theo THỨ TỰ cột trong SELECT. Sai thứ tự = bug.
    err := r.db.QueryRowContext(ctx, query, email).Scan(
        &user.ID, &user.Email, &user.PasswordHash, &user.Name,
        &user.AvatarURL, &user.Status, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        // sql.ErrNoRows = không tìm thấy user. Phân biệt với lỗi thật (DB down).
        if err == sql.ErrNoRows {
            return nil, fmt.Errorf("user not found: %w", err)
        }
        return nil, fmt.Errorf("get user by email: %w", err)
    }
    return user, nil
}

func (r *postgresUserRepo) GetByID(ctx context.Context, id int64) (*model.User, error) {
    query := `
        SELECT id, email, password_hash, name, avatar_url, status, created_at, updated_at
        FROM auth.users
        WHERE id = $1`

    user := &model.User{}
    err := r.db.QueryRowContext(ctx, query, id).Scan(
        &user.ID, &user.Email, &user.PasswordHash, &user.Name,
        &user.AvatarURL, &user.Status, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, fmt.Errorf("user not found: %w", err)
        }
        return nil, fmt.Errorf("get user by id: %w", err)
    }
    return user, nil
}

func (r *postgresUserRepo) ListByIDs(ctx context.Context, ids []int64) ([]*model.User, error) {
    if len(ids) == 0 {
        return []*model.User{}, nil // Trả về slice rỗng, không nil
    }

    query := `
        SELECT id, email, password_hash, name, avatar_url, status, created_at, updated_at
        FROM auth.users
        WHERE id = ANY($1)    -- ANY = WHERE id IN (...), nhưng dùng array param
        ORDER BY id`

    // QueryContext trả về nhiều rows. Phải defer rows.Close().
    rows, err := r.db.QueryContext(ctx, query, ids)
    if err != nil {
        return nil, fmt.Errorf("list users by ids: %w", err)
    }
    defer rows.Close() // Đảm bảo rows được đóng dù có lỗi hay không

    var users []*model.User
    for rows.Next() { // rows.Next() = cursor. False khi hết rows.
        u := &model.User{}
        if err := rows.Scan(
            &u.ID, &u.Email, &u.PasswordHash, &u.Name,
            &u.AvatarURL, &u.Status, &u.CreatedAt, &u.UpdatedAt,
        ); err != nil {
            return nil, fmt.Errorf("scan user: %w", err)
        }
        users = append(users, u)
    }
    // Luôn kiểm tra rows.Err() sau vòng lặp — có thể có lỗi giữa chừng.
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("iterate users: %w", err)
    }
    return users, nil
}

func (r *postgresUserRepo) UpdateStatus(ctx context.Context, id int64, status string) error {
    query := `UPDATE auth.users SET status = $1, updated_at = NOW() WHERE id = $2`
    result, err := r.db.ExecContext(ctx, query, status, id)
    if err != nil {
        return fmt.Errorf("update user status: %w", err)
    }
    // RowsAffected = số rows bị ảnh hưởng. Nếu = 0, user không tồn tại.
    rows, _ := result.RowsAffected()
    if rows == 0 {
        return fmt.Errorf("user %d not found", id)
    }
    return nil
}
```

**Commit:**
```bash
git add services/auth/internal/repository/user.go
git commit -m "feat(auth): add User repository with PostgreSQL implementation"
```

---

### Task 6: Auth Service (Business Logic + JWT)

**Hiểu — Service layer là trái tim của ứng dụng:**

Service chứa TOÀN BỘ business logic. Handler chỉ parse request, Repository chỉ query DB. Service là nơi quyết định "chuyện gì xảy ra".

**bcrypt — hash password an toàn:**
```
Bcrypt khác với SHA256/MD5:
- SHA256("secret") luôn ra cùng 1 hash → dùng rainbow table crack được
- Bcrypt tự sinh salt (random string) mỗi lần hash → cùng "secret" ra hash khác nhau
- Bcrypt chậm có chủ đích (cost factor) → brute-force mất hàng thế kỷ
```

```go
// Hash: bcrypt tự sinh salt, embed vào hash
hash, _ := bcrypt.GenerateFromPassword([]byte("secret"), 12)
// $2a$12$...salt...hash...  ← cost=12, salt nằm trong hash luôn

// Verify: tự extract salt từ hash, hash password input với salt đó, so sánh
bcrypt.CompareHashAndPassword([]byte(hash), []byte("secret"))
```

**JWT (JSON Web Token) — stateless authentication:**
```
JWT structure: header.payload.signature
- Header: {"alg": "HS256"} — thuật toán ký
- Payload: {"user_id": 1, "email": "...", "exp": 1234567890} — claims
- Signature: HMAC-SHA256(header.payload, secret) — chữ ký chống giả mạo

Tại sao JWT?
- Stateless: server không cần lưu session trong DB/Redis
- Scalable: bất kỳ service nào có secret đều verify được
- Nhược: không revoke được (không "logout" force được) → dùng TTL ngắn + refresh token
```

**Access token vs Refresh token:**
- Access token: ngắn (15 phút), gửi trong mỗi request. Nếu bị steal, hết hạn nhanh.
- Refresh token: dài (7 ngày), chỉ gửi khi access token hết hạn. Lưu trong httpOnly cookie hoặc secure storage.
- Pattern: giống OAuth 2.0 implicit flow đơn giản hóa.

**Files:**
- Create: `services/auth/internal/service/auth.go`

**Code:**

```go
// Package service contains business logic for auth.
// Đây là "trái tim" của auth service — mọi decision đều ở đây.
// Handler chỉ parse request, Repository chỉ query DB.
package service

import (
    "context"
    "fmt"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/pm-platform/auth/internal/config"
    "github.com/pm-platform/auth/internal/model"
    "github.com/pm-platform/auth/internal/repository"
    "golang.org/x/crypto/bcrypt"
)

// AuthService defines the business logic contract.
// Interface cho phép mock toàn bộ service khi test handler.
type AuthService interface {
    Register(ctx context.Context, email, password, name string) (*model.User, error)
    Login(ctx context.Context, email, password string) (*TokenPair, error)
    VerifyToken(ctx context.Context, accessToken string) (*TokenClaims, error)
    GetUser(ctx context.Context, userID int64) (*model.User, error)
    ListUsers(ctx context.Context, ids []int64) ([]*model.User, error)
}

// TokenPair returned on successful login.
type TokenPair struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
    ExpiresIn    int64  `json:"expires_in"` // seconds — FE biết khi nào cần refresh
}

// TokenClaims extracted from JWT after verification.
type TokenClaims struct {
    UserID int64  `json:"user_id"`
    Email  string `json:"email"`
}

const bcryptCost = 12 // ~250ms trên máy dev. Cân bằng security vs UX.

// authService implements AuthService.
// Viết thường = private. Bên ngoài chỉ thấy interface.
type authService struct {
    repo   repository.UserRepository
    jwtCfg config.JWTConfig // Chỉ cần JWT config, không cần cả Config struct
}

// NewAuthService creates AuthService with dependencies injected.
// Dependency Injection: repo + config được truyền từ ngoài, không tự tạo.
func NewAuthService(repo repository.UserRepository, jwtCfg config.JWTConfig) AuthService {
    return &authService{repo: repo, jwtCfg: jwtCfg}
}

func (s *authService) Register(ctx context.Context, email, password, name string) (*model.User, error) {
    // Kiểm tra email đã tồn tại — tránh duplicate.
    if _, err := s.repo.GetByEmail(ctx, email); err == nil {
        return nil, fmt.Errorf("email already registered")
    }

    // Hash password trước khi lưu. KHÔNG BAO GIỜ lưu plaintext password.
    // Bcrypt tự sinh salt, lưu salt trong hash — không cần cột salt riêng.
    hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
    if err != nil {
        return nil, fmt.Errorf("hash password: %w", err)
    }

    user := &model.User{
        Email:        email,
        PasswordHash: string(hashed),
        Name:         name,
        Status:       model.UserStatusActive,
    }
    if err := s.repo.Create(ctx, user); err != nil {
        return nil, fmt.Errorf("create user: %w", err)
    }
    return user, nil
}

func (s *authService) Login(ctx context.Context, email, password string) (*TokenPair, error) {
    user, err := s.repo.GetByEmail(ctx, email)
    if err != nil {
        // KHÔNG phân biệt "email sai" vs "password sai" trong error message.
        // Kẻ tấn công có thể dùng sự khác biệt để enumerate emails.
        return nil, fmt.Errorf("invalid email or password")
    }

    // CompareHashAndPassword: extract salt từ hash → hash input với salt đó → compare.
    // Tự động constant-time comparison — chống timing attack.
    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
        return nil, fmt.Errorf("invalid email or password")
    }

    // Không cho inactive/invited user login.
    if user.Status != model.UserStatusActive {
        return nil, fmt.Errorf("account is %s", user.Status)
    }

    // Generate JWT pair.
    now := time.Now()
    accessToken, err := s.generateJWT(user, now, s.jwtCfg.AccessSecret, s.jwtCfg.AccessTTL)
    if err != nil {
        return nil, fmt.Errorf("generate access token: %w", err)
    }
    refreshToken, err := s.generateJWT(user, now, s.jwtCfg.RefreshSecret, s.jwtCfg.RefreshTTL)
    if err != nil {
        return nil, fmt.Errorf("generate refresh token: %w", err)
    }

    return &TokenPair{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        ExpiresIn:    int64(s.jwtCfg.AccessTTL.Seconds()),
    }, nil
}

// generateJWT creates a signed JWT with HS256 algorithm.
// Claims: user_id + email + standard (iat, exp, iss).
func (s *authService) generateJWT(user *model.User, now time.Time, secret string, ttl time.Duration) (string, error) {
    claims := jwt.MapClaims{
        "user_id": user.ID,                              // Custom claim
        "email":   user.Email,                           // Custom claim
        "iat":     now.Unix(),                           // Issued At — khi nào token được tạo
        "exp":     now.Add(ttl).Unix(),                  // Expires At — khi nào hết hạn
        "iss":     "pm-platform",                        // Issuer — ai phát hành token
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    // SignedString ký token với secret. Secret phải là []byte.
    return token.SignedString([]byte(secret))
}

func (s *authService) VerifyToken(ctx context.Context, accessToken string) (*TokenClaims, error) {
    // jwt.Parse với key function: xác nhận signing method + trả về secret.
    token, err := jwt.Parse(accessToken, func(token *jwt.Token) (interface{}, error) {
        // Bảo vệ: chỉ chấp nhận HMAC (HS256). Nếu token nói nó là RS256
        // nhưng mình xác nhận bằng HMAC → algorithm confusion attack.
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return []byte(s.jwtCfg.AccessSecret), nil
    })
    if err != nil {
        return nil, fmt.Errorf("parse token: %w", err)
    }

    // Extract claims. MapClaims = map[string]interface{}.
    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok || !token.Valid {
        return nil, fmt.Errorf("invalid token")
    }

    // JSON numbers → Go float64. Phải cast, không dùng trực tiếp.
    userID, ok := claims["user_id"].(float64)
    if !ok {
        return nil, fmt.Errorf("user_id claim missing or invalid")
    }
    email, ok := claims["email"].(string)
    if !ok {
        return nil, fmt.Errorf("email claim missing or invalid")
    }

    return &TokenClaims{
        UserID: int64(userID),
        Email:  email,
    }, nil
}

func (s *authService) GetUser(ctx context.Context, userID int64) (*model.User, error) {
    return s.repo.GetByID(ctx, userID)
}

func (s *authService) ListUsers(ctx context.Context, ids []int64) ([]*model.User, error) {
    return s.repo.ListByIDs(ctx, ids)
}
```

**Commit:**
```bash
git add services/auth/internal/service/auth.go
git commit -m "feat(auth): add AuthService with register, login, JWT generation/verification"
```

---

### Task 7: Auth REST Handler

**Hiểu — Handler chỉ làm 3 việc:**

1. Parse & validate request
2. Gọi service
3. Format response

**Không làm:** business logic, SQL, hash password, generate JWT — đó là việc của service.

**`binding` tags trong Gin:**
```go
type RegisterRequest struct {
    Email    string `json:"email"    binding:"required,email"`
    Password string `json:"password" binding:"required,min=8"`
}
```
Gin tự động validate request body dựa trên tags. Giống Zod/Joi trong JS:
```typescript
const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
```

**Tại sao dùng request struct riêng thay vì model.User trực tiếp?**
- Model.User có PasswordHash field — không muốn client gửi field này
- Request có validation rules khác với DB model
- Tránh "mass assignment vulnerability" — client gửi `{"status": "admin"}` qua request

**Files:**
- Create: `services/auth/internal/handler/auth.go`

**Code:**

```go
// Package handler bundles HTTP request handlers for auth service.
// Handler chỉ parse request → gọi service → format response.
// KHÔNG có business logic hay SQL ở đây.
package handler

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/pm-platform/auth/internal/model"
    "github.com/pm-platform/auth/internal/service"
)

// AuthHandler xử lý HTTP requests cho auth endpoints.
type AuthHandler struct {
    svc service.AuthService // Service interface — dễ mock khi test handler
}

func NewAuthHandler(svc service.AuthService) *AuthHandler {
    return &AuthHandler{svc: svc}
}

// ─── Request types ────────────────────────────────────────────
// Struct riêng cho request — không dùng model.User trực tiếp.
// Lý do: tách biệt API contract với DB schema.
// binding tags = validation tự động bởi Gin (giống Zod trong JS).

type RegisterRequest struct {
    Email    string `json:"email"    binding:"required,email"`   // required + format email
    Password string `json:"password" binding:"required,min=8"`   // tối thiểu 8 ký tự
    Name     string `json:"name"     binding:"required"`         // required
}

type LoginRequest struct {
    Email    string `json:"email"    binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

// ─── Handlers ─────────────────────────────────────────────────

func (h *AuthHandler) Register(c *gin.Context) {
    var req RegisterRequest
    // ShouldBindJSON: parse JSON → validate binding tags → trả lỗi nếu fail.
    if err := c.ShouldBindJSON(&req); err != nil {
        // 400 Bad Request — client gửi sai format.
        c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
        return
    }

    user, err := h.svc.Register(c.Request.Context(), req.Email, req.Password, req.Name)
    if err != nil {
        // 409 Conflict — email đã tồn tại (duplicate).
        c.JSON(http.StatusConflict, errorBody("REGISTER_FAILED", err.Error()))
        return
    }

    // 201 Created — resource mới được tạo.
    c.JSON(http.StatusCreated, gin.H{
        "user": userToJSON(user),
    })
}

func (h *AuthHandler) Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
        return
    }

    token, err := h.svc.Login(c.Request.Context(), req.Email, req.Password)
    if err != nil {
        // 401 Unauthorized — sai email/password hoặc account bị khóa.
        // Không phân biệt lý do cụ thể trong message (security).
        c.JSON(http.StatusUnauthorized, errorBody("LOGIN_FAILED", err.Error()))
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "access_token":  token.AccessToken,
        "refresh_token": token.RefreshToken,
        "expires_in":    token.ExpiresIn,
        "token_type":    "Bearer", // Chuẩn: cho client biết cách gửi token
    })
}

// ─── Helpers ──────────────────────────────────────────────────

// errorBody tạo response body chuẩn cho lỗi.
func errorBody(code, message string) gin.H {
    return gin.H{"error": gin.H{"code": code, "message": message}}
}

// userToJSON convert model.User → API response.
// Tách khỏi model để model không phụ thuộc vào response format.
func userToJSON(u *model.User) gin.H {
    return gin.H{
        "id":         u.ID,
        "email":      u.Email,
        "name":       u.Name,
        "avatar_url": u.AvatarURL,
        "status":     u.Status,
        "created_at": u.CreatedAt,
    }
}
```

**Commit:**
```bash
git add services/auth/internal/handler/auth.go
git commit -m "feat(auth): add REST handler with register and login endpoints"
```

---

### Task 8: Auth gRPC Server

**Hiểu — gRPC vs REST:**

```
REST:    POST /api/v1/auth/register  {"email":"..."}  → JSON response
gRPC:    client.Register(ctx, &RegisterRequest{...})   → protobuf response

REST = text-based (JSON), human-readable, browser-friendly.
gRPC = binary (protobuf), machine-efficient, strongly typed.
```

**Khi nào dùng gì?**
- FE → BE: REST (browser không nói gRPC native)
- BE → BE: gRPC (nhanh hơn 30-50%, strongly typed contract, streaming)

**Protobuf service definition:**
```protobuf
service AuthService {
  rpc VerifyToken(VerifyTokenRequest) returns (VerifyTokenResponse);
}
```
proto → codegen → `AuthServiceServer` interface trong Go. Mình implement interface đó.

**`UnimplementedAuthServiceServer`** — embed struct này để forward-compatible. Khi proto thêm method mới, code cũ không break (có default implementation trả về "unimplemented" error).

**gRPC status codes** — khác HTTP status codes nhưng concept giống:
```
gRPC NotFound (5)  = HTTP 404
gRPC Internal (13) = HTTP 500
gRPC OK (0)        = HTTP 200
```

**Files:**
- Create: `services/auth/internal/server/grpc.go`

**Code:**

```go
// Package server wires HTTP and gRPC servers.
package server

import (
    "context"
    "fmt"
    "log/slog"
    "net"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/health"
    healthpb "google.golang.org/grpc/health/grpc_health_v1"
    "google.golang.org/grpc/reflection"
    "google.golang.org/grpc/status"
    "google.golang.org/protobuf/types/known/timestamppb"

    "github.com/pm-platform/auth/internal/config"
    "github.com/pm-platform/auth/internal/service"
    pmv1 "github.com/pm-platform/proto-go/pm/v1"
)

// AuthGRPCServer implements the gRPC AuthService generated from proto.
// Embed UnimplementedAuthServiceServer = forward-compatible.
// Khi proto thêm method mới, code cũ không bị break (có default impl).
type AuthGRPCServer struct {
    pmv1.UnimplementedAuthServiceServer
    svc    service.AuthService
    srv    *grpc.Server
    lis    net.Listener
    logger *slog.Logger
    cfg    *config.Config
}

func NewAuthGRPCServer(cfg *config.Config, logger *slog.Logger, svc service.AuthService) (*AuthGRPCServer, error) {
    lis, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.Server.GRPCPort))
    if err != nil {
        return nil, fmt.Errorf("grpc listen: %w", err)
    }

    s := grpc.NewServer()

    a := &AuthGRPCServer{
        svc:    svc,
        srv:    s,
        lis:    lis,
        logger: logger,
        cfg:    cfg,
    }

    // Đăng ký service implementation vào gRPC server.
    pmv1.RegisterAuthServiceServer(s, a)

    // Standard gRPC health check — Kubernetes/Docker health probe dùng cái này.
    hs := health.NewServer()
    hs.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
    healthpb.RegisterHealthServer(s, hs)

    // Reflection = cho phép grpcurl khám phá API (giống Swagger UI cho REST).
    // Chỉ bật non-prod.
    if cfg.Env != "prod" {
        reflection.Register(s)
    }

    return a, nil
}

func (a *AuthGRPCServer) Start() error {
    a.logger.Info("grpc server listening", slog.String("addr", a.lis.Addr().String()))
    if err := a.srv.Serve(a.lis); err != nil {
        return fmt.Errorf("grpc serve: %w", err)
    }
    return nil
}

func (a *AuthGRPCServer) Shutdown(ctx context.Context) error {
    a.logger.Info("grpc server shutting down")
    stopped := make(chan struct{})
    go func() {
        a.srv.GracefulStop() // Không nhận request mới, chờ in-flight xong
        close(stopped)
    }()
    select {
    case <-stopped:
        return nil
    case <-ctx.Done():
        a.srv.Stop() // Force stop nếu quá timeout
        return ctx.Err()
    }
}

// ─── gRPC Handlers ────────────────────────────────────────────

func (a *AuthGRPCServer) VerifyToken(ctx context.Context, req *pmv1.VerifyTokenRequest) (*pmv1.VerifyTokenResponse, error) {
    claims, err := a.svc.VerifyToken(ctx, req.AccessToken)
    if err != nil {
        // Token invalid không phải là system error — trả về valid=false.
        // Không return gRPC error vì client cần phân biệt:
        //   - valid=false: token hết hạn/sai → client refresh
        //   - gRPC error: auth service đang lỗi → client retry
        return &pmv1.VerifyTokenResponse{Valid: false}, nil
    }

    return &pmv1.VerifyTokenResponse{
        Valid:  true,
        UserId: claims.UserID,
        Email:  claims.Email,
    }, nil
}

func (a *AuthGRPCServer) GetUser(ctx context.Context, req *pmv1.GetUserRequest) (*pmv1.GetUserResponse, error) {
    user, err := a.svc.GetUser(ctx, req.UserId)
    if err != nil {
        // codes.NotFound = HTTP 404 trong gRPC.
        return nil, status.Error(codes.NotFound, "user not found")
    }

    return &pmv1.GetUserResponse{
        User: &pmv1.User{
            Id:        user.ID,
            Email:     user.Email,
            Name:      user.Name,
            AvatarUrl: user.AvatarURL,
            Status:    toProtoStatus(user.Status),
            CreatedAt: timestamppb.New(user.CreatedAt), // time.Time → proto Timestamp
        },
    }, nil
}

func (a *AuthGRPCServer) ListUsers(ctx context.Context, req *pmv1.ListUsersRequest) (*pmv1.ListUsersResponse, error) {
    users, err := a.svc.ListUsers(ctx, req.Ids)
    if err != nil {
        return nil, status.Error(codes.Internal, "list users failed")
    }

    pbUsers := make([]*pmv1.User, len(users))
    for i, u := range users {
        pbUsers[i] = &pmv1.User{
            Id:        u.ID,
            Email:     u.Email,
            Name:      u.Name,
            AvatarUrl: u.AvatarURL,
            Status:    toProtoStatus(u.Status),
            CreatedAt: timestamppb.New(u.CreatedAt),
        }
    }

    return &pmv1.ListUsersResponse{
        Users: pbUsers,
        Page: &pmv1.PageResponse{
            TotalCount: int32(len(users)),
        },
    }, nil
}

// toProtoStatus maps model status string → proto enum.
func toProtoStatus(s string) pmv1.UserStatus {
    switch s {
    case "active":
        return pmv1.UserStatus_USER_STATUS_ACTIVE
    case "inactive":
        return pmv1.UserStatus_USER_STATUS_INACTIVE
    case "invited":
        return pmv1.UserStatus_USER_STATUS_INVITED
    case "migrated":
        return pmv1.UserStatus_USER_STATUS_MIGRATED
    default:
        return pmv1.UserStatus_USER_STATUS_UNSPECIFIED
    }
}
```

**Commit:**
```bash
git add services/auth/internal/server/grpc.go
git commit -m "feat(auth): add gRPC server implementing AuthService (VerifyToken, GetUser, ListUsers)"
```

---

### Task 9: Auth HTTP Server

**Hiểu — Gin engine + middleware stack:**

```
Request → RequestID → OTel → Logger → Metrics → Recovery → Handler
                                                              ↓
Response ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

Middleware chạy theo thứ tự đăng ký. Mỗi middleware có thể:
- Làm gì đó trước handler (vd: set request ID)
- Gọi `c.Next()` để chạy middleware/handler tiếp theo
- Làm gì đó sau handler (vd: log request)

**`gin.H`** = `map[string]interface{}` viết tắt. Giống `{}` object literal trong JS:
```go
gin.H{"status": "alive"}  // = {"status": "alive"} trong JS
```

**Files:**
- Create: `services/auth/internal/server/http.go`

**Code:**

```go
package server

import (
    "context"
    "fmt"
    "log/slog"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"

    "github.com/pm-platform/auth/internal/config"
    "github.com/pm-platform/auth/internal/handler"
    "github.com/pm-platform/auth/internal/middleware"
    "github.com/pm-platform/auth/internal/observability"
)

// HTTPServer wraps *http.Server với Gin router + health + metrics.
type HTTPServer struct {
    srv    *http.Server
    logger *slog.Logger
    cfg    *config.Config
}

func NewHTTPServer(
    cfg *config.Config,
    logger *slog.Logger,
    metrics *observability.Metrics,
    authHandler *handler.AuthHandler,
) *HTTPServer {
    // Production mode tắt debug log, tối ưu performance.
    if cfg.Env == "prod" {
        gin.SetMode(gin.ReleaseMode)
    }

    r := gin.New()

    // Middleware stack — THỨ TỰ QUAN TRỌNG.
    // RequestID trước để các middleware sau có thể log request_id.
    r.Use(middleware.RequestID())
    r.Use(otelgin.Middleware(cfg.OTel.ServiceName)) // OTel tracing
    r.Use(middleware.Logger(logger))
    r.Use(middleware.Metrics(metrics))
    r.Use(middleware.Recovery(logger)) // Phải cuối cùng để bắt panic từ tất cả handler

    // Health probes — không cần auth.
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "alive"})
    })
    r.GET("/ready", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ready"})
    })
    // Prometheus metrics endpoint.
    r.GET("/metrics", gin.WrapH(promhttp.Handler()))

    // API v1 — auth routes (public endpoints, không cần JWT).
    v1 := r.Group("/api/v1/auth")
    {
        v1.POST("/register", authHandler.Register)
        v1.POST("/login", authHandler.Login)
    }

    return &HTTPServer{
        srv: &http.Server{
            Addr:         fmt.Sprintf(":%d", cfg.Server.HTTPPort),
            Handler:      r,
            ReadTimeout:  cfg.Server.ReadTimeout,  // Chống slow client
            WriteTimeout: cfg.Server.WriteTimeout,
            IdleTimeout:  60 * time.Second,         // Keep-alive timeout
        },
        logger: logger,
        cfg:    cfg,
    }
}

func (h *HTTPServer) Start() error {
    h.logger.Info("http server listening", slog.String("addr", h.srv.Addr))
    // ListenAndServe blocks. Trả về ErrServerClosed khi Shutdown() được gọi.
    if err := h.srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        return fmt.Errorf("http listen: %w", err)
    }
    return nil
}

func (h *HTTPServer) Shutdown(ctx context.Context) error {
    h.logger.Info("http server shutting down")
    return h.srv.Shutdown(ctx)
}
```

**Commit:**
```bash
git add services/auth/internal/server/http.go
git commit -m "feat(auth): add HTTP server with health probes and auth routes"
```

---

### Task 10: Auth main.go — Wire Everything

**Hiểu — Dependency Injection (DI) là gì?**

DI = object không tự tạo dependency của nó, dependency được "inject" từ ngoài.

```go
// ❌ Không DI — service tự tạo repository
func NewAuthService() AuthService {
    repo := repository.NewUserRepository(db) // lấy db ở đâu?
    return &authService{repo: repo}
}

// ✅ Có DI — dependency được truyền vào
func NewAuthService(repo UserRepository, jwtCfg config.JWTConfig) AuthService {
    return &authService{repo: repo, jwtCfg: jwtCfg}
}
```

Lợi ích:
1. Test: mock repo, không cần DB thật
2. Flexibility: đổi implementation không cần sửa service code
3. Explicit: nhìn constructor là biết object cần những gì

**`defer`** — Go's way of cleanup:
```go
defer db.Close() // Đảm bảo Close() được gọi khi function return
// Giống try-finally hoặc useEffect cleanup trong React:
// useEffect(() => { return () => cleanup() }, [])
```

**Signal handling — graceful shutdown:**
```
SIGINT (Ctrl+C) → signal channel → stop accepting new requests → finish in-flight → close DB → exit
```
Không kill process đột ngột — request đang xử lý được hoàn thành.

**Files:**
- Create: `services/auth/cmd/auth/main.go`

**Code:**

```go
// auth-service: authentication service for PM Platform.
//
// Responsibilities:
//   - REST endpoints: register, login (called via api-gateway)
//   - gRPC server: VerifyToken, GetUser, ListUsers (called by other services)
//   - JWT issue and verification
//   - User CRUD
package main

import (
    "context"
    "errors"
    "fmt"
    "log/slog"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"

    "github.com/pm-platform/auth/internal/config"
    "github.com/pm-platform/auth/internal/database"
    "github.com/pm-platform/auth/internal/handler"
    "github.com/pm-platform/auth/internal/observability"
    "github.com/pm-platform/auth/internal/repository"
    "github.com/pm-platform/auth/internal/server"
    "github.com/pm-platform/auth/internal/service"
)

func main() {
    // Tách logic ra hàm run() để defer hoạt động đúng.
    // main() chỉ gọi run() và exit với code phù hợp.
    if err := run(); err != nil {
        fmt.Fprintf(os.Stderr, "fatal: %v\n", err)
        os.Exit(1)
    }
}

func run() error {
    // ─── Config ────────────────────────────────────────────────
    cfg, err := config.Load()
    if err != nil {
        return fmt.Errorf("load config: %w", err)
    }

    // ─── Logger ────────────────────────────────────────────────
    // Slog JSON structured logging. Mỗi dòng log là 1 JSON object.
    logger := observability.NewLogger(cfg.LogLevel, cfg.OTel.ServiceName)
    logger.Info("starting auth-service",
        slog.String("env", cfg.Env),
        slog.Int("http_port", cfg.Server.HTTPPort),
        slog.Int("grpc_port", cfg.Server.GRPCPort),
    )

    // ─── OpenTelemetry Tracing ─────────────────────────────────
    // Trace = theo dõi 1 request đi qua nhiều services.
    // Mỗi service thêm 1 span vào trace.
    traceShutdown, err := observability.InitTracer(context.Background(), observability.TraceConfig{
        Enabled:      cfg.OTel.Enabled,
        ServiceName:  cfg.OTel.ServiceName,
        OTLPEndpoint: cfg.OTel.OTLPEndpoint,
        SampleRate:   cfg.OTel.TraceSampleRate,
        Env:          cfg.Env,
    })
    if err != nil {
        return fmt.Errorf("init tracer: %w", err)
    }
    defer func() {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        _ = traceShutdown(ctx) // Flush remaining spans before exit
    }()

    // ─── Database ──────────────────────────────────────────────
    db, err := database.Connect(context.Background(), cfg.Database.URL)
    if err != nil {
        return fmt.Errorf("connect database: %w", err)
    }
    defer db.Close() // Đảm bảo đóng connection pool khi process exit
    logger.Info("database connected")

    // ─── Dependency Injection ──────────────────────────────────
    // Wiring: DB → Repo → Service → Handler → Server
    // Mỗi layer chỉ phụ thuộc vào interface của layer dưới.
    userRepo := repository.NewUserRepository(db)
    authSvc := service.NewAuthService(userRepo, cfg.JWT)
    authHandler := handler.NewAuthHandler(authSvc)
    metrics := observability.NewMetrics()

    httpSrv := server.NewHTTPServer(cfg, logger, metrics, authHandler)
    grpcSrv, err := server.NewAuthGRPCServer(cfg, logger, authSvc)
    if err != nil {
        return fmt.Errorf("init grpc server: %w", err)
    }

    // ─── Start Servers ────────────────────────────────────────
    // errCh collects fatal errors từ goroutines.
    // Buffered channel (size 2) để goroutine không bị block khi gửi error.
    errCh := make(chan error, 2)
    var wg sync.WaitGroup // Đếm goroutines đang chạy

    wg.Add(2) // 2 servers
    go func() {
        defer wg.Done()
        if err := httpSrv.Start(); err != nil {
            errCh <- fmt.Errorf("http: %w", err)
        }
    }()
    go func() {
        defer wg.Done()
        if err := grpcSrv.Start(); err != nil {
            errCh <- fmt.Errorf("grpc: %w", err)
        }
    }()

    // ─── Signal Handling ───────────────────────────────────────
    // Chờ signal (Ctrl+C) HOẶC fatal error từ 1 server.
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

    select {
    case sig := <-sigCh:
        logger.Info("signal received, shutting down", slog.String("signal", sig.String()))
    case err := <-errCh:
        logger.Error("server error, shutting down", slog.Any("err", err))
    }

    // ─── Graceful Shutdown ────────────────────────────────────
    shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
    defer cancel()

    var shutdownErrs []error
    if err := httpSrv.Shutdown(shutdownCtx); err != nil {
        shutdownErrs = append(shutdownErrs, fmt.Errorf("http shutdown: %w", err))
    }
    if err := grpcSrv.Shutdown(shutdownCtx); err != nil {
        shutdownErrs = append(shutdownErrs, fmt.Errorf("grpc shutdown: %w", err))
    }

    wg.Wait() // Đợi tất cả goroutines return

    // errors.Join gộp tất cả lỗi thành 1 (Go 1.20+).
    if len(shutdownErrs) > 0 {
        return errors.Join(shutdownErrs...)
    }
    logger.Info("shutdown complete")
    return nil
}
```

**Commit:**
```bash
git add services/auth/cmd/auth/main.go
cd services/auth && go mod tidy
git add services/auth/go.mod services/auth/go.sum
git commit -m "feat(auth): wire main.go with full dependency injection"
```

---

### Task 11: API Gateway — JWT Middleware

**Hiểu — Middleware pattern trong API Gateway:**

API gateway là "cửa khẩu" — mọi request từ FE đều qua đây. JWT middleware kiểm tra token trước khi request đến upstream service.

**Tại sao verify qua gRPC thay vì tự verify JWT?**

```
Cách 1 (đơn giản): Gateway tự parse JWT với shared secret
  - Ưu: nhanh (không cần network call)
  - Nhược: không kiểm tra được user status (active? banned? deleted?)
  - Nhược: secret shared nhiều nơi → secret leak ảnh hưởng rộng

Cách 2 (chọn): Gateway gọi auth service VerifyToken gRPC
  - Ưu: auth service là single source of truth về user state
  - Ưu: secret chỉ có ở auth service
  - Nhược: thêm 1 network call (~5ms)
  - Giải quyết: cache kết quả verify với Redis (phase sau)
```

**`grpc.WithBlock()`**: Đợi đến khi connection established mới return. Không dùng = lazy connect, request đầu tiên sẽ chậm.

**Files:**
- Create: `services/api-gateway/internal/middleware/jwt.go`
- Modify: `services/api-gateway/internal/server/http.go`

**Code:**

`services/api-gateway/internal/middleware/jwt.go`:
```go
package middleware

import (
    "context"
    "net/http"
    "strings"
    "time"

    "github.com/gin-gonic/gin"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"

    pmv1 "github.com/pm-platform/proto-go/pm/v1"
)

// JWTAuth verify Bearer tokens bằng cách gọi auth service gRPC VerifyToken.
// Auth service là single source of truth — gateway không tự verify JWT.
func JWTAuth(authAddr string) gin.HandlerFunc {
    // Tạo gRPC connection tới auth service khi khởi tạo middleware.
    // Trong production: connection pool, health check, circuit breaker.
    conn, err := grpc.NewClient(authAddr,
        grpc.WithTransportCredentials(insecure.NewCredentials()), // Dev không TLS
    )
    if err != nil {
        // Fail closed: nếu không kết nối được auth service, từ chối mọi request.
        return func(c *gin.Context) {
            c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
                "error": gin.H{
                    "code":    "AUTH_SERVICE_UNAVAILABLE",
                    "message": "Authentication service is not available",
                },
            })
        }
    }

    client := pmv1.NewAuthServiceClient(conn)

    return func(c *gin.Context) {
        // Extract token từ Authorization header.
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": gin.H{
                    "code":    "MISSING_TOKEN",
                    "message": "Authorization header is required",
                },
            })
            return
        }

        // "Bearer <token>" — parse 2 parts.
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": gin.H{
                    "code":    "INVALID_TOKEN_FORMAT",
                    "message": "Authorization header must be: Bearer <token>",
                },
            })
            return
        }
        token := parts[1]

        // Gọi auth service verify — có timeout để không block request quá lâu.
        ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
        defer cancel()

        resp, err := client.VerifyToken(ctx, &pmv1.VerifyTokenRequest{
            AccessToken: token,
        })
        if err != nil || !resp.Valid {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": gin.H{
                    "code":    "INVALID_TOKEN",
                    "message": "Token is invalid or expired",
                },
            })
            return
        }

        // Set user info vào context để downstream handler/upstream dùng.
        c.Set("user_id", resp.UserId)
        c.Set("user_email", resp.Email)
        c.Next()
    }
}

// RequireAuth lấy user info từ gin context sau khi JWTAuth middleware chạy.
// Dùng trong handler cần biết user đang gọi là ai.
func RequireAuth(c *gin.Context) (userID int64, email string, ok bool) {
    uid, exists := c.Get("user_id")
    if !exists {
        return 0, "", false
    }
    userID, ok = uid.(int64) // Type assertion — int64? hay float64?
    if !ok {
        return 0, "", false
    }
    e, exists := c.Get("user_email")
    if !exists {
        return userID, "", true // Email optional
    }
    email, _ = e.(string)
    return userID, email, true
}
```

Sửa `services/api-gateway/internal/server/http.go` — thêm protected routes:
```go
// Thay phần API v1:
v1 := r.Group("/api/v1")

// Public routes — không cần JWT
{
    v1.GET("/ping", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"pong": true})
    })
}

// Protected routes — cần JWT
protected := r.Group("/api/v1")
protected.Use(middleware.JWTAuth(cfg.Upstream.AuthAddr))
{
    protected.GET("/me", func(c *gin.Context) {
        userID, email, _ := middleware.RequireAuth(c)
        c.JSON(http.StatusOK, gin.H{
            "user_id": userID,
            "email":   email,
        })
    })
}
```

**Commit:**
```bash
git add services/api-gateway/internal/middleware/jwt.go services/api-gateway/internal/server/http.go
git commit -m "feat(api-gateway): add JWT auth middleware with gRPC VerifyToken"
```

---

### Task 12: API Gateway — Auth HTTP Proxy

**Hiểu — Reverse Proxy pattern:**

```
FE request: POST /api/v1/auth/register
                ↓
API Gateway:    strip "/api/v1" prefix → forward to auth-service
                ↓
Auth Service:   POST /api/v1/auth/register  (xử lý như bình thường)
```

**`httputil.ReverseProxy`** — Go built-in reverse proxy. Nhẹ, dùng `net/http` chuẩn. Giống `http-proxy-middleware` trong Express.

Tại sao proxy HTTP thay vì chuyển request thành gRPC?
- Auth REST endpoints (register/login) đã có sẵn
- Gateway chỉ cần forward, không cần transform
- Sau này có thể chuyển sang gRPC nếu cần

**Files:**
- Modify: `services/api-gateway/internal/server/http.go`

**Code:**

Thêm vào `NewHTTPServer`:
```go
import (
    "net/http/httputil"
    "net/url"
)

// Trong NewHTTPServer, thêm trước protected routes:

// Auth proxy — forward /api/v1/auth/* tới auth-service HTTP port.
// Auth service URL lấy từ env PM_API_GATEWAY_UPSTREAM_AUTH_HTTP_ADDR.
authHTTPAddr := cfg.Upstream.AuthHTTPAddr
if authHTTPAddr == "" {
    authHTTPAddr = "auth-service:8001" // Default Docker network
}
authURL, err := url.Parse("http://" + authHTTPAddr)
if err != nil {
    logger.Error("invalid auth http addr", slog.String("addr", authHTTPAddr))
    // Fallback: không có proxy, auth endpoints sẽ trả 502
}
authProxy := httputil.NewSingleHostReverseProxy(authURL)

// Public routes
v1 := r.Group("/api/v1")
{
    // Auth proxy — forward request đến auth service
    v1.Any("/auth/*proxyPath", func(c *gin.Context) {
        if authURL == nil {
            c.JSON(http.StatusBadGateway, gin.H{
                "error": gin.H{"code": "AUTH_UNAVAILABLE", "message": "Auth service not configured"},
            })
            return
        }
        // Giữ nguyên path — auth service cũng listen trên /api/v1/auth/...
        c.Request.URL.Path = "/api/v1/auth/" + c.Param("proxyPath")
        authProxy.ServeHTTP(c.Writer, c.Request)
    })
}

// Protected routes (giữ nguyên từ Task 11)
```

Thêm `AuthHTTPAddr` vào config:
```go
// Trong config.go, thêm vào UpstreamConfig:
type UpstreamConfig struct {
    AuthAddr         string `mapstructure:"auth_addr"`          // gRPC port
    AuthHTTPAddr     string `mapstructure:"auth_http_addr"`     // HTTP port (cho reverse proxy)
    // ...
}
```

`.env.example` thêm:
```env
PM_API_GATEWAY_UPSTREAM_AUTH_HTTP_ADDR=auth-service:8001
```

**Commit:**
```bash
git add services/api-gateway/
git commit -m "feat(api-gateway): add auth HTTP reverse proxy"
```

---

### Task 13: Integration Test

Verify mọi thứ hoạt động end-to-end.

**Step 1: Start PostgreSQL**
```bash
docker compose -f infra/dev/docker-compose.yml up -d postgres
```

**Step 2: Run auth service**
```bash
cd services/auth
cp .env.example .env
# Sửa DATABASE_URL nếu cần: postgres://postgres:postgres@localhost:5432/pmdb?sslmode=disable
make run
```

Expected output:
```
{"service":"auth-service","level":"INFO","msg":"starting auth-service","env":"dev","http_port":8001,"grpc_port":9001}
{"service":"auth-service","level":"INFO","msg":"database connected"}
{"service":"auth-service","level":"INFO","msg":"http server listening","addr":":8001"}
{"service":"auth-service","level":"INFO","msg":"grpc server listening","addr":":9001"}
```

**Step 3: Test Register**
```bash
curl -s -w "\n%{http_code}" -X POST http://localhost:8001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123","name":"Test User"}'
```
Expected: HTTP 201, `{"user":{"id":1,"email":"test@example.com",...}}`

**Step 4: Test Duplicate Register**
```bash
curl -s -w "\n%{http_code}" -X POST http://localhost:8001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123","name":"Test User"}'
```
Expected: HTTP 409, `{"error":{"code":"REGISTER_FAILED","message":"email already registered"}}`

**Step 5: Test Login**
```bash
curl -s -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'
```
Expected: HTTP 200, `{"access_token":"eyJ...","refresh_token":"eyJ...","expires_in":900,"token_type":"Bearer"}`

**Step 6: Test Login Wrong Password**
```bash
curl -s -w "\n%{http_code}" -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'
```
Expected: HTTP 401

**Step 7: Test gRPC VerifyToken**
```bash
# Lấy token từ step 5
TOKEN="<access_token từ step 5>"
grpcurl -plaintext -d "{\"access_token\":\"$TOKEN\"}" localhost:9001 pm.v1.AuthService/VerifyToken
```
Expected: `{"valid":true,"userId":1,"email":"test@example.com"}`

**Step 8: Test gRPC GetUser**
```bash
grpcurl -plaintext -d '{"userId":1}' localhost:9001 pm.v1.AuthService/GetUser
```
Expected: User object.

**Step 9: Run API Gateway + Test Proxy**
```bash
cd services/api-gateway
make run
```

```bash
# Test auth proxy — register qua gateway
curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"proxy@example.com","password":"secret123","name":"Proxy User"}'
```
Expected: HTTP 201

```bash
# Test login qua gateway
LOGIN_RESP=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"proxy@example.com","password":"secret123"}')
TOKEN=$(echo $LOGIN_RESP | jq -r '.access_token')
```

**Step 10: Test Protected Endpoint**
```bash
# Không token → 401
curl -s -w "\n%{http_code}" http://localhost:8000/api/v1/me

# Có token → 200
curl -s http://localhost:8000/api/v1/me -H "Authorization: Bearer $TOKEN"
```
Expected: `{"user_id":2,"email":"proxy@example.com"}`

**Step 11: Final commit**
```bash
git add -A
git commit -m "test(auth): verify register, login, JWT, gRPC, gateway proxy all pass"
```

---

## Files Summary

### Auth Service (new — 13 files + 7 copied)
```
services/auth/
├── cmd/auth/main.go                    # Entry point, DI wiring
├── internal/
│   ├── config/config.go                # Viper env config + validation
│   ├── database/postgres.go            # DB connection pool
│   ├── handler/auth.go                 # REST: register, login
│   ├── model/user.go                   # User domain model
│   ├── repository/user.go              # SQL data access (5 methods)
│   ├── server/http.go                  # Gin HTTP server
│   ├── server/grpc.go                  # gRPC AuthService implementation
│   └── service/auth.go                 # Business logic + JWT
├── migrations/
│   ├── 001_create_users.up.sql
│   └── 001_create_users.down.sql
├── internal/middleware/                 # (copied: request_id, logger, metrics, recovery)
├── internal/observability/             # (copied: log, trace, metric)
├── go.mod, go.sum, Makefile, Dockerfile, .dockerignore, .env.example
```

### API Gateway (modified — 2 files + 1 new)
```
services/api-gateway/
├── internal/middleware/jwt.go           # NEW: JWT auth middleware
├── internal/server/http.go              # MODIFIED: auth proxy + protected routes
```

### Root (modified — 1 file)
```
go.work                                 # MODIFIED: add ./services/auth
```

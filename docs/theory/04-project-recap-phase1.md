# Phase 1 Recap - Go REST API với Clean Architecture

> Tổng hợp kiến thức từ việc build Poor Man's Vercel API (2026-02-21 ~ 2026-02-22)

---

## 1. Kiến trúc tổng quan

```
Request → Router → Handler → Service → Repository → PostgreSQL
                                                   ← Response
```

### So sánh với Express.js/NestJS

| Go (Gin)               | Express.js / NestJS         |
|-------------------------|-----------------------------|
| `gin.Engine`            | `app = express()`           |
| `c *gin.Context`        | `(req, res)`                |
| Handler (struct)        | Controller (class)          |
| Service (interface)     | Service (class)             |
| Repository (interface)  | Repository (class)          |
| `main.go` wiring       | Module + DI Container       |

### Folder Structure

```
services/api/
├── cmd/api/
│   └── main.go              ← Entry point + DI wiring
├── internal/
│   ├── config/
│   │   └── config.go        ← Load .env variables
│   ├── database/
│   │   └── postgres.go      ← DB connection
│   ├── handler/
│   │   ├── project.go       ← HTTP handlers (Controller)
│   │   ├── response.go      ← Response format chuẩn
│   │   ├── routes.go        ← Route registration
│   │   └── health.go        ← Health check endpoints
│   ├── model/
│   │   └── project.go       ← Data struct (Entity)
│   ├── service/
│   │   └── project.go       ← Business logic layer
│   └── repository/
│       └── repository.go    ← Database queries (SQL)
├── .env
├── Makefile
└── go.mod / go.sum
```

---

## 2. Data Flow - Từ request tới database

### Ví dụ: POST /api/v1/projects

```
1. Client gửi POST request với JSON body
   curl -X POST /api/v1/projects -d '{"name":"my-app","git_url":"...","branch":"main"}'

2. Router match route → gọi handler.CreateProject(c)

3. Handler:
   - c.ShouldBindJSON(&project)  → parse JSON body vào struct
   - h.service.Create(project)   → gọi xuống service

4. Service:
   - ps.repo.Create(project)     → gọi xuống repository (pass-through)

5. Repository:
   - INSERT INTO projects ... RETURNING ...  → chạy SQL
   - rows.Scan()                              → map kết quả vào struct

6. Response chạy ngược lên:
   Repository → Service → Handler → c.JSON(201, response) → Client
```

---

## 3. Từng file giải thích

### 3.1 main.go - Entry point

```go
func main() {
    // 1. Load config
    cfg := config.Load()

    // 2. Connect database
    db, err := database.Connect(cfg.DatabaseURL)
    defer db.Close()  // Tự đóng DB khi main() kết thúc

    // 3. Tạo router
    router := gin.New()
    router.Use(gin.Logger())    // Log mỗi request (giống morgan)
    router.Use(gin.Recovery())  // Recover từ panic, không crash server

    // 4. DI Wiring - tạo từ trong ra ngoài
    repo := repository.NewProjectRepository(db)     // Layer trong cùng
    svc := service.NewProjectService(repo)           // Layer giữa
    projectHandler := handler.NewProjectHandler(svc) // Layer ngoài
    projectHandler.SetupRoutes(router)

    // 5. Graceful shutdown
    // Start server trong goroutine → đợi Ctrl+C → shutdown gracefully
}
```

**Key concepts:**
- `defer` = "chạy sau khi function kết thúc" (giống `finally` trong JS)
- DI wiring: tạo dependency từ trong ra ngoài, inject qua constructor
- Graceful shutdown: cho server xử lý nốt request đang chạy trước khi tắt

### 3.2 config.go - Load environment variables

```go
type Config struct {
    Port        string
    Environment string
    DatabaseURL string
    RedisURL    string
    JWTSecret   string
}

func Load() Config {
    godotenv.Load()  // Đọc file .env
    return Config{
        Port: getEnv("PORT", "8080"),  // Nếu không có env → dùng default
        // ...
    }
}

func getEnv(key, defaultValue string) string {
    value, exist := os.LookupEnv(key)  // exist là bool, KHÔNG so sánh != nil
    if exist {
        return value
    }
    return defaultValue
}
```

**Key concepts:**
- `os.LookupEnv()` trả về `(string, bool)` - pattern "comma ok" trong Go
- `bool` dùng `if exist {}`, KHÔNG dùng `if exist != nil` (bool không phải pointer)

### 3.3 model/project.go - Data struct

```go
type Project struct {
    ID        string     `json:"id"`
    Name      string     `json:"name"`
    GitURL    string     `json:"git_url"`
    Branch    string     `json:"branch"`
    Status    string     `json:"status"`
    CreatedAt time.Time  `json:"created_at"`  // Luôn có giá trị
    UpdatedAt time.Time  `json:"updated_at"`  // Luôn có giá trị
    DeletedAt *time.Time `json:"deleted_at"`  // Pointer → có thể nil (chưa xóa)
}
```

**Key concepts:**
- `json:"field_name"` = json tag, quy định tên khi serialize/deserialize JSON
- `time.Time` vs `*time.Time`:
  - `time.Time` = value type, luôn có giá trị (zero value = "0001-01-01")
  - `*time.Time` = pointer, có thể `nil` → dùng cho nullable field (soft delete)

### 3.4 handler/response.go - Format response chuẩn

```go
type Response struct {
    Success bool   `json:"success"`
    Data    any    `json:"data"`     // any = interface{}, chứa bất kỳ kiểu gì
    Error   string `json:"error"`
}

func SuccessResponse(c *gin.Context, statusCode int, data any) {
    c.JSON(statusCode, Response{Success: true, Data: data})
}

func ErrorResponse(c *gin.Context, statusCode int, message string) {
    c.JSON(statusCode, Response{Success: false, Error: message})
}
```

**Key concepts:**
- `any` = `interface{}` = chứa bất kỳ kiểu nào (giống `any` trong TypeScript)
- `c.JSON()` = `res.json()` trong Express - serialize struct thành JSON và gửi response

### 3.5 handler/routes.go - Route registration

```go
func (h *ProjectHandler) SetupRoutes(router *gin.Engine) {
    router.GET("/health", HealthCheck)

    v1 := router.Group("/api/v1")               // Route group
    projects := v1.Group("projects")             // /api/v1/projects

    projects.GET("", h.ListProjects)             // GET    /api/v1/projects
    projects.GET("/:id", h.GetProject)           // GET    /api/v1/projects/:id
    projects.POST("", h.CreateProject)           // POST   /api/v1/projects
    projects.PUT("/:id", h.UpdateProject)        // PUT    /api/v1/projects/:id
    projects.DELETE("/:id", h.DeleteProject)      // DELETE /api/v1/projects/:id
}
```

**Key concepts:**
- Route Group = gom routes có chung prefix (giống `express.Router()`)
- REST convention: dùng số nhiều `projects`, KHÔNG phải `project`
- `h.GetProject` = method reference (KHÔNG có `()`) - giống React `onClick={handleClick}`

### 3.6 handler/project.go - HTTP handlers

```go
type ProjectHandler struct {
    service service.ProjectService  // Interface, không phải struct
}

// List - lấy danh sách
func (h *ProjectHandler) ListProjects(c *gin.Context) {
    projects, err := h.service.List()
    if err != nil {
        ErrorResponse(c, http.StatusInternalServerError, "...")
        return  // PHẢI return sau error!
    }
    SuccessResponse(c, http.StatusOK, projects)
}

// Create - tạo mới
func (h *ProjectHandler) CreateProject(c *gin.Context) {
    var project model.Project
    if err := c.ShouldBindJSON(&project); err != nil {
        ErrorResponse(c, http.StatusBadRequest, err.Error())
        return
    }
    project, err := h.service.Create(project)
    if err != nil { ... }
    SuccessResponse(c, http.StatusCreated, project)  // 201, không phải 200
}

// Constructor - inject service dependency
func NewProjectHandler(service service.ProjectService) *ProjectHandler {
    return &ProjectHandler{service: service}
}
```

**Key concepts:**
- `c.Param("id")` = `req.params.id` trong Express
- `c.ShouldBindJSON(&project)` = parse JSON body (dùng `&` pointer vì cần modify biến)
- HTTP status: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 404 Not Found, 500 Server Error
- PHẢI `return` sau ErrorResponse, không thì code chạy tiếp xuống dưới

### 3.7 service/project.go - Business logic layer

```go
// Interface = contract, ai muốn là ProjectService phải có 5 methods này
type ProjectService interface {
    List() ([]model.Project, error)
    GetByID(id string) (model.Project, error)
    Create(project model.Project) (model.Project, error)
    Update(id string, project model.Project) (model.Project, error)
    Delete(id string) error
}

// Struct implement interface (implicit - không cần "implements" keyword)
type projectService struct {
    repo repository.ProjectRepository  // Giữ reference tới repository
}

// Hiện tại: pass-through (gọi thẳng xuống repo)
// Sau này thêm: validation, permission check, send events, logging...
func (ps *projectService) List() ([]model.Project, error) {
    return ps.repo.List()
}

func (ps *projectService) Create(project model.Project) (model.Project, error) {
    return ps.repo.Create(project)
}

// Constructor trả về interface, KHÔNG phải struct
func NewProjectService(repo repository.ProjectRepository) ProjectService {
    return &projectService{repo: repo}
}
```

**Key concepts:**
- Interface = implicit implementation (không cần `implements` keyword như Java/TS)
- Constructor return **interface** (`ProjectService`), không phải **struct** (`*projectService`)
- Service layer hiện tại là "pass-through" - sau này sẽ thêm business logic

### 3.8 repository/repository.go - Database queries

```go
type projectRepository struct {
    db *sql.DB  // PHẢI là pointer (*sql.DB) để share connection pool
}
```

#### 3 Pattern SQL trong Go:

**Pattern 1: `db.Query()` - SELECT nhiều rows**
```go
func (pr *projectRepository) List() ([]model.Project, error) {
    rows, err := pr.db.Query("SELECT ... FROM projects WHERE deleted_at IS NULL")
    if err != nil { return nil, err }
    defer rows.Close()  // PHẢI close cursor khi xong

    var projects []model.Project
    for rows.Next() {  // Loop từng row (giống for...of)
        var p model.Project
        err := rows.Scan(&p.ID, &p.Name, ...)  // Map cột → struct THEO THỨ TỰ SELECT
        if err != nil { return nil, err }
        projects = append(projects, p)  // Giống array.push()
    }
    return projects, nil
}
```

**Pattern 2: `db.QueryRow()` - SELECT 1 row**
```go
func (pr *projectRepository) GetByID(id string) (model.Project, error) {
    var p model.Project
    err := pr.db.QueryRow(
        "SELECT ... FROM projects WHERE id = $1", id,  // $1 = placeholder
    ).Scan(&p.ID, &p.Name, ...)  // Chain .Scan() trực tiếp
    if err != nil { return model.Project{}, err }
    return p, nil
}
```

**Pattern 3: `db.Exec()` - INSERT/UPDATE/DELETE không cần data trả về**
```go
func (pr *projectRepository) Delete(id string) error {
    result, err := pr.db.Exec(
        "UPDATE projects SET deleted_at = $1 WHERE id = $2", time.Now(), id,
    )
    if err != nil { return err }

    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 { return sql.ErrNoRows }  // Không tìm thấy → 404
    return nil
}
```

**Pattern bonus: INSERT/UPDATE + RETURNING**
```go
func (pr *projectRepository) Create(project model.Project) (model.Project, error) {
    var p model.Project
    err := pr.db.QueryRow(
        `INSERT INTO projects (name, git_url, branch)
         VALUES ($1, $2, $3)
         RETURNING id, name, git_url, branch, status, created_at, updated_at, deleted_at`,
        project.Name, project.GitURL, project.Branch,
    ).Scan(&p.ID, &p.Name, &p.GitURL, &p.Branch, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt)
    if err != nil { return model.Project{}, err }
    return p, nil
}
```

**Key concepts:**
- `db.Query()` = nhiều rows → cần `rows.Next()` + `defer rows.Close()`
- `db.QueryRow()` = 1 row → chain `.Scan()` trực tiếp, không cần Close
- `db.Exec()` = không cần data trả về → dùng cho DELETE, hoặc khi không cần RETURNING
- `rows.Scan(&field)` = map cột vào struct **THEO THỨ TỰ SELECT** (dùng `&` pointer)
- PostgreSQL dùng `$1, $2, $3` (MySQL dùng `?`)
- `RETURNING` = INSERT/UPDATE rồi trả về row vừa tạo/sửa (PostgreSQL feature)
- Soft delete: `UPDATE SET deleted_at = NOW()` thay vì `DELETE` thật

### 3.9 database/postgres.go - DB connection

```go
import (
    "database/sql"
    _ "github.com/jackc/pgx/v5/stdlib"  // Side effect import = đăng ký driver
)

func Connect(databaseURL string) (*sql.DB, error) {
    db, err := sql.Open("pgx", databaseURL)  // Tạo pool (chưa connect thật)
    if err != nil { return nil, err }

    err = db.Ping()  // Test connect thật
    if err != nil { return nil, err }

    db.SetMaxOpenConns(25)   // Max connections mở cùng lúc
    db.SetMaxIdleConns(25)   // Max connections idle (chờ)
    return db, nil
}
```

**Key concepts:**
- `_ "package"` = side effect import: chỉ chạy `init()` của package (đăng ký pgx driver)
- `sql.Open()` = tạo connection pool, CHƯA connect thật
- `db.Ping()` = test connection thật tới database
- Connection pool: Go tự quản lý pool (giống `pg.Pool` trong Node.js)

---

## 4. Dependency Injection (DI) Flow

```
main.go tạo và inject dependencies:

db := database.Connect(...)
        │
        ▼
repo := NewProjectRepository(db)      ← Repository giữ *sql.DB
        │
        ▼
svc := NewProjectService(repo)         ← Service giữ ProjectRepository interface
        │
        ▼
handler := NewProjectHandler(svc)      ← Handler giữ ProjectService interface
        │
        ▼
handler.SetupRoutes(router)            ← Đăng ký routes
```

**Tại sao dùng Interface?**
- Handler giữ `service.ProjectService` (interface) → không biết implementation cụ thể
- Service giữ `repository.ProjectRepository` (interface) → không biết dùng Postgres hay MongoDB
- Dễ test: mock interface khi unit test
- Dễ thay đổi: swap PostgreSQL → MongoDB chỉ cần viết repository mới

---

## 5. Docker Setup

### Docker Compose (docker-compose.yml)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: pmv
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d  # SQL chạy lần đầu

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  adminer:
    image: adminer:latest
    ports: ["8081:8080"]  # DB UI tại localhost:8081
```

### Commands thường dùng

```bash
# Start containers
docker compose -f deployments/docker/docker-compose.yml up -d

# Stop containers
docker compose -f deployments/docker/docker-compose.yml down

# Stop + XÓA DATA (reset DB)
docker compose -f deployments/docker/docker-compose.yml down -v

# Xem logs
docker compose -f deployments/docker/docker-compose.yml logs -f

# Hoặc dùng Makefile:
make docker-up
make docker-down
make run
```

### SQL Migration

```sql
-- deployments/docker/init-scripts/001_create_project.sql
CREATE TABLE IF NOT EXISTS projects (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name varchar(255) NOT NULL,
   git_url TEXT NOT NULL,
   branch TEXT,
   status varchar(255) DEFAULT 'pending',
   created_at TIMESTAMP NOT NULL DEFAULT NOW(),
   updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
   deleted_at TIMESTAMP                          -- nullable = soft delete
);
```

**Lưu ý:** init-scripts chỉ chạy lần ĐẦU TIÊN tạo DB. Nếu đổi schema → `down -v` rồi `up -d` lại.

---

## 6. REST API Endpoints

| Method | Endpoint | Status Code | Mô tả |
|--------|----------|-------------|--------|
| GET | /health | 200 | Health check |
| GET | /api/v1/projects | 200 | Lấy danh sách projects |
| GET | /api/v1/projects/:id | 200 | Lấy 1 project theo ID |
| POST | /api/v1/projects | 201 | Tạo project mới |
| PUT | /api/v1/projects/:id | 200 | Cập nhật project |
| DELETE | /api/v1/projects/:id | 204 | Soft delete project |

### Test với curl

```bash
# List
curl http://localhost:8080/api/v1/projects

# Get by ID
curl http://localhost:8080/api/v1/projects/<uuid>

# Create
curl -X POST http://localhost:8080/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"my-app","git_url":"https://github.com/user/repo.git","branch":"main"}'

# Update
curl -X PUT http://localhost:8080/api/v1/projects/<uuid> \
  -H "Content-Type: application/json" \
  -d '{"name":"updated-name","git_url":"...","branch":"dev","status":"building"}'

# Delete
curl -X DELETE http://localhost:8080/api/v1/projects/<uuid>
```

---

## 7. Lỗi hay mắc (Checklist khi viết code)

### Go Syntax
- [ ] `bool` dùng `if exist {}`, KHÔNG dùng `if exist != nil` (bool không phải pointer)
- [ ] `*` vs `&`: `&` = lấy địa chỉ, `*` = đi tới địa chỉ
- [ ] JSON tag phải có ngoặc kép: `` `json:"name"` `` KHÔNG phải `` `json:name` ``
- [ ] Export = viết HOA chữ đầu (`GetName`), private = viết thường (`getName`)
- [ ] Constructor trả về **interface**, không phải **struct**
- [ ] Constructor nhận param phải **gán vào struct**: `return &S{field: param}`

### Database
- [ ] `db` field trong repository phải là `*sql.DB` (pointer), KHÔNG phải `sql.DB`
- [ ] `db.Query()` → PHẢI `defer rows.Close()` + loop `rows.Next()`
- [ ] `db.QueryRow()` → chain `.Scan()` trực tiếp, KHÔNG cần Close
- [ ] `rows.Scan()` dùng `&` pointer: `rows.Scan(&p.ID, &p.Name, ...)`
- [ ] Thứ tự Scan PHẢI match thứ tự SELECT

### REST API
- [ ] Dùng số nhiều: `/projects` KHÔNG phải `/project`
- [ ] Method reference KHÔNG có `()`: `h.GetProject` không phải `h.GetProject()`
- [ ] PHẢI `return` sau `ErrorResponse`, không thì code tiếp tục chạy

### SQL
- [ ] PostgreSQL dùng `$1, $2` (MySQL dùng `?`)
- [ ] Dùng `RETURNING` để lấy data sau INSERT/UPDATE
- [ ] Soft delete: `UPDATE SET deleted_at = NOW()`, KHÔNG dùng `DELETE`

---

## 8. Package Management

```bash
# Thêm package mới (giống npm install)
go get github.com/jackc/pgx/v5

# Dọn dẹp dependencies (giống npm prune)
go mod tidy

# Download tất cả dependencies
go mod download
```

| npm | Go |
|-----|-----|
| `package.json` | `go.mod` |
| `package-lock.json` | `go.sum` |
| `npm install pkg` | `go get pkg` |
| `npm install` | `go mod download` |
| `node_modules/` | `$GOPATH/pkg/mod/` (global cache) |

---

*Phase 1 DONE! Tiếp theo: Phase 2 - Containerization (Dockerfile, multi-stage build)*

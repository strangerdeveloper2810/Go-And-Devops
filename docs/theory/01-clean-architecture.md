# Clean Architecture

## Tổng quan

Clean Architecture được Uncle Bob (Robert C. Martin) giới thiệu năm 2012. Mục tiêu chính là tạo ra hệ thống:

- **Independent of Frameworks** - Không phụ thuộc vào framework cụ thể
- **Testable** - Business logic có thể test mà không cần UI, database, web server
- **Independent of UI** - UI có thể thay đổi mà không ảnh hưởng business logic
- **Independent of Database** - Có thể swap PostgreSQL → MongoDB mà business logic không đổi
- **Independent of External Services** - Business rules không biết gì về thế giới bên ngoài

---

## The Dependency Rule (Quan trọng nhất!)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║     "Source code dependencies can only point INWARDS"                         ║
║                                                                               ║
║     Layer ngoài biết layer trong, NHƯNG layer trong KHÔNG biết layer ngoài    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Ví dụ cụ thể:

```
Handler (outer) → Service (middle) → Entity (inner)
   ↓                   ↓                   ↓
Biết Service      Biết Entity         Không biết ai
Import service    Import entity       Pure Go struct
```

**SAI ❌:**
```go
// Trong entity/project.go
import "github.com/gin-gonic/gin"  // Entity import HTTP framework
```

**ĐÚNG ✅:**
```go
// Trong entity/project.go
// Không import gì từ outer layers
type Project struct {
    ID   string
    Name string
}
```

---

## Các Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                                                                 │     │
│    │    ┌─────────────────────────────────────────────────────┐     │     │
│    │    │                                                     │     │     │
│    │    │    ┌─────────────────────────────────────────┐     │     │     │
│    │    │    │                                         │     │     │     │
│    │    │    │    ┌─────────────────────────────┐     │     │     │     │
│    │    │    │    │                             │     │     │     │     │
│    │    │    │    │         ENTITIES            │     │     │     │     │
│    │    │    │    │      (Enterprise Rules)     │     │     │     │     │
│    │    │    │    │                             │     │     │     │     │
│    │    │    │    └─────────────────────────────┘     │     │     │     │
│    │    │    │                                         │     │     │     │
│    │    │    │              USE CASES                  │     │     │     │
│    │    │    │         (Application Rules)             │     │     │     │
│    │    │    │                                         │     │     │     │
│    │    │    └─────────────────────────────────────────┘     │     │     │
│    │    │                                                     │     │     │
│    │    │           INTERFACE ADAPTERS                        │     │     │
│    │    │      (Controllers, Gateways, Presenters)            │     │     │
│    │    │                                                     │     │     │
│    │    └─────────────────────────────────────────────────────┘     │     │
│    │                                                                 │     │
│    │              FRAMEWORKS & DRIVERS                               │     │
│    │           (Web, Database, External APIs)                        │     │
│    │                                                                 │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

                              Dependencies point INWARD →
```

---

## Chi tiết từng Layer

### 1. Entities (Innermost - Enterprise Business Rules)

```go
// internal/domain/entity/project.go

package entity

import "time"

// Project là core entity - không biết về database, HTTP, hay bất cứ gì bên ngoài
type Project struct {
    ID          string
    UserID      string
    Name        string
    GitURL      string
    Branch      string
    Framework   Framework
    Status      Status
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

// Framework enum
type Framework string

const (
    FrameworkNodeJS Framework = "nodejs"
    FrameworkGo     Framework = "go"
    FrameworkPython Framework = "python"
)

// Business rule: Validate project
func (p *Project) Validate() error {
    if p.Name == "" {
        return ErrProjectNameRequired
    }
    if !isValidGitURL(p.GitURL) {
        return ErrInvalidGitURL
    }
    return nil
}

// Business rule: Can user deploy?
func (p *Project) CanDeploy() bool {
    return p.Status == StatusActive && p.GitURL != ""
}
```

**Đặc điểm:**
- Pure Go structs
- Business rules gắn với entity
- KHÔNG import outer layers
- KHÔNG biết về database, HTTP, frameworks

---

### 2. Use Cases (Application Business Rules)

```go
// internal/usecase/project_usecase.go

package usecase

import (
    "context"
    "myapp/internal/domain/entity"
)

// ProjectRepository - Interface định nghĩa ở USE CASE layer
// Implementation ở outer layer (repository)
type ProjectRepository interface {
    Save(ctx context.Context, project *entity.Project) error
    FindByID(ctx context.Context, id string) (*entity.Project, error)
    FindByUserID(ctx context.Context, userID string) ([]*entity.Project, error)
    Delete(ctx context.Context, id string) error
}

// BuildService - Interface cho external service
type BuildService interface {
    TriggerBuild(ctx context.Context, project *entity.Project) error
}

// ProjectUseCase orchestrates business operations
type ProjectUseCase struct {
    repo    ProjectRepository
    builder BuildService
}

// NewProjectUseCase - Constructor with Dependency Injection
func NewProjectUseCase(repo ProjectRepository, builder BuildService) *ProjectUseCase {
    return &ProjectUseCase{
        repo:    repo,
        builder: builder,
    }
}

// CreateProject - Application business logic
func (uc *ProjectUseCase) CreateProject(ctx context.Context, input CreateProjectInput) (*entity.Project, error) {
    // 1. Create entity
    project := &entity.Project{
        ID:        generateID(),
        UserID:    input.UserID,
        Name:      input.Name,
        GitURL:    input.GitURL,
        Branch:    input.Branch,
        Framework: detectFramework(input.GitURL),
        Status:    entity.StatusPending,
        CreatedAt: time.Now(),
    }

    // 2. Apply business rules (từ entity)
    if err := project.Validate(); err != nil {
        return nil, err
    }

    // 3. Persist (qua interface - không biết implementation)
    if err := uc.repo.Save(ctx, project); err != nil {
        return nil, err
    }

    // 4. Trigger build (qua interface)
    if err := uc.builder.TriggerBuild(ctx, project); err != nil {
        // Log but don't fail - build can be retried
        log.Printf("Failed to trigger build: %v", err)
    }

    return project, nil
}

// DeployProject - Another use case
func (uc *ProjectUseCase) DeployProject(ctx context.Context, projectID string) error {
    // 1. Get project
    project, err := uc.repo.FindByID(ctx, projectID)
    if err != nil {
        return err
    }

    // 2. Check business rule
    if !project.CanDeploy() {
        return ErrCannotDeploy
    }

    // 3. Trigger deployment
    return uc.builder.TriggerBuild(ctx, project)
}
```

**Đặc điểm:**
- Định nghĩa INTERFACES cho dependencies (Repository, Services)
- Orchestrate business operations
- Import entity layer
- KHÔNG biết về HTTP, Database cụ thể

---

### 3. Interface Adapters (Controllers, Gateways, Presenters)

```go
// internal/adapter/handler/project_handler.go

package handler

import (
    "net/http"
    "myapp/internal/usecase"
    "github.com/gin-gonic/gin"
)

// ProjectHandler adapts HTTP requests to use cases
type ProjectHandler struct {
    useCase *usecase.ProjectUseCase
}

func NewProjectHandler(uc *usecase.ProjectUseCase) *ProjectHandler {
    return &ProjectHandler{useCase: uc}
}

// CreateProject handles HTTP POST /projects
func (h *ProjectHandler) CreateProject(c *gin.Context) {
    // 1. Parse HTTP request (adapter responsibility)
    var req CreateProjectRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
        return
    }

    // 2. Convert to use case input (DTO → Input)
    input := usecase.CreateProjectInput{
        UserID:  c.GetString("user_id"), // From auth middleware
        Name:    req.Name,
        GitURL:  req.GitURL,
        Branch:  req.Branch,
    }

    // 3. Call use case
    project, err := h.useCase.CreateProject(c.Request.Context(), input)
    if err != nil {
        status := mapErrorToStatus(err)
        c.JSON(status, ErrorResponse{Error: err.Error()})
        return
    }

    // 4. Convert to HTTP response (Entity → Response DTO)
    c.JSON(http.StatusCreated, toProjectResponse(project))
}

// Request/Response DTOs - specific to HTTP layer
type CreateProjectRequest struct {
    Name   string `json:"name" binding:"required"`
    GitURL string `json:"git_url" binding:"required,url"`
    Branch string `json:"branch"`
}

type ProjectResponse struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    GitURL    string `json:"git_url"`
    Status    string `json:"status"`
    CreatedAt string `json:"created_at"`
}

// Mapper function
func toProjectResponse(p *entity.Project) ProjectResponse {
    return ProjectResponse{
        ID:        p.ID,
        Name:      p.Name,
        GitURL:    p.GitURL,
        Status:    string(p.Status),
        CreatedAt: p.CreatedAt.Format(time.RFC3339),
    }
}
```

```go
// internal/adapter/repository/postgres_project_repository.go

package repository

import (
    "context"
    "database/sql"
    "myapp/internal/domain/entity"
    "myapp/internal/usecase"
)

// PostgresProjectRepository implements usecase.ProjectRepository
type PostgresProjectRepository struct {
    db *sql.DB
}

// Verify interface implementation at compile time
var _ usecase.ProjectRepository = (*PostgresProjectRepository)(nil)

func NewPostgresProjectRepository(db *sql.DB) *PostgresProjectRepository {
    return &PostgresProjectRepository{db: db}
}

func (r *PostgresProjectRepository) Save(ctx context.Context, project *entity.Project) error {
    query := `
        INSERT INTO projects (id, user_id, name, git_url, branch, framework, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `
    _, err := r.db.ExecContext(ctx, query,
        project.ID,
        project.UserID,
        project.Name,
        project.GitURL,
        project.Branch,
        project.Framework,
        project.Status,
        project.CreatedAt,
    )
    return err
}

func (r *PostgresProjectRepository) FindByID(ctx context.Context, id string) (*entity.Project, error) {
    query := `SELECT id, user_id, name, git_url, branch, framework, status, created_at
              FROM projects WHERE id = $1`

    project := &entity.Project{}
    err := r.db.QueryRowContext(ctx, query, id).Scan(
        &project.ID,
        &project.UserID,
        &project.Name,
        &project.GitURL,
        &project.Branch,
        &project.Framework,
        &project.Status,
        &project.CreatedAt,
    )
    if err == sql.ErrNoRows {
        return nil, nil
    }
    return project, err
}
```

**Đặc điểm:**
- IMPLEMENT interfaces định nghĩa ở use case layer
- Convert data giữa các formats (HTTP ↔ Entity ↔ Database)
- Biết về frameworks (Gin, sql)

---

### 4. Frameworks & Drivers (Outermost)

```go
// cmd/api/main.go

package main

import (
    "database/sql"
    "myapp/internal/adapter/handler"
    "myapp/internal/adapter/repository"
    "myapp/internal/usecase"
    _ "github.com/lib/pq"
    "github.com/gin-gonic/gin"
)

func main() {
    // 1. Initialize frameworks & drivers
    db, _ := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    router := gin.Default()

    // 2. Wire up dependencies (Dependency Injection)
    projectRepo := repository.NewPostgresProjectRepository(db)
    buildService := service.NewDockerBuildService()
    projectUseCase := usecase.NewProjectUseCase(projectRepo, buildService)
    projectHandler := handler.NewProjectHandler(projectUseCase)

    // 3. Setup routes
    router.POST("/projects", projectHandler.CreateProject)
    router.GET("/projects/:id", projectHandler.GetProject)

    // 4. Start server
    router.Run(":8080")
}
```

**Đặc điểm:**
- Glue code - kết nối mọi thứ lại
- Framework initialization
- Dependency injection setup

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              HTTP Request                                    │
│                     POST /projects {"name": "my-app"}                        │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  HANDLER (Interface Adapter)                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  1. Parse JSON body → CreateProjectRequest                             │ │
│  │  2. Validate request (binding:"required")                              │ │
│  │  3. Convert to CreateProjectInput                                      │ │
│  │  4. Call useCase.CreateProject()                                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  USE CASE (Application Business Rules)                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  1. Create Project entity                                              │ │
│  │  2. Call project.Validate() (entity business rule)                     │ │
│  │  3. Call repo.Save() (interface - doesn't know it's Postgres)          │ │
│  │  4. Call builder.TriggerBuild() (interface)                            │ │
│  │  5. Return Project entity                                              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  REPOSITORY (Interface Adapter)                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  1. Receive Project entity                                             │ │
│  │  2. Convert to SQL INSERT                                              │ │
│  │  3. Execute query                                                      │ │
│  │  4. Return error if any                                                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              PostgreSQL                                      │
│                         INSERT INTO projects...                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## So sánh với Project hiện tại

### Project Structure hiện tại:

```
services/api/
├── cmd/api/main.go           → Frameworks & Drivers
├── internal/
│   ├── config/               → Frameworks & Drivers
│   ├── handler/              → Interface Adapters (Controller)
│   ├── service/              → Use Cases
│   ├── repository/           → Interface Adapters (Gateway)
│   └── model/                → Entities + DTOs (mixed)
└── pkg/response/             → Interface Adapters (Presenter)
```

### Cải tiến theo Clean Architecture thuần:

```
services/api/
├── cmd/api/main.go                      → Frameworks & Drivers
├── internal/
│   ├── domain/                          → ENTITIES
│   │   ├── entity/
│   │   │   ├── project.go
│   │   │   └── deployment.go
│   │   └── valueobject/
│   │       └── git_url.go
│   │
│   ├── usecase/                         → USE CASES
│   │   ├── project_usecase.go
│   │   ├── deployment_usecase.go
│   │   └── interfaces.go                → Repository/Service interfaces
│   │
│   └── adapter/                         → INTERFACE ADAPTERS
│       ├── handler/                     → Controllers
│       │   ├── project_handler.go
│       │   └── dto/
│       │       ├── request.go
│       │       └── response.go
│       ├── repository/                  → Gateways
│       │   ├── postgres_project.go
│       │   └── redis_cache.go
│       └── service/                     → External service adapters
│           └── docker_builder.go
│
└── pkg/                                 → Shared utilities
```

---

## Benefits & Trade-offs

### Benefits ✅

| Benefit | Giải thích |
|---------|------------|
| **Testability** | Mock interfaces dễ dàng, test use cases không cần database |
| **Flexibility** | Swap PostgreSQL → MongoDB chỉ cần viết adapter mới |
| **Maintainability** | Business logic tách biệt, dễ hiểu và modify |
| **Independence** | Team có thể làm việc độc lập trên từng layer |

### Trade-offs ⚠️

| Trade-off | Khi nào chấp nhận |
|-----------|-------------------|
| **More code** | Project đủ lớn để benefit từ structure |
| **More files** | Team đủ lớn để cần clear boundaries |
| **Learning curve** | Long-term project, worth investment |
| **Over-engineering** | KHÔNG dùng cho prototype hay small projects |

---

## Khi nào KHÔNG cần Clean Architecture?

```
┌─────────────────────────────────────────────────────────────────┐
│  SIMPLE CRUD app          →  Không cần, quá overkill           │
│  Prototype / PoC          →  Không cần, tốc độ quan trọng hơn  │
│  Script / CLI tool        →  Không cần                         │
│  < 3 developers           →  Có thể đơn giản hơn               │
│  < 6 months lifespan      →  Có thể đơn giản hơn               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Practical Tips

### 1. Interfaces ở đâu?

```go
// ❌ WRONG: Interface ở implementation package
// internal/adapter/repository/interfaces.go
type ProjectRepository interface { ... }

// ✅ RIGHT: Interface ở nơi SỬ DỤNG nó (use case)
// internal/usecase/interfaces.go
type ProjectRepository interface { ... }
```

**Lý do:** Dependency Inversion - high-level module định nghĩa interface, low-level module implement.

### 2. DTOs vs Entities

```go
// Entity - Domain layer, có business logic
type Project struct {
    ID     string
    Name   string
    Status Status
}
func (p *Project) CanDeploy() bool { ... }

// DTO - Adapter layer, chỉ data transfer
type CreateProjectRequest struct {
    Name   string `json:"name"`
    GitURL string `json:"git_url"`
}

// Response DTO
type ProjectResponse struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    CreatedAt string `json:"created_at"` // Formatted string
}
```

### 3. Error Handling

```go
// Domain errors - định nghĩa ở use case layer
var (
    ErrProjectNotFound = errors.New("project not found")
    ErrCannotDeploy    = errors.New("project cannot be deployed")
)

// Handler maps domain errors to HTTP status
func mapErrorToStatus(err error) int {
    switch {
    case errors.Is(err, usecase.ErrProjectNotFound):
        return http.StatusNotFound
    case errors.Is(err, usecase.ErrCannotDeploy):
        return http.StatusUnprocessableEntity
    default:
        return http.StatusInternalServerError
    }
}
```

---

## Quiz - Kiểm tra hiểu biết

1. **Entity có được import Gin framework không?**
   <details>
   <summary>Answer</summary>
   Không. Entity ở innermost layer, không biết về frameworks.
   </details>

2. **Repository interface định nghĩa ở đâu?**
   <details>
   <summary>Answer</summary>
   Ở Use Case layer (nơi sử dụng), không phải ở Repository implementation.
   </details>

3. **Use Case có được return HTTP status code không?**
   <details>
   <summary>Answer</summary>
   Không. Use Case return domain errors. Handler maps errors to HTTP status.
   </details>

4. **Tại sao cần DTO riêng cho request/response?**
   <details>
   <summary>Answer</summary>
   - Entity có thể có nhiều fields không expose ra API
   - Response format có thể khác entity structure
   - Validation rules cho HTTP khác với domain validation
   </details>

---

## Resources

- [Clean Architecture - Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Go Clean Architecture Example](https://github.com/bxcodec/go-clean-arch)
- [Domain-Driven Design Quickly](https://www.infoq.com/minibooks/domain-driven-design-quickly/)

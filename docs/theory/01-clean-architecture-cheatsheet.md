# Clean Architecture - Cheatsheet

> Quick reference để ôn tập nhanh

---

## 1. The Dependency Rule

```
Dependencies chỉ point INWARD (vào trong)

Outer → biết Inner
Inner → KHÔNG biết Outer
```

---

## 2. Bốn Layers

```
Layer 4 (ngoài): Frameworks & Drivers   → main.go, Gin, PostgreSQL driver
Layer 3:         Interface Adapters     → Handler, Repository
Layer 2:         Use Cases              → Service (business logic)
Layer 1 (trong): Entities               → Model/Struct thuần
```

---

## 3. Entities vs Use Cases

| | Entities | Use Cases |
|---|---|---|
| **Câu hỏi** | "App có GÌ?" | "App LÀM GÌ?" |
| **Loại từ** | Danh từ | Động từ |
| **Ví dụ** | Project, User, Order | CreateProject, Login, Deploy |
| **Chứa** | Struct + business rules | Orchestrate logic |

---

## 4. So sánh với Spring Boot / Express

```
Spring Boot     Express         Go
─────────────────────────────────────────
Controller  =   Controller  =   Handler
Service     =   Service     =   Service
Repository  =   Repository  =   Repository
Entity      =   Model       =   Model
```

---

## 5. Repository vs Service

```
Repository:
- CHỈ query database (CRUD)
- KHÔNG có business logic
- Biết SQL

Service:
- Business logic + validation
- GỌI Repository để lấy/lưu data
- KHÔNG biết SQL
```

---

## 6. Khi nào dùng Clean Architecture?

```
❌ KHÔNG dùng:
- Side project nhỏ
- MVP / Prototype
- < 3 developers
- < 6 tháng lifespan

✅ NÊN dùng:
- Large scale (10+ devs)
- Long-term project (> 2 năm)
- Multiple teams
- Cần swap database/framework
```

---

## 7. Practical Approach (Simplified)

```
Hầu hết projects dùng 3-layer đơn giản:

handler/     →  service/     →  repository/
(HTTP)          (Logic)         (Database)

+ model/ (shared)
```

---

## 8. Interface đặt ở đâu?

```go
// ✅ ĐÚNG: Interface ở nơi SỬ DỤNG (Use Case layer)
// service/project.go
type ProjectRepository interface {
    Save(p *Project) error
}

// ❌ SAI: Interface ở nơi implement
// repository/postgres.go
type ProjectRepository interface { ... }
```

---

## 9. Flow xử lý request

```
HTTP Request
    ↓
Handler: parse request, validate format
    ↓
Service: business logic, call repo
    ↓
Repository: SQL query
    ↓
Database
    ↓
Response ngược lại
```

---

## 10. Key Takeaways

```
1. Inner layers không biết outer layers
2. Entity = danh từ, Use Case = động từ
3. Repository = CRUD only, Service = business logic
4. Bắt đầu đơn giản, refactor khi CẦN
5. Interview: hiểu concept > implement đúng 100%
```

---

*Last updated: 2026-01-10*

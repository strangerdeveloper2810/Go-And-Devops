# 05 - Dockerfile & Multi-stage Build

## Dockerfile là gì?
- File chứa **công thức** để đóng gói app thành Docker image
- Docker đọc từ trên xuống, chạy từng dòng (từng instruction)
- Mỗi instruction tạo 1 **layer** (lớp) trong image
- Layer được **cache** → rebuild nhanh hơn

## So sánh với JS/Node

| Concept        | Node.js                  | Go + Docker                          |
|----------------|--------------------------|--------------------------------------|
| Cài deps       | `npm install`            | `go mod download`                    |
| Build          | `npm run build` → `dist/`| `go build` → 1 file binary duy nhất  |
| Chạy           | `node dist/index.js`     | `./api`                              |
| Runtime        | Cần Node.js              | Không cần Go (binary chạy độc lập)   |
| Image size     | ~200-500MB               | ~20MB (multi-stage)                  |

## Multi-stage Build

### Vấn đề: Image quá nặng
```
Không multi-stage:
  Go compiler (500MB) + source code + deps + binary
  → Image ~800MB
```

### Giải pháp: 2 stages
```
Stage 1 (builder): Cài Go + deps + build → ra 1 file binary
Stage 2 (runtime): Chỉ copy binary vào image nhẹ
→ Image ~20MB
```

**Analogy:** Nấu ăn ở bếp (stage 1), chỉ bưng đĩa thức ăn ra bàn (stage 2) — không mang cả cái bếp ra.

## Flow

```
Máy bạn                    Stage 1 (builder)           Stage 2 (runtime)
──────────                 ──────────────────          ──────────────────
go.mod, go.sum ──COPY──→  download deps
source code    ──COPY──→  go build → /api
                                      │
                                      └──COPY──→      /api
                                                       │
                                                       └──→ CMD ["/api"]
                                                            Container chạy!
```

## Giải thích từng dòng

### Stage 1: Build

```dockerfile
FROM golang:1.24-alpine AS builder
```
- Base image có sẵn Go compiler
- `alpine` = bản Linux siêu nhẹ (~5MB)
- `AS builder` = đặt tên stage để stage 2 tham chiếu

```dockerfile
WORKDIR /app
```
- Set thư mục làm việc (giống `cd /app`)
- Chưa có thì Docker tự tạo

```dockerfile
COPY go.mod go.sum ./
RUN go mod download
```
- Copy file dependency **trước**, download deps
- **Tại sao tách riêng?** → Cache layer!
  - `go.mod` ít thay đổi → layer này được cache
  - Không cần download lại mỗi lần sửa code

```dockerfile
COPY . .
```
- Copy toàn bộ source code vào container
- `.dockerignore` sẽ loại bỏ file không cần (.env, .git...)

```dockerfile
RUN CGO_ENABLED=0 GOOS=linux go build -o /api ./cmd/api
```
| Phần           | Ý nghĩa                                        |
|----------------|-------------------------------------------------|
| `CGO_ENABLED=0`| Tắt C deps → binary chạy độc lập                |
| `GOOS=linux`   | Build cho Linux (container chạy Linux)           |
| `go build`     | Compile Go code                                  |
| `-o /api`      | Output ra file tên `api` ở root `/`              |
| `./cmd/api`    | Entry point = thư mục chứa `main.go`             |

### Stage 2: Runtime

```dockerfile
FROM alpine:3.19
```
- Image mới, **sạch hoàn toàn** — không có Go, không có source
- Chỉ ~5MB

```dockerfile
RUN apk add --no-cache ca-certificates
```
- Cài SSL certs để app gọi được HTTPS
- `--no-cache` = không lưu cache → image nhẹ hơn

```dockerfile
COPY --from=builder /api /api
```
- **Điểm mấu chốt của multi-stage!**
- `--from=builder` = lấy file từ stage 1
- Chỉ mang binary, bỏ lại Go compiler + source code

```dockerfile
EXPOSE 8080
```
- Khai báo app chạy port 8080
- Chỉ là **documentation**, không thật sự mở port
- Port thật mở khi `docker run -p 8080:8080`

```dockerfile
CMD ["/api"]
```
- Khi container start → chạy lệnh `/api`
- Array syntax `["..."]` (exec form) → chạy trực tiếp, không qua shell

## Cache Layer - Mẹo quan trọng

```dockerfile
# Thứ tự: ít thay đổi → nhiều thay đổi
COPY go.mod go.sum ./     ← ít thay đổi
RUN go mod download        ← CACHE! không download lại
COPY . .                   ← thay đổi thường xuyên (sửa code)
RUN go build ...           ← phải build lại
```

Nếu `COPY . .` ngay từ đầu → mỗi lần sửa 1 dòng code → download lại hết deps → **chậm**.

## Commands

```bash
# Build image
docker build -t pmv-api:latest .

# Chạy container
docker run -p 8080:8080 --env-file .env pmv-api:latest

# Xem image size
docker images pmv-api

# Xem layers
docker history pmv-api:latest
```

## .dockerignore

Giống `.gitignore` nhưng cho Docker. Files trong đây **KHÔNG** được copy vào image:
- `.env` → bảo mật, không commit secrets
- `.git` → không cần git history trong image
- `*_test.go` → không cần test files trong production
- `*.md` → không cần docs

## Docker Compose - Chạy full stack

### Docker Network - Containers nói chuyện với nhau

```
Trước (Go chạy trên máy):
  Go (máy bạn) → localhost:5432 → PostgreSQL container

Giờ (tất cả trong Docker):
  Go container → postgres:5432 → PostgreSQL container
                 ^^^^^^^^
                 Tên service = hostname trong Docker network
```

Docker Compose tự tạo network, các container gọi nhau bằng **tên service** thay vì `localhost`.
Giống trong công ty, gọi đồng nghiệp bằng tên ("postgres") thay vì số phòng.

```yaml
environment:
  # localhost → postgres (tên service)
  - DATABASE_URL=postgres://postgres:postgres@postgres:5432/pmv?sslmode=disable
  # localhost → redis (tên service)
  - REDIS_URL=redis://redis:6379
```

### depends_on + condition

```yaml
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy
```

Đợi PostgreSQL + Redis **healthy** rồi mới start API.
Không thì API start trước, connect DB chưa sẵn sàng → crash.

### build context

```yaml
api:
  build:
    context: ../../services/api    # thư mục chứa source code
    dockerfile: Dockerfile         # file Dockerfile trong thư mục đó
```

`context` = thư mục Docker dùng để build. Tất cả `COPY` trong Dockerfile tính từ thư mục này.

### Commands

```bash
# Chạy full stack (build + start)
docker compose -f deployments/docker/docker-compose.yml up -d --build

# Xem logs API
docker compose -f deployments/docker/docker-compose.yml logs -f api

# Dừng tất cả
docker compose -f deployments/docker/docker-compose.yml down

# Dừng + xóa data (reset DB)
docker compose -f deployments/docker/docker-compose.yml down -v
```

## Lỗi hay mắc
- Tên binary không khớp giữa `go build -o` và `COPY --from` / `CMD`
- COPY destination sai: `/` vs `./` (root vs WORKDIR)
- Go version trong Dockerfile không khớp với go.mod
- Quên `.dockerignore` → copy `.env` (secrets) vào image
- Dùng `localhost` trong Docker network thay vì tên service
- Quên `depends_on` → API start trước DB → crash

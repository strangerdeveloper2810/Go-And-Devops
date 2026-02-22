# ================================================================================
# DOCKERFILE - Containerize Go Application
# ================================================================================
#
# DOCKERFILE BASICS:
# - Instructions để build Docker image
# - Mỗi instruction tạo 1 layer
# - Layers được cache → faster rebuilds
#
# MULTI-STAGE BUILD:
# - Dùng nhiều FROM statements
# - Stage đầu: build application
# - Stage cuối: chỉ copy binary
# - → Image size nhỏ hơn nhiều!
# ================================================================================

# ============================================
# Stage 1: Build
# ============================================
# AS builder: đặt tên cho stage, dùng để reference sau
FROM golang:1.22-alpine AS builder

# WORKDIR: Set working directory trong container
# Tất cả commands sau sẽ chạy từ directory này
WORKDIR /app

# Copy go.mod và go.sum trước
# Nếu không đổi → cache layer này → faster builds
COPY go.mod go.sum ./

# Download dependencies
# Separate step để tận dụng cache
RUN go mod download

# Copy source code
# COPY <src> <dest>
# . = current directory (context)
COPY . .

# Build binary
# CGO_ENABLED=0: Disable CGO để build static binary
# GOOS=linux: Target OS
# -ldflags: Linker flags
#   -s -w: Strip debug info → smaller binary
# -o: Output file
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /api ./cmd/api

# ============================================
# Stage 2: Runtime
# ============================================
# scratch: Empty base image (smallest possible)
# alpine: Minimal Linux (~5MB)
# distroless: Google's minimal images
FROM alpine:3.19

# Install ca-certificates cho HTTPS requests
# tzdata cho timezone support
RUN apk --no-cache add ca-certificates tzdata

# Security: Run as non-root user
# 1. Create group
# 2. Create user
# 3. Chown directories user cần write
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

# Copy binary từ builder stage
# --from=builder: Lấy từ stage tên "builder"
COPY --from=builder /api .

# Change ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port (documentation, không actually publish)
EXPOSE 8080

# Health check
# Docker/K8s sẽ dùng để check container healthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Entry point
# CMD vs ENTRYPOINT:
# - ENTRYPOINT: Command cố định
# - CMD: Default arguments (có thể override)
# - Combine: ENTRYPOINT ["./api"] CMD ["--config", "default"]
CMD ["./api"]

# ================================================================================
# BUILD & RUN:
# ================================================================================
# Build image:
#   docker build -t pmv-api:latest .
#
# Run container:
#   docker run -p 8080:8080 --env-file .env pmv-api:latest
#
# Check image size:
#   docker images pmv-api
#
# ================================================================================
# OPTIMIZATION TIPS:
# ================================================================================
# 1. Order commands từ ít thay đổi → nhiều thay đổi
#    (để tận dụng layer caching)
#
# 2. Multi-stage builds để giữ final image nhỏ
#
# 3. .dockerignore để exclude unnecessary files
#
# 4. Specific base image tags (golang:1.22-alpine, không phải golang:latest)
#
# 5. Minimize layers bằng cách combine RUN commands
# ================================================================================

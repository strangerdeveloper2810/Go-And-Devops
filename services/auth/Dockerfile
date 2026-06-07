# PM Platform — auth-service Dockerfile (multi-stage build)
#
# Build context PHAI la repo root (de go.work + packages/proto-go co the
# truy cap). Build voi:
#   docker build -f services/auth/Dockerfile -t pm-auth:dev .
#
# Hoac qua Makefile: `make docker-build` (tu service directory nay).

# ─── Stage 1: builder ────────────────────────────────────────
FROM golang:1.25-alpine AS builder

WORKDIR /workspace

# Tao user/group sớm de khong can root o stage cuoi.
RUN addgroup -S app && adduser -S -G app app

# Cai dat build tools toi thieu.
RUN apk add --no-cache git ca-certificates

# Cache module downloads: copy go.work + go.mod/sum truoc.
COPY go.work ./
COPY go.work.sum* ./
COPY packages/proto-go/go.mod packages/proto-go/go.sum* packages/proto-go/
COPY services/auth/go.mod services/auth/go.sum* services/auth/

WORKDIR /workspace/services/auth
RUN go mod download

# Copy source. Lam sau khi deps cache xong de source changes
# khong lam bust dep cache.
WORKDIR /workspace
COPY packages/proto-go/ packages/proto-go/
COPY services/auth/ services/auth/

WORKDIR /workspace/services/auth
RUN CGO_ENABLED=0 GOOS=linux go build \
      -ldflags="-s -w" \
      -trimpath \
      -o /out/auth \
      ./cmd/auth

# ─── Stage 2: runner ─────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata wget && \
    addgroup -S app && adduser -S -G app app

COPY --from=builder /out/auth /usr/local/bin/auth

USER app
EXPOSE 8001 9001

# Container health: healthcheck HTTP moi 10 giay.
# Dung wget thay vi grpc_health_probe de don gian hoa (auth service
# expose HTTP health endpoint).
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8001/health || exit 1

ENTRYPOINT ["/usr/local/bin/auth"]

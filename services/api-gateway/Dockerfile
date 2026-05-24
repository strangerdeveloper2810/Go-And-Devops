# PM Platform — api-gateway Dockerfile (multi-stage build)
#
# Build context MUST be the repo root (so go.work + packages/proto-go are
# reachable). Build with:
#   docker build -f services/api-gateway/Dockerfile -t pm-api-gateway:dev .
#
# Or via Makefile: `make docker-build` (from this service directory).

# ─── Stage 1: builder ────────────────────────────────────────
FROM golang:1.25-alpine AS builder

WORKDIR /workspace

# Install minimal build tools (CA certs for go-getting, tzdata for runtime).
RUN apk add --no-cache git ca-certificates

# Cache module downloads: copy go.work + go.mod/sum files first, then `go mod download`.
COPY go.work ./
COPY go.work.sum* ./
COPY packages/proto-go/go.mod packages/proto-go/go.sum* packages/proto-go/
COPY services/api-gateway/go.mod services/api-gateway/go.sum* services/api-gateway/

WORKDIR /workspace/services/api-gateway
RUN go mod download

# Copy source. Done after deps so source changes don't bust dep cache.
WORKDIR /workspace
COPY packages/proto-go/ packages/proto-go/
COPY services/api-gateway/ services/api-gateway/

WORKDIR /workspace/services/api-gateway
RUN CGO_ENABLED=0 GOOS=linux go build \
      -ldflags="-s -w" \
      -trimpath \
      -o /out/api-gateway \
      ./cmd/api-gateway

# ─── Stage 2: runner ─────────────────────────────────────────
FROM alpine:3.20

# Add CA certs + tzdata for proper HTTPS/timezone handling.
RUN apk add --no-cache ca-certificates tzdata wget && \
    addgroup -S app && adduser -S -G app app

COPY --from=builder /out/api-gateway /usr/local/bin/api-gateway

USER app
EXPOSE 8000 9000

# Container health: hit /health and fail if non-2xx. Faster than running
# gRPC probe; switch to grpc_health_probe when /health goes auth-only.
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8000/health || exit 1

ENTRYPOINT ["/usr/local/bin/api-gateway"]

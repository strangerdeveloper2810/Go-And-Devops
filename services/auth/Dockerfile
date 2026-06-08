# PM Platform — auth Dockerfile (multi-stage build)
#
# Build context MUST be the repo root (so go.work + packages/proto-go are
# reachable). Build with:
#   docker build -f services/auth/Dockerfile -t pm-auth:dev .
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
COPY services/auth/go.mod services/auth/go.sum* services/auth/

WORKDIR /workspace/services/auth
RUN go mod download

# Copy source. Done after deps so source changes don't bust dep cache.
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

# Add CA certs + tzdata for proper HTTPS/timezone handling.
RUN apk add --no-cache ca-certificates tzdata wget && \
    addgroup -S app && adduser -S -G app app

COPY --from=builder /out/auth /usr/local/bin/auth


USER app
EXPOSE 8001 9001

# Container health: hit /health and fail if non-2xx. Faster than running
# gRPC probe; switch to grpc_health_probe when /health goes auth-only.
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
      CMD wget -qO- http://localhost:8001/health || exit 1


ENTRYPOINT ["/usr/local/bin/auth"]

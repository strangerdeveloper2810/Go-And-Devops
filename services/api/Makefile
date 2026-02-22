# ================================================================================
# MAKEFILE - Common Development Commands
# ================================================================================
#
# MAKEFILE là gì?
# - Build automation tool (từ 1976!)
# - Define "targets" (commands) và dependencies
# - `make <target>` để chạy
#
# SYNTAX:
# target: dependencies
#     command (PHẢI dùng TAB, không phải spaces!)
#
# .PHONY: targets không tạo file (chỉ là commands)
# ================================================================================

.PHONY: help build run test clean docker-up docker-down lint fmt

# Default target
help:
	@echo "Available commands:"
	@echo "  make build      - Build Go binary"
	@echo "  make run        - Run the application"
	@echo "  make dev        - Run with live reload (requires air)"
	@echo "  make test       - Run tests"
	@echo "  make lint       - Run linter"
	@echo "  make fmt        - Format code"
	@echo "  make docker-up  - Start Docker dependencies"
	@echo "  make docker-down - Stop Docker dependencies"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make deps       - Download dependencies"

# ============================================
# Build & Run
# ============================================

# Download dependencies
deps:
	go mod download
	go mod tidy

# Build binary
# -o: output file name
# -ldflags: linker flags
#   -s: omit symbol table
#   -w: omit DWARF debugging info
# → Smaller binary size
build:
	go build -ldflags="-s -w" -o bin/api ./cmd/api

# Run directly (development)
run:
	go run ./cmd/api

# Run with live reload using Air
# Install: go install github.com/air-verse/air@latest
dev:
	air

# ============================================
# Testing
# ============================================

# Run all tests
# -v: verbose output
# -race: detect race conditions
# ./...: all packages in project
test:
	go test -v -race ./...

# Run tests with coverage
test-coverage:
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

# ============================================
# Code Quality
# ============================================

# Format code
# gofmt: Go's built-in formatter
# -s: simplify code
# -w: write result to file
fmt:
	gofmt -s -w .
	goimports -w .

# Run linter
# Install: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
lint:
	golangci-lint run ./...

# ============================================
# Docker
# ============================================

# Start dependencies (PostgreSQL, Redis)
docker-up:
	docker compose -f ../../deployments/docker/docker-compose.yml up -d

# Stop dependencies
docker-down:
	docker compose -f ../../deployments/docker/docker-compose.yml down

# View logs
docker-logs:
	docker compose -f ../../deployments/docker/docker-compose.yml logs -f

# ============================================
# Cleanup
# ============================================

clean:
	rm -rf bin/
	rm -f coverage.out coverage.html
	go clean -cache

# ================================================================================
# NOTES:
# ================================================================================
# 1. @ prefix: Không print command, chỉ print output
# 2. - prefix: Ignore errors và continue
# 3. Variables: VAR=value, dùng $(VAR)
# 4. $@ = target name, $< = first dependency
# ================================================================================

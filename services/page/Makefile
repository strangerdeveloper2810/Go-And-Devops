# PM Platform — page dev tasks
#
# Convenience wrappers for go/docker. Each Go service ships a similar
# Makefile so the surface is uniform across the platform.

SERVICE := page
IMAGE   := pm-$(SERVICE)
TAG     := dev
REPO_ROOT := $(shell git rev-parse --show-toplevel)

.PHONY: help run build test lint tidy docker-build docker-run clean

help: ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

run: ## Run locally (loads .env if present)
	@if [ -f .env ]; then set -a; . ./.env; set +a; fi; \
	go run ./cmd/$(SERVICE)

build: ## Compile binary into ./bin/
	@mkdir -p bin
	go build -trimpath -ldflags="-s -w" -o bin/$(SERVICE) ./cmd/$(SERVICE)

test: ## Run unit tests with race detector + coverage
	go test -race -coverprofile=coverage.out ./...

lint: ## golangci-lint (requires the binary on PATH)
	golangci-lint run ./...

tidy: ## Sync go.mod + go.work
	go mod tidy
	cd $(REPO_ROOT) && go work sync

docker-build: ## Build Docker image (context = repo root)
	cd $(REPO_ROOT) && docker build \
	    -f services/$(SERVICE)/Dockerfile \
	    -t $(IMAGE):$(TAG) .

docker-run: docker-build ## Run image, expose 8004 + 9004
	docker run --rm \
	    --name $(IMAGE) \
	    -p 8004:8004 -p 9004:9004 \
	    --env-file .env \
	    $(IMAGE):$(TAG)

clean: ## Remove build artifacts
	rm -rf bin coverage.out

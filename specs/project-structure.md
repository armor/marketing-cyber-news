# ACI Backend Project Structure

## Overview

The ACI (Armor Cyber Intelligence) backend is written in Go using Clean Architecture principles. This document describes the project structure, dependencies, and development setup.

## Technology Stack

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| Language | Go | 1.25+ | Latest: 1.25.5 (Dec 2025) |
| HTTP Framework | Chi | v5.0.12 | Go 1.22+ mux routing support |
| WebSocket | gorilla/websocket | v1.5.1 | RFC 6455 compliant |
| Database Driver | pgx | v5.7+ | High-performance PostgreSQL |
| Configuration | envconfig | v1.4.0 | Environment variable parsing |
| Logging | zerolog | v1.33+ | Zero allocation JSON logger |
| Validation | go-playground/validator | v10.28.0 | Go 1.25 support |
| JWT | golang-jwt/jwt | v5 | RS256, ES256 support |
| AI | anthropic-sdk-go | latest | Official Anthropic Go SDK |
| Testing | testify | v1.9.0 | Assertions, mocking |
| DB Migrations | golang-migrate | v4.19.1 | PostgreSQL driver support |

## Directory Structure

```
aci-backend/
├── cmd/
│   └── server/
│       └── main.go                 # Application entry point
│
├── internal/
│   ├── config/
│   │   └── config.go               # Configuration loading
│   │
│   ├── domain/
│   │   ├── article.go              # Article entity
│   │   ├── category.go             # Category entity
│   │   ├── user.go                 # User entity
│   │   ├── alert.go                # Alert entity
│   │   ├── source.go               # Source entity
│   │   └── errors.go               # Domain errors
│   │
│   ├── repository/
│   │   ├── interfaces.go           # Repository interfaces
│   │   ├── postgres/
│   │   │   ├── article_repo.go     # Article repository
│   │   │   ├── category_repo.go    # Category repository
│   │   │   ├── user_repo.go        # User repository
│   │   │   ├── alert_repo.go       # Alert repository
│   │   │   ├── source_repo.go      # Source repository
│   │   │   └── db.go               # Database connection
│   │   └── redis/
│   │       └── cache.go            # Redis cache (optional)
│   │
│   ├── service/
│   │   ├── interfaces.go           # Service interfaces
│   │   ├── article_service.go      # Article business logic
│   │   ├── auth_service.go         # Authentication logic
│   │   ├── alert_service.go        # Alert management
│   │   ├── search_service.go       # Search operations
│   │   └── notification_service.go # Real-time notifications
│   │
│   ├── api/
│   │   ├── server.go               # HTTP server setup
│   │   ├── router.go               # Route definitions
│   │   ├── handlers/
│   │   │   ├── article_handler.go
│   │   │   ├── auth_handler.go
│   │   │   ├── category_handler.go
│   │   │   ├── alert_handler.go
│   │   │   ├── user_handler.go
│   │   │   ├── stats_handler.go
│   │   │   ├── webhook_handler.go
│   │   │   └── health_handler.go
│   │   ├── middleware/
│   │   │   ├── auth.go             # JWT authentication
│   │   │   ├── cors.go             # CORS handling
│   │   │   ├── ratelimit.go        # Rate limiting
│   │   │   ├── logging.go          # Request logging
│   │   │   ├── recovery.go         # Panic recovery
│   │   │   └── requestid.go        # Request ID injection
│   │   └── response/
│   │       ├── response.go         # Standard responses
│   │       └── errors.go           # Error responses
│   │
│   ├── websocket/
│   │   ├── hub.go                  # WebSocket connection hub
│   │   ├── client.go               # WebSocket client
│   │   ├── message.go              # Message types
│   │   └── handler.go              # WebSocket upgrade handler
│   │
│   ├── ai/
│   │   ├── client.go               # Anthropic client wrapper
│   │   ├── enrichment.go           # Content enrichment
│   │   ├── embeddings.go           # Vector embeddings
│   │   └── prompts.go              # AI prompts
│   │
│   └── pkg/
│       ├── jwt/
│       │   └── jwt.go              # JWT utilities
│       ├── validator/
│       │   └── validator.go        # Input validation
│       ├── slug/
│       │   └── slug.go             # Slug generation
│       └── sanitizer/
│           └── sanitizer.go        # HTML sanitization
│
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_articles.sql
│   └── ...
│
├── scripts/
│   ├── migrate.sh                  # Database migration
│   ├── seed.sh                     # Seed data
│   └── generate.sh                 # Code generation
│
├── deployments/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── k8s/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       ├── configmap.yaml
│       └── secret.yaml
│
├── docs/
│   └── api/
│       └── openapi.yaml
│
├── tests/
│   ├── integration/
│   │   ├── article_test.go
│   │   ├── auth_test.go
│   │   └── setup_test.go
│   └── mocks/
│       ├── article_repo_mock.go
│       └── ...
│
├── go.mod
├── go.sum
├── Makefile
├── .env.example
├── .gitignore
└── README.md
```

## go.mod

```go
module github.com/armor/aci-backend

go 1.25

require (
    // HTTP & Routing
    github.com/go-chi/chi/v5 v5.0.12
    github.com/go-chi/cors v1.2.1
    github.com/go-chi/httprate v0.9.0

    // WebSocket
    github.com/gorilla/websocket v1.5.1

    // Database
    github.com/jackc/pgx/v5 v5.7.2
    github.com/jackc/pgx-zerolog v0.0.0-20231012135929-9cf37c8c7b1d
    github.com/golang-migrate/migrate/v4 v4.19.1

    // Configuration
    github.com/kelseyhightower/envconfig v1.4.0
    github.com/joho/godotenv v1.5.1

    // Logging
    github.com/rs/zerolog v1.33.0

    // Validation
    github.com/go-playground/validator/v10 v10.28.0

    // JWT
    github.com/golang-jwt/jwt/v5 v5.2.1

    // AI - Official Anthropic Go SDK
    github.com/anthropics/anthropic-sdk-go v0.2.0-beta.3

    // Utilities
    github.com/google/uuid v1.6.0
    github.com/gosimple/slug v1.14.0
    github.com/microcosm-cc/bluemonday v1.0.27
    golang.org/x/crypto v0.45.0
    golang.org/x/time v0.8.0

    // Testing
    github.com/stretchr/testify v1.9.0
    github.com/testcontainers/testcontainers-go v0.34.0
)
```

## Configuration

### Environment Variables

```bash
# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
SERVER_READ_TIMEOUT=30s
SERVER_WRITE_TIMEOUT=30s
SERVER_SHUTDOWN_TIMEOUT=10s

# Database
DATABASE_URL=postgres://user:password@localhost:5432/aci?sslmode=disable
DATABASE_MAX_CONNECTIONS=25
DATABASE_MIN_CONNECTIONS=5

# Redis (optional)
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_PRIVATE_KEY_PATH=/path/to/private.pem
JWT_PUBLIC_KEY_PATH=/path/to/public.pem
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=168h

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-haiku-20240307

# n8n Integration
N8N_WEBHOOK_SECRET=your-secret-key
N8N_API_URL=http://localhost:5678/api/v1

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://aci.armor.com
CORS_ALLOWED_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Authorization,Content-Type,X-Request-ID

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=1m

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Feature Flags
FEATURE_SEMANTIC_SEARCH=true
FEATURE_AI_ENRICHMENT=true
```

### Configuration Struct

```go
// internal/config/config.go
package config

import (
    "time"

    "github.com/kelseyhightower/envconfig"
)

type Config struct {
    Server    ServerConfig
    Database  DatabaseConfig
    Redis     RedisConfig
    JWT       JWTConfig
    Anthropic AnthropicConfig
    N8n       N8nConfig
    CORS      CORSConfig
    RateLimit RateLimitConfig
    Log       LogConfig
    Features  FeaturesConfig
}

type ServerConfig struct {
    Host            string        `envconfig:"SERVER_HOST" default:"0.0.0.0"`
    Port            int           `envconfig:"SERVER_PORT" default:"8080"`
    ReadTimeout     time.Duration `envconfig:"SERVER_READ_TIMEOUT" default:"30s"`
    WriteTimeout    time.Duration `envconfig:"SERVER_WRITE_TIMEOUT" default:"30s"`
    ShutdownTimeout time.Duration `envconfig:"SERVER_SHUTDOWN_TIMEOUT" default:"10s"`
}

type DatabaseConfig struct {
    URL            string `envconfig:"DATABASE_URL" required:"true"`
    MaxConnections int    `envconfig:"DATABASE_MAX_CONNECTIONS" default:"25"`
    MinConnections int    `envconfig:"DATABASE_MIN_CONNECTIONS" default:"5"`
}

type RedisConfig struct {
    URL string `envconfig:"REDIS_URL"`
}

type JWTConfig struct {
    PrivateKeyPath     string        `envconfig:"JWT_PRIVATE_KEY_PATH" required:"true"`
    PublicKeyPath      string        `envconfig:"JWT_PUBLIC_KEY_PATH" required:"true"`
    AccessTokenExpiry  time.Duration `envconfig:"JWT_ACCESS_TOKEN_EXPIRY" default:"15m"`
    RefreshTokenExpiry time.Duration `envconfig:"JWT_REFRESH_TOKEN_EXPIRY" default:"168h"`
}

type AnthropicConfig struct {
    APIKey string `envconfig:"ANTHROPIC_API_KEY" required:"true"`
    Model  string `envconfig:"ANTHROPIC_MODEL" default:"claude-3-haiku-20240307"`
}

type N8nConfig struct {
    WebhookSecret string `envconfig:"N8N_WEBHOOK_SECRET" required:"true"`
    APIURL        string `envconfig:"N8N_API_URL"`
}

type CORSConfig struct {
    AllowedOrigins []string `envconfig:"CORS_ALLOWED_ORIGINS" default:"http://localhost:3000"`
    AllowedMethods []string `envconfig:"CORS_ALLOWED_METHODS" default:"GET,POST,PUT,PATCH,DELETE,OPTIONS"`
    AllowedHeaders []string `envconfig:"CORS_ALLOWED_HEADERS" default:"Authorization,Content-Type,X-Request-ID"`
}

type RateLimitConfig struct {
    Requests int           `envconfig:"RATE_LIMIT_REQUESTS" default:"100"`
    Window   time.Duration `envconfig:"RATE_LIMIT_WINDOW" default:"1m"`
}

type LogConfig struct {
    Level  string `envconfig:"LOG_LEVEL" default:"info"`
    Format string `envconfig:"LOG_FORMAT" default:"json"`
}

type FeaturesConfig struct {
    SemanticSearch bool `envconfig:"FEATURE_SEMANTIC_SEARCH" default:"true"`
    AIEnrichment   bool `envconfig:"FEATURE_AI_ENRICHMENT" default:"true"`
}

func Load() (*Config, error) {
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        return nil, err
    }
    return &cfg, nil
}
```

## Makefile

```makefile
.PHONY: build run test lint migrate seed docker-build docker-run

# Variables
BINARY_NAME=aci-server
DOCKER_IMAGE=armor/aci-backend

# Build
build:
	go build -o bin/$(BINARY_NAME) ./cmd/server

build-linux:
	GOOS=linux GOARCH=amd64 go build -o bin/$(BINARY_NAME)-linux ./cmd/server

# Run
run:
	go run ./cmd/server

dev:
	air -c .air.toml

# Test
test:
	go test -v ./...

test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

test-integration:
	go test -v -tags=integration ./tests/integration/...

# Lint
lint:
	golangci-lint run ./...

fmt:
	go fmt ./...

# Database
migrate-up:
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path migrations -database "$(DATABASE_URL)" down 1

migrate-create:
	migrate create -ext sql -dir migrations -seq $(name)

seed:
	psql "$(DATABASE_URL)" -f migrations/seed.sql

# Docker
docker-build:
	docker build -t $(DOCKER_IMAGE):latest .

docker-run:
	docker-compose up -d

docker-stop:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Generate
generate:
	go generate ./...

# Clean
clean:
	rm -rf bin/
	rm -f coverage.out coverage.html

# Help
help:
	@echo "Available commands:"
	@echo "  build          - Build the binary"
	@echo "  run            - Run the server"
	@echo "  dev            - Run with hot reload (requires air)"
	@echo "  test           - Run unit tests"
	@echo "  test-coverage  - Run tests with coverage"
	@echo "  test-integration - Run integration tests"
	@echo "  lint           - Run linter"
	@echo "  migrate-up     - Run database migrations"
	@echo "  migrate-down   - Rollback last migration"
	@echo "  docker-build   - Build Docker image"
	@echo "  docker-run     - Run with Docker Compose"
```

## Dockerfile

```dockerfile
# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Copy binary
COPY --from=builder /app/server .

# Copy migrations (for init)
COPY --from=builder /app/migrations ./migrations

# Create non-root user
RUN adduser -D -g '' appuser
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/v1/health || exit 1

# Run
CMD ["./server"]
```

## docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://aci:aci_password@postgres:5432/aci?sslmode=disable
      - REDIS_URL=redis://redis:6379/0
      - JWT_PRIVATE_KEY_PATH=/app/keys/private.pem
      - JWT_PUBLIC_KEY_PATH=/app/keys/public.pem
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - N8N_WEBHOOK_SECRET=${N8N_WEBHOOK_SECRET}
      - LOG_LEVEL=debug
    volumes:
      - ./keys:/app/keys:ro
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - aci-network

  postgres:
    image: pgvector/pgvector:pg18
    environment:
      - POSTGRES_USER=aci
      - POSTGRES_PASSWORD=aci_password
      - POSTGRES_DB=aci
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aci"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - aci-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - aci-network

  n8n:
    image: n8nio/n8n:2.0.0
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://api:8080/v1/webhooks/n8n
    ports:
      - "5678:5678"
    volumes:
      - n8n-data:/home/node/.n8n
    networks:
      - aci-network

volumes:
  postgres-data:
  redis-data:
  n8n-data:

networks:
  aci-network:
    driver: bridge
```

## Development Setup

### Prerequisites

- Go 1.25+ (latest: 1.25.5)
- PostgreSQL 18+ with pgvector 0.8.1 extension
- Redis 7+ (optional, for caching)
- Docker & Docker Compose (for local development)
- n8n 2.0.0+ (for workflow automation)

### Quick Start

```bash
# Clone repository
git clone https://github.com/armor/aci-backend.git
cd aci-backend

# Copy environment file
cp .env.example .env.local

# Generate JWT keys
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

# Start dependencies
docker-compose up -d postgres redis

# Run migrations
make migrate-up

# Seed data
make seed

# Run server
make dev
```

### Code Generation

The project uses code generation for:

- **Mock generation**: `mockery` for test mocks
- **OpenAPI validation**: Generated from spec

```bash
# Install tools
go install github.com/vektra/mockery/v2@latest

# Generate mocks
make generate
```

### Testing

```bash
# Unit tests
make test

# With coverage
make test-coverage

# Integration tests (requires running database)
make test-integration
```

### Linting

```bash
# Install golangci-lint
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Run linter
make lint
```

## Architecture Decisions

### Clean Architecture Layers

1. **Domain Layer** (`internal/domain/`)
   - Pure business entities
   - No external dependencies
   - Defines interfaces for repositories

2. **Repository Layer** (`internal/repository/`)
   - Data access implementation
   - Database queries
   - Implements domain interfaces

3. **Service Layer** (`internal/service/`)
   - Business logic
   - Orchestrates repositories
   - Transaction management

4. **API Layer** (`internal/api/`)
   - HTTP handlers
   - Request/response mapping
   - Middleware

### Error Handling

Errors flow from domain to API layer:

```go
// Domain error
var ErrArticleNotFound = errors.New("article not found")

// Service maps to domain error
if article == nil {
    return nil, ErrArticleNotFound
}

// Handler maps to HTTP response
if errors.Is(err, domain.ErrArticleNotFound) {
    response.NotFound(w, "Article not found")
    return
}
```

### Dependency Injection

Dependencies are injected via constructors:

```go
// Repository
repo := postgres.NewArticleRepository(db)

// Service (depends on repo)
svc := service.NewArticleService(repo, aiClient)

// Handler (depends on service)
handler := handlers.NewArticleHandler(svc)
```

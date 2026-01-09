# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

n8n-cyber-news (Armor Newsletter) is an AI-powered cybersecurity newsletter automation platform. It combines threat intelligence aggregation, AI content generation, human-in-the-loop approval workflows, and multi-channel delivery via n8n orchestration.

## Repository Structure

```
n8n-cyber-news/
├── aci-frontend/          # React/TypeScript frontend (Vite)
├── aci-backend/           # Go backend API server
├── n8n-workflows/         # n8n workflow JSON definitions
├── deployments/k8s/       # Kubernetes deployment manifests
├── specs/                 # Feature specifications (SpecKit)
├── agents/                # Agent coordination documents
├── docs/                  # Documentation
└── tests/                 # Test reports
```

### Key Directories

| Directory | Purpose | Language/Tech |
|-----------|---------|---------------|
| `aci-frontend/` | React SPA with shadcn/ui | TypeScript, React 19, Vite 7 |
| `aci-backend/` | REST API server | Go 1.24 |
| `aci-backend/migrations/` | PostgreSQL migrations | SQL |
| `n8n-workflows/` | Newsletter automation workflows | n8n JSON |
| `deployments/k8s/` | Kubernetes manifests (Kustomize) | YAML |
| `specs/` | Feature specs using SpecKit | Markdown |

## Tech Stack

### Frontend
- **Framework:** React 19.2 + TypeScript 5.9
- **Build:** Vite 7.2
- **UI:** shadcn/ui (Radix UI + Tailwind CSS)
- **State:** TanStack Query v5, React Context
- **Routing:** react-router-dom v7
- **Charts:** Recharts, Reviz
- **Testing:** Vitest (unit), Playwright (E2E)

### Backend
- **Language:** Go 1.24
- **Framework:** Chi router
- **Database:** PostgreSQL with pgx
- **Cache:** Redis
- **Auth:** JWT (RS256)
- **AI:** OpenRouter API (Claude models)

### Infrastructure
- **Orchestration:** n8n (workflow automation)
- **Container:** Docker
- **Deployment:** Kubernetes (OKE)
- **Email:** Mailpit (dev), SMTP/Mailchimp/HubSpot (prod)

## Development Commands

### Prerequisites
- Node.js 22+
- Go 1.24+
- Docker
- kubectl (for k8s deployment)

### Frontend Development
```bash
cd aci-frontend
npm install
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
```

### Backend Development
```bash
cd aci-backend
go mod download
go run ./cmd/server          # Start server (localhost:8080)
go test ./...                # Run tests
go build -o aci-backend ./cmd/server
```

### Database
```bash
# Run migrations (from aci-backend/)
cat migrations/*.up.sql | psql $DATABASE_URL

# Seed test data
psql $DATABASE_URL -f scripts/seed-test-data.sql
```

### Kubernetes Deployment
```bash
# Build and push images
docker buildx build --platform linux/amd64 -t <registry>/aci-backend:latest --push -f aci-backend/deployments/Dockerfile aci-backend/
docker buildx build --platform linux/amd64 -t <registry>/aci-frontend:latest --push -f aci-frontend/Dockerfile aci-frontend/

# Deploy
kubectl apply -k deployments/k8s

# Port forward for local access
kubectl port-forward -n armor-newsletter svc/aci-frontend 3000:80
kubectl port-forward -n armor-newsletter svc/aci-backend 8080:80
```

## Architecture

### API Structure
- Base URL: `/v1/`
- Auth: Bearer token (JWT)
- Format: JSON with `{ data: T }` or `{ error: { code, message } }`

### Key API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /v1/auth/login` | User authentication |
| `GET /v1/threats` | List threat articles |
| `GET /v1/newsletters` | List newsletters |
| `POST /v1/newsletters/:id/approve` | Approve newsletter |
| `GET /v1/dashboard/stats` | Dashboard metrics |

### n8n Workflows
| Workflow | Purpose |
|----------|---------|
| `newsletter-content-ingestion` | Fetch and process threat articles |
| `newsletter-generation` | AI-powered content generation |
| `newsletter-approval` | Human approval workflow |
| `newsletter-delivery-smtp` | Email delivery |
| `engagement-webhook` | Track email engagement |

## E2E Testing Gate (NON-NEGOTIABLE)

> **E2E tests MUST verify actual behavior, not just UI feedback.**

### Required Verification Layers

| Layer | What to Verify | How to Verify |
|-------|----------------|---------------|
| **1. Network** | API call made | `page.waitForResponse()` |
| **2. Status** | 200/201 returned | `response.status()` |
| **3. Persistence** | Data survives reload | Reload page, verify data |
| **4. Console** | Zero errors | `page.on('console')` |
| **5. Network Errors** | No 4xx/5xx | Monitor responses |

### Deep Testing Pattern (MANDATORY)

```typescript
// BAD - Tests nothing (FORBIDDEN)
await saveButton.click();
await expect(toast).toBeVisible(); // LIES!

// GOOD - Proves API called
const [response] = await Promise.all([
  page.waitForResponse(r => r.url().includes('/api/') && r.request().method() === 'PUT'),
  saveButton.click()
]);
expect(response.status()).toBe(200);

// BEST - Proves persistence
await page.reload();
await expect(page.getByText(savedValue)).toBeVisible();
```

## Test Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@test.com` | `TestPass123` | Admin |
| `marketing@test.com` | `TestPass123` | Marketing |
| `soc1@test.com` | `TestPass123` | SOC Analyst |

## Key Documentation

| Document | Location |
|----------|----------|
| **Implementation Rules** | `CLAUDE_RULES.md` |
| **Feature Specs** | `specs/` |
| **API Documentation** | `aci-backend/docs/` |
| **Test Reports** | `tests/reports/` |

## SpecKit Commands

```bash
/speckit.specify    # Create feature specification
/speckit.plan       # Generate implementation plan
/speckit.tasks      # Generate task list
/speckit.implement  # Execute implementation
/speckit.analyze    # Cross-artifact analysis
```

---

## Code Quality Standards (MANDATORY)

### Design Patterns - Gang of Four

All code MUST use appropriate Gang of Four design patterns:

| Pattern | When to Use | Example in Codebase |
|---------|-------------|---------------------|
| **Factory** | Object creation | Service factories, handler construction |
| **Singleton** | Single instance needed | Config, DB pool, Logger |
| **Strategy** | Interchangeable algorithms | Notification channels, auth providers |
| **Observer** | Event-driven systems | WebSocket handlers, event emitters |
| **Decorator** | Add behavior dynamically | Middleware chain, logging wrappers |
| **Adapter** | Interface compatibility | External API clients |
| **Repository** | Data access abstraction | All database operations |
| **Builder** | Complex object construction | Query builders, response builders |

### SOLID Principles (NON-NEGOTIABLE)

| Principle | Rule | Violation Example |
|-----------|------|-------------------|
| **S**ingle Responsibility | One class/function = one job | Handler doing validation + business logic + DB |
| **O**pen/Closed | Open for extension, closed for modification | Switch statements for new types |
| **L**iskov Substitution | Subtypes must be substitutable | Interface violations |
| **I**nterface Segregation | Many specific interfaces > one general | God interfaces with 20+ methods |
| **D**ependency Inversion | Depend on abstractions, not concretions | Direct DB calls in handlers |

### DRY - Don't Repeat Yourself

```go
// BAD - Repeated code
func GetUser(id string) (*User, error) {
    row := db.QueryRow("SELECT * FROM users WHERE id = $1", id)
    // ... parsing logic
}
func GetUserByEmail(email string) (*User, error) {
    row := db.QueryRow("SELECT * FROM users WHERE email = $1", email)
    // ... same parsing logic duplicated
}

// GOOD - DRY with shared implementation
func (r *UserRepo) scanUser(row pgx.Row) (*User, error) {
    // Single parsing implementation
}
func (r *UserRepo) GetUser(id string) (*User, error) {
    row := r.db.QueryRow(ctx, userByIDQuery, id)
    return r.scanUser(row)
}
```

### No Nested If Statements (CLEAN CODE)

Nested if statements are a **clean code violation**. Use guard clauses, early returns, and extract methods.

```go
// BAD - Nested if (FORBIDDEN)
func ProcessRequest(req *Request) error {
    if req != nil {
        if req.User != nil {
            if req.User.IsActive {
                if req.Data != nil {
                    // actual logic buried 4 levels deep
                }
            }
        }
    }
    return nil
}

// GOOD - Guard clauses with early returns
func ProcessRequest(req *Request) error {
    if req == nil {
        return ErrNilRequest
    }
    if req.User == nil {
        return ErrNilUser
    }
    if !req.User.IsActive {
        return ErrInactiveUser
    }
    if req.Data == nil {
        return ErrNilData
    }

    // Clean, flat logic
    return processData(req.Data)
}
```

```typescript
// BAD - Nested conditions (FORBIDDEN)
if (user) {
    if (user.permissions) {
        if (user.permissions.includes('admin')) {
            // logic
        }
    }
}

// GOOD - Guard clauses or optional chaining
if (!user?.permissions?.includes('admin')) {
    return <AccessDenied />;
}
// Clean logic here
```

---

## Logging & Observability Standards

### Logs MUST Go to stdout (Docker/K8s Requirement)

All logs MUST write to stdout/stderr for Docker and Kubernetes compatibility:

```go
// BAD - File logging (breaks containerization)
log.SetOutput(file)

// GOOD - stdout logging with zerolog
logger := zerolog.New(os.Stdout).With().Timestamp().Logger()

// With structured fields
logger.Info().
    Str("service", "aci-backend").
    Str("request_id", requestID).
    Msg("Processing request")
```

```typescript
// BAD - File logging
fs.appendFileSync('app.log', message);

// GOOD - Console logging (stdout)
console.log(JSON.stringify({ level: 'info', msg: 'Request processed', requestId }));
```

### OpenTelemetry Integration (MANDATORY)

All code changes MUST include OpenTelemetry instrumentation:

```go
// Backend - Trace spans for all operations
import "go.opentelemetry.io/otel"

func (s *Service) ProcessItem(ctx context.Context, id string) error {
    ctx, span := otel.Tracer("aci-backend").Start(ctx, "ProcessItem")
    defer span.End()

    span.SetAttributes(
        attribute.String("item.id", id),
    )

    // ... operation logic

    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }
    return nil
}
```

```typescript
// Frontend - Performance marks
performance.mark('api-call-start');
const response = await apiClient.get('/endpoint');
performance.mark('api-call-end');
performance.measure('API Call Duration', 'api-call-start', 'api-call-end');
```

**Required Instrumentation:**
- HTTP requests (automatic with OTEL middleware)
- Database queries (query text, duration)
- External API calls (service name, endpoint)
- Business operations (custom spans)
- Error recording with stack traces

---

## Mandatory Code Review Gate

### ALL Code Changes MUST Be Reviewed

Before ANY code is merged or deployed, it MUST pass review by:

1. **`code-reviewer` agent** - Code quality, patterns, DRY, SOLID compliance
2. **`security-reviewer` agent** - Security vulnerabilities, OWASP compliance

### Review Checklist

```
CODE REVIEW REQUIREMENTS:
├─ [ ] Gang of Four patterns used appropriately
├─ [ ] SOLID principles followed
├─ [ ] DRY - No duplicate code
├─ [ ] No nested if statements (guard clauses used)
├─ [ ] Logging goes to stdout (no file logging)
├─ [ ] OpenTelemetry spans added for new operations
├─ [ ] E2E tests verify actual behavior (not just UI)
├─ [ ] Error handling is comprehensive
└─ [ ] TypeScript has no `any` types

SECURITY REVIEW REQUIREMENTS:
├─ [ ] No SQL injection vulnerabilities
├─ [ ] No XSS vulnerabilities
├─ [ ] No hardcoded secrets
├─ [ ] Input validation on all endpoints
├─ [ ] Authentication/authorization checks
├─ [ ] Rate limiting on sensitive endpoints
├─ [ ] CORS properly configured
└─ [ ] No sensitive data in logs
```

### How to Request Review

```bash
# After implementation, always run:
# 1. Code review
Task: code-reviewer agent - Review the changes in [files]

# 2. Security review
Task: security-reviewer agent - Security audit of [files]
```

**NO EXCEPTIONS** - All PRs must include evidence of both reviews passing.

---

## OCI Infrastructure (MANDATORY)

### Always Use OCI_MARKETING Profile

This project is deployed on Oracle Cloud Infrastructure (OCI) using the **armormarketing** tenant. Always use the `OCI_MARKETING` profile for all OCI operations.

```bash
# Always specify the profile for OCI CLI commands
export OCI_CLI_PROFILE=OCI_MARKETING

# Or use --profile flag
oci compute instance list --profile OCI_MARKETING
```

### OCI Configuration

| Setting | Value |
|---------|-------|
| **Tenant** | armormarketing |
| **Region** | us-ashburn-1 |
| **Profile Name** | OCI_MARKETING |
| **Config File** | `~/.oci/config` |
| **Key File** | `~/.oci/oci_api_key.pem` |

### Kubernetes Cluster (OKE)

| Resource | Value |
|----------|-------|
| **Cluster** | OKE in us-ashburn-1 |
| **Namespace** | armor-newsletter |
| **Frontend LB** | armor-frontend-lb |
| **Backend LB** | armor-backend-lb |

### Static IP Addresses (RESERVED)

These IPs are reserved and will persist across LoadBalancer recreation:

| Service | IP Address | OCID |
|---------|------------|------|
| **Frontend** | 129.158.205.38 | `ocid1.floatingip.oc1.iad.aaaaaaaapromx47ltswdrbkvpez5rsqh3hskbu52tvhop7bjlohihtodrclq` |
| **Backend** | 129.153.33.152 | `ocid1.floatingip.oc1.iad.aaaaaaaanz4kvvexwl6d3qeojz6y3kbumcq7o35g2s3pyudcpym4e6hgliza` |
| **OKE API** | 129.158.35.209 | `ocid1.publicip.oc1.iad.amaaaaaajkki2oaabytpybjeo6aofwcdirj44ws4tbnqgnvkg5tbkcgqg6yq` |

### Endpoints

| Service | URL |
|---------|-----|
| **Frontend** | http://129.158.205.38 |
| **Backend API** | http://129.153.33.152:8080 |

### Common OCI Commands

```bash
# List reserved public IPs
oci network public-ip list --scope REGION --compartment-id $COMPARTMENT_ID --profile OCI_MARKETING

# Create reserved public IP
oci network public-ip create --compartment-id $COMPARTMENT_ID --lifetime RESERVED --display-name "armor-frontend-ip" --profile OCI_MARKETING

# List load balancers
oci lb load-balancer list --compartment-id $COMPARTMENT_ID --profile OCI_MARKETING
```

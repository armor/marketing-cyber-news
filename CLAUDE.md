# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Session Start:** Always run `git pull` at the start of every session to ensure you have the latest changes.

## Overview

n8n-cyber-news (Armor Newsletter) is an AI-powered cybersecurity newsletter automation platform. It combines threat intelligence aggregation, AI content generation, human-in-the-loop approval workflows, and multi-channel delivery via n8n orchestration.

### Recent Features (Latest First)

| Feature | Commit | Status |
|---------|--------|--------|
| **Design Tokens Migration** | `a35baed` | Deployed |
| **Password Reset Flow** | `ca6f870` | Deployed |
| **Claims Library & Approval Workflow** | `5999dcc` | Deployed |
| **Armor-Dash Theme Integration** | `9851dc8` | Deployed |
| **Enhanced Authentication System** | `3012643` | Deployed |
| **OCI LoadBalancer Configuration** | `99927c5` | Deployed |

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

---

## Planning Mode (USE PROACTIVELY)

> **"Plan before you code. Always."**

Claude Code's planning mode (`EnterPlanMode`) should be used **proactively** for any non-trivial task. This ensures alignment before implementation begins.

### When to Use Planning Mode

| Task Type | Use Planning Mode? | Reason |
|-----------|-------------------|--------|
| New feature implementation | **YES** | Multiple approaches possible |
| Multi-file changes | **YES** | Need to identify all affected files |
| API endpoint changes | **YES** | Affects frontend, backend, tests |
| Database schema changes | **YES** | Migration strategy needed |
| Refactoring | **YES** | Need to verify no breaking changes |
| Bug fix (simple) | No | Clear fix, single file |
| Typo/comment fix | No | Trivial change |

### Planning Mode Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ENTER PLANNING MODE (EnterPlanMode tool)                 │
│    - Explore codebase with Glob, Grep, Read                 │
│    - Understand existing patterns                           │
│    - Identify all files that need changes                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. WRITE PLAN TO FILE                                       │
│    - Document approach in plan file                         │
│    - List files to create/modify                            │
│    - Define acceptance criteria                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. GET USER APPROVAL (ExitPlanMode tool)                    │
│    - User reviews and approves plan                         │
│    - User can request changes or clarifications             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. IMPLEMENT (Only after approval)                          │
│    - Follow approved plan                                   │
│    - Use TodoWrite to track progress                        │
│    - Run verification at each step                          │
└─────────────────────────────────────────────────────────────┘
```

### Planning Mode Triggers (Auto-Enter)

Enter planning mode **automatically** when the task involves:

- **New API endpoints** - Need backend + frontend + tests
- **New UI features** - Need components + state + routes + tests
- **Database changes** - Need migrations + models + repositories
- **Authentication/Authorization** - Security-sensitive
- **External integrations** - n8n workflows, third-party APIs
- **Infrastructure changes** - K8s manifests, Docker, CI/CD

### Example Plan Output

```markdown
## Plan: Add User Profile Editing

### Affected Files
1. `aci-backend/internal/handler/user_handler.go` - Add PUT /users/:id
2. `aci-backend/internal/service/user_service.go` - Add UpdateProfile()
3. `aci-frontend/src/pages/Profile.tsx` - Add edit form
4. `aci-frontend/src/api/users.ts` - Add updateProfile()
5. `aci-frontend/tests/e2e/profile.spec.ts` - Add E2E tests

### Approach
- Backend: Add validation for profile fields
- Frontend: Use react-hook-form with existing patterns
- Tests: Verify API call + persistence after reload

### Acceptance Criteria
**Given** user is logged in
**When** user updates profile and saves
**Then** changes persist after page reload

### Verification Command
npm run test:e2e -- --grep "profile editing"
```

---

## Task Validation Gate (MANDATORY - BEFORE CODING)

> **"Before writing any code, establish how you will verify the task is complete."**

This is NOT full TDD - it's ensuring every task has a defined verification mechanism. Without a way to prove completion, you cannot prove the task was done correctly.

### The Validation-First Principle

Before implementing ANY task, you MUST define:

1. **What "done" looks like** - Clear, testable acceptance criteria
2. **How to verify it** - Command, test, or manual verification step
3. **Evidence required** - What output proves success

### Validation Methods (Choose at Least One)

| Method | When to Use | Example |
|--------|-------------|---------|
| **Existing Test Suite** | Feature has test coverage | `npm run test:e2e -- --grep "feature"` |
| **New Test Case (TDD Optional)** | No existing coverage | Write Playwright/Vitest test first |
| **CLI Command** | API/Backend change | `curl -X GET http://localhost:8080/v1/endpoint` |
| **Build Verification** | Code compiles | `npm run build && go build ./...` |
| **Visual Verification** | UI change | Screenshot comparison, manual review |
| **Database Query** | Data persistence | `psql -c "SELECT * FROM table WHERE..."` |
| **Deployment Verification** | Production changes | `kubectl get pods`, health check endpoints |
| **Smoke Test** | Post-deployment | `npm run test:e2e:smoke` against live environment |

### Deployment Verification (REQUIRED FOR INFRASTRUCTURE CHANGES)

For any k8s, Docker, or infrastructure changes:

```bash
# 1. Verify pods are running
kubectl get pods -n armor-newsletter

# 2. Check pod health
kubectl describe pod <pod-name> -n armor-newsletter

# 3. Test health endpoints
curl http://129.153.33.152:8080/health
curl http://129.153.33.152:8080/ready

# 4. Check logs for errors
kubectl logs -n armor-newsletter deployment/aci-backend --tail=50

# 5. Run smoke tests against production
npm run test:e2e:smoke -- --base-url=http://129.158.205.38
```

### Acceptance Criteria Format (Given/When/Then)

Every task MUST have acceptance criteria before coding:

```markdown
## Task: [Description]

### Acceptance Criteria

**Given** [precondition/context]
**When** [action is performed]
**Then** [expected outcome]

### Verification Command
```bash
[command to run that proves the task is complete]
```

### Expected Output
[what success looks like]
```

### Examples

#### Example 1: API Endpoint Task

```markdown
## Task: Add password reset endpoint

### Acceptance Criteria
**Given** a registered user with email "test@example.com"
**When** POST /v1/auth/reset-password with {"email": "test@example.com"}
**Then** returns 200 OK and sends reset email

### Verification Command
```bash
curl -X POST http://localhost:8080/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Expected Output
{"data": {"message": "Password reset email sent"}}
```

#### Example 2: UI Component Task

```markdown
## Task: Add dark mode toggle to settings

### Acceptance Criteria
**Given** user is on the settings page
**When** user clicks the dark mode toggle
**Then** theme changes and preference persists after page reload

### Verification Command
```bash
npm run test:e2e -- --grep "dark mode toggle"
```

### Expected Output
✓ should toggle dark mode
✓ should persist theme preference after reload
```

#### Example 3: Database Migration Task

```markdown
## Task: Add newsletter_analytics table

### Acceptance Criteria
**Given** database is running
**When** migration is applied
**Then** newsletter_analytics table exists with correct schema

### Verification Command
```bash
make migrate-up && psql $DATABASE_URL -c "\d newsletter_analytics"
```

### Expected Output
Table "public.newsletter_analytics" with columns: id, newsletter_id, opens, clicks, etc.
```

### Pre-Coding Checklist (MANDATORY)

Before writing ANY code, confirm:

- [ ] **Acceptance criteria defined** - Clear Given/When/Then statements
- [ ] **Verification method chosen** - Test, command, or manual check
- [ ] **Expected output documented** - What success looks like
- [ ] **Existing tests identified** - Related tests that might break

### Forbidden Anti-Patterns

| Anti-Pattern | Why It's Wrong | Do Instead |
|--------------|----------------|------------|
| "I'll test it after" | No verification baseline | Define verification first |
| "It should work" | Not provable | Define concrete output |
| "Looks good visually" | Subjective, not reproducible | Add screenshot comparison or E2E test |
| "The code compiles" | Doesn't prove functionality | Run actual verification command |
| Starting to code immediately | No definition of done | Write acceptance criteria first |

### Integration with Development Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    TASK RECEIVED                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Define Acceptance Criteria (Given/When/Then)        │
│         - What does "done" look like?                       │
│         - What behavior are we implementing?                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Choose Verification Method                          │
│         - Existing test? New test? CLI command? DB query?   │
│         - Document the exact command to run                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Document Expected Output                            │
│         - What does success look like?                      │
│         - What error would indicate failure?                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: THEN Start Coding                                   │
│         - Implementation with clear target                  │
│         - Run verification after each change                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Run Verification & Capture Evidence                 │
│         - Execute verification command                      │
│         - Capture output as proof                           │
│         - Include in PR/completion report                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend (`aci-frontend/`)
| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | React | 19.2 |
| **Language** | TypeScript | 5.9 |
| **Build** | Vite | 7.2 |
| **UI Components** | shadcn/ui (Radix UI) | Latest |
| **Styling** | Tailwind CSS | 4.1 |
| **State Management** | TanStack Query | v5 |
| **Routing** | react-router-dom | v7 |
| **Forms** | react-hook-form | 7.69 |
| **Charts** | Recharts, Reaviz | 3.5, 16.1 |
| **Icons** | Lucide React | 0.561 |
| **Unit Testing** | Vitest | 4.0 |
| **E2E Testing** | Playwright | Latest |
| **Date Handling** | date-fns | 4.1 |

### Backend (`aci-backend/`)
| Category | Technology | Version |
|----------|------------|---------|
| **Language** | Go | 1.24 |
| **HTTP Router** | Chi | v5.2 |
| **Database Driver** | pgx | v5.7 |
| **ORM/Query Builder** | sqlx | 1.4 |
| **Validation** | go-playground/validator | v10 |
| **Auth** | JWT (golang-jwt) | v5.3 |
| **Logging** | zerolog | 1.33 |
| **AI Client** | Anthropic SDK | 1.19 |
| **Metrics** | Prometheus client | 1.23 |
| **Testing** | testify, testcontainers | Latest |
| **Rate Limiting** | httprate | 0.15 |
| **WebSockets** | gorilla/websocket | 1.5 |

### Infrastructure
| Category | Technology | Details |
|----------|------------|---------|
| **Container Runtime** | Docker | Multi-stage builds |
| **Orchestration** | Kubernetes (OKE) | Oracle Cloud |
| **Workflow Engine** | n8n | Newsletter automation |
| **Database** | PostgreSQL | 16 |
| **Cache** | Redis | 7 |
| **Email (Dev)** | Mailpit | Local testing |
| **Email (Prod)** | SMTP/Mailchimp/HubSpot | Multi-channel |
| **CI/CD** | GitHub Actions | Automated deployment |
| **Monitoring** | Prometheus + Grafana | Metrics collection |

### Design System
| Token Category | CSS Variable Pattern | Example |
|----------------|---------------------|---------|
| **Colors** | `--color-{name}` | `--color-primary`, `--color-background` |
| **Spacing** | `--spacing-{size}` | `--spacing-sm`, `--spacing-lg` |
| **Typography** | `--font-{property}` | `--font-size-base`, `--font-weight-bold` |
| **Borders** | `--radius-{size}` | `--radius-md`, `--radius-full` |
| **Shadows** | `--shadow-{size}` | `--shadow-sm`, `--shadow-lg` |

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

#### Authentication
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/auth/login` | POST | User authentication |
| `/v1/auth/refresh` | POST | Token refresh |
| `/v1/auth/logout` | POST | Session logout |
| `/v1/auth/password/reset-request` | POST | Request password reset email |
| `/v1/auth/password/reset` | POST | Reset password with token |
| `/v1/auth/password/change` | POST | Change password (authenticated) |

#### Newsletters
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/newsletters` | GET | List newsletters |
| `/v1/newsletters/:id` | GET | Get newsletter details |
| `/v1/newsletters/:id/approve` | POST | Approve newsletter |
| `/v1/newsletters/:id/reject` | POST | Reject newsletter |

#### Threats
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/threats` | GET | List threat articles |
| `/v1/threats/:id` | GET | Get threat details |

#### Claims Library
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/claims` | GET | List marketing claims |
| `/v1/claims/:id` | GET | Get claim details |
| `/v1/claims/:id/approve` | POST | Approve claim |
| `/v1/claims/:id/reject` | POST | Reject claim |

#### Dashboard
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/dashboard/stats` | GET | Dashboard metrics |
| `/v1/dashboard/activity` | GET | Recent activity |

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

---

## Claude Code Settings

Project-specific Claude Code settings are stored in `.claude/settings.local.json`.

### Permissions Configuration

The settings follow a three-tier permission model:

| Tier | Purpose | Examples |
|------|---------|----------|
| **allow** | Commands that run without prompting | `npm run test:*`, `make build`, `kubectl get` |
| **ask** | Commands requiring confirmation | `kubectl delete`, `docker rm`, `git push --force` |
| **deny** | Blocked commands | Force push to main, `rm -rf /`, system destruction |

### Key Allowed Commands (No Prompt)

```
npm run dev/build/test/*     # All npm scripts
make build/test/lint/*       # All non-destructive make targets
kubectl get/describe/logs/*  # Read-only k8s operations
go test/build/run/*          # Go development
docker ps/logs/images/*      # Docker inspection
oci --profile OCI_MARKETING  # OCI CLI with correct profile
```

### Commands Requiring Confirmation

```
kubectl delete/apply/exec/*  # K8s mutations
docker rm/rmi/stop/*         # Docker destruction
make migrate-down/*          # Database rollback
git push --force/*           # Force push (except main - denied)
```

### Blocked Commands (Denied)

```
git push --force origin main  # Protected branch
rm -rf /                      # System destruction
mkfs, dd if=/dev/*            # Disk operations
```

### MCP Plugins Enabled

| Plugin | Purpose |
|--------|---------|
| **Playwright** | Browser automation and E2E testing |
| **Serena** | Semantic code tools |
| **Context7** | Documentation lookup |
| **Greptile** | Code review analysis |
| **Figma** | Design integration |
| **Firebase** | Firebase project management |

---

## Quick Reference

### Common Workflows

```bash
# Start development
cd aci-frontend && npm run dev    # Frontend at :5173
cd aci-backend && make run        # Backend at :8080

# Run tests
npm run test:e2e                  # E2E tests
npm run test                      # Unit tests
make test                         # Backend tests

# Deploy to OKE
kubectl apply -k deployments/k8s
kubectl get pods -n armor-newsletter

# Check production health
curl http://129.153.33.152:8080/health
```

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgres://user:pass@localhost:5432/aci` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379/0` |
| `JWT_PRIVATE_KEY` | JWT signing key | Base64-encoded RSA private key |
| `OPENROUTER_API_KEY` | AI API access | API key for Claude models |
| `N8N_WEBHOOK_URL` | n8n webhook base | `http://n8n:5678/webhook` |

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Pods not starting | `kubectl describe pod <name> -n armor-newsletter` |
| API 401 errors | Check JWT token, verify `JWT_PRIVATE_KEY` secret |
| Database connection | Verify `DATABASE_URL`, check PostgreSQL pod |
| n8n webhooks failing | Check `N8N_WEBHOOK_URL`, verify n8n pod running |
| Frontend API errors | Check CORS config, verify backend URL in frontend |

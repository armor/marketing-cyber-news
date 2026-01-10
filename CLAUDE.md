# CLAUDE.md

> **Session Start:** Run `git pull`. Production database is source of truth.

## Project Overview

**Armor Newsletter** - AI-powered cybersecurity newsletter automation platform.

| Component | Tech | Location |
|-----------|------|----------|
| Frontend | React 19, Vite 7, shadcn/ui, TanStack Query | `aci-frontend/` |
| Backend | Go 1.24, Chi, pgx, zerolog | `aci-backend/` |
| Workflows | n8n | `n8n-workflows/` |
| Infrastructure | OKE (Oracle K8s), PostgreSQL, Redis | `deployments/k8s/` |

---

## Core Rules (NON-NEGOTIABLE)

| Rule | Violation | Fix |
|------|-----------|-----|
| No nested ifs | Deep nesting | Guard clauses, early returns |
| No hardcoded values | Magic strings/numbers | Environment variables, config |
| No `any` types | TypeScript escape hatch | Define proper types |
| No console errors | Unhandled errors in browser | Fix immediately, zero tolerance |
| Logs to stdout | File-based logging | Use zerolog (Go), console (TS) |
| Fix ALL security findings | Ignoring vulnerabilities | Address before merge |
| Read before modifying | Blind changes | Understand existing code first |

---

## Pre-Start Work Gate (MANDATORY)

**Before writing ANY code, confirm you have a way to test it.**

| Gate | Requirement | If Missing |
|------|-------------|------------|
| **Testability** | Identify how to verify the work | Stop - establish test method first |
| **Logic Testing** | Plan to test business logic works | Stop - define logic test cases |
| **Environment** | Dev server running or test command available | Start required services |

**Checklist before first keystroke:**
- [ ] I know the command/method to verify this works
- [ ] I have defined logic test cases (not just UI checks)
- [ ] I can run the verification myself (not "user will check")

**Forbidden:** Starting implementation without a defined verification path.

---

## Planning Mode

Use `EnterPlanMode` tool for:
- New features or API endpoints
- Multi-file changes (3+ files)
- Database/schema changes
- Authentication/authorization work
- Infrastructure changes

**Skip planning for:** Single-line fixes, typos, simple bug fixes with obvious solutions.

---

## Task Validation (Before Coding)

Define before implementation:

```
**Given** [precondition]
**When** [action]
**Then** [expected result]

**Verify:** [command to prove completion]
**Expected:** [what success looks like]
```

---

## E2E Testing (MANDATORY)

**Rule:** Verify behavior, not UI feedback. Toasts lie.

```typescript
// REQUIRED PATTERN - Intercept API, verify status, confirm persistence
const [response] = await Promise.all([
  page.waitForResponse(r => r.url().includes('/api/') && r.request().method() === 'PUT'),
  saveButton.click()
]);
expect(response.status()).toBe(200);
await page.reload();
await expect(page.getByText(savedValue)).toBeVisible();

// Capture console errors - must be ZERO
const errors: string[] = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
// ... test ...
expect(errors).toHaveLength(0);
```

| Layer | Verify | How |
|-------|--------|-----|
| Network | API called | `page.waitForResponse()` |
| Status | 200/201 returned | `response.status()` |
| Persistence | Data survives reload | `page.reload()` + assert |
| Console | Zero errors | Capture + assert empty |

---

## Review Gates (MANDATORY)

All code changes require:
- [ ] `code-reviewer` agent - Clean code, patterns, SOLID
- [ ] `security-reviewer` agent - OWASP, vulnerabilities, input validation

---

## Code Patterns

### TypeScript/React
```typescript
// Use typed API client with TanStack Query
const { data } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => apiClient.get<Resource>(`/resource/${id}`)
});
```

### Go Backend
```go
// Parameterized queries, consistent error responses
row := db.QueryRow(ctx, `SELECT * FROM users WHERE id = $1`, id)
// Use response.NotFound(w, "message") for errors
```

---

## Commands

| Task | Command |
|------|---------|
| Frontend dev | `cd aci-frontend && npm run dev` |
| Backend dev | `cd aci-backend && make run` |
| Frontend tests | `npm run test:e2e` |
| Backend tests | `make test` |
| Build check | `npm run build && go build ./...` |
| K8s status | `kubectl get pods -n armor-newsletter` |
| K8s logs | `kubectl logs deployment/aci-backend -n armor-newsletter` |

---

## OCI Infrastructure

| Resource | Value |
|----------|-------|
| CLI Profile | `OCI_MARKETING` (always use) |
| Frontend URL | http://129.158.205.38 |
| Backend URL | http://129.153.33.152:8080 |
| K8s Namespace | `armor-newsletter` |
| Health Check | `curl http://129.153.33.152:8080/health` |

---

## Test Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@test.com` | `TestPass123` | Admin |
| `marketing@test.com` | `TestPass123` | Marketing |

**Never change admin password during deployment** - E2E tests depend on it.

---

## Anti-Patterns (FORBIDDEN)

| Bad | Good |
|-----|------|
| `expect(toast).toBeVisible()` | Intercept API + verify status |
| `any` type | Proper TypeScript types |
| Inline styles | Tailwind CSS / shadcn |
| Raw `fetch()` | `apiClient` with TanStack Query |
| `console.log` in production | zerolog structured logging |
| SQL string concatenation | Parameterized queries `$1` |
| Nested if statements | Guard clauses, early returns |
| Hardcoded secrets | Environment variables |
| Assuming deploy succeeded | Verify with `kubectl get pods` |
| "It should work" | Run it, show output |

---

## Git & Deployment

**Commits:**
- Logical, incremental changes
- Message format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Include docs updates in same commit

**Deployment verification:**
1. `git push origin <branch>`
2. Check GitHub Actions
3. `kubectl get pods -n armor-newsletter` - all Running
4. `curl http://129.153.33.152:8080/health` - returns 200

---

## Debugging Protocol

When errors occur:
1. Check server logs (`kubectl logs` or `make run` output)
2. Verify environment variables and DB connectivity
3. Add temporary logging if needed
4. Identify root cause
5. Fix and verify end-to-end
6. **Do not ask user to copy logs** - access them directly

---

## Complexity Scoring

| Factor | Points |
|--------|--------|
| Single file | +1 |
| Multi-file same module | +2 |
| Cross-module | +3 |
| New pattern | +5 |
| DB/schema change | +3 |
| Security-sensitive | +4 |

| Score | Approach |
|-------|----------|
| 0-2 | Direct implementation |
| 3-5 | Brief planning |
| 6-9 | Detailed planning + review |
| 10+ | Architecture review first |

---

## Quick Reference

```bash
# Development
cd aci-frontend && npm run dev    # :5173
cd aci-backend && make run        # :8080

# Database (port-forward first)
kubectl port-forward svc/postgres 5432:5432 -n armor-newsletter

# Logs
kubectl logs deployment/aci-backend -n armor-newsletter --tail=50

# OCI CLI (always use profile)
oci --profile OCI_MARKETING compute instance list
```

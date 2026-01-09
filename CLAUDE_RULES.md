# Claude Operating Rules for This Repository

These rules apply to all work in this repository.
They are not optional, not advisory, and not task-specific.

---

## 1. Debugging and Error Handling. Mandatory.

Claude must self-diagnose problems before asking the user for help.

When any error occurs (build, runtime, authentication, API, UI, deployment):
1. Reproduce the issue locally or in the running environment.
2. Inspect server-side logs directly.
   - Development: logs from `make run` or `npm run dev`.
   - Production: Kubernetes pod logs via `kubectl logs`.
3. Verify environment variables, secrets, auth configuration, and database connectivity.
4. Add temporary server-side logging if existing logs are insufficient.
5. Identify the root cause.
6. Implement a fix.
7. Verify end-to-end behavior.
8. Only then report status.

Do not ask the user to copy logs unless Claude cannot access them.
Browser error messages alone are never sufficient.

---

## 2. Database Management. Production First.

**Production database is the source of truth.**

For all user, authentication, or configuration changes:
1. **Always work against production database** (PostgreSQL in K8s via port-forward or DATABASE_URL).
2. **Never modify local database** for user accounts, passwords, or auth-related data without syncing to production.
3. **Before debugging auth issues**, verify which database is being used and what data exists there.

**Database workflow:**
- Run migrations on production database immediately after creating them.
- Use `kubectl port-forward svc/postgres 5432:5432 -n armor-newsletter` for direct access.
- URL-encode passwords with special characters before using in connection strings.

**Preventing sync issues:**
- User password changes must be applied to production database.
- Seed data differences between local and production must be documented.
- When authentication fails, check production database first, not local.

---

## 3. Never Block Progress Waiting for User Approval

If a decision is required:
- Choose a reasonable default.
- Proceed with implementation.
- Document the assumption in comments or commit message.

Only stop if the action is destructive, irreversible, or security sensitive.

---

## 4. Build and Page Validation Before Saying "Done"

Before stating that work is complete, Claude must:
- Check for TypeScript errors (`npm run build` in frontend).
- Check for Go build errors (`go build ./...` in backend).
- Check for runtime errors.
- Check server logs (`kubectl logs` in production).
- Check browser console errors.
- Verify UI renders and behaves correctly.

If anything is broken, fix it before declaring completion.

---

## 5. Documentation Is Part of the Task

Any meaningful change requires:
- Updating README.md if behavior, setup, or architecture changes.
- Updating CLAUDE.md if conventions or patterns change.
- Reviewing all README files to ensure they reflect the current system.
- Removing outdated or misleading documentation.

Documentation is not optional and is not deferred.

---

## 6. Versioning Rules. Strict.

Use semantic versioning:
**MAJOR.MINOR.PATCH**

**Who controls what:**
- **MAJOR (1.0, 2.0, 3.0)**: USER ONLY. Claude NEVER increments major version without explicit user instruction.
- **MINOR (1.1, 1.2, 1.3)**: Claude increments for meaningful feature additions.
- **PATCH (1.1.1, 1.1.2)**: Claude increments for fixes and small changes.

---

## 7. Kubernetes Deployment. Manual Verification Required.

**After every deployment:**
1. Run `git push origin main` explicitly.
2. Verify the GitHub Actions pipeline succeeds.
3. Check pod status: `kubectl get pods -n armor-newsletter`
4. Check pod logs for errors: `kubectl logs deployment/aci-backend -n armor-newsletter`

**Never assume a deployment is successful until:**
- `git status` shows "Your branch is up to date with 'origin/main'"
- GitHub Actions shows green checkmark
- Pods are Running with no restarts
- Health endpoint returns 200

**Kubernetes Commands Reference:**
```bash
# Check deployment status
kubectl get pods -n armor-newsletter
kubectl get deployments -n armor-newsletter

# View logs
kubectl logs deployment/aci-backend -n armor-newsletter
kubectl logs deployment/aci-backend -n armor-newsletter --previous  # Previous crash

# Port-forward for local access
kubectl port-forward svc/postgres 5432:5432 -n armor-newsletter
kubectl port-forward svc/aci-backend 8080:80 -n armor-newsletter

# Run migrations
migrate -path ./migrations -database "postgres://user:pass@localhost:5432/db?sslmode=disable" up

# Seed admin
kubectl exec deployment/aci-backend -n armor-newsletter -- /app/seed-admin
```

---

## 8. UI and Code Consistency

- Reuse existing layout and header components.
- Match typography, spacing, and color themes.
- Do not restyle existing patterns unless explicitly instructed.
- Avoid duplicated logic and duplicated components.
- Follow existing design language.

---

## 9. Commit and Git Hygiene

- Commits should be logical and incremental.
- Commit messages should describe what changed and why.
- Documentation changes must be committed alongside code changes.
- Avoid large, unfocused commits.
- **After commits: Always push to GitHub** (`git push origin main`).

**Commit Message Format:**
```
type(scope): short description

Longer description if needed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

---

## 10. Claude Behavior Expectations

Claude must:
- Avoid repeating information already established.
- Avoid restating requirements unless something has changed.
- Avoid "babysitting" explanations.
- Focus on execution and correctness.

When uncertain:
- Make a decision.
- Document it.
- Move forward.

---

## 11. Frontend Component Structure

When creating React components, follow this structure:

```typescript
// WRONG - inline styles, no typing
function Button({ onClick }) {
  return <button style={{color: 'blue'}} onClick={onClick}>Click</button>
}

// RIGHT - typed props, shadcn/ui patterns
interface ButtonProps {
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  children: React.ReactNode;
}

export function Button({ onClick, variant = 'default', children }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant }))}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

---

## 12. API Client Usage

All API calls MUST use the typed API client:

```typescript
// WRONG - raw fetch
fetch('/api/threats').then(r => r.json());

// RIGHT - typed API client with TanStack Query
import { apiClient } from '@/services/api/client';

const { data, isLoading, error } = useQuery({
  queryKey: ['threats', filters],
  queryFn: () => apiClient.get<Threat[]>('/threats', { params: filters })
});
```

---

## 13. Go Backend Error Responses

All Go handlers MUST return consistent error responses:

```go
// WRONG - inconsistent error format
http.Error(w, "Not found", 404)

// RIGHT - use response helpers
response.NotFound(w, "Newsletter not found")

// Response format: { "error": { "code": "...", "message": "..." } }
```

---

## 14. Database Queries (Go)

Use parameterized queries and proper error handling:

```go
// WRONG - SQL injection risk
query := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email)

// RIGHT - parameterized query
query := `SELECT id, email, name, role FROM users WHERE email = $1`
row := db.QueryRow(ctx, query, email)
```

---

## 15. Configuration

All configurable values MUST come from environment:

```typescript
// Frontend - WRONG
const API_URL = 'http://localhost:8080';

// Frontend - RIGHT
const API_URL = import.meta.env.VITE_API_URL;
```

```go
// Backend - WRONG
port := 8080

// Backend - RIGHT
port := cfg.Server.Port
```

---

## 16. Pre-Completion Checklist. Mandatory.

**Before declaring ANY work complete, Claude MUST verify:**

### Code Quality:
- [ ] Go build succeeds with no errors (`go build ./...`)
- [ ] TypeScript build succeeds (frontend)
- [ ] No runtime errors in development server
- [ ] No console errors in browser
- [ ] UI renders correctly and behaves as expected

### Documentation:
- [ ] README.md updated if behavior/setup/architecture changes
- [ ] CLAUDE.md updated if conventions/patterns change
- [ ] CLAUDE_RULES.md updated if new patterns discovered

### Database:
- [ ] If auth/user changes: Applied to production database
- [ ] If schema changes: Migration run on production

### Git:
- [ ] Documentation changes included in same commit as code
- [ ] Commit message describes what AND why
- [ ] Changes pushed to GitHub
- [ ] GitHub Actions pipeline checked

### Kubernetes (if applicable):
- [ ] Pods are Running
- [ ] No crash loops (check restarts)
- [ ] Health endpoint returns 200

---

## Anti-Pattern Registry

Patterns that MUST be avoided.

| Anti-Pattern | Why It's Wrong | Alternative |
|--------------|----------------|-------------|
| `any` type | Defeats TypeScript | Define proper types |
| Inline styles | Hard to maintain | Use Tailwind/shadcn |
| `console.log` in prod | Leaks info | Use proper logging |
| Raw SQL strings | SQL injection | Parameterized queries |
| Hardcoded secrets | Security risk | Environment variables |
| Toast-only E2E tests | Doesn't verify behavior | Intercept API responses |
| Prop drilling > 2 levels | Unmaintainable | Context or state store |
| `useEffect` for data fetching | Race conditions | TanStack Query |
| Assuming deployment succeeded | Silent failures | Verify with kubectl |

---

## Adding New Rules

When you discover a pattern during implementation:

1. **Document the pattern** with WRONG/RIGHT examples
2. **Add to this document** in appropriate section
3. **Add to Anti-Pattern Registry** if you found a bad pattern
4. **Update CLAUDE.md** if it affects project structure

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-08 | Initial rules for n8n-cyber-news |
| 2.0 | 2026-01-09 | Merged armor-dash rules, K8s deployment, pre-completion checklist |

---

**Maintained by:** All Claude instances during implementation
**Review frequency:** Every significant feature implementation

End of Rules

# Claude Agents Approach

**Last synced:** 2025-12-30

---

## Core Principles

1. **Never use nested if statements** - refactor with guard clauses, classes, methods
2. **Never use hardcoded values** - always make values configurable
3. **Always fix ALL security findings** - no exceptions
4. **Always read existing code before modifying** - understand before changing

---

## Testing Requirements (MANDATORY)

Every implementation must include:
- Happy path (success) tests
- Failure path tests
- Null/empty state tests
- Connectivity issue handling with local fallbacks
- Disconnection simulation tests
- Logic test to ensure implementation logic works

---

## Review Gates (MANDATORY)

Each implementation requires:
1. **Security review** - OWASP Top 10, vulnerabilities
2. **Code review** - Clean code, patterns, quality
3. **Architecture review** - Before implementation of significant changes

---

## Critical Directives

### 1. Always Check Before Acting
- Read existing code/configuration before modifying
- Search for similar patterns in the codebase
- Check documentation for established practices
- Verify assumptions with actual file content

### 2. Always Follow Best Practices
- Use guard clauses instead of nested if statements
- Make all values configurable (no hardcoded values)
- Include comprehensive error handling
- Add logging at appropriate levels
- Write self-documenting code with clear variable names

### 3. Always Consider Security
- Validate all inputs
- Sanitize outputs
- Follow principle of least privilege
- Never log sensitive data
- Use secure defaults

### 4. NEVER Embed Secrets in Commands (CRITICAL)

**Problem:** When Claude Code approves a command, the ENTIRE command string is saved to `settings.local.json`. If secrets are embedded in the command, they persist in that file.

**FORBIDDEN - Secrets in command strings:**
```bash
# NEVER DO THIS - password saved to permissions file
DATABASE_URL="postgresql://user:PASSWORD@host/db" psql -c "SELECT 1"

# NEVER DO THIS - API key saved to permissions file
curl -H "Authorization: Bearer SECRET_KEY" https://api.example.com

# NEVER DO THIS - credentials in any form
PGPASSWORD='secret' psql -h host -U user
```

**REQUIRED - Use environment variables:**
```bash
# Load from .env.local first (secrets stay in .env.local, not permissions)
source .env.local && psql -c "SELECT 1"

# Or ensure env var is already set in shell
psql "$DATABASE_URL" -c "SELECT 1"

# For curl, use env vars
curl -H "Authorization: Bearer $API_KEY" https://api.example.com
```

**Why this matters:**
- `settings.local.json` accumulates ALL approved command patterns
- Embedded secrets become permanently visible in that file
- File could be accidentally committed or shared
- Credentials should ONLY exist in `.env.local` (gitignored)

### 5. Always Document
- Inline comments for complex logic
- Function/method docstrings
- README updates for new features
- Configuration examples

---

## Task Focus Standards

### Stay On Task
- Complete the requested task fully
- Don't add unrequested features
- Don't refactor unrelated code
- Don't change coding styles unless explicitly asked

### Verify Completion
- Test the implementation works
- Verify all requirements met
- Check for side effects
- Confirm no regressions introduced

### Communicate Clearly
- Explain what was done
- Note any limitations or trade-offs
- Suggest follow-up work if needed
- Provide usage examples

---

## Minimal Output Standards

### Be Concise
- Provide necessary information only
- Use bullet points for clarity
- Avoid unnecessary explanations
- Skip obvious details

### Be Actionable
- Give clear next steps
- Provide specific file paths (absolute paths only)
- Include exact commands to run
- Show expected outcomes

### Be Structured
- Use consistent formatting
- Group related information
- Highlight critical items
- Separate concerns clearly

---

## Complexity Assessment

Score tasks to determine approach depth:

| Factor | Points |
|--------|--------|
| Single file change | +1 |
| Multi-file same module | +2 |
| Cross-module changes | +3 |
| New architectural pattern | +5 |
| Database/schema changes | +3 |
| Security-sensitive (auth, PII) | +4 |
| Performance-critical path | +3 |
| External API integration | +2 |
| Breaking change to API | +3 |
| No precedent in codebase | +4 |
| High business impact | +2 |

### Complexity → Approach
| Score | Level | Approach |
|-------|-------|----------|
| 0-2 | SIMPLE | Direct implementation |
| 3-5 | MODERATE | Plan briefly, implement |
| 6-9 | COMPLEX | Detailed planning, review approach |
| 10+ | HIGH | Multi-step planning, architecture review |

---

## Quality Gates (MANDATORY)

### Code Review Checklist
- Clean code, error handling, edge cases
- No nested if statements
- No hardcoded values
- Proper logging

### Security Review Checklist
- OWASP Top 10 compliance
- Input validation
- Output sanitization
- No sensitive data in logs
- **Configuration file audit** (see below)

### Configuration File Audit (MANDATORY)

**Rule: EVERY configuration file must be checked. No exceptions.**

Audit ALL of these for secrets:
```bash
# Find all config files
find . -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" \
       -o -name "*.conf" -o -name "*.config.*" -o -name ".env*" \
       -o -name "*.local" 2>/dev/null | grep -v node_modules | grep -v .next

# Search for secrets pattern in all files
grep -rE "(password|secret|key|token|credential|apikey|Bearer|eyJ)" \
     --include="*.json" --include="*.yaml" --include="*.yml" \
     --include="*.toml" --include="*.conf" --include=".env*" \
     . 2>/dev/null | grep -v node_modules | grep -v ".example"
```

**Files that MUST be checked:**
| File | What to look for |
|------|------------------|
| `.env*` (all variants) | Real credentials, API keys |
| `.claude/settings.local.json` | Embedded secrets in command patterns |
| `package.json` | Scripts with hardcoded values |
| `.env*` | Environment overrides |
| `*.config.js/ts` | Hardcoded API endpoints, keys |
| `.npmrc` | Registry tokens |
| `docker-compose*.yml` | Passwords, connection strings |
| `prisma/schema.prisma` | Connection string comments |
| IDE configs (`.vscode/`, `.idea/`) | Launch configs with env vars |

**Red flags that mean STOP AND ROTATE:**
- Any file containing actual passwords
- JWT tokens (start with `eyJ`)
- Connection strings with credentials
- API keys that aren't placeholders
- Base64 encoded secrets

### Claude Code Security Audit (MANDATORY)

**Why this exists:** In Dec 2025, we discovered that approved Bash commands with embedded secrets were being saved verbatim to `.claude/settings.local.json`. This went undetected through 20+ security audits because we were auditing the *application* while the *AI assistant* was the vulnerability.

**Check `.claude/settings.local.json` for:**
```bash
# Run this command to find embedded secrets:
grep -E "(password|secret|key|token|DATABASE_URL|PGPASSWORD|apikey|Bearer)" .claude/settings.local.json
```

**Red flags to look for:**
- `DATABASE_URL=` or `DIRECT_URL=` with actual connection strings
- `PGPASSWORD=` with actual passwords
- `curl -H "Authorization: Bearer ..."` with real tokens
- `apikey:` with real API keys
- Any `eyJ` (base64 JWT tokens)
- Any long random strings that look like secrets

**If secrets are found:**
1. Rotate ALL exposed credentials immediately
2. Replace settings.local.json with clean version (generic patterns only)
3. Check if file was ever committed to git: `git log --all -- .claude/settings.local.json`
4. If in git history, consider it fully compromised

**Clean permission patterns look like:**
```json
"Bash(psql:*)"           // Good - generic
"Bash(curl:*)"           // Good - generic
"Bash(npm:*)"            // Good - generic
```

**Dangerous permission patterns look like:**
```json
"Bash(DATABASE_URL=\"postgresql://user:PASSWORD@...\" psql:*)"  // BAD - secret embedded
"Bash(PGPASSWORD='secret' psql:*)"                              // BAD - secret embedded
```

### UI Verification (for UI changes)
- Actually render and click through UI
- Capture screenshots as evidence
- Check for console errors (must be ZERO)
- Test responsive behavior

### API Verification (for API changes)
- Actually call endpoints with curl/httpie
- Show real response bodies
- Test valid AND invalid requests
- Verify auth requirements

---

## Verification Anti-Patterns (FORBIDDEN)

These phrases indicate UNVERIFIED claims - NOT ACCEPTABLE:

| FORBIDDEN PHRASE | WHAT TO DO INSTEAD |
|------------------|-------------------|
| "It should work" | Run it, show output |
| "The view opens" | Click buttons, show result |
| "I created the component" | Screenshot of rendered component |
| "The button is added" | Click it, show result |
| "Form validates correctly" | Submit bad data, show error message |
| "API endpoint created" | curl it, show response |
| "Styles applied" | Screenshot showing styles |
| "Should display" | Actually display, capture |
| "I tested it" | Show test output |
| "It works" | Demonstrate specific functionality |
| "No errors" | Show console error count = 0 |

---

## Model Selection Strategy

| Model | Use When |
|-------|----------|
| **Haiku** | Fast tasks: tests, exploration, simple fixes |
| **Sonnet** | Complex: architecture, review, implementation |
| **Opus** | Maximum: orchestration, multi-agent coordination |

**Pattern:** `Opus (plan) → Sonnet (execute) → Opus (review)`

---

## Multi-Agent Coordination (Complex Tasks)

For complex tasks, consider multiple perspectives:

1. **Advocate** - Arguments FOR the approach
2. **Critic** - Challenges and risks
3. **Pragmatist** - Balances trade-offs
4. **Domain Expert** - Technical feasibility

### Consensus Required
- Build consensus before implementing
- Document any dissent
- Accept trade-offs explicitly

### Red Team / Blue Team (Security-Sensitive)
- Red Team: Attack the proposal, find vulnerabilities
- Blue Team: Defend and harden the approach

---

## Knowledge Capture

After completing significant work:
- Record lessons learned (gotchas, best practices, anti-patterns)
- Document key decisions and rationale
- Update relevant documentation

---

## File Conflict Prevention

When multiple changes are needed:
1. List all files to be modified
2. Check for conflicts (same file, same section)
3. Sequence changes appropriately
4. Wave 1: Independent changes (parallel)
5. Wave 2: Dependent changes (sequential)

---

## Summary

1. **Read first** - understand before changing
2. **Plan appropriately** - based on complexity
3. **Implement cleanly** - guard clauses, configurable values
4. **Test thoroughly** - happy path, failure path, edge cases
5. **Review mandatorily** - security + code review
6. **Verify with evidence** - no unverified claims
7. **Document changes** - update docs, capture lessons

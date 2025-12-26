# n8n-cyber-news Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-13

---

## MANDATORY: Deep E2E Testing (READ THIS FIRST)

> **"E2E tests MUST verify the system's actual behavior (network requests, database state), NOT just UI feedback. Toasts, loading spinners, and success messages are implementation details that CAN AND WILL LIE."**

### This Is Non-Negotiable

**Surface-level testing is FORBIDDEN.** Every feature that touches data must prove:

1. **The API was actually called** - Intercept the request, verify method and URL
2. **The API returned success** - Check status code (200/201), not just "no error"
3. **Data actually persisted** - Reload the page, verify data survives
4. **Validation actually blocks** - Prove invalid submissions make NO API call

### Why This Matters

A form can show a success toast while:
- Validation silently fails (no API call made)
- API call fails but error isn't handled
- Optimistic UI updates without waiting for response
- Frontend state updates but backend never receives data

**ALL of these bugs are invisible to surface-level "click and check toast" testing.**

### Deep Testing Pattern (MANDATORY)

```typescript
// SHALLOW (FORBIDDEN) - catches nothing
await saveButton.click();
await expect(toast).toBeVisible(); // MEANINGLESS

// DEEP (REQUIRED) - proves the system works
const apiResponse = await Promise.all([
  page.waitForResponse(r =>
    r.url().includes('/api/resource') &&
    r.request().method() === 'PUT'
  ),
  saveButton.click()
]);
expect(apiResponse[0].status()).toBe(200);  // API actually called
await page.reload();                          // Fresh state
await expect(page.getByText(newValue)).toBeVisible(); // Data persisted
```

### Golden Rule

> **"If you can't prove data hit the backend and persisted, you haven't tested anything."**

### 5 Required Verification Layers

| Layer | What to Check | How to Verify | Failure = |
|-------|---------------|---------------|-----------|
| 1. Network | Request actually sent | `page.waitForResponse()` | Silent failure |
| 2. HTTP Status | Backend accepted (200/201) | `response.status()` | Rejected data |
| 3. Persistence | Data in database | Reload page, verify visible | Lost data |
| 4. Console Errors | Zero JS errors | Capture and assert empty | Broken UI |
| 5. Network Errors | No 4xx/5xx | Monitor failed requests | API issues |

### Deep Testing Patterns

#### Form Submission (MANDATORY)
```typescript
// BAD - proves nothing
await saveButton.click();
await expect(toast).toBeVisible();

// GOOD - proves API called
const response = await Promise.all([
  page.waitForResponse(r => r.url().includes('/api/') && r.request().method() === 'PUT'),
  saveButton.click()
]);
expect(response[0].status()).toBe(200);

// BEST - proves persistence
await page.reload();
await expect(page.getByText(savedValue)).toBeVisible();
```

#### Validation Testing (MANDATORY)
```typescript
// Prove validation BLOCKS the API call
let apiCalled = false;
page.on('request', r => {
  if (r.url().includes('/api/')) apiCalled = true;
});

// Try to submit with invalid/empty data
await submitButton.click();
await page.waitForTimeout(1000);

// API should NOT have been called
expect(apiCalled).toBe(false);

// Error should be visible to user
await expect(page.locator('[role="alert"], .text-destructive')).toBeVisible();
```

#### Console Error Capture (MANDATORY)
```typescript
const consoleErrors: string[] = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => consoleErrors.push(err.message));

// ... run your tests ...

// ZERO errors allowed
expect(consoleErrors).toHaveLength(0);
```

### Anti-Patterns (AUTOMATIC FAILURE)

| Anti-Pattern | Why It's Wrong | Do This Instead |
|--------------|----------------|-----------------|
| `expect(toast).toBeVisible()` | Toast fires before/without API | Intercept actual API call |
| "It should work" | Zero evidence | Show test output + screenshots |
| "Form saves correctly" | No proof of persistence | Reload page, verify data |
| "Validation works" | Could fail silently | Prove API was NOT called |
| "No errors in console" | Didn't capture them | Capture + assert length = 0 |
| Testing only happy path | Misses edge cases | Test invalid states too |
| `await page.click()` only | No verification | Always verify result |

### Test Completion Checklist

Before marking ANY form/CRUD feature complete:

- [ ] **API Intercepted**: `waitForResponse()` captured the request
- [ ] **Status Verified**: Response status is 200/201
- [ ] **Persistence Proven**: Data visible after `page.reload()`
- [ ] **Validation Tested**: Invalid submission makes NO API call
- [ ] **Errors Captured**: Console errors array is empty
- [ ] **Network Clean**: No 4xx/5xx responses
- [ ] **Screenshots Taken**: Visual proof of each state

### PR Approval Evidence Requirements

**"It should work" is NOT evidence.** PRs must include:

```
VERIFICATION EVIDENCE:
├─ API Calls: [list with method + URL + status]
├─ Persistence: [reload test passed]
├─ Validation: [API blocked when invalid: YES]
├─ Console Errors: 0
├─ Network Errors: 0
├─ Screenshots: [paths to visual proof]
└─ Test Output: [actual playwright output]
```

---

## Active Technologies
- TypeScript 5.9 with React 19.2 + React 19.2, Vite 7.2, shadcn/ui (Radix UI + Tailwind), Reviz, TanStack Query v5, react-router-dom v7 (002-nexus-frontend)
- N/A (frontend-only, backend manages persistence) (002-nexus-frontend)

- TypeScript 5.9, React 19.2 + Vite 7.2, shadcn/ui, Reviz, Ant Design, TanStack Query, react-router-dom 7.x (002-nexus-frontend)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.9, React 19.2: Follow standard conventions

## Recent Changes
- 004-ai-newsletter-automation: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
- 002-nexus-frontend: Added TypeScript 5.9 with React 19.2 + React 19.2, Vite 7.2, shadcn/ui (Radix UI + Tailwind), Reviz, TanStack Query v5, react-router-dom v7

- 002-nexus-frontend: Added TypeScript 5.9, React 19.2 + Vite 7.2, shadcn/ui, Reviz, Ant Design, TanStack Query, react-router-dom 7.x

<!-- MANUAL ADDITIONS START -->

## E2E Testing Standards (MANDATORY)

### Critical Rule: Verify Behavior, Not Symptoms

> "E2E tests must verify the system's actual behavior (network requests, database state), not just UI feedback. Toasts, loading spinners, and success messages are implementation details that can lie."

### Form Submission Tests MUST Verify:

1. **Network request actually sent** - Use `page.waitForResponse()` or request interception
2. **Correct HTTP method and status** - Verify PUT/POST returns 200/201
3. **Data persistence** - Reload page and verify data still present
4. **Never trust toasts alone** - UI feedback can fire before/without actual submission

### Required Test Pattern for CRUD Operations:

```typescript
// BAD - only checks UI (THIS WILL MISS BUGS)
await saveButton.click();
await expect(toast).toBeVisible(); // Toast doesn't prove anything!

// GOOD - verifies actual API call
const putResponse = await Promise.all([
  page.waitForResponse(r =>
    r.url().includes('/api/resource') &&
    r.request().method() === 'PUT'
  ),
  saveButton.click()
]);
expect(putResponse[0].status()).toBe(200);

// BETTER - also verify persistence survives reload
await page.reload();
await expect(page.getByText(newValue)).toBeVisible();
```

### Form Validation Testing:

- Test submission with each required field empty
- Verify validation errors block submission (no network request made)
- Test that fixing validation allows submission
- Use request spy to confirm NO API call when validation fails:

```typescript
let apiCalled = false;
page.on('request', r => {
  if (r.url().includes('/api/endpoint')) apiCalled = true;
});
await submitButton.click();
await page.waitForTimeout(1000);
expect(apiCalled).toBe(false); // Validation should block API call
```

### Before Marking Form Feature Complete:

- [ ] Happy path: fill all fields -> submit -> verify API call -> verify persistence
- [ ] Validation: submit with required fields empty -> verify NO API call
- [ ] Error handling: simulate API failure -> verify error shown
- [ ] Edit mode: load existing data -> modify -> save -> reload -> verify changes
- [ ] Console errors: capture and assert zero errors

### Anti-Patterns to Flag in Code Review:

```typescript
// DANGEROUS - validation can fail silently
const handleSubmit = async () => {
  if (!validate()) return; // Silent return - no user feedback!
  await api.save(data);
  toast.success('Saved!');
};

// CORRECT - make validation failure visible
const handleSubmit = async () => {
  const errors = validate();
  if (Object.keys(errors).length > 0) {
    setErrors(errors); // Show errors to user
    return;
  }
  // Only show toast AFTER successful API response
  const response = await api.save(data);
  if (response.ok) toast.success('Saved!');
};
```

<!-- MANUAL ADDITIONS END -->

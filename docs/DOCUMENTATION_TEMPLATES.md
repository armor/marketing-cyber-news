# Documentation Templates - Content Workflow Feature

**Purpose:** Reusable templates for creating consistent documentation across the project

**Note:** Copy and modify these templates as needed. All placeholders in `[BRACKETS]` should be replaced with actual content.

---

## Table of Contents

1. [API Endpoint Documentation](#api-endpoint-documentation)
2. [React Component Documentation](#react-component-documentation)
3. [Custom Hook Documentation](#custom-hook-documentation)
4. [User Guide Documentation](#user-guide-documentation)
5. [Test Scenario Documentation](#test-scenario-documentation)
6. [Integration Documentation](#integration-documentation)

---

## API Endpoint Documentation

### Full Endpoint Template

Save as: `docs/endpoints/approvals/[endpoint-name].md`

```markdown
# [ENDPOINT_NAME]

## Overview

**Endpoint:** `[METHOD] /v1/[path]`

**Purpose:** [Describe what this endpoint does and its primary use case]

**Introduced:** [Version/Date]

**Rate Limit:** [X requests per minute] (authenticated), [Y requests per minute] (public if applicable)

**Stability:** [Stable/Beta/Experimental]

---

## Authentication & Authorization

**Authentication Required:** Yes / No

**Authentication Method:** [Bearer Token/API Key/OAuth2]

**Required Roles:**
- [Role 1]: Can use endpoint
- [Role 2]: Can use endpoint
- [Role 3]: Cannot use endpoint

**Permissions Checked:**
```
- approval:read   (view approval data)
- approval:write  (modify approvals)
- approval:admin  (administrative access)
```

**Example Authorization Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Request

### URL Structure
```
[METHOD] /v1/[path]/{paramName}
```

### Path Parameters

| Name | Type | Required | Example | Description |
|------|------|----------|---------|-------------|
| [param1] | [type] | Yes | `art_123` | [What is this parameter used for] |
| [param2] | [type] | No | `2024-01-10` | [What is this parameter used for] |

### Query Parameters

| Name | Type | Required | Default | Example | Description |
|------|------|----------|---------|---------|-------------|
| [param1] | [type] | No | [default] | [example] | [Description. Include validation rules] |
| [param2] | [type] | No | [default] | [example] | [Description. Include validation rules] |
| page | integer | No | 1 | `2` | Page number for pagination (1-indexed) |
| limit | integer | No | 20 | `50` | Results per page (min: 10, max: 100) |
| sort | string | No | `created_at` | `-updated_at` | Sort field, prefix with `-` for descending |

### Headers

**Required Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Optional Headers:**
| Header | Type | Example | Description |
|--------|------|---------|-------------|
| X-Request-ID | string | `req_abc123xyz` | Unique request identifier for tracing |
| X-Idempotency-Key | string | `idem_xyz789` | Idempotency key for retryable operations |

### Request Body

**Content-Type:** `application/json`

**Schema:**
```typescript
{
  // [Field description]
  field1: string;       // Required. [Additional constraints]

  // [Field description]
  field2?: number;      // Optional. [Default value, range, etc.]

  // [Field description]
  field3?: {
    nestedField: string;
    anotherField: boolean;
  };
}
```

**Full Example:**
```json
{
  "action": "approve",
  "confidence": "high",
  "notes": "Article meets all editorial standards",
  "tags": ["verified", "urgent"]
}
```

**Validation Rules:**
- `field1`: Required, string, max 255 characters
- `field2`: Optional, integer, must be 0-100
- `field3`: Optional, must include all nested fields if provided

---

## Response

### Success Response (200/201)

**Status Code:** [200 OK / 201 Created]

**Headers:**
```
Content-Type: application/json
X-RateLimit-Remaining: 9999
X-RateLimit-Limit: 10000
X-RateLimit-Reset: 1234567890
```

**Schema:**
```typescript
{
  data: {
    id: string;
    // [Field descriptions for each field]
    field1: string;
    field2: number;
    createdAt: string;  // ISO 8601 format
    updatedAt: string;  // ISO 8601 format
  };
  meta?: {
    // Optional metadata
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasNextPage: boolean;
    };
  };
}
```

**Full Example:**
```json
{
  "data": {
    "id": "art_123abc",
    "title": "Critical Vulnerability Disclosed",
    "status": "approved",
    "approvedBy": "user_456def",
    "approvedAt": "2024-01-10T14:30:00Z",
    "createdAt": "2024-01-10T10:00:00Z",
    "updatedAt": "2024-01-10T14:30:00Z"
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "hasNextPage": true
    }
  }
}
```

### Error Responses

#### 400 Bad Request
**When:** Invalid request parameters, validation failure

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed",
    "details": [
      {
        "field": "field1",
        "message": "field1 is required",
        "code": "REQUIRED"
      },
      {
        "field": "field2",
        "message": "field2 must be between 0 and 100",
        "code": "RANGE_ERROR"
      }
    ]
  }
}
```

#### 401 Unauthorized
**When:** Missing or invalid authentication

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "suggestion": "Refresh your token and try again"
  }
}
```

#### 403 Forbidden
**When:** User lacks required permissions

```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSION",
    "message": "You do not have permission to approve articles",
    "requiredRoles": ["approver", "admin"],
    "userRoles": ["marketing"]
  }
}
```

#### 404 Not Found
**When:** Resource doesn't exist

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Article with ID 'art_123' not found",
    "resourceType": "Article",
    "resourceId": "art_123"
  }
}
```

#### 409 Conflict
**When:** State conflict (already approved, concurrent modification)

```json
{
  "error": {
    "code": "STATE_CONFLICT",
    "message": "Article already approved by another user",
    "currentState": "approved",
    "attemptedAction": "approve",
    "conflictingUser": "user_456def",
    "conflictTime": "2024-01-10T14:25:00Z"
  }
}
```

#### 429 Too Many Requests
**When:** Rate limit exceeded

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit",
    "retryAfter": 60,
    "limit": 10000,
    "remaining": 0,
    "resetAt": "2024-01-10T15:30:00Z"
  }
}
```

#### 500 Internal Server Error
**When:** Server-side error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "requestId": "req_abc123xyz",
    "suggestion": "Contact support with request ID"
  }
}
```

---

## Examples

### cURL

```bash
# Basic request
curl -X [METHOD] https://api.example.com/v1/[path] \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "value1",
    "field2": "value2"
  }'

# With query parameters
curl -X GET "https://api.example.com/v1/[path]?page=1&limit=20&sort=-created_at" \
  -H "Authorization: Bearer your-token-here"

# With headers
curl -X POST https://api.example.com/v1/[path] \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: req_123" \
  -H "X-Idempotency-Key: idem_456" \
  -d '{ "data": "value" }'
```

### JavaScript/TypeScript

```typescript
// Using fetch API
const response = await fetch('https://api.example.com/v1/[path]', {
  method: '[METHOD]',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Request-ID': requestId
  },
  body: JSON.stringify({
    field1: 'value1',
    field2: 'value2'
  })
});

if (!response.ok) {
  const error = await response.json();
  console.error('API Error:', error.error.message);
  throw new Error(error.error.message);
}

const result = await response.json();
console.log('Success:', result.data);
```

### Python

```python
import requests
import json

url = 'https://api.example.com/v1/[path]'
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}
data = {
    'field1': 'value1',
    'field2': 'value2'
}

response = requests.post(url, headers=headers, json=data)
response.raise_for_status()

result = response.json()
print(f"Success: {result['data']}")
```

---

## Edge Cases & Special Scenarios

### Scenario 1: [Specific Edge Case]
**Description:** [What happens in this case]

**Request:**
```json
{
  "field1": "[special value]"
}
```

**Response:**
```json
{
  "data": {
    "warning": "[What happens]"
  }
}
```

---

## Related Endpoints

- [`GET /v1/[related-path]`](./related-endpoint.md) - Description
- [`POST /v1/[other-path]`](./other-endpoint.md) - Description

---

## Notes & Important Information

- [Important caveat 1]
- [Important caveat 2]
- [Performance consideration]
- [Security consideration]

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-10 | Initial release |
| 1.1.0 | 2024-02-01 | Added field3, deprecated field_old |

---
```

---

## React Component Documentation

### Full Component Template

Save as: `docs/components/[ComponentName].md`

```markdown
# [ComponentName]

## Overview

**Component Type:** [Functional / Controlled / Uncontrolled]

**Purpose:** [What does this component do and when should you use it?]

**First Added:** [Version/Date]

**Status:** [Stable/Beta/Deprecated]

---

## Key Features

- [Feature 1 with brief description]
- [Feature 2 with brief description]
- [Feature 3 with brief description]
- [Feature 4 with brief description]

---

## Props

### Type Definition

```typescript
interface [ComponentName]Props {
  /**
   * [Description of prop]
   * @required
   * @example "value"
   */
  requiredProp: string;

  /**
   * [Description of prop]
   * @optional
   * @default 10
   * @range {min: 1, max: 100}
   */
  optionalProp?: number;

  /**
   * [Description of callback prop]
   * @param {string} arg1 - [Argument description]
   * @param {number} arg2 - [Argument description]
   * @returns void
   */
  onEventHandler?: (arg1: string, arg2: number) => void;

  /**
   * [Description of complex prop]
   * @example { field1: "value", field2: 123 }
   */
  complexProp?: {
    field1: string;
    field2: number;
  };
}
```

### Props Table

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `requiredProp` | string | Yes | - | [Description and constraints] |
| `optionalProp` | number | No | 10 | [Description. Valid range: 1-100] |
| `onEventHandler` | `(arg1: string, arg2: number) => void` | No | undefined | [When callback is triggered and with what arguments] |
| `complexProp` | object | No | undefined | [Nested object with fields...] |
| `className` | string | No | undefined | [CSS class for custom styling] |
| `disabled` | boolean | No | false | [Effect of disabling the component] |

---

## Usage

### Basic Usage

```tsx
import { [ComponentName] } from '@/components/[path]/[ComponentName]';

export function MyComponent() {
  return (
    <[ComponentName]
      requiredProp="value"
      onEventHandler={(arg) => console.log(arg)}
    />
  );
}
```

### With All Props

```tsx
<[ComponentName]
  requiredProp="important-value"
  optionalProp={50}
  complexProp={{
    field1: "value",
    field2: 123
  }}
  onEventHandler={(arg1, arg2) => {
    console.log('Event fired with:', arg1, arg2);
  }}
  className="custom-class"
  disabled={false}
/>
```

### With State Management

```tsx
import { useState } from 'react';

export function MyComponent() {
  const [value, setValue] = useState('');

  return (
    <[ComponentName]
      requiredProp={value}
      onEventHandler={(newValue) => setValue(newValue)}
    />
  );
}
```

### With Hook

```tsx
import { use[ComponentName]Logic } from '@/hooks/use[ComponentName]Logic';

export function MyComponent() {
  const { state, actions } = use[ComponentName]Logic();

  return (
    <[ComponentName]
      {...state}
      onEventHandler={actions.handleEvent}
    />
  );
}
```

---

## State Management

### Internal State

The component manages the following internal state:

```typescript
{
  // [State field description]
  internalField1: string;

  // [State field description]
  internalField2: boolean;
}
```

### State Transitions

- **Initial Load:** [Describe state initialization]
- **On Prop Change:** [Describe state updates]
- **On Event:** [Describe state changes from events]

### Controlled vs Uncontrolled

**This is a [controlled/uncontrolled] component.**

- If controlled: Parent component manages state via props
- If uncontrolled: Component manages state internally

---

## Events & Callbacks

### `onEventHandler(arg1, arg2)`

**Triggered:** [When this callback fires]

**Parameters:**
- `arg1` (string): [Parameter description]
- `arg2` (number): [Parameter description]

**Returns:** void

**Example:**
```tsx
<[ComponentName]
  onEventHandler={(arg1, arg2) => {
    console.log('Handler called with:', { arg1, arg2 });
    // Handle event
  }}
/>
```

### `onStateChange(state)`

**Triggered:** [When state changes]

**Parameters:**
- `state` (object): New component state

**Example:**
```tsx
<[ComponentName]
  onStateChange={(newState) => {
    console.log('New state:', newState);
  }}
/>
```

---

## Styling & Theming

### CSS Classes

```css
/* Main component container */
.[component-name] { }

/* Child element 1 */
.[component-name]__child { }

/* Modifier state */
.[component-name]--loading { }
.[component-name]--error { }
```

### Using Design Tokens

This component uses design tokens from `src/styles/variables.css`:

```tsx
// Colors
--color-primary
--color-secondary
--color-background

// Spacing
--spacing-sm
--spacing-md
--spacing-lg

// Typography
--font-size-base
--font-weight-bold
```

### Custom Styling

```tsx
<[ComponentName]
  className={cn(
    'base-class',
    isDarkMode && 'dark-class',
    isSmallScreen && 'mobile-class'
  )}
/>
```

---

## Accessibility (a11y)

### ARIA Attributes

- `role="[role]"` - [Description]
- `aria-label="[label]"` - [Description]
- `aria-described-by="[id]"` - [Description]

### Keyboard Navigation

| Key | Behavior |
|-----|----------|
| `Tab` | Move to next interactive element |
| `Shift+Tab` | Move to previous interactive element |
| `Enter` | Activate button or action |
| `Space` | Toggle checkbox or button |
| `Escape` | Close modal or cancel operation |

### Screen Reader Support

- Component announces state changes with `aria-live="polite"`
- Labels are properly associated with form inputs
- Error messages are announced

### Testing Accessibility

```bash
# Run accessibility tests
npm run test:a11y

# Check component with axe-core
npm run test:axe -- --component=[ComponentName]
```

---

## Performance Considerations

### Rendering Optimization

- Component uses `React.memo` to prevent unnecessary re-renders
- State updates are batched when possible
- Large lists use virtualization (if applicable)

### Memory Usage

- Event handlers should be memoized: `const handler = useCallback(...)`
- Avoid recreating objects in props
- Clean up subscriptions in `useEffect` cleanup

### Best Practices

```tsx
// GOOD: Memoized callback
const handleClick = useCallback(() => {
  onEventHandler('value');
}, [onEventHandler]);

// BAD: Recreated on every render
<[ComponentName] onClick={() => onEventHandler('value')} />

// GOOD: Memoized prop object
const config = useMemo(() => ({ field: 'value' }), []);

// BAD: Recreated on every render
<[ComponentName] config={{ field: 'value' }} />
```

---

## Loading States

The component handles loading with the following pattern:

```tsx
{isLoading && <Skeleton />}
{!isLoading && error && <Error message={error} />}
{!isLoading && !error && <Content />}
```

---

## Error Handling

### Error Types

| Error | Cause | Solution |
|-------|-------|----------|
| `PropTypeError` | Missing required prop | Provide required prop |
| `ValidationError` | Invalid prop value | Check prop constraints |
| `StateError` | Component state corrupted | Reset component |

### Error Boundaries

Wrap component with error boundary for safety:

```tsx
<ErrorBoundary fallback={<ErrorMessage />}>
  <[ComponentName] {...props} />
</ErrorBoundary>
```

---

## Related Components

- [`[RelatedComponent]`](./RelatedComponent.md) - [Brief description of relationship]
- [`[AnotherComponent]`](./AnotherComponent.md) - [Brief description of relationship]

---

## Examples

### Example 1: [Specific Use Case]

```tsx
function ApprovalQueueExample() {
  const [selectedArticles, setSelectedArticles] = useState([]);

  return (
    <[ComponentName]
      articles={articleList}
      selectedArticles={selectedArticles}
      onSelectChange={setSelectedArticles}
      onApprove={handleApprove}
    />
  );
}
```

### Example 2: [Another Use Case]

```tsx
// [Code example with explanation]
```

---

## Testing

### Unit Tests

```bash
npm run test -- [ComponentName].test.tsx
```

### E2E Tests

```bash
npm run test:e2e -- --grep "[ComponentName]"
```

### Test Coverage

- Props validation
- Event handlers
- State management
- Error states
- Loading states
- Accessibility

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-10 | Initial component release |
| 1.1.0 | 2024-02-01 | Added onStateChange callback |
| 1.2.0 | 2024-03-15 | Improved accessibility with ARIA attributes |

---

## Migration Guide

### From v1.0 to v1.1

**Changed:** `onEvent` renamed to `onEventHandler`

```tsx
// Before
<[ComponentName] onEvent={handler} />

// After
<[ComponentName] onEventHandler={handler} />
```

---
```

---

## Custom Hook Documentation

### Full Hook Template

Save as: `docs/hooks/use[HookName].md`

```markdown
# use[HookName]

## Overview

**Hook Type:** [Data fetching / State management / DOM interaction]

**Purpose:** [What does this hook do and when should you use it?]

**First Added:** [Version/Date]

**Status:** [Stable/Beta/Deprecated]

---

## Quick Start

```typescript
const { data, loading, error } = use[HookName](param1, {
  option1: true,
  option2: 'value'
});

if (loading) return <Spinner />;
if (error) return <Error message={error.message} />;

return <Component data={data} />;
```

---

## Parameters

### Type Definition

```typescript
interface Use[HookName]Options {
  /**
   * [Description of option]
   * @default [default value]
   * @example true
   */
  option1?: boolean;

  /**
   * [Description of option]
   * @default "default_value"
   * @example "custom_value"
   */
  option2?: string;

  /**
   * [Description of option]
   * @range {min: 1, max: 100}
   * @default 20
   */
  pageSize?: number;
}
```

### Parameters Table

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `param1` | string | Yes | - | [What is this parameter used for] |
| `options.option1` | boolean | No | true | [What does this option control] |
| `options.option2` | string | No | `"default"` | [What does this option do] |
| `options.pageSize` | number | No | 20 | [Pagination page size, min: 10, max: 100] |

---

## Return Value

### Type Definition

```typescript
interface Use[HookName]Result<T> {
  /**
   * The fetched or computed data
   */
  data: T | null;

  /**
   * Loading state indicator
   */
  loading: boolean;

  /**
   * Error object if operation failed
   */
  error: Error | null;

  /**
   * Refetch/refresh function
   */
  refetch: () => Promise<void>;

  /**
   * Manually set data
   */
  setData: (data: T) => void;

  /**
   * Clear error
   */
  clearError: () => void;
}
```

### Return Value Table

| Property | Type | Description |
|----------|------|-------------|
| `data` | T \| null | Hook data, null while loading |
| `loading` | boolean | True while fetching data |
| `error` | Error \| null | Error object if request failed |
| `refetch` | `() => Promise<void>` | Manually trigger data refresh |
| `setData` | `(data: T) => void` | Update data without fetching |
| `clearError` | `() => void` | Clear error state |

---

## Usage

### Basic Usage

```typescript
function MyComponent() {
  const { data, loading, error } = use[HookName]('parameter');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

### With Options

```typescript
const { data, loading } = use[HookName]('parameter', {
  option1: true,
  option2: 'custom_value',
  pageSize: 50
});
```

### With Refetch

```typescript
const { data, refetch } = use[HookName]('parameter');

function handleRefresh() {
  refetch();
}

return (
  <>
    <button onClick={handleRefresh}>Refresh</button>
    {/* Use data */}
  </>
);
```

### With Error Handling

```typescript
const { data, error, clearError } = use[HookName]('parameter');

if (error) {
  return (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={clearError}>Dismiss</button>
    </div>
  );
}
```

---

## Lifecycle & Behavior

### Initialization

When the hook is first called:
1. [Step 1 description]
2. [Step 2 description]
3. [Step 3 description]

**Example:**
```typescript
const result = use[HookName]('param'); // Triggers fetch on mount
```

### Data Fetching

**Fetch Trigger:** [When data is fetched]

**Fetch Timing:** [Immediately / On demand / With delay]

**Fetch Method:** [API endpoint / Local storage / etc.]

### Caching & Stale Data

- Data is cached for [duration]
- Cache invalidated when [condition]
- Use `refetch()` to force fresh data

### Dependencies & Re-execution

Hook re-executes when these dependencies change:
```typescript
// Internal dependencies (control re-fetch)
const dependencies = [param1, options.option1];

// If any change, hook re-executes
```

### Cleanup

Hook cleans up:
- Network requests (aborts pending requests)
- Subscriptions (unsubscribes from WebSocket)
- Timers (clears intervals/timeouts)
- Memory (prevents memory leaks)

---

## State Management

### Internal State

```typescript
{
  // Fetched data
  data: T | null;

  // Loading indicator
  loading: boolean;

  // Error state
  error: Error | null;

  // Cache metadata
  _cacheTime: number;
  _isCached: boolean;
}
```

### State Transitions

| From | To | Trigger |
|------|-----|---------|
| initial | loading | Mount / Refetch |
| loading | success | Data fetched |
| loading | error | Request failed |
| success | loading | Dependency changed |
| error | loading | Refetch called |

---

## Error Handling

### Error Types

```typescript
// Network error
try {
  const { error } = use[HookName]('param');
  if (error?.name === 'NetworkError') {
    // Handle network failure
  }
} catch (e) {
  // Handle fetch error
}

// Validation error
// Timeout error
```

### Error Recovery

```typescript
const { error, refetch } = use[HookName]('param');

async function handleRetry() {
  await refetch(); // Retry fetch
}

if (error) {
  return <button onClick={handleRetry}>Retry</button>;
}
```

### Error Messages

| Error Message | Cause | Solution |
|---|---|---|
| `"Network error"` | Connection failed | Check network, retry |
| `"Request timeout"` | Request took too long | Increase timeout or retry |
| `"Invalid parameter"` | Bad input | Check parameter format |

---

## Performance & Optimization

### Memoization

```typescript
// Hook memoizes data by default
const { data } = use[HookName]('param');
// data reference doesn't change unless actually updated
```

### Preventing Re-fetches

```typescript
// DON'T: Recreate object on every render
const options = { pageSize: 20 };
use[HookName]('param', options); // Fetches every render

// DO: Memoize options
const options = useMemo(() => ({ pageSize: 20 }), []);
use[HookName]('param', options); // Fetches once
```

### Batch Updates

```typescript
// Hook batches multiple state updates into single render
setData(newData1);
setData(newData2);
// Only triggers one re-render
```

---

## Examples

### Example 1: Fetch Article List

```typescript
function ArticleList() {
  const { data: articles, loading, error } = use[HookName]('articles', {
    pageSize: 20
  });

  if (loading) return <Skeleton />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {articles?.map(article => (
        <li key={article.id}>{article.title}</li>
      ))}
    </ul>
  );
}
```

### Example 2: With Search

```typescript
function SearchArticles() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: results } = use[HookName](searchTerm, {
    debounce: 300
  });

  return (
    <>
      <input
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />
      {results?.map(result => (
        <Result key={result.id} result={result} />
      ))}
    </>
  );
}
```

### Example 3: With Manual Refetch

```typescript
function ApprovalQueue() {
  const { data, refetch } = use[HookName]('approvals');

  useEffect(() => {
    // Refetch every 30 seconds
    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  return <Queue articles={data} />;
}
```

---

## Testing

### Unit Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { use[HookName] } from './use[HookName]';

describe('use[HookName]', () => {
  it('fetches data on mount', async () => {
    const { result } = renderHook(() => use[HookName]('param'));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      // Wait for fetch to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeDefined();
  });

  it('handles errors gracefully', async () => {
    const { result } = renderHook(() =>
      use[HookName]('invalid_param')
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('Not found');
  });
});
```

---

## Related Hooks

- [`use[RelatedHook]`](./use[RelatedHook].md) - [Brief description]
- [`use[AnotherHook]`](./use[AnotherHook].md) - [Brief description]

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-10 | Initial hook release |
| 1.1.0 | 2024-02-01 | Added debounce option |
| 1.2.0 | 2024-03-15 | Improved caching strategy |

---
```

---

## User Guide Documentation

### Quick Start Template

Save as: `docs/user-guides/[FEATURE_NAME]_QUICK_START.md`

```markdown
# [Feature Name] - Quick Start Guide

**Duration:** 5 minutes
**Difficulty:** Beginner
**Audience:** [Marketing / Approvers / Admins]

---

## What You'll Learn

By the end of this guide, you'll be able to:
- [Objective 1]
- [Objective 2]
- [Objective 3]

---

## Step 1: Access the Feature

1. Log in to [Platform Name]
2. Navigate to **[Menu] > [Submenu]**
3. You'll see the [Feature Name] dashboard

**Screenshot:** [Show what dashboard looks like]

---

## Step 2: [First Main Action]

1. Click the **[Button Name]** button
2. Fill in the required fields:
   - **[Field 1]:** [Description]
   - **[Field 2]:** [Description]
3. Click **[Submit/Confirm]**

**Expected Result:** [What should happen]

**Screenshot:** [Show the action]

---

## Step 3: [Second Main Action]

1. [Action step 1]
2. [Action step 2]
3. [Action step 3]

**Screenshot:** [Show the result]

---

## Common Issues

**Issue:** [Problem description]
**Solution:** [How to fix it]

**Issue:** [Problem description]
**Solution:** [How to fix it]

---

## Next Steps

- [Link to advanced guide]
- [Link to detailed documentation]
- [Link to related feature]

---
```

### Step-by-Step Workflow Template

Save as: `docs/user-guides/[WORKFLOW_NAME]_WORKFLOW.md`

```markdown
# [Workflow Name] Workflow

**For:** [User role(s)]
**Duration:** [Estimated time]
**Complexity:** [Simple / Medium / Complex]

---

## Workflow Overview

This workflow describes how to [accomplish task]. The process involves:

1. [Step category 1]
2. [Step category 2]
3. [Step category 3]

**Visual Overview:**
[Flowchart or diagram]

---

## Prerequisites

Before starting, ensure you have:
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]
- [ ] [Permission/Access requirement]

---

## Step-by-Step Instructions

### Phase 1: [Phase Name]

#### Step 1: [Action]

1. [Sub-step 1]
2. [Sub-step 2]
3. [Sub-step 3]

**Screenshot:**
[Annotated image showing the interface]

**What Happens Next:**
[Brief explanation of result]

#### Step 2: [Action]

[Repeat structure]

### Phase 2: [Phase Name]

[Repeat phase structure]

---

## Verification

After completing all steps, verify success:

- [ ] [Verification check 1]
- [ ] [Verification check 2]
- [ ] [Verification check 3]

**Success Indicator:** [What success looks like]

---

## Troubleshooting

### Issue 1: [Problem]

**Error Message:** "[Exact error text]"

**Cause:** [Why this happens]

**Solution:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## Tips & Tricks

- **Pro Tip 1:** [Advanced technique or shortcut]
- **Pro Tip 2:** [Best practice]
- **Shortcut:** [Keyboard shortcut if applicable]

---

## Next Steps

After completing this workflow:
- [Link to next workflow]
- [Link to advanced features]

---
```

---

## Test Scenario Documentation

### E2E Test Scenario Template

Save as: `docs/testing/scenarios/[SCENARIO_NAME].md`

```markdown
# [Test Scenario Name]

**Test ID:** [TST_001]
**User Role:** [Marketing / Approver / Admin]
**Priority:** [P0 Critical / P1 High / P2 Medium / P3 Low]
**Estimated Duration:** [X minutes]

---

## Scenario Description

[Overall description of what this test validates]

---

## Test Steps

### Prerequisites

- [ ] [Precondition 1]
- [ ] [Precondition 2]
- [ ] User is logged in as [role]
- [ ] Test data is prepared (see fixtures)

### Execution Steps

**Step 1:** [Action description]
- **Action:** [What the user does]
- **Expected Result:** [What should happen]
- **Screenshot:** [If applicable]

**Step 2:** [Action description]
- **Action:** [What the user does]
- **Expected Result:** [What should happen]

[Continue for all steps]

---

## Verification

### Success Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### Visual Verification

[Screenshot of final state]

### Data Verification

After test completes, verify in database:

```sql
SELECT * FROM articles WHERE id = '[article_id]' AND status = 'approved';
```

Expected: One record with status = 'approved'

---

## Error Scenarios

### Error Scenario 1: [Condition]

**What Causes It:** [Explanation]

**Expected Error Message:** "[Exact error text]"

**How to Handle:** [Recovery steps]

---

## Notes

- [Important note 1]
- [Important note 2]
- [Known limitation]

---

## Test Data

**Test Fixture:** See `TEST_FIXTURES.md`

**User Account:** [username@example.com]

**Test Article ID:** [art_123]

---

## Related Tests

- [Link to related scenario]
- [Link to prerequisite scenario]

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-10 | Initial test case |
| 1.1.0 | 2024-02-01 | Added error scenario |

---
```

---

## End of Templates

These templates provide the structure for creating comprehensive, consistent documentation across the project. Adapt them as needed for your specific content, but maintain the overall structure and format.

For questions about specific documentation sections, refer to the main `DOCUMENTATION_REQUIREMENTS.md` file.

# OpenAPI Contract Testing

This directory contains utilities for validating frontend API services against the OpenAPI specification.

## Files

### `openapi-parser.ts`
Parses YAML OpenAPI specs and extracts endpoint/schema definitions.

**Key Functions:**
- `parseOpenAPISpec(filePath: string)`: Parse YAML spec
- `extractEndpoints(spec)`: Get all endpoint definitions
- `extractSchemas(spec)`: Get schema definitions
- `resolveRef(ref, spec)`: Resolve $ref to actual schema
- `getEndpointByOperationId(spec, operationId)`: Find endpoint by ID

### `contract-helpers.ts`
Validates data against OpenAPI schemas.

**Key Functions:**
- `validateRequestBody(data, schemaName)`: Validate request data
- `validateResponse(data, operationId, statusCode)`: Validate response data
- `getEndpointSchema(operationId)`: Get endpoint schema details
- `generateMockFromSchema(schemaName)`: Generate mock data from schema

### `../mocks/openapi-handlers.ts`
Auto-generate MSW handlers from OpenAPI spec.

**Key Functions:**
- `generateOpenAPIHandlers(config)`: Generate all handlers from spec
- `createApprovalHandlers()`: Create approval workflow handlers

### `../mocks/factories/approval-factory.ts`
Mock data factories for approval workflow testing.

**Key Functions:**
- `createMockArticleForApproval(overrides?)`: Create article
- `createMockApprovalQueueResponse(count?)`: Create queue response
- `createMockApprovalHistory(articleId, options?)`: Create approval history
- `createMockApprovalActionResponse(success?)`: Create action response

## Usage Examples

### Validate Response Against OpenAPI Spec

```typescript
import { validateResponse } from './contract-helpers';

const response = await fetch('/api/v1/approvals/queue');
const data = await response.json();

const result = validateResponse(data, 'getApprovalQueue', 200);

if (!result.valid) {
  console.error('Contract violation:', result.errors);
}
```

### Generate Mock Data

```typescript
import { generateMockFromSchema } from './contract-helpers';

const mockArticle = generateMockFromSchema('ArticleForApproval');
```

### Use Factory for Testing

```typescript
import { createMockApprovalQueueResponse } from '../mocks/factories/approval-factory';

const mockQueue = createMockApprovalQueueResponse(10, {
  userRole: 'marketing',
  targetGate: 'marketing',
});
```

### Validate API Service

```typescript
import { validateRequestBody, validateResponse } from './contract-helpers';

describe('ApprovalService', () => {
  it('should send valid approve request', async () => {
    const requestData = { notes: 'Looks good' };
    const validation = validateRequestBody(requestData, 'ApproveRequest');

    expect(validation.valid).toBe(true);
  });

  it('should receive valid response', async () => {
    const service = new ApprovalService();
    const response = await service.approveArticle('article-123');

    const validation = validateResponse(response, 'approveArticle', 200);
    expect(validation.valid).toBe(true);
  });
});
```

## Contract Testing Workflow

1. **Define API in OpenAPI spec** (`specs/003-article-approval-workflow/contracts/approval-api.yaml`)
2. **Auto-generate types** (manual or automated)
3. **Validate API services** against spec using contract helpers
4. **Mock with MSW** using OpenAPI handlers or factories
5. **Prevent drift** by running contract tests in CI

## Benefits

- **Prevent Frontend-Backend Drift**: Catch mismatches early
- **Type Safety**: Generate types from single source of truth
- **Automated Mocking**: MSW handlers from OpenAPI spec
- **Documentation**: OpenAPI spec serves as living documentation
- **Confidence**: Know API changes before they break production

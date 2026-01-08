/**
 * OpenAPI-based MSW Handlers
 * Auto-generate MSW handlers from OpenAPI spec
 *
 * Note: OpenAPI parsing is disabled in browser builds as it requires Node.js fs/path.
 * Use direct mock handlers for browser testing.
 */

import { http, HttpResponse, type HttpHandler } from 'msw';

// Types for OpenAPI spec structures (inline to avoid Node.js dependency in browser build)
interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string };
  servers: Array<{ url: string; description?: string }>;
  paths: Record<string, unknown>;
  components: { schemas?: Record<string, unknown> };
}

interface EndpointDefinition {
  path: string;
  method: string;
  operationId: string;
  parameters: unknown[];
  requestBody?: unknown;
  responses: Record<string, { description: string; content?: Record<string, { schema: unknown }> }>;
}

/**
 * Configuration for OpenAPI handlers
 */
export interface OpenAPIHandlerConfig {
  specPath: string;
  baseUrl?: string;
}

/**
 * Generate MSW handlers from OpenAPI spec
 *
 * NOTE: This function is disabled in browser builds as it requires Node.js fs/path.
 * For browser testing, use the static handlers exported from this module or create
 * handlers manually. This function only works in Node.js test environments.
 */
export function generateOpenAPIHandlers(_config: OpenAPIHandlerConfig): HttpHandler[] {
  // OpenAPI parsing is disabled in browser builds
  // Use the static approval handlers instead
  console.warn(
    '[OpenAPI Handlers] generateOpenAPIHandlers is not available in browser builds. ' +
    'Use static handlers from src/mocks/handlers/*.ts instead.'
  );
  return [];
}

/**
 * Create MSW handler for a single endpoint (internal helper, not used in browser builds)
 */
function _createHandler(
  endpoint: EndpointDefinition,
  _spec: OpenAPISpec,
  baseUrl: string
): HttpHandler {
  const method = endpoint.method.toLowerCase() as
    | 'get'
    | 'post'
    | 'put'
    | 'delete'
    | 'patch';

  // Convert OpenAPI path params to MSW format
  // /articles/{articleId} -> /articles/:articleId
  const mswPath = endpoint.path.replace(/{([^}]+)}/g, ':$1');
  const fullPath = `${baseUrl}${mswPath}`;

  // Get default response (first 2xx response)
  const successStatus = Object.keys(endpoint.responses).find((code) =>
    code.startsWith('2')
  );

  if (!successStatus) {
    throw new Error(`No success response defined for ${endpoint.operationId}`);
  }

  const response = endpoint.responses[successStatus];
  const defaultResponse = _generateDefaultResponse(response);

  return http[method](fullPath, () => {
    return HttpResponse.json(defaultResponse, { status: parseInt(successStatus, 10) });
  });
}

// Suppress unused variable warning - kept for potential future use
void _createHandler;

/**
 * Generate default response if no examples provided
 */
function _generateDefaultResponse(response: {
  description: string;
  content?: Record<string, { schema: unknown }>;
}): Record<string, unknown> | null {
  if (!response.content?.['application/json']) {
    return null;
  }

  // Return minimal valid object
  return { success: true, message: response.description };
}

/**
 * Create approval workflow handlers
 */
export function createApprovalHandlers(): HttpHandler[] {
  // Path from aci-frontend/src/mocks to project root specs
  const specPath = '../../specs/003-article-approval-workflow/contracts/approval-api.yaml';

  return generateOpenAPIHandlers({
    specPath,
    baseUrl: 'http://localhost:8080/api/v1',
  });
}

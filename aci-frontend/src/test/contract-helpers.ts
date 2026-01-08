/**
 * Contract Testing Helpers
 * Validate data against OpenAPI schemas
 *
 * @vitest-environment node
 */

import {
  type OpenAPISpec,
  type Schema,
  parseOpenAPISpec,
  extractSchemas,
  getEndpointByOperationId,
  resolveSchema,
} from './openapi-parser';

// Singleton spec instances
let cachedApprovalSpec: OpenAPISpec | null = null;
let cachedNewsletterSpec: OpenAPISpec | null = null;

/**
 * Load OpenAPI spec (cached)
 * @param specType - Type of spec to load ('approval' or 'newsletter')
 */
function getSpec(specType: 'approval' | 'newsletter' = 'approval'): OpenAPISpec {
  const projectRoot = process.cwd().includes('aci-frontend')
    ? process.cwd().replace(/\/aci-frontend.*$/, '')
    : process.cwd();

  if (specType === 'newsletter') {
    if (!cachedNewsletterSpec) {
      const specPath = `${projectRoot}/specs/004-ai-newsletter-automation/contracts/newsletter-api.yaml`;
      cachedNewsletterSpec = parseOpenAPISpec(specPath);
    }
    return cachedNewsletterSpec;
  }

  if (!cachedApprovalSpec) {
    const specPath = `${projectRoot}/specs/003-article-approval-workflow/contracts/approval-api.yaml`;
    cachedApprovalSpec = parseOpenAPISpec(specPath);
  }
  return cachedApprovalSpec;
}

/**
 * Endpoint schema with full definition
 */
export interface EndpointSchema {
  path: string;
  method: string;
  requestSchema?: Schema;
  responseSchemas: Record<number, Schema>;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  expected?: string;
  received?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate request body against schema
 */
export function validateRequestBody(
  data: unknown,
  schemaName: string,
  specType: 'approval' | 'newsletter' = 'approval'
): ValidationResult {
  const spec = getSpec(specType);
  const schemas = extractSchemas(spec);
  const schema = schemas[schemaName];

  if (!schema) {
    return {
      valid: false,
      errors: [{ field: 'schema', message: `Schema '${schemaName}' not found` }],
    };
  }

  const resolvedSchema = resolveSchema(schema, spec);
  return validateAgainstSchema(data, resolvedSchema, schemaName);
}

/**
 * Validate response data against operation schema
 */
export function validateResponse(
  data: unknown,
  operationId: string,
  statusCode: number,
  specType: 'approval' | 'newsletter' = 'approval'
): ValidationResult {
  const spec = getSpec(specType);
  const endpoint = getEndpointByOperationId(spec, operationId);

  if (!endpoint) {
    return {
      valid: false,
      errors: [{ field: 'operation', message: `Operation '${operationId}' not found` }],
    };
  }

  const response = endpoint.responses[statusCode.toString()];

  if (!response) {
    return {
      valid: false,
      errors: [
        {
          field: 'statusCode',
          message: `Status code ${statusCode} not defined for operation '${operationId}'`,
        },
      ],
    };
  }

  if (!response.content) {
    // No content defined for this response
    return { valid: true, errors: [] };
  }

  const jsonContent = response.content['application/json'];

  if (!jsonContent) {
    return {
      valid: false,
      errors: [
        {
          field: 'content',
          message: 'application/json content type not defined',
        },
      ],
    };
  }

  const resolvedSchema = resolveSchema(jsonContent.schema, spec);
  return validateAgainstSchema(data, resolvedSchema, `${operationId}:${statusCode}`);
}

/**
 * Get endpoint schema by operationId
 */
export function getEndpointSchema(
  operationId: string,
  specType: 'approval' | 'newsletter' = 'approval'
): EndpointSchema | null {
  const spec = getSpec(specType);
  const endpoint = getEndpointByOperationId(spec, operationId);

  if (!endpoint) {
    return null;
  }

  const responseSchemas: Record<number, Schema> = {};

  for (const [statusCode, response] of Object.entries(endpoint.responses)) {
    if (response.content?.['application/json']) {
      const schema = response.content['application/json'].schema;
      responseSchemas[parseInt(statusCode, 10)] = resolveSchema(schema, spec);
    }
  }

  let requestSchema: Schema | undefined;

  if (endpoint.requestBody?.content?.['application/json']) {
    requestSchema = resolveSchema(
      endpoint.requestBody.content['application/json'].schema,
      spec
    );
  }

  return {
    path: endpoint.path,
    method: endpoint.method,
    requestSchema,
    responseSchemas,
  };
}

/**
 * Generate mock data from schema
 */
export function generateMockFromSchema(
  schemaName: string,
  specType: 'approval' | 'newsletter' = 'approval'
): unknown {
  const spec = getSpec(specType);
  const schemas = extractSchemas(spec);
  const schema = schemas[schemaName];

  if (!schema) {
    throw new Error(`Schema '${schemaName}' not found`);
  }

  const resolvedSchema = resolveSchema(schema, spec);
  return generateMockData(resolvedSchema);
}

/**
 * Validate data against schema
 */
function validateAgainstSchema(
  data: unknown,
  schema: Schema,
  path: string
): ValidationResult {
  const errors: ValidationError[] = [];

  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      errors.push({
        field: path,
        message: 'Expected object',
        expected: 'object',
        received: typeof data,
      });
      return { valid: false, errors };
    }

    const dataObj = data as Record<string, unknown>;

    // Check required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in dataObj)) {
          errors.push({
            field: `${path}.${requiredProp}`,
            message: `Missing required property '${requiredProp}'`,
          });
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in dataObj) {
          const result = validateAgainstSchema(
            dataObj[propName],
            propSchema,
            `${path}.${propName}`
          );
          errors.push(...result.errors);
        }
      }
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(data)) {
      errors.push({
        field: path,
        message: 'Expected array',
        expected: 'array',
        received: typeof data,
      });
      return { valid: false, errors };
    }

    if (schema.items) {
      for (let i = 0; i < data.length; i++) {
        const result = validateAgainstSchema(data[i], schema.items, `${path}[${i}]`);
        errors.push(...result.errors);
      }
    }
  } else if (schema.type === 'string') {
    if (typeof data !== 'string') {
      errors.push({
        field: path,
        message: 'Expected string',
        expected: 'string',
        received: typeof data,
      });
    } else {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({
          field: path,
          message: `String too short (min: ${schema.minLength})`,
        });
      }

      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push({
          field: path,
          message: `String too long (max: ${schema.maxLength})`,
        });
      }

      if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
        errors.push({
          field: path,
          message: `String does not match pattern: ${schema.pattern}`,
        });
      }

      if (schema.enum && !schema.enum.includes(data)) {
        errors.push({
          field: path,
          message: `Value must be one of: ${schema.enum.join(', ')}`,
          expected: schema.enum.join(', '),
          received: data,
        });
      }
    }
  } else if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof data !== 'number') {
      errors.push({
        field: path,
        message: `Expected ${schema.type}`,
        expected: schema.type,
        received: typeof data,
      });
    } else {
      if (schema.type === 'integer' && !Number.isInteger(data)) {
        errors.push({
          field: path,
          message: 'Expected integer',
        });
      }

      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({
          field: path,
          message: `Number too small (min: ${schema.minimum})`,
        });
      }

      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({
          field: path,
          message: `Number too large (max: ${schema.maximum})`,
        });
      }
    }
  } else if (schema.type === 'boolean') {
    if (typeof data !== 'boolean') {
      errors.push({
        field: path,
        message: 'Expected boolean',
        expected: 'boolean',
        received: typeof data,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate mock data from schema
 */
function generateMockData(schema: Schema): unknown {
  if (schema.type === 'object') {
    const obj: Record<string, unknown> = {};

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        obj[propName] = generateMockData(propSchema);
      }
    }

    return obj;
  }

  if (schema.type === 'array') {
    if (schema.items) {
      return [generateMockData(schema.items)];
    }
    return [];
  }

  if (schema.type === 'string') {
    if (schema.enum && schema.enum.length > 0) {
      return schema.enum[0];
    }

    if (schema.format === 'uuid') {
      return '550e8400-e29b-41d4-a716-446655440000';
    }

    if (schema.format === 'date-time') {
      return new Date().toISOString();
    }

    if (schema.format === 'email') {
      return 'test@example.com';
    }

    return 'string';
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    return schema.minimum ?? 0;
  }

  if (schema.type === 'boolean') {
    return false;
  }

  return null;
}

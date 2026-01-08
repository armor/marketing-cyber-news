/**
 * OpenAPI Specification Parser
 * Parses YAML OpenAPI specs and extracts endpoint/schema definitions
 *
 * @vitest-environment node
 */

import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, PathItem>;
  components: {
    schemas?: Record<string, Schema>;
    responses?: Record<string, ResponseObject>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

export interface Operation {
  summary?: string;
  description?: string;
  operationId: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, ResponseObject>;
  security?: Array<Record<string, string[]>>;
}

export interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  schema: Schema;
  description?: string;
}

export interface RequestBody {
  required?: boolean;
  content: Record<string, MediaType>;
}

export interface ResponseObject {
  description: string;
  content?: Record<string, MediaType>;
}

export interface MediaType {
  schema: Schema;
  examples?: Record<string, Example>;
  example?: unknown;
}

export interface Example {
  value: unknown;
  summary?: string;
  description?: string;
}

export interface Schema {
  type?: string;
  format?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  enum?: unknown[];
  $ref?: string;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
}

export interface EndpointDefinition {
  path: string;
  method: string;
  operationId: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, ResponseObject>;
}

/**
 * Parse OpenAPI YAML file
 */
export function parseOpenAPISpec(filePath: string): OpenAPISpec {
  const absolutePath = resolve(filePath);
  const fileContent = readFileSync(absolutePath, 'utf8');
  return yaml.load(fileContent) as OpenAPISpec;
}

/**
 * Extract all endpoint definitions from spec
 */
export function extractEndpoints(spec: OpenAPISpec): EndpointDefinition[] {
  const endpoints: EndpointDefinition[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;

    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation) {
        continue;
      }

      endpoints.push({
        path,
        method: method.toUpperCase(),
        operationId: operation.operationId,
        parameters: operation.parameters ?? [],
        requestBody: operation.requestBody,
        responses: operation.responses,
      });
    }
  }

  return endpoints;
}

/**
 * Extract schema definitions from components
 */
export function extractSchemas(spec: OpenAPISpec): Record<string, Schema> {
  return spec.components?.schemas ?? {};
}

/**
 * Extract example responses from operation
 */
export function extractExampleResponses(
  operation: Operation,
  statusCode: string
): unknown[] {
  const response = operation.responses[statusCode];
  if (!response?.content) {
    return [];
  }

  const examples: unknown[] = [];

  for (const mediaType of Object.values(response.content)) {
    if (mediaType.example) {
      examples.push(mediaType.example);
    }

    if (mediaType.examples) {
      for (const example of Object.values(mediaType.examples)) {
        examples.push(example.value);
      }
    }
  }

  return examples;
}

/**
 * Resolve $ref to actual schema
 */
export function resolveRef(ref: string, spec: OpenAPISpec): Schema | null {
  if (!ref.startsWith('#/')) {
    // External refs not supported
    return null;
  }

  const path = ref.substring(2).split('/');
  let current: unknown = spec;

  for (const segment of path) {
    if (typeof current !== 'object' || current === null) {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current as Schema;
}

/**
 * Resolve all $refs in a schema
 */
export function resolveSchema(schema: Schema, spec: OpenAPISpec): Schema {
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, spec);
    if (!resolved) {
      throw new Error(`Failed to resolve $ref: ${schema.$ref}`);
    }
    return resolveSchema(resolved, spec);
  }

  if (schema.properties) {
    const resolvedProperties: Record<string, Schema> = {};
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      resolvedProperties[key] = resolveSchema(propSchema, spec);
    }
    return { ...schema, properties: resolvedProperties };
  }

  if (schema.items) {
    return { ...schema, items: resolveSchema(schema.items, spec) };
  }

  if (schema.allOf) {
    return { ...schema, allOf: schema.allOf.map((s) => resolveSchema(s, spec)) };
  }

  if (schema.oneOf) {
    return { ...schema, oneOf: schema.oneOf.map((s) => resolveSchema(s, spec)) };
  }

  if (schema.anyOf) {
    return { ...schema, anyOf: schema.anyOf.map((s) => resolveSchema(s, spec)) };
  }

  return schema;
}

/**
 * Get endpoint definition by operationId
 */
export function getEndpointByOperationId(
  spec: OpenAPISpec,
  operationId: string
): EndpointDefinition | null {
  const endpoints = extractEndpoints(spec);
  return endpoints.find((e) => e.operationId === operationId) ?? null;
}

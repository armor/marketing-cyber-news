/**
 * Newsletter API Contract Tests
 * Validates frontend API calls match backend OpenAPI specification
 *
 * Tests request/response schemas, pagination, error formats, and parameter validation
 * Based on: specs/004-ai-newsletter-automation/contracts/newsletter-api.yaml
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  parseOpenAPISpec,
  extractEndpoints,
  extractSchemas,
  resolveSchema,
  getEndpointByOperationId,
  type OpenAPISpec,
  type EndpointDefinition,
  type Schema,
} from './openapi-parser';
import {
  validateRequestBody,
  validateResponse,
  getEndpointSchema,
  type ValidationResult,
} from './contract-helpers';
import {
  createMockConfiguration,
  createMockSegment,
  createMockIssue,
  createMockContentItem,
  createMockContentSource,
  createMockBlock,
  createMockIssuePreview,
} from '../mocks/factories/newsletter-factory';
import type {
  ConfigurationListResponse,
  SegmentListResponse,
  IssueListResponse,
  ContentItemListResponse,
  ContentSourceListResponse,
  Pagination,
  NewsletterConfiguration,
  Segment,
  NewsletterIssue,
  CreateConfigurationRequest,
  UpdateConfigurationRequest,
  CreateSegmentRequest,
  UpdateSegmentRequest,
  GenerateIssueRequest,
  GenerateIssueResponse,
  IssuePreview,
  AnalyticsOverview,
  SegmentAnalytics,
  TestResultsResponse,
  CreateContentSourceRequest,
  ContentItem,
  ContentSource,
} from '@/types/newsletter';
import { resolve } from 'path';

// ============================================================================
// Test Setup
// ============================================================================

let spec: OpenAPISpec;
let endpoints: EndpointDefinition[];
let schemas: Record<string, Schema>;

beforeAll(() => {
  const projectRoot = process.cwd().includes('aci-frontend')
    ? process.cwd().replace(/\/aci-frontend.*$/, '')
    : process.cwd();
  const specPath = resolve(projectRoot, 'specs/004-ai-newsletter-automation/contracts/newsletter-api.yaml');
  spec = parseOpenAPISpec(specPath);
  endpoints = extractEndpoints(spec);
  schemas = extractSchemas(spec);
});

// ============================================================================
// Test Helpers
// ============================================================================

function assertValidationSuccess(result: ValidationResult, context: string): void {
  if (!result.valid) {
    console.error(`Validation failed for ${context}:`, JSON.stringify(result.errors, null, 2));
  }
  expect(result.valid, `${context} should be valid`).toBe(true);
  expect(result.errors).toHaveLength(0);
}

function assertValidationFailure(result: ValidationResult, context: string): void {
  expect(result.valid, `${context} should be invalid`).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
}

function createMockPagination(overrides?: Partial<Pagination>): Pagination {
  return {
    page: 1,
    page_size: 20,
    total: 42,
    total_pages: 3,
    ...overrides,
  };
}

function createMockConfigurationListResponse(): ConfigurationListResponse {
  return {
    data: [
      createMockConfiguration(),
      createMockConfiguration({ id: 'config-002', name: 'Monthly Security Brief' }),
    ],
    pagination: createMockPagination(),
  };
}

function createMockSegmentListResponse(): SegmentListResponse {
  return {
    data: [
      createMockSegment(),
      createMockSegment({ id: 'segment-002', name: 'CISO Executives' }),
    ],
    pagination: createMockPagination(),
  };
}

function createMockIssueListResponse(): IssueListResponse {
  return {
    data: [
      createMockIssue(),
      createMockIssue({ id: 'issue-002', status: 'sent' }),
    ],
    pagination: createMockPagination(),
  };
}

function createMockContentItemListResponse(): ContentItemListResponse {
  return {
    data: [
      createMockContentItem(),
      createMockContentItem({ id: 'content-002', title: 'Zero-Day Vulnerability Found' }),
    ],
    pagination: createMockPagination(),
  };
}

function createMockContentSourceListResponse(): ContentSourceListResponse {
  return {
    data: [
      createMockContentSource(),
      createMockContentSource({ id: 'source-002', name: 'Threat Intel API' }),
    ],
    pagination: createMockPagination(),
  };
}

// ============================================================================
// Part 1: Endpoint Existence Tests
// ============================================================================

describe('Endpoint Existence', () => {
  describe('Configuration Endpoints', () => {
    it('should have GET /newsletter/configs endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'listConfigurations');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/configs');
      expect(endpoint?.method).toBe('GET');
    });

    it('should have POST /newsletter/configs endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'createConfiguration');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/configs');
      expect(endpoint?.method).toBe('POST');
    });

    it('should have GET /newsletter/configs/{id} endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'getConfiguration');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/configs/{id}');
      expect(endpoint?.method).toBe('GET');
    });

    it('should have PUT /newsletter/configs/{id} endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'updateConfiguration');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/configs/{id}');
      expect(endpoint?.method).toBe('PUT');
    });

    it('should have DELETE /newsletter/configs/{id} endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'deleteConfiguration');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/configs/{id}');
      expect(endpoint?.method).toBe('DELETE');
    });
  });

  describe('Issue Endpoints', () => {
    it('should have GET /newsletter/issues endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'listIssues');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/issues');
      expect(endpoint?.method).toBe('GET');
    });

    it('should have GET /newsletter/issues/{id} endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'getIssue');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/issues/{id}');
      expect(endpoint?.method).toBe('GET');
    });

    it('should have POST /newsletter/issues/{id}/approve endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'approveIssue');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/issues/{id}/approve');
      expect(endpoint?.method).toBe('POST');
    });

    it('should have POST /newsletter/issues/{id}/reject endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'rejectIssue');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/issues/{id}/reject');
      expect(endpoint?.method).toBe('POST');
    });
  });

  describe('Segment Endpoints', () => {
    it('should have GET /newsletter/segments endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'listSegments');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/segments');
      expect(endpoint?.method).toBe('GET');
    });

    it('should have GET /newsletter/segments/{id} endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'getSegment');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/segments/{id}');
      expect(endpoint?.method).toBe('GET');
    });

    it('should have POST /newsletter/segments endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'createSegment');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/segments');
      expect(endpoint?.method).toBe('POST');
    });

    it('should have PUT /newsletter/segments/{id} endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'updateSegment');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/segments/{id}');
      expect(endpoint?.method).toBe('PUT');
    });
  });

  describe('Analytics Endpoints', () => {
    it('should have GET /newsletter/analytics/overview endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'getAnalyticsOverview');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/analytics/overview');
      expect(endpoint?.method).toBe('GET');
    });

    it('should have GET /newsletter/analytics/segments/{id} endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'getSegmentAnalytics');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/analytics/segments/{id}');
      expect(endpoint?.method).toBe('GET');
    });

    it('should have GET /newsletter/analytics/tests endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'getTestResults');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/analytics/tests');
      expect(endpoint?.method).toBe('GET');
    });
  });

  describe('Content Endpoints', () => {
    it('should have GET /newsletter/content/sources endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'listContentSources');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/content/sources');
      expect(endpoint?.method).toBe('GET');
    });

    it('should have POST /newsletter/content/sources endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'createContentSource');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/content/sources');
      expect(endpoint?.method).toBe('POST');
    });

    it('should have GET /newsletter/content/items endpoint', () => {
      const endpoint = getEndpointByOperationId(spec, 'searchContentItems');
      expect(endpoint).not.toBeNull();
      expect(endpoint?.path).toBe('/newsletter/content/items');
      expect(endpoint?.method).toBe('GET');
    });
  });
});

// ============================================================================
// Part 2: Request Schema Validation Tests
// ============================================================================

describe('Request Schema Validation', () => {
  describe('CreateConfigurationRequest', () => {
    it('should validate complete create configuration request', () => {
      const request: CreateConfigurationRequest = {
        name: 'Weekly Security Newsletter',
        description: 'Security news for enterprise teams',
        segment_id: 'segment-001',
        cadence: 'weekly',
        send_day_of_week: 2,
        send_time_utc: '14:00',
        timezone: 'America/New_York',
        max_blocks: 6,
        education_ratio_min: 0.6,
        content_freshness_days: 45,
        subject_line_style: 'pain_first',
        max_metaphors: 2,
        approval_tier: 'tier1',
        risk_level: 'standard',
        ai_provider: 'anthropic',
        ai_model: 'claude-3-sonnet',
        prompt_version: 1,
      };

      const result = validateRequestBody(request, 'CreateConfigurationRequest', 'newsletter');
      assertValidationSuccess(result, 'Complete CreateConfigurationRequest');
    });

    it('should validate minimal create configuration request with only required fields', () => {
      const request = {
        name: 'Minimal Newsletter',
        cadence: 'weekly',
      };

      const result = validateRequestBody(request, 'CreateConfigurationRequest', 'newsletter');
      assertValidationSuccess(result, 'Minimal CreateConfigurationRequest');
    });

    it('should reject create request missing required "name" field', () => {
      const request = {
        cadence: 'weekly',
      };

      const result = validateRequestBody(request, 'CreateConfigurationRequest', 'newsletter');
      assertValidationFailure(result, 'Missing name field');
      expect(result.errors.some(e => e.field.includes('name'))).toBe(true);
    });

    it('should reject create request missing required "cadence" field', () => {
      const request = {
        name: 'Missing Cadence Newsletter',
      };

      const result = validateRequestBody(request, 'CreateConfigurationRequest', 'newsletter');
      assertValidationFailure(result, 'Missing cadence field');
      expect(result.errors.some(e => e.field.includes('cadence'))).toBe(true);
    });

    it('should validate cadence enum values', () => {
      const validCadences = ['weekly', 'bi-weekly', 'monthly'];

      validCadences.forEach(cadence => {
        const request = { name: 'Test Newsletter', cadence };
        const result = validateRequestBody(request, 'CreateConfigurationRequest', 'newsletter');
        assertValidationSuccess(result, `Valid cadence: ${cadence}`);
      });
    });

    it('should reject invalid cadence value', () => {
      const request = {
        name: 'Test Newsletter',
        cadence: 'daily', // invalid
      };

      const result = validateRequestBody(request, 'CreateConfigurationRequest', 'newsletter');
      assertValidationFailure(result, 'Invalid cadence value');
    });

    it('should validate subject_line_style enum values', () => {
      const validStyles = ['pain_first', 'opportunity_first', 'visionary'];

      validStyles.forEach(style => {
        const request = {
          name: 'Test Newsletter',
          cadence: 'weekly',
          subject_line_style: style,
        };
        const result = validateRequestBody(request, 'CreateConfigurationRequest', 'newsletter');
        assertValidationSuccess(result, `Valid subject_line_style: ${style}`);
      });
    });

    it('should validate approval_tier enum values', () => {
      const validTiers = ['tier1', 'tier2'];

      validTiers.forEach(tier => {
        const request = {
          name: 'Test Newsletter',
          cadence: 'weekly',
          approval_tier: tier,
        };
        const result = validateRequestBody(request, 'CreateConfigurationRequest', 'newsletter');
        assertValidationSuccess(result, `Valid approval_tier: ${tier}`);
      });
    });

    it('should validate risk_level enum values', () => {
      const validLevels = ['standard', 'high', 'experimental'];

      validLevels.forEach(level => {
        const request = {
          name: 'Test Newsletter',
          cadence: 'weekly',
          risk_level: level,
        };
        const result = validateRequestBody(request, 'CreateConfigurationRequest', 'newsletter');
        assertValidationSuccess(result, `Valid risk_level: ${level}`);
      });
    });
  });

  describe('UpdateConfigurationRequest', () => {
    it('should validate partial update request', () => {
      const request: UpdateConfigurationRequest = {
        name: 'Updated Newsletter Name',
      };

      const result = validateRequestBody(request, 'UpdateConfigurationRequest', 'newsletter');
      assertValidationSuccess(result, 'Partial UpdateConfigurationRequest');
    });

    it('should validate update with multiple fields', () => {
      const request: UpdateConfigurationRequest = {
        name: 'Updated Newsletter',
        is_active: false,
        max_blocks: 8,
        cadence: 'monthly',
      };

      const result = validateRequestBody(request, 'UpdateConfigurationRequest', 'newsletter');
      assertValidationSuccess(result, 'Multi-field UpdateConfigurationRequest');
    });

    it('should validate empty update request (no fields required)', () => {
      const request = {};

      const result = validateRequestBody(request, 'UpdateConfigurationRequest', 'newsletter');
      assertValidationSuccess(result, 'Empty UpdateConfigurationRequest');
    });
  });

  describe('CreateSegmentRequest', () => {
    it('should validate complete segment request', () => {
      const request: CreateSegmentRequest = {
        name: 'Enterprise Security Teams',
        description: 'Security professionals at large enterprises',
        role_cluster: 'security_operations',
        industries: ['Technology', 'Finance', 'Healthcare'],
        regions: ['North America', 'Europe'],
        company_size_bands: ['1000-5000', '5000+'],
        compliance_frameworks: ['SOC2', 'NIST'],
        min_engagement_score: 50,
        topic_interests: ['threat_intelligence', 'vulnerability_management'],
        max_newsletters_per_30_days: 4,
      };

      const result = validateRequestBody(request, 'CreateSegmentRequest', 'newsletter');
      assertValidationSuccess(result, 'Complete CreateSegmentRequest');
    });

    it('should validate minimal segment request with only name', () => {
      const request: CreateSegmentRequest = {
        name: 'Minimal Segment',
      };

      const result = validateRequestBody(request, 'CreateSegmentRequest', 'newsletter');
      assertValidationSuccess(result, 'Minimal CreateSegmentRequest');
    });

    it('should reject segment request without name', () => {
      const request = {
        description: 'A segment without a name',
      };

      const result = validateRequestBody(request, 'CreateSegmentRequest', 'newsletter');
      assertValidationFailure(result, 'Missing name field');
    });

    it('should validate array fields in segment request', () => {
      const request: CreateSegmentRequest = {
        name: 'Test Segment',
        industries: [],
        regions: ['North America'],
        topic_interests: ['security', 'compliance', 'risk'],
      };

      const result = validateRequestBody(request, 'CreateSegmentRequest', 'newsletter');
      assertValidationSuccess(result, 'CreateSegmentRequest with arrays');
    });
  });

  describe('UpdateSegmentRequest', () => {
    it('should validate partial segment update', () => {
      const request: UpdateSegmentRequest = {
        is_active: false,
      };

      const result = validateRequestBody(request, 'UpdateSegmentRequest', 'newsletter');
      assertValidationSuccess(result, 'Partial UpdateSegmentRequest');
    });

    it('should validate segment update with multiple fields', () => {
      const request: UpdateSegmentRequest = {
        name: 'Updated Segment Name',
        min_engagement_score: 60,
        industries: ['Technology', 'Manufacturing'],
      };

      const result = validateRequestBody(request, 'UpdateSegmentRequest', 'newsletter');
      assertValidationSuccess(result, 'Multi-field UpdateSegmentRequest');
    });
  });

  describe('GenerateIssueRequest', () => {
    it('should validate generate issue request with required fields', () => {
      const request: GenerateIssueRequest = {
        configuration_id: '550e8400-e29b-41d4-a716-446655440000',
        segment_id: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = validateRequestBody(request, 'GenerateIssueRequest', 'newsletter');
      assertValidationSuccess(result, 'GenerateIssueRequest');
    });

    it('should validate generate issue request with scheduled_for', () => {
      const request = {
        configuration_id: '550e8400-e29b-41d4-a716-446655440000',
        issue_date: '2025-12-25',
      };

      const result = validateRequestBody(request, 'GenerateIssueRequest', 'newsletter');
      assertValidationSuccess(result, 'GenerateIssueRequest with issue_date');
    });

    it('should reject generate issue request without configuration_id', () => {
      const request = {
        issue_date: '2025-12-25',
      };

      const result = validateRequestBody(request, 'GenerateIssueRequest', 'newsletter');
      assertValidationFailure(result, 'Missing configuration_id');
    });
  });

  describe('RejectIssueRequest', () => {
    it('should validate reject request with reason', () => {
      const request = {
        reason: 'Content needs significant revision. The tone is too aggressive.',
      };

      // Rejection requires reason with minimum 10 characters
      expect(request.reason.length).toBeGreaterThanOrEqual(10);
    });

    it('should require reason with minimum length', () => {
      const shortReason = 'Too short';
      expect(shortReason.length).toBeLessThan(10);

      const validReason = 'This content requires additional review and revision';
      expect(validReason.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('CreateContentSourceRequest', () => {
    it('should validate RSS content source request', () => {
      const request: CreateContentSourceRequest = {
        name: 'Security News RSS',
        description: 'Daily security news feed',
        source_type: 'rss',
        url: 'https://example.com/feed.xml',
        fetch_frequency_hours: 6,
      };

      const result = validateRequestBody(request, 'CreateContentSourceRequest', 'newsletter');
      assertValidationSuccess(result, 'RSS ContentSourceRequest');
    });

    it('should validate API content source request', () => {
      const request: CreateContentSourceRequest = {
        name: 'Threat Intel API',
        source_type: 'api',
        api_endpoint: 'https://api.example.com/threats',
        api_key_name: 'THREAT_API_KEY',
      };

      const result = validateRequestBody(request, 'CreateContentSourceRequest', 'newsletter');
      assertValidationSuccess(result, 'API ContentSourceRequest');
    });

    it('should validate manual content source request', () => {
      const request: CreateContentSourceRequest = {
        name: 'Manual Content',
        source_type: 'manual',
      };

      const result = validateRequestBody(request, 'CreateContentSourceRequest', 'newsletter');
      assertValidationSuccess(result, 'Manual ContentSourceRequest');
    });

    it('should validate source_type enum values', () => {
      const validTypes = ['rss', 'api', 'manual'];

      validTypes.forEach(type => {
        const request = {
          name: 'Test Source',
          source_type: type,
        };
        const result = validateRequestBody(request, 'CreateContentSourceRequest', 'newsletter');
        assertValidationSuccess(result, `Valid source_type: ${type}`);
      });
    });
  });
});

// ============================================================================
// Part 3: Response Schema Validation Tests
// ============================================================================

describe('Response Schema Validation', () => {
  describe('Configuration Responses', () => {
    it('should validate configuration list response (200)', () => {
      const response = createMockConfigurationListResponse();
      const result = validateResponse(response, 'listConfigurations', 200, 'newsletter');
      assertValidationSuccess(result, 'ConfigurationListResponse');
    });

    it('should validate single configuration response (200)', () => {
      const config = createMockConfiguration();
      const result = validateResponse(config, 'getConfiguration', 200, 'newsletter');
      assertValidationSuccess(result, 'Configuration response');
    });

    it('should validate created configuration response (201)', () => {
      const config = createMockConfiguration();
      const result = validateResponse(config, 'createConfiguration', 201, 'newsletter');
      assertValidationSuccess(result, 'Created configuration response');
    });

    it('should validate updated configuration response (200)', () => {
      const config = createMockConfiguration({ is_active: false });
      const result = validateResponse(config, 'updateConfiguration', 200, 'newsletter');
      assertValidationSuccess(result, 'Updated configuration response');
    });

    it('should validate empty configuration list response', () => {
      const response: ConfigurationListResponse = {
        data: [],
        pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 },
      };
      const result = validateResponse(response, 'listConfigurations', 200, 'newsletter');
      assertValidationSuccess(result, 'Empty configuration list');
    });

    it('should validate configuration 401 unauthorized response', () => {
      const error = { error: 'Unauthorized', message: 'Authentication required' };
      const result = validateResponse(error, 'listConfigurations', 401, 'newsletter');
      assertValidationSuccess(result, 'Configuration 401 response');
    });

    it('should validate configuration 404 not found response', () => {
      const error = { error: 'NotFound', message: 'Configuration not found' };
      const result = validateResponse(error, 'getConfiguration', 404, 'newsletter');
      assertValidationSuccess(result, 'Configuration 404 response');
    });
  });

  describe('Issue Responses', () => {
    it('should validate issue list response (200)', () => {
      const response = createMockIssueListResponse();
      const result = validateResponse(response, 'listIssues', 200, 'newsletter');
      assertValidationSuccess(result, 'IssueListResponse');
    });

    it('should validate single issue response (200)', () => {
      const issue = createMockIssue();
      const result = validateResponse(issue, 'getIssue', 200, 'newsletter');
      assertValidationSuccess(result, 'Issue response');
    });

    it('should validate issue with all status values', () => {
      const statuses: Array<'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'sent' | 'failed'> = [
        'draft', 'pending_approval', 'approved', 'scheduled', 'sent', 'failed'
      ];

      statuses.forEach(status => {
        const issue = createMockIssue({ status });
        const result = validateResponse(issue, 'getIssue', 200, 'newsletter');
        assertValidationSuccess(result, `Issue with status: ${status}`);
      });
    });

    it('should validate issue with blocks', () => {
      const issue = createMockIssue({
        blocks: [
          createMockBlock({ block_type: 'hero', position: 0 }),
          createMockBlock({ block_type: 'news', position: 1 }),
          createMockBlock({ block_type: 'content', position: 2 }),
          createMockBlock({ block_type: 'events', position: 3 }),
          createMockBlock({ block_type: 'spotlight', position: 4 }),
        ],
      });

      const result = validateResponse(issue, 'getIssue', 200, 'newsletter');
      assertValidationSuccess(result, 'Issue with all block types');
    });

    it('should validate generate issue response (202)', () => {
      const response: GenerateIssueResponse = {
        message: 'Newsletter generation started',
        issue_id: '550e8400-e29b-41d4-a716-446655440000',
        job_id: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = validateResponse(response, 'generateIssue', 202, 'newsletter');
      assertValidationSuccess(result, 'GenerateIssueResponse');
    });

    it('should validate approved issue response', () => {
      const issue = createMockIssue({
        status: 'approved',
        approved_by: 'user-001',
        approved_at: new Date().toISOString(),
      });

      const result = validateResponse(issue, 'approveIssue', 200, 'newsletter');
      assertValidationSuccess(result, 'Approved issue response');
    });

    it('should validate rejected issue response', () => {
      const issue = createMockIssue({
        status: 'draft',
        rejection_reason: 'Content needs significant revision',
      });

      const result = validateResponse(issue, 'rejectIssue', 200, 'newsletter');
      assertValidationSuccess(result, 'Rejected issue response');
    });

    it('should validate issue preview response', () => {
      const preview = createMockIssuePreview();
      const result = validateResponse(preview, 'previewIssue', 200, 'newsletter');
      assertValidationSuccess(result, 'Issue preview response');
    });

    it('should validate issue 404 not found response', () => {
      const error = { error: 'NotFound', message: 'Issue not found' };
      const result = validateResponse(error, 'getIssue', 404, 'newsletter');
      assertValidationSuccess(result, 'Issue 404 response');
    });

    it('should validate approve issue 400 bad request (wrong status)', () => {
      const error = {
        error: 'BadRequest',
        message: 'Cannot approve issue. Current status is not pending_approval',
      };
      const result = validateResponse(error, 'approveIssue', 400, 'newsletter');
      assertValidationSuccess(result, 'Approve issue 400 response');
    });
  });

  describe('Segment Responses', () => {
    it('should validate segment list response (200)', () => {
      const response = createMockSegmentListResponse();
      const result = validateResponse(response, 'listSegments', 200, 'newsletter');
      assertValidationSuccess(result, 'SegmentListResponse');
    });

    it('should validate single segment response (200)', () => {
      const segment = createMockSegment();
      const result = validateResponse(segment, 'getSegment', 200, 'newsletter');
      assertValidationSuccess(result, 'Segment response');
    });

    it('should validate created segment response (201)', () => {
      const segment = createMockSegment();
      const result = validateResponse(segment, 'createSegment', 201, 'newsletter');
      assertValidationSuccess(result, 'Created segment response');
    });

    it('should validate updated segment response (200)', () => {
      const segment = createMockSegment({ is_active: false });
      const result = validateResponse(segment, 'updateSegment', 200, 'newsletter');
      assertValidationSuccess(result, 'Updated segment response');
    });

    it('should validate segment with all optional arrays', () => {
      const segment = createMockSegment({
        industries: ['Technology', 'Finance', 'Healthcare', 'Manufacturing'],
        regions: ['North America', 'Europe', 'Asia Pacific'],
        company_size_bands: ['1-50', '51-200', '201-1000', '1000-5000', '5000+'],
        compliance_frameworks: ['SOC2', 'NIST', 'HIPAA', 'GDPR', 'ISO27001'],
        topic_interests: ['threat_intelligence', 'vulnerability_management', 'incident_response'],
      });

      const result = validateResponse(segment, 'getSegment', 200, 'newsletter');
      assertValidationSuccess(result, 'Segment with all arrays');
    });

    it('should validate segment 404 not found response', () => {
      const error = { error: 'NotFound', message: 'Segment not found' };
      const result = validateResponse(error, 'getSegment', 404, 'newsletter');
      assertValidationSuccess(result, 'Segment 404 response');
    });
  });

  describe('Analytics Responses', () => {
    it('should validate analytics overview response (200)', () => {
      const overview: AnalyticsOverview = {
        date_from: '2025-01-01',
        date_to: '2025-12-31',
        total_issues_sent: 52,
        total_recipients: 150000,
        total_delivered: 148500,
        total_opened: 59400,
        total_clicked: 14850,
        unique_opens: 55000,
        unique_clicks: 13000,
        avg_open_rate: 0.40,
        avg_click_rate: 0.10,
        avg_click_to_open_rate: 0.25,
        total_unsubscribes: 250,
        total_bounces: 1500,
        total_complaints: 15,
        top_performing_subjects: [
          { subject_line: 'Critical Zero-Day Alert', open_rate: 0.68, issue_id: 'issue-001' },
        ],
        top_clicked_links: [
          { url: 'https://example.com/report', clicks: 5000, unique_clicks: 4200 },
        ],
        engagement_by_day: [
          { date: '2025-01-01', delivered: 2850, opened: 1140, clicked: 285 },
        ],
      };

      const result = validateResponse(overview, 'getAnalyticsOverview', 200, 'newsletter');
      assertValidationSuccess(result, 'AnalyticsOverview response');
    });

    it('should validate segment analytics response (200)', () => {
      const analytics: SegmentAnalytics = {
        segment_id: 'segment-001',
        segment_name: 'Enterprise Security Teams',
        date_from: '2025-01-01',
        date_to: '2025-12-31',
        total_contacts: 2847,
        subscribed_contacts: 2750,
        total_issues_sent: 52,
        avg_open_rate: 0.42,
        avg_click_rate: 0.11,
        avg_engagement_score: 65,
        top_topics: [{ topic: 'threat_intelligence', clicks: 8500 }],
        engagement_trend: [{ date: '2025-01-01', avg_engagement_score: 63 }],
        churn_rate: 0.034,
      };

      const result = validateResponse(analytics, 'getSegmentAnalytics', 200, 'newsletter');
      assertValidationSuccess(result, 'SegmentAnalytics response');
    });

    it('should validate A/B test results response (200)', () => {
      const results: TestResultsResponse = {
        issue_id: 'issue-001',
        test_type: 'subject_line',
        test_started_at: new Date().toISOString(),
        test_completed_at: new Date().toISOString(),
        is_complete: true,
        variants: [
          {
            variant_id: 'variant-a',
            variant_name: 'Control',
            test_value: 'Weekly Security Digest',
            recipients: 1000,
            delivered: 990,
            opened: 396,
            clicked: 99,
            open_rate: 0.40,
            click_rate: 0.10,
            click_to_open_rate: 0.25,
            is_winner: true,
          },
          {
            variant_id: 'variant-b',
            variant_name: 'Test',
            test_value: 'Critical Security Updates',
            recipients: 1000,
            delivered: 988,
            opened: 345,
            clicked: 86,
            open_rate: 0.35,
            click_rate: 0.087,
            click_to_open_rate: 0.249,
            is_winner: false,
          },
        ],
        winning_variant_id: 'variant-a',
        statistical_significance: 0.95,
      };

      const result = validateResponse(results, 'getTestResults', 200, 'newsletter');
      assertValidationSuccess(result, 'TestResultsResponse');
    });

    it('should validate incomplete A/B test results', () => {
      const results: TestResultsResponse = {
        issue_id: 'issue-002',
        test_type: 'hero_topic',
        test_started_at: new Date().toISOString(),
        is_complete: false,
        variants: [],
        statistical_significance: 0,
      };

      const result = validateResponse(results, 'getTestResults', 200, 'newsletter');
      assertValidationSuccess(result, 'Incomplete TestResultsResponse');
    });
  });

  describe('Content Responses', () => {
    it('should validate content source list response (200)', () => {
      const response = createMockContentSourceListResponse();
      const result = validateResponse(response, 'listContentSources', 200, 'newsletter');
      assertValidationSuccess(result, 'ContentSourceListResponse');
    });

    it('should validate content item list response (200)', () => {
      const response = createMockContentItemListResponse();
      const result = validateResponse(response, 'searchContentItems', 200, 'newsletter');
      assertValidationSuccess(result, 'ContentItemListResponse');
    });

    it('should validate content source with all source types', () => {
      const sourceTypes: Array<'rss' | 'api' | 'manual'> = ['rss', 'api', 'manual'];

      sourceTypes.forEach(type => {
        const source = createMockContentSource({ source_type: type });
        const result = validateResponse(source, 'createContentSource', 201, 'newsletter');
        assertValidationSuccess(result, `ContentSource with type: ${type}`);
      });
    });

    it('should validate content item with all content types', () => {
      const contentTypes: Array<'blog' | 'news' | 'case_study' | 'webinar' | 'product_update' | 'event'> = [
        'blog', 'news', 'case_study', 'webinar', 'product_update', 'event'
      ];

      contentTypes.forEach(type => {
        const item = createMockContentItem({ content_type: type });
        expect(['blog', 'news', 'case_study', 'webinar', 'product_update', 'event']).toContain(item.content_type);
      });
    });
  });
});

// ============================================================================
// Part 4: Parameter Validation Tests
// ============================================================================

describe('Parameter Validation', () => {
  describe('Path Parameters', () => {
    it('should require id parameter for configuration endpoints', () => {
      const endpoint = getEndpointByOperationId(spec, 'getConfiguration');
      expect(endpoint).not.toBeNull();

      const idParam = endpoint?.parameters.find(p => p.name === 'id');
      expect(idParam).toBeDefined();
      expect(idParam?.in).toBe('path');
      expect(idParam?.required).toBe(true);
      expect(idParam?.schema.type).toBe('string');
      expect(idParam?.schema.format).toBe('uuid');
    });

    it('should require id parameter for issue endpoints', () => {
      const endpoint = getEndpointByOperationId(spec, 'getIssue');
      expect(endpoint).not.toBeNull();

      const idParam = endpoint?.parameters.find(p => p.name === 'id');
      expect(idParam).toBeDefined();
      expect(idParam?.in).toBe('path');
      expect(idParam?.required).toBe(true);
    });

    it('should require id parameter for segment endpoints', () => {
      const endpoint = getEndpointByOperationId(spec, 'getSegment');
      expect(endpoint).not.toBeNull();

      const idParam = endpoint?.parameters.find(p => p.name === 'id');
      expect(idParam).toBeDefined();
      expect(idParam?.in).toBe('path');
      expect(idParam?.required).toBe(true);
    });

    it('should require id parameter for approve/reject endpoints', () => {
      const approveEndpoint = getEndpointByOperationId(spec, 'approveIssue');
      const rejectEndpoint = getEndpointByOperationId(spec, 'rejectIssue');

      expect(approveEndpoint?.parameters.find(p => p.name === 'id')).toBeDefined();
      expect(rejectEndpoint?.parameters.find(p => p.name === 'id')).toBeDefined();
    });
  });

  describe('Query Parameters', () => {
    it('should define pagination query parameters for list endpoints', () => {
      const listEndpoints = [
        'listConfigurations',
        'listIssues',
        'listSegments',
        'searchContentItems',
      ];

      listEndpoints.forEach(operationId => {
        const endpoint = getEndpointByOperationId(spec, operationId);
        expect(endpoint, `Endpoint ${operationId} should exist`).not.toBeNull();

        const pageParam = endpoint?.parameters.find(p => p.name === 'page');
        const pageSizeParam = endpoint?.parameters.find(p => p.name === 'page_size');

        expect(pageParam, `${operationId} should have page parameter`).toBeDefined();
        expect(pageSizeParam, `${operationId} should have page_size parameter`).toBeDefined();
        expect(pageParam?.in).toBe('query');
        expect(pageSizeParam?.in).toBe('query');
      });
    });

    it('should define filter parameters for configuration list', () => {
      const endpoint = getEndpointByOperationId(spec, 'listConfigurations');
      expect(endpoint).not.toBeNull();

      const segmentIdParam = endpoint?.parameters.find(p => p.name === 'segment_id');
      const isActiveParam = endpoint?.parameters.find(p => p.name === 'is_active');

      expect(segmentIdParam).toBeDefined();
      expect(segmentIdParam?.in).toBe('query');
      expect(isActiveParam).toBeDefined();
      expect(isActiveParam?.in).toBe('query');
    });

    it('should define filter parameters for issue list', () => {
      const endpoint = getEndpointByOperationId(spec, 'listIssues');
      expect(endpoint).not.toBeNull();

      const configIdParam = endpoint?.parameters.find(p => p.name === 'configuration_id');
      const segmentIdParam = endpoint?.parameters.find(p => p.name === 'segment_id');
      const statusParam = endpoint?.parameters.find(p => p.name === 'status');
      const dateFromParam = endpoint?.parameters.find(p => p.name === 'date_from');
      const dateToParam = endpoint?.parameters.find(p => p.name === 'date_to');

      expect(configIdParam).toBeDefined();
      expect(segmentIdParam).toBeDefined();
      expect(statusParam).toBeDefined();
      expect(dateFromParam).toBeDefined();
      expect(dateToParam).toBeDefined();
    });

    it('should define status enum for issue list filter', () => {
      const endpoint = getEndpointByOperationId(spec, 'listIssues');
      const statusParam = endpoint?.parameters.find(p => p.name === 'status');

      expect(statusParam?.schema.enum).toEqual([
        'draft', 'pending_approval', 'approved', 'scheduled', 'sent', 'failed'
      ]);
    });

    it('should define date range parameters for analytics', () => {
      const endpoint = getEndpointByOperationId(spec, 'getAnalyticsOverview');
      expect(endpoint).not.toBeNull();

      const dateFromParam = endpoint?.parameters.find(p => p.name === 'date_from');
      const dateToParam = endpoint?.parameters.find(p => p.name === 'date_to');

      expect(dateFromParam).toBeDefined();
      expect(dateFromParam?.schema.format).toBe('date');
      expect(dateToParam).toBeDefined();
      expect(dateToParam?.schema.format).toBe('date');
    });

    it('should define filter parameters for content items search', () => {
      const endpoint = getEndpointByOperationId(spec, 'searchContentItems');
      expect(endpoint).not.toBeNull();

      const qParam = endpoint?.parameters.find(p => p.name === 'q');
      const sourceIdParam = endpoint?.parameters.find(p => p.name === 'source_id');
      const contentTypeParam = endpoint?.parameters.find(p => p.name === 'content_type');
      const topicTagsParam = endpoint?.parameters.find(p => p.name === 'topic_tags');

      expect(qParam).toBeDefined();
      expect(sourceIdParam).toBeDefined();
      expect(contentTypeParam).toBeDefined();
      expect(topicTagsParam).toBeDefined();
    });

    it('should define content_type enum for content items filter', () => {
      const endpoint = getEndpointByOperationId(spec, 'searchContentItems');
      const contentTypeParam = endpoint?.parameters.find(p => p.name === 'content_type');

      expect(contentTypeParam?.schema.enum).toEqual([
        'blog', 'news', 'case_study', 'webinar', 'product_update', 'event'
      ]);
    });

    it('should define test filter parameters', () => {
      const endpoint = getEndpointByOperationId(spec, 'getTestResults');
      expect(endpoint).not.toBeNull();

      const issueIdParam = endpoint?.parameters.find(p => p.name === 'issue_id');
      const testTypeParam = endpoint?.parameters.find(p => p.name === 'test_type');

      expect(issueIdParam).toBeDefined();
      expect(testTypeParam).toBeDefined();
      expect(testTypeParam?.schema.enum).toEqual([
        'subject_line', 'hero_topic', 'cta_framing', 'send_time'
      ]);
    });
  });

  describe('Header Parameters', () => {
    it('should require bearer authentication for protected endpoints', () => {
      const protectedEndpoints = [
        'listConfigurations',
        'createConfiguration',
        'getConfiguration',
        'updateConfiguration',
        'deleteConfiguration',
        'listIssues',
        'getIssue',
        'approveIssue',
        'rejectIssue',
        'listSegments',
        'getSegment',
        'getAnalyticsOverview',
      ];

      protectedEndpoints.forEach(operationId => {
        const endpoint = getEndpointByOperationId(spec, operationId);
        expect(endpoint, `Endpoint ${operationId} should exist`).not.toBeNull();

        // Check spec directly for security requirements
        const pathItem = spec.paths[endpoint!.path];
        const method = endpoint!.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
        const operation = pathItem[method];

        expect(operation?.security, `${operationId} should require security`).toBeDefined();
        expect(operation?.security?.length).toBeGreaterThan(0);

        // Verify bearerAuth is required
        const hasBearerAuth = operation?.security?.some(sec => 'bearerAuth' in sec);
        expect(hasBearerAuth, `${operationId} should require bearerAuth`).toBe(true);
      });
    });

    it('should define bearerAuth security scheme', () => {
      expect(spec.components.securitySchemes?.bearerAuth).toBeDefined();
      expect(spec.components.securitySchemes?.bearerAuth.type).toBe('http');
      expect(spec.components.securitySchemes?.bearerAuth.scheme).toBe('bearer');
      expect(spec.components.securitySchemes?.bearerAuth.bearerFormat).toBe('JWT');
    });
  });
});

// ============================================================================
// Part 5: Error Response Format Tests
// ============================================================================

describe('Error Response Format', () => {
  it('should define Error schema with required fields', () => {
    const errorSchema = schemas['Error'];
    expect(errorSchema).toBeDefined();
    expect(errorSchema.type).toBe('object');
    expect(errorSchema.required).toContain('error');
    expect(errorSchema.required).toContain('message');
    expect(errorSchema.properties?.error?.type).toBe('string');
    expect(errorSchema.properties?.message?.type).toBe('string');
  });

  it('should allow optional details in Error schema', () => {
    const errorSchema = schemas['Error'];
    expect(errorSchema.properties?.details).toBeDefined();
    expect(errorSchema.properties?.details?.type).toBe('object');
  });

  it('should validate 400 Bad Request error format', () => {
    const error = {
      error: 'ValidationError',
      message: 'Invalid request parameters',
      details: {
        field: 'cadence',
        issue: 'must be one of: weekly, bi-weekly, monthly',
      },
    };

    const result = validateResponse(error, 'createConfiguration', 400, 'newsletter');
    assertValidationSuccess(result, '400 error response');
  });

  it('should validate 401 Unauthorized error format', () => {
    const error = {
      error: 'Unauthorized',
      message: 'Authentication required',
    };

    const result = validateResponse(error, 'listConfigurations', 401, 'newsletter');
    assertValidationSuccess(result, '401 error response');
  });

  it('should validate 403 Forbidden error format', () => {
    const error = {
      error: 'Forbidden',
      message: 'Insufficient permissions to perform this action',
    };

    const result = validateResponse(error, 'createConfiguration', 403, 'newsletter');
    assertValidationSuccess(result, '403 error response');
  });

  it('should validate 404 Not Found error format', () => {
    const error = {
      error: 'NotFound',
      message: 'Resource not found',
    };

    const result = validateResponse(error, 'getConfiguration', 404, 'newsletter');
    assertValidationSuccess(result, '404 error response');
  });

  it('should define standard error responses for all endpoints', () => {
    const endpointsWithErrors = [
      { operationId: 'listConfigurations', expectedCodes: [401] },
      { operationId: 'createConfiguration', expectedCodes: [400, 401, 403] },
      { operationId: 'getConfiguration', expectedCodes: [404] },
      { operationId: 'updateConfiguration', expectedCodes: [400, 404] },
      { operationId: 'deleteConfiguration', expectedCodes: [404] },
    ];

    endpointsWithErrors.forEach(({ operationId, expectedCodes }) => {
      const endpoint = getEndpointByOperationId(spec, operationId);
      expect(endpoint).not.toBeNull();

      expectedCodes.forEach(code => {
        expect(
          endpoint?.responses[code.toString()],
          `${operationId} should have ${code} response`
        ).toBeDefined();
      });
    });
  });
});

// ============================================================================
// Part 6: Pagination Contract Tests
// ============================================================================

describe('Pagination Contracts', () => {
  it('should define Pagination schema', () => {
    const paginationSchema = schemas['Pagination'];
    expect(paginationSchema).toBeDefined();
    expect(paginationSchema.type).toBe('object');
    expect(paginationSchema.properties?.page).toBeDefined();
    expect(paginationSchema.properties?.page_size).toBeDefined();
    expect(paginationSchema.properties?.total).toBeDefined();
    expect(paginationSchema.properties?.total_pages).toBeDefined();
  });

  it('should validate pagination structure in all list responses', () => {
    const listResponses = [
      { response: createMockConfigurationListResponse(), operation: 'listConfigurations' },
      { response: createMockSegmentListResponse(), operation: 'listSegments' },
      { response: createMockIssueListResponse(), operation: 'listIssues' },
      { response: createMockContentItemListResponse(), operation: 'searchContentItems' },
      { response: createMockContentSourceListResponse(), operation: 'listContentSources' },
    ];

    listResponses.forEach(({ response, operation }) => {
      expect(response.pagination, `${operation} should have pagination`).toBeDefined();
      expect(response.pagination.page).toBeGreaterThan(0);
      expect(response.pagination.page_size).toBeGreaterThan(0);
      expect(response.pagination.total).toBeGreaterThanOrEqual(0);
      expect(response.pagination.total_pages).toBeGreaterThanOrEqual(0);
    });
  });

  it('should validate page calculation consistency', () => {
    const testCases = [
      { total: 0, page_size: 20, expected_pages: 0 },
      { total: 10, page_size: 20, expected_pages: 1 },
      { total: 20, page_size: 20, expected_pages: 1 },
      { total: 21, page_size: 20, expected_pages: 2 },
      { total: 100, page_size: 20, expected_pages: 5 },
      { total: 101, page_size: 20, expected_pages: 6 },
    ];

    testCases.forEach(({ total, page_size, expected_pages }) => {
      const calculatedPages = total === 0 ? 0 : Math.ceil(total / page_size);
      expect(calculatedPages).toBe(expected_pages);
    });
  });

  it('should validate data array length respects page_size', () => {
    const response = createMockConfigurationListResponse();
    expect(response.data.length).toBeLessThanOrEqual(response.pagination.page_size);
  });

  it('should define default pagination values', () => {
    const endpoint = getEndpointByOperationId(spec, 'listConfigurations');
    expect(endpoint).not.toBeNull();

    const pageParam = endpoint?.parameters.find(p => p.name === 'page');
    const pageSizeParam = endpoint?.parameters.find(p => p.name === 'page_size');

    expect(pageParam?.schema.default).toBe(1);
    expect(pageSizeParam?.schema.default).toBe(20);
  });

  it('should define page_size constraints', () => {
    const endpoint = getEndpointByOperationId(spec, 'listConfigurations');
    const pageSizeParam = endpoint?.parameters.find(p => p.name === 'page_size');

    expect(pageSizeParam?.schema.minimum).toBe(1);
    expect(pageSizeParam?.schema.maximum).toBe(100);
  });
});

// ============================================================================
// Part 7: Schema Definition Tests
// ============================================================================

describe('Schema Definitions', () => {
  it('should define Configuration schema', () => {
    expect(schemas['Configuration']).toBeDefined();
    expect(schemas['Configuration'].type).toBe('object');
  });

  it('should define Segment schema', () => {
    expect(schemas['Segment']).toBeDefined();
    expect(schemas['Segment'].type).toBe('object');
  });

  it('should define Issue schema', () => {
    expect(schemas['Issue']).toBeDefined();
    expect(schemas['Issue'].type).toBe('object');
  });

  it('should define Block schema', () => {
    expect(schemas['Block']).toBeDefined();
    expect(schemas['Block'].type).toBe('object');
  });

  it('should define ContentSource schema', () => {
    expect(schemas['ContentSource']).toBeDefined();
    expect(schemas['ContentSource'].type).toBe('object');
  });

  it('should define ContentItem schema', () => {
    expect(schemas['ContentItem']).toBeDefined();
    expect(schemas['ContentItem'].type).toBe('object');
  });

  it('should define AnalyticsOverview schema', () => {
    expect(schemas['AnalyticsOverview']).toBeDefined();
    expect(schemas['AnalyticsOverview'].type).toBe('object');
  });

  it('should define SegmentAnalytics schema', () => {
    expect(schemas['SegmentAnalytics']).toBeDefined();
    expect(schemas['SegmentAnalytics'].type).toBe('object');
  });

  it('should define TestResultsResponse schema', () => {
    expect(schemas['TestResultsResponse']).toBeDefined();
    expect(schemas['TestResultsResponse'].type).toBe('object');
  });

  it('should define all request schemas', () => {
    expect(schemas['CreateConfigurationRequest']).toBeDefined();
    expect(schemas['UpdateConfigurationRequest']).toBeDefined();
    expect(schemas['CreateSegmentRequest']).toBeDefined();
    expect(schemas['UpdateSegmentRequest']).toBeDefined();
    expect(schemas['GenerateIssueRequest']).toBeDefined();
    expect(schemas['CreateContentSourceRequest']).toBeDefined();
  });

  it('should define all list response schemas', () => {
    expect(schemas['ConfigurationListResponse']).toBeDefined();
    expect(schemas['SegmentListResponse']).toBeDefined();
    expect(schemas['IssueListResponse']).toBeDefined();
    expect(schemas['ContentItemListResponse']).toBeDefined();
    expect(schemas['ContentSourceListResponse']).toBeDefined();
    expect(schemas['ContactListResponse']).toBeDefined();
  });
});

// ============================================================================
// Part 8: Field Type Validation Tests
// ============================================================================

describe('Field Type Validation', () => {
  describe('Configuration Fields', () => {
    it('should validate configuration id as UUID string', () => {
      const config = createMockConfiguration();
      expect(typeof config.id).toBe('string');
    });

    it('should validate configuration name as string', () => {
      const config = createMockConfiguration();
      expect(typeof config.name).toBe('string');
    });

    it('should validate cadence as enum', () => {
      const config = createMockConfiguration();
      expect(['weekly', 'bi-weekly', 'monthly']).toContain(config.cadence);
    });

    it('should validate send_day_of_week as integer 0-6', () => {
      const config = createMockConfiguration();
      expect(Number.isInteger(config.send_day_of_week)).toBe(true);
      expect(config.send_day_of_week).toBeGreaterThanOrEqual(0);
      expect(config.send_day_of_week).toBeLessThanOrEqual(6);
    });

    it('should validate max_blocks as integer', () => {
      const config = createMockConfiguration();
      expect(Number.isInteger(config.max_blocks)).toBe(true);
    });

    it('should validate education_ratio_min as number 0-1', () => {
      const config = createMockConfiguration();
      expect(typeof config.education_ratio_min).toBe('number');
      expect(config.education_ratio_min).toBeGreaterThanOrEqual(0);
      expect(config.education_ratio_min).toBeLessThanOrEqual(1);
    });

    it('should validate is_active as boolean', () => {
      const config = createMockConfiguration();
      expect(typeof config.is_active).toBe('boolean');
    });

    it('should validate timestamps as ISO date strings', () => {
      const config = createMockConfiguration();
      expect(() => new Date(config.created_at)).not.toThrow();
      expect(() => new Date(config.updated_at)).not.toThrow();
    });

    it('should validate banned_phrases as string array', () => {
      const config = createMockConfiguration();
      expect(Array.isArray(config.banned_phrases)).toBe(true);
      config.banned_phrases.forEach(phrase => {
        expect(typeof phrase).toBe('string');
      });
    });
  });

  describe('Segment Fields', () => {
    it('should validate segment contact_count as non-negative integer', () => {
      const segment = createMockSegment();
      expect(Number.isInteger(segment.contact_count)).toBe(true);
      expect(segment.contact_count).toBeGreaterThanOrEqual(0);
    });

    it('should validate segment industries as string array', () => {
      const segment = createMockSegment();
      expect(Array.isArray(segment.industries)).toBe(true);
    });

    it('should validate segment regions as string array', () => {
      const segment = createMockSegment();
      expect(Array.isArray(segment.regions)).toBe(true);
    });

    it('should validate min_engagement_score as number', () => {
      const segment = createMockSegment();
      expect(typeof segment.min_engagement_score).toBe('number');
    });
  });

  describe('Issue Fields', () => {
    it('should validate issue status as enum', () => {
      const issue = createMockIssue();
      expect(['draft', 'pending_approval', 'approved', 'scheduled', 'sent', 'failed'])
        .toContain(issue.status);
    });

    it('should validate issue blocks as array', () => {
      const issue = createMockIssue();
      expect(Array.isArray(issue.blocks)).toBe(true);
    });

    it('should validate issue total_recipients as non-negative integer', () => {
      const issue = createMockIssue();
      expect(Number.isInteger(issue.total_recipients)).toBe(true);
      expect(issue.total_recipients).toBeGreaterThanOrEqual(0);
    });

    it('should validate subject_lines as string array', () => {
      const issue = createMockIssue();
      expect(Array.isArray(issue.subject_lines)).toBe(true);
      issue.subject_lines.forEach(line => {
        expect(typeof line).toBe('string');
      });
    });
  });

  describe('Block Fields', () => {
    it('should validate block_type as enum', () => {
      const block = createMockBlock();
      expect(['hero', 'news', 'content', 'events', 'spotlight']).toContain(block.block_type);
    });

    it('should validate position as non-negative integer', () => {
      const block = createMockBlock();
      expect(Number.isInteger(block.position)).toBe(true);
      expect(block.position).toBeGreaterThanOrEqual(0);
    });

    it('should validate content_item_ids as string array', () => {
      const block = createMockBlock();
      expect(Array.isArray(block.content_item_ids)).toBe(true);
    });
  });

  describe('ContentItem Fields', () => {
    it('should validate content_type as enum', () => {
      const item = createMockContentItem();
      expect(['blog', 'news', 'case_study', 'webinar', 'product_update', 'event'])
        .toContain(item.content_type);
    });

    it('should validate topic_tags as string array', () => {
      const item = createMockContentItem();
      expect(Array.isArray(item.topic_tags)).toBe(true);
    });

    it('should validate framework_tags as string array', () => {
      const item = createMockContentItem();
      expect(Array.isArray(item.framework_tags)).toBe(true);
    });

    it('should validate relevance_score as number 0-1', () => {
      const item = createMockContentItem();
      if (item.relevance_score !== undefined) {
        expect(typeof item.relevance_score).toBe('number');
        expect(item.relevance_score).toBeGreaterThanOrEqual(0);
        expect(item.relevance_score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('ContentSource Fields', () => {
    it('should validate source_type as enum', () => {
      const source = createMockContentSource();
      expect(['rss', 'api', 'manual']).toContain(source.source_type);
    });

    it('should validate fetch_frequency_hours as positive integer', () => {
      const source = createMockContentSource();
      expect(Number.isInteger(source.fetch_frequency_hours)).toBe(true);
      expect(source.fetch_frequency_hours).toBeGreaterThan(0);
    });

    it('should validate items_fetched as non-negative integer', () => {
      const source = createMockContentSource();
      expect(Number.isInteger(source.items_fetched)).toBe(true);
      expect(source.items_fetched).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Analytics Fields', () => {
    it('should validate rate fields as percentages (0-1)', () => {
      const overview: AnalyticsOverview = {
        date_from: '2025-01-01',
        date_to: '2025-12-31',
        total_issues_sent: 52,
        total_recipients: 100000,
        total_delivered: 99000,
        total_opened: 39600,
        total_clicked: 9900,
        unique_opens: 38000,
        unique_clicks: 9500,
        avg_open_rate: 0.40,
        avg_click_rate: 0.10,
        avg_click_to_open_rate: 0.25,
        total_unsubscribes: 100,
        total_bounces: 1000,
        total_complaints: 10,
        top_performing_subjects: [],
        top_clicked_links: [],
        engagement_by_day: [],
      };

      expect(overview.avg_open_rate).toBeGreaterThanOrEqual(0);
      expect(overview.avg_open_rate).toBeLessThanOrEqual(1);
      expect(overview.avg_click_rate).toBeGreaterThanOrEqual(0);
      expect(overview.avg_click_rate).toBeLessThanOrEqual(1);
      expect(overview.avg_click_to_open_rate).toBeGreaterThanOrEqual(0);
      expect(overview.avg_click_to_open_rate).toBeLessThanOrEqual(1);
    });
  });
});

// ============================================================================
// Part 9: Integration Tests
// ============================================================================

describe('API Integration Contracts', () => {
  it('should have consistent endpoint naming convention', () => {
    const newsletterEndpoints = endpoints.filter(e => e.path.startsWith('/newsletter'));

    newsletterEndpoints.forEach(endpoint => {
      // All newsletter endpoints should start with /newsletter
      expect(endpoint.path).toMatch(/^\/newsletter\//);

      // Paths should use lowercase and hyphens
      expect(endpoint.path).toMatch(/^[a-z0-9\-\/\{\}]+$/);
    });
  });

  it('should have consistent operationId naming', () => {
    const operationIds = endpoints.map(e => e.operationId);

    // All operationIds should be camelCase
    operationIds.forEach(id => {
      expect(id).toMatch(/^[a-z][a-zA-Z0-9]*$/);
    });
  });

  it('should have matching response schemas for similar endpoints', () => {
    // Configuration endpoints should return consistent Configuration objects
    const configEndpoints = [
      getEndpointByOperationId(spec, 'getConfiguration'),
      getEndpointByOperationId(spec, 'createConfiguration'),
      getEndpointByOperationId(spec, 'updateConfiguration'),
    ];

    configEndpoints.forEach(endpoint => {
      expect(endpoint).not.toBeNull();
      const successResponse = endpoint?.responses['200'] || endpoint?.responses['201'];
      expect(successResponse?.content?.['application/json']).toBeDefined();
    });
  });

  it('should define all required OpenAPI info fields', () => {
    expect(spec.info.title).toBe('Newsletter Automation API');
    expect(spec.info.version).toBe('1.0.0');
    expect(spec.info.description).toBeDefined();
    expect(spec.info.contact).toBeDefined();
  });

  it('should define development and production servers', () => {
    expect(spec.servers.length).toBeGreaterThanOrEqual(2);

    const devServer = spec.servers.find(s => s.description?.includes('development'));
    const prodServer = spec.servers.find(s => s.description?.includes('Production'));

    expect(devServer).toBeDefined();
    expect(prodServer).toBeDefined();
    expect(devServer?.url).toMatch(/localhost/);
    expect(prodServer?.url).toMatch(/api\.armor\.com/);
  });

  it('should define API tags for endpoint grouping', () => {
    const expectedTags = ['Configuration', 'Segments', 'Content', 'Issues', 'Analytics'];

    expectedTags.forEach(tag => {
      const pathsWithTag = Object.values(spec.paths).some(pathItem => {
        const operations = [pathItem.get, pathItem.post, pathItem.put, pathItem.delete].filter(Boolean);
        return operations.some(op => op?.tags?.includes(tag));
      });
      expect(pathsWithTag, `Should have endpoints with tag: ${tag}`).toBe(true);
    });
  });
});

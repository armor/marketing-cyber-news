/**
 * Contract Validation Tests
 * Example tests demonstrating OpenAPI contract validation
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  validateRequestBody,
  validateResponse,
  getEndpointSchema,
  generateMockFromSchema,
} from './contract-helpers';
import {
  createMockArticleForApproval,
  createMockApprovalQueueResponse,
  createMockApprovalHistory,
  createMockApprovalActionResponse,
} from '../mocks/factories/approval-factory';

describe('OpenAPI Contract Validation', () => {
  describe('Request Validation', () => {
    it('should validate valid ApproveRequest', () => {
      const requestData = { notes: 'Approved for publication' };
      const result = validateRequestBody(requestData, 'ApproveRequest');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid RejectRequest', () => {
      const requestData = {
        reason: 'Content does not meet quality standards and requires revision',
      };
      const result = validateRequestBody(requestData, 'RejectRequest');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject RejectRequest without reason', () => {
      const requestData = {};
      const result = validateRequestBody(requestData, 'RejectRequest');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('required');
    });

    it('should validate valid UpdateRoleRequest', () => {
      const requestData = { role: 'marketing' };
      const result = validateRequestBody(requestData, 'UpdateRoleRequest');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Response Validation', () => {
    it('should validate approval queue response', () => {
      const mockResponse = createMockApprovalQueueResponse(5);
      const result = validateResponse(mockResponse, 'getApprovalQueue', 200);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate approval action response', () => {
      const mockResponse = createMockApprovalActionResponse(true, 'article-123', 'approved');
      const result = validateResponse(mockResponse, 'approveArticle', 200);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate approval history response', () => {
      const mockResponse = createMockApprovalHistory('article-123', {
        gates: ['marketing', 'branding'],
      });
      const result = validateResponse(mockResponse, 'getApprovalHistory', 200);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid response structure', () => {
      // Provide wrong type for 'data' field (should be array, not string)
      const invalidResponse = {
        data: 'not an array',
        pagination: {},
        meta: {},
      };
      const result = validateResponse(invalidResponse, 'getApprovalQueue', 200);

      // Should fail because 'data' is string instead of array
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.message.includes('array'))).toBe(true);
    });
  });

  describe('Schema Operations', () => {
    it('should get endpoint schema by operationId', () => {
      const schema = getEndpointSchema('getApprovalQueue');

      expect(schema).not.toBeNull();
      expect(schema?.method).toBe('GET');
      expect(schema?.path).toBe('/approvals/queue');
      expect(schema?.responseSchemas[200]).toBeDefined();
    });

    it('should generate mock from schema', () => {
      const mock = generateMockFromSchema('ArticleForApproval');

      expect(mock).toBeDefined();
      expect(typeof mock).toBe('object');
      expect(mock).toHaveProperty('id');
      expect(mock).toHaveProperty('title');
      expect(mock).toHaveProperty('approvalStatus');
    });
  });

  describe('Factory-Generated Data Contract Compliance', () => {
    it('should create compliant article for approval', () => {
      const article = createMockArticleForApproval();

      expect(article.id).toBeDefined();
      expect(article.title).toBeDefined();
      expect(article.approvalStatus).toBeDefined();
      expect(typeof article.rejected).toBe('boolean');

      // Type narrowing check
      const status = article.approvalStatus;
      const validStatuses = [
        'pending_marketing',
        'pending_branding',
        'pending_soc_l1',
        'pending_soc_l3',
        'pending_ciso',
        'approved',
        'rejected',
        'released',
      ];
      expect(validStatuses).toContain(status);
    });

    it('should create compliant approval queue response', () => {
      const response = createMockApprovalQueueResponse(3);

      expect(response.data).toHaveLength(3);
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.totalItems).toBe(3);
      expect(response.meta.userRole).toBeDefined();
      expect(response.meta.targetGate).toBeDefined();
    });

    it('should create compliant approval history with rejection', () => {
      const history = createMockApprovalHistory('article-123', {
        gates: ['marketing'],
        rejected: true,
      });

      expect(history.currentStatus).toBe('rejected');
      expect(history.rejected).toBe(true);
      expect(history.rejectionDetails).toBeDefined();
      expect(history.rejectionDetails?.reason).toBeDefined();
      expect(history.approvals).toHaveLength(1);
    });

    it('should create compliant approval history with release', () => {
      const history = createMockApprovalHistory('article-123', {
        gates: ['marketing', 'branding', 'soc_l1', 'soc_l3', 'ciso'],
        released: true,
      });

      expect(history.currentStatus).toBe('released');
      expect(history.rejected).toBe(false);
      expect(history.releaseDetails).toBeDefined();
      expect(history.releaseDetails?.releasedBy).toBeDefined();
      expect(history.approvals).toHaveLength(5);
    });
  });
});

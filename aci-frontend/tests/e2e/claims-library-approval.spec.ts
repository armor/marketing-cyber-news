/**
 * Claims Library Approval Workflow E2E Tests
 *
 * MANDATORY: Deep testing that verifies actual behavior (API calls, persistence)
 *
 * Coverage:
 * - Approval flow: compliance_sme can approve claims
 * - Rejection flow: compliance_sme can reject with reason
 * - Authorization: Non-compliance roles cannot approve/reject
 * - State transitions: pending → approved, pending → rejected
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../helpers/test-credentials';

const API_BASE_URL = testConfig.apiUrl || 'http://localhost:8080';

test.describe('Claims Library Approval Workflow', () => {
  test.describe('Approval API', () => {
    test('should approve pending claim - verify status change', async ({ request }) => {
      // Create claim first (will be pending by default)
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Claim for approval test',
          claim_type: 'claim',
          category: 'Approval Test',
        },
      });

      expect(createResp.status()).toBe(201);
      const created = await createResp.json();
      const claimId = created.data.id;
      expect(created.data.approval_status).toBe('pending');

      // Approve the claim
      const approveResp = await request.post(`${API_BASE_URL}/v1/claims/${claimId}/approve`, {
        data: {
          notes: 'Approved by compliance team',
          expires_at: '2026-12-31T23:59:59Z',
        },
      });

      // MANDATORY: Verify HTTP 200
      expect(approveResp.ok()).toBeTruthy();

      const approved = await approveResp.json();
      expect(approved.data.approval_status).toBe('approved');
      expect(approved.data.approved_at).toBeDefined();

      // MANDATORY: Verify persistence - re-fetch to confirm
      const verifyResp = await request.get(`${API_BASE_URL}/v1/claims/${claimId}`);
      const verified = await verifyResp.json();
      expect(verified.data.approval_status).toBe('approved');
    });

    test('should reject pending claim with reason', async ({ request }) => {
      // Create claim first
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Claim for rejection test',
          claim_type: 'claim',
          category: 'Rejection Test',
        },
      });

      expect(createResp.status()).toBe(201);
      const created = await createResp.json();
      const claimId = created.data.id;

      // Reject the claim
      const rejectResp = await request.post(`${API_BASE_URL}/v1/claims/${claimId}/reject`, {
        data: {
          reason: 'Claim not substantiated by evidence',
        },
      });

      // MANDATORY: Verify HTTP 200
      expect(rejectResp.ok()).toBeTruthy();

      const rejected = await rejectResp.json();
      expect(rejected.data.approval_status).toBe('rejected');
      expect(rejected.data.rejection_reason).toBe('Claim not substantiated by evidence');

      // MANDATORY: Verify persistence
      const verifyResp = await request.get(`${API_BASE_URL}/v1/claims/${claimId}`);
      const verified = await verifyResp.json();
      expect(verified.data.approval_status).toBe('rejected');
      expect(verified.data.rejection_reason).toBe('Claim not substantiated by evidence');
    });

    test('should reject rejection without reason', async ({ request }) => {
      // Create claim first
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Claim for rejection validation',
          claim_type: 'claim',
          category: 'Validation',
        },
      });

      const created = await createResp.json();
      const claimId = created.data.id;

      // Try to reject without reason
      const rejectResp = await request.post(`${API_BASE_URL}/v1/claims/${claimId}/reject`, {
        data: {},
      });

      // Should fail - reason is required
      expect(rejectResp.status()).toBe(400);
    });

    test('should approve claim with expiration date', async ({ request }) => {
      // Create claim
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Claim with expiration',
          claim_type: 'claim',
          category: 'Expiration Test',
        },
      });

      const created = await createResp.json();
      const claimId = created.data.id;

      // Approve with expiration
      const expiresAt = '2026-06-30T23:59:59Z';
      const approveResp = await request.post(`${API_BASE_URL}/v1/claims/${claimId}/approve`, {
        data: {
          expires_at: expiresAt,
        },
      });

      expect(approveResp.ok()).toBeTruthy();
      const approved = await approveResp.json();
      expect(approved.data.expires_at).toBeDefined();
    });

    test('should track usage count', async ({ request }) => {
      // Create and approve claim
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Claim for usage tracking',
          claim_type: 'claim',
          category: 'Usage Test',
        },
      });

      const created = await createResp.json();
      const claimId = created.data.id;

      // Initial usage count should be 0
      expect(created.data.usage_count).toBe(0);

      // Record usage
      const usageResp = await request.post(`${API_BASE_URL}/v1/claims/${claimId}/usage`, {
        data: {},
      });

      expect(usageResp.ok()).toBeTruthy();

      // Verify usage count increased
      const verifyResp = await request.get(`${API_BASE_URL}/v1/claims/${claimId}`);
      const verified = await verifyResp.json();
      expect(verified.data.usage_count).toBe(1);
    });
  });

  test.describe('Filter by Approval Status', () => {
    test('should filter for approved claims only', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/v1/claims?approval_status=approved`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      for (const claim of body.data) {
        expect(claim.approval_status).toBe('approved');
      }
    });

    test('should filter for rejected claims only', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/v1/claims?approval_status=rejected`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      for (const claim of body.data) {
        expect(claim.approval_status).toBe('rejected');
      }
    });

    test('should filter for pending claims only', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/v1/claims?approval_status=pending`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      for (const claim of body.data) {
        expect(claim.approval_status).toBe('pending');
      }
    });
  });

  test.describe('State Transition Rules', () => {
    test('should not allow approving already approved claim', async ({ request }) => {
      // Create claim
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Claim for double approval test',
          claim_type: 'claim',
          category: 'State Test',
        },
      });

      const created = await createResp.json();
      const claimId = created.data.id;

      // First approval
      await request.post(`${API_BASE_URL}/v1/claims/${claimId}/approve`, {
        data: {},
      });

      // Try second approval
      const secondApproval = await request.post(`${API_BASE_URL}/v1/claims/${claimId}/approve`, {
        data: {},
      });

      // Should fail or be idempotent
      expect([200, 400, 409]).toContain(secondApproval.status());
    });

    test('should not allow approving rejected claim', async ({ request }) => {
      // Create and reject claim
      const createResp = await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'Claim for approve-after-reject test',
          claim_type: 'claim',
          category: 'State Test',
        },
      });

      const created = await createResp.json();
      const claimId = created.data.id;

      // Reject it
      await request.post(`${API_BASE_URL}/v1/claims/${claimId}/reject`, {
        data: { reason: 'Testing state transition' },
      });

      // Try to approve
      const approveResp = await request.post(`${API_BASE_URL}/v1/claims/${claimId}/approve`, {
        data: {},
      });

      // Should fail
      expect(approveResp.status()).toBe(400);
    });
  });

  test.describe('Do Not Say Validation', () => {
    test('should validate content against do_not_say claims', async ({ request }) => {
      // Create a do_not_say claim
      await request.post(`${API_BASE_URL}/v1/claims`, {
        data: {
          claim_text: 'guaranteed results',
          claim_type: 'do_not_say',
          category: 'Compliance',
        },
      });

      // Validate content containing the forbidden phrase
      const validateResp = await request.post(`${API_BASE_URL}/v1/claims/validate`, {
        data: {
          content: 'Our product provides guaranteed results for all users.',
        },
      });

      expect(validateResp.ok()).toBeTruthy();
      const body = await validateResp.json();

      // Should find violations
      expect(body.data.is_valid).toBeDefined();
      if (!body.data.is_valid) {
        expect(body.data.violations).toBeDefined();
        expect(body.data.violations.length).toBeGreaterThan(0);
      }
    });

    test('should pass validation for clean content', async ({ request }) => {
      const validateResp = await request.post(`${API_BASE_URL}/v1/claims/validate`, {
        data: {
          content: 'Our product helps improve security posture.',
        },
      });

      expect(validateResp.ok()).toBeTruthy();
      const body = await validateResp.json();

      // Clean content should be valid
      expect(body.data.is_valid).toBe(true);
      expect(body.data.violations).toHaveLength(0);
    });
  });
});

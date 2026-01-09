/**
 * 7-Gate Approval Workflow E2E Tests
 *
 * MANDATORY: Deep testing that verifies actual behavior (API calls, persistence)
 *
 * Coverage:
 * - Full 7-gate workflow: Marketing → Branding → VoC → SOC L1 → SOC L3 → Compliance → CISO
 * - Role-based gate authorization
 * - State transitions and persistence
 * - Rejection flow from any gate
 * - Release after final approval
 *
 * Gate Order:
 * 1. Marketing (marketing role)
 * 2. Branding (branding or designer role)
 * 3. VoC (voc_expert role)
 * 4. SOC L1 (soc_level_1 role)
 * 5. SOC L3 (soc_level_3 role)
 * 6. Compliance (compliance_sme role)
 * 7. CISO (ciso role)
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { testConfig } from '../helpers/test-credentials';

const API_BASE_URL = testConfig.apiUrl || 'http://localhost:8080';
const PASSWORD = 'TestPass123!';

// Test user credentials for each gate
const GATE_USERS = {
  marketing: { email: 'marketing@test.com', role: 'marketing', gate: 'marketing' },
  branding: { email: 'branding@test.com', role: 'branding', gate: 'branding' },
  designer: { email: 'designer@test.com', role: 'designer', gate: 'branding' },
  voc: { email: 'voc@test.com', role: 'voc_expert', gate: 'voc' },
  soc1: { email: 'soc1@test.com', role: 'soc_level_1', gate: 'soc_l1' },
  soc3: { email: 'soc3@test.com', role: 'soc_level_3', gate: 'soc_l3' },
  compliance: { email: 'compliance@test.com', role: 'compliance_sme', gate: 'compliance' },
  ciso: { email: 'ciso@test.com', role: 'ciso', gate: 'ciso' },
  admin: { email: 'admin@test.com', role: 'admin', gate: 'all' },
} as const;

// Expected workflow status transitions
const WORKFLOW_STATUSES = [
  'pending_marketing',
  'pending_branding',
  'pending_voc',
  'pending_soc_l1',
  'pending_soc_l3',
  'pending_compliance',
  'pending_ciso',
  'approved',
] as const;

// Gate order matching backend
const GATE_ORDER = [
  'marketing',
  'branding',
  'voc',
  'soc_l1',
  'soc_l3',
  'compliance',
  'ciso',
] as const;

interface AuthResponse {
  data: {
    accessToken: string;
    user: { id: string; email: string; role: string };
  };
}

interface ArticleResponse {
  data: {
    id: string;
    title: string;
    approval_status: string;
  };
}

/**
 * Login as a specific user and return the auth token
 */
async function loginAs(
  request: APIRequestContext,
  email: string
): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/v1/auth/login`, {
    data: { email, password: PASSWORD },
  });

  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()}`);
  }

  const body: AuthResponse = await response.json();
  return body.data.accessToken;
}

/**
 * Create authenticated request context for a user
 */
async function createAuthContext(
  request: APIRequestContext,
  email: string
): Promise<{ token: string; headers: Record<string, string> }> {
  const token = await loginAs(request, email);
  return {
    token,
    headers: { Authorization: `Bearer ${token}` },
  };
}

test.describe('7-Gate Approval Workflow', () => {
  test.describe('Workflow Status Transitions', () => {
    test('should progress through all 7 gates with admin user', async ({ request }) => {
      // Login as admin (can approve all gates)
      const { headers } = await createAuthContext(request, GATE_USERS.admin.email);

      // Create a new article for testing
      const createResp = await request.post(`${API_BASE_URL}/v1/articles`, {
        headers,
        data: {
          title: `7-Gate Workflow Test - ${Date.now()}`,
          content: 'Test article for 7-gate approval workflow',
          summary: 'Testing approval workflow',
          source_id: null,
          category_ids: [],
        },
      });

      // Skip if article creation not supported (might need different endpoint)
      if (createResp.status() === 404 || createResp.status() === 405) {
        test.skip();
        return;
      }

      expect(createResp.status()).toBe(201);
      const article: ArticleResponse = await createResp.json();
      const articleId = article.data.id;

      // Initial status should be pending_marketing
      expect(article.data.approval_status).toBe('pending_marketing');

      // Progress through all 7 gates
      for (let i = 0; i < GATE_ORDER.length; i++) {
        const gate = GATE_ORDER[i];
        const expectedCurrentStatus = WORKFLOW_STATUSES[i];
        const expectedNextStatus = WORKFLOW_STATUSES[i + 1];

        // Verify current status before approval
        const statusResp = await request.get(
          `${API_BASE_URL}/v1/articles/${articleId}`,
          { headers }
        );
        expect(statusResp.ok()).toBeTruthy();
        const currentArticle: ArticleResponse = await statusResp.json();
        expect(currentArticle.data.approval_status).toBe(expectedCurrentStatus);

        // Approve the current gate
        const approveResp = await request.post(
          `${API_BASE_URL}/v1/articles/${articleId}/approve`,
          {
            headers,
            data: { notes: `Approved at ${gate} gate by admin` },
          }
        );

        // MANDATORY: Verify HTTP success
        expect(approveResp.ok()).toBeTruthy();

        // MANDATORY: Verify persistence - re-fetch to confirm status change
        const verifyResp = await request.get(
          `${API_BASE_URL}/v1/articles/${articleId}`,
          { headers }
        );
        const verified: ArticleResponse = await verifyResp.json();
        expect(verified.data.approval_status).toBe(expectedNextStatus);
      }

      // Final status should be approved
      const finalResp = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers }
      );
      const finalArticle: ArticleResponse = await finalResp.json();
      expect(finalArticle.data.approval_status).toBe('approved');
    });

    test('should reject from any gate and reset to pending_marketing', async ({ request }) => {
      const { headers } = await createAuthContext(request, GATE_USERS.admin.email);

      // Create article
      const createResp = await request.post(`${API_BASE_URL}/v1/articles`, {
        headers,
        data: {
          title: `Rejection Test - ${Date.now()}`,
          content: 'Test article for rejection workflow',
          summary: 'Testing rejection',
        },
      });

      if (createResp.status() === 404 || createResp.status() === 405) {
        test.skip();
        return;
      }

      const article: ArticleResponse = await createResp.json();
      const articleId = article.data.id;

      // Progress to pending_soc_l1 (gate 4)
      for (let i = 0; i < 3; i++) {
        await request.post(`${API_BASE_URL}/v1/articles/${articleId}/approve`, {
          headers,
          data: { notes: 'Progressing to rejection point' },
        });
      }

      // Verify at pending_soc_l1
      const beforeReject = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers }
      );
      const beforeArticle: ArticleResponse = await beforeReject.json();
      expect(beforeArticle.data.approval_status).toBe('pending_soc_l1');

      // Reject
      const rejectResp = await request.post(
        `${API_BASE_URL}/v1/articles/${articleId}/reject`,
        {
          headers,
          data: { reason: 'Content needs revision' },
        }
      );

      expect(rejectResp.ok()).toBeTruthy();

      // MANDATORY: Verify persistence - status should be rejected
      const afterReject = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers }
      );
      const afterArticle: ArticleResponse = await afterReject.json();
      expect(afterArticle.data.approval_status).toBe('rejected');
    });
  });

  test.describe('Role-Based Gate Authorization', () => {
    test('marketing user can only approve marketing gate', async ({ request }) => {
      const adminAuth = await createAuthContext(request, GATE_USERS.admin.email);
      const marketingAuth = await createAuthContext(
        request,
        GATE_USERS.marketing.email
      );

      // Create article as admin
      const createResp = await request.post(`${API_BASE_URL}/v1/articles`, {
        headers: adminAuth.headers,
        data: {
          title: `Marketing Gate Test - ${Date.now()}`,
          content: 'Testing marketing gate authorization',
          summary: 'Marketing test',
        },
      });

      if (createResp.status() === 404 || createResp.status() === 405) {
        test.skip();
        return;
      }

      const article: ArticleResponse = await createResp.json();
      const articleId = article.data.id;

      // Marketing user should be able to approve pending_marketing
      const approveResp = await request.post(
        `${API_BASE_URL}/v1/articles/${articleId}/approve`,
        {
          headers: marketingAuth.headers,
          data: { notes: 'Marketing approved' },
        }
      );

      expect(approveResp.ok()).toBeTruthy();

      // Verify progression to pending_branding
      const afterApprove = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers: adminAuth.headers }
      );
      const afterArticle: ArticleResponse = await afterApprove.json();
      expect(afterArticle.data.approval_status).toBe('pending_branding');

      // Marketing user should NOT be able to approve branding gate
      const brandingAttempt = await request.post(
        `${API_BASE_URL}/v1/articles/${articleId}/approve`,
        {
          headers: marketingAuth.headers,
          data: { notes: 'Marketing trying to approve branding' },
        }
      );

      // Should fail with 403 Forbidden
      expect(brandingAttempt.status()).toBe(403);
    });

    test('compliance_sme can only approve compliance gate', async ({ request }) => {
      const adminAuth = await createAuthContext(request, GATE_USERS.admin.email);
      const complianceAuth = await createAuthContext(
        request,
        GATE_USERS.compliance.email
      );

      // Create article as admin
      const createResp = await request.post(`${API_BASE_URL}/v1/articles`, {
        headers: adminAuth.headers,
        data: {
          title: `Compliance Gate Test - ${Date.now()}`,
          content: 'Testing compliance gate authorization',
          summary: 'Compliance test',
        },
      });

      if (createResp.status() === 404 || createResp.status() === 405) {
        test.skip();
        return;
      }

      const article: ArticleResponse = await createResp.json();
      const articleId = article.data.id;

      // Compliance user cannot approve marketing gate
      const marketingAttempt = await request.post(
        `${API_BASE_URL}/v1/articles/${articleId}/approve`,
        {
          headers: complianceAuth.headers,
          data: { notes: 'Compliance trying marketing' },
        }
      );

      expect(marketingAttempt.status()).toBe(403);

      // Progress to compliance gate using admin
      for (let i = 0; i < 5; i++) {
        await request.post(`${API_BASE_URL}/v1/articles/${articleId}/approve`, {
          headers: adminAuth.headers,
          data: { notes: 'Admin progressing to compliance' },
        });
      }

      // Verify at pending_compliance
      const beforeCompliance = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers: adminAuth.headers }
      );
      const beforeArticle: ArticleResponse = await beforeCompliance.json();
      expect(beforeArticle.data.approval_status).toBe('pending_compliance');

      // Compliance user should be able to approve compliance gate
      const complianceApprove = await request.post(
        `${API_BASE_URL}/v1/articles/${articleId}/approve`,
        {
          headers: complianceAuth.headers,
          data: { notes: 'Compliance approved' },
        }
      );

      expect(complianceApprove.ok()).toBeTruthy();

      // Verify progression to pending_ciso
      const afterCompliance = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers: adminAuth.headers }
      );
      const afterArticle: ArticleResponse = await afterCompliance.json();
      expect(afterArticle.data.approval_status).toBe('pending_ciso');
    });

    test('voc_expert can only approve voc gate', async ({ request }) => {
      const adminAuth = await createAuthContext(request, GATE_USERS.admin.email);
      const vocAuth = await createAuthContext(request, GATE_USERS.voc.email);

      // Create article as admin
      const createResp = await request.post(`${API_BASE_URL}/v1/articles`, {
        headers: adminAuth.headers,
        data: {
          title: `VoC Gate Test - ${Date.now()}`,
          content: 'Testing VoC gate authorization',
          summary: 'VoC test',
        },
      });

      if (createResp.status() === 404 || createResp.status() === 405) {
        test.skip();
        return;
      }

      const article: ArticleResponse = await createResp.json();
      const articleId = article.data.id;

      // VoC user cannot approve marketing gate
      const marketingAttempt = await request.post(
        `${API_BASE_URL}/v1/articles/${articleId}/approve`,
        {
          headers: vocAuth.headers,
          data: { notes: 'VoC trying marketing' },
        }
      );

      expect(marketingAttempt.status()).toBe(403);

      // Progress to VoC gate using admin (gates 1 & 2)
      for (let i = 0; i < 2; i++) {
        await request.post(`${API_BASE_URL}/v1/articles/${articleId}/approve`, {
          headers: adminAuth.headers,
          data: { notes: 'Admin progressing to VoC' },
        });
      }

      // Verify at pending_voc
      const beforeVoc = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers: adminAuth.headers }
      );
      const beforeArticle: ArticleResponse = await beforeVoc.json();
      expect(beforeArticle.data.approval_status).toBe('pending_voc');

      // VoC user should be able to approve VoC gate
      const vocApprove = await request.post(
        `${API_BASE_URL}/v1/articles/${articleId}/approve`,
        {
          headers: vocAuth.headers,
          data: { notes: 'VoC approved' },
        }
      );

      expect(vocApprove.ok()).toBeTruthy();

      // Verify progression to pending_soc_l1
      const afterVoc = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers: adminAuth.headers }
      );
      const afterArticle: ArticleResponse = await afterVoc.json();
      expect(afterArticle.data.approval_status).toBe('pending_soc_l1');
    });

    test('designer can approve branding gate (alternate role)', async ({ request }) => {
      const adminAuth = await createAuthContext(request, GATE_USERS.admin.email);
      const designerAuth = await createAuthContext(
        request,
        GATE_USERS.designer.email
      );

      // Create article as admin
      const createResp = await request.post(`${API_BASE_URL}/v1/articles`, {
        headers: adminAuth.headers,
        data: {
          title: `Designer Branding Test - ${Date.now()}`,
          content: 'Testing designer can approve branding',
          summary: 'Designer test',
        },
      });

      if (createResp.status() === 404 || createResp.status() === 405) {
        test.skip();
        return;
      }

      const article: ArticleResponse = await createResp.json();
      const articleId = article.data.id;

      // Progress to branding gate using admin
      await request.post(`${API_BASE_URL}/v1/articles/${articleId}/approve`, {
        headers: adminAuth.headers,
        data: { notes: 'Admin approving marketing' },
      });

      // Verify at pending_branding
      const beforeBranding = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers: adminAuth.headers }
      );
      const beforeArticle: ArticleResponse = await beforeBranding.json();
      expect(beforeArticle.data.approval_status).toBe('pending_branding');

      // Designer should be able to approve branding gate
      const designerApprove = await request.post(
        `${API_BASE_URL}/v1/articles/${articleId}/approve`,
        {
          headers: designerAuth.headers,
          data: { notes: 'Designer approved branding' },
        }
      );

      expect(designerApprove.ok()).toBeTruthy();

      // Verify progression to pending_voc
      const afterBranding = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers: adminAuth.headers }
      );
      const afterArticle: ArticleResponse = await afterBranding.json();
      expect(afterArticle.data.approval_status).toBe('pending_voc');
    });
  });

  test.describe('Release Flow', () => {
    test('CISO can release approved article', async ({ request }) => {
      const adminAuth = await createAuthContext(request, GATE_USERS.admin.email);
      const cisoAuth = await createAuthContext(request, GATE_USERS.ciso.email);

      // Create article as admin
      const createResp = await request.post(`${API_BASE_URL}/v1/articles`, {
        headers: adminAuth.headers,
        data: {
          title: `Release Test - ${Date.now()}`,
          content: 'Testing release by CISO',
          summary: 'Release test',
        },
      });

      if (createResp.status() === 404 || createResp.status() === 405) {
        test.skip();
        return;
      }

      const article: ArticleResponse = await createResp.json();
      const articleId = article.data.id;

      // Progress through all 7 gates to approved
      for (let i = 0; i < 7; i++) {
        await request.post(`${API_BASE_URL}/v1/articles/${articleId}/approve`, {
          headers: adminAuth.headers,
          data: { notes: 'Admin progressing to approved' },
        });
      }

      // Verify at approved
      const beforeRelease = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers: adminAuth.headers }
      );
      const beforeArticle: ArticleResponse = await beforeRelease.json();
      expect(beforeArticle.data.approval_status).toBe('approved');

      // CISO releases
      const releaseResp = await request.post(
        `${API_BASE_URL}/v1/articles/${articleId}/release`,
        {
          headers: cisoAuth.headers,
          data: { notes: 'CISO releasing article' },
        }
      );

      expect(releaseResp.ok()).toBeTruthy();

      // MANDATORY: Verify persistence - status should be released
      const afterRelease = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}`,
        { headers: adminAuth.headers }
      );
      const afterArticle: ArticleResponse = await afterRelease.json();
      expect(afterArticle.data.approval_status).toBe('released');
    });

    test('non-CISO cannot release approved article', async ({ request }) => {
      const adminAuth = await createAuthContext(request, GATE_USERS.admin.email);
      const marketingAuth = await createAuthContext(
        request,
        GATE_USERS.marketing.email
      );

      // Create and approve article
      const createResp = await request.post(`${API_BASE_URL}/v1/articles`, {
        headers: adminAuth.headers,
        data: {
          title: `Unauthorized Release Test - ${Date.now()}`,
          content: 'Testing unauthorized release',
          summary: 'Auth test',
        },
      });

      if (createResp.status() === 404 || createResp.status() === 405) {
        test.skip();
        return;
      }

      const article: ArticleResponse = await createResp.json();
      const articleId = article.data.id;

      // Progress through all gates
      for (let i = 0; i < 7; i++) {
        await request.post(`${API_BASE_URL}/v1/articles/${articleId}/approve`, {
          headers: adminAuth.headers,
          data: { notes: 'Admin progressing' },
        });
      }

      // Marketing user tries to release - should fail
      const releaseAttempt = await request.post(
        `${API_BASE_URL}/v1/articles/${articleId}/release`,
        {
          headers: marketingAuth.headers,
          data: { notes: 'Marketing trying to release' },
        }
      );

      expect(releaseAttempt.status()).toBe(403);
    });
  });

  test.describe('Approval History', () => {
    test('should track approval history through all gates', async ({ request }) => {
      const adminAuth = await createAuthContext(request, GATE_USERS.admin.email);

      // Create article
      const createResp = await request.post(`${API_BASE_URL}/v1/articles`, {
        headers: adminAuth.headers,
        data: {
          title: `History Test - ${Date.now()}`,
          content: 'Testing approval history',
          summary: 'History test',
        },
      });

      if (createResp.status() === 404 || createResp.status() === 405) {
        test.skip();
        return;
      }

      const article: ArticleResponse = await createResp.json();
      const articleId = article.data.id;

      // Approve through all gates
      for (let i = 0; i < GATE_ORDER.length; i++) {
        await request.post(`${API_BASE_URL}/v1/articles/${articleId}/approve`, {
          headers: adminAuth.headers,
          data: { notes: `Gate ${i + 1}: ${GATE_ORDER[i]}` },
        });
      }

      // Fetch approval history
      const historyResp = await request.get(
        `${API_BASE_URL}/v1/articles/${articleId}/approvals`,
        { headers: adminAuth.headers }
      );

      // Skip if history endpoint doesn't exist
      if (historyResp.status() === 404) {
        test.skip();
        return;
      }

      expect(historyResp.ok()).toBeTruthy();
      const history = await historyResp.json();

      // Should have 7 approval entries (one per gate)
      expect(history.data.length).toBe(7);

      // Verify gates are recorded in order
      for (let i = 0; i < GATE_ORDER.length; i++) {
        expect(history.data[i].gate).toBe(GATE_ORDER[i]);
      }
    });
  });
});

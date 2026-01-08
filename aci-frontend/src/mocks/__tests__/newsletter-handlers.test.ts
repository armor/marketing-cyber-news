/**
 * Newsletter MSW Handlers Tests
 * Tests for newsletter configuration, segments, and issues endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import type {
  NewsletterConfiguration,
  Segment,
  NewsletterIssue,
  ConfigurationListResponse,
  SegmentListResponse,
  IssueListResponse,
} from '@/types/newsletter';
import { newsletterHandlers } from '../handlers/newsletter';

// ============================================================================
// Setup
// ============================================================================

const server = setupServer(...newsletterHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => server.resetHandlers());

const API_BASE = 'http://localhost:8080/v1';

// ============================================================================
// Configuration Tests
// ============================================================================

describe('Newsletter Configuration Handlers', () => {
  describe('GET /newsletter/configs', () => {
    it('should return list of configurations with pagination', async () => {
      const response = await fetch(`${API_BASE}/newsletter/configs`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as ConfigurationListResponse;
      expect(data.data).toBeDefined();
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.page_size).toBe(20);
      expect(data.pagination.total).toBeGreaterThan(0);
      expect(data.pagination.total_pages).toBeGreaterThan(0);
    });

    it('should filter configurations by segment_id', async () => {
      const response = await fetch(`${API_BASE}/newsletter/configs?segment_id=segment-001`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as ConfigurationListResponse;
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data.every((c) => c.segment_id === 'segment-001')).toBe(true);
    });

    it('should filter configurations by is_active status', async () => {
      const response = await fetch(`${API_BASE}/newsletter/configs?is_active=true`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as ConfigurationListResponse;
      expect(data.data.every((c) => c.is_active === true)).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const response = await fetch(`${API_BASE}/newsletter/configs?page=1&page_size=2`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as ConfigurationListResponse;
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.page_size).toBe(2);
      expect(data.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /newsletter/configs/:id', () => {
    it('should return single configuration by id', async () => {
      const response = await fetch(`${API_BASE}/newsletter/configs/config-001`);
      expect(response.status).toBe(200);

      const config = (await response.json()) as NewsletterConfiguration;
      expect(config.id).toBe('config-001');
      expect(config.name).toBeDefined();
      expect(config.cadence).toBeDefined();
    });

    it('should return 404 for non-existent configuration', async () => {
      const response = await fetch(`${API_BASE}/newsletter/configs/nonexistent-id`);
      expect(response.status).toBe(404);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('not_found');
    });
  });

  describe('POST /newsletter/configs', () => {
    it('should create new configuration', async () => {
      const newConfig = {
        name: 'Test Newsletter Config',
        description: 'Test description',
        cadence: 'weekly' as const,
        segment_id: 'segment-001',
      };

      const response = await fetch(`${API_BASE}/newsletter/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      expect(response.status).toBe(201);

      const created = (await response.json()) as NewsletterConfiguration;
      expect(created.id).toBeDefined();
      expect(created.name).toBe(newConfig.name);
      expect(created.description).toBe(newConfig.description);
      expect(created.cadence).toBe(newConfig.cadence);
      expect(created.is_active).toBe(true);
    });

    it('should apply defaults for missing optional fields', async () => {
      const minimalConfig = {
        name: 'Minimal Config',
        cadence: 'monthly' as const,
      };

      const response = await fetch(`${API_BASE}/newsletter/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minimalConfig),
      });

      expect(response.status).toBe(201);

      const created = (await response.json()) as NewsletterConfiguration;
      expect(created.max_blocks).toBe(6);
      expect(created.education_ratio_min).toBe(0.3);
      expect(created.approval_tier).toBe('tier1');
    });
  });

  describe('PUT /newsletter/configs/:id', () => {
    it('should update existing configuration', async () => {
      const updates = {
        name: 'Updated Config Name',
        max_blocks: 8,
      };

      const response = await fetch(`${API_BASE}/newsletter/configs/config-001`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);

      const updated = (await response.json()) as NewsletterConfiguration;
      expect(updated.name).toBe(updates.name);
      expect(updated.max_blocks).toBe(updates.max_blocks);
      expect(updated.updated_at).toBeDefined();
    });

    it('should return 404 when updating non-existent configuration', async () => {
      const response = await fetch(`${API_BASE}/newsletter/configs/nonexistent-id`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /newsletter/configs/:id', () => {
    it('should delete configuration', async () => {
      // Create a config first
      const createResponse = await fetch(`${API_BASE}/newsletter/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Config to Delete',
          cadence: 'weekly',
        }),
      });

      const created = (await createResponse.json()) as NewsletterConfiguration;

      // Delete it
      const deleteResponse = await fetch(`${API_BASE}/newsletter/configs/${created.id}`, {
        method: 'DELETE',
      });

      expect(deleteResponse.status).toBe(204);

      // Verify it's deleted
      const getResponse = await fetch(`${API_BASE}/newsletter/configs/${created.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent configuration', async () => {
      const response = await fetch(`${API_BASE}/newsletter/configs/nonexistent-id`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });
  });
});

// ============================================================================
// Segment Tests
// ============================================================================

describe('Newsletter Segment Handlers', () => {
  describe('GET /newsletter/segments', () => {
    it('should return list of segments with pagination', async () => {
      const response = await fetch(`${API_BASE}/newsletter/segments`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as SegmentListResponse;
      expect(data.data).toBeDefined();
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.pagination).toBeDefined();
    });

    it('should filter segments by is_active status', async () => {
      const response = await fetch(`${API_BASE}/newsletter/segments?is_active=true`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as SegmentListResponse;
      expect(data.data.every((s) => s.is_active === true)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await fetch(`${API_BASE}/newsletter/segments?page=1&page_size=2`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as SegmentListResponse;
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.page_size).toBe(2);
    });
  });

  describe('GET /newsletter/segments/:id', () => {
    it('should return single segment by id', async () => {
      const response = await fetch(`${API_BASE}/newsletter/segments/segment-001`);
      expect(response.status).toBe(200);

      const segment = (await response.json()) as Segment;
      expect(segment.id).toBe('segment-001');
      expect(segment.name).toBeDefined();
      expect(segment.role_cluster).toBeDefined();
    });

    it('should return 404 for non-existent segment', async () => {
      const response = await fetch(`${API_BASE}/newsletter/segments/nonexistent-id`);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /newsletter/segments', () => {
    it('should create new segment', async () => {
      const newSegment = {
        name: 'Test Segment',
        description: 'A test segment',
        role_cluster: 'security_operations',
      };

      const response = await fetch(`${API_BASE}/newsletter/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSegment),
      });

      expect(response.status).toBe(201);

      const created = (await response.json()) as Segment;
      expect(created.id).toBeDefined();
      expect(created.name).toBe(newSegment.name);
      expect(created.is_active).toBe(true);
      expect(created.contact_count).toBe(0);
    });

    it('should apply defaults for missing optional fields', async () => {
      const minimalSegment = {
        name: 'Minimal Segment',
      };

      const response = await fetch(`${API_BASE}/newsletter/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minimalSegment),
      });

      expect(response.status).toBe(201);

      const created = (await response.json()) as Segment;
      expect(created.industries).toEqual([]);
      expect(created.exclude_unsubscribed).toBe(true);
      expect(created.max_newsletters_per_30_days).toBe(4);
    });
  });

  describe('PUT /newsletter/segments/:id', () => {
    it('should update existing segment', async () => {
      const updates = {
        name: 'Updated Segment Name',
        min_engagement_score: 50,
      };

      const response = await fetch(`${API_BASE}/newsletter/segments/segment-001`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);

      const updated = (await response.json()) as Segment;
      expect(updated.name).toBe(updates.name);
      expect(updated.min_engagement_score).toBe(updates.min_engagement_score);
    });

    it('should return 404 when updating non-existent segment', async () => {
      const response = await fetch(`${API_BASE}/newsletter/segments/nonexistent-id`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });

      expect(response.status).toBe(404);
    });
  });
});

// ============================================================================
// Newsletter Issues Tests
// ============================================================================

describe('Newsletter Issues Handlers', () => {
  describe('GET /newsletter/issues', () => {
    it('should return list of issues with pagination', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as IssueListResponse;
      expect(data.data).toBeDefined();
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.pagination).toBeDefined();
    });

    it('should filter issues by status', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues?status=draft`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as IssueListResponse;
      expect(data.data.every((i) => i.status === 'draft')).toBe(true);
    });

    it('should filter issues by configuration_id', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues?configuration_id=config-001`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as IssueListResponse;
      expect(data.data.every((i) => i.configuration_id === 'config-001')).toBe(true);
    });

    it('should filter issues by segment_id', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues?segment_id=segment-001`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as IssueListResponse;
      expect(data.data.every((i) => i.segment_id === 'segment-001')).toBe(true);
    });
  });

  describe('GET /newsletter/issues/:id', () => {
    it('should return single issue by id', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/issue-001`);
      expect(response.status).toBe(200);

      const issue = (await response.json()) as NewsletterIssue;
      expect(issue.id).toBe('issue-001');
      expect(issue.subject_line).toBeDefined();
      expect(issue.status).toBeDefined();
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/nonexistent-id`);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /newsletter/issues', () => {
    it('should return 405 Method Not Allowed', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_line: 'Test' }),
      });

      expect(response.status).toBe(405);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('method_not_supported');
    });
  });

  describe('POST /newsletter/issues/generate', () => {
    it('should generate new issue from configuration', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configuration_id: 'config-001',
        }),
      });

      expect(response.status).toBe(201);

      const result = (await response.json()) as Record<string, unknown>;
      expect(result.issue_id).toBeDefined();
      expect(result.job_id).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should return 400 when configuration_id is missing', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('missing_field');
    });

    it('should return 404 when configuration does not exist', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configuration_id: 'nonexistent-config',
        }),
      });

      expect(response.status).toBe(404);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('not_found');
    });

    it('should accept optional scheduled_for parameter', async () => {
      const scheduledFor = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(`${API_BASE}/newsletter/issues/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configuration_id: 'config-001',
          scheduled_for: scheduledFor,
        }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('GET /newsletter/issues/:id/preview', () => {
    it('should return issue preview', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/issue-001/preview`);
      expect(response.status).toBe(200);

      const preview = (await response.json()) as Record<string, unknown>;
      expect(preview.issue_id).toBe('issue-001');
      expect(preview.subject_line).toBeDefined();
      expect(preview.html_content).toBeDefined();
      expect(preview.personalization_tokens).toBeDefined();
    });

    it('should include contact_id in preview when provided', async () => {
      const response = await fetch(
        `${API_BASE}/newsletter/issues/issue-001/preview?contact_id=contact-123`
      );
      expect(response.status).toBe(200);

      const preview = (await response.json()) as Record<string, unknown>;
      expect(preview.contact_id).toBe('contact-123');
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/nonexistent/preview`);
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /newsletter/issues/:id', () => {
    it('should update draft issue', async () => {
      const updates = {
        subject_line: 'Updated Subject Line',
      };

      const response = await fetch(`${API_BASE}/newsletter/issues/issue-001`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);

      const updated = (await response.json()) as NewsletterIssue;
      expect(updated.subject_line).toBe(updates.subject_line);
    });

    it('should return 400 when trying to update sent issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/issue-005`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_line: 'New Subject' }),
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('invalid_state');
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/nonexistent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_line: 'New Subject' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /newsletter/issues/:id', () => {
    it('should delete draft issue', async () => {
      // Generate a new draft issue
      const generateResponse = await fetch(`${API_BASE}/newsletter/issues/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configuration_id: 'config-001',
        }),
      });

      const generated = (await generateResponse.json()) as Record<string, unknown>;
      const issueId = generated.issue_id as string;

      // Delete it
      const deleteResponse = await fetch(`${API_BASE}/newsletter/issues/${issueId}`, {
        method: 'DELETE',
      });

      expect(deleteResponse.status).toBe(204);

      // Verify it's deleted
      const getResponse = await fetch(`${API_BASE}/newsletter/issues/${issueId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 400 when trying to delete sent issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/issue-005`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('invalid_state');
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/nonexistent`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /newsletter/issues/:id/submit-for-approval', () => {
    it('should transition draft issue to pending_approval', async () => {
      // Generate a new draft issue
      const generateResponse = await fetch(`${API_BASE}/newsletter/issues/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configuration_id: 'config-001',
        }),
      });

      const generated = (await generateResponse.json()) as Record<string, unknown>;
      const issueId = generated.issue_id as string;

      // Submit for approval
      const submitResponse = await fetch(
        `${API_BASE}/newsletter/issues/${issueId}/submit-for-approval`,
        {
          method: 'POST',
        }
      );

      expect(submitResponse.status).toBe(200);

      const updated = (await submitResponse.json()) as NewsletterIssue;
      expect(updated.status).toBe('pending_approval');
    });

    it('should return 400 when submitting non-draft issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/issue-003/submit-for-approval`, {
        method: 'POST',
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('invalid_state');
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/nonexistent/submit-for-approval`, {
        method: 'POST',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /newsletter/issues/:id/approve', () => {
    it('should transition pending_approval issue to approved', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/issue-002/approve`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);

      const approved = (await response.json()) as NewsletterIssue;
      expect(approved.status).toBe('approved');
      expect(approved.approved_by).toBeDefined();
      expect(approved.approved_at).toBeDefined();
    });

    it('should return 400 when approving non-pending_approval issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/issue-001/approve`, {
        method: 'POST',
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('invalid_state');
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/nonexistent/approve`, {
        method: 'POST',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /newsletter/issues/:id/reject', () => {
    it('should transition pending_approval issue to draft with rejection reason', async () => {
      // First generate a new issue and submit it for approval
      const generateResponse = await fetch(`${API_BASE}/newsletter/issues/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configuration_id: 'config-001',
        }),
      });

      const generated = (await generateResponse.json()) as Record<string, unknown>;
      const issueId = generated.issue_id as string;

      // Submit for approval
      await fetch(`${API_BASE}/newsletter/issues/${issueId}/submit-for-approval`, {
        method: 'POST',
      });

      // Now reject it
      const response = await fetch(`${API_BASE}/newsletter/issues/${issueId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Content quality issues',
        }),
      });

      expect(response.status).toBe(200);

      const rejected = (await response.json()) as NewsletterIssue;
      expect(rejected.status).toBe('draft');
      expect(rejected.rejection_reason).toBe('Content quality issues');
    });

    it('should return 400 when reason is missing', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/issue-002/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('missing_field');
    });

    it('should return 400 when rejecting non-pending_approval issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/issue-001/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Quality issues',
        }),
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('invalid_state');
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/nonexistent/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Quality issues',
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /newsletter/issues/:id/schedule', () => {
    it('should transition approved issue to scheduled', async () => {
      const scheduledFor = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(`${API_BASE}/newsletter/issues/issue-003/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_for: scheduledFor,
        }),
      });

      expect(response.status).toBe(200);

      const scheduled = (await response.json()) as NewsletterIssue;
      expect(scheduled.status).toBe('scheduled');
      expect(scheduled.scheduled_for).toBe(scheduledFor);
    });

    it('should return 400 when scheduled_for is missing', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/issue-003/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('missing_field');
    });

    it('should return 400 when scheduling non-approved issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/issue-001/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_for: new Date().toISOString(),
        }),
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as Record<string, unknown>;
      expect(error.error).toBe('invalid_state');
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await fetch(`${API_BASE}/newsletter/issues/nonexistent/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_for: new Date().toISOString(),
        }),
      });

      expect(response.status).toBe(404);
    });
  });
});

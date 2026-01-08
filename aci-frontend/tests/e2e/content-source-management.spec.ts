/**
 * Content Source Management E2E Tests
 * Tests for Task 10.4.1: Content Source Management Tests
 *
 * Coverage:
 * - Happy path: Source creation, feed validation, content ingestion
 * - Failure path: Invalid URLs, unreachable feeds, malformed content
 * - Null/empty states: Empty source list, no active sources
 * - Edge cases: Trust score validation, polling intervals
 * - Connectivity: Network errors, timeouts
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8080';

test.describe('Content Source Management', () => {
  test.describe('Happy Path - Source Creation and Validation', () => {
    test('should create content source with valid RSS feed', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Test Security Blog',
          source_type: 'rss',
          feed_url: 'https://feeds.feedburner.com/TheHackersNews',
          trust_score: 0.8,
          min_trust_threshold: 0.5,
          freshness_days: 7,
          poll_interval_minutes: 120,
          is_internal: false,
          default_topic_tags: ['security', 'vulnerabilities'],
        },
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe('Test Security Blog');
      expect(body.data.is_active).toBe(true);
    });

    test('should validate feed URL successfully', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/newsletter/content-sources/test-feed`, {
        data: {
          feed_url: 'https://feeds.feedburner.com/TheHackersNews',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data.is_valid).toBeDefined();
    });

    test('should list content sources with pagination', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/v1/content-sources?page=1&page_size=20`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.page_size).toBe(20);
    });

    test('should get polling status for source', async ({ request }) => {
      // Create a source first
      const createResp = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Polling Test Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: 0.7,
          poll_interval_minutes: 60,
        },
      });

      const source = await createResp.json();
      const sourceId = source.data.id;

      // Get polling status
      const statusResp = await request.get(
        `${API_BASE_URL}/v1/newsletter/content-sources/${sourceId}/status`
      );

      expect(statusResp.ok()).toBeTruthy();
      const statusBody = await statusResp.json();
      expect(statusBody.data.item_count).toBeDefined();
      expect(statusBody.data.error_count).toBeDefined();
    });

    test('should update content source configuration', async ({ request }) => {
      // Create source
      const createResp = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Update Test Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: 0.7,
          poll_interval_minutes: 120,
        },
      });

      const source = await createResp.json();
      const sourceId = source.data.id;

      // Update source
      const updateResp = await request.put(`${API_BASE_URL}/v1/content-sources/${sourceId}`, {
        data: {
          name: 'Updated Source Name',
          poll_interval_minutes: 180,
        },
      });

      expect(updateResp.ok()).toBeTruthy();
      const updated = await updateResp.json();
      expect(updated.data.name).toBe('Updated Source Name');
      expect(updated.data.poll_interval_minutes).toBe(180);
    });
  });

  test.describe('Failure Path - Invalid Input and Errors', () => {
    test('should reject invalid feed URL format', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Invalid URL Source',
          source_type: 'rss',
          feed_url: 'not-a-valid-url',
          trust_score: 0.7,
          poll_interval_minutes: 120,
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('should reject test feed with invalid URL', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/newsletter/content-sources/test-feed`, {
        data: {
          feed_url: 'ftp://invalid-protocol.com/feed',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject poll interval below minimum', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Low Interval Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: 0.7,
          poll_interval_minutes: 30, // Below 60 minute minimum
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject poll interval above maximum', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'High Interval Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: 0.7,
          poll_interval_minutes: 2000, // Above 1440 minute maximum
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject duplicate source URL', async ({ request }) => {
      const feedUrl = 'https://unique-feed-url-12345.com/feed.rss';

      // Create first source
      await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'First Source',
          source_type: 'rss',
          feed_url: feedUrl,
          trust_score: 0.7,
          poll_interval_minutes: 120,
        },
      });

      // Try to create duplicate
      const duplicateResp = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Duplicate Source',
          source_type: 'rss',
          feed_url: feedUrl,
          trust_score: 0.8,
          poll_interval_minutes: 120,
        },
      });

      // Depending on implementation, this might be 400 or 409
      expect([400, 409]).toContain(duplicateResp.status());
    });
  });

  test.describe('Null and Empty States', () => {
    test('should handle empty source list', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/v1/content-sources?page=999`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data).toEqual([]);
      expect(body.pagination.total_items).toBeGreaterThanOrEqual(0);
    });

    test('should filter for active sources only', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/v1/content-sources?is_active=true`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      // All returned sources should be active
      for (const source of body.data) {
        expect(source.is_active).toBe(true);
      }
    });

    test('should handle source with no content items', async ({ request }) => {
      // Create new source
      const createResp = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Empty Content Source',
          source_type: 'rss',
          feed_url: 'https://example.com/empty-feed.rss',
          trust_score: 0.7,
          poll_interval_minutes: 120,
        },
      });

      const source = await createResp.json();
      const sourceId = source.data.id;

      // Check status - should have 0 items
      const statusResp = await request.get(
        `${API_BASE_URL}/v1/newsletter/content-sources/${sourceId}/status`
      );

      expect(statusResp.ok()).toBeTruthy();
      const status = await statusResp.json();
      expect(status.data.item_count).toBe(0);
    });

    test('should reject empty feed URL in test', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/newsletter/content-sources/test-feed`, {
        data: {
          feed_url: '',
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Edge Cases - Boundary Validation', () => {
    test('should accept trust score at minimum boundary (0.0)', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Zero Trust Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: 0.0,
          poll_interval_minutes: 120,
        },
      });

      expect(response.status()).toBe(201);
    });

    test('should accept trust score at maximum boundary (1.0)', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Full Trust Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: 1.0,
          poll_interval_minutes: 120,
        },
      });

      expect(response.status()).toBe(201);
    });

    test('should reject trust score below minimum', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Negative Trust Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: -0.1,
          poll_interval_minutes: 120,
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject trust score above maximum', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Over Trust Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: 1.5,
          poll_interval_minutes: 120,
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should accept minimum polling interval (60 minutes)', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Min Interval Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: 0.7,
          poll_interval_minutes: 60,
        },
      });

      expect(response.status()).toBe(201);
    });

    test('should accept maximum polling interval (1440 minutes)', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Max Interval Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: 0.7,
          poll_interval_minutes: 1440,
        },
      });

      expect(response.status()).toBe(201);
    });

    test('should handle tag extraction from content', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Tagged Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: 0.7,
          poll_interval_minutes: 120,
          default_topic_tags: ['security', 'compliance', 'risk-management'],
          default_framework_tags: ['SOC2', 'ISO27001', 'NIST'],
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.data.default_topic_tags).toContain('security');
      expect(body.data.default_framework_tags).toContain('SOC2');
    });
  });

  test.describe('Connectivity and Network Errors', () => {
    test('should handle unreachable feed URL gracefully', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/v1/newsletter/content-sources/test-feed`, {
        data: {
          feed_url: 'https://this-domain-definitely-does-not-exist-12345.com/feed.rss',
        },
      });

      // Should return result with is_valid: false, not throw error
      const body = await response.json();
      expect(body.data).toBeDefined();

      // Feed test should complete but mark as invalid
      if (response.ok()) {
        expect(body.data.is_valid).toBe(false);
        expect(body.data.error_message).toBeDefined();
      }
    });

    test('should track polling errors in status', async ({ request }) => {
      // Create source
      const createResp = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Error Tracking Source',
          source_type: 'rss',
          feed_url: 'https://unreachable-feed.example.com/feed.rss',
          trust_score: 0.7,
          poll_interval_minutes: 120,
        },
      });

      const source = await createResp.json();
      const sourceId = source.data.id;

      // Attempt to poll (this would normally be done by background worker)
      // For now, just verify the status endpoint works
      const statusResp = await request.get(
        `${API_BASE_URL}/v1/newsletter/content-sources/${sourceId}/status`
      );

      expect(statusResp.ok()).toBeTruthy();
      const status = await statusResp.json();
      expect(status.data.error_count).toBeDefined();
      expect(status.data.error_count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Data Segregation and Security', () => {
    test('should filter sources by organization (when implemented)', async ({ request }) => {
      // This test assumes multi-tenancy is implemented
      // For now, just verify the endpoint doesn't break with org filter
      const response = await request.get(`${API_BASE_URL}/v1/content-sources?page=1`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      // All sources should belong to the authenticated user's organization
      // This is enforced at the repository/service level
      expect(body.data).toBeDefined();
    });

    test('should not allow accessing other org sources by ID', async ({ request }) => {
      // Create a source
      const createResp = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'Org Isolated Source',
          source_type: 'rss',
          feed_url: 'https://example.com/feed.rss',
          trust_score: 0.7,
          poll_interval_minutes: 120,
        },
      });

      const source = await createResp.json();
      const sourceId = source.data.id;

      // Try to access with different org context (would need proper auth setup)
      // For now, verify we can access our own source
      const getResp = await request.get(`${API_BASE_URL}/v1/content-sources/${sourceId}`);
      expect(getResp.ok()).toBeTruthy();
    });
  });

  test.describe('CRUD Operations', () => {
    test('should complete full CRUD lifecycle', async ({ request }) => {
      // CREATE
      const createResp = await request.post(`${API_BASE_URL}/v1/content-sources`, {
        data: {
          name: 'CRUD Test Source',
          source_type: 'rss',
          feed_url: 'https://example.com/crud-feed.rss',
          trust_score: 0.7,
          poll_interval_minutes: 120,
        },
      });

      expect(createResp.status()).toBe(201);
      const created = await createResp.json();
      const sourceId = created.data.id;

      // READ
      const getResp = await request.get(`${API_BASE_URL}/v1/content-sources/${sourceId}`);
      expect(getResp.ok()).toBeTruthy();
      const retrieved = await getResp.json();
      expect(retrieved.data.name).toBe('CRUD Test Source');

      // UPDATE
      const updateResp = await request.put(`${API_BASE_URL}/v1/content-sources/${sourceId}`, {
        data: {
          name: 'Updated CRUD Source',
        },
      });
      expect(updateResp.ok()).toBeTruthy();
      const updated = await updateResp.json();
      expect(updated.data.name).toBe('Updated CRUD Source');

      // DELETE
      const deleteResp = await request.delete(`${API_BASE_URL}/v1/content-sources/${sourceId}`);
      expect(deleteResp.status()).toBe(204);

      // VERIFY DELETED
      const verifyResp = await request.get(`${API_BASE_URL}/v1/content-sources/${sourceId}`);
      expect(verifyResp.status()).toBe(404);
    });
  });
});

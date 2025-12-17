/**
 * Admin API Service
 *
 * API functions for admin-only operations:
 * - Review queue management
 * - Article approval/rejection
 * - Article release for publication
 * - Admin statistics
 *
 * All endpoints require admin role authentication.
 */

import { apiClient } from './client';
import type { PendingArticle, ReviewAction, ReleaseAction, AdminStats } from '@/types/admin';
import type { PaginatedResponse } from '@/types/api';

// ============================================================================
// Review Queue
// ============================================================================

/**
 * Get pending articles in review queue
 *
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns Paginated list of pending articles
 *
 * @throws {ApiError} 401 if not authenticated, 403 if not admin
 *
 * @example
 * const queue = await getReviewQueue(1, 20);
 * console.log(`${queue.total} articles pending review`);
 */
export async function getReviewQueue(
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<PendingArticle>> {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(pageSize),
    status: 'pending',
  };

  const response = await apiClient.get<{
    data: PendingArticle[];
    meta: {
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
  }>('/admin/articles', params);

  return {
    items: response.data,
    total: response.meta.pagination.total,
    page: response.meta.pagination.page,
    pageSize: response.meta.pagination.limit,
    totalPages: response.meta.pagination.pages,
    hasNextPage: response.meta.pagination.page < response.meta.pagination.pages,
    hasPreviousPage: response.meta.pagination.page > 1,
  };
}

/**
 * Get a single article by ID for review
 *
 * @param articleId - UUID of the article
 * @returns Full article details
 *
 * @throws {ApiError} 404 if article not found
 *
 * @example
 * const article = await getArticleForReview('abc-123');
 */
export async function getArticleForReview(articleId: string): Promise<PendingArticle> {
  const response = await apiClient.get<{ data: PendingArticle }>(`/admin/articles/${articleId}`);
  return response.data;
}

// ============================================================================
// Review Actions
// ============================================================================

/**
 * Approve an article
 *
 * Marks article as approved, allowing it to be released for publication.
 *
 * @param articleId - UUID of the article
 * @param note - Optional admin note explaining approval
 * @returns Updated article
 *
 * @throws {ApiError} 404 if article not found, 400 if already approved
 *
 * @example
 * await approveArticle('abc-123', 'AI categorization looks accurate');
 */
export async function approveArticle(
  articleId: string,
  note?: string
): Promise<PendingArticle> {
  const action: ReviewAction = {
    articleId,
    action: 'approve',
    note,
  };

  const response = await apiClient.post<{ data: PendingArticle }>(
    `/admin/articles/${articleId}/approve`,
    action
  );

  return response.data;
}

/**
 * Reject an article
 *
 * Marks article as rejected, removing it from publication workflow.
 *
 * @param articleId - UUID of the article
 * @param note - Optional admin note explaining rejection
 * @returns Updated article
 *
 * @throws {ApiError} 404 if article not found, 400 if already rejected
 *
 * @example
 * await rejectArticle('abc-123', 'Not cybersecurity related');
 */
export async function rejectArticle(
  articleId: string,
  note?: string
): Promise<PendingArticle> {
  const action: ReviewAction = {
    articleId,
    action: 'reject',
    note,
  };

  const response = await apiClient.post<{ data: PendingArticle }>(
    `/admin/articles/${articleId}/reject`,
    action
  );

  return response.data;
}

// ============================================================================
// Release for Publication
// ============================================================================

/**
 * Release an approved article for publication
 *
 * Publishes an approved article to the threat feed.
 * Optionally override AI-assigned category/severity.
 *
 * @param articleId - UUID of the article
 * @param overrides - Optional manual category/severity overrides
 * @returns Published article
 *
 * @throws {ApiError} 404 if article not found, 400 if not approved
 *
 * @example
 * // Release with AI categorization
 * await releaseArticle('abc-123');
 *
 * // Release with manual override
 * await releaseArticle('abc-123', {
 *   overrideCategory: ThreatCategory.RANSOMWARE,
 *   overrideSeverity: 'critical'
 * });
 */
export async function releaseArticle(
  articleId: string,
  overrides?: Omit<ReleaseAction, 'articleId'>
): Promise<PendingArticle> {
  const payload: ReleaseAction = {
    articleId,
    ...overrides,
  };

  const response = await apiClient.post<{ data: PendingArticle }>(
    `/admin/articles/${articleId}/release`,
    payload
  );

  return response.data;
}

// ============================================================================
// Admin Statistics
// ============================================================================

/**
 * Get admin dashboard statistics
 *
 * @returns Admin statistics summary
 *
 * @throws {ApiError} 401 if not authenticated, 403 if not admin
 *
 * @example
 * const stats = await getAdminStats();
 * console.log(`${stats.pendingArticles} articles awaiting review`);
 */
export async function getAdminStats(): Promise<AdminStats> {
  const response = await apiClient.get<{ data: AdminStats }>('/admin/stats');
  return response.data;
}

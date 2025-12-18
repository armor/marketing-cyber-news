/**
 * Approval API Service
 *
 * Type-safe API functions for article approval workflow.
 * All functions use apiClient with Bearer token authentication.
 */

import { apiClient } from './client';
import type {
  ApprovalQueueResponse,
  ApprovalHistoryResponse,
  ApprovalActionResponse,
  ApproveRequest,
  RejectRequest,
  UpdateRoleRequest,
  UserResponse,
} from '@/types/approval';

const API_PREFIX = '';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Queue query parameters
 */
interface QueueParams {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: 'created_at' | 'severity' | 'category';
  readonly sortOrder?: 'asc' | 'desc';
  readonly categoryId?: string;
  readonly severity?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

/**
 * Fetch approval queue for current user's role
 */
export async function fetchApprovalQueue(
  params?: QueueParams
): Promise<ApprovalQueueResponse> {
  const queryParams: Record<string, string> = {};

  if (params?.page) queryParams.page = String(params.page);
  if (params?.pageSize) queryParams.page_size = String(params.pageSize);
  if (params?.sortBy) queryParams.sort_by = params.sortBy;
  if (params?.sortOrder) queryParams.sort_order = params.sortOrder;
  if (params?.categoryId) queryParams.category_id = params.categoryId;
  if (params?.severity) queryParams.severity = params.severity;
  if (params?.dateFrom) queryParams.date_from = params.dateFrom;
  if (params?.dateTo) queryParams.date_to = params.dateTo;

  return apiClient.get<ApprovalQueueResponse>(
    `${API_PREFIX}/approvals/queue`,
    queryParams
  );
}

/**
 * Fetch approval history for an article
 */
export async function fetchApprovalHistory(
  articleId: string
): Promise<ApprovalHistoryResponse> {
  return apiClient.get<ApprovalHistoryResponse>(
    `${API_PREFIX}/articles/${articleId}/approval-history`
  );
}

/**
 * Approve article at current user's gate
 */
export async function approveArticle(
  articleId: string,
  request?: ApproveRequest
): Promise<ApprovalActionResponse> {
  return apiClient.post<ApprovalActionResponse>(
    `${API_PREFIX}/articles/${articleId}/approve`,
    request
  );
}

/**
 * Reject article with reason
 */
export async function rejectArticle(
  articleId: string,
  request: RejectRequest
): Promise<ApprovalActionResponse> {
  return apiClient.post<ApprovalActionResponse>(
    `${API_PREFIX}/articles/${articleId}/reject`,
    request
  );
}

/**
 * Release approved article to public
 * Only available to admin/ciso roles
 */
export async function releaseArticle(
  articleId: string
): Promise<ApprovalActionResponse> {
  return apiClient.post<ApprovalActionResponse>(
    `${API_PREFIX}/articles/${articleId}/release`
  );
}

/**
 * Reset rejected article back to pending_marketing
 * Only available to admin role
 */
export async function resetArticle(
  articleId: string
): Promise<ApprovalActionResponse> {
  return apiClient.post<ApprovalActionResponse>(
    `${API_PREFIX}/articles/${articleId}/reset`
  );
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string,
  request: UpdateRoleRequest
): Promise<UserResponse> {
  return apiClient.put<UserResponse>(
    `${API_PREFIX}/users/${userId}/role`,
    request
  );
}

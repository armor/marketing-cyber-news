/**
 * Claims Library API Service
 *
 * Type-safe API functions for managing marketing claims, disclaimers,
 * and do-not-say items. Supports CRUD operations, approval workflow,
 * and content validation.
 */

import { apiClient } from './client';
import type {
  Claim,
  ClaimListResponse,
  ClaimFilter,
  CreateClaimRequest,
  UpdateClaimRequest,
  ApproveClaimRequest,
  RejectClaimRequest,
  ValidateContentRequest,
  ClaimValidationResult,
} from '@/types/claims';

// API Prefix - aligned with backend router.go routes
const CLAIMS_PREFIX = '/claims';

// ============================================================================
// Claims CRUD API
// ============================================================================

/**
 * Raw backend response format for claims list
 * Backend uses 'meta' instead of 'pagination'
 */
interface RawClaimListResponse {
  readonly data: readonly Claim[];
  readonly meta: {
    readonly page: number;
    readonly page_size: number;
    readonly total_count: number;
    readonly total_pages: number;
  };
}

/**
 * Fetch list of claims with optional filters
 */
export async function getClaims(
  filter?: ClaimFilter
): Promise<ClaimListResponse> {
  const queryParams: Record<string, string> = {};

  if (filter?.claim_type) queryParams.claim_type = filter.claim_type;
  if (filter?.category) queryParams.category = filter.category;
  if (filter?.approval_status) queryParams.approval_status = filter.approval_status;
  if (filter?.tags?.length) queryParams.tags = filter.tags.join(',');
  if (filter?.search) queryParams.search = filter.search;
  if (filter?.include_expired) queryParams.include_expired = 'true';
  if (filter?.page) queryParams.page = String(filter.page);
  if (filter?.page_size) queryParams.page_size = String(filter.page_size);

  const raw = await apiClient.get<RawClaimListResponse>(
    CLAIMS_PREFIX,
    queryParams
  );

  // Transform backend 'meta' to frontend format
  return {
    data: [...raw.data],
    meta: {
      page: raw.meta.page,
      page_size: raw.meta.page_size,
      total_count: raw.meta.total_count,
      total_pages: raw.meta.total_pages,
    },
  };
}

/**
 * Fetch a single claim by ID
 */
export async function getClaim(id: string): Promise<Claim> {
  const response = await apiClient.get<{ data: Claim }>(
    `${CLAIMS_PREFIX}/${id}`
  );
  return response.data;
}

/**
 * Create a new claim
 */
export async function createClaim(
  request: CreateClaimRequest
): Promise<Claim> {
  const response = await apiClient.post<{ data: Claim }>(
    CLAIMS_PREFIX,
    request
  );
  return response.data;
}

/**
 * Update an existing claim
 */
export async function updateClaim(
  id: string,
  request: UpdateClaimRequest
): Promise<Claim> {
  const response = await apiClient.put<{ data: Claim }>(
    `${CLAIMS_PREFIX}/${id}`,
    request
  );
  return response.data;
}

/**
 * Delete a claim
 */
export async function deleteClaim(id: string): Promise<void> {
  await apiClient.delete(`${CLAIMS_PREFIX}/${id}`);
}

// ============================================================================
// Claims Approval Workflow API
// ============================================================================

/**
 * Approve a claim (requires compliance access)
 */
export async function approveClaim(
  id: string,
  request?: ApproveClaimRequest
): Promise<Claim> {
  const response = await apiClient.post<{ data: Claim }>(
    `${CLAIMS_PREFIX}/${id}/approve`,
    request ?? {}
  );
  return response.data;
}

/**
 * Reject a claim (requires compliance access)
 */
export async function rejectClaim(
  id: string,
  request: RejectClaimRequest
): Promise<Claim> {
  const response = await apiClient.post<{ data: Claim }>(
    `${CLAIMS_PREFIX}/${id}/reject`,
    request
  );
  return response.data;
}

// ============================================================================
// Claims Categories API
// ============================================================================

/**
 * Fetch all claim categories
 */
export async function getClaimCategories(): Promise<string[]> {
  const response = await apiClient.get<{ data: string[] }>(
    `${CLAIMS_PREFIX}/categories`
  );
  return response.data;
}

// ============================================================================
// Claims Search API
// ============================================================================

/**
 * Search claims by text
 */
export async function searchClaims(
  query: string,
  limit?: number
): Promise<Claim[]> {
  const queryParams: Record<string, string> = { q: query };
  if (limit) queryParams.limit = String(limit);

  const response = await apiClient.get<{ data: Claim[] }>(
    `${CLAIMS_PREFIX}/search`,
    queryParams
  );
  return response.data;
}

// ============================================================================
// Content Validation API
// ============================================================================

/**
 * Validate content against do-not-say items
 * Returns violations if any forbidden phrases are found
 */
export async function validateContent(
  request: ValidateContentRequest
): Promise<ClaimValidationResult> {
  const response = await apiClient.post<{ data: ClaimValidationResult }>(
    `${CLAIMS_PREFIX}/validate`,
    request
  );
  return response.data;
}

// ============================================================================
// Usage Tracking API
// ============================================================================

/**
 * Record usage of a claim
 */
export async function recordClaimUsage(id: string): Promise<void> {
  await apiClient.post(`${CLAIMS_PREFIX}/${id}/usage`, {});
}

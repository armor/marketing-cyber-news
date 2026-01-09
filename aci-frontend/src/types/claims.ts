// Claims Library Types
// For managing marketing claims, disclaimers, and do-not-say items

// ============================================
// ENUMS
// ============================================

export type ClaimType = 'claim' | 'disclaimer' | 'do_not_say';

export type ClaimApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

// ============================================
// CORE INTERFACES
// ============================================

export interface Claim {
  readonly id: string;
  readonly claim_text: string;
  readonly claim_type: ClaimType;
  readonly category: string;
  readonly approval_status: ClaimApprovalStatus;
  readonly approved_by?: string;
  readonly approved_at?: string;
  readonly expires_at?: string;
  readonly rejection_reason?: string;
  readonly source_reference?: string;
  readonly usage_count: number;
  readonly last_used_at?: string;
  readonly tags: string[];
  readonly notes?: string;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly is_expired: boolean;
  readonly is_usable: boolean;
}

export interface ClaimListItem extends Claim {
  // Extended fields for list view if needed
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateClaimRequest {
  claim_text: string;
  claim_type: ClaimType;
  category: string;
  source_reference?: string;
  tags?: string[];
  notes?: string;
  expires_at?: string; // ISO 8601 format
}

export interface UpdateClaimRequest {
  claim_text: string;
  claim_type: ClaimType;
  category: string;
  source_reference?: string;
  tags?: string[];
  notes?: string;
  expires_at?: string; // ISO 8601 format
}

export interface ApproveClaimRequest {
  expires_at?: string; // ISO 8601 format
  notes?: string;
}

export interface RejectClaimRequest {
  reason: string;
}

export interface ValidateContentRequest {
  content: string;
  block_id?: string;
}

// ============================================
// FILTER AND PAGINATION
// ============================================

export interface ClaimFilter {
  claim_type?: ClaimType;
  category?: string;
  approval_status?: ClaimApprovalStatus;
  tags?: string[];
  search?: string;
  include_expired?: boolean;
  page?: number;
  page_size?: number;
}

export interface ClaimListResponse {
  data: Claim[];
  meta: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  };
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface ClaimViolation {
  claim_id: string;
  claim_text: string;
  matched_phrase: string;
  block_id?: string;
  position?: {
    start: number;
    end: number;
  };
}

export interface ClaimValidationResult {
  is_valid: boolean;
  violations: ClaimViolation[];
}

// ============================================
// UI HELPER TYPES
// ============================================

export interface ClaimCategory {
  name: string;
  count?: number;
}

export interface ClaimStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  expiring_soon: number;
}

// Claim type display names
export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  claim: 'Marketing Claim',
  disclaimer: 'Disclaimer',
  do_not_say: 'Do Not Say',
};

// Claim type colors for badges
export const CLAIM_TYPE_COLORS: Record<ClaimType, string> = {
  claim: 'blue',
  disclaimer: 'orange',
  do_not_say: 'red',
};

// Approval status display names
export const APPROVAL_STATUS_LABELS: Record<ClaimApprovalStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

// Approval status colors for badges
export const APPROVAL_STATUS_COLORS: Record<ClaimApprovalStatus, string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  expired: 'gray',
};

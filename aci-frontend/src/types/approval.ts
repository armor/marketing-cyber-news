/**
 * Article Approval Workflow Types
 * Strict TypeScript definitions matching backend OpenAPI spec and domain model
 */

// ============================================================================
// Enums and Union Types
// ============================================================================

/**
 * User roles with approval permissions
 * Extended from base UserRole to include approval-specific roles
 */
export type UserRole =
  | 'user'
  | 'marketing'
  | 'branding'
  | 'soc_level_1'
  | 'soc_level_3'
  | 'ciso'
  | 'admin'
  | 'super_admin';

/**
 * Article approval status representing current workflow state
 */
export type ApprovalStatus =
  | 'pending_marketing'
  | 'pending_branding'
  | 'pending_soc_l1'
  | 'pending_soc_l3'
  | 'pending_ciso'
  | 'approved'
  | 'rejected'
  | 'released';

/**
 * Individual approval gates in the workflow
 */
export type ApprovalGate =
  | 'marketing'
  | 'branding'
  | 'soc_l1'
  | 'soc_l3'
  | 'ciso';

/**
 * Article severity levels
 */
export type ArticleSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'informational';

// ============================================================================
// Constants
// ============================================================================

/**
 * Permission levels for each role (1-8 scale)
 */
export const ROLE_PERMISSIONS: Record<UserRole, number> = {
  user: 1,
  marketing: 2,
  branding: 3,
  soc_level_1: 4,
  soc_level_3: 5,
  ciso: 6,
  admin: 7,
  super_admin: 8,
} as const;

/**
 * Human-readable labels for approval statuses
 */
export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending_marketing: 'Pending Marketing',
  pending_branding: 'Pending Branding',
  pending_soc_l1: 'Pending SOC L1',
  pending_soc_l3: 'Pending SOC L3',
  pending_ciso: 'Pending CISO',
  approved: 'Approved',
  rejected: 'Rejected',
  released: 'Released',
} as const;

/**
 * Human-readable labels for approval gates
 */
export const GATE_LABELS: Record<ApprovalGate, string> = {
  marketing: 'Marketing',
  branding: 'Branding',
  soc_l1: 'SOC Level 1',
  soc_l3: 'SOC Level 3',
  ciso: 'CISO',
} as const;

/**
 * Ordered list of gates in the approval workflow
 */
export const GATE_ORDER: readonly ApprovalGate[] = [
  'marketing',
  'branding',
  'soc_l1',
  'soc_l3',
  'ciso',
] as const;

/**
 * Mapping of user roles to their corresponding approval gate
 */
export const ROLE_TO_GATE: Record<UserRole, ApprovalGate | null> = {
  user: null,
  marketing: 'marketing',
  branding: 'branding',
  soc_level_1: 'soc_l1',
  soc_level_3: 'soc_l3',
  ciso: 'ciso',
  admin: null, // Can approve all gates
  super_admin: null, // Can approve all gates
} as const;

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Category information
 */
export interface Category {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly color?: string;
}

/**
 * Source information
 */
export interface Source {
  readonly id: string;
  readonly name: string;
  readonly url: string;
}

/**
 * Article with approval workflow fields
 */
export interface ArticleForApproval {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly summary?: string;
  readonly content?: string;
  readonly category: Category;
  readonly source: Source;
  readonly severity: ArticleSeverity;
  readonly tags: readonly string[];
  readonly cves: readonly string[];
  readonly vendors: readonly string[];
  readonly approvalStatus: ApprovalStatus;
  readonly rejected: boolean;
  readonly createdAt: string; // ISO 8601
  readonly publishedAt?: string; // ISO 8601
  readonly approvalProgress: ApprovalProgress;
}

/**
 * Individual gate approval record
 */
export interface ArticleApproval {
  readonly id: string;
  readonly articleId: string;
  readonly gate: ApprovalGate;
  readonly approvedBy: string;
  readonly approverName?: string;
  readonly approverEmail?: string;
  readonly approvedAt: string; // ISO 8601
  readonly notes?: string;
}

/**
 * Approval progress tracking
 */
export interface ApprovalProgress {
  readonly completedGates: readonly ApprovalGate[];
  readonly currentGate: ApprovalGate | null;
  readonly pendingGates: readonly ApprovalGate[];
  readonly totalGates: number;
  readonly completedCount: number;
}

/**
 * Rejection details
 */
export interface RejectionDetails {
  readonly reason: string;
  readonly rejectedBy: string;
  readonly rejectorName?: string;
  readonly rejectedAt: string; // ISO 8601
}

/**
 * Release details
 */
export interface ReleaseDetails {
  readonly releasedBy: string;
  readonly releaserName?: string;
  readonly releasedAt: string; // ISO 8601
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Pagination metadata
 */
export interface Pagination {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

/**
 * Approval queue response
 */
export interface ApprovalQueueResponse {
  readonly data: readonly ArticleForApproval[];
  readonly pagination: Pagination;
  readonly meta: {
    readonly userRole: UserRole;
    readonly targetGate: ApprovalGate | null;
    readonly queueCount: number;
  };
}

/**
 * Approval history response
 */
export interface ApprovalHistoryResponse {
  readonly articleId: string;
  readonly currentStatus: ApprovalStatus;
  readonly rejected: boolean;
  readonly rejectionDetails?: RejectionDetails;
  readonly releaseDetails?: ReleaseDetails;
  readonly approvals: readonly ArticleApproval[];
  readonly progress: ApprovalProgress;
}

/**
 * Approval action response
 */
export interface ApprovalActionResponse {
  readonly success: boolean;
  readonly message: string;
  readonly article: {
    readonly id: string;
    readonly approvalStatus: ApprovalStatus;
    readonly rejected: boolean;
  };
}

/**
 * Approve request body
 */
export interface ApproveRequest {
  readonly notes?: string;
}

/**
 * Reject request body
 */
export interface RejectRequest {
  readonly reason: string;
}

/**
 * Update role request body
 */
export interface UpdateRoleRequest {
  readonly role: UserRole;
}

/**
 * User response
 */
export interface UserResponse {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly updatedAt: string; // ISO 8601
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a user role can approve a specific gate
 */
export function canApproveGate(role: UserRole, gate: ApprovalGate): boolean {
  // Admin and super_admin can approve all gates
  if (role === 'admin' || role === 'super_admin') {
    return true;
  }

  // Check if role's gate matches the target gate
  const roleGate = ROLE_TO_GATE[role];
  return roleGate === gate;
}

/**
 * Check if a user role can release articles
 * Only admin, ciso, and super_admin can release
 */
export function canRelease(role: UserRole): boolean {
  return role === 'admin' || role === 'ciso' || role === 'super_admin';
}

/**
 * Get the next status after approval
 */
export function getNextStatus(current: ApprovalStatus): ApprovalStatus | null {
  const statusProgression: Record<ApprovalStatus, ApprovalStatus | null> = {
    pending_marketing: 'pending_branding',
    pending_branding: 'pending_soc_l1',
    pending_soc_l1: 'pending_soc_l3',
    pending_soc_l3: 'pending_ciso',
    pending_ciso: 'approved',
    approved: null, // Must be released manually
    rejected: null, // Terminal state (unless reset)
    released: null, // Terminal state
  };

  return statusProgression[current];
}

/**
 * Get the gate required for a given status
 */
export function getStatusGate(status: ApprovalStatus): ApprovalGate | null {
  const statusToGate: Record<ApprovalStatus, ApprovalGate | null> = {
    pending_marketing: 'marketing',
    pending_branding: 'branding',
    pending_soc_l1: 'soc_l1',
    pending_soc_l3: 'soc_l3',
    pending_ciso: 'ciso',
    approved: null,
    rejected: null,
    released: null,
  };

  return statusToGate[status];
}

/**
 * Get user's target gate based on their role
 */
export function getUserGate(role: UserRole): ApprovalGate | null {
  return ROLE_TO_GATE[role];
}

/**
 * Check if a role can reset rejected articles
 * Only admin can reset
 */
export function canReset(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

/**
 * Check if an article is in a pending state
 */
export function isPendingStatus(status: ApprovalStatus): boolean {
  return status.startsWith('pending_');
}

/**
 * Check if an article is approved and ready for release
 */
export function isReadyForRelease(status: ApprovalStatus): boolean {
  return status === 'approved';
}

/**
 * Check if an article is released
 */
export function isReleased(status: ApprovalStatus): boolean {
  return status === 'released';
}

/**
 * Check if an article is rejected
 */
export function isRejected(status: ApprovalStatus): boolean {
  return status === 'rejected';
}

/**
 * Get progress percentage for approval workflow
 */
export function getProgressPercentage(progress: ApprovalProgress): number {
  if (progress.totalGates === 0) {
    return 0;
  }
  return Math.round((progress.completedCount / progress.totalGates) * 100);
}

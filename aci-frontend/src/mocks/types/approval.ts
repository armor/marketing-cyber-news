/**
 * Approval Workflow Types
 * TypeScript types matching OpenAPI spec
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

export type ApprovalGate =
  | 'marketing'
  | 'branding'
  | 'soc_l1'
  | 'soc_l3'
  | 'ciso';

export type UserRole =
  | 'user'
  | 'marketing'
  | 'branding'
  | 'soc_level_1'
  | 'soc_level_3'
  | 'ciso'
  | 'admin'
  | 'super_admin';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly color: string;
}

export interface Source {
  readonly id: string;
  readonly name: string;
  readonly url: string;
}

export interface ApprovalProgress {
  readonly completedGates: readonly ApprovalGate[];
  readonly currentGate: ApprovalGate;
  readonly pendingGates: readonly ApprovalGate[];
  readonly totalGates: number;
  readonly completedCount: number;
}

export interface ArticleForApproval {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly summary?: string;
  readonly content?: string;
  readonly category?: Category;
  readonly source?: Source;
  readonly severity?: Severity;
  readonly tags?: readonly string[];
  readonly cves?: readonly string[];
  readonly vendors?: readonly string[];
  readonly approvalStatus: ApprovalStatus;
  readonly rejected: boolean;
  readonly createdAt: string;
  readonly publishedAt?: string;
  readonly approvalProgress?: ApprovalProgress;
}

export interface ArticleApproval {
  readonly id: string;
  readonly articleId: string;
  readonly gate: ApprovalGate;
  readonly approvedBy: string;
  readonly approverName: string;
  readonly approverEmail: string;
  readonly approvedAt: string;
  readonly notes?: string;
}

export interface Pagination {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface ApprovalQueueResponse {
  readonly data: readonly ArticleForApproval[];
  readonly pagination: Pagination;
  readonly meta: {
    readonly userRole: UserRole;
    readonly targetGate: ApprovalGate;
    readonly queueCount: number;
  };
}

export interface ApproveRequest {
  readonly notes?: string;
}

export interface RejectRequest {
  readonly reason: string;
}

export interface UpdateRoleRequest {
  readonly role: UserRole;
}

export interface ApprovalActionResponse {
  readonly success: boolean;
  readonly message: string;
  readonly article: {
    readonly id: string;
    readonly approvalStatus: ApprovalStatus;
    readonly rejected: boolean;
  };
}

export interface ApprovalHistoryResponse {
  readonly articleId: string;
  readonly currentStatus: ApprovalStatus;
  readonly rejected: boolean;
  readonly rejectionDetails?: {
    readonly reason: string;
    readonly rejectedBy: string;
    readonly rejectorName: string;
    readonly rejectedAt: string;
  };
  readonly releaseDetails?: {
    readonly releasedBy: string;
    readonly releaserName: string;
    readonly releasedAt: string;
  };
  readonly approvals: readonly ArticleApproval[];
  readonly progress: ApprovalProgress;
}

export interface UserResponse {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly updatedAt: string;
}

export interface ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
}

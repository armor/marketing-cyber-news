/**
 * Approval Workflow Mock Factory
 * Creates mock data for approval workflow testing
 */

import type {
  ApprovalStatus,
  ApprovalGate,
  UserRole,
  ArticleForApproval,
  ApprovalProgress,
  ApprovalQueueResponse,
  ApprovalHistoryResponse,
  ArticleApproval,
  ApprovalActionResponse,
} from '../types/approval';

/**
 * Create mock article for approval with configurable state
 */
export function createMockArticleForApproval(
  overrides?: Partial<ArticleForApproval>
): ArticleForApproval {
  const id = overrides?.id ?? `article-${generateId()}`;
  const approvalStatus = overrides?.approvalStatus ?? 'pending_marketing';
  const rejected = overrides?.rejected ?? false;

  const defaultArticle: ArticleForApproval = {
    id,
    title: 'Critical Vulnerability in Apache Struts',
    slug: 'critical-vulnerability-apache-struts',
    summary:
      'A critical remote code execution vulnerability has been discovered in Apache Struts 2.x versions.',
    content:
      'Full article content discussing the Apache Struts vulnerability, impact analysis, and mitigation strategies.',
    category: {
      id: 'cat-1',
      name: 'Vulnerabilities',
      slug: 'vulnerabilities',
      color: '#ef4444',
    },
    source: {
      id: 'source-1',
      name: 'CISA',
      url: 'https://cisa.gov',
    },
    severity: 'critical',
    tags: ['apache', 'rce', 'java'],
    cves: ['CVE-2024-12345'],
    vendors: ['Apache'],
    approvalStatus,
    rejected,
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    approvalProgress: createMockApprovalProgress(approvalStatus),
  };

  return { ...defaultArticle, ...overrides };
}

/**
 * Create mock approval queue response
 */
export function createMockApprovalQueueResponse(
  count = 5,
  options?: {
    userRole?: UserRole;
    targetGate?: ApprovalGate;
    page?: number;
    pageSize?: number;
  }
): ApprovalQueueResponse {
  const userRole = options?.userRole ?? 'marketing';
  const targetGate = options?.targetGate ?? 'marketing';
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;

  const articles: ArticleForApproval[] = [];

  for (let i = 0; i < count; i++) {
    articles.push(
      createMockArticleForApproval({
        id: `article-${i + 1}`,
        title: `Article ${i + 1} Pending Approval`,
        approvalStatus: `pending_${targetGate}` as ApprovalStatus,
      })
    );
  }

  return {
    data: articles,
    pagination: {
      page,
      pageSize,
      totalItems: count,
      totalPages: Math.ceil(count / pageSize),
    },
    meta: {
      userRole,
      targetGate,
      queueCount: count,
    },
  };
}

/**
 * Create mock approval history
 */
export function createMockApprovalHistory(
  articleId: string,
  options?: {
    gates?: ApprovalGate[];
    rejected?: boolean;
    released?: boolean;
  }
): ApprovalHistoryResponse {
  const gates = options?.gates ?? ['marketing', 'branding'];
  const rejected = options?.rejected ?? false;
  const released = options?.released ?? false;

  const approvals: ArticleApproval[] = gates.map((gate, index) => ({
    id: `approval-${index + 1}`,
    articleId,
    gate,
    approvedBy: `user-${index + 1}`,
    approverName: `${gate.charAt(0).toUpperCase() + gate.slice(1)} Approver`,
    approverEmail: `${gate}@example.com`,
    approvedAt: new Date(Date.now() - (gates.length - index) * 86400000).toISOString(),
    notes: `Approved at ${gate} gate`,
  }));

  let currentStatus: ApprovalStatus;

  if (rejected) {
    currentStatus = 'rejected';
  } else if (released) {
    currentStatus = 'released';
  } else if (gates.length === 5) {
    currentStatus = 'approved';
  } else {
    const nextGate = getNextGate(gates[gates.length - 1]);
    currentStatus = nextGate ? (`pending_${nextGate}` as ApprovalStatus) : 'approved';
  }

  const response: ApprovalHistoryResponse = {
    articleId,
    currentStatus,
    rejected,
    approvals,
    progress: createMockApprovalProgress(currentStatus, gates),
    ...(rejected && {
      rejectionDetails: {
        reason: 'Content does not meet quality standards',
        rejectedBy: 'user-rejector',
        rejectorName: 'Quality Reviewer',
        rejectedAt: new Date().toISOString(),
      },
    }),
    ...(released && {
      releaseDetails: {
        releasedBy: 'user-releaser',
        releaserName: 'Admin User',
        releasedAt: new Date().toISOString(),
      },
    }),
  };

  return response;
}

/**
 * Create mock approval action response
 */
export function createMockApprovalActionResponse(
  success = true,
  articleId?: string,
  newStatus?: ApprovalStatus
): ApprovalActionResponse {
  return {
    success,
    message: success ? 'Action completed successfully' : 'Action failed',
    article: {
      id: articleId ?? `article-${generateId()}`,
      approvalStatus: newStatus ?? 'approved',
      rejected: newStatus === 'rejected',
    },
  };
}

/**
 * Create mock approval progress based on status
 */
function createMockApprovalProgress(
  status: ApprovalStatus,
  completedGates: ApprovalGate[] = []
): ApprovalProgress {
  const allGates: ApprovalGate[] = [
    'marketing',
    'branding',
    'soc_l1',
    'soc_l3',
    'ciso',
  ];

  let completed: ApprovalGate[];
  let currentGate: ApprovalGate | null;

  if (status === 'rejected' || status === 'approved' || status === 'released') {
    completed = completedGates.length > 0 ? completedGates : allGates;
    currentGate = null;
  } else if (status.startsWith('pending_')) {
    const gateName = status.replace('pending_', '') as ApprovalGate;
    const gateIndex = allGates.indexOf(gateName);
    completed = gateIndex > 0 ? allGates.slice(0, gateIndex) : [];
    currentGate = gateName;
  } else {
    completed = [];
    currentGate = 'marketing';
  }

  const pending = currentGate
    ? allGates.slice(allGates.indexOf(currentGate) + 1)
    : [];

  return {
    completedGates: completed,
    currentGate: currentGate ?? allGates[allGates.length - 1],
    pendingGates: pending,
    totalGates: allGates.length,
    completedCount: completed.length,
  };
}

/**
 * Get next gate in approval sequence
 */
function getNextGate(currentGate: ApprovalGate): ApprovalGate | null {
  const sequence: ApprovalGate[] = [
    'marketing',
    'branding',
    'soc_l1',
    'soc_l3',
    'ciso',
  ];

  const currentIndex = sequence.indexOf(currentGate);

  if (currentIndex === -1 || currentIndex === sequence.length - 1) {
    return null;
  }

  return sequence[currentIndex + 1];
}

/**
 * Generate random ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

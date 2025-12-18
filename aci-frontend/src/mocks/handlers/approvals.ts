/**
 * Mock Approval Handlers
 * MSW handlers for article approval workflow endpoints
 */

import { http, HttpResponse, delay } from 'msw';
import type {
  ApprovalQueueResponse,
  ApprovalHistoryResponse,
  ApprovalActionResponse,
  ApprovalGate,
  ApprovalStatus,
} from '../types/approval';
import {
  createMockApprovalQueueResponse,
  createMockApprovalHistory,
  createMockApprovalActionResponse,
} from '../factories/approval-factory';

// ============================================================================
// Configuration Constants
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ============================================================================
// In-Memory State Management
// ============================================================================

interface ArticleState {
  id: string;
  status: ApprovalStatus;
  rejected: boolean;
  completedGates: ApprovalGate[];
}

const articleStates = new Map<string, ArticleState>();

/**
 * Initialize article state
 */
function getArticleState(articleId: string): ArticleState {
  if (!articleStates.has(articleId)) {
    articleStates.set(articleId, {
      id: articleId,
      status: 'pending_marketing',
      rejected: false,
      completedGates: [],
    });
  }
  return articleStates.get(articleId)!;
}

/**
 * Get next gate in approval sequence
 */
function getNextGate(currentGate: ApprovalGate): ApprovalGate | null {
  const sequence: ApprovalGate[] = ['marketing', 'branding', 'soc_l1', 'soc_l3', 'ciso'];
  const currentIndex = sequence.indexOf(currentGate);

  if (currentIndex === -1 || currentIndex === sequence.length - 1) {
    return null;
  }

  return sequence[currentIndex + 1];
}

/**
 * Get current gate from status
 */
function getCurrentGate(status: ApprovalStatus): ApprovalGate | null {
  if (status.startsWith('pending_')) {
    return status.replace('pending_', '') as ApprovalGate;
  }
  return null;
}

// ============================================================================
// Error Simulation Helpers
// ============================================================================

/**
 * Check for error simulation query parameter
 */
function checkErrorSimulation(url: URL): ReturnType<typeof HttpResponse.json> | null {
  const errorCode = url.searchParams.get('error');

  if (errorCode === '403') {
    return HttpResponse.json(
      {
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'Your role does not have approval queue access',
        },
      },
      { status: 403 }
    );
  }

  if (errorCode === '404') {
    return HttpResponse.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      },
      { status: 404 }
    );
  }

  if (errorCode === '400') {
    return HttpResponse.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid request parameters',
        },
      },
      { status: 400 }
    );
  }

  return null;
}

// ============================================================================
// Approval API Handlers
// ============================================================================

export const approvalHandlers = [
  /**
   * GET /v1/approvals/queue
   * Get approval queue for current user's role
   *
   * Query params:
   * - page: number (default: 1)
   * - page_size: number (default: 20, max: 100)
   * - sort_by: 'created_at' | 'severity' | 'category' (default: 'created_at')
   * - sort_order: 'asc' | 'desc' (default: 'desc')
   * - category_id: string (optional)
   * - severity: 'critical' | 'high' | 'medium' | 'low' | 'informational' (optional)
   * - date_from: ISO date string (optional)
   * - date_to: ISO date string (optional)
   * - error: '400' | '403' | '404' (for testing error scenarios)
   */
  http.get('*/v1/approvals/queue', async ({ request }) => {
    await delay(300);

    const url = new URL(request.url);

    // Check for error simulation
    const errorResponse = checkErrorSimulation(url);
    if (errorResponse) {
      return errorResponse;
    }

    // Parse pagination parameters
    const pageParam = url.searchParams.get('page');
    const pageSizeParam = url.searchParams.get('page_size');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const pageSize = pageSizeParam
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSizeParam, 10)))
      : DEFAULT_PAGE_SIZE;

    // Parse filter parameters (currently unused but kept for future API enhancement)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const sortBy = url.searchParams.get('sort_by') || 'created_at';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const sortOrder = url.searchParams.get('sort_order') || 'desc';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const categoryId = url.searchParams.get('category_id') || undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const severity = url.searchParams.get('severity') || undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const dateFrom = url.searchParams.get('date_from') || undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const dateTo = url.searchParams.get('date_to') || undefined;

    // Mock: Create queue response for marketing role by default
    const queueResponse: ApprovalQueueResponse = createMockApprovalQueueResponse(15, {
      userRole: 'marketing',
      targetGate: 'marketing',
      page,
      pageSize,
    });

    return HttpResponse.json(queueResponse);
  }),

  /**
   * POST /v1/articles/:articleId/approve
   * Approve article at current gate
   *
   * Path params:
   * - articleId: string (article UUID)
   *
   * Optional body:
   * - notes: string (optional approval notes)
   *
   * Returns 400 if article not at correct gate or already rejected
   * Returns 403 if user role insufficient for gate
   * Returns 404 if article not found
   */
  http.post('*/v1/articles/:articleId/approve', async ({ params, request }) => {
    await delay(200);

    const { articleId } = params;
    const url = new URL(request.url);

    if (typeof articleId !== 'string') {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_ID',
            message: 'Article ID must be a string',
          },
        },
        { status: 400 }
      );
    }

    // Check for error simulation
    const errorResponse = checkErrorSimulation(url);
    if (errorResponse) {
      return errorResponse;
    }

    const state = getArticleState(articleId);

    // Check if already rejected
    if (state.rejected) {
      return HttpResponse.json(
        {
          error: {
            code: 'ALREADY_REJECTED',
            message: 'Article has already been rejected',
          },
        },
        { status: 400 }
      );
    }

    // Get current gate and advance to next
    const currentGate = getCurrentGate(state.status);
    if (!currentGate) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_STATE',
            message: 'Article is not in a pending state',
          },
        },
        { status: 400 }
      );
    }

    // Add current gate to completed gates
    if (!state.completedGates.includes(currentGate)) {
      state.completedGates.push(currentGate);
    }

    // Determine next status
    const nextGate = getNextGate(currentGate);
    const newStatus: ApprovalStatus = nextGate ? `pending_${nextGate}` : 'approved';

    state.status = newStatus;

    const response: ApprovalActionResponse = createMockApprovalActionResponse(
      true,
      articleId,
      newStatus
    );

    return HttpResponse.json(response);
  }),

  /**
   * POST /v1/articles/:articleId/reject
   * Reject article from pipeline
   *
   * Path params:
   * - articleId: string (article UUID)
   *
   * Required body:
   * - reason: string (rejection reason)
   *
   * Returns 400 if reason missing
   * Returns 403 if user role insufficient
   * Returns 404 if article not found
   */
  http.post('*/v1/articles/:articleId/reject', async ({ params, request }) => {
    await delay(200);

    const { articleId } = params;
    const url = new URL(request.url);

    if (typeof articleId !== 'string') {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_ID',
            message: 'Article ID must be a string',
          },
        },
        { status: 400 }
      );
    }

    // Check for error simulation
    const errorResponse = checkErrorSimulation(url);
    if (errorResponse) {
      return errorResponse;
    }

    // Parse request body
    const body = (await request.json()) as { reason?: string };

    if (!body.reason) {
      return HttpResponse.json(
        {
          error: {
            code: 'MISSING_REASON',
            message: 'Rejection reason is required',
          },
        },
        { status: 400 }
      );
    }

    const state = getArticleState(articleId);

    // Update state to rejected
    state.status = 'rejected';
    state.rejected = true;

    const response: ApprovalActionResponse = createMockApprovalActionResponse(
      true,
      articleId,
      'rejected'
    );

    return HttpResponse.json(response);
  }),

  /**
   * POST /v1/articles/:articleId/release
   * Release fully-approved article for public viewing
   *
   * Path params:
   * - articleId: string (article UUID)
   *
   * Returns 400 if article not fully approved
   * Returns 403 if user not authorized
   * Returns 404 if article not found
   */
  http.post('*/v1/articles/:articleId/release', async ({ params, request }) => {
    await delay(200);

    const { articleId } = params;
    const url = new URL(request.url);

    if (typeof articleId !== 'string') {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_ID',
            message: 'Article ID must be a string',
          },
        },
        { status: 400 }
      );
    }

    // Check for error simulation
    const errorResponse = checkErrorSimulation(url);
    if (errorResponse) {
      return errorResponse;
    }

    const state = getArticleState(articleId);

    // Check if article is approved
    if (state.status !== 'approved') {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_APPROVED',
            message: 'Article must pass all approval gates before release',
          },
        },
        { status: 400 }
      );
    }

    // Update state to released
    state.status = 'released';

    const response: ApprovalActionResponse = createMockApprovalActionResponse(
      true,
      articleId,
      'released'
    );

    return HttpResponse.json(response);
  }),

  /**
   * POST /v1/articles/:articleId/reset
   * Reset rejected article to initial state (admin only)
   *
   * Path params:
   * - articleId: string (article UUID)
   *
   * Returns 400 if article is not rejected
   * Returns 403 if user not admin
   * Returns 404 if article not found
   */
  http.post('*/v1/articles/:articleId/reset', async ({ params, request }) => {
    await delay(200);

    const { articleId } = params;
    const url = new URL(request.url);

    if (typeof articleId !== 'string') {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_ID',
            message: 'Article ID must be a string',
          },
        },
        { status: 400 }
      );
    }

    // Check for error simulation
    const errorResponse = checkErrorSimulation(url);
    if (errorResponse) {
      return errorResponse;
    }

    const state = getArticleState(articleId);

    // Check if article is rejected
    if (!state.rejected) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_REJECTED',
            message: 'Only rejected articles can be reset',
          },
        },
        { status: 400 }
      );
    }

    // Reset to initial state
    state.status = 'pending_marketing';
    state.rejected = false;
    state.completedGates = [];

    const response: ApprovalActionResponse = createMockApprovalActionResponse(
      true,
      articleId,
      'pending_marketing'
    );

    return HttpResponse.json(response);
  }),

  /**
   * GET /v1/articles/:articleId/approval-history
   * Get article approval history
   *
   * Path params:
   * - articleId: string (article UUID)
   *
   * Returns 404 if article not found
   */
  http.get('*/v1/articles/:articleId/approval-history', async ({ params, request }) => {
    await delay(200);

    const { articleId } = params;
    const url = new URL(request.url);

    if (typeof articleId !== 'string') {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_ID',
            message: 'Article ID must be a string',
          },
        },
        { status: 400 }
      );
    }

    // Check for error simulation
    const errorResponse = checkErrorSimulation(url);
    if (errorResponse) {
      return errorResponse;
    }

    const state = getArticleState(articleId);

    // Create history response based on current state
    const historyResponse: ApprovalHistoryResponse = createMockApprovalHistory(articleId, {
      gates: state.completedGates,
      rejected: state.rejected,
      released: state.status === 'released',
    });

    return HttpResponse.json(historyResponse);
  }),

  /**
   * PUT /v1/users/:userId/role
   * Update user role (admin only)
   *
   * Path params:
   * - userId: string (user UUID)
   *
   * Required body:
   * - role: 'marketing' | 'branding' | 'soc_l1' | 'soc_l3' | 'ciso' | 'admin' | 'viewer'
   *
   * Returns 400 if invalid role
   * Returns 403 if user not admin
   * Returns 404 if user not found
   */
  http.put('*/v1/users/:userId/role', async ({ params, request }) => {
    await delay(200);

    const { userId } = params;
    const url = new URL(request.url);

    if (typeof userId !== 'string') {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_ID',
            message: 'User ID must be a string',
          },
        },
        { status: 400 }
      );
    }

    // Check for error simulation
    const errorResponse = checkErrorSimulation(url);
    if (errorResponse) {
      return errorResponse;
    }

    // Parse request body
    const body = (await request.json()) as { role?: string };

    const validRoles = ['marketing', 'branding', 'soc_l1', 'soc_l3', 'ciso', 'admin', 'viewer'];

    if (!body.role || !validRoles.includes(body.role)) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_ROLE',
            message: `Role must be one of: ${validRoles.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Mock user response
    const userResponse = {
      success: true,
      data: {
        id: userId,
        role: body.role,
        updatedAt: new Date().toISOString(),
      },
    };

    return HttpResponse.json(userResponse);
  }),
];

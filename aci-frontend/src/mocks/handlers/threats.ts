/**
 * Mock Threat Handlers
 * MSW handlers for threat intelligence endpoints with filtering and pagination
 */

import { http, HttpResponse, delay } from 'msw';
import type { PaginatedResponse } from '../../types/api';
import type { Threat, Severity } from '../../types/threat';
import { ThreatCategory } from '../../types/threat';
import { mockThreats, getMockThreatById, filterThreats } from '../fixtures/threats';

// ============================================================================
// Configuration Constants
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse array query parameter (e.g., severity[]=critical&severity[]=high)
 */
function parseArrayParam(url: URL, paramName: string): string[] {
  const values: string[] = [];
  url.searchParams.forEach((value, key) => {
    if (key === paramName || key === `${paramName}[]`) {
      values.push(value);
    }
  });
  return values;
}

/**
 * Create paginated response wrapper
 */
function createPaginatedResponse<T>(
  items: readonly T[],
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = items.slice(start, end);

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

// ============================================================================
// Bookmark State Management (In-Memory)
// ============================================================================

const bookmarkedThreats = new Set<string>(
  mockThreats.filter((t) => t.isBookmarked).map((t) => t.id)
);

/**
 * Toggle bookmark state for a threat
 */
function toggleBookmark(threatId: string, bookmarked: boolean): void {
  if (bookmarked) {
    bookmarkedThreats.add(threatId);
  } else {
    bookmarkedThreats.delete(threatId);
  }
}

/**
 * Check if threat is bookmarked
 */
function isBookmarked(threatId: string): boolean {
  return bookmarkedThreats.has(threatId);
}

// ============================================================================
// Threat API Handlers
// ============================================================================

export const threatsHandlers = [
  /**
   * GET /v1/threats
   * List threats with filtering and pagination
   *
   * Query params:
   * - page: number (default: 1)
   * - perPage: number (default: 20, max: 100)
   * - severity[]: Severity[] (optional)
   * - category[]: ThreatCategory[] (optional)
   * - source[]: string[] (optional)
   * - search: string (optional)
   * - startDate: ISO date string (optional)
   * - endDate: ISO date string (optional)
   */
  http.get('*/v1/threats', async ({ request }) => {
    await delay(300);

    const url = new URL(request.url);

    // Parse pagination parameters
    const pageParam = url.searchParams.get('page');
    const perPageParam = url.searchParams.get('perPage');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const perPage = perPageParam
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(perPageParam, 10)))
      : DEFAULT_PAGE_SIZE;

    // Parse filter parameters
    const severityFilter = parseArrayParam(url, 'severity') as Severity[];
    const categoryFilter = parseArrayParam(url, 'category') as ThreatCategory[];
    const sourceFilter = parseArrayParam(url, 'source');
    const searchQuery = url.searchParams.get('search') || undefined;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    // Filter threats
    const filteredThreats = filterThreats({
      severity: severityFilter.length > 0 ? severityFilter : undefined,
      category: categoryFilter.length > 0 ? categoryFilter : undefined,
      source: sourceFilter.length > 0 ? sourceFilter : undefined,
      search: searchQuery,
      startDate,
      endDate,
    });

    // Update bookmark status
    const threatsWithBookmarks = filteredThreats.map((threat) => ({
      ...threat,
      isBookmarked: isBookmarked(threat.id),
    }));

    // Paginate results
    const paginatedData = createPaginatedResponse(threatsWithBookmarks, page, perPage);

    // Return response matching ThreatsApiResponse interface
    return HttpResponse.json({
      data: paginatedData.items,
      pagination: {
        page: paginatedData.page,
        perPage: paginatedData.pageSize,
        totalPages: paginatedData.totalPages,
        totalItems: paginatedData.total,
      },
    });
  }),

  /**
   * GET /v1/threats/:id
   * Get single threat detail with full content
   *
   * Path params:
   * - id: string (threat UUID)
   *
   * Returns 404 if threat not found
   */
  http.get('*/v1/threats/:id', async ({ params }) => {
    await delay(200);

    const { id } = params;

    if (typeof id !== 'string') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Threat ID must be a string',
          },
        },
        { status: 400 }
      );
    }

    const threat = getMockThreatById(id);

    if (!threat) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Threat not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    // Update bookmark status
    const threatWithBookmark: Threat = {
      ...threat,
      isBookmarked: isBookmarked(threat.id),
    };

    return HttpResponse.json({
      success: true,
      data: threatWithBookmark,
    });
  }),

  /**
   * POST /v1/threats/:id/bookmark
   * Add threat to user's bookmarks
   *
   * Path params:
   * - id: string (threat UUID)
   *
   * Returns 404 if threat not found
   * Returns 409 if already bookmarked
   */
  http.post('*/v1/threats/:id/bookmark', async ({ params }) => {
    await delay(150);

    const { id } = params;

    if (typeof id !== 'string') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Threat ID must be a string',
          },
        },
        { status: 400 }
      );
    }

    // Verify threat exists
    const threat = getMockThreatById(id);
    if (!threat) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Threat not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    // Check if already bookmarked
    if (isBookmarked(id)) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_BOOKMARKED',
            message: 'Threat is already bookmarked',
          },
        },
        { status: 409 }
      );
    }

    // Add bookmark
    toggleBookmark(id, true);

    return HttpResponse.json({
      success: true,
      data: { bookmarked: true },
    });
  }),

  /**
   * DELETE /v1/threats/:id/bookmark
   * Remove threat from user's bookmarks
   *
   * Path params:
   * - id: string (threat UUID)
   *
   * Returns 404 if threat not found
   * Returns 409 if not bookmarked
   */
  http.delete('*/v1/threats/:id/bookmark', async ({ params }) => {
    await delay(150);

    const { id } = params;

    if (typeof id !== 'string') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Threat ID must be a string',
          },
        },
        { status: 400 }
      );
    }

    // Verify threat exists
    const threat = getMockThreatById(id);
    if (!threat) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Threat not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    // Check if actually bookmarked
    if (!isBookmarked(id)) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_BOOKMARKED',
            message: 'Threat is not bookmarked',
          },
        },
        { status: 409 }
      );
    }

    // Remove bookmark
    toggleBookmark(id, false);

    return HttpResponse.json({
      success: true,
      data: { bookmarked: false },
    });
  }),
];

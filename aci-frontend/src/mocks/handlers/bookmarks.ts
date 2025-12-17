/**
 * Mock Bookmark Handlers
 * MSW handlers for bookmark management endpoints
 */

import { http, HttpResponse, delay } from 'msw';
import type { Bookmark } from '@/types/bookmark';

// ============================================================================
// In-Memory Bookmark Store
// ============================================================================

const mockBookmarks: Bookmark[] = [];

/**
 * Generate mock bookmark entity
 */
function createMockBookmark(threatId: string, userId: string = 'user-1'): Bookmark {
  return {
    id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    threatId,
    createdAt: new Date().toISOString(),
    note: null,
  };
}

/**
 * Find bookmark by threat ID
 */
function findBookmarkByThreatId(threatId: string): Bookmark | undefined {
  return mockBookmarks.find((b) => b.threatId === threatId);
}

// ============================================================================
// Bookmark API Handlers
// ============================================================================

export const bookmarkHandlers = [
  /**
   * GET /v1/bookmarks
   * List all bookmarks for current user
   *
   * Returns array of bookmarks
   */
  http.get('*/v1/bookmarks', async () => {
    await delay(200);

    return HttpResponse.json({
      success: true,
      data: mockBookmarks,
    });
  }),

  /**
   * POST /v1/bookmarks
   * Add a new bookmark
   *
   * Body:
   * - threatId: string (required)
   *
   * Returns created bookmark entity
   * Returns 400 if threatId missing
   * Returns 409 if already bookmarked
   */
  http.post('*/v1/bookmarks', async ({ request }) => {
    await delay(150);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_BODY',
            message: 'Invalid JSON body',
          },
        },
        { status: 400 }
      );
    }

    // Validate body
    if (
      !body ||
      typeof body !== 'object' ||
      !('threatId' in body) ||
      typeof body.threatId !== 'string'
    ) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'threatId is required',
          },
        },
        { status: 400 }
      );
    }

    const { threatId } = body as { threatId: string };

    // Check if already bookmarked
    const existing = findBookmarkByThreatId(threatId);
    if (existing) {
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

    // Create bookmark
    const bookmark = createMockBookmark(threatId);
    mockBookmarks.push(bookmark);

    return HttpResponse.json({
      success: true,
      data: bookmark,
    });
  }),

  /**
   * DELETE /v1/bookmarks/:threatId
   * Remove bookmark by threat ID
   *
   * Path params:
   * - threatId: string (threat UUID)
   *
   * Returns 204 on success
   * Returns 404 if bookmark not found
   */
  http.delete('*/v1/bookmarks/:threatId', async ({ params }) => {
    await delay(150);

    const { threatId } = params;

    if (typeof threatId !== 'string') {
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

    // Find and remove bookmark
    const index = mockBookmarks.findIndex((b) => b.threatId === threatId);

    if (index === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Bookmark not found',
          },
        },
        { status: 404 }
      );
    }

    mockBookmarks.splice(index, 1);

    return HttpResponse.json({
      success: true,
      data: null,
    });
  }),
];

/**
 * Mock Threat Handlers
 * MSW handlers for threat intelligence endpoints with filtering, pagination, and sorting
 * Updated to match the API response format expected by useInfiniteThreats hook
 */

import { http, HttpResponse, delay } from 'msw';
import type { Severity } from '../../types/threat';
import { ThreatCategory } from '../../types/threat';
import { mockThreats, getMockThreatById, filterThreats } from '../fixtures/threats';

// ============================================================================
// Configuration Constants
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ============================================================================
// Types
// ============================================================================

/**
 * Raw threat item format expected by useInfiniteThreats hook
 */
interface RawThreatItem {
  id: string;
  title: string;
  summary: string;
  severity: string;
  tags: string[];
  cves: string[];
  vendors: string[];
  published_at: string;
  view_count: number;
  reading_time_minutes: number;
  last_viewed_at?: string;
  user_has_viewed?: boolean;
}

/**
 * API response format expected by useInfiniteThreats hook
 */
interface InfiniteApiResponse {
  data: RawThreatItem[];
  meta: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
  };
}

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
 * Generate simulated view data for user
 */
function generateViewData(index: number): { lastViewedAt?: string; userHasViewed: boolean } {
  // Simulate that ~40% of threats have been viewed
  const hasViewed = index % 5 < 2;

  if (hasViewed) {
    // Generate a recent view date (within last 7 days)
    const daysAgo = index % 7;
    const hoursAgo = (index * 3) % 24;
    const viewDate = new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000);
    return {
      lastViewedAt: viewDate.toISOString(),
      userHasViewed: true,
    };
  }

  return { userHasViewed: false };
}

/**
 * Transform mock threat summary to raw API format
 */
function transformToRawFormat(threat: typeof mockThreats[0], index: number): RawThreatItem {
  const viewData = generateViewData(index);

  // Generate tags from category and source
  const tags = [
    threat.category.toLowerCase().replace('_', '-'),
    threat.source.toLowerCase(),
    threat.severity,
  ];

  // Generate vendors based on category
  const vendorsByCategory: Record<string, string[]> = {
    [ThreatCategory.VULNERABILITY]: ['Apache', 'Microsoft', 'Oracle', 'VMware'],
    [ThreatCategory.RANSOMWARE]: ['Windows', 'Linux', 'Multi-platform'],
    [ThreatCategory.PHISHING]: ['Microsoft 365', 'Google Workspace'],
    [ThreatCategory.APT]: ['Government', 'Defense', 'Critical Infrastructure'],
    [ThreatCategory.SUPPLY_CHAIN]: ['npm', 'PyPI', 'Maven'],
    [ThreatCategory.ZERO_DAY]: ['Microsoft', 'Google', 'Apple', 'Mozilla'],
    [ThreatCategory.DATA_BREACH]: ['Cloud Services', 'SaaS Providers'],
    [ThreatCategory.DDOS]: ['CDN', 'Cloud Providers'],
    [ThreatCategory.INSIDER_THREAT]: ['Internal Systems'],
    [ThreatCategory.MALWARE]: ['Windows', 'Linux', 'macOS'],
  };

  const categoryVendors = vendorsByCategory[threat.category] || ['General'];
  const vendors = categoryVendors.slice(0, (index % 2) + 1);

  return {
    id: threat.id,
    title: threat.title,
    summary: threat.summary,
    severity: threat.severity,
    tags,
    cves: Array.isArray(threat.cves) ? threat.cves : [],
    vendors,
    published_at: threat.publishedAt,
    view_count: Math.floor(Math.random() * 1000) + 50,
    reading_time_minutes: Math.floor(Math.random() * 10) + 3,
    last_viewed_at: viewData.lastViewedAt,
    user_has_viewed: viewData.userHasViewed,
  };
}

/**
 * Sort threats based on sortBy parameter
 */
function sortThreats(
  threats: typeof mockThreats,
  sortBy: string | null
): typeof mockThreats {
  const sortedThreats = [...threats];

  switch (sortBy) {
    case 'latest_viewed':
      // Sort by last viewed (viewed items first, then by publish date)
      return sortedThreats.sort((a, b) => {
        const aIndex = mockThreats.indexOf(a);
        const bIndex = mockThreats.indexOf(b);
        const aViewed = aIndex % 5 < 2;
        const bViewed = bIndex % 5 < 2;

        if (aViewed && !bViewed) return -1;
        if (!aViewed && bViewed) return 1;

        // Both viewed or both not viewed - sort by date
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });

    case 'newest':
      return sortedThreats.sort((a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

    case 'oldest':
      return sortedThreats.sort((a, b) =>
        new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      );

    case 'severity_desc': {
      const severityOrder: Record<string, number> = {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
        informational: 5,
      };
      return sortedThreats.sort((a, b) =>
        (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99)
      );
    }

    case 'severity_asc': {
      const severityOrderAsc: Record<string, number> = {
        critical: 5,
        high: 4,
        medium: 3,
        low: 2,
        informational: 1,
      };
      return sortedThreats.sort((a, b) =>
        (severityOrderAsc[b.severity] || 0) - (severityOrderAsc[a.severity] || 0)
      );
    }

    case 'title_asc':
      return sortedThreats.sort((a, b) => a.title.localeCompare(b.title));

    case 'title_desc':
      return sortedThreats.sort((a, b) => b.title.localeCompare(a.title));

    case 'cve_count_desc':
      return sortedThreats.sort((a, b) =>
        (Array.isArray(b.cves) ? b.cves.length : 0) - (Array.isArray(a.cves) ? a.cves.length : 0)
      );

    case 'source_asc':
      return sortedThreats.sort((a, b) => a.source.localeCompare(b.source));

    default:
      // Default to newest
      return sortedThreats.sort((a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
  }
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
   * List threats with filtering, pagination, and sorting
   * Returns format compatible with useInfiniteThreats hook
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

    // Parse sort parameter
    const sortBy = url.searchParams.get('sortBy');

    // Parse filter parameters
    const severityFilter = parseArrayParam(url, 'severity') as Severity[];
    const categoryFilter = parseArrayParam(url, 'category') as ThreatCategory[];
    const sourceFilter = parseArrayParam(url, 'source');
    const searchQuery = url.searchParams.get('search') || undefined;
    const startDate = url.searchParams.get('dateFrom') || url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('dateTo') || url.searchParams.get('endDate') || undefined;

    // Filter threats
    const filteredThreats = filterThreats({
      severity: severityFilter.length > 0 ? severityFilter : undefined,
      category: categoryFilter.length > 0 ? categoryFilter : undefined,
      source: sourceFilter.length > 0 ? sourceFilter : undefined,
      search: searchQuery,
      startDate,
      endDate,
    });

    // Sort threats
    const sortedThreats = sortThreats(filteredThreats, sortBy);

    // Calculate pagination
    const totalCount = sortedThreats.length;
    const totalPages = Math.ceil(totalCount / perPage);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedThreats = sortedThreats.slice(start, end);

    // Transform to raw API format
    const rawThreats: RawThreatItem[] = paginatedThreats.map((threat, idx) =>
      transformToRawFormat(threat, start + idx)
    );

    // Build response in the format expected by useInfiniteThreats
    const response: InfiniteApiResponse = {
      data: rawThreats,
      meta: {
        page,
        page_size: perPage,
        total_count: totalCount,
        total_pages: totalPages,
        has_next_page: page < totalPages,
      },
    };

    return HttpResponse.json(response);
  }),

  /**
   * GET /v1/threats/:id
   * Get single threat detail with full content
   */
  http.get('*/v1/threats/:id', async ({ params }) => {
    await delay(200);

    const { id } = params;

    if (typeof id !== 'string') {
      return HttpResponse.json(
        {
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
          error: {
            code: 'NOT_FOUND',
            message: `Threat not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      data: threat,
    });
  }),

  /**
   * POST /v1/threats/:id/bookmark
   * Add threat to user's bookmarks
   */
  http.post('*/v1/threats/:id/bookmark', async ({ params }) => {
    await delay(150);

    const { id } = params;

    if (typeof id !== 'string') {
      return HttpResponse.json(
        {
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
          error: {
            code: 'NOT_FOUND',
            message: `Threat not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    if (isBookmarked(id)) {
      return HttpResponse.json(
        {
          error: {
            code: 'ALREADY_BOOKMARKED',
            message: 'Threat is already bookmarked',
          },
        },
        { status: 409 }
      );
    }

    toggleBookmark(id, true);

    return HttpResponse.json({
      data: { bookmarked: true },
    });
  }),

  /**
   * DELETE /v1/threats/:id/bookmark
   * Remove threat from user's bookmarks
   */
  http.delete('*/v1/threats/:id/bookmark', async ({ params }) => {
    await delay(150);

    const { id } = params;

    if (typeof id !== 'string') {
      return HttpResponse.json(
        {
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
          error: {
            code: 'NOT_FOUND',
            message: `Threat not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    if (!isBookmarked(id)) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_BOOKMARKED',
            message: 'Threat is not bookmarked',
          },
        },
        { status: 409 }
      );
    }

    toggleBookmark(id, false);

    return HttpResponse.json({
      data: { bookmarked: false },
    });
  }),
];

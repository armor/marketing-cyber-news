/**
 * useInfiniteThreats Hook
 *
 * TanStack Query infinite query hook for fetching threat intelligence data
 * with infinite scroll support. Includes search debouncing, sort filters,
 * and optimized pagination for seamless user experience.
 *
 * @example
 * ```typescript
 * const {
 *   threats,
 *   isLoading,
 *   hasNextPage,
 *   fetchNextPage,
 *   searchQuery,
 *   setSearchQuery,
 *   sortBy,
 *   setSortBy
 * } = useInfiniteThreats({
 *   filters: { severity: ['critical', 'high'] },
 *   initialSort: 'latest_viewed'
 * });
 * ```
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState, useDeferredValue } from 'react';
import type { ThreatSummary, ThreatFilters } from '@/types/threat';
import { ThreatCategory } from '@/types/threat';
import { apiClient } from '@/services/api/client';
import { queryKeys } from '@/services/api/queryClient';
import { useAuth } from './useAuth';

// ============================================================================
// Types
// ============================================================================

/**
 * Available sort options for threats
 */
export type ThreatSortOption =
  | 'latest_viewed'      // Most recently viewed by user (requires tracking)
  | 'newest'            // Most recently published
  | 'oldest'            // Oldest published
  | 'severity_desc'     // Critical -> Low
  | 'severity_asc'      // Low -> Critical
  | 'title_asc'         // A-Z
  | 'title_desc'        // Z-A
  | 'cve_count_desc'    // Most CVEs first
  | 'source_asc';       // Source alphabetical

/**
 * Enhanced filters with search and sort
 */
export interface InfiniteThreatsFilters extends ThreatFilters {
  readonly search?: string;
  readonly sortBy?: ThreatSortOption;
}

/**
 * Hook options for infinite threats query
 */
export interface UseInfiniteThreatsOptions {
  readonly filters?: ThreatFilters;
  readonly initialSort?: ThreatSortOption;
  readonly perPage?: number;
  readonly enabled?: boolean;
}

/**
 * Enhanced threat summary with view tracking
 */
export interface ThreatSummaryWithViews extends ThreatSummary {
  readonly lastViewedAt?: string;
  readonly viewCount?: number;
  readonly userHasViewed?: boolean;
}

/**
 * API response for a single page
 */
interface InfiniteThreatsPage {
  readonly data: readonly ThreatSummaryWithViews[];
  readonly pagination: {
    readonly page: number;
    readonly perPage: number;
    readonly totalPages: number;
    readonly totalItems: number;
    readonly hasNextPage: boolean;
  };
}

/**
 * Return value from useInfiniteThreats hook
 */
export interface UseInfiniteThreatsReturn {
  readonly threats: readonly ThreatSummaryWithViews[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly fetchNextPage: () => void;
  readonly refetch: () => void;
  readonly searchQuery: string;
  readonly setSearchQuery: (query: string) => void;
  readonly deferredSearchQuery: string;
  readonly sortBy: ThreatSortOption;
  readonly setSortBy: (sort: ThreatSortOption) => void;
  readonly totalCount: number;
  readonly currentPageCount: number;
}

/**
 * Raw API response item with view tracking
 */
interface RawThreatItemWithViews {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly severity: string;
  readonly tags: readonly string[];
  readonly cves: readonly string[];
  readonly vendors: readonly string[];
  readonly published_at: string;
  readonly view_count: number;
  readonly reading_time_minutes: number;
  readonly last_viewed_at?: string;
  readonly user_has_viewed?: boolean;
}

/**
 * Raw API response for infinite queries
 */
interface RawInfiniteApiResponse {
  readonly data: readonly RawThreatItemWithViews[];
  readonly meta: {
    readonly page: number;
    readonly page_size: number;
    readonly total_count: number;
    readonly total_pages: number;
    readonly has_next_page: boolean;
  };
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PER_PAGE = 20;
const DEFAULT_SORT: ThreatSortOption = 'latest_viewed';
// Note: useDeferredValue in React 18+ uses internal heuristics instead of explicit timeout

/**
 * API endpoint - uses /articles for production, /threats for MSW mocks
 */
const THREATS_ENDPOINT = import.meta.env.VITE_ENABLE_MSW === 'true' ? '/threats' : '/articles';

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Infer category from tags (same as useThreats)
 */
function inferCategoryFromTags(tags: readonly string[]): ThreatSummary['category'] {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  if (tagSet.has('malware') || tagSet.has('trojan')) return ThreatCategory.MALWARE;
  if (tagSet.has('ransomware') || tagSet.has('lockbit')) return ThreatCategory.RANSOMWARE;
  if (tagSet.has('phishing')) return ThreatCategory.PHISHING;
  if (tagSet.has('breach') || tagSet.has('data-leak')) return ThreatCategory.DATA_BREACH;
  if (tagSet.has('vulnerability') || tagSet.has('cve')) return ThreatCategory.VULNERABILITY;
  if (tagSet.has('apt')) return ThreatCategory.APT;
  if (tagSet.has('ddos')) return ThreatCategory.DDOS;
  if (tagSet.has('insider')) return ThreatCategory.INSIDER_THREAT;
  if (tagSet.has('supply-chain')) return ThreatCategory.SUPPLY_CHAIN;
  if (tagSet.has('zero-day') || tagSet.has('0day')) return ThreatCategory.ZERO_DAY;

  return ThreatCategory.VULNERABILITY;
}

/**
 * Infer source from tags (same as useThreats)
 */
function inferSourceFromTags(tags: readonly string[]): string {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  if (tagSet.has('cisa')) return 'CISA';
  if (tagSet.has('nvd')) return 'NVD';
  if (tagSet.has('mitre')) return 'MITRE';

  return 'Security Feed';
}

/**
 * Transform raw API item to ThreatSummaryWithViews
 */
function transformThreatItem(raw: RawThreatItemWithViews): ThreatSummaryWithViews {
  return {
    id: raw.id,
    title: raw.title,
    summary: raw.summary,
    severity: raw.severity as ThreatSummary['severity'],
    category: inferCategoryFromTags(raw.tags),
    source: inferSourceFromTags(raw.tags),
    publishedAt: raw.published_at,
    cves: raw.cves,
    isBookmarked: false, // Will be updated from bookmark API
    industries: [], // Not provided by API
    hasDeepDive: false, // Not provided by API
    lastViewedAt: raw.last_viewed_at,
    viewCount: raw.view_count,
    userHasViewed: raw.user_has_viewed ?? false,
  };
}

/**
 * Transform raw API response to infinite threats page
 */
function transformInfiniteResponse(raw: RawInfiniteApiResponse): InfiniteThreatsPage {
  return {
    data: raw.data.map(transformThreatItem),
    pagination: {
      page: raw.meta.page,
      perPage: raw.meta.page_size,
      totalPages: raw.meta.total_pages,
      totalItems: raw.meta.total_count,
      hasNextPage: raw.meta.has_next_page,
    },
  };
}

// ============================================================================
// API Function
// ============================================================================

/**
 * Fetch a single page of threats for infinite query
 */
async function fetchInfiniteThreatsPage(
  pageParam: number,
  filters: InfiniteThreatsFilters,
  perPage: number
): Promise<InfiniteThreatsPage> {
  // Build query parameters
  const params = new URLSearchParams();
  params.set('page', String(pageParam));
  params.set('perPage', String(perPage));

  // Add sort parameter
  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy);
  }

  // Add search parameter
  if (filters.search?.trim()) {
    params.set('search', filters.search.trim());
  }

  // Add filter parameters
  if (filters.severity?.length) {
    filters.severity.forEach((s) => params.append('severity', s));
  }

  if (filters.category?.length) {
    filters.category.forEach((c) => params.append('category', c));
  }

  if (filters.source?.length) {
    filters.source.forEach((s) => params.append('source', s));
  }

  if (filters.dateRange) {
    params.set('dateFrom', filters.dateRange.start);
    params.set('dateTo', filters.dateRange.end);
  }

  // Fetch raw response and transform
  const rawResponse = await apiClient.get<RawInfiniteApiResponse>(
    `${THREATS_ENDPOINT}?${params.toString()}`
  );

  return transformInfiniteResponse(rawResponse);
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for infinite scrolling threats with search and sort
 *
 * Provides infinite scrolling with TanStack Query, debounced search,
 * sort filters, and optimized pagination. Automatically tracks user
 * view history for "latest viewed" sorting.
 *
 * @param options - Configuration options for filters, sort, pagination
 * @returns Infinite threats data with search and sort controls
 */
export function useInfiniteThreats(
  options?: UseInfiniteThreatsOptions
): UseInfiniteThreatsReturn {
  const { isAuthenticated } = useAuth();

  // ============================================================================
  // State Management
  // ============================================================================

  // Search state with debouncing
  // Note: useDeferredValue doesn't accept timeout in React 18+, it uses internal heuristics
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Sort state
  const [sortBy, setSortBy] = useState<ThreatSortOption>(
    options?.initialSort ?? DEFAULT_SORT
  );

  // Extract options
  const perPage = options?.perPage ?? DEFAULT_PER_PAGE;
  const enabled = options?.enabled !== false && isAuthenticated;

  // ============================================================================
  // Query Key and Filters
  // ============================================================================

  // Combine all filters including search and sort
  const enhancedFilters = useMemo((): InfiniteThreatsFilters => ({
    ...options?.filters,
    search: deferredSearchQuery || undefined,
    sortBy,
  }), [options?.filters, deferredSearchQuery, sortBy]);

  // ============================================================================
  // Infinite Query
  // ============================================================================

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: originalFetchNextPage,
    refetch: originalRefetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.threats.infinite(enhancedFilters),
    queryFn: ({ pageParam = 1 }) =>
      fetchInfiniteThreatsPage(pageParam, enhancedFilters, perPage),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    enabled,
    staleTime: 60000, // 1 minute
  });

  // ============================================================================
  // Derived State
  // ============================================================================

  // Flatten all pages into single array
  const threats = useMemo(() =>
    data?.pages.flatMap(page => page.data) ?? [],
    [data]
  );

  // Calculate totals
  const totalCount = data?.pages[0]?.pagination.totalItems ?? 0;
  const currentPageCount = data?.pages.length ?? 0;

  // ============================================================================
  // Wrapped Functions
  // ============================================================================

  // Wrap functions to return void
  const fetchNextPage = (): void => {
    void originalFetchNextPage();
  };

  const refetch = (): void => {
    void originalRefetch();
  };

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    threats,
    isLoading,
    isError,
    error: error as Error | null,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    searchQuery,
    setSearchQuery,
    deferredSearchQuery,
    sortBy,
    setSortBy,
    totalCount,
    currentPageCount,
  };
}

/**
 * ============================================================================
 * Sort Option Labels for UI
 * ============================================================================
 */

export const SORT_OPTION_LABELS: Record<ThreatSortOption, string> = {
  latest_viewed: 'Recently Viewed',
  newest: 'Newest First',
  oldest: 'Oldest First',
  severity_desc: 'Severity: High to Low',
  severity_asc: 'Severity: Low to High',
  title_asc: 'Title: A to Z',
  title_desc: 'Title: Z to A',
  cve_count_desc: 'Most CVEs',
  source_asc: 'Source: A to Z',
} as const;

/**
 * ============================================================================
 * Query Key Extensions
 * ============================================================================
 *
 * Add to existing queryKeys in queryClient.ts:
 *
 * threats: {
 *   all: () => ['threats'] as const,
 *   lists: () => [...threats.all(), 'list'] as const,
 *   list: (filters: ThreatFilters, page: number) =>
 *     [...threats.lists(), { filters, page }] as const,
 *   infinite: (filters: InfiniteThreatsFilters) =>
 *     [...threats.all(), 'infinite', filters] as const,
 *   details: () => [...threats.all(), 'detail'] as const,
 *   detail: (id: string) => [...threats.details(), id] as const,
 * }
 */
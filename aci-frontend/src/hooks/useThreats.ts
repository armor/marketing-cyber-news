/**
 * useThreats Hook
 *
 * TanStack Query hook for fetching paginated threat intelligence data.
 * Supports filtering by severity, category, source, and date range.
 * Only fetches when user is authenticated.
 *
 * @example
 * ```typescript
 * const {
 *   threats,
 *   pagination,
 *   isLoading,
 *   hasNextPage,
 *   refetch
 * } = useThreats({
 *   filters: { severity: ['critical', 'high'] },
 *   page: 1,
 *   perPage: 20
 * });
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import type { ThreatSummary, ThreatFilters } from '@/types/threat';
import { ThreatCategory } from '@/types/threat';
import { apiClient } from '@/services/api/client';
import { queryKeys } from '@/services/api/queryClient';
import { useAuth } from './useAuth';

/**
 * API endpoint - uses /articles for production, /threats for MSW mocks
 */
const THREATS_ENDPOINT = import.meta.env.VITE_ENABLE_MSW === 'true' ? '/threats' : '/articles';

// ============================================================================
// Types
// ============================================================================

/**
 * Pagination metadata returned from API
 */
export interface PaginationMeta {
  readonly page: number;
  readonly perPage: number;
  readonly totalPages: number;
  readonly totalItems: number;
}

/**
 * Hook options for threats query
 */
export interface UseThreatsOptions {
  readonly filters?: ThreatFilters;
  readonly page?: number;
  readonly perPage?: number;
  readonly enabled?: boolean;
}

/**
 * Return value from useThreats hook
 */
export interface UseThreatsReturn {
  readonly threats: readonly ThreatSummary[] | undefined;
  readonly pagination: PaginationMeta | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/**
 * Raw API response item (snake_case from backend)
 */
interface RawThreatItem {
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
}

/**
 * Raw API response structure (matches backend response)
 */
interface RawApiResponse {
  readonly data: readonly RawThreatItem[];
  readonly meta: {
    readonly page: number;
    readonly page_size: number;
    readonly total_count: number;
    readonly total_pages: number;
  };
}

/**
 * Transformed API response for frontend consumption
 */
interface ThreatsApiResponse {
  readonly data: readonly ThreatSummary[];
  readonly pagination: PaginationMeta;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Infer category from tags
 * Maps common tags to ThreatCategory enum values
 */
function inferCategoryFromTags(tags: readonly string[]): ThreatCategory {
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

  // Default based on severity or content
  return ThreatCategory.VULNERABILITY;
}

/**
 * Infer source from tags or use default
 */
function inferSourceFromTags(tags: readonly string[]): string {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  if (tagSet.has('cisa')) return 'CISA';
  if (tagSet.has('nvd')) return 'NVD';
  if (tagSet.has('mitre')) return 'MITRE';

  return 'Security Feed';
}

/**
 * Transform raw API item to ThreatSummary
 */
function transformThreatItem(raw: RawThreatItem): ThreatSummary {
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
  };
}

/**
 * Transform raw API response to frontend format
 */
function transformApiResponse(raw: RawApiResponse): ThreatsApiResponse {
  return {
    data: raw.data.map(transformThreatItem),
    pagination: {
      page: raw.meta.page,
      perPage: raw.meta.page_size,
      totalPages: raw.meta.total_pages,
      totalItems: raw.meta.total_count,
    },
  };
}

// ============================================================================
// API Function
// ============================================================================

/**
 * Fetch threats from API with filters and pagination
 */
async function fetchThreats(
  filters?: ThreatFilters,
  page: number = 1,
  perPage: number = 20
): Promise<ThreatsApiResponse> {
  // Build query parameters
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('perPage', String(perPage));

  // Add filter parameters if provided
  if (filters?.severity?.length) {
    filters.severity.forEach((s) => params.append('severity', s));
  }

  if (filters?.category?.length) {
    filters.category.forEach((c) => params.append('category', c));
  }

  if (filters?.source?.length) {
    filters.source.forEach((s) => params.append('source', s));
  }

  if (filters?.dateRange) {
    params.set('dateFrom', filters.dateRange.start);
    params.set('dateTo', filters.dateRange.end);
  }

  if (filters?.search) {
    params.set('search', filters.search);
  }

  // Fetch raw response and transform
  const rawResponse = await apiClient.get<RawApiResponse>(
    `${THREATS_ENDPOINT}?${params.toString()}`
  );

  return transformApiResponse(rawResponse);
}

// ============================================================================
// Hook
// ============================================================================

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

/**
 * Hook to fetch paginated threats with TanStack Query
 *
 * Fetches threat summaries with optional filtering and pagination.
 * Only enabled when user is authenticated.
 * Query key includes filters and page for proper cache invalidation.
 *
 * @param options - Configuration options for query filters, pagination, and behavior
 * @returns {UseThreatsReturn} Threat data, pagination info, loading states, and refetch function
 */
export function useThreats(options?: UseThreatsOptions): UseThreatsReturn {
  const { isAuthenticated } = useAuth();

  // Extract options with defaults
  const filters = options?.filters;
  const page = options?.page ?? DEFAULT_PAGE;
  const perPage = options?.perPage ?? DEFAULT_PER_PAGE;

  // Determine if query should be enabled
  const enabled = options?.enabled !== false && isAuthenticated;

  // Execute query with dynamic key based on filters and page
  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: queryKeys.threats.list(filters ?? {}, page),
    queryFn: () => fetchThreats(filters, page, perPage),
    enabled,
    staleTime: 60000, // 1 minute - threats update frequently
  });

  // Compute pagination helpers
  const pagination = data?.pagination;
  const hasNextPage = pagination ? pagination.page < pagination.totalPages : false;
  const hasPreviousPage = pagination ? pagination.page > 1 : false;

  // Wrap refetch to return void instead of Promise
  const refetch = (): void => {
    void originalRefetch();
  };

  return {
    threats: data?.data,
    pagination,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    hasNextPage,
    hasPreviousPage,
  };
}

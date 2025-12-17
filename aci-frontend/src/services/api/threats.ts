/**
 * Threats API Service
 *
 * Handles paginated threat intelligence data fetching with filtering.
 * Uses apiClient from './client.ts' for standardized HTTP communication.
 *
 * Dual-mode support:
 * - Development (MSW enabled): Calls /threats endpoints (mock data)
 * - Production (MSW disabled): Calls /articles endpoints (real backend)
 */

import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Threat, ThreatFilters, ThreatSummary } from '@/types/threat';
import { ThreatCategory } from '@/types/threat';

/**
 * Configuration constants for threat API requests
 */
const THREATS_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const;

/**
 * Determine API endpoint based on environment
 * MSW mocks use /threats, production backend uses /articles
 */
const API_ENDPOINT = import.meta.env.VITE_ENABLE_MSW === 'true' ? '/threats' : '/articles';

// ============================================================================
// Raw API Response Types (snake_case from backend)
// ============================================================================

/**
 * Raw Armor CTA from backend (snake_case)
 */
interface RawArmorCTA {
  readonly type: 'service' | 'product' | 'consultation';
  readonly title: string;
  readonly url: string;
}

/**
 * Raw single article response from backend
 */
interface RawArticleDetail {
  readonly id: string;
  readonly title: string;
  readonly slug?: string;
  readonly summary: string;
  readonly content: string;
  readonly severity: string;
  readonly tags: readonly string[];
  readonly cves: readonly string[];
  readonly vendors: readonly string[];
  readonly source_url?: string; // Original article source URL
  readonly reading_time_minutes: number;
  readonly view_count: number;
  readonly published_at: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  // AI Enrichment fields (snake_case from backend)
  readonly threat_type?: string;
  readonly attack_vector?: string;
  readonly impact_assessment?: string;
  readonly recommended_actions?: readonly string[];
  readonly armor_cta?: RawArmorCTA;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Infer category from tags
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

  return ThreatCategory.VULNERABILITY;
}

/**
 * Infer source from tags
 */
function inferSourceFromTags(tags: readonly string[]): string {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  if (tagSet.has('cisa')) return 'CISA';
  if (tagSet.has('nvd')) return 'NVD';
  if (tagSet.has('mitre')) return 'MITRE';

  return 'Security Feed';
}

/**
 * Transform raw API article to Threat type
 */
function transformArticleToThreat(raw: RawArticleDetail): Threat {
  const now = new Date().toISOString();

  return {
    id: raw.id,
    title: raw.title,
    summary: raw.summary,
    content: raw.content,
    severity: raw.severity as Threat['severity'],
    category: inferCategoryFromTags(raw.tags),
    source: inferSourceFromTags(raw.tags),
    sourceUrl: raw.source_url ?? null,
    publishedAt: raw.published_at,
    createdAt: raw.created_at ?? raw.published_at ?? now,
    updatedAt: raw.updated_at ?? raw.published_at ?? now,
    cves: raw.cves.map(cveId => ({
      id: cveId,
      severity: 'medium' as const,
      cvssScore: null,
      description: cveId,
    })),
    tags: [...raw.tags],
    viewCount: raw.view_count ?? 0,
    isBookmarked: false,
    externalReferences: [],
    industries: [],
    recommendations: [],
    deepDive: undefined,
    // AI Enrichment fields (transform snake_case to camelCase)
    threatType: raw.threat_type,
    attackVector: raw.attack_vector,
    impactAssessment: raw.impact_assessment,
    recommendedActions: raw.recommended_actions ? [...raw.recommended_actions] : undefined,
    armorCta: raw.armor_cta,
  };
}

/**
 * Parameters for paginated threat listing
 */
export interface GetThreatsParams {
  readonly page?: number;
  readonly perPage?: number;
  readonly filters?: ThreatFilters;
}

/**
 * Build query parameters from GetThreatsParams
 * Converts filter arrays to multiple query params (e.g., severity[]=critical&severity[]=high)
 */
function buildThreatsQueryParams(
  params: GetThreatsParams
): Record<string, string> {
  const queryParams: Record<string, string> = {};

  // Pagination parameters
  const page = params.page ?? THREATS_CONFIG.DEFAULT_PAGE;
  const perPage = Math.min(
    params.perPage ?? THREATS_CONFIG.DEFAULT_PER_PAGE,
    THREATS_CONFIG.MAX_PER_PAGE
  );

  queryParams.page = String(page);
  queryParams.perPage = String(perPage);

  // Filter parameters
  if (!params.filters) {
    return queryParams;
  }

  const { severity, category, source, dateRange, search } = params.filters;

  // Array filters - create multiple params for each value
  if (severity && severity.length > 0) {
    severity.forEach((sev, index) => {
      queryParams[`severity[${index}]`] = sev;
    });
  }

  if (category && category.length > 0) {
    category.forEach((cat, index) => {
      queryParams[`category[${index}]`] = cat;
    });
  }

  if (source && source.length > 0) {
    source.forEach((src, index) => {
      queryParams[`source[${index}]`] = src;
    });
  }

  // Date range filters
  if (dateRange) {
    queryParams.startDate = dateRange.start;
    queryParams.endDate = dateRange.end;
  }

  // Search query
  if (search && search.trim().length > 0) {
    queryParams.search = search.trim();
  }

  return queryParams;
}

/**
 * Fetch paginated threat summaries with optional filtering
 *
 * @param params - Pagination and filter parameters
 * @returns Paginated response containing threat summaries
 *
 * @throws {ApiError} If request fails or returns non-2xx status
 *
 * @example
 * ```typescript
 * const threats = await getThreats({
 *   page: 1,
 *   perPage: 20,
 *   filters: {
 *     severity: ['critical', 'high'],
 *     category: [ThreatCategory.RANSOMWARE],
 *     search: 'ransomware attack'
 *   }
 * });
 * ```
 */
export async function getThreats(
  params: GetThreatsParams = {}
): Promise<PaginatedResponse<ThreatSummary>> {
  const queryParams = buildThreatsQueryParams(params);
  return apiClient.get<PaginatedResponse<ThreatSummary>>(
    API_ENDPOINT,
    queryParams
  );
}

/**
 * Fetch full threat details by ID
 *
 * @param id - Threat UUID
 * @returns Complete threat entity with full content and metadata
 *
 * @throws {ApiError} If threat not found (404) or request fails
 *
 * @example
 * ```typescript
 * const threat = await getThreat('a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6');
 * console.log(threat.content); // Markdown content
 * console.log(threat.cves); // Associated CVEs with CVSS scores
 * ```
 */
export async function getThreat(id: string): Promise<Threat> {
  if (!id || id.trim().length === 0) {
    throw new Error('Threat ID is required');
  }

  // Fetch raw API response (snake_case) and transform to Threat type
  const response = await apiClient.get<ApiResponse<RawArticleDetail>>(`${API_ENDPOINT}/${id}`);
  return transformArticleToThreat(response.data);
}

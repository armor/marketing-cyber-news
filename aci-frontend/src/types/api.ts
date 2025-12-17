import type { ThreatSummary } from './threat';

/**
 * API Response Types
 * Generic wrappers for consistent error handling and response structure
 */

/**
 * Successful API response wrapper
 */
export interface ApiResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly message?: string;
}

/**
 * API error response structure
 */
export interface ApiError {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, readonly string[]>;
  };
}

/**
 * Union type for all API responses
 * Use with type guards to narrow success vs error
 */
export type ApiResult<T> = ApiResponse<T> | ApiError;

/**
 * Pagination metadata and data wrapper
 */
export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/**
 * Pagination and sorting parameters for list queries
 */
export interface PaginationParams {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Dashboard overview metrics
 */
export interface DashboardSummary {
  readonly totalThreats: number;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly mediumCount: number;
  readonly lowCount: number;
  readonly newToday: number;
  readonly activeAlerts: number;
  readonly trending: readonly ThreatSummary[];
  readonly timeline: readonly {
    readonly date: string;
    readonly count: number;
    readonly critical?: number;
    readonly high?: number;
    readonly medium?: number;
    readonly low?: number;
  }[];
  readonly severityDistribution: {
    readonly critical: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
  };
}

/**
 * Analytics time series data point
 */
interface TimeSeriesPoint {
  readonly date: string; // ISO 8601 date string
  readonly count: number;
}

/**
 * Category aggregation data point
 */
interface CategoryCount {
  readonly category: string;
  readonly count: number;
}

/**
 * Source aggregation data point
 */
interface SourceCount {
  readonly source: string;
  readonly count: number;
}

/**
 * Severity aggregation data point
 */
interface SeverityCount {
  readonly severity: string;
  readonly count: number;
}

/**
 * Analytics aggregated data structure
 */
export interface AnalyticsData {
  readonly timeSeries: readonly TimeSeriesPoint[];
  readonly byCategory: readonly CategoryCount[];
  readonly bySource: readonly SourceCount[];
  readonly bySeverity: readonly SeverityCount[];
}

/**
 * Type guard to check if API result is successful
 */
export function isApiSuccess<T>(result: ApiResult<T>): result is ApiResponse<T> {
  return result.success === true;
}

/**
 * Type guard to check if API result is an error
 */
export function isApiError<T>(result: ApiResult<T>): result is ApiError {
  return result.success === false;
}

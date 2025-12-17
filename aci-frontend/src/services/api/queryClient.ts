import { QueryClient } from '@tanstack/react-query';
import type { ThreatFilters } from '@/types/threat';

/**
 * Query key factories for consistent cache key management.
 * Hierarchical structure ensures proper cache invalidation.
 */
export const queryKeys = {
  threats: {
    all: ['threats'] as const,
    lists: () => [...queryKeys.threats.all, 'list'] as const,
    list: (filters: ThreatFilters, page: number) =>
      [...queryKeys.threats.lists(), filters, page] as const,
    details: () => [...queryKeys.threats.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.threats.details(), id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => [...queryKeys.dashboard.all, 'summary'] as const,
  },
  bookmarks: {
    all: ['bookmarks'] as const,
    list: () => [...queryKeys.bookmarks.all, 'list'] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    list: () => [...queryKeys.alerts.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.alerts.all, 'detail', id] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    data: (range: string) => [...queryKeys.analytics.all, range] as const,
  },
  user: {
    all: ['user'] as const,
    current: () => [...queryKeys.user.all, 'current'] as const,
  },
} as const;

/**
 * Configuration constants for query defaults
 */
const QUERY_CONFIG = {
  STALE_TIME_MS: 5 * 60 * 1000, // 5 minutes
  GC_TIME_MS: 30 * 60 * 1000, // 30 minutes
  MAX_RETRIES: 3,
  MAX_RETRY_DELAY_MS: 30000,
} as const;

/**
 * Retry strategy with exponential backoff
 */
const getRetryDelay = (attemptIndex: number): number => {
  return Math.min(1000 * 2 ** attemptIndex, QUERY_CONFIG.MAX_RETRY_DELAY_MS);
};

/**
 * Determine if an error should be retried
 */
const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= QUERY_CONFIG.MAX_RETRIES) {
    return false;
  }

  // Don't retry authentication/authorization errors
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status === 401 || status === 403) {
      return false;
    }
  }

  return true;
};

/**
 * Global error handler for queries
 */
const onError = (error: unknown): void => {
  if (import.meta.env.DEV) {
    console.error('[QueryClient] Error:', error);
  }
};

/**
 * Configured QueryClient instance with optimal defaults for NEXUS Frontend
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CONFIG.STALE_TIME_MS,
      gcTime: QUERY_CONFIG.GC_TIME_MS,
      refetchOnWindowFocus: true,
      retry: shouldRetry,
      retryDelay: getRetryDelay,
    },
    mutations: {
      onError,
    },
  },
});

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  DateRange,
  Severity,
  ThreatCategory,
  ThreatFilters,
} from '../types/threat';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Mutable version of ThreatFilters for internal state management
 */
interface MutableThreatFilters {
  severity?: Severity[];
  category?: ThreatCategory[];
  source?: string[];
  dateRange?: DateRange;
  search?: string;
}

interface UseThreatFiltersReturn {
  readonly filters: ThreatFilters;
  readonly setFilters: (filters: ThreatFilters) => void;
  readonly setSeverity: (severity: readonly Severity[] | undefined) => void;
  readonly setCategory: (category: readonly ThreatCategory[] | undefined) => void;
  readonly setSource: (source: readonly string[] | undefined) => void;
  readonly setDateRange: (range: DateRange | undefined) => void;
  readonly setSearch: (search: string | undefined) => void;
  readonly clearFilters: () => void;
  readonly hasActiveFilters: boolean;
}

/**
 * Parse ThreatFilters from URL search params
 */
function parseFiltersFromURL(searchParams: URLSearchParams): MutableThreatFilters {
  const filters: MutableThreatFilters = {};

  const severityParams = searchParams.getAll('severity');
  if (severityParams.length > 0) {
    filters.severity = severityParams as Severity[];
  }

  const categoryParams = searchParams.getAll('category');
  if (categoryParams.length > 0) {
    filters.category = categoryParams as ThreatCategory[];
  }

  const sourceParams = searchParams.getAll('source');
  if (sourceParams.length > 0) {
    filters.source = sourceParams;
  }

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  if (startDate && endDate) {
    filters.dateRange = { start: startDate, end: endDate };
  }

  const search = searchParams.get('search');
  if (search) {
    filters.search = search;
  }

  return filters;
}

/**
 * Serialize ThreatFilters to URL search params
 */
function serializeFiltersToURL(filters: ThreatFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.severity) {
    filters.severity.forEach((severity) => {
      params.append('severity', severity);
    });
  }

  if (filters.category) {
    filters.category.forEach((category) => {
      params.append('category', category);
    });
  }

  if (filters.source) {
    filters.source.forEach((source) => {
      params.append('source', source);
    });
  }

  if (filters.dateRange) {
    params.set('startDate', filters.dateRange.start);
    params.set('endDate', filters.dateRange.end);
  }

  if (filters.search) {
    params.set('search', filters.search);
  }

  return params;
}

/**
 * Hook for managing threat filter state with URL synchronization
 *
 * Features:
 * - URL persistence via react-router-dom useSearchParams
 * - Debounced search input (300ms)
 * - Stable callbacks for performance
 * - Computed hasActiveFilters flag
 *
 * @example
 * ```tsx
 * const { filters, setSeverity, setSearch, clearFilters } = useThreatFilters();
 *
 * // Update single filter
 * setSeverity(['critical', 'high']);
 *
 * // Clear all filters
 * clearFilters();
 * ```
 */
export function useThreatFilters(): UseThreatFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL
  const [filters, setFiltersState] = useState<MutableThreatFilters>(() =>
    parseFiltersFromURL(searchParams)
  );

  // Debounce timer for search using ref
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync filters to URL
  const syncFiltersToURL = useCallback(
    (newFilters: ThreatFilters): void => {
      const params = serializeFiltersToURL(newFilters);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  // Update filters state and URL
  const setFilters = useCallback(
    (newFilters: ThreatFilters): void => {
      // Convert readonly arrays to mutable for state
      const mutableFilters: MutableThreatFilters = {
        severity: newFilters.severity ? [...newFilters.severity] : undefined,
        category: newFilters.category ? [...newFilters.category] : undefined,
        source: newFilters.source ? [...newFilters.source] : undefined,
        dateRange: newFilters.dateRange,
        search: newFilters.search,
      };
      setFiltersState(mutableFilters);
      syncFiltersToURL(newFilters);
    },
    [syncFiltersToURL]
  );

  // Update severity filter
  const setSeverity = useCallback(
    (severity: readonly Severity[] | undefined): void => {
      const newFilters: MutableThreatFilters = { ...filters };
      if (severity && severity.length > 0) {
        newFilters.severity = [...severity];
      } else {
        newFilters.severity = undefined;
      }
      setFilters(newFilters);
    },
    [filters, setFilters]
  );

  // Update category filter
  const setCategory = useCallback(
    (category: readonly ThreatCategory[] | undefined): void => {
      const newFilters: MutableThreatFilters = { ...filters };
      if (category && category.length > 0) {
        newFilters.category = [...category];
      } else {
        newFilters.category = undefined;
      }
      setFilters(newFilters);
    },
    [filters, setFilters]
  );

  // Update source filter
  const setSource = useCallback(
    (source: readonly string[] | undefined): void => {
      const newFilters: MutableThreatFilters = { ...filters };
      if (source && source.length > 0) {
        newFilters.source = [...source];
      } else {
        newFilters.source = undefined;
      }
      setFilters(newFilters);
    },
    [filters, setFilters]
  );

  // Update date range filter
  const setDateRange = useCallback(
    (range: DateRange | undefined): void => {
      const newFilters: MutableThreatFilters = { ...filters };
      if (range) {
        newFilters.dateRange = range;
      } else {
        newFilters.dateRange = undefined;
      }
      setFilters(newFilters);
    },
    [filters, setFilters]
  );

  // Update search filter with debouncing
  const setSearch = useCallback(
    (search: string | undefined): void => {
      // Clear existing timer
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }

      // Set new timer
      searchDebounceTimerRef.current = setTimeout(() => {
        const newFilters: MutableThreatFilters = { ...filters };
        if (search) {
          newFilters.search = search;
        } else {
          newFilters.search = undefined;
        }
        setFilters(newFilters);
      }, SEARCH_DEBOUNCE_MS);
    },
    [filters, setFilters]
  );

  // Clear all filters
  const clearFilters = useCallback((): void => {
    setFilters({});
  }, [setFilters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo((): boolean => {
    return (
      (filters.severity && filters.severity.length > 0) ||
      (filters.category && filters.category.length > 0) ||
      (filters.source && filters.source.length > 0) ||
      !!filters.dateRange ||
      !!filters.search
    );
  }, [filters]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, []);

  // Sync from URL on mount or external URL changes
  useEffect(() => {
    const urlFilters = parseFiltersFromURL(searchParams);
    // Use queueMicrotask to avoid synchronous setState in effect
    queueMicrotask(() => {
      setFiltersState(urlFilters);
    });
  }, [searchParams]);

  return {
    filters,
    setFilters,
    setSeverity,
    setCategory,
    setSource,
    setDateRange,
    setSearch,
    clearFilters,
    hasActiveFilters,
  };
}

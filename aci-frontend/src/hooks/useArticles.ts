import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Article, PaginationMeta } from '../types';
import { articleService, type ArticleFilters } from '../services/articleService';

interface UseArticlesResult {
  articles: Article[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useArticles(filters: ArticleFilters = {}): UseArticlesResult {
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize filters to ensure stable reference for useCallback dependency
  const stableFilters = useMemo(() => filters, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchArticles = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await articleService.getArticles(stableFilters);
      setArticles(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch articles');
    } finally {
      setIsLoading(false);
    }
  }, [stableFilters]);

  useEffect(() => {
    void fetchArticles();
  }, [fetchArticles]);

  return { articles, pagination, isLoading, error, refetch: fetchArticles };
}

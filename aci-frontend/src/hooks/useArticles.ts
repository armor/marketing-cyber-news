import { useState, useEffect, useCallback } from 'react';
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

  const fetchArticles = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await articleService.getArticles(filters);
      setArticles(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch articles');
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    void fetchArticles();
  }, [fetchArticles]);

  return { articles, pagination, isLoading, error, refetch: fetchArticles };
}

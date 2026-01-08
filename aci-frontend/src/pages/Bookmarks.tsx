/**
 * Bookmarks Page - Fortified Horizon Theme
 *
 * User's saved articles for later reading.
 * Uses CSS custom properties for all styling values.
 */
import { useState, useEffect } from 'react';
import React from 'react';
import type { Article } from '../types';
import { userService } from '../services/userService';
import { ArticleCard } from '../components/ArticleCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface BookmarksProps {
  readonly onArticleClick?: (article: Article) => void;
}

export function Bookmarks({ onArticleClick }: BookmarksProps): React.ReactElement {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchBookmarks = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await userService.getBookmarks(currentPage, 12);
        setArticles(response.data);
        setTotalPages(response.pagination?.total_pages || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bookmarks');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchBookmarks();
  }, [currentPage]);

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-8)' }}>
        <h2
          className="font-bold"
          style={{
            fontSize: 'var(--typography-font-size-2xl)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          Your Bookmarks
        </h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Articles you have saved for later reading
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center" style={{ padding: 'var(--spacing-12) 0' }}>
          <LoadingSpinner size="lg" label="Loading bookmarks..." />
        </div>
      )}

      {error && !isLoading && (
        <div
          style={{
            background: 'var(--gradient-badge-critical)',
            border: '1px solid var(--color-semantic-error)',
            color: 'var(--color-semantic-error)',
            padding: 'var(--spacing-3) var(--spacing-4)',
            borderRadius: 'var(--border-radius-md)',
          }}
        >
          {error}
        </div>
      )}

      {!isLoading && !error && articles.length === 0 && (
        <Card
          className="text-center"
          style={{ padding: 'var(--spacing-12)' }}
        >
          <p style={{ fontSize: 'var(--typography-font-size-4xl)', marginBottom: 'var(--spacing-4)' }}>
            📚
          </p>
          <p
            style={{
              fontSize: 'var(--typography-font-size-lg)',
              color: 'var(--color-text-secondary)',
            }}
          >
            No bookmarks yet
          </p>
          <p
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-muted)',
              marginTop: 'var(--spacing-2)',
            }}
          >
            Save articles to read later by clicking the bookmark icon
          </p>
        </Card>
      )}

      {!isLoading && !error && articles.length > 0 && (
        <>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            style={{ gap: 'var(--spacing-6)' }}
          >
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => onArticleClick?.(article)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div
              className="flex justify-center items-center"
              style={{ gap: 'var(--spacing-4)', marginTop: 'var(--spacing-8)' }}
            >
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

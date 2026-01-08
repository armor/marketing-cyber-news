/**
 * Reading History Page - Fortified Horizon Theme
 *
 * Shows user's reading history with timestamps.
 * Uses CSS custom properties for all styling values.
 */
import { useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import type { Article } from '../types';
import { userService } from '../services/userService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface HistoryEntry {
  article: Article;
  read_at: string;
  reading_time_seconds: number;
}

interface HistoryProps {
  onArticleClick: (article: Article) => void;
}

export function History({ onArticleClick }: HistoryProps): ReactElement {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.getReadingHistory(currentPage, 20);
      setHistory(response.data);
      setTotalPages(response.pagination?.total_pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatReadingTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  // Map severity to badge variant
  const getSeverityVariant = (severity: string): 'critical' | 'warning' | 'info' | 'success' => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'success';
    }
  };

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
          Reading History
        </h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Articles you've read recently
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center" style={{ padding: 'var(--spacing-12) 0' }}>
          <LoadingSpinner size="lg" label="Loading history..." />
        </div>
      )}

      {/* Error State */}
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

      {/* Empty State */}
      {!isLoading && !error && history.length === 0 && (
        <Card
          className="text-center"
          style={{ padding: 'var(--spacing-12)' }}
        >
          <p style={{ fontSize: 'var(--typography-font-size-4xl)', marginBottom: 'var(--spacing-4)' }}>
            📖
          </p>
          <p
            style={{
              fontSize: 'var(--typography-font-size-lg)',
              color: 'var(--color-text-secondary)',
            }}
          >
            No reading history yet
          </p>
          <p
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-muted)',
              marginTop: 'var(--spacing-2)',
            }}
          >
            Articles you read will appear here
          </p>
        </Card>
      )}

      {/* History List */}
      {!isLoading && !error && history.length > 0 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {history.map((entry, index) => (
              <Card
                key={`${entry.article.id}-${index}`}
                onClick={() => onArticleClick(entry.article)}
                className="flex items-center cursor-pointer transition-all hover:scale-[1.01]"
                style={{
                  padding: 'var(--spacing-4)',
                  gap: 'var(--spacing-4)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center" style={{ gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-1)' }}>
                    <Badge variant={getSeverityVariant(entry.article.severity)}>
                      {entry.article.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="info">
                      {entry.article.category}
                    </Badge>
                  </div>
                  <h3
                    className="truncate font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {entry.article.title}
                  </h3>
                </div>
                <div
                  className="text-right flex-shrink-0"
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <p>{formatDate(entry.read_at)}</p>
                  <p style={{ fontSize: 'var(--typography-font-size-xs)' }}>
                    Read for {formatReadingTime(entry.reading_time_seconds)}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
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

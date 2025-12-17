import { useState, useEffect } from 'react';
import React from 'react';
import type { Article } from '../types';
import { userService } from '../services/userService';
import { ArticleCard } from '../components/ArticleCard';

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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">🔖 Your Bookmarks</h2>
        <p className="text-gray-400">Articles you have saved for later reading</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {!isLoading && !error && articles.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-4xl mb-4">🔖</p>
          <p className="text-lg text-gray-300">No bookmarks yet</p>
          <p className="text-sm text-gray-500 mt-2">Save articles to read later by clicking the bookmark icon</p>
        </div>
      )}

      {!isLoading && !error && articles.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => onArticleClick?.(article)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

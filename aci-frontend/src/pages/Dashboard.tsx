import { useState } from 'react';
import { Layout } from '../components/Layout';
import { ArticleList } from '../components/ArticleList';
import { ArticleDetail } from '../components/ArticleDetail';
import { NotificationToast } from '../components/NotificationToast';
import { Bookmarks } from './Bookmarks';
import { History } from './History';
import { Stats } from './Stats';
import { useArticles } from '../hooks';
import type { Article } from '../types';

type Page = 'articles' | 'bookmarks' | 'history' | 'stats';

export function Dashboard(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<Page>('articles');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const { articles, isLoading, error } = useArticles();

  const renderPage = (): React.JSX.Element | null => {
    switch (currentPage) {
      case 'articles':
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
                Latest Cyber Intelligence
              </h2>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Stay informed about the latest cybersecurity threats and vulnerabilities
              </p>
            </div>
            {isLoading && (
              <div className="text-center" style={{ padding: 'var(--spacing-12) 0' }}>
                <div
                  className="animate-spin mx-auto"
                  style={{
                    width: 'var(--spacing-12)',
                    height: 'var(--spacing-12)',
                    borderRadius: 'var(--border-radius-full)',
                    borderWidth: 'var(--border-width-medium)',
                    borderColor: 'var(--color-border-default)',
                    borderTopColor: 'var(--color-brand-primary)',
                  }}
                ></div>
              </div>
            )}
            {error && (
              <div
                className="text-center"
                style={{
                  padding: 'var(--spacing-12) 0',
                  color: 'var(--color-semantic-error)',
                }}
              >
                Error loading articles: {error}
              </div>
            )}
            {!isLoading && !error && (
              <ArticleList
                articles={articles}
                onArticleClick={(article) => setSelectedArticle(article)}
              />
            )}
          </div>
        );
      case 'bookmarks':
        return <Bookmarks onArticleClick={(article) => setSelectedArticle(article)} />;
      case 'history':
        return <History onArticleClick={(article) => setSelectedArticle(article)} />;
      case 'stats':
        return <Stats />;
      default:
        return null;
    }
  };

  return (
    <Layout onNavigate={setCurrentPage} currentPage={currentPage}>
      {renderPage()}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <ArticleDetail
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}

      {/* Real-time Notifications */}
      <NotificationToast />
    </Layout>
  );
}

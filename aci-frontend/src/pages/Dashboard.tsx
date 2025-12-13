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
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Latest Cyber Intelligence</h2>
              <p className="text-gray-400">Stay informed about the latest cybersecurity threats and vulnerabilities</p>
            </div>
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
              </div>
            )}
            {error && (
              <div className="text-center py-12 text-red-400">
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

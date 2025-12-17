import type { Article } from '../types';
import { ArticleCard } from './ArticleCard';

interface ArticleListProps {
  articles: Article[];
  onArticleClick: (article: Article) => void;
}

export function ArticleList({ articles, onArticleClick }: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          paddingTop: 'var(--spacing-12)',
          paddingBottom: 'var(--spacing-12)',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--typography-font-size-base)',
        }}
      >
        No articles found
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--spacing-gap-md)',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      }}
      className="md:grid-cols-2 lg:grid-cols-3"
    >
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          onClick={() => onArticleClick(article)}
        />
      ))}
    </div>
  );
}

import type { Article } from '../types';
import { ArticleCard } from './ArticleCard';

interface ArticleListProps {
  articles: Article[];
  onArticleClick: (article: Article) => void;
}

export function ArticleList({ articles, onArticleClick }: ArticleListProps) {
  // Placeholder - will be enhanced by another agent
  if (articles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No articles found
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

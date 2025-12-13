import type { Article } from '../types';

interface ArticleCardProps {
  article: Article;
  onClick: () => void;
}

export function ArticleCard({ article, onClick }: ArticleCardProps) {
  // Placeholder - will be implemented by another agent
  return (
    <div
      onClick={onClick}
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
    >
      <h3 className="text-white font-medium">{article.title}</h3>
      <p className="text-gray-400 text-sm mt-2">{article.summary}</p>
    </div>
  );
}

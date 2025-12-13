import type { JSX } from 'react';

interface BookmarkButtonProps {
  articleId: string;
  isBookmarked: boolean;
  onToggle: () => void;
}

export function BookmarkButton({ isBookmarked, onToggle }: BookmarkButtonProps): JSX.Element {
  return (
    <button
      onClick={onToggle}
      className={'px-3 py-1.5 rounded-lg transition-colors ' + (isBookmarked ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}
    >
      {isBookmarked ? '🔖 Bookmarked' : '🔖 Bookmark'}
    </button>
  );
}

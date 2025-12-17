import React from 'react';

interface BookmarkButtonProps {
  articleId: string;
  isBookmarked: boolean;
  onToggle: () => void;
}

export function BookmarkButton({ isBookmarked, onToggle }: BookmarkButtonProps): React.ReactElement {
  const [isHovered, setIsHovered] = React.useState(false);

  const buttonStyle = isBookmarked
    ? {
        background: 'var(--gradient-btn-trust)',
        color: 'var(--color-text-primary)',
        boxShadow: 'var(--shadow-btn-accent)',
      }
    : {
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-secondary)',
        boxShadow: 'var(--shadow-sm)',
      };

  const hoverStyle = !isBookmarked && isHovered
    ? {
        backgroundColor: 'var(--color-bg-elevated)',
      }
    : {};

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...buttonStyle,
        ...hoverStyle,
        paddingLeft: 'var(--spacing-3)',
        paddingRight: 'var(--spacing-3)',
        paddingTop: 'var(--spacing-2)',
        paddingBottom: 'var(--spacing-2)',
        borderRadius: 'var(--border-radius-lg)',
        border: 'none',
        cursor: 'pointer',
        fontSize: 'var(--typography-font-size-sm)',
        fontWeight: 'var(--typography-font-weight-medium)',
        transition: `all var(--motion-duration-fast) var(--motion-easing-default)`,
      }}
    >
      {isBookmarked ? '🔖 Bookmarked' : '🔖 Bookmark'}
    </button>
  );
}

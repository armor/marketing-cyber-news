import type { Article } from '../types';

interface ArticleCardProps {
  article: Article;
  onClick: () => void;
}

export function ArticleCard({ article, onClick }: ArticleCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: `var(--border-width-thin) solid var(--color-border-default)`,
        borderRadius: 'var(--border-radius-lg)',
        padding: 'var(--spacing-4)',
        cursor: 'pointer',
        transition: `all var(--motion-duration-fast) var(--motion-easing-default)`,
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-brand-primary)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-default)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <h3
        style={{
          color: 'var(--color-text-primary)',
          fontWeight: 'var(--typography-font-weight-medium)',
          fontSize: 'var(--typography-font-size-base)',
        }}
      >
        {article.title}
      </h3>
      <p
        style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--typography-font-size-sm)',
          marginTop: 'var(--spacing-2)',
          lineHeight: 'var(--typography-line-height-normal)',
        }}
      >
        {article.summary}
      </p>
    </div>
  );
}

import type { Article } from '../types';

interface ArticleDetailProps {
  article: Article;
  onClose: () => void;
}

export function ArticleDetail({ article, onClose }: ArticleDetailProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 'var(--spacing-4)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 'var(--border-radius-lg)',
          maxWidth: '64rem',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ padding: 'var(--spacing-6)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 'var(--spacing-4)',
            }}
          >
            <h2
              style={{
                fontSize: 'var(--typography-font-size-2xl)',
                fontWeight: 'var(--typography-font-weight-bold)',
                color: 'var(--color-text-primary)',
              }}
            >
              {article.title}
            </h2>
            <button
              onClick={onClose}
              style={{
                color: 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--typography-font-size-xl)',
                padding: 'var(--spacing-2)',
                transition: `color var(--motion-duration-fast) var(--motion-easing-default)`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              ✕
            </button>
          </div>
          <p
            style={{
              color: 'var(--color-text-primary)',
              lineHeight: 'var(--typography-line-height-relaxed)',
            }}
          >
            {article.content}
          </p>
        </div>
      </div>
    </div>
  );
}

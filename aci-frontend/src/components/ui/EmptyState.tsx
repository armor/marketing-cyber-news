import type { ReactNode } from 'react';

interface EmptyStateAction {
  readonly label: string;
  readonly onClick: () => void;
}

interface EmptyStateProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: EmptyStateAction;
  readonly className?: string;
}

/**
 * EmptyState Component
 *
 * Display when no data is available. Provides optional icon, title,
 * description, and action button.
 *
 * @example
 * <EmptyState
 *   title="No articles found"
 *   description="Try adjusting your filters or search terms"
 * />
 *
 * @example With icon and action
 * <EmptyState
 *   icon={<BookmarkIcon />}
 *   title="No bookmarks yet"
 *   description="Save articles to read later"
 *   action={{ label: "Browse Articles", onClick: () => navigate('/') }}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${className}`}
      style={{
        padding: 'var(--spacing-component-xl)',
      }}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div
          className="[&>svg]:text-text-muted"
          style={{
            marginBottom: 'var(--spacing-component-md)',
          }}
          aria-hidden="true"
        >
          <div style={{ width: 'var(--spacing-16)', height: 'var(--spacing-16)' }}>
            {icon}
          </div>
        </div>
      )}

      <h2
        style={{
          marginBottom: 'var(--spacing-component-sm)',
          fontSize: 'var(--typography-font-size-xl)',
          fontWeight: 'var(--typography-font-weight-semibold)',
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </h2>

      {description && (
        <p
          className="max-w-md"
          style={{
            marginBottom: 'var(--spacing-component-md)',
            fontSize: 'var(--typography-font-size-base)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {description}
        </p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            borderRadius: 'var(--border-radius-md)',
            backgroundColor: 'var(--color-brand-primary)',
            paddingLeft: 'var(--spacing-component-md)',
            paddingRight: 'var(--spacing-component-md)',
            paddingTop: 'var(--spacing-component-sm)',
            paddingBottom: 'var(--spacing-component-sm)',
            fontSize: 'var(--typography-font-size-base)',
            fontWeight: 'var(--typography-font-weight-medium)',
            color: 'white',
            transitionProperty: 'all',
            transitionDuration: 'var(--motion-duration-fast)',
          }}
          className="focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 hover:opacity-90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

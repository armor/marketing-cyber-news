/**
 * PageHeader Component
 *
 * Unified page header with breadcrumb navigation, title, description,
 * and optional action buttons. Ensures consistent styling across all pages.
 *
 * Features:
 * - Standardized breadcrumb with React Router Links
 * - ChevronRight separator icons
 * - Home icon on first breadcrumb item
 * - Consistent padding and typography
 * - Optional description and actions slot
 * - Design token integration
 *
 * @example
 * ```tsx
 * <PageHeader
 *   breadcrumbs={[
 *     { label: 'Dashboard', href: '/' },
 *     { label: 'Channels' }
 *   ]}
 *   title="Channel Management"
 *   description="Connect and manage your social media channels"
 *   actions={<Button>Add Channel</Button>}
 * />
 * ```
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface BreadcrumbItem {
  /** Display label for the breadcrumb */
  label: string;
  /** Optional href - if omitted, renders as current page (no link) */
  href?: string;
}

export interface PageHeaderProps {
  /** Breadcrumb navigation items */
  breadcrumbs: BreadcrumbItem[];
  /** Page title */
  title: string;
  /** Optional page description */
  description?: string;
  /** Optional action buttons or elements */
  actions?: ReactNode;
  /** Optional additional content below title row */
  children?: ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export function PageHeader({
  breadcrumbs,
  title,
  description,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div
      className="shrink-0"
      style={{
        padding: 'var(--spacing-4) var(--spacing-6)',
        borderBottom: '1px solid var(--color-border-default)',
        background: 'var(--color-bg-elevated)',
      }}
    >
      {/* Breadcrumb Navigation */}
      <nav
        className="flex items-center text-sm mb-3"
        style={{ color: 'var(--color-text-muted)' }}
        aria-label="Breadcrumb"
      >
        <ol className="flex items-center gap-1">
          {breadcrumbs.map((crumb, index) => {
            const isFirst = index === 0;
            const isLast = index === breadcrumbs.length - 1;

            return (
              <li key={crumb.label} className="flex items-center">
                {/* Separator (except for first item) */}
                {!isFirst && (
                  <ChevronRight
                    className="size-4 mx-1 flex-shrink-0"
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-hidden="true"
                  />
                )}

                {/* Breadcrumb item */}
                {crumb.href && !isLast ? (
                  <Link
                    to={crumb.href}
                    className="flex items-center gap-1.5 hover:text-[var(--color-text-primary)] transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {isFirst && (
                      <Home className="size-4 flex-shrink-0" aria-hidden="true" />
                    )}
                    <span>{crumb.label}</span>
                  </Link>
                ) : (
                  <span
                    className="flex items-center gap-1.5"
                    style={{
                      color: isLast
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-muted)',
                      fontWeight: isLast
                        ? 'var(--typography-font-weight-medium)'
                        : 'var(--typography-font-weight-normal)',
                    }}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {isFirst && !crumb.href && (
                      <Home className="size-4 flex-shrink-0" aria-hidden="true" />
                    )}
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1
            style={{
              fontSize: 'var(--typography-font-size-2xl)',
              fontWeight: 'var(--typography-font-weight-bold)',
              color: 'var(--color-text-primary)',
              lineHeight: 'var(--typography-line-height-tight)',
              margin: 0,
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
                marginTop: 'var(--spacing-1)',
                margin: 0,
                marginBlockStart: 'var(--spacing-1)',
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Actions slot */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>

      {/* Optional children content */}
      {children && (
        <div style={{ marginTop: 'var(--spacing-4)' }}>{children}</div>
      )}
    </div>
  );
}

PageHeader.displayName = 'PageHeader';

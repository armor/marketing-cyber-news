import type { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  onNavigate: (page: 'articles' | 'bookmarks' | 'history' | 'stats') => void;
  currentPage: string;
}

export function Layout({ children, onNavigate, currentPage }: LayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--gradient-page)',
      }}
    >
      <Header onNavigate={onNavigate} currentPage={currentPage} />
      <main
        style={{
          maxWidth: '80rem',
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: 'var(--spacing-4)',
          paddingTop: 'var(--spacing-8)',
          paddingBottom: 'var(--spacing-8)',
        }}
      >
        {children}
      </main>
      <footer
        style={{
          borderTop: `var(--border-width-thin) solid var(--color-border-default)`,
          paddingTop: 'var(--spacing-6)',
          paddingBottom: 'var(--spacing-6)',
          marginTop: 'var(--spacing-8)',
          backgroundColor: 'var(--color-bg-elevated)',
        }}
      >
        <div
          style={{
            maxWidth: '80rem',
            marginLeft: 'auto',
            marginRight: 'auto',
            padding: 'var(--spacing-4)',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--typography-font-size-sm)',
          }}
        >
          <p>
            <span
              style={{
                color: 'var(--color-brand-primary)',
                fontWeight: 'var(--typography-font-weight-semibold)',
              }}
            >
              NEXUS
            </span>{' '}
            by Armor
          </p>
          <p
            style={{
              marginTop: 'var(--spacing-1)',
              fontSize: 'var(--typography-font-size-xs)',
            }}
          >
            Proactive Cyber Defense | © 2025 Armor
          </p>
        </div>
      </footer>
    </div>
  );
}

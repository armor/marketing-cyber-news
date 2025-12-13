import type { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  onNavigate: (page: 'articles' | 'bookmarks' | 'history' | 'stats') => void;
  currentPage: string;
}

export function Layout({ children, onNavigate, currentPage }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900">
      <Header onNavigate={onNavigate} currentPage={currentPage} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-gray-800 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p><span className="text-primary font-semibold">NEXUS</span> by Armor</p>
          <p className="mt-1 text-xs">Proactive Cyber Defense | © 2025 Armor</p>
        </div>
      </footer>
    </div>
  );
}

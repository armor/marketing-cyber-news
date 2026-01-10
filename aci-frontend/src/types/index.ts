// Core Types for ACI Frontend
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Category {
  slug: string;
  name: string;
  description?: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  published_at: string;
  source: string;
  bookmarked: boolean;
  read: boolean;
}

export interface BookmarkResponse {
  success: boolean;
  bookmarked: boolean;
}

export interface ReadResponse {
  success: boolean;
  read: boolean;
}

export interface StatsData {
  total_articles: number;
  total_bookmarks: number;
  articles_by_category: Record<string, number>;
  articles_by_severity: Record<string, number>;
  recent_activity: Array<{
    date: string;
    count: number;
  }>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

// Export all approval workflow types
export * from './approval';

// Export all voice transformation types
export * from './voice';

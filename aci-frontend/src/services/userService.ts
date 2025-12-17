import { apiClient } from '@/services/api/client';
import type { Article, ApiResponse, PaginationMeta } from '../types';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  total_articles_read: number;
  total_reading_time_seconds: number;
  total_bookmarks: number;
  favorite_category?: {
    name: string;
    slug: string;
    count: number;
  };
  articles_read_this_week: number;
  reading_streak_days: number;
}

export interface BookmarkListResponse {
  data: Article[];
  pagination: PaginationMeta;
}

export interface ReadHistoryResponse {
  data: Array<{
    article: Article;
    read_at: string;
    reading_time_seconds: number;
  }>;
  pagination: PaginationMeta;
}

export const userService = {
  async getProfile(): Promise<ApiResponse<User>> {
    return apiClient.get<ApiResponse<User>>('/v1/users/me');
  },

  async updateProfile(data: { name?: string }): Promise<ApiResponse<User>> {
    return apiClient.post<ApiResponse<User>>('/v1/users/me', data);
  },

  async getBookmarks(page = 1, limit = 20): Promise<BookmarkListResponse> {
    return apiClient.get<BookmarkListResponse>('/v1/users/me/bookmarks', {
      page: page.toString(),
      limit: limit.toString(),
    });
  },

  async getReadingHistory(page = 1, limit = 20): Promise<ReadHistoryResponse> {
    return apiClient.get<ReadHistoryResponse>('/v1/users/me/history', {
      page: page.toString(),
      limit: limit.toString(),
    });
  },

  async getStats(): Promise<ApiResponse<UserStats>> {
    return apiClient.get<ApiResponse<UserStats>>('/v1/users/me/stats');
  },
};

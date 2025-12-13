import { apiClient } from './api';
import type { Article, ApiResponse, PaginationMeta } from '../types';

export interface ArticleFilters {
  page?: number;
  limit?: number;
  category?: string;
  severity?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  source_id?: string;
  has_cve?: boolean;
  vendor?: string;
  sort_by?: 'published_at' | 'severity' | 'relevance' | 'armor_relevance';
  sort_order?: 'asc' | 'desc';
}

export interface ArticleListResponse {
  data: Article[];
  pagination: PaginationMeta;
}

export const articleService = {
  async getArticles(filters: ArticleFilters = {}): Promise<ArticleListResponse> {
    const params: Record<string, string> = {};

    if (filters.page) params.page = filters.page.toString();
    if (filters.limit) params.limit = filters.limit.toString();
    if (filters.category) params.category = filters.category;
    if (filters.severity) params.severity = filters.severity;
    if (filters.search) params.search = filters.search;
    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;
    if (filters.source_id) params.source_id = filters.source_id;
    if (filters.has_cve !== undefined) params.has_cve = filters.has_cve.toString();
    if (filters.vendor) params.vendor = filters.vendor;
    if (filters.sort_by) params.sort_by = filters.sort_by;
    if (filters.sort_order) params.sort_order = filters.sort_order;

    return apiClient.get<ArticleListResponse>('/v1/articles', params);
  },

  async getArticle(id: string): Promise<ApiResponse<Article>> {
    return apiClient.get<ApiResponse<Article>>(`/v1/articles/${id}`);
  },

  async getArticleBySlug(slug: string): Promise<ApiResponse<Article>> {
    return apiClient.get<ApiResponse<Article>>(`/v1/articles/slug/${slug}`);
  },

  async searchArticles(query: string, limit = 20): Promise<ArticleListResponse> {
    return apiClient.get<ArticleListResponse>('/v1/articles/search', {
      q: query,
      limit: limit.toString(),
    });
  },

  async bookmarkArticle(id: string): Promise<void> {
    await apiClient.post(`/v1/articles/${id}/bookmark`);
  },

  async removeBookmark(id: string): Promise<void> {
    await apiClient.delete(`/v1/articles/${id}/bookmark`);
  },

  async markAsRead(id: string, readingTimeSeconds?: number): Promise<void> {
    await apiClient.post(`/v1/articles/${id}/read`, {
      reading_time_seconds: readingTimeSeconds,
    });
  },
};

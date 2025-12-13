import { apiClient } from './api';
import type { Category, ApiResponse } from '../types';

export interface CategoryListResponse {
  data: Category[];
}

export const categoryService = {
  async getCategories(): Promise<CategoryListResponse> {
    return apiClient.get<CategoryListResponse>('/v1/categories');
  },

  async getCategory(slug: string): Promise<ApiResponse<Category>> {
    return apiClient.get<ApiResponse<Category>>(`/v1/categories/${slug}`);
  },
};

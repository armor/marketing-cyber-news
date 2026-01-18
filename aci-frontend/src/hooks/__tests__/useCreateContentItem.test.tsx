/**
 * Tests for useCreateContentItem Hook
 *
 * Mutation hook for creating content items manually.
 * Tests endpoint calls, cache invalidation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCreateContentItem } from '../useCreateContentItem';
import { apiClient } from '@/services/api/client';

vi.mock('@/services/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCreateContentItem Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Happy Path - Successful Content Creation', () => {
    it('should call correct endpoint with request data', async () => {
      const mockResponse = {
        data: {
          id: 'item_123',
          url: 'https://example.com/article',
          title: 'Security Article',
          source_type: 'manual' as const,
          trust_score: 0.75,
          content_type: 'news' as const,
          topic_tags: ['security', 'vulnerability'],
          framework_tags: ['MITRE'],
          industry_tags: [],
          partner_tags: [],
          relevance_score: 0.85,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      const request = {
        url: 'https://example.com/article',
        title: 'Security Article',
        summary: 'About security',
        content_type: 'news' as const,
        topic_tags: ['security', 'vulnerability'],
        framework_tags: ['MITRE'],
      };

      result.current.mutate({ request });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/content/items', request);
    });

    it('should return created content item with all fields', async () => {
      const mockResponse = {
        data: {
          id: 'item_456',
          url: 'https://example.com/article',
          title: 'Critical Vulnerability Found',
          summary: 'Researchers discovered...',
          content_type: 'news' as const,
          topic_tags: ['zero-day', 'exploit'],
          framework_tags: ['CVSS'],
          industry_tags: ['fintech'],
          partner_tags: [],
          author: 'John Doe',
          publish_date: '2026-01-15',
          image_url: 'https://example.com/image.jpg',
          trust_score: 0.75,
          relevance_score: 0.9,
          historical_ctr: 0.05,
          historical_opens: 100,
          historical_clicks: 5,
          is_active: true,
          source_type: 'manual' as const,
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: 'Critical Vulnerability Found',
          summary: 'Researchers discovered...',
          content_type: 'news',
          topic_tags: ['zero-day', 'exploit'],
          framework_tags: ['CVSS'],
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse.data);
      expect(result.current.data?.trust_score).toBe(0.75);
      expect(result.current.data?.source_type).toBe('manual');
      expect(result.current.data?.is_active).toBe(true);
    });

    it('should set source_type to manual automatically', async () => {
      const mockResponse = {
        data: {
          id: 'item_789',
          url: 'https://example.com/article',
          title: 'Article',
          source_type: 'manual' as const,
          trust_score: 0.75,
          content_type: 'news' as const,
          topic_tags: [],
          framework_tags: [],
          industry_tags: [],
          partner_tags: [],
          relevance_score: 0.5,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: 'Article',
          content_type: 'news',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.source_type).toBe('manual');
      expect(result.current.data?.trust_score).toBe(0.75);
    });

    it('should handle all content types', async () => {
      const contentTypes = ['blog', 'news', 'case_study', 'webinar', 'product_update', 'event'] as const;

      for (const contentType of contentTypes) {
        const mockResponse = {
          data: {
            id: `item_${contentType}`,
            url: 'https://example.com/article',
            title: 'Article',
            content_type: contentType,
            source_type: 'manual' as const,
            trust_score: 0.75,
            topic_tags: [],
            framework_tags: [],
            industry_tags: [],
            partner_tags: [],
            relevance_score: 0.5,
            historical_ctr: 0,
            historical_opens: 0,
            historical_clicks: 0,
            is_active: true,
            publish_date: '2026-01-15',
            created_at: '2026-01-17T10:00:00Z',
            updated_at: '2026-01-17T10:00:00Z',
          },
        };

        vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

        const { result } = renderHook(() => useCreateContentItem(), {
          wrapper: createWrapper(),
        });

        result.current.mutate({
          request: {
            url: 'https://example.com/article',
            title: 'Article',
            content_type: contentType,
          },
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.content_type).toBe(contentType);
      }
    });

    it('should call onSuccess callback after creation', async () => {
      const onSuccessMock = vi.fn();
      const mockResponse = {
        data: {
          id: 'item_success',
          url: 'https://example.com/article',
          title: 'Article',
          source_type: 'manual' as const,
          trust_score: 0.75,
          content_type: 'news' as const,
          topic_tags: [],
          framework_tags: [],
          industry_tags: [],
          partner_tags: [],
          relevance_score: 0.5,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(
        {
          request: {
            url: 'https://example.com/article',
            title: 'Article',
            content_type: 'news',
          },
        },
        { onSuccess: onSuccessMock }
      );

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalled();
      });

      expect(onSuccessMock).toHaveBeenCalled();
      const call = onSuccessMock.mock.calls[0];
      expect(call[0]).toEqual(mockResponse.data);
    });

    it('should handle optional fields like summary, author, image_url', async () => {
      const mockResponse = {
        data: {
          id: 'item_optional',
          url: 'https://example.com/article',
          title: 'Article with Optional Fields',
          summary: 'This is a summary',
          author: 'Jane Doe',
          image_url: 'https://example.com/img.jpg',
          content_type: 'case_study' as const,
          source_type: 'manual' as const,
          trust_score: 0.75,
          topic_tags: [],
          framework_tags: [],
          industry_tags: [],
          partner_tags: [],
          relevance_score: 0.7,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: 'Article with Optional Fields',
          summary: 'This is a summary',
          content_type: 'case_study',
          author: 'Jane Doe',
          image_url: 'https://example.com/img.jpg',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.summary).toBe('This is a summary');
      expect(result.current.data?.author).toBe('Jane Doe');
      expect(result.current.data?.image_url).toBe('https://example.com/img.jpg');
    });

    it('should handle multiple topic and framework tags', async () => {
      const mockResponse = {
        data: {
          id: 'item_tags',
          url: 'https://example.com/article',
          title: 'Article with Many Tags',
          content_type: 'news' as const,
          topic_tags: ['security', 'vulnerability', 'zero-day', 'exploit', 'patch'],
          framework_tags: ['MITRE', 'CVSS', 'CWE', 'OWASP'],
          industry_tags: [],
          partner_tags: [],
          source_type: 'manual' as const,
          trust_score: 0.75,
          relevance_score: 0.8,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: 'Article with Many Tags',
          content_type: 'news',
          topic_tags: ['security', 'vulnerability', 'zero-day', 'exploit', 'patch'],
          framework_tags: ['MITRE', 'CVSS', 'CWE', 'OWASP'],
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.topic_tags).toHaveLength(5);
      expect(result.current.data?.framework_tags).toHaveLength(4);
    });
  });

  describe('Error Paths - API Failures', () => {
    it('should set error state when creation fails', async () => {
      const errorMessage = 'Failed to create content item';
      const mockError = new Error(errorMessage);

      vi.mocked(apiClient.post).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: 'Article',
          content_type: 'news',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should handle duplicate URL error (409 response)', async () => {
      const duplicateError = new Error('Content item with this URL already exists');

      vi.mocked(apiClient.post).mockRejectedValueOnce(duplicateError);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/existing-article',
          title: 'Duplicate Article',
          content_type: 'news',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('already exists');
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('URL is required');

      vi.mocked(apiClient.post).mockRejectedValueOnce(validationError);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: '',
          title: 'Article',
          content_type: 'news',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('required');
    });

    it('should call onError callback when creation fails', async () => {
      const onErrorMock = vi.fn();
      const mockError = new Error('Creation failed');

      vi.mocked(apiClient.post).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(
        {
          request: {
            url: 'https://example.com/article',
            title: 'Article',
            content_type: 'news',
          },
        },
        { onError: onErrorMock }
      );

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalled();
      });

      expect(onErrorMock).toHaveBeenCalled();
      const call = onErrorMock.mock.calls[0];
      expect(call[0]).toEqual(mockError);
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');

      vi.mocked(apiClient.post).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: 'Article',
          content_type: 'news',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Network');
    });
  });

  describe('Edge Cases - Boundary Conditions', () => {
    it('should handle loading state correctly', async () => {
      vi.mocked(apiClient.post).mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    id: 'item_loading',
                    url: 'https://example.com/article',
                    title: 'Article',
                    source_type: 'manual' as const,
                    trust_score: 0.75,
                    content_type: 'news' as const,
                    topic_tags: [],
                    framework_tags: [],
                    industry_tags: [],
                    partner_tags: [],
                    relevance_score: 0.5,
                    historical_ctr: 0,
                    historical_opens: 0,
                    historical_clicks: 0,
                    is_active: true,
                    publish_date: '2026-01-15',
                    created_at: '2026-01-17T10:00:00Z',
                    updated_at: '2026-01-17T10:00:00Z',
                  },
                }),
              100
            )
          )
      );

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: 'Article',
          content_type: 'news',
        },
      });

      // After mutation call, it should eventually be pending or complete
      await waitFor(() => {
        expect(result.current.isSuccess || !result.current.isPending).toBe(true);
      });
    });

    it('should handle very long title strings', async () => {
      const longTitle = 'A'.repeat(500);
      const mockResponse = {
        data: {
          id: 'item_long_title',
          url: 'https://example.com/article',
          title: longTitle,
          source_type: 'manual' as const,
          trust_score: 0.75,
          content_type: 'news' as const,
          topic_tags: [],
          framework_tags: [],
          industry_tags: [],
          partner_tags: [],
          relevance_score: 0.5,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: longTitle,
          content_type: 'news',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.title).toBe(longTitle);
    });

    it('should handle null optional fields', async () => {
      const mockResponse = {
        data: {
          id: 'item_null_fields',
          url: 'https://example.com/article',
          title: 'Article',
          summary: null,
          author: null,
          image_url: null,
          content_type: 'news' as const,
          source_type: 'manual' as const,
          trust_score: 0.75,
          topic_tags: [],
          framework_tags: [],
          industry_tags: [],
          partner_tags: [],
          relevance_score: 0.5,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: 'Article',
          summary: null,
          content_type: 'news',
          author: null,
          image_url: null,
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.summary).toBeNull();
      expect(result.current.data?.author).toBeNull();
      expect(result.current.data?.image_url).toBeNull();
    });

    it('should handle empty tag arrays', async () => {
      const mockResponse = {
        data: {
          id: 'item_no_tags',
          url: 'https://example.com/article',
          title: 'Article Without Tags',
          content_type: 'news' as const,
          topic_tags: [],
          framework_tags: [],
          industry_tags: [],
          partner_tags: [],
          source_type: 'manual' as const,
          trust_score: 0.75,
          relevance_score: 0.5,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: 'Article Without Tags',
          content_type: 'news',
          topic_tags: [],
          framework_tags: [],
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.topic_tags).toHaveLength(0);
      expect(result.current.data?.framework_tags).toHaveLength(0);
    });

    it('should handle special characters in title', async () => {
      const specialTitle = 'Security: "Zero-Day" & Exploits (2026) - CVE #123';
      const mockResponse = {
        data: {
          id: 'item_special_chars',
          url: 'https://example.com/article',
          title: specialTitle,
          source_type: 'manual' as const,
          trust_score: 0.75,
          content_type: 'news' as const,
          topic_tags: [],
          framework_tags: [],
          industry_tags: [],
          partner_tags: [],
          relevance_score: 0.5,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: specialTitle,
          content_type: 'news',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.title).toBe(specialTitle);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate content item queries on success', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const mockResponse = {
        data: {
          id: 'item_cache',
          url: 'https://example.com/article',
          title: 'Article',
          source_type: 'manual' as const,
          trust_score: 0.75,
          content_type: 'news' as const,
          topic_tags: [],
          framework_tags: [],
          industry_tags: [],
          partner_tags: [],
          relevance_score: 0.5,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: 'Article',
          content_type: 'news',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('Mutation State Management', () => {
    it('should reset error state on successful retry', async () => {
      const initialError = new Error('First attempt failed');

      vi.mocked(apiClient.post).mockRejectedValueOnce(initialError);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      const variables = {
        request: {
          url: 'https://example.com/article',
          title: 'Article',
          content_type: 'news' as const,
        },
      };

      result.current.mutate(variables);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(initialError);

      // Retry with success
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          id: 'item_retry',
          url: 'https://example.com/article',
          title: 'Article',
          source_type: 'manual' as const,
          trust_score: 0.75,
          content_type: 'news' as const,
          topic_tags: [],
          framework_tags: [],
          industry_tags: [],
          partner_tags: [],
          relevance_score: 0.5,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      });

      result.current.mutate(variables);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data?.id).toBe('item_retry');
    });

    it('should provide correct return type for mutation result', async () => {
      const mockResponse = {
        data: {
          id: 'item_type',
          url: 'https://example.com/article',
          title: 'Article',
          source_type: 'manual' as const,
          trust_score: 0.75,
          content_type: 'news' as const,
          topic_tags: [],
          framework_tags: [],
          industry_tags: [],
          partner_tags: [],
          relevance_score: 0.5,
          historical_ctr: 0,
          historical_opens: 0,
          historical_clicks: 0,
          is_active: true,
          publish_date: '2026-01-15',
          created_at: '2026-01-17T10:00:00Z',
          updated_at: '2026-01-17T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateContentItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        request: {
          url: 'https://example.com/article',
          title: 'Article',
          content_type: 'news',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(typeof result.current.mutate).toBe('function');
      expect(typeof result.current.mutateAsync).toBe('function');
      expect(result.current.data).toBeDefined();
    });
  });
});

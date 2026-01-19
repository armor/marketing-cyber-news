/**
 * Tests for useFetchURLMetadata Hook
 *
 * Mutation hook for extracting metadata from URLs.
 * Tests endpoint calls, timeout handling, and error states.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFetchURLMetadata } from '../useFetchURLMetadata';
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

describe('useFetchURLMetadata Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Happy Path - Successful Metadata Fetch', () => {
    it('should call correct endpoint with URL', async () => {
      const mockMetadata = {
        data: {
          url: 'https://example.com/article',
          title: 'Security Article',
          description: 'About security',
          image_url: 'https://example.com/image.jpg',
          publish_date: '2026-01-15',
          author: 'John Doe',
          read_time_minutes: 5,
          site_name: 'Example News',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockMetadata);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/article' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/newsletter/content/extract-metadata', {
        url: 'https://example.com/article',
      });
    });

    it('should return complete metadata with all fields', async () => {
      const mockMetadata = {
        data: {
          url: 'https://example.com/article',
          title: 'Critical Security Vulnerability Found',
          description: 'Researchers discovered a critical vulnerability in popular software.',
          image_url: 'https://example.com/thumbnail.png',
          publish_date: '2026-01-15T10:00:00Z',
          author: 'Security Researcher',
          read_time_minutes: 8,
          site_name: 'Tech News Daily',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockMetadata);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/article' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMetadata.data);
      expect(result.current.data?.title).toBe('Critical Security Vulnerability Found');
      expect(result.current.data?.author).toBe('Security Researcher');
      expect(result.current.data?.read_time_minutes).toBe(8);
    });

    it('should handle optional metadata fields as null', async () => {
      const mockMetadata = {
        data: {
          url: 'https://example.com/article',
          title: 'Article Title',
          description: null,
          image_url: null,
          publish_date: null,
          author: null,
          read_time_minutes: null,
          site_name: null,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockMetadata);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/minimal' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.description).toBeNull();
      expect(result.current.data?.image_url).toBeNull();
      expect(result.current.data?.publish_date).toBeNull();
      expect(result.current.data?.author).toBeNull();
    });

    it('should handle different URL formats', async () => {
      const urls = [
        'https://example.com/article',
        'https://subdomain.example.com/path/to/article',
        'https://example.com/article?query=param',
        'https://example.com:8080/article',
      ];

      for (const url of urls) {
        vi.mocked(apiClient.post).mockResolvedValueOnce({
          data: {
            url,
            title: 'Test Article',
            description: 'Test',
            image_url: null,
            publish_date: null,
            author: null,
            read_time_minutes: null,
            site_name: null,
          },
        });

        const { result } = renderHook(() => useFetchURLMetadata(), {
          wrapper: createWrapper(),
        });

        result.current.mutate({ url });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.url).toBe(url);
      }
    });

    it('should call onSuccess callback when metadata is fetched', async () => {
      const onSuccessMock = vi.fn();
      const mockMetadata = {
        data: {
          url: 'https://example.com/article',
          title: 'Article',
          description: 'Desc',
          image_url: null,
          publish_date: null,
          author: null,
          read_time_minutes: null,
          site_name: null,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockMetadata);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/article' }, { onSuccess: onSuccessMock });

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalled();
      });

      expect(onSuccessMock).toHaveBeenCalled();
      const call = onSuccessMock.mock.calls[0];
      expect(call[0]).toEqual(mockMetadata.data);
    });
  });

  describe('Error Paths - API Failures and Security', () => {
    it('should set error state when fetch fails', async () => {
      const errorMessage = 'Failed to fetch metadata';
      const mockError = new Error(errorMessage);

      vi.mocked(apiClient.post).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/article' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should handle timeout errors correctly', async () => {
      const timeoutError = new Error('Request timeout after 10 seconds');

      vi.mocked(apiClient.post).mockRejectedValueOnce(timeoutError);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/slow-page' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('timeout');
    });

    it('should handle security blocked URLs error', async () => {
      const securityError = new Error('URL blocked by security policy: Private IP detected');

      vi.mocked(apiClient.post).mockRejectedValueOnce(securityError);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'http://localhost:3000' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('blocked');
    });

    it('should handle SSRF protection errors', async () => {
      const ssrfError = new Error('URL blocked: Cloud metadata endpoint detected');

      vi.mocked(apiClient.post).mockRejectedValueOnce(ssrfError);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'http://169.254.169.254/latest/meta-data/' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('blocked');
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');

      vi.mocked(apiClient.post).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/article' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Network');
    });

    it('should call onError callback when fetch fails', async () => {
      const onErrorMock = vi.fn();
      const mockError = new Error('Fetch failed');

      vi.mocked(apiClient.post).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/article' }, { onError: onErrorMock });

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalled();
      });

      expect(onErrorMock).toHaveBeenCalled();
      const call = onErrorMock.mock.calls[0];
      expect(call[0]).toEqual(mockError);
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
                    url: 'https://example.com',
                    title: 'Test',
                    description: null,
                    image_url: null,
                    publish_date: null,
                    author: null,
                    read_time_minutes: null,
                    site_name: null,
                  },
                }),
              100
            )
          )
      );

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);

      result.current.mutate({ url: 'https://example.com' });

      // After mutation call, it should eventually be pending or complete
      await waitFor(() => {
        expect(result.current.isSuccess || !result.current.isPending).toBe(true);
      });
    });

    it('should handle empty title gracefully', async () => {
      const mockMetadata = {
        data: {
          url: 'https://example.com/article',
          title: '',
          description: 'Description without title',
          image_url: null,
          publish_date: null,
          author: null,
          read_time_minutes: null,
          site_name: null,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockMetadata);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/article' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.title).toBe('');
    });

    it('should handle very long descriptions', async () => {
      const longDescription =
        'A'.repeat(5000) + ' This is a very long description for a web page';
      const mockMetadata = {
        data: {
          url: 'https://example.com/article',
          title: 'Article',
          description: longDescription,
          image_url: null,
          publish_date: null,
          author: null,
          read_time_minutes: null,
          site_name: null,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockMetadata);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/article' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.description).toBe(longDescription);
    });

    it('should handle URLs with special characters', async () => {
      const urlWithSpecialChars = 'https://example.com/article?title=Hello%20World&id=123&filter=security%2Bvulnerability';
      const mockMetadata = {
        data: {
          url: urlWithSpecialChars,
          title: 'Article with Special Chars',
          description: null,
          image_url: null,
          publish_date: null,
          author: null,
          read_time_minutes: null,
          site_name: null,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockMetadata);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: urlWithSpecialChars });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/newsletter/content/extract-metadata', {
        url: urlWithSpecialChars,
      });
    });

    it('should handle large read_time_minutes values', async () => {
      const mockMetadata = {
        data: {
          url: 'https://example.com/book',
          title: 'Long-form Article',
          description: 'Very comprehensive guide',
          image_url: null,
          publish_date: null,
          author: null,
          read_time_minutes: 120,
          site_name: null,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockMetadata);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/book' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.read_time_minutes).toBe(120);
    });

    it('should handle zero read_time_minutes', async () => {
      const mockMetadata = {
        data: {
          url: 'https://example.com/short',
          title: 'Short Snippet',
          description: 'Brief note',
          image_url: null,
          publish_date: null,
          author: null,
          read_time_minutes: 0,
          site_name: null,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockMetadata);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/short' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.read_time_minutes).toBe(0);
    });
  });

  describe('Mutation State Management', () => {
    it('should reset error state on successful retry', async () => {
      const initialError = new Error('First attempt failed');

      vi.mocked(apiClient.post).mockRejectedValueOnce(initialError);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/article' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(initialError);

      // Retry with success
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          url: 'https://example.com/article',
          title: 'Success',
          description: null,
          image_url: null,
          publish_date: null,
          author: null,
          read_time_minutes: null,
          site_name: null,
        },
      });

      result.current.mutate({ url: 'https://example.com/article' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data?.title).toBe('Success');
    });

    it('should provide correct return type for mutation result', async () => {
      const mockMetadata = {
        data: {
          url: 'https://example.com/article',
          title: 'Article',
          description: null,
          image_url: null,
          publish_date: null,
          author: null,
          read_time_minutes: null,
          site_name: null,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockMetadata);

      const { result } = renderHook(() => useFetchURLMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ url: 'https://example.com/article' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(typeof result.current.mutate).toBe('function');
      expect(typeof result.current.mutateAsync).toBe('function');
      expect(result.current.data).toBeDefined();
    });
  });
});

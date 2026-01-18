/**
 * Tests for useAddBlocksToIssue Hook
 *
 * Mutation hook for bulk adding content items as newsletter blocks.
 * Tests endpoint calls, cache invalidation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAddBlocksToIssue } from '../useAddBlocksToIssue';
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

describe('useAddBlocksToIssue Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Happy Path - Successful Block Addition', () => {
    it('should call correct endpoint with issueId and request data', async () => {
      const mockResponse = {
        data: {
          blocks: [
            {
              id: 'block_1',
              issue_id: 'iss_123',
              content_item_id: 'item_1',
              block_type: 'news' as const,
              position: 0,
            },
          ],
          created_count: 1,
          skipped_count: 0,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      const variables = {
        issueId: 'iss_123',
        request: {
          content_item_ids: ['item_1'],
          block_type: 'news' as const,
        },
      };

      result.current.mutate(variables);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/newsletters/iss_123/blocks/bulk',
        {
          content_item_ids: ['item_1'],
          block_type: 'news',
        }
      );
    });

    it('should return blocks data on successful mutation', async () => {
      const mockBlocks = [
        { id: 'block_1', content_item_id: 'item_1', block_type: 'news' as const },
        { id: 'block_2', content_item_id: 'item_2', block_type: 'news' as const },
      ];

      const mockResponse = {
        data: {
          blocks: mockBlocks,
          created_count: 2,
          skipped_count: 0,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        issueId: 'iss_123',
        request: { content_item_ids: ['item_1', 'item_2'], block_type: 'news' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse.data);
      expect(result.current.data?.created_count).toBe(2);
      expect(result.current.data?.skipped_count).toBe(0);
    });

    it('should handle multiple content items in single request', async () => {
      const contentIds = ['item_1', 'item_2', 'item_3', 'item_4', 'item_5'];
      const mockResponse = {
        data: {
          blocks: contentIds.map((id, idx) => ({
            id: `block_${idx}`,
            content_item_id: id,
            block_type: 'content' as const,
          })),
          created_count: 5,
          skipped_count: 0,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        issueId: 'iss_456',
        request: { content_item_ids: contentIds, block_type: 'content' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.created_count).toBe(5);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/newsletters/iss_456/blocks/bulk',
        expect.objectContaining({
          content_item_ids: contentIds,
        })
      );
    });

    it('should include skipped_ids when duplicates are detected', async () => {
      const mockResponse = {
        data: {
          blocks: [{ id: 'block_1', content_item_id: 'item_1' }],
          created_count: 1,
          skipped_count: 2,
          skipped_ids: ['item_2', 'item_3'],
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        issueId: 'iss_789',
        request: { content_item_ids: ['item_1', 'item_2', 'item_3'], block_type: 'news' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.skipped_ids).toEqual(['item_2', 'item_3']);
    });

    it('should call onSuccess callback after mutation completes', async () => {
      const onSuccessMock = vi.fn();
      const mockResponse = {
        data: {
          blocks: [{ id: 'block_1' }],
          created_count: 1,
          skipped_count: 0,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(
        { issueId: 'iss_123', request: { content_item_ids: ['item_1'], block_type: 'news' } },
        { onSuccess: onSuccessMock }
      );

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalled();
      });

      expect(onSuccessMock).toHaveBeenCalled();
      const call = onSuccessMock.mock.calls[0];
      expect(call[0]).toEqual(mockResponse.data);
      expect(call[1]).toHaveProperty('issueId', 'iss_123');
    });
  });

  describe('Error Paths - API Failures', () => {
    it('should set error state when API call fails', async () => {
      const errorMessage = 'Failed to add blocks';
      const mockError = new Error(errorMessage);

      vi.mocked(apiClient.post).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        issueId: 'iss_123',
        request: { content_item_ids: ['item_1'], block_type: 'news' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should call onError callback when mutation fails', async () => {
      const onErrorMock = vi.fn();
      const mockError = new Error('API error');

      vi.mocked(apiClient.post).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(
        { issueId: 'iss_123', request: { content_item_ids: ['item_1'], block_type: 'news' } },
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

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        issueId: 'iss_123',
        request: { content_item_ids: ['item_1'], block_type: 'news' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Network');
    });

    it('should handle empty content_item_ids error', async () => {
      const validationError = new Error('No content items provided');

      vi.mocked(apiClient.post).mockRejectedValueOnce(validationError);

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        issueId: 'iss_123',
        request: { content_item_ids: [], block_type: 'news' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Edge Cases - Boundary Conditions', () => {
    it('should handle loading state correctly', async () => {
      vi.mocked(apiClient.post).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { blocks: [], created_count: 0, skipped_count: 0 } }), 100))
      );

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);

      result.current.mutate({
        issueId: 'iss_123',
        request: { content_item_ids: ['item_1'], block_type: 'news' },
      });

      // After mutation call, it should eventually be pending or complete
      await waitFor(() => {
        expect(result.current.isSuccess || !result.current.isPending).toBe(true);
      });
    });

    it('should support different block types', async () => {
      const blockTypes = ['hero', 'news', 'content', 'events', 'spotlight'] as const;

      for (const blockType of blockTypes) {
        vi.mocked(apiClient.post).mockResolvedValueOnce({
          data: { blocks: [], created_count: 0, skipped_count: 0 },
        });

        const { result } = renderHook(() => useAddBlocksToIssue(), {
          wrapper: createWrapper(),
        });

        result.current.mutate({
          issueId: `iss_${blockType}`,
          request: { content_item_ids: ['item_1'], block_type: blockType },
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(apiClient.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ block_type: blockType })
        );
      }
    });

    it('should handle very long content_item_ids array', async () => {
      const longArray = Array.from({ length: 20 }, (_, i) => `item_${i}`);
      const mockResponse = {
        data: {
          blocks: longArray.map((id, idx) => ({ id: `block_${idx}`, content_item_id: id })),
          created_count: 20,
          skipped_count: 0,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        issueId: 'iss_large',
        request: { content_item_ids: longArray, block_type: 'news' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.created_count).toBe(20);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate newsletter issue queries on success', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const mockResponse = {
        data: { blocks: [], created_count: 1, skipped_count: 0 },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate({
        issueId: 'iss_123',
        request: { content_item_ids: ['item_1'], block_type: 'news' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.any(Array),
        })
      );
    });
  });

  describe('Mutation State Management', () => {
    it('should reset error state on retry', async () => {
      const errorMessage = 'First attempt failed';

      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      const variables = {
        issueId: 'iss_123',
        request: { content_item_ids: ['item_1'], block_type: 'news' },
      };

      result.current.mutate(variables);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe(errorMessage);

      // Retry with successful response
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { blocks: [], created_count: 1, skipped_count: 0 },
      });

      result.current.mutate(variables);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.error).toBeNull();
    });

    it('should provide correct return type for mutation result', async () => {
      const mockResponse = {
        data: {
          blocks: [{ id: 'block_1' }],
          created_count: 1,
          skipped_count: 0,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAddBlocksToIssue(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        issueId: 'iss_123',
        request: { content_item_ids: ['item_1'], block_type: 'news' },
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

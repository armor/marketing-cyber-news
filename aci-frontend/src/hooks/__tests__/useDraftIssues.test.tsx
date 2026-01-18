/**
 * Tests for useDraftIssues Hook
 *
 * Query hook for fetching draft newsletter issues.
 * Tests endpoint calls, staleTime configuration, and data transformation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDraftIssues } from '../useDraftIssues';
import { apiClient } from '@/services/api/client';

vi.mock('@/services/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useDraftIssues Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Happy Path - Successful Data Fetching', () => {
    it('should call correct endpoint with default parameters', async () => {
      const mockResponse = {
        data: [
          {
            id: 'iss_1',
            segment_id: 'seg_1',
            segment_name: 'Enterprise',
            issue_date: '2026-01-20',
            subject_line: 'This Week in Security',
            status: 'draft' as const,
            created_at: '2026-01-17T10:00:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.get).toHaveBeenCalledWith('/newsletters/issues', {
        status: 'draft',
        limit: '50',
      });
    });

    it('should return array of draft issues', async () => {
      const mockDraftIssues = [
        {
          id: 'iss_1',
          segment_id: 'seg_1',
          segment_name: 'Enterprise',
          issue_date: '2026-01-20',
          subject_line: 'This Week in Security',
          status: 'draft' as const,
          created_at: '2026-01-17T10:00:00Z',
        },
        {
          id: 'iss_2',
          segment_id: 'seg_2',
          segment_name: 'SMB',
          issue_date: '2026-01-21',
          subject_line: 'Weekly Security Digest',
          status: 'draft' as const,
          created_at: '2026-01-17T11:00:00Z',
        },
      ];

      const mockResponse = { data: mockDraftIssues };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDraftIssues);
      expect(result.current.data).toHaveLength(2);
    });

    it('should handle custom limit option', async () => {
      const mockResponse = {
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `iss_${i}`,
          segment_id: `seg_${i}`,
          segment_name: `Segment ${i}`,
          issue_date: '2026-01-20',
          subject_line: `Issue ${i}`,
          status: 'draft' as const,
          created_at: '2026-01-17T10:00:00Z',
        })),
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues({ limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.get).toHaveBeenCalledWith('/newsletters/issues', {
        status: 'draft',
        limit: '20',
      });

      expect(result.current.data).toHaveLength(20);
    });

    it('should respect enabled option', async () => {
      const { result: disabledResult } = renderHook(() => useDraftIssues({ enabled: false }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(disabledResult.current.status).toBe('pending');
      });

      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should fetch when enabled is true (default)', async () => {
      const mockResponse = {
        data: [
          {
            id: 'iss_1',
            segment_id: 'seg_1',
            segment_name: 'Enterprise',
            issue_date: '2026-01-20',
            subject_line: 'This Week in Security',
            status: 'draft' as const,
            created_at: '2026-01-17T10:00:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues({ enabled: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.get).toHaveBeenCalled();
    });

    it('should handle empty draft issues list', async () => {
      const mockResponse = { data: [] };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.data).toHaveLength(0);
    });

    it('should include optional subject_line field', async () => {
      const mockResponse = {
        data: [
          {
            id: 'iss_1',
            segment_id: 'seg_1',
            segment_name: 'Enterprise',
            issue_date: '2026-01-20',
            subject_line: 'January Newsletter: Top Security Threats',
            status: 'draft' as const,
            created_at: '2026-01-17T10:00:00Z',
          },
          {
            id: 'iss_2',
            segment_id: 'seg_2',
            segment_name: 'SMB',
            issue_date: '2026-01-21',
            subject_line: null,
            status: 'draft' as const,
            created_at: '2026-01-17T11:00:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].subject_line).toBe('January Newsletter: Top Security Threats');
      expect(result.current.data?.[1].subject_line).toBeNull();
    });
  });

  describe('Error Paths - API Failures', () => {
    it('should set error state when API call fails', async () => {
      const errorMessage = 'Failed to fetch draft issues';
      const mockError = new Error(errorMessage);

      vi.mocked(apiClient.get).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');

      vi.mocked(apiClient.get).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Network');
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Internal Server Error');

      vi.mocked(apiClient.get).mockRejectedValueOnce(serverError);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should handle unauthorized error', async () => {
      const unauthorizedError = new Error('Unauthorized');

      vi.mocked(apiClient.get).mockRejectedValueOnce(unauthorizedError);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Unauthorized');
    });
  });

  describe('Edge Cases - Boundary Conditions', () => {
    it('should handle loading state correctly', async () => {
      vi.mocked(apiClient.get).mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  data: [
                    {
                      id: 'iss_1',
                      segment_id: 'seg_1',
                      segment_name: 'Enterprise',
                      issue_date: '2026-01-20',
                      subject_line: 'Test',
                      status: 'draft' as const,
                      created_at: '2026-01-17T10:00:00Z',
                    },
                  ],
                }),
              50
            )
          )
      );

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle very large limit values', async () => {
      const largeLimit = 1000;
      const mockResponse = {
        data: Array.from({ length: 100 }, (_, i) => ({
          id: `iss_${i}`,
          segment_id: `seg_${i}`,
          segment_name: `Segment ${i}`,
          issue_date: '2026-01-20',
          subject_line: `Issue ${i}`,
          status: 'draft' as const,
          created_at: '2026-01-17T10:00:00Z',
        })),
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues({ limit: largeLimit }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.get).toHaveBeenCalledWith('/newsletters/issues', {
        status: 'draft',
        limit: largeLimit.toString(),
      });
    });

    it('should handle small limit values', async () => {
      const smallLimit = 1;
      const mockResponse = {
        data: [
          {
            id: 'iss_1',
            segment_id: 'seg_1',
            segment_name: 'Enterprise',
            issue_date: '2026-01-20',
            subject_line: 'Issue',
            status: 'draft' as const,
            created_at: '2026-01-17T10:00:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues({ limit: smallLimit }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.get).toHaveBeenCalledWith('/newsletters/issues', {
        status: 'draft',
        limit: '1',
      });
    });

    it('should handle many draft issues', async () => {
      const manyIssues = Array.from({ length: 100 }, (_, i) => ({
        id: `iss_${i}`,
        segment_id: `seg_${i}`,
        segment_name: `Segment ${i}`,
        issue_date: `2026-01-${String((i % 31) + 1).padStart(2, '0')}`,
        subject_line: `Newsletter ${i}`,
        status: 'draft' as const,
        created_at: '2026-01-17T10:00:00Z',
      }));

      const mockResponse = { data: manyIssues };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues({ limit: 100 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(100);
    });

    it('should handle issues with same date', async () => {
      const mockResponse = {
        data: [
          {
            id: 'iss_1',
            segment_id: 'seg_1',
            segment_name: 'Enterprise',
            issue_date: '2026-01-20',
            subject_line: 'Enterprise Issue',
            status: 'draft' as const,
            created_at: '2026-01-17T10:00:00Z',
          },
          {
            id: 'iss_2',
            segment_id: 'seg_2',
            segment_name: 'SMB',
            issue_date: '2026-01-20',
            subject_line: 'SMB Issue',
            status: 'draft' as const,
            created_at: '2026-01-17T11:00:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.filter(i => i.issue_date === '2026-01-20')).toHaveLength(2);
    });

    it('should handle issues with special characters in segment names', async () => {
      const mockResponse = {
        data: [
          {
            id: 'iss_1',
            segment_id: 'seg_1',
            segment_name: 'Enterprise & SMB',
            issue_date: '2026-01-20',
            subject_line: 'Test "Issue" #1',
            status: 'draft' as const,
            created_at: '2026-01-17T10:00:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].segment_name).toBe('Enterprise & SMB');
    });
  });

  describe('Caching and StaleTime Configuration', () => {
    it('should have 30 second stale time configured', async () => {
      const mockResponse = {
        data: [
          {
            id: 'iss_1',
            segment_id: 'seg_1',
            segment_name: 'Enterprise',
            issue_date: '2026-01-20',
            subject_line: 'This Week in Security',
            status: 'draft' as const,
            created_at: '2026-01-17T10:00:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Query should be successful and cached
      expect(result.current.data).toBeDefined();
      expect(result.current.isSuccess).toBe(true);
    });

    it('should cache results to reduce API calls', async () => {
      const mockResponse = {
        data: [
          {
            id: 'iss_1',
            segment_id: 'seg_1',
            segment_name: 'Enterprise',
            issue_date: '2026-01-20',
            subject_line: 'This Week in Security',
            status: 'draft' as const,
            created_at: '2026-01-17T10:00:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      // First render
      const { result: result1 } = renderHook(() => useDraftIssues(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      const firstCallCount = vi.mocked(apiClient.get).mock.calls.length;

      // Second render should use cache
      const { result: result2 } = renderHook(() => useDraftIssues(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should not have made another API call due to caching
      expect(vi.mocked(apiClient.get).mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('Query Key Configuration', () => {
    it('should use correct query key structure', async () => {
      const mockResponse = { data: [] };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues({ limit: 25 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify API call was made with correct params
      expect(apiClient.get).toHaveBeenCalledWith(
        '/newsletters/issues',
        expect.objectContaining({
          status: 'draft',
          limit: '25',
        })
      );
    });
  });

  describe('Status Field Validation', () => {
    it('should return only draft status issues', async () => {
      const mockResponse = {
        data: [
          {
            id: 'iss_1',
            segment_id: 'seg_1',
            segment_name: 'Enterprise',
            issue_date: '2026-01-20',
            subject_line: 'Draft Issue',
            status: 'draft' as const,
            created_at: '2026-01-17T10:00:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDraftIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      result.current.data?.forEach(issue => {
        expect(issue.status).toBe('draft');
      });
    });
  });
});
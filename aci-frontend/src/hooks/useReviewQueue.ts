/**
 * useReviewQueue Hook
 *
 * TanStack Query hook for fetching and managing the admin review queue.
 * Provides pending articles awaiting review, approval, and publication.
 * Only works for authenticated admin users.
 *
 * @example
 * ```typescript
 * const {
 *   articles,
 *   pagination,
 *   isLoading,
 *   approveArticle,
 *   rejectArticle,
 *   releaseArticle
 * } = useReviewQueue({ page: 1, pageSize: 20 });
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PendingArticle } from '@/types/admin';
import type { PaginatedResponse } from '@/types/api';
import {
  getReviewQueue,
  approveArticle as approveArticleApi,
  rejectArticle as rejectArticleApi,
  releaseArticle as releaseArticleApi,
} from '@/services/api/admin';
import { useAuth } from './useAuth';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook options for review queue query
 */
export interface UseReviewQueueOptions {
  readonly page?: number;
  readonly pageSize?: number;
  readonly enabled?: boolean;
}

/**
 * Return value from useReviewQueue hook
 */
export interface UseReviewQueueReturn {
  readonly articles: readonly PendingArticle[] | undefined;
  readonly pagination:
    | Pick<
        PaginatedResponse<PendingArticle>,
        'total' | 'page' | 'pageSize' | 'totalPages' | 'hasNextPage' | 'hasPreviousPage'
      >
    | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;

  // Mutations
  readonly approveArticle: (articleId: string, note?: string) => Promise<void>;
  readonly rejectArticle: (articleId: string, note?: string) => Promise<void>;
  readonly releaseArticle: (articleId: string) => Promise<void>;

  // Mutation states
  readonly isApproving: boolean;
  readonly isRejecting: boolean;
  readonly isReleasing: boolean;
}

// ============================================================================
// Query Keys
// ============================================================================

const reviewQueueKeys = {
  all: ['reviewQueue'] as const,
  list: (page: number) => [...reviewQueueKeys.all, 'list', page] as const,
};

// ============================================================================
// Hook
// ============================================================================

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/**
 * Hook to fetch and manage admin review queue with TanStack Query
 *
 * Fetches pending articles awaiting review with pagination.
 * Provides mutations for approve, reject, and release actions.
 * Only enabled when user is authenticated as admin.
 *
 * @param options - Configuration options for query pagination and behavior
 * @returns {UseReviewQueueReturn} Articles data, pagination info, loading states, and mutation functions
 */
export function useReviewQueue(options?: UseReviewQueueOptions): UseReviewQueueReturn {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Extract options with defaults
  const page = options?.page ?? DEFAULT_PAGE;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

  // Determine if query should be enabled (admin users only)
  const isAdmin = user?.role === 'admin';
  const enabled = options?.enabled !== false && isAuthenticated && isAdmin;

  // ============================================================================
  // Query
  // ============================================================================

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: originalRefetch,
  } = useQuery({
    queryKey: reviewQueueKeys.list(page),
    queryFn: () => getReviewQueue(page, pageSize),
    enabled,
    staleTime: 30000, // 30 seconds - review queue updates frequently
    refetchInterval: 60000, // Refetch every minute for new articles
  });

  // Wrap refetch to return void
  const refetch = (): void => {
    void originalRefetch();
  };

  // ============================================================================
  // Mutations
  // ============================================================================

  /**
   * Approve Article Mutation
   */
  const approveMutation = useMutation({
    mutationFn: ({ articleId, note }: { articleId: string; note?: string }) =>
      approveArticleApi(articleId, note),
    onSuccess: (updatedArticle) => {
      // Invalidate review queue to refetch
      void queryClient.invalidateQueries({ queryKey: reviewQueueKeys.all });

      toast.success('Article approved', {
        description: `"${updatedArticle.title}" has been approved for publication.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to approve article', {
        description: error.message,
      });
    },
  });

  /**
   * Reject Article Mutation
   */
  const rejectMutation = useMutation({
    mutationFn: ({ articleId, note }: { articleId: string; note?: string }) =>
      rejectArticleApi(articleId, note),
    onSuccess: (updatedArticle) => {
      // Invalidate review queue to refetch
      void queryClient.invalidateQueries({ queryKey: reviewQueueKeys.all });

      toast.success('Article rejected', {
        description: `"${updatedArticle.title}" has been rejected.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to reject article', {
        description: error.message,
      });
    },
  });

  /**
   * Release Article Mutation
   */
  const releaseMutation = useMutation({
    mutationFn: (articleId: string) => releaseArticleApi(articleId),
    onSuccess: (publishedArticle) => {
      // Invalidate review queue and threats list
      void queryClient.invalidateQueries({ queryKey: reviewQueueKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['threats'] });

      toast.success('Article published', {
        description: `"${publishedArticle.title}" is now live in the threat feed.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to publish article', {
        description: error.message,
      });
    },
  });

  // ============================================================================
  // Mutation Helpers
  // ============================================================================

  const approveArticle = async (articleId: string, note?: string): Promise<void> => {
    await approveMutation.mutateAsync({ articleId, note });
  };

  const rejectArticle = async (articleId: string, note?: string): Promise<void> => {
    await rejectMutation.mutateAsync({ articleId, note });
  };

  const releaseArticle = async (articleId: string): Promise<void> => {
    await releaseMutation.mutateAsync(articleId);
  };

  // ============================================================================
  // Return
  // ============================================================================

  return {
    articles: data?.items,
    pagination: data
      ? {
          total: data.total,
          page: data.page,
          pageSize: data.pageSize,
          totalPages: data.totalPages,
          hasNextPage: data.hasNextPage,
          hasPreviousPage: data.hasPreviousPage,
        }
      : undefined,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,

    // Mutations
    approveArticle,
    rejectArticle,
    releaseArticle,

    // Mutation states
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isReleasing: releaseMutation.isPending,
  };
}

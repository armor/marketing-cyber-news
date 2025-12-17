/**
 * Bookmarks API Service
 *
 * Handles bookmark operations for saving and managing threat references.
 * Uses apiClient for standardized HTTP communication with aci-backend.
 */

import { apiClient } from './client';
import type { Bookmark } from '@/types/bookmark';
import type { ApiResponse } from '@/types/api';

/**
 * Configuration constants
 */
const BOOKMARKS_CONFIG = {
  ENDPOINT: '/bookmarks',
} as const;

/**
 * Fetch all bookmarks for current user
 *
 * @returns Array of user's bookmarks
 * @throws {ApiError} If request fails
 *
 * @example
 * ```typescript
 * const bookmarks = await getBookmarks();
 * console.log(`User has ${bookmarks.length} bookmarks`);
 * ```
 */
export async function getBookmarks(): Promise<Bookmark[]> {
  const response = await apiClient.get<ApiResponse<Bookmark[]>>(
    BOOKMARKS_CONFIG.ENDPOINT
  );

  return response.data;
}

/**
 * Add a threat to bookmarks
 *
 * @param threatId - UUID of threat to bookmark
 * @returns Created bookmark entity
 * @throws {ApiError} If threat not found or already bookmarked
 *
 * @example
 * ```typescript
 * const bookmark = await addBookmark('threat-123');
 * console.log(`Bookmarked at ${bookmark.createdAt}`);
 * ```
 */
export async function addBookmark(threatId: string): Promise<Bookmark> {
  if (!threatId || threatId.trim().length === 0) {
    throw new Error('Threat ID is required');
  }

  const response = await apiClient.post<ApiResponse<Bookmark>>(
    BOOKMARKS_CONFIG.ENDPOINT,
    { threatId }
  );

  return response.data;
}

/**
 * Remove a threat from bookmarks
 *
 * @param threatId - UUID of threat to remove from bookmarks
 * @returns void
 * @throws {ApiError} If bookmark not found
 *
 * @example
 * ```typescript
 * await removeBookmark('threat-123');
 * // Bookmark removed successfully
 * ```
 */
export async function removeBookmark(threatId: string): Promise<void> {
  if (!threatId || threatId.trim().length === 0) {
    throw new Error('Threat ID is required');
  }

  await apiClient.delete<ApiResponse<void>>(
    `${BOOKMARKS_CONFIG.ENDPOINT}/${threatId}`
  );
}

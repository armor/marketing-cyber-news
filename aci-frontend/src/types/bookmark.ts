/**
 * Bookmark Types
 * Allows users to save threats for later reference
 */

import type { ThreatSummary } from './threat';

/**
 * Bookmark entity - user's saved threat reference
 */
export interface Bookmark {
  readonly id: string; // UUID
  readonly userId: string;
  readonly threatId: string;
  readonly createdAt: string; // ISO 8601 date string
  readonly note: string | null; // Optional user note
}

/**
 * Bookmark with populated threat data
 * Used in bookmark list views
 */
export interface BookmarkWithThreat extends Bookmark {
  readonly threat: ThreatSummary;
}

/**
 * Input for creating a new bookmark
 */
export interface CreateBookmarkInput {
  readonly threatId: string;
  readonly note?: string;
}

/**
 * Input for updating an existing bookmark
 */
export interface UpdateBookmarkInput {
  readonly note?: string;
}

/**
 * Paginated response for bookmark list
 */
export interface BookmarkListResponse {
  readonly bookmarks: readonly BookmarkWithThreat[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

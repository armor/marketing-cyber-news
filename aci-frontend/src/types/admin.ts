/**
 * Admin Content Review Types
 * Based on NEXUS Frontend admin workflow for article approval and release
 */

import type { Severity, ThreatCategory } from './threat';

/**
 * Article approval status
 */
export type ArticleStatus = 'pending' | 'approved' | 'rejected' | 'published';

/**
 * Article entity in review queue (admin view)
 */
export interface PendingArticle {
  readonly id: string; // UUID
  readonly title: string;
  readonly description: string; // Summary/preview text
  readonly content: string; // Full article content
  readonly sourceUrl: string;
  readonly sourceName: string;
  readonly publishedAt: string; // ISO 8601 date string
  readonly createdAt: string; // ISO 8601 date string

  // AI-generated categorization (to be reviewed by admin)
  readonly aiCategory: ThreatCategory | null;
  readonly aiSeverity: Severity | null;
  readonly aiConfidence: number | null; // 0-1 confidence score

  // CVEs extracted by AI
  readonly cves: readonly string[]; // CVE IDs

  // Current status
  readonly status: ArticleStatus;
}

/**
 * Review action payload
 */
export interface ReviewAction {
  readonly articleId: string;
  readonly action: 'approve' | 'reject';
  readonly note?: string; // Optional admin note
}

/**
 * Release action payload (publish approved article)
 */
export interface ReleaseAction {
  readonly articleId: string;
  readonly overrideCategory?: ThreatCategory; // Optional manual override
  readonly overrideSeverity?: Severity; // Optional manual override
}

/**
 * Admin statistics summary
 */
export interface AdminStats {
  readonly totalUsers: number;
  readonly totalArticles: number;
  readonly pendingArticles: number;
  readonly approvedArticles: number;
  readonly publishedArticles: number;
  readonly rejectedArticles: number;
  readonly articlesToday: number;
}

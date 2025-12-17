/**
 * Dashboard API Functions
 *
 * Typed API functions for dashboard metrics and recent activity.
 */

import { apiClient } from './client';
import type { Severity } from '@/types/threat';

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * Severity distribution breakdown
 */
export interface SeverityDistribution {
  readonly critical: number;
  readonly high: number;
  readonly medium: number;
  readonly low: number;
}

/**
 * Timeline data point for threat trends
 */
export interface TimelinePoint {
  readonly date: string; // ISO 8601 date string
  readonly count: number;
  readonly critical: number;
  readonly high: number;
  readonly medium: number;
  readonly low: number;
}

/**
 * Dashboard summary metrics
 */
export interface DashboardSummary {
  readonly totalThreats: number;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly mediumCount: number;
  readonly lowCount: number;
  readonly newToday: number;
  readonly activeAlerts: number;
  readonly severityDistribution: SeverityDistribution;
  readonly timeline: readonly TimelinePoint[];
}

/**
 * Activity event types
 */
export type ActivityType = 'new_threat' | 'updated_threat' | 'alert_triggered';

/**
 * Recent activity item
 */
export interface RecentActivity {
  readonly id: string;
  readonly type: ActivityType;
  readonly title: string;
  readonly description: string;
  readonly severity?: Severity;
  readonly timestamp: string; // ISO 8601 date string
  readonly threatId?: string;
}

// ============================================================================
// Dashboard API Functions
// ============================================================================

/**
 * Get dashboard summary metrics
 *
 * Retrieves aggregated threat statistics including total counts,
 * severity distribution, and timeline data for visualizations.
 *
 * @returns Dashboard summary with metrics and timeline
 * @throws ApiError on network issues or authentication failure
 *
 * @example
 * const summary = await getDashboardSummary();
 * console.log(`Total threats: ${summary.totalThreats}`);
 * console.log(`Critical: ${summary.criticalCount}`);
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient.get<DashboardSummary>('/dashboard/summary');
}

/**
 * Get recent activity feed
 *
 * Retrieves recent threat and alert events for activity timeline.
 * Results are ordered by timestamp (newest first).
 *
 * @param limit - Maximum number of activities to return (default: 10)
 * @returns Array of recent activity items
 * @throws ApiError on network issues or authentication failure
 *
 * @example
 * const activities = await getRecentActivity(20);
 * activities.forEach(activity => {
 *   console.log(`${activity.type}: ${activity.title}`);
 * });
 */
export async function getRecentActivity(
  limit: number = 10
): Promise<readonly RecentActivity[]> {
  return apiClient.get<readonly RecentActivity[]>('/dashboard/recent-activity', {
    limit: limit.toString(),
  });
}

/**
 * Mock Dashboard Handlers
 * MSW handlers for dashboard and analytics endpoints
 */

import { http, HttpResponse, delay } from 'msw';
import type { AnalyticsData } from '../../types/api';
import {
  mockDashboardSummary,
  mockRecentActivity,
  mockAnalyticsData,
} from '../fixtures/dashboard';

// ============================================================================
// Dashboard API Handlers
// ============================================================================

export const dashboardHandlers = [
  /**
   * GET /v1/dashboard/summary
   * Retrieve dashboard metrics and trending threats
   */
  http.get('*/v1/dashboard/summary', async () => {
    await delay(200);

    return HttpResponse.json({
      success: true,
      data: mockDashboardSummary,
    });
  }),

  /**
   * GET /v1/dashboard/recent-activity
   * Retrieve recent threat activity for dashboard feed
   */
  http.get('*/v1/dashboard/recent-activity', async ({ request }) => {
    await delay(150);

    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Return limited subset of recent activity
    const activities = mockRecentActivity.slice(0, Math.min(limit, mockRecentActivity.length));

    return HttpResponse.json({
      success: true,
      data: activities,
    });
  }),

  /**
   * GET /v1/threats/recent (legacy)
   * Retrieve recent threat activity for dashboard feed
   */
  http.get('*/v1/threats/recent', async ({ request }) => {
    await delay(150);

    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Return limited subset of recent activity
    const activities = mockRecentActivity.slice(0, Math.min(limit, mockRecentActivity.length));

    return HttpResponse.json({
      success: true,
      data: activities,
    });
  }),

  /**
   * GET /v1/analytics
   * Retrieve analytics data for charts (time series, category distribution, etc.)
   */
  http.get('*/v1/analytics', async () => {
    await delay(300);

    return HttpResponse.json({
      success: true,
      data: mockAnalyticsData,
    });
  }),

  /**
   * GET /v1/analytics/:metric
   * Retrieve specific analytics metric
   */
  http.get('*/v1/analytics/:metric', async ({ params }) => {
    await delay(150);

    const { metric } = params;

    // Map metric parameter to analytics data
    const metricMap: Record<string, AnalyticsData[keyof AnalyticsData]> = {
      timeSeries: mockAnalyticsData.timeSeries,
      byCategory: mockAnalyticsData.byCategory,
      bySource: mockAnalyticsData.bySource,
      bySeverity: mockAnalyticsData.bySeverity,
    };

    if (typeof metric === 'string' && metric in metricMap) {
      return HttpResponse.json({
        success: true,
        data: metricMap[metric as keyof typeof metricMap],
      });
    }

    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Unknown metric: ${metric}`,
        },
      },
      { status: 404 }
    );
  }),
];

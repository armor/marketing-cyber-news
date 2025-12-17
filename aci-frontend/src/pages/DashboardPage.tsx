/**
 * DashboardPage Component
 *
 * Main dashboard view for the NEXUS Cybersecurity Intelligence platform.
 * Displays key security metrics, charts, and recent activity.
 *
 * Features:
 * - Real-time metric cards (total threats, critical count, new today, active alerts)
 * - Severity distribution donut chart
 * - Threat timeline chart
 * - Recent activity feed
 * - Auto-refresh every 30 seconds
 *
 * Uses design tokens exclusively - NO hardcoded values.
 *
 * @module pages/DashboardPage
 */

import { useNavigate } from 'react-router-dom';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { MetricCardsGrid } from '@/components/dashboard/MetricCardsGrid';
import { SeverityDonut } from '@/components/charts/SeverityDonut';
import { ThreatTimeline } from '@/components/charts/ThreatTimeline';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardErrorState } from '@/components/dashboard/DashboardErrorState';
import { spacing, layoutSpacing, gapSpacing } from '@/styles/tokens/spacing';
import { colors } from '@/styles/tokens/colors';
import { typography } from '@/styles/tokens/typography';
import type { ActivityItem } from '@/components/dashboard/ActivityFeed';
import type { RecentActivity } from '@/hooks/useDashboardSummary';
import type { TimelineDataPoint } from '@/components/charts/ThreatTimeline';

/**
 * Transform RecentActivity to ActivityItem format
 * Maps backend activity data to component-compatible format
 */
function transformRecentActivity(
  activities: readonly RecentActivity[]
): ActivityItem[] {
  return activities.map((activity) => {
    // Map activity type to component type
    let type: ActivityItem['type'];
    switch (activity.type) {
      case 'threat_added':
        type = 'new_threat';
        break;
      case 'threat_updated':
        type = 'updated_threat';
        break;
      case 'alert_triggered':
        type = 'alert_triggered';
        break;
      default:
        type = 'new_threat';
    }

    return {
      id: activity.id,
      type,
      title: activity.threatTitle,
      description: activity.description,
      severity: activity.severity,
      timestamp: activity.timestamp,
      threatId: activity.threatId,
    };
  });
}

/**
 * DashboardPage Component
 *
 * Renders the complete dashboard with metrics, charts, and activity feed.
 * Handles loading states, error states, and auto-refresh.
 *
 * @example
 * ```tsx
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <MainLayout>
 *       <DashboardPage />
 *     </MainLayout>
 *   </ProtectedRoute>
 * } />
 * ```
 */
export function DashboardPage(): React.ReactElement {
  const navigate = useNavigate();

  // Fetch dashboard data with auto-refresh every 30 seconds
  const { summary, recentActivity, isLoading, isError, error, refetch } =
    useDashboardSummary({
      refetchInterval: 30000, // 30 seconds
    });

  /**
   * Handle activity item click - navigate to threat detail
   */
  const handleActivityClick = (item: ActivityItem): void => {
    if (item.threatId) {
      navigate(`/threats/${item.threatId}`);
    }
  };

  // Loading state
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (isError) {
    return <DashboardErrorState error={error} onRetry={refetch} />;
  }

  // No data (shouldn't happen, but defensive)
  if (!summary) {
    return <DashboardErrorState error={new Error('No data available')} onRetry={refetch} />;
  }

  // Transform activity data
  const activityItems = recentActivity
    ? transformRecentActivity(recentActivity)
    : [];

  // Transform timeline data for chart
  const timelineData: TimelineDataPoint[] = [...(summary.timeline || [])];

  // Prepare severity distribution for donut chart
  const severityData = {
    critical: summary.criticalCount,
    high: summary.highCount,
    medium: summary.mediumCount,
    low: summary.lowCount,
  };

  // Calculate active alerts (not provided in summary, using placeholder)
  const activeAlerts = summary.activeAlerts || 0;

  return (
    <div
      data-testid="dashboard-page"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: layoutSpacing.section,
      }}
      role="main"
      aria-label="Dashboard"
    >
      {/* Page Header */}
      <header
        style={{
          marginBottom: spacing[4],
        }}
      >
        <h1
          style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing[2],
            lineHeight: typography.lineHeight.tight,
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.normal,
          }}
        >
          Overview of threat intelligence and security metrics
        </p>
      </header>

      {/* Metric Cards Grid */}
      <section
        aria-label="Key metrics"
        style={{
          width: '100%',
        }}
      >
        <MetricCardsGrid
          totalThreats={summary.totalThreats}
          criticalCount={summary.criticalCount}
          newToday={summary.newToday}
          activeAlerts={activeAlerts}
        />
      </section>

      {/* Charts Grid - Side by Side */}
      <section
        aria-label="Threat analytics"
        className="charts-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(1, 1fr)',
          gap: gapSpacing.lg,
          width: '100%',
        }}
      >
        <style>{`
          @media (min-width: 1024px) {
            .charts-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        `}</style>

        {/* Severity Distribution Donut Chart */}
        <div
          style={{
            backgroundColor: colors.background.elevated,
            padding: layoutSpacing.card,
            borderRadius: '8px',
            border: `1px solid ${colors.border.default}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing[6],
              alignSelf: 'flex-start',
            }}
          >
            Severity Distribution
          </h2>
          <SeverityDonut data={severityData} size="md" showLegend animated />
        </div>

        {/* Threat Timeline Chart */}
        <div
          style={{
            backgroundColor: colors.background.elevated,
            padding: layoutSpacing.card,
            borderRadius: '8px',
            border: `1px solid ${colors.border.default}`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing[6],
            }}
          >
            Threat Timeline (7 days)
          </h2>
          <ThreatTimeline
            data={timelineData}
            dateRange="7d"
            showBreakdown={false}
            height={300}
            animated
          />
        </div>
      </section>

      {/* Activity Feed */}
      <section aria-label="Recent activity" style={{ width: '100%' }}>
        <ActivityFeed
          items={activityItems}
          maxItems={10}
          onItemClick={handleActivityClick}
        />
      </section>
    </div>
  );
}

DashboardPage.displayName = 'DashboardPage';

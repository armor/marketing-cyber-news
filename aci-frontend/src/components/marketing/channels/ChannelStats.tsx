import type { ChannelStats as ChannelStatsType, ChannelHealth } from '../../../types/channels';

// ============================================
// TYPES
// ============================================

interface ChannelStatsProps {
  readonly stats: ChannelStatsType;
  readonly health: ChannelHealth;
}

// ============================================
// COMPONENT
// ============================================

/**
 * ChannelStats - Display statistics for a connected channel
 *
 * Shows key metrics:
 * - Posts published count
 * - Total engagement (likes, comments, shares)
 * - Last post date
 * - Connection health indicator
 *
 * Usage:
 *   <ChannelStats stats={channel.stats} health={channel.health} />
 */
export function ChannelStats({ stats, health }: ChannelStatsProps) {
  const healthStyles: Record<ChannelHealth, { bg: string; text: string; label: string }> = {
    healthy: {
      bg: 'var(--color-semantic-success)',
      text: 'var(--color-text-primary)',
      label: 'Healthy',
    },
    degraded: {
      bg: 'var(--color-semantic-warning)',
      text: 'var(--color-text-primary)',
      label: 'Degraded',
    },
    failing: {
      bg: 'var(--color-semantic-error)',
      text: 'var(--color-bg-elevated)',
      label: 'Failing',
    },
  };

  const healthStyle = healthStyles[health];
  const lastPostDate = stats.last_post_date
    ? new Date(stats.last_post_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Never';

  const engagementRate = stats.avg_engagement_rate
    ? `${(stats.avg_engagement_rate * 100).toFixed(1)}%`
    : 'N/A';

  return (
    <div
      className="space-y-3"
      style={{
        padding: 'var(--spacing-md)',
        backgroundColor: 'var(--color-bg-elevated)',
        borderRadius: 'var(--border-radius-md)',
        border: '1px solid var(--color-border-default)',
      }}
    >
      {/* Health Indicator */}
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Health
        </span>
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: healthStyle.bg,
            color: healthStyle.text,
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: 'currentColor',
              opacity: 0.8,
            }}
          />
          {healthStyle.label}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Posts Published */}
        <div className="space-y-1">
          <div
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Posts
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {stats.posts_published.toLocaleString()}
          </div>
        </div>

        {/* Total Engagement */}
        <div className="space-y-1">
          <div
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Engagement
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {stats.total_engagement.toLocaleString()}
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="space-y-1">
          <div
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Avg Rate
          </div>
          <div
            className="text-lg font-semibold"
            style={{ color: 'var(--color-brand-primary)' }}
          >
            {engagementRate}
          </div>
        </div>

        {/* Last Post Date */}
        <div className="space-y-1">
          <div
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Last Post
          </div>
          <div
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {lastPostDate}
          </div>
        </div>
      </div>

      {/* Impressions (if available) */}
      {stats.total_impressions > 0 && (
        <div
          className="pt-3"
          style={{
            borderTop: '1px solid var(--color-border-default)',
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Total Impressions
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {stats.total_impressions.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

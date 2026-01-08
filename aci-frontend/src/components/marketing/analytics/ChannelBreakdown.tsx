/**
 * ChannelBreakdown.tsx - Per-channel Performance Metrics
 *
 * Displays performance breakdown by channel:
 * - Channel name and icon
 * - Posts published
 * - Impressions
 * - Engagement rate
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ChannelPerformance, ChannelType } from '@/types/marketing';

interface ChannelBreakdownProps {
  channels: ChannelPerformance[];
  isLoading?: boolean;
}

/**
 * Channel configuration with icons and colors
 */
const CHANNEL_CONFIG: Record<
  ChannelType,
  {
    label: string;
    icon: string;
    color: string;
  }
> = {
  linkedin: {
    label: 'LinkedIn',
    icon: '💼',
    color: 'var(--color-armor-blue)',
  },
  twitter: {
    label: 'Twitter',
    icon: '🐦',
    color: 'var(--color-shield-cyan)',
  },
  blog: {
    label: 'Blog',
    icon: '📝',
    color: 'var(--color-compliant)',
  },
  email: {
    label: 'Email',
    icon: '✉️',
    color: 'var(--color-semantic-info)',
  },
  facebook: {
    label: 'Facebook',
    icon: '👥',
    color: 'var(--color-brand-primary)',
  },
  instagram: {
    label: 'Instagram',
    icon: '📷',
    color: 'var(--color-signal-orange)',
  },
};

/**
 * Format number with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

export function ChannelBreakdown({ channels, isLoading }: ChannelBreakdownProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: '80px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (channels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            style={{
              padding: 'var(--spacing-xl)',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            No channel data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by impressions (highest first)
  const sortedChannels = [...channels].sort((a, b) => b.impressions - a.impressions);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {sortedChannels.map((channel) => {
            const config = CHANNEL_CONFIG[channel.channel];
            return (
              <div
                key={channel.channel}
                style={{
                  padding: 'var(--spacing-md)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--border-radius-md)',
                  transition: 'all var(--motion-duration-normal) var(--motion-ease-default)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = config.color;
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-default)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <span style={{ fontSize: 'var(--font-size-xl)' }}>{config.icon}</span>
                    <span
                      style={{
                        fontSize: 'var(--font-size-md)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <Badge
                    variant={channel.engagement_rate > 5 ? 'success' : 'default'}
                    style={{
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    {channel.engagement_rate.toFixed(1)}% engagement
                  </Badge>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--spacing-md)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--spacing-xs)',
                      }}
                    >
                      Posts
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {channel.posts}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--spacing-xs)',
                      }}
                    >
                      Impressions
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {formatNumber(channel.impressions)}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--spacing-xs)',
                      }}
                    >
                      Top Content
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {channel.top_content.length}
                    </div>
                  </div>
                </div>

                {/* Progress bar showing relative performance */}
                <div
                  style={{
                    marginTop: 'var(--spacing-sm)',
                    height: '4px',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--border-radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, channel.engagement_rate * 10)}%`,
                      height: '100%',
                      backgroundColor: config.color,
                      transition: 'width var(--motion-duration-slow) var(--motion-ease-default)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

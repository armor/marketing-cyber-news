/**
 * TopContentTable.tsx - Best Performing Content Table
 *
 * Displays top-performing content with metrics:
 * - Content title
 * - Channel
 * - Views, clicks, shares, comments
 * - Engagement rate
 * - Published date
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ContentMetrics, ChannelType } from '@/types/marketing';

interface TopContentTableProps {
  content: ContentMetrics[];
  isLoading?: boolean;
  limit?: number;
}

/**
 * Channel badge configuration
 */
const CHANNEL_BADGES: Record<ChannelType, { label: string; variant: string }> = {
  linkedin: { label: 'LinkedIn', variant: 'default' },
  twitter: { label: 'Twitter', variant: 'secondary' },
  blog: { label: 'Blog', variant: 'outline' },
  email: { label: 'Email', variant: 'default' },
  facebook: { label: 'Facebook', variant: 'secondary' },
  instagram: { label: 'Instagram', variant: 'outline' },
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

/**
 * Format date to relative time or date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TopContentTable({ content, isLoading, limit = 10 }: TopContentTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  height: '60px',
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

  if (content.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            style={{
              padding: 'var(--spacing-xl)',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            No content data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by engagement rate and limit
  const topContent = [...content]
    .sort((a, b) => b.engagement_rate - a.engagement_rate)
    .slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Content</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--color-border-default)',
                }}
              >
                <th
                  style={{
                    padding: 'var(--spacing-sm)',
                    textAlign: 'left',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Content
                </th>
                <th
                  style={{
                    padding: 'var(--spacing-sm)',
                    textAlign: 'left',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Channel
                </th>
                <th
                  style={{
                    padding: 'var(--spacing-sm)',
                    textAlign: 'right',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Views
                </th>
                <th
                  style={{
                    padding: 'var(--spacing-sm)',
                    textAlign: 'right',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Clicks
                </th>
                <th
                  style={{
                    padding: 'var(--spacing-sm)',
                    textAlign: 'right',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Engagement
                </th>
                <th
                  style={{
                    padding: 'var(--spacing-sm)',
                    textAlign: 'right',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {topContent.map((item, index) => (
                <tr
                  key={item.content_id}
                  style={{
                    borderBottom: '1px solid var(--color-border-subtle)',
                    transition: 'background-color var(--motion-duration-fast) var(--motion-ease-default)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td
                    style={{
                      padding: 'var(--spacing-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--border-radius-full)',
                          backgroundColor: 'var(--color-bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {index + 1}
                      </div>
                      <span
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-primary)',
                          fontWeight: 'var(--font-weight-medium)',
                        }}
                      >
                        {item.title}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: 'var(--spacing-sm)' }}>
                    <Badge variant={CHANNEL_BADGES[item.channel].variant as 'default' | 'secondary' | 'outline'}>
                      {CHANNEL_BADGES[item.channel].label}
                    </Badge>
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-sm)',
                      textAlign: 'right',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {formatNumber(item.views)}
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-sm)',
                      textAlign: 'right',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {formatNumber(item.clicks)}
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-sm)',
                      textAlign: 'right',
                    }}
                  >
                    <Badge
                      variant={item.engagement_rate > 5 ? 'success' : 'default'}
                      style={{ fontSize: 'var(--font-size-xs)' }}
                    >
                      {item.engagement_rate.toFixed(1)}%
                    </Badge>
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-sm)',
                      textAlign: 'right',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {formatDate(item.published_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * AudienceInsights.tsx - Audience Demographics and Growth
 *
 * Displays audience data by channel:
 * - Follower counts
 * - Growth rates
 * - Demographics (age, location, industry)
 */

import { TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AudienceData, ChannelType } from '@/types/marketing';

interface AudienceInsightsProps {
  audience: AudienceData[];
  isLoading?: boolean;
}

/**
 * Channel configuration
 */
const CHANNEL_CONFIG: Record<ChannelType, { label: string; icon: string }> = {
  linkedin: { label: 'LinkedIn', icon: '💼' },
  twitter: { label: 'Twitter', icon: '🐦' },
  blog: { label: 'Blog', icon: '📝' },
  email: { label: 'Email', icon: '✉️' },
  facebook: { label: 'Facebook', icon: '👥' },
  instagram: { label: 'Instagram', icon: '📷' },
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

export function AudienceInsights({ audience, isLoading }: AudienceInsightsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audience Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: '120px',
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

  if (audience.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audience Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            style={{
              padding: 'var(--spacing-xl)',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            No audience data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalFollowers = audience.reduce((sum, a) => sum + a.followers, 0);
  const avgGrowthRate =
    audience.reduce((sum, a) => sum + a.growth_rate, 0) / audience.length;

  return (
    <Card>
      <CardHeader>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <CardTitle>Audience Insights</CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <Users style={{ width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {formatNumber(totalFollowers)} total
              </span>
            </div>
            <Badge
              variant={avgGrowthRate > 0 ? 'success' : 'default'}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
            >
              <TrendingUp style={{ width: '12px', height: '12px' }} />
              {avgGrowthRate >= 0 ? '+' : ''}
              {avgGrowthRate.toFixed(1)}% avg growth
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {audience.map((item) => {
            const config = CHANNEL_CONFIG[item.channel];
            return (
              <div
                key={item.channel}
                style={{
                  padding: 'var(--spacing-md)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--border-radius-md)',
                  transition: 'all var(--motion-duration-normal) var(--motion-ease-default)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-brand-primary)';
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
                    marginBottom: 'var(--spacing-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <span style={{ fontSize: 'var(--font-size-xl)' }}>{config.icon}</span>
                    <div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-md)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {config.label}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {formatNumber(item.followers)} followers
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={item.growth_rate > 0 ? 'success' : 'default'}
                    style={{ fontSize: 'var(--font-size-sm)' }}
                  >
                    {item.growth_rate >= 0 ? '+' : ''}
                    {item.growth_rate.toFixed(1)}%
                  </Badge>
                </div>

                {/* Demographics breakdown */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--spacing-md)',
                  }}
                >
                  {/* Top age group */}
                  {Object.keys(item.demographics.age_groups).length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-muted)',
                          marginBottom: 'var(--spacing-xs)',
                        }}
                      >
                        Top Age Group
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {
                          Object.entries(item.demographics.age_groups).sort(
                            ([, a], [, b]) => b - a
                          )[0]?.[0]
                        }
                      </div>
                    </div>
                  )}

                  {/* Top location */}
                  {Object.keys(item.demographics.locations).length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-muted)',
                          marginBottom: 'var(--spacing-xs)',
                        }}
                      >
                        Top Location
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {
                          Object.entries(item.demographics.locations).sort(
                            ([, a], [, b]) => b - a
                          )[0]?.[0]
                        }
                      </div>
                    </div>
                  )}

                  {/* Top industry */}
                  {Object.keys(item.demographics.industries).length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-muted)',
                          marginBottom: 'var(--spacing-xs)',
                        }}
                      >
                        Top Industry
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {
                          Object.entries(item.demographics.industries).sort(
                            ([, a], [, b]) => b - a
                          )[0]?.[0]
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

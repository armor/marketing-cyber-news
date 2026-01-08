/**
 * PerformanceOverview.tsx - Key Metrics Cards
 *
 * Displays high-level performance metrics in card format:
 * - Total impressions
 * - Total engagement
 * - Click-through rate
 * - Conversion rate
 */

import { TrendingUp, Eye, Heart, MousePointerClick, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CampaignAnalytics } from '@/types/marketing';

interface PerformanceOverviewProps {
  analytics: CampaignAnalytics;
  isLoading?: boolean;
}

interface StatCardData {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  format?: 'number' | 'percentage' | 'rate';
}

/**
 * Format number with K/M suffix for readability
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
 * Calculate engagement rate from impressions and engagement
 */
function calculateEngagementRate(engagement: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (engagement / impressions) * 100;
}

/**
 * Calculate click-through rate
 */
function calculateCTR(clicks: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

/**
 * Calculate conversion rate
 */
// Commented out for now - will be used when conversion tracking is implemented
// function calculateConversionRate(conversions: number, clicks: number): number {
//   if (clicks === 0) return 0;
//   return (conversions / clicks) * 100;
// }

export function PerformanceOverview({ analytics, isLoading }: PerformanceOverviewProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--spacing-md)',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div
                style={{
                  height: '20px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--border-radius-sm)',
                  width: '60%',
                }}
              />
            </CardHeader>
            <CardContent>
              <div
                style={{
                  height: '32px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--border-radius-sm)',
                  width: '80%',
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats: StatCardData[] = [
    {
      title: 'Total Impressions',
      value: formatNumber(analytics.impressions),
      icon: Eye,
      format: 'number',
    },
    {
      title: 'Engagement Rate',
      value: `${calculateEngagementRate(analytics.engagement, analytics.impressions).toFixed(1)}%`,
      icon: Heart,
      format: 'percentage',
    },
    {
      title: 'Click-Through Rate',
      value: `${calculateCTR(analytics.clicks, analytics.impressions).toFixed(2)}%`,
      icon: MousePointerClick,
      format: 'percentage',
    },
    {
      title: 'Conversions',
      value: formatNumber(analytics.conversions),
      icon: Target,
      format: 'number',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 'var(--spacing-md)',
      }}
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            style={{
              transition: 'transform var(--motion-duration-normal) var(--motion-ease-default)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <CardHeader
              style={{
                paddingBottom: 'var(--spacing-xs)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <CardTitle
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {stat.title}
                </CardTitle>
                <Icon className="w-5 h-5 text-[var(--color-brand-primary)] opacity-70" />
              </div>
            </CardHeader>
            <CardContent>
              <div
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {stat.value}
              </div>
              {stat.trend !== undefined && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    marginTop: 'var(--spacing-xs)',
                  }}
                >
                  <TrendingUp
                    style={{
                      width: '16px',
                      height: '16px',
                      color:
                        stat.trend >= 0
                          ? 'var(--color-semantic-success)'
                          : 'var(--color-semantic-error)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color:
                        stat.trend >= 0
                          ? 'var(--color-semantic-success)'
                          : 'var(--color-semantic-error)',
                    }}
                  >
                    {stat.trend >= 0 ? '+' : ''}
                    {stat.trend}% vs last period
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * CompetitorCard.tsx - Individual Competitor Card Component
 *
 * Displays competitor profile with stats and actions:
 * - Competitor name and channels
 * - Content count and posting frequency
 * - Last checked timestamp
 * - Actions (refresh, remove, view details)
 */

import { RefreshCw, Trash2, ExternalLink, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CompetitorProfile } from '../../../types/marketing';

interface CompetitorCardProps {
  competitor: CompetitorProfile;
  onRefresh?: (competitor: CompetitorProfile) => void;
  onRemove?: (competitor: CompetitorProfile) => void;
  onViewDetails?: (competitor: CompetitorProfile) => void;
}

const STATUS_VARIANTS = {
  active: 'success' as const,
  inactive: 'default' as const,
  error: 'destructive' as const,
};

export function CompetitorCard({
  competitor,
  onRefresh,
  onRemove,
  onViewDetails,
}: CompetitorCardProps) {
  const channelsConnected = [
    competitor.linkedin_url && 'LinkedIn',
    competitor.twitter_handle && 'Twitter',
    competitor.blog_url && 'Blog',
    competitor.website_url && 'Website',
  ].filter(Boolean);

  return (
    <Card
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardHeader>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--spacing-3)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <CardTitle
              style={{
                fontSize: 'var(--font-size-lg)',
                marginBottom: 'var(--spacing-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {competitor.name}
            </CardTitle>
            <Badge variant={STATUS_VARIANTS[competitor.status]}>
              {competitor.status === 'active' && 'Active'}
              {competitor.status === 'inactive' && 'Inactive'}
              {competitor.status === 'error' && 'Error'}
            </Badge>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-1)',
            }}
          >
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRefresh(competitor)}
                title="Refresh competitor data"
              >
                <RefreshCw style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(competitor)}
                title="Remove competitor"
              >
                <Trash2 style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)',
          }}
        >
          {/* Channels */}
          <div>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Tracked Channels
            </p>
            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-2)',
                flexWrap: 'wrap',
              }}
            >
              {channelsConnected.map((channel) => (
                <Badge key={channel} variant="outline">
                  {channel}
                </Badge>
              ))}
              {channelsConnected.length === 0 && (
                <p
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  No channels configured
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--spacing-4)',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-muted)',
                  marginBottom: 'var(--spacing-1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Content Items
              </p>
              <p
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {competitor.content_count}
              </p>
            </div>

            {competitor.avg_posting_frequency !== undefined && (
              <div>
                <p
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-muted)',
                    marginBottom: 'var(--spacing-1)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Posts/Week
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--font-size-2xl)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {competitor.avg_posting_frequency.toFixed(1)}
                  </p>
                  <TrendingUp
                    style={{
                      width: 'var(--spacing-4)',
                      height: 'var(--spacing-4)',
                      color: 'var(--color-success)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Last Checked */}
          {competitor.last_checked_at && (
            <div
              style={{
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--color-surface-secondary)',
                borderWidth: 'var(--border-width-thin)',
                borderStyle: 'solid',
                borderColor: 'var(--color-border-default)',
              }}
            >
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Last checked:{' '}
                <span
                  style={{
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {new Date(competitor.last_checked_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </p>
            </div>
          )}

          {/* View Details Button */}
          {onViewDetails && (
            <Button
              variant="outline"
              onClick={() => onViewDetails(competitor)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
              }}
            >
              <span>View Details</span>
              <ExternalLink style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

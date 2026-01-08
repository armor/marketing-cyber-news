/**
 * CampaignCard.tsx - Campaign Display Card Component
 *
 * Card component for displaying a campaign in list view:
 * - Campaign name and goal
 * - Status badge
 * - Channel indicators
 * - Frequency and style info
 * - Action buttons (edit, pause, delete)
 */

import { Play, Pause, Edit, Trash2, Calendar } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface Campaign {
  id: string;
  name: string;
  goal: 'awareness' | 'leads' | 'engagement' | 'traffic';
  channels: string[];
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  contentStyle: 'thought-leadership' | 'product-focused' | 'educational' | 'promotional';
  status: 'active' | 'paused' | 'draft';
  createdAt: string;
  nextPost?: string;
  totalPosts?: number;
}

interface CampaignCardProps {
  campaign: Campaign;
  onEdit?: (campaign: Campaign) => void;
  onPause?: (campaign: Campaign) => void;
  onResume?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
}

const STATUS_VARIANTS = {
  active: 'success' as const,
  paused: 'warning' as const,
  draft: 'default' as const,
};

const GOAL_LABELS = {
  awareness: 'Brand Awareness',
  leads: 'Lead Generation',
  engagement: 'Engagement',
  traffic: 'Website Traffic',
};

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
};

const STYLE_LABELS = {
  'thought-leadership': 'Thought Leadership',
  'product-focused': 'Product Focused',
  'educational': 'Educational',
  'promotional': 'Promotional',
};

export function CampaignCard({
  campaign,
  onEdit,
  onPause,
  onResume,
  onDelete,
}: CampaignCardProps) {
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
                fontSize: 'var(--typography-font-size-lg)',
                marginBottom: 'var(--spacing-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {campaign.name}
            </CardTitle>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                flexWrap: 'wrap',
              }}
            >
              <Badge variant={STATUS_VARIANTS[campaign.status]}>
                {campaign.status === 'active' && <Play style={{ width: 'var(--spacing-3)', height: 'var(--spacing-3)' }} />}
                {campaign.status === 'paused' && <Pause style={{ width: 'var(--spacing-3)', height: 'var(--spacing-3)' }} />}
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </Badge>
              <Badge variant="outline">{GOAL_LABELS[campaign.goal]}</Badge>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-1)',
            }}
          >
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(campaign)}
                title="Edit campaign"
              >
                <Edit style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
              </Button>
            )}
            {campaign.status === 'active' && onPause && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPause(campaign)}
                title="Pause campaign"
              >
                <Pause style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
              </Button>
            )}
            {campaign.status === 'paused' && onResume && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onResume(campaign)}
                title="Resume campaign"
              >
                <Play style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(campaign)}
                title="Delete campaign"
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
                fontSize: 'var(--typography-font-size-xs)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-2)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--typography-letter-spacing-wide)',
              }}
            >
              Channels
            </p>
            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-2)',
                flexWrap: 'wrap',
              }}
            >
              {campaign.channels.map((channel) => (
                <Badge key={channel} variant="outline">
                  {channel}
                </Badge>
              ))}
            </div>
          </div>

          {/* Frequency & Style */}
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
                  fontSize: 'var(--typography-font-size-xs)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  color: 'var(--color-text-muted)',
                  marginBottom: 'var(--spacing-1)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--typography-letter-spacing-wide)',
                }}
              >
                Frequency
              </p>
              <p
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {FREQUENCY_LABELS[campaign.frequency]}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--typography-font-size-xs)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  color: 'var(--color-text-muted)',
                  marginBottom: 'var(--spacing-1)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--typography-letter-spacing-wide)',
                }}
              >
                Style
              </p>
              <p
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {STYLE_LABELS[campaign.contentStyle]}
              </p>
            </div>
          </div>

          {/* Next Post */}
          {campaign.nextPost && campaign.status === 'active' && (
            <div
              style={{
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--gradient-badge-info)',
                border: `var(--border-width-thin) solid var(--color-brand-primary)`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                }}
              >
                <Calendar
                  style={{
                    width: 'var(--spacing-4)',
                    height: 'var(--spacing-4)',
                    color: 'var(--color-brand-primary)',
                  }}
                />
                <div>
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Next post
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {new Date(campaign.nextPost).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {campaign.totalPosts !== undefined && (
        <CardFooter
          style={{
            borderTop: `var(--border-width-thin) solid var(--color-border-default)`,
            paddingTop: 'var(--spacing-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-muted)',
              }}
            >
              {campaign.totalPosts} posts published
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * CampaignDetailPage
 *
 * Detailed view of a single marketing campaign.
 *
 * Features:
 * - Campaign header with name, status, and action buttons
 * - Stats cards (content generated, published, engagement)
 * - Recent content list
 * - Competitor monitoring section (if configured)
 * - Settings section with configuration overview
 *
 * @example
 * ```tsx
 * <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
 * ```
 */

import { type ReactElement, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, StopCircle, Settings, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCampaign, useCampaignStats } from '@/hooks/useCampaign';
import { useCampaignMutations } from '@/hooks/useCampaignMutations';
import { PageHeader } from '@/components/layout/PageHeader';
import type { CampaignStatus } from '@/types/marketing';

// ============================================================================
// Constants
// ============================================================================

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'var(--color-text-secondary)',
  active: 'var(--color-success)',
  paused: 'var(--color-warning)',
  completed: 'var(--color-text-secondary)',
  archived: 'var(--color-text-muted)',
};

// ============================================================================
// Helper Components
// ============================================================================

interface StatusBadgeProps {
  readonly status: CampaignStatus;
}

function StatusBadge({ status }: StatusBadgeProps): ReactElement {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 'var(--spacing-1) var(--spacing-3)',
        borderRadius: 'var(--border-radius-full)',
        fontSize: 'var(--typography-font-size-xs)',
        fontWeight: 'var(--typography-font-weight-semibold)',
        textTransform: 'capitalize',
        color: STATUS_COLORS[status],
        backgroundColor: `${STATUS_COLORS[status]}20`,
      }}
    >
      {status}
    </span>
  );
}

interface StatCardProps {
  readonly label: string;
  readonly value: number | string;
  readonly icon?: typeof TrendingUp;
}

function StatCard({ label, value, icon: Icon }: StatCardProps): ReactElement {
  return (
    <Card>
      <CardContent
        style={{
          padding: 'var(--spacing-6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--spacing-4)',
          }}
        >
          <div>
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontSize: 'var(--typography-font-size-3xl)',
                fontWeight: 'var(--typography-font-weight-bold)',
                color: 'var(--color-text-primary)',
              }}
            >
              {value}
            </p>
          </div>
          {Icon && (
            <Icon
              style={{
                width: 'var(--spacing-6)',
                height: 'var(--spacing-6)',
                color: 'var(--color-brand-primary)',
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Component
// ============================================================================

export function CampaignDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: campaign, isLoading, error } = useCampaign(id);
  const { data: stats } = useCampaignStats(id);
  const { launch, pause, stop } = useCampaignMutations();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleBack = useCallback((): void => {
    navigate('/campaigns');
  }, [navigate]);

  const handleLaunch = useCallback(async (): Promise<void> => {
    if (!id) return;

    try {
      await launch.mutateAsync(id);
      toast.success('Campaign Launched', {
        description: 'Campaign is now active',
      });
    } catch (err) {
      toast.error('Launch Failed', {
        description: err instanceof Error ? err.message : 'Failed to launch campaign',
      });
    }
  }, [id, launch]);

  const handlePause = useCallback(async (): Promise<void> => {
    if (!id) return;

    try {
      await pause.mutateAsync(id);
      toast.success('Campaign Paused', {
        description: 'Campaign has been paused',
      });
    } catch (err) {
      toast.error('Pause Failed', {
        description: err instanceof Error ? err.message : 'Failed to pause campaign',
      });
    }
  }, [id, pause]);

  const handleStop = useCallback(async (): Promise<void> => {
    if (!id) return;

    try {
      await stop.mutateAsync(id);
      toast.success('Campaign Stopped', {
        description: 'Campaign has been marked as completed',
      });
    } catch (err) {
      toast.error('Stop Failed', {
        description: err instanceof Error ? err.message : 'Failed to stop campaign',
      });
    }
  }, [id, stop]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderActionButton = (): ReactElement | null => {
    if (!campaign) return null;

    switch (campaign.status) {
      case 'draft':
        return (
          <Button onClick={() => void handleLaunch()} disabled={launch.isPending}>
            <Play
              style={{
                width: 'var(--spacing-4)',
                height: 'var(--spacing-4)',
              }}
            />
            {launch.isPending ? 'Launching...' : 'Launch Campaign'}
          </Button>
        );
      case 'active':
        return (
          <Button
            onClick={() => void handlePause()}
            variant="outline"
            disabled={pause.isPending}
          >
            <Pause
              style={{
                width: 'var(--spacing-4)',
                height: 'var(--spacing-4)',
              }}
            />
            {pause.isPending ? 'Pausing...' : 'Pause Campaign'}
          </Button>
        );
      case 'paused':
        return (
          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-3)',
            }}
          >
            <Button onClick={() => void handleLaunch()} disabled={launch.isPending}>
              <Play
                style={{
                  width: 'var(--spacing-4)',
                  height: 'var(--spacing-4)',
                }}
              />
              {launch.isPending ? 'Resuming...' : 'Resume'}
            </Button>
            <Button
              onClick={() => void handleStop()}
              variant="destructive"
              disabled={stop.isPending}
            >
              <StopCircle
                style={{
                  width: 'var(--spacing-4)',
                  height: 'var(--spacing-4)',
                }}
              />
              {stop.isPending ? 'Stopping...' : 'Stop'}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--color-background)',
        }}
      >
        <div
          className="animate-spin rounded-full border-t-[var(--color-brand-primary)] border-b-[var(--color-brand-primary)]"
          style={{
            height: '48px',
            width: '48px',
            borderWidth: '2px',
          }}
          role="status"
          aria-label="Loading campaign..."
        />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-background)',
          padding: 'var(--spacing-6)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent
              style={{
                padding: 'var(--spacing-6)',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  color: 'var(--color-destructive)',
                  marginBottom: 'var(--spacing-4)',
                }}
              >
                Failed to load campaign: {error?.message || 'Campaign not found'}
              </p>
              <Button onClick={handleBack} variant="outline">
                Back to Campaigns
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const campaignStats = stats || campaign.stats;

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Campaigns', href: '/campaigns' },
          { label: campaign.name },
        ]}
        title={campaign.name}
        description={campaign.description}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={campaign.status} />
            {renderActionButton()}
          </div>
        }
      />

      {/* Main Content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ padding: 'var(--spacing-6)' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--spacing-4)',
              marginBottom: 'var(--spacing-6)',
            }}
          >
            <StatCard label="Total Content" value={campaignStats.total_content} />
            <StatCard label="Published" value={campaignStats.published_content} />
            <StatCard label="Pending Approval" value={campaignStats.pending_approval} />
            <StatCard
              label="Avg Brand Score"
              value={`${Math.round(campaignStats.avg_brand_score)}%`}
            />
          </div>

          {/* Campaign Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--spacing-6)',
            }}
          >
            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    fontSize: 'var(--typography-font-size-lg)',
                  }}
                >
                  <Settings
                    style={{
                      width: 'var(--spacing-5)',
                      height: 'var(--spacing-5)',
                    }}
                  />
                  Campaign Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-4)',
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--spacing-1)',
                      }}
                    >
                      Goal
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-sm)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {campaign.goal}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--spacing-1)',
                      }}
                    >
                      Frequency
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-sm)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {campaign.frequency.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--spacing-1)',
                      }}
                    >
                      Content Style
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-sm)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {campaign.content_style.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--spacing-1)',
                      }}
                    >
                      Channels
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--spacing-2)',
                        marginTop: 'var(--spacing-2)',
                      }}
                    >
                      {campaign.channels.map((channel) => (
                        <span
                          key={channel}
                          style={{
                            display: 'inline-flex',
                            padding: 'var(--spacing-1) var(--spacing-2)',
                            borderRadius: 'var(--border-radius-md)',
                            fontSize: 'var(--typography-font-size-xs)',
                            fontWeight: 'var(--typography-font-weight-medium)',
                            textTransform: 'capitalize',
                            backgroundColor: 'var(--color-surface-elevated)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {channel}
                        </span>
                      ))}
                    </div>
                  </div>
                  {campaign.topics.length > 0 && (
                    <div>
                      <p
                        style={{
                          fontSize: 'var(--typography-font-size-xs)',
                          color: 'var(--color-text-secondary)',
                          marginBottom: 'var(--spacing-1)',
                        }}
                      >
                        Topics
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 'var(--spacing-2)',
                          marginTop: 'var(--spacing-2)',
                        }}
                      >
                        {campaign.topics.map((topic) => (
                          <span
                            key={topic}
                            style={{
                              display: 'inline-flex',
                              padding: 'var(--spacing-1) var(--spacing-2)',
                              borderRadius: 'var(--border-radius-md)',
                              fontSize: 'var(--typography-font-size-xs)',
                              backgroundColor: 'var(--color-brand-primary)20',
                              color: 'var(--color-brand-primary)',
                            }}
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Card */}
            <Card>
              <CardHeader>
                <CardTitle
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    fontSize: 'var(--typography-font-size-lg)',
                  }}
                >
                  <TrendingUp
                    style={{
                      width: 'var(--spacing-5)',
                      height: 'var(--spacing-5)',
                    }}
                  />
                  Engagement Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-4)',
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--spacing-1)',
                      }}
                    >
                      Total Engagement
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-2xl)',
                        fontWeight: 'var(--typography-font-weight-bold)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {campaignStats.total_engagement.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--spacing-1)',
                      }}
                    >
                      Total Impressions
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-2xl)',
                        fontWeight: 'var(--typography-font-weight-bold)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {campaignStats.total_impressions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--spacing-1)',
                      }}
                    >
                      Engagement Rate
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-2xl)',
                        fontWeight: 'var(--typography-font-weight-bold)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {campaignStats.total_impressions > 0
                        ? (
                            (campaignStats.total_engagement / campaignStats.total_impressions) *
                            100
                          ).toFixed(2)
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

CampaignDetailPage.displayName = 'CampaignDetailPage';

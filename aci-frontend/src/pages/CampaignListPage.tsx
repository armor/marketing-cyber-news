/**
 * CampaignListPage
 *
 * Main page for viewing and managing marketing campaigns.
 *
 * Features:
 * - Campaign list with filters (status, goal)
 * - Create campaign button
 * - Pagination support
 * - Loading and error states
 *
 * @example
 * ```tsx
 * <Route path="/campaigns" element={<CampaignListPage />} />
 * ```
 */

import { type ReactElement, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCampaigns } from '@/hooks/useCampaigns';
import type { CampaignStatus, CampaignGoal, Campaign } from '@/types/marketing';

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 20;

const STATUS_OPTIONS: readonly { label: string; value: CampaignStatus | 'all' }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
] as const;

const GOAL_OPTIONS: readonly { label: string; value: CampaignGoal | 'all' }[] = [
  { label: 'All Goals', value: 'all' },
  { label: 'Awareness', value: 'awareness' },
  { label: 'Leads', value: 'leads' },
  { label: 'Engagement', value: 'engagement' },
  { label: 'Traffic', value: 'traffic' },
] as const;

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

interface CampaignCardProps {
  readonly campaign: Campaign;
  readonly onClick: () => void;
}

function CampaignCard({ campaign, onClick }: CampaignCardProps): ReactElement {
  return (
    <Card
      onClick={onClick}
      style={{
        cursor: 'pointer',
        transition: 'all var(--motion-duration-fast) var(--motion-easing-default)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
    >
      <CardHeader>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--spacing-4)',
          }}
        >
          <CardTitle
            style={{
              fontSize: 'var(--typography-font-size-lg)',
              fontWeight: 'var(--typography-font-weight-semibold)',
            }}
          >
            {campaign.name}
          </CardTitle>
          <StatusBadge status={campaign.status} />
        </div>
        {campaign.description && (
          <p
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginTop: 'var(--spacing-2)',
            }}
          >
            {campaign.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
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
              Channels
            </p>
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
              }}
            >
              {campaign.channels.length}
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
              Content
            </p>
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
              }}
            >
              {campaign.stats.total_content}
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
              Published
            </p>
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
              }}
            >
              {campaign.stats.published_content}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FilterSelectProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly { label: string; value: string }[];
  readonly onChange: (value: string) => void;
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps): ReactElement {
  return (
    <div>
      <label
        htmlFor={label}
        style={{
          display: 'block',
          fontSize: 'var(--typography-font-size-sm)',
          fontWeight: 'var(--typography-font-weight-medium)',
          marginBottom: 'var(--spacing-2)',
          color: 'var(--color-text-primary)',
        }}
      >
        {label}
      </label>
      <select
        id={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: 'var(--spacing-2) var(--spacing-3)',
          fontSize: 'var(--typography-font-size-sm)',
          borderRadius: 'var(--border-radius-md)',
          border: `var(--border-width-thin) solid var(--color-border-default)`,
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function CampaignListPage(): ReactElement {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [goalFilter, setGoalFilter] = useState<CampaignGoal | 'all'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useCampaigns({
    status: statusFilter === 'all' ? undefined : statusFilter,
    goal: goalFilter === 'all' ? undefined : goalFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleCreateCampaign = useCallback((): void => {
    navigate('/campaigns/new');
  }, [navigate]);

  const handleCampaignClick = useCallback(
    (id: string): void => {
      navigate(`/campaigns/${id}`);
    },
    [navigate]
  );

  const handleStatusFilterChange = useCallback((value: string): void => {
    setStatusFilter(value as CampaignStatus | 'all');
    setPage(1); // Reset to first page when filter changes
  }, []);

  const handleGoalFilterChange = useCallback((value: string): void => {
    setGoalFilter(value as CampaignGoal | 'all');
    setPage(1); // Reset to first page when filter changes
  }, []);

  const handleNextPage = useCallback((): void => {
    setPage((prev) => prev + 1);
  }, []);

  const handlePrevPage = useCallback((): void => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex flex-col h-full">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Campaigns' },
        ]}
        title="Campaigns"
        description="Manage your marketing automation campaigns"
        actions={
          <Button onClick={handleCreateCampaign} size="default">
            <Plus
              style={{
                width: 'var(--spacing-4)',
                height: 'var(--spacing-4)',
              }}
            />
            Create Campaign
          </Button>
        }
      />

      {/* Main Content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{
          padding: 'var(--spacing-6)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Filters */}
          <Card
            style={{
              marginBottom: 'var(--spacing-6)',
            }}
          >
            <CardHeader>
              <CardTitle
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                  fontSize: 'var(--typography-font-size-base)',
                }}
              >
                <Filter
                  style={{
                    width: 'var(--spacing-4)',
                    height: 'var(--spacing-4)',
                  }}
                />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 'var(--spacing-4)',
                }}
              >
                <FilterSelect
                  label="Status"
                  value={statusFilter}
                  options={STATUS_OPTIONS}
                  onChange={handleStatusFilterChange}
                />
                <FilterSelect
                  label="Goal"
                  value={goalFilter}
                  options={GOAL_OPTIONS}
                  onChange={handleGoalFilterChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--spacing-12)',
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
                aria-label="Loading campaigns..."
              />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card>
              <CardContent
                style={{
                  padding: 'var(--spacing-6)',
                }}
              >
                <p
                  style={{
                    color: 'var(--color-destructive)',
                    textAlign: 'center',
                  }}
                >
                  Failed to load campaigns: {error.message}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Campaign List */}
          {!isLoading && !error && data && (
            <>
              {data.data.length === 0 ? (
                <Card>
                  <CardContent
                    style={{
                      padding: 'var(--spacing-12)',
                      textAlign: 'center',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-lg)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--spacing-4)',
                      }}
                    >
                      No campaigns found
                    </p>
                    <Button onClick={handleCreateCampaign} variant="outline">
                      <Plus
                        style={{
                          width: 'var(--spacing-4)',
                          height: 'var(--spacing-4)',
                        }}
                      />
                      Create your first campaign
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gap: 'var(--spacing-4)',
                  }}
                >
                  {data.data.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      onClick={() => handleCampaignClick(campaign.id)}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--spacing-4)',
                    marginTop: 'var(--spacing-6)',
                  }}
                >
                  <Button
                    onClick={handlePrevPage}
                    disabled={!hasPrevPage}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <span
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

CampaignListPage.displayName = 'CampaignListPage';

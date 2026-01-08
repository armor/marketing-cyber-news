/**
 * CampaignList.tsx - Campaign List Component
 *
 * Grid/list of CampaignCard components with:
 * - Filtering by status
 * - Search functionality
 * - Pagination
 * - Empty states
 */

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampaignCard, type Campaign } from './CampaignCard';

interface CampaignListProps {
  campaigns: Campaign[];
  onCreateCampaign?: () => void;
  onEditCampaign?: (campaign: Campaign) => void;
  onPauseCampaign?: (campaign: Campaign) => void;
  onResumeCampaign?: (campaign: Campaign) => void;
  onDeleteCampaign?: (campaign: Campaign) => void;
  isLoading?: boolean;
}

type FilterStatus = 'all' | 'active' | 'paused' | 'draft';

const FILTER_OPTIONS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'draft', label: 'Draft' },
];

export function CampaignList({
  campaigns,
  onCreateCampaign,
  onEditCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onDeleteCampaign,
  isLoading = false,
}: CampaignListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      searchQuery === '' ||
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' || campaign.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header with Search and Create */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-4)',
          marginBottom: 'var(--spacing-6)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute',
                left: 'var(--spacing-3)',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 'var(--spacing-5)',
                height: 'var(--spacing-5)',
                color: 'var(--color-text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 'var(--spacing-10)',
                paddingRight: 'var(--spacing-3)',
                paddingTop: 'var(--spacing-3)',
                paddingBottom: 'var(--spacing-3)',
                borderRadius: 'var(--border-radius-md)',
                border: `var(--border-width-thin) solid var(--color-border-default)`,
                fontSize: 'var(--typography-font-size-base)',
                fontFamily: 'var(--typography-font-family-sans)',
                color: 'var(--color-text-primary)',
                background: 'var(--color-bg-elevated)',
                transition: `border-color var(--motion-duration-fast) var(--motion-easing-default)`,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-border-focus)';
                e.target.style.outline = 'none';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border-default)';
              }}
            />
          </div>
        </div>

        {onCreateCampaign && (
          <Button onClick={onCreateCampaign}>
            <Plus />
            Create Campaign
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-2)',
          marginBottom: 'var(--spacing-6)',
          borderBottom: `var(--border-width-thin) solid var(--color-border-default)`,
        }}
      >
        {FILTER_OPTIONS.map((option) => {
          const isActive = filterStatus === option.id;
          const count =
            option.id === 'all'
              ? campaigns.length
              : campaigns.filter((c) => c.status === option.id).length;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilterStatus(option.id)}
              style={{
                padding: `var(--spacing-3) var(--spacing-4)`,
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: isActive
                  ? 'var(--typography-font-weight-semibold)'
                  : 'var(--typography-font-weight-normal)',
                color: isActive
                  ? 'var(--color-brand-primary)'
                  : 'var(--color-text-secondary)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? `var(--border-width-medium) solid var(--color-brand-primary)`
                  : `var(--border-width-medium) solid transparent`,
                cursor: 'pointer',
                transition: `all var(--motion-duration-fast) var(--motion-easing-default)`,
                fontFamily: 'var(--typography-font-family-sans)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }
              }}
            >
              {option.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Campaign Grid */}
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-16)',
            color: 'var(--color-text-muted)',
          }}
        >
          Loading campaigns...
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--spacing-16)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--typography-font-size-lg)',
              fontWeight: 'var(--typography-font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            {searchQuery || filterStatus !== 'all'
              ? 'No campaigns found'
              : 'No campaigns yet'}
          </p>
          <p
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--spacing-6)',
            }}
          >
            {searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Create your first campaign to get started with automated marketing'}
          </p>
          {onCreateCampaign && !searchQuery && filterStatus === 'all' && (
            <Button onClick={onCreateCampaign}>
              <Plus />
              Create Your First Campaign
            </Button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: 'var(--spacing-6)',
          }}
        >
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={onEditCampaign}
              onPause={onPauseCampaign}
              onResume={onResumeCampaign}
              onDelete={onDeleteCampaign}
            />
          ))}
        </div>
      )}
    </div>
  );
}

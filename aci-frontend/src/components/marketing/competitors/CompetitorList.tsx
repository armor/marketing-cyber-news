/**
 * CompetitorList.tsx - Competitor List Component
 *
 * Displays list of tracked competitors in grid layout:
 * - Grid of competitor cards
 * - Add competitor button
 * - Empty state when no competitors
 * - Loading state
 */

import { CompetitorCard } from './CompetitorCard';
import { AddCompetitorDialog } from './AddCompetitorDialog';
import type { CompetitorProfile, AddCompetitorRequest } from '../../../types/marketing';

interface CompetitorListProps {
  campaignId: string;
  competitors: CompetitorProfile[];
  isLoading?: boolean;
  onAdd: (request: AddCompetitorRequest) => void | Promise<void>;
  onRefresh?: (competitor: CompetitorProfile) => void;
  onRemove?: (competitor: CompetitorProfile) => void;
  onViewDetails?: (competitor: CompetitorProfile) => void;
  isAddingLoading?: boolean;
}

export function CompetitorList({
  campaignId,
  competitors,
  isLoading,
  onAdd,
  onRefresh,
  onRemove,
  onViewDetails,
  isAddingLoading,
}: CompetitorListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--spacing-12)',
        }}
      >
        <p
          style={{
            fontSize: 'var(--font-size-lg)',
            color: 'var(--color-text-muted)',
          }}
        >
          Loading competitors...
        </p>
      </div>
    );
  }

  // Empty state
  if (competitors.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--spacing-12)',
          gap: 'var(--spacing-4)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: '400px',
          }}
        >
          <h3
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            No Competitors Tracked
          </h3>
          <p
            style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--spacing-6)',
            }}
          >
            Add competitors to monitor their content, posting frequency, and engagement metrics.
          </p>
        </div>
        <AddCompetitorDialog
          campaignId={campaignId}
          onAdd={onAdd}
          isLoading={isAddingLoading}
        />
      </div>
    );
  }

  // List view
  return (
    <div>
      {/* Header with Add Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-6)',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-1)',
            }}
          >
            Tracked Competitors
          </h3>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            {competitors.length} {competitors.length === 1 ? 'competitor' : 'competitors'} monitored
          </p>
        </div>
        <AddCompetitorDialog
          campaignId={campaignId}
          onAdd={onAdd}
          isLoading={isAddingLoading}
        />
      </div>

      {/* Grid of Competitor Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'var(--spacing-4)',
        }}
      >
        {competitors.map((competitor) => (
          <CompetitorCard
            key={competitor.id}
            competitor={competitor}
            onRefresh={onRefresh}
            onRemove={onRemove}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}

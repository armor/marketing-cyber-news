/**
 * IssueList Component
 *
 * Displays a list of newsletter issues with filtering and pagination.
 */

import { IssueCard } from './IssueCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { NewsletterIssue, IssueStatus } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

interface IssueListProps {
  readonly issues: readonly NewsletterIssue[];
  readonly isLoading?: boolean;
  readonly emptyMessage?: string;
  readonly statusFilter?: IssueStatus;
  readonly onPreview?: (id: string) => void;
  readonly onApprove?: (id: string) => void;
  readonly onReject?: (id: string) => void;
  readonly onSend?: (id: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function IssueList({
  issues,
  isLoading = false,
  emptyMessage = 'No newsletter issues found',
  statusFilter,
  onPreview,
  onApprove,
  onReject,
  onSend,
}: IssueListProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  const filteredIssues = statusFilter
    ? issues.filter((issue) => issue.status === statusFilter)
    : issues;

  if (filteredIssues.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)',
      }}
    >
      {filteredIssues.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          onPreview={onPreview}
          onApprove={onApprove}
          onReject={onReject}
          onSend={onSend}
        />
      ))}
    </div>
  );
}

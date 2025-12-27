/**
 * ApprovalQueue Component
 *
 * List view of pending newsletter issues for approval.
 * Displays cards with quick action buttons and filtering.
 * FR-053 compliance: Approval workflow UI.
 *
 * Wave 4 Task 6.3.2 - Approval Queue Component
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { NewsletterIssue } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

interface ApprovalQueueProps {
  readonly issues: readonly NewsletterIssue[];
  readonly isLoading?: boolean;
  readonly onApprove: (issueId: string) => void;
  readonly onReject: (issueId: string) => void;
  readonly onReview: (issueId: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// ============================================================================
// Component
// ============================================================================

export function ApprovalQueue({
  issues,
  isLoading = false,
  onApprove,
  onReject,
  onReview,
}: ApprovalQueueProps): React.ReactElement {
  const [segmentFilter, setSegmentFilter] = useState<string>('all');

  if (isLoading) {
    return <ApprovalQueueSkeleton />;
  }

  if (issues.length === 0) {
    return <EmptyQueue />;
  }

  // Extract unique segments
  const segments = Array.from(
    new Set(issues.map((issue) => issue.segment_id))
  );

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    if (segmentFilter !== 'all' && issue.segment_id !== segmentFilter) {
      return false;
    }
    // Note: risk_level is on configuration, not issue
    // For now, filter only by segment
    return true;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)',
      }}
    >
      {/* Header with Filters */}
      <Card>
        <CardHeader>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--spacing-4)',
              flexWrap: 'wrap',
            }}
          >
            <CardTitle>
              Pending Approvals
              <Badge
                variant="secondary"
                style={{
                  marginLeft: 'var(--spacing-2)',
                }}
              >
                {filteredIssues.length}
              </Badge>
            </CardTitle>

            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-3)',
                alignItems: 'center',
              }}
            >
              {/* Segment Filter */}
              <label htmlFor="segment-filter" className="sr-only">
                Filter by segment
              </label>
              <select
                id="segment-filter"
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                aria-label="Filter approvals by segment"
                style={{
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  borderRadius: 'var(--border-radius-md)',
                  border: 'var(--border-width-thin) solid var(--color-border-default)',
                  backgroundColor: 'var(--color-bg-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--typography-font-size-sm)',
                }}
              >
                <option value="all">All Segments</option>
                {segments.map((segmentId) => (
                  <option key={segmentId} value={segmentId}>
                    {segmentId}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Issue Cards */}
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
            onApprove={() => onApprove(issue.id)}
            onReject={() => onReject(issue.id)}
            onReview={() => onReview(issue.id)}
          />
        ))}
      </div>

      {filteredIssues.length === 0 && (
        <Card>
          <CardContent
            style={{
              padding: 'var(--spacing-8)',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            No issues match the selected filters
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Issue Card Component
// ============================================================================

interface IssueCardProps {
  readonly issue: NewsletterIssue;
  readonly onApprove: () => void;
  readonly onReject: () => void;
  readonly onReview: () => void;
}

function IssueCard({
  issue,
  onApprove,
  onReject,
  onReview,
}: IssueCardProps): React.ReactElement {
  return (
    <Card
      data-testid={`approval-card-${issue.id}`}
      role="article"
      aria-label={`Newsletter approval: ${issue.subject_line}`}
    >
      <CardContent
        style={{
          padding: 'var(--spacing-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 'var(--spacing-4)',
          }}
        >
          {/* Left: Issue Details */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3)',
            }}
          >
            {/* Subject Line */}
            <div>
              <h3
                style={{
                  fontSize: 'var(--typography-font-size-lg)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-1)',
                }}
              >
                {issue.subject_line}
              </h3>
              <p
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {issue.preview_text}
              </p>
            </div>

            {/* Metadata */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--spacing-2)',
                fontSize: 'var(--typography-font-size-xs)',
                color: 'var(--color-text-primary)',
              }}
            >
              <Badge variant="outline">
                Status: {issue.status}
              </Badge>
              <Badge variant="outline">
                Segment: {issue.segment_id}
              </Badge>
              <Badge variant="outline">
                Recipients: {issue.total_recipients}
              </Badge>
              <Badge variant="outline">
                Blocks: {issue.blocks.length}
              </Badge>
              <span>Created: {formatDate(issue.created_at)}</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-2)',
              flexShrink: 0,
            }}
            role="group"
            aria-label="Approval actions"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={onReview}
              aria-label={`Review newsletter: ${issue.subject_line}`}
            >
              Review
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onReject}
              aria-label={`Reject newsletter: ${issue.subject_line}`}
            >
              Reject
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              aria-label={`Approve newsletter: ${issue.subject_line}`}
            >
              Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ApprovalQueueSkeleton(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)',
      }}
    >
      <Card>
        <CardHeader>
          <Skeleton style={{ width: '200px', height: '24px' }} />
        </CardHeader>
      </Card>

      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent
            style={{
              padding: 'var(--spacing-4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-3)',
              }}
            >
              <Skeleton style={{ width: '60%', height: '20px' }} />
              <Skeleton style={{ width: '80%', height: '16px' }} />
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-2)',
                }}
              >
                <Skeleton style={{ width: '80px', height: '24px' }} />
                <Skeleton style={{ width: '100px', height: '24px' }} />
                <Skeleton style={{ width: '90px', height: '24px' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyQueue(): React.ReactElement {
  return (
    <Card>
      <CardContent
        style={{
          padding: 'var(--spacing-12)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 'var(--typography-font-size-2xl)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          ✓
        </div>
        <h3
          style={{
            fontSize: 'var(--typography-font-size-lg)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          All Caught Up!
        </h3>
        <p
          style={{
            fontSize: 'var(--typography-font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          No newsletters pending approval at this time.
        </p>
      </CardContent>
    </Card>
  );
}

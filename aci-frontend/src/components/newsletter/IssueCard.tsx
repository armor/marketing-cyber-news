/**
 * IssueCard Component
 *
 * Displays a newsletter issue summary card with status badge, metrics, and actions.
 */

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { NewsletterIssue, IssueStatus } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

interface IssueCardProps {
  readonly issue: NewsletterIssue;
  readonly onPreview?: (id: string) => void;
  readonly onApprove?: (id: string) => void;
  readonly onReject?: (id: string) => void;
  readonly onSend?: (id: string) => void;
}

interface StatusConfig {
  readonly label: string;
  readonly variant: 'default' | 'secondary' | 'destructive' | 'outline';
  readonly color: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<IssueStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    variant: 'outline',
    color: 'var(--color-text-secondary)',
  },
  pending_approval: {
    label: 'Pending Approval',
    variant: 'secondary',
    color: 'var(--color-warning)',
  },
  approved: {
    label: 'Approved',
    variant: 'default',
    color: 'var(--color-success)',
  },
  scheduled: {
    label: 'Scheduled',
    variant: 'secondary',
    color: 'var(--color-info)',
  },
  sent: {
    label: 'Sent',
    variant: 'default',
    color: 'var(--color-success)',
  },
  failed: {
    label: 'Failed',
    variant: 'destructive',
    color: 'var(--color-error)',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateOpenRate(opened: number, delivered: number): string {
  if (delivered === 0) {
    return '0%';
  }
  return `${((opened / delivered) * 100).toFixed(1)}%`;
}

function calculateClickRate(clicked: number, delivered: number): string {
  if (delivered === 0) {
    return '0%';
  }
  return `${((clicked / delivered) * 100).toFixed(1)}%`;
}

// ============================================================================
// Component
// ============================================================================

export const IssueCard = memo(function IssueCard({
  issue,
  onPreview,
  onApprove,
  onReject,
  onSend,
}: IssueCardProps) {
  const statusConfig = STATUS_CONFIG[issue.status];
  const canApprove = issue.status === 'pending_approval';
  const canSend = issue.status === 'approved';
  const hasSent = issue.status === 'sent';

  return (
    <Card>
      <CardHeader
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--spacing-4)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-3)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            <CardTitle
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {issue.subject_line}
            </CardTitle>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
          <div
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--typography-font-size-sm)',
            }}
          >
            {issue.preview_text}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 'var(--spacing-4)',
            marginBottom: 'var(--spacing-4)',
          }}
        >
          <MetricItem
            label="Recipients"
            value={issue.total_recipients.toLocaleString()}
          />
          {hasSent && (
            <>
              <MetricItem
                label="Delivered"
                value={issue.total_delivered.toLocaleString()}
              />
              <MetricItem
                label="Open Rate"
                value={calculateOpenRate(
                  issue.unique_opens ?? 0,
                  issue.total_delivered
                )}
              />
              <MetricItem
                label="Click Rate"
                value={calculateClickRate(
                  issue.unique_clicks ?? 0,
                  issue.total_delivered
                )}
              />
            </>
          )}
          {issue.scheduled_for && (
            <MetricItem
              label="Scheduled"
              value={formatDate(issue.scheduled_for)}
            />
          )}
          {issue.sent_at && (
            <MetricItem label="Sent" value={formatDate(issue.sent_at)} />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 'var(--spacing-4)',
            borderTop:
              'var(--border-width-thin) solid var(--color-border-default)',
          }}
        >
          <div
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--typography-font-size-xs)',
            }}
          >
            Created {formatDate(issue.created_at)}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-2)',
            }}
          >
            {onPreview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreview(issue.id)}
              >
                Preview
              </Button>
            )}
            {canApprove && onApprove && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onApprove(issue.id)}
              >
                Approve
              </Button>
            )}
            {canApprove && onReject && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(issue.id)}
              >
                Reject
              </Button>
            )}
            {canSend && onSend && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onSend(issue.id)}
              >
                Send
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Sub-components
// ============================================================================

interface MetricItemProps {
  readonly label: string;
  readonly value: string;
}

function MetricItem({ label, value }: MetricItemProps) {
  return (
    <div>
      <div
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--typography-font-size-xs)',
          fontWeight: 'var(--typography-font-weight-medium)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--typography-letter-spacing-wide)',
          marginBottom: 'var(--spacing-1)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 'var(--typography-font-size-lg)',
          fontWeight: 'var(--typography-font-weight-semibold)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

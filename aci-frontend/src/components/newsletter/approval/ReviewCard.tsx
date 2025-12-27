/**
 * ReviewCard Component
 *
 * Full issue review component with preview, metadata, and approval actions.
 * Displays newsletter preview using NewsletterPreview component,
 * version metadata, validation warnings, and approve/reject dialogs.
 * FR-052 compliance: Review and approval interface.
 *
 * Wave 4 Task 6.3.3 - Review Card Component
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { NewsletterPreview } from '../preview/NewsletterPreview';
import { useIssue } from '@/hooks/useIssue';
import { useNewsletterConfig } from '@/hooks/useNewsletterConfig';
import type { NewsletterIssue } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

interface ReviewCardProps {
  readonly issueId: string;
  readonly onApprove: (issueId: string, notes?: string) => void;
  readonly onReject: (issueId: string, reason: string) => void;
  readonly isApproving?: boolean;
  readonly isRejecting?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_REJECTION_REASON_LENGTH = 10;

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
    second: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

// ============================================================================
// Component
// ============================================================================

export function ReviewCard({
  issueId,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}: ReviewCardProps): React.ReactElement {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  const {
    data: issue,
    isLoading: isLoadingIssue,
    isError: isIssueError,
    error: issueError,
  } = useIssue({ id: issueId });

  const {
    data: config,
  } = useNewsletterConfig({
    id: issue?.configuration_id || '',
    enabled: !!issue?.configuration_id,
  });

  if (isLoadingIssue) {
    return <ReviewCardSkeleton />;
  }

  if (isIssueError || !issue) {
    return <ReviewCardError error={issueError} />;
  }

  const handleApprove = (): void => {
    onApprove(issueId, approvalNotes || undefined);
    setShowApproveDialog(false);
    setApprovalNotes('');
  };

  const handleReject = (): void => {
    if (rejectionReason.length < MIN_REJECTION_REASON_LENGTH) {
      setRejectionError(
        `Reason must be at least ${MIN_REJECTION_REASON_LENGTH} characters`
      );
      return;
    }

    onReject(issueId, rejectionReason);
    setShowRejectDialog(false);
    setRejectionReason('');
    setRejectionError('');
  };

  const brandVoiceViolations = checkBrandVoiceViolations(issue, config);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)',
      }}
    >
      {/* Version Metadata Card */}
      <Card>
        <CardHeader>
          <CardTitle>Version Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--spacing-3)',
              fontSize: 'var(--typography-font-size-sm)',
            }}
          >
            <MetadataItem
              label="AI Model"
              value={config?.ai_model || 'Unknown'}
            />
            <MetadataItem
              label="Prompt Version"
              value={config?.prompt_version?.toString() || 'Unknown'}
            />
            <MetadataItem
              label="Generated At"
              value={formatDate(issue.created_at)}
            />
            <MetadataItem
              label="Created By"
              value={issue.created_by ?? 'Unknown'}
            />
            <MetadataItem
              label="Configuration"
              value={config?.name || issue.configuration_id}
            />
            <MetadataItem
              label="Approval Tier"
              value={config?.approval_tier.toUpperCase() || 'Unknown'}
            />
            <MetadataItem
              label="Risk Level"
              value={config?.risk_level || 'Unknown'}
            />
            <MetadataItem
              label="Total Recipients"
              value={issue.total_recipients.toLocaleString()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Validation Warnings */}
      {brandVoiceViolations.length > 0 && (
        <Card
          style={{
            borderColor: 'var(--color-warning)',
            backgroundColor: 'var(--color-warning-bg)',
          }}
        >
          <CardHeader>
            <CardTitle
              style={{
                color: 'var(--color-warning)',
                fontSize: 'var(--typography-font-size-md)',
              }}
            >
              Brand Voice Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul
              style={{
                listStyleType: 'disc',
                paddingLeft: 'var(--spacing-6)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--typography-font-size-sm)',
                lineHeight: 'var(--typography-line-height-relaxed)',
              }}
            >
              {brandVoiceViolations.map((violation, index) => (
                <li key={index}>{violation}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Newsletter Preview */}
      <NewsletterPreview
        issue={issue}
        brandVoiceViolations={brandVoiceViolations}
        isApproving={isApproving}
        isRejecting={isRejecting}
      />

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--spacing-3)',
          paddingTop: 'var(--spacing-4)',
        }}
      >
        <Button
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
          disabled={isApproving || isRejecting}
        >
          {isRejecting ? 'Rejecting...' : 'Reject'}
        </Button>
        <Button
          onClick={() => setShowApproveDialog(true)}
          disabled={isApproving || isRejecting || brandVoiceViolations.length > 0}
        >
          {isApproving ? 'Approving...' : 'Approve'}
        </Button>
      </div>

      {/* Approve Dialog */}
      <Dialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 'var(--typography-font-size-lg)',
                fontWeight: 'var(--typography-font-weight-semibold)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Approve Newsletter
            </h2>
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Are you sure you want to approve this newsletter for sending?
              You can optionally add notes for the record.
            </p>
          </div>

          <div>
            <label
              htmlFor="approval-notes"
              style={{
                display: 'block',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Notes (Optional)
            </label>
            <Textarea
              id="approval-notes"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Add any notes about this approval..."
              rows={3}
              aria-label="Approval notes"
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--spacing-3)',
            }}
          >
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? 'Approving...' : 'Confirm Approval'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 'var(--typography-font-size-lg)',
                fontWeight: 'var(--typography-font-weight-semibold)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Reject Newsletter
            </h2>
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Please provide a detailed reason for rejecting this newsletter.
              This will help improve future generations.
            </p>
          </div>

          <div>
            <label
              htmlFor="rejection-reason"
              style={{
                display: 'block',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Rejection Reason (Required) *
            </label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setRejectionError('');
              }}
              placeholder="Explain why this newsletter is being rejected..."
              rows={4}
              aria-required="true"
              aria-invalid={!!rejectionError}
              aria-describedby={rejectionError ? 'rejection-error rejection-hint' : 'rejection-hint'}
            />
            {rejectionError && (
              <p
                id="rejection-error"
                role="alert"
                style={{
                  marginTop: 'var(--spacing-2)',
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-danger)',
                }}
              >
                {rejectionError}
              </p>
            )}
            <p
              id="rejection-hint"
              style={{
                marginTop: 'var(--spacing-2)',
                fontSize: 'var(--typography-font-size-xs)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Minimum {MIN_REJECTION_REASON_LENGTH} characters required
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--spacing-3)',
            }}
          >
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
                setRejectionError('');
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || rejectionReason.length < MIN_REJECTION_REASON_LENGTH}
            >
              {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Metadata Item Component
// ============================================================================

interface MetadataItemProps {
  readonly label: string;
  readonly value: string;
}

function MetadataItem({ label, value }: MetadataItemProps): React.ReactElement {
  return (
    <div>
      <div
        style={{
          fontSize: 'var(--typography-font-size-xs)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--spacing-1)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--typography-letter-spacing-wide)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 'var(--typography-font-size-sm)',
          fontWeight: 'var(--typography-font-weight-medium)',
          color: 'var(--color-text-primary)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// Brand Voice Validation
// ============================================================================

function checkBrandVoiceViolations(
  issue: NewsletterIssue,
  config?: { banned_phrases?: readonly string[]; max_metaphors?: number }
): readonly string[] {
  const violations: string[] = [];

  if (!config) {
    return violations;
  }

  // Check for banned phrases in subject line
  const bannedPhrases = config.banned_phrases || [];
  const subjectLower = issue.subject_line.toLowerCase();
  
  for (const phrase of bannedPhrases) {
    if (subjectLower.includes(phrase.toLowerCase())) {
      violations.push(`Banned phrase detected in subject line: "${phrase}"`);
    }
  }

  // Check for banned phrases in blocks
  for (const block of issue.blocks) {
    const contentLower = (block.content || '').toLowerCase();
    const titleLower = (block.title || '').toLowerCase();
    
    for (const phrase of bannedPhrases) {
      if (
        contentLower.includes(phrase.toLowerCase()) ||
        titleLower.includes(phrase.toLowerCase())
      ) {
        violations.push(
          `Banned phrase detected in ${block.block_type} block: "${phrase}"`
        );
      }
    }
  }

  return violations;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ReviewCardSkeleton(): React.ReactElement {
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
          <Skeleton style={{ width: '150px', height: '20px' }} />
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--spacing-3)',
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <Skeleton style={{ width: '80px', height: '12px', marginBottom: 'var(--spacing-1)' }} />
                <Skeleton style={{ width: '120px', height: '16px' }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent
          style={{
            padding: 'var(--spacing-8)',
          }}
        >
          <Skeleton style={{ width: '100%', height: '400px' }} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

interface ReviewCardErrorProps {
  readonly error: Error | null;
}

function ReviewCardError({ error }: ReviewCardErrorProps): React.ReactElement {
  return (
    <Card
      style={{
        borderColor: 'var(--color-danger)',
        backgroundColor: 'var(--color-danger-bg)',
      }}
    >
      <CardContent
        style={{
          padding: 'var(--spacing-8)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 'var(--typography-font-size-2xl)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          ⚠️
        </div>
        <h3
          style={{
            fontSize: 'var(--typography-font-size-lg)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          Failed to Load Issue
        </h3>
        <p
          style={{
            fontSize: 'var(--typography-font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {error?.message || 'An error occurred while loading the newsletter issue'}
        </p>
      </CardContent>
    </Card>
  );
}

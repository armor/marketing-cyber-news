/**
 * ApprovalHistoryModal Component
 *
 * Displays the complete approval audit trail for an article.
 * Shows all gate approvals, rejection details, and release information
 * with timestamps and approver details.
 */

import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useApprovalHistory } from '../../hooks/useApprovalHistory';
import {
  type ApprovalGate,
  GATE_LABELS,
  GATE_ORDER,
  STATUS_LABELS,
} from '../../types/approval';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ApprovalProgress } from './ApprovalProgress';

// ============================================================================
// Types
// ============================================================================

interface ApprovalHistoryModalProps {
  readonly articleId: string;
  readonly articleTitle: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

interface TimelineItemData {
  readonly gate: ApprovalGate;
  readonly status: 'completed' | 'pending' | 'current';
  readonly approvedBy?: string;
  readonly approverName?: string;
  readonly approverEmail?: string;
  readonly approvedAt?: string;
  readonly notes?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format timestamp with relative time and full date on hover
 */
function formatTimestamp(isoDate: string): { display: string; full: string } {
  const date = new Date(isoDate);
  return {
    display: formatDistanceToNow(date, { addSuffix: true }),
    full: format(date, 'MMM dd, yyyy \'at\' h:mm a'),
  };
}

/**
 * Get badge variant for approval status
 */
function getStatusBadgeVariant(
  status: string
): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (status === 'released') return 'success';
  if (status === 'approved') return 'secondary';
  if (status === 'rejected') return 'destructive';
  return 'warning';
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Timeline item for a single approval gate
 */
function TimelineItem({ data }: { readonly data: TimelineItemData }): React.ReactElement {
  const isCompleted = data.status === 'completed';
  const isCurrent = data.status === 'current';
  const isPending = data.status === 'pending';

  return (
    <div className="flex gap-4 relative">
      {/* Timeline connector */}
      {!isPending && (
        <div
          className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"
          aria-hidden="true"
        />
      )}

      {/* Status icon */}
      <div className="flex-shrink-0 mt-1">
        {isCompleted && (
          <CheckCircle
            className="text-green-600 dark:text-green-400"
            size={24}
            aria-label="Completed"
          />
        )}
        {isCurrent && (
          <Clock
            className="text-amber-500 dark:text-amber-400"
            size={24}
            aria-label="Current"
          />
        )}
        {isPending && (
          <div
            className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600"
            aria-label="Not started"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-sm">
            {GATE_LABELS[data.gate]}
          </h4>
          {isCompleted && (
            <Badge variant="success" className="text-xs">
              Approved
            </Badge>
          )}
          {isCurrent && (
            <Badge variant="warning" className="text-xs">
              Pending
            </Badge>
          )}
          {isPending && (
            <Badge variant="secondary" className="text-xs">
              Not Started
            </Badge>
          )}
        </div>

        {isCompleted && data.approverName && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              by {data.approverName}
              {data.approverEmail && ` (${data.approverEmail})`}
            </p>
            {data.approvedAt && (
              <p
                className="text-xs text-gray-500 dark:text-gray-500 mt-1"
                title={formatTimestamp(data.approvedAt).full}
              >
                {formatTimestamp(data.approvedAt).display}
              </p>
            )}
            {data.notes && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                &quot;{data.notes}&quot;
              </p>
            )}
          </>
        )}

        {isCurrent && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Waiting for approval
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Rejection details section
 */
function RejectionSection({
  reason,
  rejectedBy,
  rejectorName,
  rejectedAt,
}: {
  readonly reason: string;
  readonly rejectedBy: string;
  readonly rejectorName?: string;
  readonly rejectedAt: string;
}): React.ReactElement {
  const timestamp = formatTimestamp(rejectedAt);

  return (
    <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-red-900 dark:text-red-100 mb-1">
            Article Rejected
          </h4>
          <p className="text-sm text-red-800 dark:text-red-200 mb-2">
            Rejected by: {rejectorName || rejectedBy}
          </p>
          <p className="text-sm text-red-700 dark:text-red-300 mb-2">
            Reason: &quot;{reason}&quot;
          </p>
          <p
            className="text-xs text-red-600 dark:text-red-400"
            title={timestamp.full}
          >
            {timestamp.display}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Release details section
 */
function ReleaseSection({
  releasedBy,
  releaserName,
  releasedAt,
}: {
  readonly releasedBy: string;
  readonly releaserName?: string;
  readonly releasedAt: string;
}): React.ReactElement {
  const timestamp = formatTimestamp(releasedAt);

  return (
    <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
      <div className="flex items-start gap-3">
        <CheckCircle className="text-green-600 dark:text-green-400 mt-0.5" size={20} />
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-green-900 dark:text-green-100 mb-1">
            Article Released
          </h4>
          <p className="text-sm text-green-800 dark:text-green-200 mb-2">
            Released by: {releaserName || releasedBy}
          </p>
          <p
            className="text-xs text-green-600 dark:text-green-400"
            title={timestamp.full}
          >
            {timestamp.display}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Error state
 */
function ErrorState({ error }: { readonly error: Error }): React.ReactElement {
  return (
    <div className="p-6 text-center">
      <XCircle className="mx-auto text-red-500 dark:text-red-400 mb-3" size={48} />
      <h3 className="font-semibold text-lg mb-2">Failed to Load History</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{error.message}</p>
    </div>
  );
}

/**
 * Loading state
 */
function LoadingState(): React.ReactElement {
  return (
    <div className="p-12 flex justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ApprovalHistoryModal - Complete audit trail for article approvals
 *
 * Displays:
 * - Current approval status
 * - Progress through workflow gates
 * - Timeline of all approvals with approver details
 * - Rejection details if applicable
 * - Release details if applicable
 *
 * @example
 * <ApprovalHistoryModal
 *   articleId="123"
 *   articleTitle="Critical Security Update"
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 * />
 */
export function ApprovalHistoryModal({
  articleId,
  articleTitle,
  isOpen,
  onClose,
}: ApprovalHistoryModalProps): React.ReactElement {
  const { data, isLoading, isError, error } = useApprovalHistory(
    isOpen ? articleId : undefined
  );

  // Build timeline items from approval data
  const timelineItems: TimelineItemData[] = GATE_ORDER.map((gate) => {
    if (!data) {
      return {
        gate,
        status: 'pending' as const,
      };
    }

    const approval = data.approvals.find((a) => a.gate === gate);
    const isCompleted = data.progress.completedGates.includes(gate);
    const isCurrent = data.progress.currentGate === gate;

    return {
      gate,
      status: isCompleted ? 'completed' : isCurrent ? 'current' : 'pending',
      approvedBy: approval?.approvedBy,
      approverName: approval?.approverName,
      approverEmail: approval?.approverEmail,
      approvedAt: approval?.approvedAt,
      notes: approval?.notes,
    };
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        style={{
          padding: 'var(--spacing-6)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>📋 Approval History</span>
          </DialogTitle>
          <DialogDescription className="text-left">
            {articleTitle}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <LoadingState />}

        {isError && error && <ErrorState error={error} />}

        {data && !isLoading && !isError && (
          <div className="space-y-6">
            {/* Current Status */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Status
              </h3>
              <Badge variant={getStatusBadgeVariant(data.currentStatus)}>
                {STATUS_LABELS[data.currentStatus]}
              </Badge>
            </div>

            {/* Progress Visualization */}
            <div>
              <ApprovalProgress
                progress={data.progress}
                showLabels={true}
                isRejected={data.rejected}
              />
            </div>

            {/* Divider */}
            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Timeline
              </h3>
              <div className="space-y-2">
                {timelineItems.map((item) => (
                  <TimelineItem key={item.gate} data={item} />
                ))}
              </div>
            </div>

            {/* Rejection Details */}
            {data.rejected && data.rejectionDetails && (
              <>
                <hr className="border-gray-200 dark:border-gray-700" />
                <RejectionSection
                  reason={data.rejectionDetails.reason}
                  rejectedBy={data.rejectionDetails.rejectedBy}
                  rejectorName={data.rejectionDetails.rejectorName}
                  rejectedAt={data.rejectionDetails.rejectedAt}
                />
              </>
            )}

            {/* Release Details */}
            {data.currentStatus === 'released' && data.releaseDetails && (
              <>
                <hr className="border-gray-200 dark:border-gray-700" />
                <ReleaseSection
                  releasedBy={data.releaseDetails.releasedBy}
                  releaserName={data.releaseDetails.releaserName}
                  releasedAt={data.releaseDetails.releasedAt}
                />
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

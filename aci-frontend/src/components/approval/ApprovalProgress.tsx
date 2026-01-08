/**
 * ApprovalProgress Component
 * Shows article approval workflow gate completion status
 */

import { CheckCircle, Circle, XCircle } from 'lucide-react';
import {
  type ApprovalProgress,
  type ApprovalGate,
  GATE_ORDER,
  GATE_LABELS,
  getProgressPercentage,
} from '../../types/approval';
import { Badge } from '../ui/badge';

// ============================================================================
// Types
// ============================================================================

interface ApprovalProgressProps {
  readonly progress: ApprovalProgress;
  readonly compact?: boolean;
  readonly showLabels?: boolean;
  readonly isRejected?: boolean;
}

interface GateState {
  readonly gate: ApprovalGate;
  readonly status: 'completed' | 'current' | 'pending';
  readonly label: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get gate state information
 */
function getGateState(
  gate: ApprovalGate,
  progress: ApprovalProgress
): GateState {
  const isCompleted = progress.completedGates.includes(gate);
  const isCurrent = progress.currentGate === gate;

  return {
    gate,
    status: isCompleted ? 'completed' : isCurrent ? 'current' : 'pending',
    label: GATE_LABELS[gate],
  };
}

/**
 * Get color classes for gate status
 */
function getGateColorClasses(
  status: GateState['status'],
  isRejected: boolean
): string {
  if (isRejected && status === 'current') {
    return 'text-red-600 dark:text-red-400';
  }

  switch (status) {
    case 'completed':
      return 'text-green-600 dark:text-green-400';
    case 'current':
      return 'text-amber-500 dark:text-amber-400';
    case 'pending':
      return 'text-gray-400 dark:text-gray-600';
  }
}

/**
 * Get icon component for gate status
 */
function GateIcon({
  status,
  isRejected,
}: {
  readonly status: GateState['status'];
  readonly isRejected: boolean;
}): React.ReactElement {
  const baseClasses = 'transition-colors duration-200';

  if (isRejected && status === 'current') {
    return (
      <XCircle
        className={`${baseClasses} text-red-600 dark:text-red-400`}
        size={24}
        aria-hidden="true"
      />
    );
  }

  switch (status) {
    case 'completed':
      return (
        <CheckCircle
          className={`${baseClasses} text-green-600 dark:text-green-400`}
          size={24}
          aria-hidden="true"
        />
      );
    case 'current':
      return (
        <div className="relative">
          <Circle
            className={`${baseClasses} text-amber-500 dark:text-amber-400 animate-pulse`}
            size={24}
            fill="currentColor"
            aria-hidden="true"
          />
        </div>
      );
    case 'pending':
      return (
        <Circle
          className={`${baseClasses} text-gray-400 dark:text-gray-600`}
          size={24}
          aria-hidden="true"
        />
      );
  }
}

// ============================================================================
// Components
// ============================================================================

/**
 * Compact progress view - horizontal bar with text
 */
function CompactProgress({
  progress,
  isRejected = false,
}: {
  readonly progress: ApprovalProgress;
  readonly isRejected?: boolean;
}): React.ReactElement {
  const percentage = getProgressPercentage(progress);
  const statusText = `${progress.completedCount}/${progress.totalGates} gates`;

  return (
    <div className="flex items-center gap-3" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isRejected
              ? 'bg-red-500 dark:bg-red-600'
              : 'bg-green-500 dark:bg-green-600'
          }`}
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
      <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
        {statusText}
      </Badge>
      <span className="sr-only">
        {isRejected
          ? `Rejected at ${progress.currentGate ? GATE_LABELS[progress.currentGate] : 'current gate'}`
          : `${progress.completedCount} of ${progress.totalGates} approval gates completed`}
      </span>
    </div>
  );
}

/**
 * Full progress view - all gates with icons and labels
 */
function FullProgress({
  progress,
  showLabels = true,
  isRejected = false,
}: {
  readonly progress: ApprovalProgress;
  readonly showLabels?: boolean;
  readonly isRejected?: boolean;
}): React.ReactElement {
  const gateStates = GATE_ORDER.map((gate) => getGateState(gate, progress));

  return (
    <div
      className="flex items-center justify-between gap-4"
      role="list"
      aria-label="Approval workflow gates"
    >
      {gateStates.map((gateState, index) => {
        const isLastGate = index === gateStates.length - 1;

        return (
          <div
            key={gateState.gate}
            className="flex items-center gap-4"
            role="listitem"
          >
            {/* Gate indicator */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex items-center justify-center ${getGateColorClasses(
                  gateState.status,
                  isRejected
                )}`}
                title={`${gateState.label}: ${
                  isRejected && gateState.status === 'current'
                    ? 'Rejected'
                    : gateState.status.charAt(0).toUpperCase() +
                      gateState.status.slice(1)
                }`}
              >
                <GateIcon status={gateState.status} isRejected={isRejected} />
              </div>

              {/* Gate label */}
              {showLabels && (
                <span
                  className={`text-xs font-medium text-center whitespace-nowrap ${getGateColorClasses(
                    gateState.status,
                    isRejected
                  )}`}
                >
                  {gateState.label}
                </span>
              )}
            </div>

            {/* Connector line */}
            {!isLastGate && (
              <div
                className={`h-0.5 w-8 transition-colors duration-300 ${
                  gateState.status === 'completed'
                    ? 'bg-green-500 dark:bg-green-600'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}

      {/* Screen reader summary */}
      <span className="sr-only">
        {isRejected
          ? `Article rejected at ${progress.currentGate ? GATE_LABELS[progress.currentGate] : 'current gate'}. ${progress.completedCount} of ${progress.totalGates} gates were completed.`
          : `${progress.completedCount} of ${progress.totalGates} approval gates completed. ${
              progress.currentGate
                ? `Currently at ${GATE_LABELS[progress.currentGate]}.`
                : 'All gates completed.'
            }`}
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ApprovalProgress - Shows approval workflow gate completion status
 *
 * Displays the progress of an article through the approval gates.
 * Supports both compact mode (progress bar + count) and full mode (all gates with icons).
 *
 * @example
 * // Compact mode for list views
 * <ApprovalProgress progress={article.approvalProgress} compact />
 *
 * @example
 * // Full mode for detail views
 * <ApprovalProgress
 *   progress={article.approvalProgress}
 *   showLabels={true}
 *   isRejected={article.rejected}
 * />
 */
export function ApprovalProgress({
  progress,
  compact = false,
  showLabels = true,
  isRejected = false,
}: ApprovalProgressProps): React.ReactElement {
  if (compact) {
    return <CompactProgress progress={progress} isRejected={isRejected} />;
  }

  return (
    <FullProgress
      progress={progress}
      showLabels={showLabels}
      isRejected={isRejected}
    />
  );
}

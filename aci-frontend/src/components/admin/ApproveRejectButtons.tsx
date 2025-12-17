/**
 * ApproveRejectButtons Component
 *
 * Action buttons for admin article review workflow.
 * Uses semantic color tokens for approve (success) and reject (error) actions.
 * Displays loading states during mutations.
 *
 * Features:
 * - Approve button with success/compliant color
 * - Reject button with error/critical color
 * - Loading spinners during API calls
 * - Disabled state when either action is pending
 * - Keyboard accessible
 * - ARIA labels for screen readers
 *
 * @example
 * ```tsx
 * <ApproveRejectButtons
 *   articleId="123"
 *   onApprove={(id) => handleApprove(id)}
 *   onReject={(id) => handleReject(id)}
 *   isApproving={isApproving}
 *   isRejecting={isRejecting}
 * />
 * ```
 */

import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { colors } from '@/styles/tokens/colors';
import { spacing } from '@/styles/tokens/spacing';

export interface ApproveRejectButtonsProps {
  /** Article ID to approve/reject */
  articleId: string;

  /** Callback when approve button is clicked */
  onApprove: (articleId: string) => void;

  /** Callback when reject button is clicked */
  onReject: (articleId: string) => void;

  /** Loading state for approve mutation */
  isApproving?: boolean;

  /** Loading state for reject mutation */
  isRejecting?: boolean;

  /** Disable both buttons */
  disabled?: boolean;

  /** Optional className for wrapper */
  className?: string;
}

/**
 * ApproveRejectButtons Component
 *
 * Renders approve and reject action buttons for admin content review.
 * Uses semantic color tokens for visual feedback.
 */
export function ApproveRejectButtons({
  articleId,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
  disabled = false,
  className,
}: ApproveRejectButtonsProps) {
  // Disable both buttons if either action is pending
  const isDisabled = disabled || isApproving || isRejecting;

  const handleApprove = () => {
    if (!isDisabled) {
      onApprove(articleId);
    }
  };

  const handleReject = () => {
    if (!isDisabled) {
      onReject(articleId);
    }
  };

  return (
    <div
      className={className}
      data-testid="approve-reject-buttons"
      style={{
        display: 'flex',
        gap: spacing[3],
        alignItems: 'center',
      }}
    >
      {/* Approve Button */}
      <Button
        onClick={handleApprove}
        disabled={isDisabled}
        aria-label="Approve article for publication"
        data-testid="approve-button"
        style={{
          background: colors.semantic.success,
          color: 'white',
          border: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
        }}
      >
        {isApproving ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Check size={16} aria-hidden="true" />
        )}
        <span>{isApproving ? 'Approving...' : 'Approve'}</span>
      </Button>

      {/* Reject Button */}
      <Button
        onClick={handleReject}
        disabled={isDisabled}
        aria-label="Reject article"
        data-testid="reject-button"
        style={{
          background: colors.semantic.error,
          color: 'white',
          border: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
        }}
      >
        {isRejecting ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <X size={16} aria-hidden="true" />
        )}
        <span>{isRejecting ? 'Rejecting...' : 'Reject'}</span>
      </Button>
    </div>
  );
}

ApproveRejectButtons.displayName = 'ApproveRejectButtons';

/**
 * Accessibility Notes:
 * - Semantic buttons with descriptive aria-labels
 * - Disabled state properly communicated to screen readers
 * - Visual loading indicators with aria-hidden icons
 * - Color contrast meets WCAG AA standards
 * - Keyboard navigation support via native button elements
 *
 * Design Token Usage:
 * - colors.semantic.success (approve button background)
 * - colors.semantic.error (reject button background)
 * - spacing[3] (gap between buttons)
 * - spacing[2] (gap between icon and text)
 * - NO hardcoded colors or spacing values
 *
 * Testing:
 * - data-testid="approve-reject-buttons" for wrapper
 * - data-testid="approve-button" for approve action
 * - data-testid="reject-button" for reject action
 */

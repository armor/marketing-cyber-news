/**
 * RejectButton Component
 *
 * Button that opens a modal requiring a mandatory rejection reason (min 10 chars).
 * Validates reason length and shows character count.
 */

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRejectArticle } from '@/hooks/useApprovalMutations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// ============================================================================
// Constants
// ============================================================================

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;

// ============================================================================
// Types
// ============================================================================

export interface RejectButtonProps {
  readonly articleId: string;
  readonly articleTitle: string;
  readonly onSuccess?: () => void;
  readonly onError?: (error: Error) => void;
  readonly disabled?: boolean;
  readonly size?: 'sm' | 'default' | 'lg';
}

// ============================================================================
// Component
// ============================================================================

export function RejectButton({
  articleId,
  articleTitle,
  onSuccess,
  onError,
  disabled = false,
  size = 'default',
}: RejectButtonProps): React.ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [showValidationError, setShowValidationError] = useState(false);

  const { mutate: rejectArticle, isPending } = useRejectArticle();

  // Validation state
  const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH;
  const characterCount = reason.length;
  const isOverLimit = characterCount > MAX_REASON_LENGTH;

  const handleOpenModal = (): void => {
    if (disabled) {
      return;
    }
    setIsModalOpen(true);
    setReason('');
    setShowValidationError(false);
  };

  const handleCloseModal = (): void => {
    if (isPending) {
      return;
    }
    setIsModalOpen(false);
    setReason('');
    setShowValidationError(false);
  };

  const handleReasonChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const newValue = event.target.value;

    // Prevent input beyond max length
    if (newValue.length > MAX_REASON_LENGTH) {
      return;
    }

    setReason(newValue);

    // Clear validation error once user starts typing valid input
    if (showValidationError && newValue.trim().length >= MIN_REASON_LENGTH) {
      setShowValidationError(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    // Validate reason length
    if (!isReasonValid) {
      setShowValidationError(true);
      toast.error('Rejection reason too short', {
        description: `Please provide at least ${MIN_REASON_LENGTH} characters explaining why this article is being rejected.`,
      });
      return;
    }

    if (isOverLimit) {
      toast.error('Rejection reason too long', {
        description: `Please keep the reason under ${MAX_REASON_LENGTH} characters.`,
      });
      return;
    }

    // Submit rejection
    rejectArticle(
      {
        articleId,
        request: { reason: reason.trim() },
      },
      {
        onSuccess: (response) => {
          toast.success('Article Rejected', {
            description: response.message || 'The article has been removed from the approval pipeline.',
          });
          handleCloseModal();
          onSuccess?.();
        },
        onError: (error) => {
          toast.error('Rejection Failed', {
            description: error.message || 'Unable to reject the article. Please try again.',
          });
          onError?.(error);
        },
      }
    );
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        disabled={disabled}
        size={size}
        variant="destructive"
        data-testid="reject-button"
      >
        <X style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
        Reject
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          onPointerDownOutside={(e) => {
            if (isPending) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isPending) {
              e.preventDefault();
            }
          }}
        >
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                  color: 'var(--color-status-error)',
                }}
              >
                <X style={{ width: 'var(--spacing-5)', height: 'var(--spacing-5)' }} />
                Reject Article
              </DialogTitle>
              <DialogDescription asChild>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-4)',
                    marginTop: 'var(--spacing-4)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--spacing-2)',
                      padding: 'var(--spacing-3)',
                      backgroundColor: 'var(--color-bg-warning)',
                      borderRadius: 'var(--border-radius-md)',
                      borderLeft: '4px solid var(--color-status-warning)',
                    }}
                  >
                    <AlertTriangle
                      style={{
                        width: 'var(--spacing-5)',
                        height: 'var(--spacing-5)',
                        color: 'var(--color-status-warning)',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <p
                        style={{
                          fontWeight: 'var(--typography-font-weight-semibold)',
                          marginBottom: 'var(--spacing-1)',
                        }}
                      >
                        You are about to reject:
                      </p>
                      <p
                        style={{
                          fontStyle: 'italic',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        "{articleTitle}"
                      </p>
                      <p
                        style={{
                          marginTop: 'var(--spacing-2)',
                          fontSize: 'var(--typography-font-size-sm)',
                        }}
                      >
                        This will remove the article from the approval pipeline.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="rejection-reason"
                      style={{
                        display: 'block',
                        fontWeight: 'var(--typography-font-weight-semibold)',
                        marginBottom: 'var(--spacing-2)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Rejection Reason (required):
                    </label>
                    <Textarea
                      id="rejection-reason"
                      value={reason}
                      onChange={handleReasonChange}
                      placeholder="Explain why this article is being rejected..."
                      disabled={isPending}
                      rows={4}
                      style={{
                        borderColor:
                          showValidationError && !isReasonValid
                            ? 'var(--color-status-error)'
                            : undefined,
                      }}
                      className={
                        showValidationError && !isReasonValid
                          ? 'ring-2 ring-destructive'
                          : undefined
                      }
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 'var(--spacing-2)',
                        fontSize: 'var(--typography-font-size-xs)',
                      }}
                    >
                      {showValidationError && !isReasonValid ? (
                        <span
                          style={{
                            color: 'var(--color-status-error)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-1)',
                          }}
                        >
                          <AlertTriangle
                            style={{
                              width: 'var(--spacing-4)',
                              height: 'var(--spacing-4)',
                            }}
                          />
                          Minimum {MIN_REASON_LENGTH} characters required
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          Minimum {MIN_REASON_LENGTH} characters required
                        </span>
                      )}
                      <span
                        style={{
                          color: isOverLimit
                            ? 'var(--color-status-error)'
                            : 'var(--color-text-secondary)',
                        }}
                      >
                        {characterCount}/{MAX_REASON_LENGTH} characters
                      </span>
                    </div>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter
              style={{
                marginTop: 'var(--spacing-6)',
              }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !isReasonValid || isOverLimit}
                variant="destructive"
              >
                {isPending ? (
                  <>
                    <Loader2
                      style={{
                        width: 'var(--spacing-4)',
                        height: 'var(--spacing-4)',
                      }}
                      className="animate-spin"
                    />
                    Rejecting...
                  </>
                ) : (
                  'Reject Article'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

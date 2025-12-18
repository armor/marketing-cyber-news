/**
 * ApproveButton Component
 *
 * Button with confirmation dialog for approving articles.
 * Includes optional notes field and handles approval mutation.
 */

import { useState, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApproveArticle } from '@/hooks/useApprovalMutations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// ============================================================================
// Constants
// ============================================================================

const MAX_NOTES_LENGTH = 1000;

// ============================================================================
// Types
// ============================================================================

export interface ApproveButtonProps {
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

/**
 * Button with confirmation dialog for approving articles
 *
 * Opens a dialog on click with article title confirmation,
 * optional notes field, and approve/cancel actions.
 *
 * @example
 * ```tsx
 * <ApproveButton
 *   articleId="123"
 *   articleTitle="Critical Vulnerability Found"
 *   onSuccess={() => console.log('Approved!')}
 * />
 * ```
 */
export function ApproveButton({
  articleId,
  articleTitle,
  onSuccess,
  onError,
  disabled = false,
  size = 'default',
}: ApproveButtonProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const { mutate: approveArticle, isPending } = useApproveArticle();

  const handleOpen = useCallback((): void => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled]);

  const handleClose = useCallback((): void => {
    if (!isPending) {
      setIsOpen(false);
      setNotes('');
    }
  }, [isPending]);

  const handleNotesChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    const value = event.target.value;
    if (value.length <= MAX_NOTES_LENGTH) {
      setNotes(value);
    }
  }, []);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    approveArticle(
      {
        articleId,
        request: notes.trim() ? { notes: notes.trim() } : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Article approved', {
            description: `"${articleTitle}" has been approved and advanced to the next gate.`,
          });
          handleClose();
          onSuccess?.();
        },
        onError: (error) => {
          toast.error('Approval failed', {
            description: error.message || 'Failed to approve article. Please try again.',
          });
          onError?.(error);
        },
      }
    );
  }, [articleId, notes, articleTitle, approveArticle, handleClose, onSuccess, onError]);

  const handleConfirmClick = useCallback((): void => {
    const form = document.getElementById('approve-form') as HTMLFormElement | null;
    if (form) {
      form.requestSubmit();
    }
  }, []);

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={disabled || isPending}
        size={size}
        variant="default"
        style={{
          background: 'var(--color-success)',
          color: 'var(--color-text-on-primary)',
        }}
      >
        {isPending ? (
          <Loader2
            style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }}
            className="animate-spin"
          />
        ) : (
          <CheckCircle style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
        )}
        Approve
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !isPending && !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
              }}
            >
              <CheckCircle
                style={{
                  width: 'var(--spacing-5)',
                  height: 'var(--spacing-5)',
                  color: 'var(--color-success)',
                }}
              />
              Approve Article
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve:
            </DialogDescription>
          </DialogHeader>

          <form id="approve-form" onSubmit={handleSubmit}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-4)',
              }}
            >
              <div
                style={{
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-default)',
                }}
              >
                <p
                  style={{
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  "{articleTitle}"
                </p>
              </div>

              <p
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                This will advance the article to the next approval gate.
              </p>

              <div>
                <label
                  htmlFor="approval-notes"
                  style={{
                    display: 'block',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--spacing-2)',
                  }}
                >
                  Notes (optional):
                </label>
                <Textarea
                  id="approval-notes"
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Add any comments about this approval..."
                  disabled={isPending}
                  rows={4}
                  style={{
                    resize: 'none',
                  }}
                />
                <div
                  style={{
                    marginTop: 'var(--spacing-1)',
                    fontSize: 'var(--typography-font-size-xs)',
                    color: 'var(--color-text-tertiary)',
                    textAlign: 'right',
                  }}
                >
                  {notes.length}/{MAX_NOTES_LENGTH} characters
                </div>
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmClick}
              disabled={isPending}
              style={{
                background: 'var(--color-success)',
                color: 'var(--color-text-on-primary)',
              }}
            >
              {isPending && (
                <Loader2
                  style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }}
                  className="animate-spin"
                />
              )}
              Approve Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

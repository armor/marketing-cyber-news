/**
 * ReleaseButton Component
 *
 * Button with confirmation dialog for releasing fully-approved articles to public.
 * Only enabled when article has passed all 5 approval gates.
 * Available to admin, ciso, and super_admin roles.
 */

import { useState, useCallback } from 'react';
import { Rocket, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useReleaseArticle } from '@/hooks/useApprovalMutations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// Types
// ============================================================================

export interface ReleaseButtonProps {
  readonly articleId: string;
  readonly articleTitle: string;
  readonly isFullyApproved: boolean;
  readonly onSuccess?: () => void;
  readonly onError?: (error: Error) => void;
  readonly disabled?: boolean;
  readonly size?: 'sm' | 'default' | 'lg';
}

// ============================================================================
// Component
// ============================================================================

/**
 * Button with confirmation dialog for releasing articles to public
 *
 * Opens a dialog on click with article title confirmation and warning
 * about the irreversible nature of the action. Only enabled when
 * isFullyApproved is true.
 *
 * @example
 * ```tsx
 * <ReleaseButton
 *   articleId="123"
 *   articleTitle="Critical Vulnerability Found"
 *   isFullyApproved={true}
 *   onSuccess={() => console.log('Released!')}
 * />
 * ```
 */
export function ReleaseButton({
  articleId,
  articleTitle,
  isFullyApproved,
  onSuccess,
  onError,
  disabled = false,
  size = 'default',
}: ReleaseButtonProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const { mutate: releaseArticle, isPending } = useReleaseArticle();

  const isButtonDisabled = disabled || !isFullyApproved || isPending;

  const handleOpen = useCallback((): void => {
    if (!isButtonDisabled) {
      setIsOpen(true);
    }
  }, [isButtonDisabled]);

  const handleClose = useCallback((): void => {
    if (!isPending) {
      setIsOpen(false);
    }
  }, [isPending]);

  const handleConfirm = useCallback((): void => {
    releaseArticle(
      { articleId },
      {
        onSuccess: () => {
          toast.success('Article released', {
            description: `"${articleTitle}" is now visible to all users.`,
          });
          handleClose();
          onSuccess?.();
        },
        onError: (error) => {
          toast.error('Release failed', {
            description: error.message || 'Failed to release article. Please try again.',
          });
          onError?.(error);
        },
      }
    );
  }, [articleId, articleTitle, releaseArticle, handleClose, onSuccess, onError]);

  const renderButton = (): JSX.Element => (
    <Button
      onClick={handleOpen}
      disabled={isButtonDisabled}
      size={size}
      variant="default"
      style={{
        background: isButtonDisabled
          ? 'var(--color-bg-disabled)'
          : 'var(--color-primary)',
        color: isButtonDisabled
          ? 'var(--color-text-disabled)'
          : 'var(--color-text-on-primary)',
      }}
    >
      {isPending ? (
        <Loader2
          style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }}
          className="animate-spin"
        />
      ) : (
        <Rocket style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
      )}
      Release
    </Button>
  );

  const button = renderButton();

  // Wrap in tooltip if not fully approved
  if (!isFullyApproved && !disabled) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent>
              <p style={{ fontSize: 'var(--typography-font-size-sm)' }}>
                Article must pass all 5 approval gates before release
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

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
                <Rocket
                  style={{
                    width: 'var(--spacing-5)',
                    height: 'var(--spacing-5)',
                    color: 'var(--color-primary)',
                  }}
                />
                Release Article
              </DialogTitle>
              <DialogDescription>
                You are about to release this article for public viewing.
              </DialogDescription>
            </DialogHeader>

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
                  lineHeight: 'var(--typography-line-height-relaxed)',
                }}
              >
                This article has passed all 5 approval gates and will become visible to all users.
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-2)',
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: 'var(--color-warning-bg)',
                  border: '1px solid var(--color-warning-border)',
                }}
              >
                <AlertCircle
                  style={{
                    width: 'var(--spacing-5)',
                    height: 'var(--spacing-5)',
                    color: 'var(--color-warning)',
                    flexShrink: 0,
                  }}
                />
                <p
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    color: 'var(--color-text-primary)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                  }}
                >
                  This action cannot be undone.
                </p>
              </div>
            </div>

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
                onClick={handleConfirm}
                disabled={isPending}
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-text-on-primary)',
                }}
              >
                {isPending && (
                  <Loader2
                    style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }}
                    className="animate-spin"
                  />
                )}
                Release to Public
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {button}

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
              <Rocket
                style={{
                  width: 'var(--spacing-5)',
                  height: 'var(--spacing-5)',
                  color: 'var(--color-primary)',
                }}
              />
              Release Article
            </DialogTitle>
            <DialogDescription>
              You are about to release this article for public viewing.
            </DialogDescription>
          </DialogHeader>

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
                lineHeight: 'var(--typography-line-height-relaxed)',
              }}
            >
              This article has passed all 5 approval gates and will become visible to all users.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-2)',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning-border)',
              }}
            >
              <AlertCircle
                style={{
                  width: 'var(--spacing-5)',
                  height: 'var(--spacing-5)',
                  color: 'var(--color-warning)',
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                }}
              >
                This action cannot be undone.
              </p>
            </div>
          </div>

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
              onClick={handleConfirm}
              disabled={isPending}
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-text-on-primary)',
              }}
            >
              {isPending && (
                <Loader2
                  style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }}
                  className="animate-spin"
                />
              )}
              Release to Public
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

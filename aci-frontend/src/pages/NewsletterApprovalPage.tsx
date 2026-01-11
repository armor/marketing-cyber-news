/**
 * NewsletterApprovalPage Component
 *
 * Page for reviewing and approving newsletter issues before sending.
 * Fetches and displays pending approval issues from the API.
 */

import { type ReactElement, useState } from 'react';
import { Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useIssues } from '@/hooks/useIssues';
import { useApproveIssue, useRejectIssue } from '@/hooks/useIssueMutations';
import { IssueCard } from '@/components/newsletter/IssueCard';
import { toast } from 'sonner';

export function NewsletterApprovalPage(): ReactElement {
  const navigate = useNavigate();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingIssueId, setRejectingIssueId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useIssues({
    status: 'pending_approval',
    page: 1,
    pageSize: 50,
  });

  const approveIssueMutation = useApproveIssue();
  const rejectIssueMutation = useRejectIssue();

  const handlePreview = (id: string): void => {
    navigate(`/newsletter/preview/${id}`);
  };

  const handleApprove = (id: string): void => {
    approveIssueMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success('Newsletter approved successfully');
          void refetch();
        },
        onError: (err) => {
          toast.error(`Failed to approve newsletter: ${err.message}`);
        },
      }
    );
  };

  const handleReject = (id: string): void => {
    setRejectingIssueId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = (): void => {
    if (!rejectingIssueId) {
      return;
    }

    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    if (rejectReason.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters');
      return;
    }

    rejectIssueMutation.mutate(
      { id: rejectingIssueId, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          toast.success('Newsletter rejected');
          setRejectDialogOpen(false);
          setRejectingIssueId(null);
          setRejectReason('');
          void refetch();
        },
        onError: (err) => {
          toast.error(`Failed to reject newsletter: ${err.message}`);
        },
      }
    );
  };

  const handleCancelReject = (): void => {
    setRejectDialogOpen(false);
    setRejectingIssueId(null);
    setRejectReason('');
  };

  return (
    <div
      style={{
        padding: 'var(--spacing-6)',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 'var(--spacing-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-4)',
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/newsletter/configs')}
          style={{
            padding: 'var(--spacing-2)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: 'var(--typography-font-size-2xl)',
              fontWeight: 'var(--typography-font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-1)',
            }}
          >
            Newsletter Approval
          </h1>
          <p
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Review and approve newsletter issues before distribution
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)',
          }}
        >
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} style={{ width: '100%', height: '200px' }} />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--border-radius-lg)',
            padding: 'var(--spacing-8)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 'var(--spacing-16)',
              height: 'var(--spacing-16)',
              margin: '0 auto var(--spacing-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--border-radius-full)',
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
            }}
          >
            <AlertCircle className="size-8" />
          </div>
          <h2
            style={{
              fontSize: 'var(--typography-font-size-xl)',
              fontWeight: 'var(--typography-font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            Failed to Load Pending Approvals
          </h2>
          <p
            style={{
              fontSize: 'var(--typography-font-size-base)',
              color: 'var(--color-text-secondary)',
              maxWidth: '600px',
              margin: '0 auto var(--spacing-4)',
            }}
          >
            {error?.message || 'An error occurred while fetching pending approvals'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && data?.data.length === 0 && (
        <div
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--border-radius-lg)',
            padding: 'var(--spacing-8)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 'var(--spacing-16)',
              height: 'var(--spacing-16)',
              margin: '0 auto var(--spacing-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--border-radius-full)',
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-brand-primary)',
            }}
          >
            <Mail className="size-8" />
          </div>
          <h2
            style={{
              fontSize: 'var(--typography-font-size-xl)',
              fontWeight: 'var(--typography-font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            No newsletters awaiting approval
          </h2>
          <p
            style={{
              fontSize: 'var(--typography-font-size-base)',
              color: 'var(--color-text-secondary)',
              maxWidth: '600px',
              margin: '0 auto var(--spacing-6)',
            }}
          >
            All newsletter issues have been reviewed. New issues will appear here when they are ready for approval.
          </p>
          <Button
            onClick={() => navigate('/newsletter/configs')}
            style={{
              background: 'var(--gradient-btn-primary)',
              color: 'var(--color-bg-elevated)',
            }}
          >
            View Configurations
          </Button>
        </div>
      )}

      {/* Issues List */}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)',
          }}
        >
          {data.data.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onPreview={handlePreview}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {/* Reject Confirmation Sheet */}
      <Sheet open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <SheetContent
          side="right"
          style={{
            maxWidth: '500px',
          }}
        >
          <SheetHeader>
            <SheetTitle>Reject Newsletter</SheetTitle>
            <SheetDescription>
              Please provide a reason for rejecting this newsletter. This feedback will help improve future issues.
            </SheetDescription>
          </SheetHeader>

          <div style={{ padding: 'var(--spacing-4) 0' }}>
            <label
              htmlFor="reject-reason"
              style={{
                display: 'block',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Rejection Reason *
            </label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection (minimum 10 characters)..."
              rows={4}
              aria-required="true"
              aria-invalid={rejectReason.trim().length > 0 && rejectReason.trim().length < 10}
              aria-describedby="reject-reason-error"
              style={{
                width: '100%',
              }}
            />
            {rejectReason.trim().length > 0 && rejectReason.trim().length < 10 && (
              <p
                id="reject-reason-error"
                role="alert"
                style={{
                  fontSize: 'var(--typography-font-size-xs)',
                  color: 'var(--color-severity-high)',
                  marginTop: 'var(--spacing-1)',
                }}
              >
                Rejection reason must be at least 10 characters
              </p>
            )}
            <p
              style={{
                fontSize: 'var(--typography-font-size-xs)',
                color: 'var(--color-text-secondary)',
                marginTop: 'var(--spacing-1)',
              }}
            >
              {rejectReason.length} / 10 characters minimum
            </p>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={handleCancelReject}
              disabled={rejectIssueMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectIssueMutation.isPending || rejectReason.trim().length < 10}
            >
              {rejectIssueMutation.isPending ? 'Rejecting...' : 'Reject Newsletter'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

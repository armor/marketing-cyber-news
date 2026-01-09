/**
 * ClaimsList Component
 *
 * Displays a table of claims library entries with filtering and actions.
 *
 * Features:
 * - Table view with claim text, type, category, status, usage, actions
 * - Status badges (pending, approved, rejected, expired)
 * - Type badges (claim, disclaimer, do_not_say)
 * - Add button in header
 * - Edit/Delete/Approve/Reject actions per row
 * - Empty state for no claims
 * - Loading state
 * - Pagination
 *
 * @example
 * ```tsx
 * <ClaimsList
 *   filter={{ claim_type: 'claim' }}
 *   onAdd={() => setShowForm(true)}
 *   onEdit={(id) => openEditForm(id)}
 *   canApprove={userRole === 'compliance_sme'}
 * />
 * ```
 */

import { type ReactElement, useState } from 'react';
import {
  Edit,
  Trash2,
  Plus,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useClaims } from '@/hooks/useClaims';
import { useDeleteClaim, useApproveClaim, useRejectClaim } from '@/hooks/useClaimMutations';
import type {
  ClaimType,
  ClaimApprovalStatus,
  ClaimFilter,
} from '@/types/claims';

// ============================================================================
// Types
// ============================================================================

export interface ClaimsListProps {
  readonly filter?: ClaimFilter;
  readonly onAdd: () => void;
  readonly onEdit: (id: string) => void;
  readonly canApprove?: boolean;
  readonly title?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get type badge variant
 */
function getTypeBadgeVariant(type: ClaimType): 'default' | 'secondary' | 'destructive' {
  const variantMap: Record<ClaimType, 'default' | 'secondary' | 'destructive'> = {
    claim: 'default',
    disclaimer: 'secondary',
    do_not_say: 'destructive',
  };
  return variantMap[type];
}

/**
 * Get type display label
 */
function getTypeLabel(type: ClaimType): string {
  const labelMap: Record<ClaimType, string> = {
    claim: 'Marketing Claim',
    disclaimer: 'Disclaimer',
    do_not_say: 'Do Not Say',
  };
  return labelMap[type];
}

/**
 * Get status badge variant
 */
function getStatusBadgeVariant(
  status: ClaimApprovalStatus
): 'default' | 'success' | 'warning' | 'destructive' {
  const variantMap: Record<ClaimApprovalStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'destructive',
    expired: 'default',
  };
  return variantMap[status];
}

/**
 * Get status display label
 */
function getStatusLabel(status: ClaimApprovalStatus): string {
  const labelMap: Record<ClaimApprovalStatus, string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Expired',
  };
  return labelMap[status];
}

/**
 * Format date for display
 */
function formatDate(dateString?: string): string {
  if (!dateString) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

/**
 * Truncate text for display
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength)}...`;
}

// ============================================================================
// Component
// ============================================================================

export function ClaimsList({
  filter,
  onAdd,
  onEdit,
  canApprove = false,
  title = 'Claims Library',
}: ClaimsListProps): ReactElement {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, refetch } = useClaims({
    ...filter,
    page,
    page_size: pageSize,
  });

  const deleteMutation = useDeleteClaim();
  const approveMutation = useApproveClaim();
  const rejectMutation = useRejectClaim();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDelete = (id: string, claimText: string): void => {
    if (window.confirm(`Are you sure you want to delete this claim?\n\n"${truncateText(claimText, 100)}"`)) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            void refetch();
          },
        }
      );
    }
  };

  const handleApprove = (id: string): void => {
    approveMutation.mutate(
      { id },
      {
        onSuccess: () => {
          void refetch();
        },
      }
    );
  };

  const handleReject = (id: string): void => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason) {
      rejectMutation.mutate(
        { id, request: { reason } },
        {
          onSuccess: () => {
            void refetch();
          },
        }
      );
    }
  };

  const handlePrevPage = (): void => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = (): void => {
    const totalPages = data?.meta?.total_pages ?? 1;
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 'var(--spacing-12)',
            }}
          >
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  const claims = data?.data ?? [];
  const meta = data?.meta;

  // ============================================================================
  // Empty State
  // ============================================================================

  if (claims.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <CardTitle>{title}</CardTitle>
            <Button onClick={onAdd} size="sm">
              <Plus style={{ width: '16px', height: '16px' }} />
              <span style={{ marginLeft: 'var(--spacing-2)' }}>Add Claim</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No claims found"
            description="Add your first claim to start building your claims library"
            action={{ label: 'Add Claim', onClick: onAdd }}
          />
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // Table View
  // ============================================================================

  return (
    <Card>
      <CardHeader>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <CardTitle>{title}</CardTitle>
          <Button onClick={onAdd} size="sm">
            <Plus style={{ width: '16px', height: '16px' }} />
            <span style={{ marginLeft: 'var(--spacing-2)' }}>Add Claim</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <th
                  style={{
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    textAlign: 'left',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Claim Text
                </th>
                <th
                  style={{
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    textAlign: 'left',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Type
                </th>
                <th
                  style={{
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    textAlign: 'left',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Category
                </th>
                <th
                  style={{
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    textAlign: 'left',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    textAlign: 'right',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Usage
                </th>
                <th
                  style={{
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    textAlign: 'left',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Expires
                </th>
                <th
                  style={{
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    textAlign: 'right',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => {
                const isPending = claim.approval_status === 'pending';
                const isExpired = claim.is_expired;

                return (
                  <tr
                    key={claim.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      opacity: isExpired ? 0.6 : 1,
                    }}
                  >
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                        fontSize: 'var(--typography-font-size-base)',
                        maxWidth: '400px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 'var(--spacing-2)',
                        }}
                      >
                        {claim.claim_type === 'do_not_say' && (
                          <AlertTriangle
                            style={{
                              width: '16px',
                              height: '16px',
                              color: 'var(--color-error)',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          />
                        )}
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                          title={claim.claim_text}
                        >
                          {claim.claim_text}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                      }}
                    >
                      <Badge variant={getTypeBadgeVariant(claim.claim_type)}>
                        {getTypeLabel(claim.claim_type)}
                      </Badge>
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                        fontSize: 'var(--typography-font-size-sm)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {claim.category}
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                      }}
                    >
                      <Badge variant={getStatusBadgeVariant(claim.approval_status)}>
                        {getStatusLabel(claim.approval_status)}
                      </Badge>
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                        fontSize: 'var(--typography-font-size-sm)',
                        color: 'var(--color-text-secondary)',
                        textAlign: 'right',
                      }}
                    >
                      {claim.usage_count.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                        fontSize: 'var(--typography-font-size-sm)',
                        color: isExpired ? 'var(--color-error)' : 'var(--color-text-secondary)',
                      }}
                    >
                      {formatDate(claim.expires_at)}
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                        textAlign: 'right',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: 'var(--spacing-2)',
                          justifyContent: 'flex-end',
                        }}
                      >
                        {canApprove && isPending && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(claim.id)}
                              disabled={approveMutation.isPending}
                              title="Approve claim"
                            >
                              <Check
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  color: 'var(--color-success)',
                                }}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReject(claim.id)}
                              disabled={rejectMutation.isPending}
                              title="Reject claim"
                            >
                              <X
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  color: 'var(--color-error)',
                                }}
                              />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(claim.id)}
                          title="Edit claim"
                        >
                          <Edit style={{ width: '16px', height: '16px' }} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(claim.id, claim.claim_text)}
                          disabled={deleteMutation.isPending}
                          title="Delete claim"
                        >
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.total_pages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'var(--spacing-4)',
              paddingTop: 'var(--spacing-4)',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Showing {(page - 1) * pageSize + 1} -{' '}
              {Math.min(page * pageSize, meta.total_count)} of {meta.total_count}
            </span>
            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-2)',
              }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page === 1}
              >
                <ChevronLeft style={{ width: '16px', height: '16px' }} />
              </Button>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 var(--spacing-3)',
                  fontSize: 'var(--typography-font-size-sm)',
                }}
              >
                Page {page} of {meta.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= meta.total_pages}
              >
                <ChevronRight style={{ width: '16px', height: '16px' }} />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

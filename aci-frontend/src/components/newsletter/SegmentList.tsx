/**
 * SegmentList Component
 *
 * Displays a table/list of audience segments with actions.
 *
 * Features:
 * - Table view with name, contact count, industries, status
 * - Actions: Edit, View Contacts
 * - Pagination support
 * - Loading and empty states
 * - Responsive design with design tokens
 *
 * @example
 * ```tsx
 * <SegmentList
 *   segments={segments}
 *   isLoading={false}
 *   pagination={pagination}
 *   onEdit={(id) => console.log('Edit', id)}
 *   onViewContacts={(id) => console.log('View contacts', id)}
 *   onPageChange={(page) => console.log('Page', page)}
 * />
 * ```
 */

import { type ReactElement } from 'react';
import { Edit, Users, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Segment, Pagination } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

export interface SegmentListProps {
  readonly segments: readonly Segment[];
  readonly isLoading?: boolean;
  readonly pagination?: Pagination;
  readonly onEdit: (id: string) => void;
  readonly onViewContacts: (id: string) => void;
  readonly onPageChange?: (page: number) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format array of items for display (show first N items + count)
 */
function formatList(items: readonly string[] | undefined | null, maxShow: number = 3): string {
  if (!items || items.length === 0) return 'None';
  if (items.length <= maxShow) return items.join(', ');
  const shown = items.slice(0, maxShow).join(', ');
  const remaining = items.length - maxShow;
  return `${shown} +${remaining} more`;
}

// ============================================================================
// Component
// ============================================================================

export function SegmentList({
  segments,
  isLoading = false,
  pagination,
  onEdit,
  onViewContacts,
  onPageChange,
}: SegmentListProps): ReactElement {
  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audience Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center"
            style={{
              padding: 'var(--spacing-12)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p>Loading segments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // Empty State
  // ============================================================================

  if (segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audience Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-center"
            style={{
              padding: 'var(--spacing-12)',
            }}
          >
            <Users
              style={{
                width: 'var(--spacing-12)',
                height: 'var(--spacing-12)',
                margin: '0 auto var(--spacing-4)',
                color: 'var(--color-text-secondary)',
              }}
            />
            <p
              style={{
                fontSize: 'var(--typography-font-size-base)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-4)',
              }}
            >
              No audience segments found
            </p>
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Create your first segment to target specific audiences
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Audience Segments</CardTitle>
          {pagination && (
            <span
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {pagination.total} total
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table
            className="w-full"
            style={{
              borderCollapse: 'separate',
              borderSpacing: '0',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: `var(--border-width-thin) solid var(--color-border-default)`,
                }}
              >
                <th
                  className="text-left"
                  style={{
                    padding: 'var(--spacing-3)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Name
                </th>
                <th
                  className="text-left"
                  style={{
                    padding: 'var(--spacing-3)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Contacts
                </th>
                <th
                  className="text-left"
                  style={{
                    padding: 'var(--spacing-3)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Industries
                </th>
                <th
                  className="text-left"
                  style={{
                    padding: 'var(--spacing-3)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Status
                </th>
                <th
                  className="text-right"
                  style={{
                    padding: 'var(--spacing-3)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment) => (
                <tr
                  key={segment.id}
                  style={{
                    borderBottom: `var(--border-width-thin) solid var(--color-border-default)`,
                  }}
                >
                  <td
                    style={{
                      padding: 'var(--spacing-3)',
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 'var(--typography-font-weight-medium)',
                        }}
                      >
                        {segment.name}
                      </div>
                      {segment.description && (
                        <div
                          style={{
                            fontSize: 'var(--typography-font-size-xs)',
                            color: 'var(--color-text-secondary)',
                            marginTop: 'var(--spacing-1)',
                          }}
                        >
                          {segment.description}
                        </div>
                      )}
                      {segment.role_cluster && (
                        <div
                          style={{
                            fontSize: 'var(--typography-font-size-xs)',
                            color: 'var(--color-text-secondary)',
                            marginTop: 'var(--spacing-1)',
                          }}
                        >
                          Role: {segment.role_cluster}
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-3)',
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <div className="flex items-center">
                      <Users
                        style={{
                          width: 'var(--spacing-4)',
                          height: 'var(--spacing-4)',
                          marginRight: 'var(--spacing-2)',
                          color: 'var(--color-text-secondary)',
                        }}
                      />
                      {segment.contact_count.toLocaleString()}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-3)',
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {formatList(segment.industries)}
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-3)',
                    }}
                  >
                    <Badge variant={segment.is_active ? 'success' : 'secondary'}>
                      {segment.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-3)',
                      textAlign: 'right',
                    }}
                  >
                    <TooltipProvider>
                      <div
                        className="flex items-center justify-end"
                        style={{
                          gap: 'var(--spacing-1)',
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewContacts(segment.id)}
                              aria-label="View segment contacts"
                            >
                              <Eye
                                style={{
                                  width: 'var(--spacing-4)',
                                  height: 'var(--spacing-4)',
                                }}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View contacts in segment</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(segment.id)}
                              aria-label="Edit segment"
                            >
                              <Edit
                                style={{
                                  width: 'var(--spacing-4)',
                                  height: 'var(--spacing-4)',
                                }}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit segment</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && onPageChange && (
          <div
            className="flex items-center justify-between"
            style={{
              marginTop: 'var(--spacing-4)',
              paddingTop: 'var(--spacing-4)',
              borderTop: `var(--border-width-thin) solid var(--color-border-default)`,
            }}
          >
            <div
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Page {pagination.page} of {pagination.total_pages}
            </div>
            <div
              className="flex items-center"
              style={{
                gap: 'var(--spacing-2)',
              }}
            >
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => onPageChange(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.total_pages}
                onClick={() => onPageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

SegmentList.displayName = 'SegmentList';

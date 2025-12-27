/**
 * ConfigurationList Component
 *
 * Displays a table/list of newsletter configurations with actions.
 *
 * Features:
 * - Table view with name, cadence, segment, status, created date
 * - Actions: Generate, Edit, Clone, Delete
 * - Pagination support
 * - Loading and empty states
 * - Responsive design with design tokens
 *
 * @example
 * ```tsx
 * <ConfigurationList
 *   configurations={configs}
 *   isLoading={false}
 *   pagination={pagination}
 *   onGenerate={(id) => console.log('Generate', id)}
 *   onEdit={(id) => console.log('Edit', id)}
 *   onClone={(id) => console.log('Clone', id)}
 *   onDelete={(id) => console.log('Delete', id)}
 *   onPageChange={(page) => console.log('Page', page)}
 * />
 * ```
 */

import { type ReactElement } from 'react';
import { Edit, Copy, Trash2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { NewsletterConfiguration, Pagination } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

export interface ConfigurationListProps {
  readonly configurations: readonly NewsletterConfiguration[];
  readonly isLoading?: boolean;
  readonly pagination?: Pagination;
  readonly onGenerate: (id: string) => void;
  readonly onEdit: (id: string) => void;
  readonly onClone: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onPageChange?: (page: number) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format cadence type for display
 */
function formatCadence(cadence: string): string {
  const cadenceMap: Record<string, string> = {
    weekly: 'Weekly',
    'bi-weekly': 'Bi-Weekly',
    monthly: 'Monthly',
  };
  return cadenceMap[cadence] || cadence;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// ============================================================================
// Component
// ============================================================================

export function ConfigurationList({
  configurations,
  isLoading = false,
  pagination,
  onGenerate,
  onEdit,
  onClone,
  onDelete,
  onPageChange,
}: ConfigurationListProps): ReactElement {
  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Newsletter Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center"
            style={{
              padding: 'var(--spacing-12)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p>Loading configurations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // Empty State
  // ============================================================================

  if (configurations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Newsletter Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-center"
            style={{
              padding: 'var(--spacing-12)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--typography-font-size-base)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-4)',
              }}
            >
              No newsletter configurations found
            </p>
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Create your first configuration to get started
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
          <CardTitle>Newsletter Configurations</CardTitle>
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
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table
            className="w-full"
            style={{
              borderCollapse: 'separate',
              borderSpacing: '0',
            }}
          >
            <caption className="sr-only">
              Newsletter configurations list with name, cadence, segment, status, created date, and actions
            </caption>
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
                  scope="col"
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
                  scope="col"
                >
                  Cadence
                </th>
                <th
                  className="text-left"
                  style={{
                    padding: 'var(--spacing-3)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                  }}
                  scope="col"
                >
                  Segment
                </th>
                <th
                  className="text-left"
                  style={{
                    padding: 'var(--spacing-3)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                  }}
                  scope="col"
                >
                  Status
                </th>
                <th
                  className="text-left"
                  style={{
                    padding: 'var(--spacing-3)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                  }}
                  scope="col"
                >
                  Created
                </th>
                <th
                  className="text-right"
                  style={{
                    padding: 'var(--spacing-3)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                  }}
                  scope="col"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {configurations.map((config) => (
                <tr
                  key={config.id}
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
                        {config.name}
                      </div>
                      {config.description && (
                        <div
                          style={{
                            fontSize: 'var(--typography-font-size-xs)',
                            color: 'var(--color-text-secondary)',
                            marginTop: 'var(--spacing-1)',
                          }}
                        >
                          {config.description}
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
                    {formatCadence(config.cadence)}
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-3)',
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {config.segment_id || 'N/A'}
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-3)',
                    }}
                  >
                    <Badge variant={config.is_active ? 'success' : 'secondary'}>
                      {config.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-3)',
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {formatDate(config.created_at)}
                  </td>
                  <td
                    style={{
                      padding: 'var(--spacing-3)',
                      textAlign: 'right',
                    }}
                  >
                    <div
                      className="flex items-center justify-end"
                      style={{
                        gap: 'var(--spacing-1)',
                      }}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onGenerate(config.id)}
                              aria-label="Generate newsletter issue"
                              style={{
                                color: 'var(--color-brand-primary)',
                              }}
                            >
                              <Sparkles
                                style={{
                                  width: 'var(--spacing-4)',
                                  height: 'var(--spacing-4)',
                                }}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Generate newsletter issue</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(config.id)}
                              aria-label={`Edit ${config.name} configuration`}
                              style={{
                                minWidth: 'var(--spacing-11)',
                                minHeight: 'var(--spacing-11)',
                              }}
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
                            <p>Edit configuration</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onClone(config.id)}
                              aria-label={`Clone ${config.name} configuration`}
                              style={{
                                minWidth: 'var(--spacing-11)',
                                minHeight: 'var(--spacing-11)',
                              }}
                            >
                              <Copy
                                style={{
                                  width: 'var(--spacing-4)',
                                  height: 'var(--spacing-4)',
                                }}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Clone configuration</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(config.id)}
                              aria-label={`Delete ${config.name} configuration`}
                              style={{
                                color: 'var(--color-severity-high)',
                                minWidth: 'var(--spacing-11)',
                                minHeight: 'var(--spacing-11)',
                              }}
                            >
                              <Trash2
                                style={{
                                  width: 'var(--spacing-4)',
                                  height: 'var(--spacing-4)',
                                }}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete configuration</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-3">
          {configurations.map((config) => (
            <Card
              key={config.id}
              style={{
                borderColor: 'var(--color-border-default)',
              }}
            >
              <CardContent style={{ padding: 'var(--spacing-4)' }}>
                <div className="flex flex-col gap-3">
                  {/* Header: Name and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div
                        style={{
                          fontWeight: 'var(--typography-font-weight-medium)',
                          fontSize: 'var(--typography-font-size-base)',
                          color: 'var(--color-text-primary)',
                          marginBottom: 'var(--spacing-1)',
                        }}
                      >
                        {config.name}
                      </div>
                      {config.description && (
                        <div
                          style={{
                            fontSize: 'var(--typography-font-size-xs)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {config.description}
                        </div>
                      )}
                    </div>
                    <Badge variant={config.is_active ? 'success' : 'secondary'}>
                      {config.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span
                        style={{
                          fontSize: 'var(--typography-font-size-xs)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        Cadence:
                      </span>
                      <span
                        style={{
                          marginLeft: 'var(--spacing-1)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {formatCadence(config.cadence)}
                      </span>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: 'var(--typography-font-size-xs)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        Segment:
                      </span>
                      <span
                        style={{
                          marginLeft: 'var(--spacing-1)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {config.segment_id || 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span
                        style={{
                          fontSize: 'var(--typography-font-size-xs)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        Created:
                      </span>
                      <span
                        style={{
                          marginLeft: 'var(--spacing-1)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {formatDate(config.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div
                    className="flex gap-2 pt-2"
                    style={{
                      borderTop: `var(--border-width-thin) solid var(--color-border-default)`,
                    }}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onGenerate(config.id)}
                            aria-label={`Generate newsletter issue for ${config.name}`}
                            className="flex-1"
                          >
                            <Sparkles
                              style={{
                                width: 'var(--spacing-4)',
                                height: 'var(--spacing-4)',
                                marginRight: 'var(--spacing-2)',
                              }}
                            />
                            Generate
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Generate newsletter issue</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(config.id)}
                            aria-label={`Edit ${config.name} configuration`}
                            style={{
                              minWidth: 'var(--spacing-11)',
                              minHeight: 'var(--spacing-11)',
                            }}
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
                          <p>Edit configuration</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onClone(config.id)}
                            aria-label={`Clone ${config.name} configuration`}
                            style={{
                              minWidth: 'var(--spacing-11)',
                              minHeight: 'var(--spacing-11)',
                            }}
                          >
                            <Copy
                              style={{
                                width: 'var(--spacing-4)',
                                height: 'var(--spacing-4)',
                              }}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clone configuration</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(config.id)}
                            aria-label={`Delete ${config.name} configuration`}
                            style={{
                              color: 'var(--color-severity-high)',
                              minWidth: 'var(--spacing-11)',
                              minHeight: 'var(--spacing-11)',
                            }}
                          >
                            <Trash2
                              style={{
                                width: 'var(--spacing-4)',
                                height: 'var(--spacing-4)',
                              }}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete configuration</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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

ConfigurationList.displayName = 'ConfigurationList';

/**
 * ContentSourceList Component
 *
 * Displays a table/list of content sources with management actions.
 *
 * Features:
 * - Table view with name, type, URL, trust score, last polled, status, actions
 * - Status indicators (active, paused, error)
 * - Add button in header
 * - Edit/Delete actions per row
 * - Sync trigger button per row
 * - Empty state for no sources
 * - Loading state
 *
 * @example
 * ```tsx
 * <ContentSourceList
 *   onAdd={() => setShowForm(true)}
 *   onEdit={(id) => openEditForm(id)}
 * />
 * ```
 */

import { type ReactElement, useState } from 'react';
import { Edit, Trash2, RefreshCw, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useContentSources } from '@/hooks/useContentSources';
import {
  useDeleteContentSource,
  useSyncContent,
} from '@/hooks/useContentMutations';
import type { ContentSource, SourceType } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

export interface ContentSourceListProps {
  readonly onAdd: () => void;
  readonly onEdit: (id: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format source type for display
 */
function formatSourceType(type: SourceType): string {
  const typeMap: Record<SourceType, string> = {
    rss: 'RSS Feed',
    api: 'API',
    manual: 'Manual',
  };
  return typeMap[type];
}

/**
 * Format date for display
 */
function formatDate(dateString?: string): string {
  if (!dateString) {
    return 'Never';
  }

  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Get status badge variant based on source state
 */
function getStatusBadge(source: ContentSource): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive';
} {
  if (!source.is_active) {
    return { label: 'Paused', variant: 'warning' };
  }

  if (source.last_synced_at) {
    return { label: 'Active', variant: 'success' };
  }

  return { label: 'Idle', variant: 'default' };
}

// ============================================================================
// Component
// ============================================================================

export function ContentSourceList({
  onAdd,
  onEdit,
}: ContentSourceListProps): ReactElement {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useContentSources();
  const deleteMutation = useDeleteContentSource();
  const syncMutation = useSyncContent();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDelete = (id: string): void => {
    if (window.confirm('Are you sure you want to delete this content source?')) {
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

  const handleSync = (id: string): void => {
    setSyncingId(id);
    syncMutation.mutate(
      { sourceId: id },
      {
        onSuccess: () => {
          setSyncingId(null);
          void refetch();
        },
        onError: () => {
          setSyncingId(null);
        },
      }
    );
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
            <CardTitle>Content Sources</CardTitle>
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

  const sources = data?.data ?? [];

  // ============================================================================
  // Empty State
  // ============================================================================

  if (sources.length === 0) {
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
            <CardTitle>Content Sources</CardTitle>
            <Button onClick={onAdd} size="sm">
              <Plus style={{ width: '16px', height: '16px' }} />
              <span style={{ marginLeft: 'var(--spacing-2)' }}>Add Source</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No content sources"
            description="Add your first content source to start aggregating content for newsletters"
            action={{ label: "Add Content Source", onClick: onAdd }}
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
          <CardTitle>Content Sources</CardTitle>
          <Button onClick={onAdd} size="sm">
            <Plus style={{ width: '16px', height: '16px' }} />
            <span style={{ marginLeft: 'var(--spacing-2)' }}>Add Source</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          style={{
            overflowX: 'auto',
          }}
        >
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
                  Name
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
                  URL
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
                  Items Fetched
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
                  Last Synced
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => {
                const statusBadge = getStatusBadge(source);
                const isSyncing = syncingId === source.id;

                return (
                  <tr
                    key={source.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                        fontSize: 'var(--typography-font-size-base)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                      }}
                    >
                      {source.name}
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                        fontSize: 'var(--typography-font-size-sm)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {formatSourceType(source.source_type)}
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                        fontSize: 'var(--typography-font-size-sm)',
                        color: 'var(--color-text-secondary)',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {source.url || source.api_endpoint || '-'}
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                        fontSize: 'var(--typography-font-size-sm)',
                        color: 'var(--color-text-secondary)',
                        textAlign: 'right',
                      }}
                    >
                      {source.items_fetched.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                        fontSize: 'var(--typography-font-size-sm)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {formatDate(source.last_synced_at)}
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-4)',
                      }}
                    >
                      <Badge variant={statusBadge.variant}>
                        {statusBadge.label}
                      </Badge>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSync(source.id)}
                          disabled={isSyncing}
                          title="Sync content"
                        >
                          <RefreshCw
                            style={{
                              width: '16px',
                              height: '16px',
                              animation: isSyncing
                                ? 'spin 1s linear infinite'
                                : 'none',
                            }}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(source.id)}
                          title="Edit source"
                        >
                          <Edit style={{ width: '16px', height: '16px' }} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(source.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete source"
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
      </CardContent>
    </Card>
  );
}

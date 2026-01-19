/**
 * ContentSelector Component
 *
 * Wave 4.7.3: Content selection interface for newsletter assembly.
 * Displays searchable, filterable grid of content items with multi-select capability.
 * Shows trust score indicators and date badges for content discovery.
 */

import { useState, useCallback, useMemo } from 'react';
import { Search, Calendar, Tag, FileText, X, PlusCircle } from 'lucide-react';
import { useContentItems } from '@/hooks/useContentItems';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddToNewsletterSheet } from './AddToNewsletterSheet';
import type { ContentType, ContentItem } from '@/types/newsletter';

// ============================================================================
// Constants
// ============================================================================

const CONTENT_TYPES: readonly { value: ContentType; label: string }[] = [
  { value: 'blog', label: 'Blog Post' },
  { value: 'news', label: 'News Article' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'product_update', label: 'Product Update' },
  { value: 'event', label: 'Event' },
] as const;

const TRUST_SCORE_CONFIG = {
  HIGH: { threshold: 0.8, label: 'High Trust', color: 'success' },
  MEDIUM: { threshold: 0.5, label: 'Medium Trust', color: 'warning' },
  LOW: { threshold: 0, label: 'Low Trust', color: 'destructive' },
} as const;

const DEFAULT_PAGE_SIZE = 12;

// ============================================================================
// Types
// ============================================================================

interface ContentSelectorProps {
  readonly selectedIds: readonly string[];
  readonly onSelectionChange: (ids: readonly string[]) => void;
  readonly maxSelections?: number;
  readonly excludeIds?: readonly string[];
}

interface FilterState {
  readonly query: string;
  readonly contentType: ContentType | 'all';
  readonly topicTag: string;
  readonly frameworkTag: string;
  readonly dateFrom: string;
  readonly dateTo: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getTrustScoreBadge(relevanceScore?: number): {
  label: string;
  color: 'success' | 'warning' | 'destructive';
} {
  const score = relevanceScore ?? 0;

  if (score >= TRUST_SCORE_CONFIG.HIGH.threshold) {
    return {
      label: TRUST_SCORE_CONFIG.HIGH.label,
      color: TRUST_SCORE_CONFIG.HIGH.color,
    };
  }

  if (score >= TRUST_SCORE_CONFIG.MEDIUM.threshold) {
    return {
      label: TRUST_SCORE_CONFIG.MEDIUM.label,
      color: TRUST_SCORE_CONFIG.MEDIUM.color,
    };
  }

  return {
    label: TRUST_SCORE_CONFIG.LOW.label,
    color: TRUST_SCORE_CONFIG.LOW.color,
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// ============================================================================
// Component
// ============================================================================

export function ContentSelector({
  selectedIds,
  onSelectionChange,
  maxSelections,
  excludeIds = [],
}: ContentSelectorProps) {
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    contentType: 'all',
    topicTag: '',
    frameworkTag: '',
    dateFrom: '',
    dateTo: '',
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Build query params for API
  const queryParams = useMemo(() => {
    const params: {
      query?: string;
      contentType?: ContentType;
      topicTags?: readonly string[];
      frameworkTags?: readonly string[];
      dateFrom?: string;
      dateTo?: string;
      page: number;
      pageSize: number;
    } = {
      page: currentPage,
      pageSize: DEFAULT_PAGE_SIZE,
    };

    if (filters.query.trim()) {
      params.query = filters.query.trim();
    }

    if (filters.contentType !== 'all') {
      params.contentType = filters.contentType;
    }

    if (filters.topicTag.trim()) {
      params.topicTags = [filters.topicTag.trim()];
    }

    if (filters.frameworkTag.trim()) {
      params.frameworkTags = [filters.frameworkTag.trim()];
    }

    if (filters.dateFrom) {
      params.dateFrom = filters.dateFrom;
    }

    if (filters.dateTo) {
      params.dateTo = filters.dateTo;
    }

    return params;
  }, [filters, currentPage]);

  // Fetch content items
  const { data, isLoading, error } = useContentItems(queryParams);

  // Filter out excluded items
  const availableItems = useMemo(() => {
    if (!data?.data) {
      return [];
    }

    return data.data.filter((item) => !excludeIds.includes(item.id));
  }, [data, excludeIds]);

  // Handle selection toggle
  const handleToggleSelection = useCallback(
    (itemId: string): void => {
      const isCurrentlySelected = selectedIds.includes(itemId);

      if (isCurrentlySelected) {
        // Deselect
        onSelectionChange(selectedIds.filter((id) => id !== itemId));
        return;
      }

      // Check max selections
      if (maxSelections && selectedIds.length >= maxSelections) {
        return;
      }

      // Select
      onSelectionChange([...selectedIds, itemId]);
    },
    [selectedIds, onSelectionChange, maxSelections]
  );

  // Handle select all visible
  const handleSelectAllVisible = useCallback((): void => {
    const visibleIds = availableItems.map((item) => item.id);
    const newSelectedIds = new Set(selectedIds);

    for (const id of visibleIds) {
      if (maxSelections && newSelectedIds.size >= maxSelections) {
        break;
      }
      newSelectedIds.add(id);
    }

    onSelectionChange(Array.from(newSelectedIds));
  }, [availableItems, selectedIds, onSelectionChange, maxSelections]);

  // Handle clear all
  const handleClearAll = useCallback((): void => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: string): void => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1); // Reset to first page on filter change
    },
    []
  );

  // Handle clear filters
  const handleClearFilters = useCallback((): void => {
    setFilters({
      query: '',
      contentType: 'all',
      topicTag: '',
      frameworkTag: '',
      dateFrom: '',
      dateTo: '',
    });
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.query !== '' ||
      filters.contentType !== 'all' ||
      filters.topicTag !== '' ||
      filters.frameworkTag !== '' ||
      filters.dateFrom !== '' ||
      filters.dateTo !== ''
    );
  }, [filters]);

  // Render loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <EmptyState
        title="Failed to load content"
        description={error.message}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)',
      }}
    >
      {/* Filter Controls */}
      <Card>
        <CardContent
          style={{
            padding: 'var(--spacing-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-4)',
            }}
          >
            {/* Search and Type Filter Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-3)',
              }}
            >
              {/* Search Input */}
              <div style={{ position: 'relative' }}>
                <Search
                  style={{
                    position: 'absolute',
                    left: 'var(--spacing-3)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 'var(--spacing-4)',
                    height: 'var(--spacing-4)',
                    color: 'var(--color-text-secondary)',
                  }}
                />
                <Input
                  placeholder="Search content..."
                  value={filters.query}
                  onChange={(e) => handleFilterChange('query', e.target.value)}
                  style={{
                    paddingLeft: 'var(--spacing-10)',
                  }}
                />
              </div>

              {/* Content Type Filter */}
              <Select
                value={filters.contentType}
                onValueChange={(value) =>
                  handleFilterChange('contentType', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tag and Date Filters Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 'var(--spacing-3)',
              }}
            >
              {/* Topic Tag */}
              <Input
                placeholder="Topic tag..."
                value={filters.topicTag}
                onChange={(e) => handleFilterChange('topicTag', e.target.value)}
              />

              {/* Framework Tag */}
              <Input
                placeholder="Framework tag..."
                value={filters.frameworkTag}
                onChange={(e) =>
                  handleFilterChange('frameworkTag', e.target.value)
                }
              />

              {/* Date From */}
              <Input
                type="date"
                placeholder="From date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />

              {/* Date To */}
              <Input
                type="date"
                placeholder="To date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

            {/* Filter Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--spacing-3)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                  >
                    <X
                      style={{
                        width: 'var(--spacing-4)',
                        height: 'var(--spacing-4)',
                        marginRight: 'var(--spacing-2)',
                      }}
                    />
                    Clear Filters
                  </Button>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-3)',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {selectedIds.length} selected
                  {maxSelections ? ` / ${maxSelections} max` : ''}
                </span>

                {selectedIds.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleClearAll}>
                      Clear Selection
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowAddSheet(true)}
                    >
                      <PlusCircle
                        style={{
                          width: 'var(--spacing-4)',
                          height: 'var(--spacing-4)',
                          marginRight: 'var(--spacing-2)',
                        }}
                      />
                      Add ({selectedIds.length}) to Newsletter
                    </Button>
                  </>
                )}

                {availableItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllVisible}
                    disabled={
                      maxSelections ? selectedIds.length >= maxSelections : false
                    }
                  >
                    Select All Visible
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      {availableItems.length === 0 ? (
        <EmptyState
          title="No content found"
          description="Try adjusting your filters or search query"
        />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 'var(--spacing-4)',
            }}
          >
            {availableItems.map((item) => (
              <ContentItemCard
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onToggleSelection={handleToggleSelection}
                isDisabled={
                  maxSelections
                    ? selectedIds.length >= maxSelections &&
                      !selectedIds.includes(item.id)
                    : false
                }
              />
            ))}
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.total_pages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'var(--spacing-2)',
                marginTop: 'var(--spacing-4)',
              }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 var(--spacing-3)',
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Page {currentPage} of {data.pagination.total_pages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(data.pagination.total_pages, p + 1)
                  )
                }
                disabled={currentPage === data.pagination.total_pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Add to Newsletter Sheet */}
      <AddToNewsletterSheet
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        selectedContentIds={selectedIds as string[]}
        onSuccess={() => {
          onSelectionChange([]);
        }}
      />
    </div>
  );
}

// ============================================================================
// Sub-Component: Content Item Card
// ============================================================================

interface ContentItemCardProps {
  readonly item: ContentItem;
  readonly isSelected: boolean;
  readonly onToggleSelection: (id: string) => void;
  readonly isDisabled: boolean;
}

function ContentItemCard({
  item,
  isSelected,
  onToggleSelection,
  isDisabled,
}: ContentItemCardProps) {
  const trustBadge = getTrustScoreBadge(item.relevance_score);

  return (
    <Card
      style={{
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        borderColor: isSelected
          ? 'var(--color-brand-primary)'
          : 'var(--color-border-default)',
        borderWidth: isSelected
          ? 'var(--border-width-thick)'
          : 'var(--border-width-thin)',
        transitionDuration: 'var(--motion-duration-fast)',
        transitionTimingFunction: 'var(--motion-easing-default)',
      }}
      onClick={() => {
        if (!isDisabled) {
          onToggleSelection(item.id);
        }
      }}
    >
      <CardContent
        style={{
          padding: 'var(--spacing-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-3)',
          height: '100%',
        }}
      >
        {/* Header with checkbox and badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--spacing-3)',
          }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => {
              if (!isDisabled) {
                onToggleSelection(item.id);
              }
            }}
            disabled={isDisabled}
            onClick={(e) => e.stopPropagation()}
          />

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--spacing-2)',
              }}
            >
              <Badge variant={trustBadge.color}>{trustBadge.label}</Badge>
              <Badge variant="outline">
                <Calendar
                  style={{
                    width: 'var(--spacing-3)',
                    height: 'var(--spacing-3)',
                    marginRight: 'var(--spacing-1)',
                  }}
                />
                {formatDate(item.published_at)}
              </Badge>
              {item.is_evergreen && (
                <Badge variant="success">Evergreen</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-2)',
            flex: 1,
          }}
        >
          <h3
            style={{
              fontSize: 'var(--typography-font-size-base)',
              fontWeight: 'var(--typography-font-weight-semibold)',
              color: 'var(--color-text-primary)',
              lineHeight: 'var(--typography-line-height-tight)',
              margin: 0,
            }}
          >
            {item.title}
          </h3>

          <p
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--typography-line-height-normal)',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.summary}
          </p>
        </div>

        {/* Tags */}
        {((item.topic_tags || []).length > 0 || (item.framework_tags || []).length > 0) && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--spacing-2)',
            }}
          >
            {(item.topic_tags || []).slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary">
                <Tag
                  style={{
                    width: 'var(--spacing-3)',
                    height: 'var(--spacing-3)',
                    marginRight: 'var(--spacing-1)',
                  }}
                />
                {tag}
              </Badge>
            ))}
            {(item.framework_tags || []).slice(0, 2).map((tag) => (
              <Badge key={tag} variant="info">
                <FileText
                  style={{
                    width: 'var(--spacing-3)',
                    height: 'var(--spacing-3)',
                    marginRight: 'var(--spacing-1)',
                  }}
                />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Metadata Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 'var(--typography-font-size-xs)',
            color: 'var(--color-text-secondary)',
            paddingTop: 'var(--spacing-2)',
            borderTop: 'var(--border-width-thin) solid var(--color-border-subtle)',
          }}
        >
          <span>{item.content_type}</span>
          {item.author && <span>by {item.author}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

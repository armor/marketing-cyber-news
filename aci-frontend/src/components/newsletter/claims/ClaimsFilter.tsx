/**
 * ClaimsFilter Component
 *
 * Filter panel for filtering claims by type, category, status, and search.
 *
 * Features:
 * - Claim type filter (all, claim, disclaimer, do_not_say)
 * - Category filter (from available categories)
 * - Approval status filter (all, pending, approved, rejected, expired)
 * - Text search
 * - Include expired toggle
 * - Clear filters button
 *
 * @example
 * ```tsx
 * <ClaimsFilter
 *   filter={currentFilter}
 *   onChange={(newFilter) => setFilter(newFilter)}
 * />
 * ```
 */

import { type ReactElement } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClaimCategories } from '@/hooks/useClaimCategories';
import type { ClaimFilter, ClaimType, ClaimApprovalStatus } from '@/types/claims';

// ============================================================================
// Types
// ============================================================================

export interface ClaimsFilterProps {
  readonly filter: ClaimFilter;
  readonly onChange: (filter: ClaimFilter) => void;
}

// ============================================================================
// Constants
// ============================================================================

const CLAIM_TYPE_OPTIONS: { value: ClaimType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'claim', label: 'Marketing Claims' },
  { value: 'disclaimer', label: 'Disclaimers' },
  { value: 'do_not_say', label: 'Do Not Say' },
];

const STATUS_OPTIONS: { value: ClaimApprovalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

// ============================================================================
// Component
// ============================================================================

export function ClaimsFilter({
  filter,
  onChange,
}: ClaimsFilterProps): ReactElement {
  const { data: categories } = useClaimCategories();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleTypeChange = (value: string): void => {
    onChange({
      ...filter,
      claim_type: value === 'all' ? undefined : (value as ClaimType),
    });
  };

  const handleCategoryChange = (value: string): void => {
    onChange({
      ...filter,
      category: value === 'all' ? undefined : value,
    });
  };

  const handleStatusChange = (value: string): void => {
    onChange({
      ...filter,
      approval_status: value === 'all' ? undefined : (value as ClaimApprovalStatus),
    });
  };

  const handleSearchChange = (value: string): void => {
    onChange({
      ...filter,
      search: value || undefined,
    });
  };

  const handleIncludeExpiredChange = (): void => {
    onChange({
      ...filter,
      include_expired: !filter.include_expired,
    });
  };

  const handleClearFilters = (): void => {
    onChange({});
  };

  // Check if any filters are active
  const hasActiveFilters =
    filter.claim_type ||
    filter.category ||
    filter.approval_status ||
    filter.search ||
    filter.include_expired;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)',
        padding: 'var(--spacing-4)',
        backgroundColor: 'var(--color-bg-subtle)',
        borderRadius: 'var(--border-radius-md)',
        marginBottom: 'var(--spacing-4)',
      }}
    >
      {/* Top Row - Search and Clear */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-3)',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
          }}
        >
          <Search
            style={{
              position: 'absolute',
              left: 'var(--spacing-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              color: 'var(--color-text-tertiary)',
            }}
          />
          <Input
            placeholder="Search claims..."
            value={filter.search ?? ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              paddingLeft: 'var(--spacing-10)',
            }}
          />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X style={{ width: '16px', height: '16px' }} />
            <span style={{ marginLeft: 'var(--spacing-1)' }}>Clear</span>
          </Button>
        )}
      </div>

      {/* Filter Row */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-3)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Type Filter */}
        <Select
          value={filter.claim_type ?? 'all'}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger style={{ width: '180px' }}>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {CLAIM_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={filter.category ?? 'all'}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger style={{ width: '180px' }}>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filter.approval_status ?? 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger style={{ width: '180px' }}>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Include Expired Toggle */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            cursor: 'pointer',
            fontSize: 'var(--typography-font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <input
            type="checkbox"
            checked={filter.include_expired ?? false}
            onChange={handleIncludeExpiredChange}
            style={{
              width: '16px',
              height: '16px',
              cursor: 'pointer',
            }}
          />
          Include expired
        </label>
      </div>
    </div>
  );
}

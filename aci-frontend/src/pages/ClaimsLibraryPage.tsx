/**
 * ClaimsLibraryPage
 *
 * Main page for managing the claims library - marketing claims, disclaimers,
 * and do-not-say items for compliance review.
 *
 * Features:
 * - Tab navigation between All Claims, Pending Review, Do Not Say
 * - Filter panel with type, category, status, and search
 * - Claims list with CRUD operations
 * - Modal form for add/edit operations
 * - Compliance users can approve/reject pending claims
 *
 * @example
 * ```tsx
 * <Route path="/newsletter/claims" element={<ClaimsLibraryPage />} />
 * ```
 */

import { type ReactElement, useState } from 'react';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ClaimsList, ClaimForm, ClaimsFilter } from '@/components/newsletter/claims';
import { useAuth } from '@/hooks/useAuth';
import type { ClaimFilter } from '@/types/claims';

// ============================================================================
// Types
// ============================================================================

type TabId = 'all' | 'pending' | 'do_not_say';

// ============================================================================
// Constants
// ============================================================================

// Roles that can approve/reject claims
const COMPLIANCE_ROLES = ['compliance_sme', 'admin', 'super_admin'];

// ============================================================================
// Component
// ============================================================================

export function ClaimsLibraryPage(): ReactElement {
  const [showForm, setShowForm] = useState(false);
  const [editingClaimId, setEditingClaimId] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<ClaimFilter>({});

  const { user } = useAuth();

  // Check if user can approve/reject claims
  const canApprove = user?.role ? COMPLIANCE_ROLES.includes(user.role) : false;

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleAddClaim = (): void => {
    setEditingClaimId(undefined);
    setShowForm(true);
  };

  const handleEditClaim = (id: string): void => {
    setEditingClaimId(id);
    setShowForm(true);
  };

  const handleSaveClaim = (): void => {
    setShowForm(false);
    setEditingClaimId(undefined);
  };

  const handleCancelForm = (): void => {
    setShowForm(false);
    setEditingClaimId(undefined);
  };

  const handleFilterChange = (newFilter: ClaimFilter): void => {
    setFilter(newFilter);
  };

  const handleTabChange = (): void => {
    // Reset filter when switching tabs
    setFilter({});
  };

  // ============================================================================
  // Tab-specific Filters
  // ============================================================================

  const getTabFilter = (tabId: TabId): ClaimFilter => {
    const baseFilter = { ...filter };

    switch (tabId) {
      case 'pending':
        return { ...baseFilter, approval_status: 'pending' };
      case 'do_not_say':
        return { ...baseFilter, claim_type: 'do_not_say' };
      default:
        return baseFilter;
    }
  };

  // ============================================================================
  // Tabs Configuration
  // ============================================================================

  const tabs: readonly TabItem[] = [
    {
      id: 'all',
      label: 'All Claims',
      content: (
        <div>
          <ClaimsFilter filter={filter} onChange={handleFilterChange} />
          <ClaimsList
            filter={getTabFilter('all')}
            onAdd={handleAddClaim}
            onEdit={handleEditClaim}
            canApprove={canApprove}
            title="All Claims"
          />
        </div>
      ),
    },
    {
      id: 'pending',
      label: 'Pending Review',
      content: (
        <div>
          <ClaimsFilter
            filter={{ ...filter, approval_status: 'pending' }}
            onChange={(newFilter) => handleFilterChange({ ...newFilter, approval_status: 'pending' })}
          />
          <ClaimsList
            filter={getTabFilter('pending')}
            onAdd={handleAddClaim}
            onEdit={handleEditClaim}
            canApprove={canApprove}
            title="Pending Review"
          />
        </div>
      ),
    },
    {
      id: 'do_not_say',
      label: 'Do Not Say',
      content: (
        <div>
          <ClaimsFilter
            filter={{ ...filter, claim_type: 'do_not_say' }}
            onChange={(newFilter) => handleFilterChange({ ...newFilter, claim_type: 'do_not_say' })}
          />
          <ClaimsList
            filter={getTabFilter('do_not_say')}
            onAdd={handleAddClaim}
            onEdit={handleEditClaim}
            canApprove={canApprove}
            title="Do Not Say Items"
          />
        </div>
      ),
    },
  ];

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      style={{
        padding: 'var(--spacing-6)',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      {/* Page Header */}
      <div
        style={{
          marginBottom: 'var(--spacing-6)',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--typography-font-size-3xl)',
            fontWeight: 'var(--typography-font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          Claims Library
        </h1>
        <p
          style={{
            fontSize: 'var(--typography-font-size-base)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Manage marketing claims, disclaimers, and compliance-approved content
        </p>
      </div>

      {/* Tab Navigation */}
      <Tabs tabs={tabs} defaultTab="all" onChange={handleTabChange} />

      {/* Form Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent
          side="right"
          style={{
            maxWidth: '600px',
            padding: '0',
          }}
        >
          <ClaimForm
            claimId={editingClaimId}
            onSave={handleSaveClaim}
            onCancel={handleCancelForm}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

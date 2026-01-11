/**
 * ClaimForm Component
 *
 * Form for creating and editing claims library entries.
 *
 * Features:
 * - Claim text textarea
 * - Type select (claim, disclaimer, do_not_say)
 * - Category select/input
 * - Tags input
 * - Source reference input
 * - Expiration date picker
 * - Notes textarea
 * - Validation
 * - Loading states
 *
 * @example
 * ```tsx
 * <ClaimForm
 *   claimId={selectedId}
 *   onSave={() => closeModal()}
 *   onCancel={() => closeModal()}
 * />
 * ```
 */

import { type ReactElement, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { VoiceTransformButton } from '@/components/marketing/voice';
import { useClaim } from '@/hooks/useClaim';
import { useClaimCategories } from '@/hooks/useClaimCategories';
import { useCreateClaim, useUpdateClaim } from '@/hooks/useClaimMutations';
import type {
  Claim,
  ClaimType,
  CreateClaimRequest,
  UpdateClaimRequest,
} from '@/types/claims';

// ============================================================================
// Types
// ============================================================================

export interface ClaimFormProps {
  readonly claimId?: string;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

interface ClaimFormContentProps {
  readonly existingClaim?: Claim;
  readonly categories?: string[];
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

interface FormState {
  claim_text: string;
  claim_type: ClaimType;
  category: string;
  source_reference: string;
  tags: string;
  notes: string;
  expires_at: string;
}

interface FormErrors {
  claim_text?: string;
  claim_type?: string;
  category?: string;
}

const CLAIM_TYPES: { value: ClaimType; label: string }[] = [
  { value: 'claim', label: 'Marketing Claim' },
  { value: 'disclaimer', label: 'Disclaimer' },
  { value: 'do_not_say', label: 'Do Not Say' },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create initial form state from an existing claim or return defaults.
 * This is called once when ClaimFormContent mounts (via key prop reset).
 */
function createInitialState(existingClaim?: Claim): FormState {
  if (!existingClaim) {
    return {
      claim_text: '',
      claim_type: 'claim',
      category: '',
      source_reference: '',
      tags: '',
      notes: '',
      expires_at: '',
    };
  }

  return {
    claim_text: existingClaim.claim_text,
    claim_type: existingClaim.claim_type,
    category: existingClaim.category,
    source_reference: existingClaim.source_reference ?? '',
    tags: existingClaim.tags.join(', '),
    notes: existingClaim.notes ?? '',
    expires_at: existingClaim.expires_at
      ? new Date(existingClaim.expires_at).toISOString().split('T')[0]
      : '',
  };
}

// ============================================================================
// Inner Form Component (receives data as props, no effects needed)
// ============================================================================

function ClaimFormContent({
  existingClaim,
  categories,
  onSave,
  onCancel,
}: ClaimFormContentProps): ReactElement {
  // Initialize state from props - no effect needed since key prop triggers remount
  const [formState, setFormState] = useState<FormState>(() =>
    createInitialState(existingClaim)
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [showNewCategory, setShowNewCategory] = useState(false);

  const isEditing = Boolean(existingClaim);

  // Mutations
  const createMutation = useCreateClaim();
  const updateMutation = useUpdateClaim();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleChange = (field: keyof FormState, value: string): void => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formState.claim_text.trim()) {
      newErrors.claim_text = 'Claim text is required';
    }

    if (!formState.claim_type) {
      newErrors.claim_type = 'Claim type is required';
    }

    if (!formState.category.trim()) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) {
      return;
    }

    const tags = formState.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (isEditing && existingClaim) {
      const request: UpdateClaimRequest = {
        claim_text: formState.claim_text.trim(),
        claim_type: formState.claim_type,
        category: formState.category.trim(),
        source_reference: formState.source_reference.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        notes: formState.notes.trim() || undefined,
        expires_at: formState.expires_at || undefined,
      };

      updateMutation.mutate(
        { id: existingClaim.id, request },
        {
          onSuccess: () => {
            onSave();
          },
        }
      );
    } else {
      const request: CreateClaimRequest = {
        claim_text: formState.claim_text.trim(),
        claim_type: formState.claim_type,
        category: formState.category.trim(),
        source_reference: formState.source_reference.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        notes: formState.notes.trim() || undefined,
        expires_at: formState.expires_at || undefined,
      };

      createMutation.mutate(
        { request },
        {
          onSuccess: () => {
            onSave();
          },
        }
      );
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      style={{
        padding: 'var(--spacing-6)',
      }}
    >
      <h2
        style={{
          fontSize: 'var(--typography-font-size-xl)',
          fontWeight: 'var(--typography-font-weight-semibold)',
          marginBottom: 'var(--spacing-6)',
        }}
      >
        {isEditing ? 'Edit Claim' : 'Add New Claim'}
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-4)',
        }}
      >
        {/* Claim Text */}
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-1)' }}>
            <Label htmlFor="claim_text">
              Claim Text <span style={{ color: 'var(--color-error)' }}>*</span>
            </Label>
            <VoiceTransformButton
              text={formState.claim_text}
              onApply={(text) => handleChange('claim_text', text)}
              fieldPath="claim_text"
              entityType="claim"
              entityId={existingClaim?.id}
              disabled={isSubmitting}
            />
          </div>
          <Textarea
            id="claim_text"
            value={formState.claim_text}
            onChange={(e) => handleChange('claim_text', e.target.value)}
            placeholder="Enter the claim, disclaimer, or do-not-say text..."
            rows={4}
            style={{
              borderColor: errors.claim_text ? 'var(--color-error)' : undefined,
            }}
          />
          {errors.claim_text && (
            <span
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-error)',
              }}
            >
              {errors.claim_text}
            </span>
          )}
        </div>

        {/* Type and Category Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--spacing-4)',
          }}
        >
          {/* Claim Type */}
          <div>
            <Label htmlFor="claim_type">
              Type <span style={{ color: 'var(--color-error)' }}>*</span>
            </Label>
            <Select
              value={formState.claim_type}
              onValueChange={(value) => handleChange('claim_type', value as ClaimType)}
            >
              <SelectTrigger
                id="claim_type"
                style={{
                  marginTop: 'var(--spacing-1)',
                  borderColor: errors.claim_type ? 'var(--color-error)' : undefined,
                }}
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CLAIM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.claim_type && (
              <span
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-error)',
                }}
              >
                {errors.claim_type}
              </span>
            )}
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">
              Category <span style={{ color: 'var(--color-error)' }}>*</span>
            </Label>
            {showNewCategory || !categories || categories.length === 0 ? (
              <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-1)' }}>
                <Input
                  id="category"
                  value={formState.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="Enter category name"
                  style={{
                    borderColor: errors.category ? 'var(--color-error)' : undefined,
                  }}
                />
                {categories && categories.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewCategory(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-1)' }}>
                <Select
                  value={formState.category}
                  onValueChange={(value) => handleChange('category', value)}
                >
                  <SelectTrigger
                    id="category"
                    style={{
                      flex: 1,
                      borderColor: errors.category ? 'var(--color-error)' : undefined,
                    }}
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCategory(true)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  New
                </Button>
              </div>
            )}
            {errors.category && (
              <span
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-error)',
                }}
              >
                {errors.category}
              </span>
            )}
          </div>
        </div>

        {/* Source Reference */}
        <div>
          <Label htmlFor="source_reference">Source Reference</Label>
          <Input
            id="source_reference"
            value={formState.source_reference}
            onChange={(e) => handleChange('source_reference', e.target.value)}
            placeholder="URL or document reference for this claim"
            style={{ marginTop: 'var(--spacing-1)' }}
          />
        </div>

        {/* Tags */}
        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={formState.tags}
            onChange={(e) => handleChange('tags', e.target.value)}
            placeholder="Enter tags separated by commas"
            style={{ marginTop: 'var(--spacing-1)' }}
          />
          <span
            style={{
              fontSize: 'var(--typography-font-size-xs)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            Separate multiple tags with commas
          </span>
        </div>

        {/* Expiration Date */}
        <div>
          <Label htmlFor="expires_at">Expiration Date</Label>
          <Input
            id="expires_at"
            type="date"
            value={formState.expires_at}
            onChange={(e) => handleChange('expires_at', e.target.value)}
            style={{ marginTop: 'var(--spacing-1)' }}
          />
          <span
            style={{
              fontSize: 'var(--typography-font-size-xs)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            Leave empty for no expiration
          </span>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formState.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Internal notes about this claim..."
            rows={2}
            style={{ marginTop: 'var(--spacing-1)' }}
          />
        </div>

        {/* Form Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--spacing-3)',
            marginTop: 'var(--spacing-4)',
            paddingTop: 'var(--spacing-4)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span style={{ marginLeft: 'var(--spacing-2)' }}>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </span>
              </>
            ) : isEditing ? (
              'Update Claim'
            ) : (
              'Create Claim'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component (handles data fetching and loading states)
// ============================================================================

export function ClaimForm({
  claimId,
  onSave,
  onCancel,
}: ClaimFormProps): ReactElement {
  const isEditing = Boolean(claimId);

  // Fetch existing claim data if editing
  const { data: existingClaim, isLoading: isLoadingClaim } = useClaim({
    id: claimId ?? '',
    enabled: isEditing,
  });

  // Fetch categories for dropdown
  const { data: categories } = useClaimCategories();

  // Show loading state while fetching claim data
  if (isEditing && isLoadingClaim) {
    return (
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
    );
  }

  // Key prop resets ClaimFormContent state when switching between claims
  // This is the React-recommended pattern for resetting state on prop change
  return (
    <ClaimFormContent
      key={existingClaim?.id ?? 'new'}
      existingClaim={existingClaim}
      categories={categories}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}

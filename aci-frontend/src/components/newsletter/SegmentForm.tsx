/**
 * SegmentForm Component
 *
 * Form for creating/editing audience segments.
 *
 * Features:
 * - All fields from CreateSegmentRequest/UpdateSegmentRequest
 * - Dialog modal display
 * - Multi-select for arrays (industries, regions, etc.)
 * - Checkbox toggles for boolean fields
 * - Form validation with feedback
 * - Submit and cancel buttons
 * - Design token styling
 *
 * @example
 * ```tsx
 * <SegmentForm
 *   open={isOpen}
 *   mode="create"
 *   onClose={() => setIsOpen(false)}
 *   onSubmit={(data) => console.log('Submit', data)}
 * />
 * ```
 */

import { type ReactElement, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  Segment,
  CreateSegmentRequest,
  UpdateSegmentRequest,
} from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

export interface SegmentFormProps {
  readonly open: boolean;
  readonly mode: 'create' | 'edit';
  readonly initialData?: Segment;
  readonly onClose: () => void;
  readonly onSubmit: (
    data: CreateSegmentRequest | UpdateSegmentRequest
  ) => void | Promise<void>;
  readonly isSubmitting?: boolean;
}

interface FormData {
  name: string;
  description: string;
  role_cluster: string;
  industries: string;
  regions: string;
  company_size_bands: string;
  compliance_frameworks: string;
  partner_tags: string;
  min_engagement_score: string;
  topic_interests: string;
  max_newsletters_per_30_days: string;
  exclude_unsubscribed: boolean;
  exclude_bounced: boolean;
  exclude_high_touch: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitialFormData(
  mode: 'create' | 'edit',
  initialData?: Segment
): FormData {
  if (mode === 'edit' && initialData) {
    return {
      name: initialData.name,
      description: initialData.description || '',
      role_cluster: initialData.role_cluster || '',
      industries: (initialData.industries ?? []).join(', '),
      regions: (initialData.regions ?? []).join(', '),
      company_size_bands: (initialData.company_size_bands ?? []).join(', '),
      compliance_frameworks: (initialData.compliance_frameworks ?? []).join(', '),
      partner_tags: (initialData.partner_tags ?? []).join(', '),
      min_engagement_score: String(initialData.min_engagement_score ?? 0),
      topic_interests: (initialData.topic_interests ?? []).join(', '),
      max_newsletters_per_30_days: String(
        initialData.max_newsletters_per_30_days ?? 4
      ),
      exclude_unsubscribed: initialData.exclude_unsubscribed ?? true,
      exclude_bounced: initialData.exclude_bounced ?? true,
      exclude_high_touch: initialData.exclude_high_touch ?? false,
    };
  }

  return {
    name: '',
    description: '',
    role_cluster: '',
    industries: '',
    regions: '',
    company_size_bands: '',
    compliance_frameworks: '',
    partner_tags: '',
    min_engagement_score: '0',
    topic_interests: '',
    max_newsletters_per_30_days: '4',
    exclude_unsubscribed: true,
    exclude_bounced: true,
    exclude_high_touch: false,
  };
}

/**
 * Parse comma-separated string into array, trimming whitespace
 */
function parseList(value: string): readonly string[] {
  if (!value.trim()) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

// ============================================================================
// Component
// ============================================================================

export function SegmentForm({
  open,
  mode,
  initialData,
  onClose,
  onSubmit,
  isSubmitting = false,
}: SegmentFormProps): ReactElement {
  const [formData, setFormData] = useState<FormData>(() =>
    getInitialFormData(mode, initialData)
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );

  // Reset form when dialog opens/closes or mode changes
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: Initialize form state when dialog opens
      setFormData(getInitialFormData(mode, initialData));
      setErrors({});
    }
  }, [open, mode, initialData]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleChange = (field: keyof FormData, value: string | boolean): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Segment name is required';
    }

    const minScore = parseFloat(formData.min_engagement_score);
    if (isNaN(minScore) || minScore < 0 || minScore > 100) {
      newErrors.min_engagement_score =
        'Engagement score must be between 0 and 100';
    }

    const maxNewsletters = parseInt(formData.max_newsletters_per_30_days, 10);
    if (isNaN(maxNewsletters) || maxNewsletters < 1) {
      newErrors.max_newsletters_per_30_days =
        'Max newsletters must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const data: CreateSegmentRequest | UpdateSegmentRequest = {
      name: formData.name,
      description: formData.description || undefined,
      role_cluster: formData.role_cluster || undefined,
      industries: parseList(formData.industries),
      regions: parseList(formData.regions),
      company_size_bands: parseList(formData.company_size_bands),
      compliance_frameworks: parseList(formData.compliance_frameworks),
      partner_tags: parseList(formData.partner_tags),
      min_engagement_score: parseFloat(formData.min_engagement_score),
      topic_interests: parseList(formData.topic_interests),
      max_newsletters_per_30_days: parseInt(
        formData.max_newsletters_per_30_days,
        10
      ),
      // New segments are active by default so they appear in dropdowns immediately
      is_active: mode === 'create' ? true : undefined,
    };

    await onSubmit(data);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          padding: 'var(--spacing-6)',
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Audience Segment' : 'Edit Audience Segment'}
          </DialogTitle>
          <DialogDescription>
            Define targeting criteria to segment your audience for personalized
            newsletter delivery.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-4)',
            }}
          >
            {/* Basic Information */}
            <div>
              <label
                htmlFor="name"
                style={{
                  display: 'block',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-2)',
                }}
              >
                Segment Name *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Healthcare CISOs - North America"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                aria-required="true"
              />
              {errors.name && (
                <p
                  id="name-error"
                  role="alert"
                  style={{
                    fontSize: 'var(--typography-font-size-xs)',
                    color: 'var(--color-severity-high)',
                    marginTop: 'var(--spacing-1)',
                  }}
                >
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                style={{
                  display: 'block',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-2)',
                }}
              >
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional description of this segment"
                rows={3}
              />
            </div>

            <div>
              <label
                htmlFor="role_cluster"
                style={{
                  display: 'block',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-2)',
                }}
              >
                Role Cluster
              </label>
              <Input
                id="role_cluster"
                value={formData.role_cluster}
                onChange={(e) => handleChange('role_cluster', e.target.value)}
                placeholder="e.g., CISO, Security Architect, SOC Manager"
              />
            </div>

            {/* Targeting Criteria */}
            <div
              style={{
                borderTop: `var(--border-width-thin) solid var(--color-border-default)`,
                paddingTop: 'var(--spacing-4)',
              }}
            >
              <h3
                style={{
                  fontSize: 'var(--typography-font-size-base)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-4)',
                }}
              >
                Targeting Criteria
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-4)',
                }}
              >
                <div>
                  <label
                    htmlFor="industries"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Industries
                  </label>
                  <Input
                    id="industries"
                    value={formData.industries}
                    onChange={(e) => handleChange('industries', e.target.value)}
                    placeholder="e.g., Healthcare, Finance, Technology"
                    aria-describedby="industries-description"
                  />
                  <p
                    id="industries-description"
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    Comma-separated list
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="regions"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Regions
                  </label>
                  <Input
                    id="regions"
                    value={formData.regions}
                    onChange={(e) => handleChange('regions', e.target.value)}
                    placeholder="e.g., North America, EMEA, APAC"
                  />
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    Comma-separated list
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="company_size_bands"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Company Size Bands
                  </label>
                  <Input
                    id="company_size_bands"
                    value={formData.company_size_bands}
                    onChange={(e) =>
                      handleChange('company_size_bands', e.target.value)
                    }
                    placeholder="e.g., 1-50, 51-500, 501-5000, 5000+"
                  />
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    Comma-separated list
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="compliance_frameworks"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Compliance Frameworks
                  </label>
                  <Input
                    id="compliance_frameworks"
                    value={formData.compliance_frameworks}
                    onChange={(e) =>
                      handleChange('compliance_frameworks', e.target.value)
                    }
                    placeholder="e.g., NIST, ISO 27001, HIPAA, SOC 2"
                  />
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    Comma-separated list
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="topic_interests"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Topic Interests
                  </label>
                  <Input
                    id="topic_interests"
                    value={formData.topic_interests}
                    onChange={(e) =>
                      handleChange('topic_interests', e.target.value)
                    }
                    placeholder="e.g., Zero Trust, Cloud Security, Ransomware"
                  />
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    Comma-separated list
                  </p>
                </div>
              </div>
            </div>

            {/* Engagement Settings */}
            <div
              style={{
                borderTop: `var(--border-width-thin) solid var(--color-border-default)`,
                paddingTop: 'var(--spacing-4)',
              }}
            >
              <h3
                style={{
                  fontSize: 'var(--typography-font-size-base)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-4)',
                }}
              >
                Engagement Settings
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--spacing-4)',
                }}
              >
                <div>
                  <label
                    htmlFor="min_engagement_score"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Minimum Engagement Score
                  </label>
                  <Input
                    id="min_engagement_score"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.min_engagement_score}
                    onChange={(e) =>
                      handleChange('min_engagement_score', e.target.value)
                    }
                    aria-invalid={!!errors.min_engagement_score}
                    aria-describedby={errors.min_engagement_score ? 'min-engagement-error' : undefined}
                  />
                  {errors.min_engagement_score && (
                    <p
                      id="min-engagement-error"
                      role="alert"
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-severity-high)',
                        marginTop: 'var(--spacing-1)',
                      }}
                    >
                      {errors.min_engagement_score}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="max_newsletters_per_30_days"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Max Newsletters / 30 Days
                  </label>
                  <Input
                    id="max_newsletters_per_30_days"
                    type="number"
                    min="1"
                    value={formData.max_newsletters_per_30_days}
                    onChange={(e) =>
                      handleChange('max_newsletters_per_30_days', e.target.value)
                    }
                    aria-invalid={!!errors.max_newsletters_per_30_days}
                    aria-describedby={errors.max_newsletters_per_30_days ? 'max-newsletters-error' : undefined}
                  />
                  {errors.max_newsletters_per_30_days && (
                    <p
                      id="max-newsletters-error"
                      role="alert"
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-severity-high)',
                        marginTop: 'var(--spacing-1)',
                      }}
                    >
                      {errors.max_newsletters_per_30_days}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Exclusion Rules */}
            <div
              style={{
                borderTop: `var(--border-width-thin) solid var(--color-border-default)`,
                paddingTop: 'var(--spacing-4)',
              }}
            >
              <h3
                style={{
                  fontSize: 'var(--typography-font-size-base)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-4)',
                }}
              >
                Exclusion Rules
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-3)',
                }}
              >
                <div className="flex items-center">
                  <Checkbox
                    id="exclude_unsubscribed"
                    checked={formData.exclude_unsubscribed}
                    onCheckedChange={(checked) =>
                      handleChange('exclude_unsubscribed', checked === true)
                    }
                  />
                  <label
                    htmlFor="exclude_unsubscribed"
                    style={{
                      marginLeft: 'var(--spacing-2)',
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Exclude unsubscribed contacts
                  </label>
                </div>

                <div className="flex items-center">
                  <Checkbox
                    id="exclude_bounced"
                    checked={formData.exclude_bounced}
                    onCheckedChange={(checked) =>
                      handleChange('exclude_bounced', checked === true)
                    }
                  />
                  <label
                    htmlFor="exclude_bounced"
                    style={{
                      marginLeft: 'var(--spacing-2)',
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Exclude bounced contacts
                  </label>
                </div>

                <div className="flex items-center">
                  <Checkbox
                    id="exclude_high_touch"
                    checked={formData.exclude_high_touch}
                    onCheckedChange={(checked) =>
                      handleChange('exclude_high_touch', checked === true)
                    }
                  />
                  <label
                    htmlFor="exclude_high_touch"
                    style={{
                      marginLeft: 'var(--spacing-2)',
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Exclude high-touch contacts (managed by sales)
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter
            style={{
              marginTop: 'var(--spacing-6)',
            }}
          >
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create Segment'
                  : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

SegmentForm.displayName = 'SegmentForm';

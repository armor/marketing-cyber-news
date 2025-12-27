/**
 * ConfigurationForm Component
 *
 * Form for creating/editing newsletter configurations.
 *
 * Features:
 * - All fields from CreateConfigurationRequest/UpdateConfigurationRequest
 * - Dialog modal display
 * - Form validation with feedback
 * - Submit and cancel buttons
 * - Design token styling
 * - Side-by-side segment creation panel
 *
 * @example
 * ```tsx
 * <ConfigurationForm
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSegments } from '@/hooks/useSegments';
import { useCreateSegment } from '@/hooks/useSegmentMutations';
import { SegmentForm } from './SegmentForm';
import { toast } from 'sonner';
import type {
  NewsletterConfiguration,
  CreateConfigurationRequest,
  UpdateConfigurationRequest,
  CreateSegmentRequest,
  UpdateSegmentRequest,
  CadenceType,
  SubjectLineStyle,
  ApprovalTier,
  RiskLevel,
} from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

export interface ConfigurationFormProps {
  readonly open: boolean;
  readonly mode: 'create' | 'edit';
  readonly initialData?: NewsletterConfiguration;
  readonly onClose: () => void;
  readonly onSubmit: (
    data: CreateConfigurationRequest | UpdateConfigurationRequest
  ) => void | Promise<void>;
  readonly isSubmitting?: boolean;
}

interface FormData {
  name: string;
  description: string;
  segment_id: string;
  cadence: CadenceType;
  send_day_of_week: string;
  send_time_utc: string;
  timezone: string;
  max_blocks: string;
  education_ratio_min: string;
  content_freshness_days: string;
  hero_topic_priority: string;
  framework_focus: string;
  subject_line_style: SubjectLineStyle;
  max_metaphors: string;
  banned_phrases: string;
  approval_tier: ApprovalTier;
  risk_level: RiskLevel;
  ai_provider: string;
  ai_model: string;
  prompt_version: string;
}

// ============================================================================
// Constants
// ============================================================================

const CADENCE_OPTIONS: readonly { value: CadenceType; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const SUBJECT_LINE_STYLE_OPTIONS: readonly {
  value: SubjectLineStyle;
  label: string;
}[] = [
  { value: 'pain_first', label: 'Pain First' },
  { value: 'opportunity_first', label: 'Opportunity First' },
  { value: 'visionary', label: 'Visionary' },
];

const APPROVAL_TIER_OPTIONS: readonly {
  value: ApprovalTier;
  label: string;
}[] = [
  { value: 'tier1', label: 'Tier 1' },
  { value: 'tier2', label: 'Tier 2' },
];

const RISK_LEVEL_OPTIONS: readonly { value: RiskLevel; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High' },
  { value: 'experimental', label: 'Experimental' },
];

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getInitialFormData(
  _mode: 'create' | 'edit',
  initialData?: NewsletterConfiguration
): FormData {
  // Use initialData when editing OR when cloning (create mode with data)
  if (initialData) {
    return {
      name: initialData.name || '',
      description: initialData.description || '',
      segment_id: initialData.segment_id || '',
      cadence: initialData.cadence || 'weekly',
      send_day_of_week: String(initialData.send_day_of_week ?? 1),
      send_time_utc: initialData.send_time_utc || '09:00:00',
      timezone: initialData.timezone || 'UTC',
      max_blocks: String(initialData.max_blocks ?? 5),
      education_ratio_min: String(initialData.education_ratio_min ?? 0.6),
      content_freshness_days: String(initialData.content_freshness_days ?? 30),
      hero_topic_priority: initialData.hero_topic_priority || '',
      framework_focus: initialData.framework_focus || '',
      subject_line_style: initialData.subject_line_style || 'pain_first',
      max_metaphors: String(initialData.max_metaphors ?? 3),
      banned_phrases: (initialData.banned_phrases ?? []).join(', '),
      approval_tier: initialData.approval_tier || 'tier1',
      risk_level: initialData.risk_level || 'standard',
      ai_provider: initialData.ai_provider || 'anthropic',
      ai_model: initialData.ai_model || 'claude-sonnet-4-20250514',
      prompt_version: String(initialData.prompt_version ?? 1),
    };
  }

  return {
    name: '',
    description: '',
    segment_id: '',
    cadence: 'weekly',
    send_day_of_week: '1',
    send_time_utc: '09:00:00',
    timezone: 'UTC',
    max_blocks: '5',
    education_ratio_min: '0.6',
    content_freshness_days: '30',
    hero_topic_priority: 'Cybersecurity Trends',
    framework_focus: 'NIST',
    subject_line_style: 'pain_first',
    max_metaphors: '3',
    banned_phrases: '',
    approval_tier: 'tier1',
    risk_level: 'standard',
    ai_provider: 'anthropic',
    ai_model: 'claude-sonnet-4-20250514',
    prompt_version: '1',
  };
}

// ============================================================================
// Component
// ============================================================================

export function ConfigurationForm({
  open,
  mode,
  initialData,
  onClose,
  onSubmit,
  isSubmitting = false,
}: ConfigurationFormProps): ReactElement {
  const [formData, setFormData] = useState<FormData>(() =>
    getInitialFormData(mode, initialData)
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );

  // Segment creation state - show SegmentForm in separate dialog
  const [showSegmentForm, setShowSegmentForm] = useState(false);

  // Fetch segments for the dropdown
  const { data: segmentsData, isLoading: segmentsLoading, refetch: refetchSegments } = useSegments({
    isActive: true,
    pageSize: 100, // Get all active segments
  });

  // Create segment mutation
  const createSegmentMutation = useCreateSegment();

  // Handle segment creation
  const handleCreateSegment = async (data: CreateSegmentRequest | UpdateSegmentRequest): Promise<void> => {
    try {
      // In create mode, we receive CreateSegmentRequest
      const newSegment = await createSegmentMutation.mutateAsync({
        request: data as CreateSegmentRequest,
      });

      // Refetch segments to include the new one
      await refetchSegments();

      // Auto-select the newly created segment
      handleChange('segment_id', newSegment.id);

      // Close segment form
      setShowSegmentForm(false);

      toast.success(`Segment "${newSegment.name}" created and selected`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create segment');
      throw error; // Re-throw to let SegmentForm handle the error state
    }
  };

  // Reset form when dialog opens/closes or mode changes
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: Initialize form state when dialog opens
      setFormData(getInitialFormData(mode, initialData));
      setErrors({});
      setShowSegmentForm(false);
    }
  }, [open, mode, initialData]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Configuration name is required';
    }

    if (!formData.segment_id) {
      newErrors.segment_id = 'Segment is required for newsletter generation';
    }

    if (!formData.cadence) {
      newErrors.cadence = 'Cadence is required';
    }

    const maxBlocks = parseInt(formData.max_blocks, 10);
    if (isNaN(maxBlocks) || maxBlocks < 1 || maxBlocks > 20) {
      newErrors.max_blocks = 'Max blocks must be between 1 and 20';
    }

    const educationRatio = parseFloat(formData.education_ratio_min);
    if (isNaN(educationRatio) || educationRatio < 0 || educationRatio > 1) {
      newErrors.education_ratio_min =
        'Education ratio must be between 0 and 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const data: CreateConfigurationRequest | UpdateConfigurationRequest = {
      name: formData.name,
      description: formData.description || undefined,
      segment_id: formData.segment_id, // Required field
      cadence: formData.cadence,
      send_day_of_week: parseInt(formData.send_day_of_week, 10),
      // Note: send_time_utc is omitted as it requires RFC3339 format on the backend
      timezone: formData.timezone,
      max_blocks: parseInt(formData.max_blocks, 10),
      education_ratio_min: parseFloat(formData.education_ratio_min),
      content_freshness_days: parseInt(formData.content_freshness_days, 10),
      hero_topic_priority: formData.hero_topic_priority,
      framework_focus: formData.framework_focus,
      subject_line_style: formData.subject_line_style,
      max_metaphors: parseInt(formData.max_metaphors, 10),
      banned_phrases: formData.banned_phrases
        ? formData.banned_phrases.split(',').map((p) => p.trim())
        : [],
      approval_tier: formData.approval_tier,
      risk_level: formData.risk_level,
      ai_provider: formData.ai_provider,
      ai_model: formData.ai_model,
      prompt_version: parseInt(formData.prompt_version, 10),
    };

    await onSubmit(data);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      {/* Main Configuration Form Dialog */}
      <Dialog open={open && !showSegmentForm} onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{
            padding: 'var(--spacing-6)',
          }}
          data-testid="config-form-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {mode === 'create'
                ? 'Create Newsletter Configuration'
                : 'Edit Newsletter Configuration'}
            </DialogTitle>
            <DialogDescription>
              Configure newsletter generation settings, content preferences, and
              approval workflow.
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
                  Configuration Name *
                </label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Weekly CISO Newsletter"
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
                  placeholder="Optional description of this configuration"
                  rows={3}
                />
              </div>

              {/* Segment Selection - Required */}
              <div>
                <label
                  htmlFor="segment_id"
                  style={{
                    display: 'block',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--spacing-2)',
                  }}
                >
                  Audience Segment *
                </label>
                <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <Select
                      value={formData.segment_id}
                      onValueChange={(value) => handleChange('segment_id', value)}
                    >
                      <SelectTrigger
                        id="segment_id"
                        aria-invalid={!!errors.segment_id}
                        aria-describedby={errors.segment_id ? 'segment-error' : 'segment-description'}
                        aria-required="true"
                      >
                        <SelectValue placeholder={segmentsLoading ? 'Loading segments...' : 'Select a segment'} />
                      </SelectTrigger>
                      <SelectContent>
                        {segmentsData?.data?.map((segment) => (
                          <SelectItem key={segment.id} value={segment.id}>
                            {segment.name}
                          </SelectItem>
                        ))}
                        {(!segmentsData?.data || segmentsData.data.length === 0) && !segmentsLoading && (
                          <button
                            type="button"
                            onClick={() => setShowSegmentForm(true)}
                            className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            style={{ color: 'var(--color-brand-primary)' }}
                            data-testid="create-segment-empty-option"
                          >
                            + Create new segment
                          </button>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSegmentForm(true)}
                    data-testid="create-segment-button"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    + New Segment
                  </Button>
                </div>
                {errors.segment_id && (
                  <p
                    id="segment-error"
                    role="alert"
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-severity-high)',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    {errors.segment_id}
                  </p>
                )}
                {!errors.segment_id && (
                  <p
                    id="segment-description"
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    The audience segment determines who receives this newsletter
                  </p>
                )}
              </div>

              {/* Scheduling */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2"
                style={{
                  gap: 'var(--spacing-4)',
                }}
              >
                <div>
                  <label
                    htmlFor="cadence"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Cadence *
                  </label>
                  <Select
                    value={formData.cadence}
                    onValueChange={(value) =>
                      handleChange('cadence', value as CadenceType)
                    }
                  >
                    <SelectTrigger id="cadence" aria-required="true">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CADENCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="send_day_of_week"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Send Day
                  </label>
                  <Select
                    value={formData.send_day_of_week}
                    onValueChange={(value) =>
                      handleChange('send_day_of_week', value)
                    }
                  >
                    <SelectTrigger id="send_day_of_week">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div
                className="grid grid-cols-1 sm:grid-cols-2"
                style={{
                  gap: 'var(--spacing-4)',
                }}
              >
                <div>
                  <label
                    htmlFor="send_time_utc"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Send Time (UTC)
                  </label>
                  <Input
                    id="send_time_utc"
                    type="time"
                    value={formData.send_time_utc}
                    onChange={(e) => handleChange('send_time_utc', e.target.value)}
                    aria-label="Send time in UTC format"
                  />
                </div>

                <div>
                  <label
                    htmlFor="timezone"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Timezone
                  </label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    placeholder="e.g., America/New_York"
                    aria-label="Timezone for newsletter delivery"
                  />
                </div>
              </div>

              {/* Content Settings */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                style={{
                  gap: 'var(--spacing-4)',
                }}
              >
                <div>
                  <label
                    htmlFor="max_blocks"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Max Blocks
                  </label>
                  <Input
                    id="max_blocks"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.max_blocks}
                    onChange={(e) => handleChange('max_blocks', e.target.value)}
                    aria-invalid={!!errors.max_blocks}
                    aria-describedby={errors.max_blocks ? 'max-blocks-error' : undefined}
                  />
                  {errors.max_blocks && (
                    <p
                      id="max-blocks-error"
                      role="alert"
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-severity-high)',
                        marginTop: 'var(--spacing-1)',
                      }}
                    >
                      {errors.max_blocks}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="education_ratio_min"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Education Ratio
                  </label>
                  <Input
                    id="education_ratio_min"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={formData.education_ratio_min}
                    onChange={(e) =>
                      handleChange('education_ratio_min', e.target.value)
                    }
                    aria-invalid={!!errors.education_ratio_min}
                    aria-describedby={errors.education_ratio_min ? 'education-ratio-error' : undefined}
                  />
                  {errors.education_ratio_min && (
                    <p
                      id="education-ratio-error"
                      role="alert"
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-severity-high)',
                        marginTop: 'var(--spacing-1)',
                      }}
                    >
                      {errors.education_ratio_min}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="content_freshness_days"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Freshness (days)
                  </label>
                  <Input
                    id="content_freshness_days"
                    type="number"
                    min="1"
                    value={formData.content_freshness_days}
                    onChange={(e) =>
                      handleChange('content_freshness_days', e.target.value)
                    }
                    aria-label="Content freshness in days"
                  />
                </div>
              </div>

              {/* Style Settings */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2"
                style={{
                  gap: 'var(--spacing-4)',
                }}
              >
                <div>
                  <label
                    htmlFor="subject_line_style"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Subject Line Style
                  </label>
                  <Select
                    value={formData.subject_line_style}
                    onValueChange={(value) =>
                      handleChange('subject_line_style', value as SubjectLineStyle)
                    }
                  >
                    <SelectTrigger id="subject_line_style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECT_LINE_STYLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="max_metaphors"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Max Metaphors
                  </label>
                  <Input
                    id="max_metaphors"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.max_metaphors}
                    onChange={(e) => handleChange('max_metaphors', e.target.value)}
                    aria-label="Maximum number of metaphors allowed"
                  />
                </div>
              </div>

              {/* Approval Settings */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2"
                style={{
                  gap: 'var(--spacing-4)',
                }}
              >
                <div>
                  <label
                    htmlFor="approval_tier"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Approval Tier
                  </label>
                  <Select
                    value={formData.approval_tier}
                    onValueChange={(value) =>
                      handleChange('approval_tier', value as ApprovalTier)
                    }
                  >
                    <SelectTrigger id="approval_tier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPROVAL_TIER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="risk_level"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    Risk Level
                  </label>
                  <Select
                    value={formData.risk_level}
                    onValueChange={(value) =>
                      handleChange('risk_level', value as RiskLevel)
                    }
                  >
                    <SelectTrigger id="risk_level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="banned_phrases"
                  style={{
                    display: 'block',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--spacing-2)',
                  }}
                >
                  Banned Phrases
                </label>
                <Input
                  id="banned_phrases"
                  value={formData.banned_phrases}
                  onChange={(e) => handleChange('banned_phrases', e.target.value)}
                  placeholder="Comma-separated list of phrases to avoid"
                  aria-describedby="banned-phrases-description"
                />
                <p
                  id="banned-phrases-description"
                  style={{
                    fontSize: 'var(--typography-font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    marginTop: 'var(--spacing-1)',
                  }}
                >
                  Separate multiple phrases with commas
                </p>
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
                    ? 'Create Configuration'
                    : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Segment Form Dialog - reuses existing SegmentForm component */}
      <SegmentForm
        open={showSegmentForm}
        mode="create"
        onClose={() => setShowSegmentForm(false)}
        onSubmit={handleCreateSegment}
        isSubmitting={createSegmentMutation.isPending}
      />
    </>
  );
}

ConfigurationForm.displayName = 'ConfigurationForm';

/**
 * NewsletterEditor Component
 *
 * Newsletter issue editor for AI Newsletter Automation system.
 * Allows editing subject line, preheader, and intro template with live preview.
 *
 * Features:
 * - Form state management with controlled inputs
 * - Client-side validation (required fields, character limits)
 * - Dirty state tracking with unsaved changes warning
 * - Live preview panel integration
 * - Design token-based styling
 * - TypeScript strict mode
 *
 * @example
 * ```tsx
 * <NewsletterEditor
 *   issue={issue}
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 *   isSaving={false}
 * />
 * ```
 */

import { type ReactElement, useState, useCallback, useEffect } from 'react';
import { Save, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmailPreview } from '@/components/newsletter/EmailPreview';
import type { NewsletterIssue } from '@/types/newsletter';
import type { UpdateIssueRequest } from '@/hooks/useUpdateIssue';

// ============================================================================
// Types
// ============================================================================

export interface NewsletterEditorProps {
  readonly issue: NewsletterIssue;
  readonly onSave: (data: UpdateIssueRequest) => void;
  readonly onCancel: () => void;
  readonly isSaving?: boolean;
}

interface FormState {
  subject_line: string;
  preheader: string;
  intro_template: string;
}

interface ValidationErrors {
  subject_line?: string;
  preheader?: string;
  intro_template?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PREHEADER_MAX_LENGTH = 150;
const SUBJECT_LINE_MAX_LENGTH = 100;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate form state and return errors
 */
function validateForm(state: FormState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!state.subject_line.trim()) {
    errors.subject_line = 'Subject line is required';
  } else if (state.subject_line.length > SUBJECT_LINE_MAX_LENGTH) {
    errors.subject_line = `Subject line must be ${SUBJECT_LINE_MAX_LENGTH} characters or less`;
  }

  if (state.preheader.length > PREHEADER_MAX_LENGTH) {
    errors.preheader = `Preheader must be ${PREHEADER_MAX_LENGTH} characters or less`;
  }

  return errors;
}

/**
 * Check if form has unsaved changes
 */
function hasUnsavedChanges(original: NewsletterIssue, current: FormState): boolean {
  return (
    original.subject_line !== current.subject_line ||
    original.preview_text !== current.preheader ||
    (original.blocks[0]?.content || '') !== current.intro_template
  );
}

// ============================================================================
// Component
// ============================================================================

/**
 * Newsletter issue editor component
 */
export function NewsletterEditor({
  issue,
  onSave,
  onCancel,
  isSaving = false,
}: NewsletterEditorProps): ReactElement {
  // ============================================================================
  // State
  // ============================================================================

  const [formState, setFormState] = useState<FormState>({
    subject_line: issue.subject_line,
    preheader: issue.preview_text ?? '',
    intro_template: issue.blocks[0]?.content || '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================

  // Track dirty state
  useEffect(() => {
    setIsDirty(hasUnsavedChanges(issue, formState));
  }, [formState, issue]);

  // Warn on navigation if unsaved changes
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSubjectLineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setFormState((prev) => ({
        ...prev,
        subject_line: e.target.value,
      }));

      // Clear error when user types
      if (errors.subject_line) {
        setErrors((prev) => ({ ...prev, subject_line: undefined }));
      }
    },
    [errors.subject_line]
  );

  const handlePreheaderChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setFormState((prev) => ({
        ...prev,
        preheader: e.target.value,
      }));

      // Clear error when user types
      if (errors.preheader) {
        setErrors((prev) => ({ ...prev, preheader: undefined }));
      }
    },
    [errors.preheader]
  );

  const handleIntroTemplateChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setFormState((prev) => ({
        ...prev,
        intro_template: e.target.value,
      }));
    },
    []
  );

  const handleSave = useCallback((): void => {
    const validationErrors = validateForm(formState);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const updateData: UpdateIssueRequest = {
      selected_subject_line: formState.subject_line,
      preheader: formState.preheader,
      intro_template: formState.intro_template,
    };

    onSave(updateData);
  }, [formState, onSave]);

  const handleCancel = useCallback((): void => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );

      if (!confirmDiscard) {
        return;
      }
    }

    onCancel();
  }, [isDirty, onCancel]);

  // ============================================================================
  // Render
  // ============================================================================

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--spacing-gap-xl)',
        padding: 'var(--spacing-page-padding)',
      }}
    >
      {/* Editor Panel */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Edit Newsletter</CardTitle>
            {isDirty && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-gap-sm)',
                  marginTop: 'var(--spacing-gap-md)',
                  padding: 'var(--spacing-gap-md)',
                  backgroundColor: 'var(--color-warning-bg)',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-warning-fg)',
                }}
              >
                <AlertCircle
                  style={{
                    width: 'var(--icon-size-sm)',
                    height: 'var(--icon-size-sm)',
                  }}
                />
                You have unsaved changes
              </div>
            )}
          </CardHeader>
          <CardContent
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-gap-lg)',
            }}
          >
            {/* Subject Line */}
            <div>
              <Label htmlFor="subject_line" required>
                Subject Line
              </Label>
              <Input
                id="subject_line"
                type="text"
                value={formState.subject_line}
                onChange={handleSubjectLineChange}
                maxLength={SUBJECT_LINE_MAX_LENGTH}
                placeholder="Enter subject line..."
                aria-invalid={Boolean(errors.subject_line)}
                aria-describedby={errors.subject_line ? 'subject_line_error' : undefined}
                disabled={isSaving}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 'var(--spacing-gap-xs)',
                }}
              >
                {errors.subject_line ? (
                  <span
                    id="subject_line_error"
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-destructive)',
                    }}
                  >
                    {errors.subject_line}
                  </span>
                ) : (
                  <span />
                )}
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color:
                      formState.subject_line.length > SUBJECT_LINE_MAX_LENGTH - 10
                        ? 'var(--color-warning)'
                        : 'var(--color-text-secondary)',
                  }}
                >
                  {formState.subject_line.length}/{SUBJECT_LINE_MAX_LENGTH}
                </span>
              </div>
            </div>

            {/* Preheader */}
            <div>
              <Label htmlFor="preheader">Preview Text / Preheader</Label>
              <Textarea
                id="preheader"
                value={formState.preheader}
                onChange={handlePreheaderChange}
                maxLength={PREHEADER_MAX_LENGTH}
                placeholder="Enter preview text (shown in email inbox)..."
                rows={3}
                aria-invalid={Boolean(errors.preheader)}
                aria-describedby={errors.preheader ? 'preheader_error' : undefined}
                disabled={isSaving}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 'var(--spacing-gap-xs)',
                }}
              >
                {errors.preheader ? (
                  <span
                    id="preheader_error"
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-destructive)',
                    }}
                  >
                    {errors.preheader}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Recommended: 40-150 characters
                  </span>
                )}
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color:
                      formState.preheader.length > PREHEADER_MAX_LENGTH - 20
                        ? 'var(--color-warning)'
                        : 'var(--color-text-secondary)',
                  }}
                >
                  {formState.preheader.length}/{PREHEADER_MAX_LENGTH}
                </span>
              </div>
            </div>

            {/* Intro Template */}
            <div>
              <Label htmlFor="intro_template">Intro Paragraph</Label>
              <Textarea
                id="intro_template"
                value={formState.intro_template}
                onChange={handleIntroTemplateChange}
                placeholder="Enter newsletter introduction..."
                rows={8}
                disabled={isSaving}
              />
              <div
                style={{
                  marginTop: 'var(--spacing-gap-xs)',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  This appears at the top of your newsletter
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-gap-md)',
                justifyContent: 'flex-end',
                paddingTop: 'var(--spacing-gap-md)',
                borderTop: 'var(--border-width-thin) solid var(--color-border)',
              }}
            >
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSaving}
              >
                <X
                  style={{
                    width: 'var(--icon-size-sm)',
                    height: 'var(--icon-size-sm)',
                    marginRight: 'var(--spacing-gap-sm)',
                  }}
                />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                variant="default"
                disabled={isSaving || !isDirty || hasErrors}
              >
                <Save
                  style={{
                    width: 'var(--icon-size-sm)',
                    height: 'var(--icon-size-sm)',
                    marginRight: 'var(--spacing-gap-sm)',
                  }}
                />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      <div>
        <EmailPreview
          htmlContent={`
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="margin-bottom: 24px; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">
                  ${formState.intro_template || '<em>Intro paragraph will appear here...</em>'}
                </p>
              </div>
              ${issue.blocks
                .slice(1)
                .map(
                  (block) => `
                <div style="margin-bottom: 24px;">
                  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #111827;">
                    ${block.title}
                  </h2>
                  ${
                    block.subtitle
                      ? `<p style="font-size: 14px; color: #6b7280; margin-bottom: 12px;">${block.subtitle}</p>`
                      : ''
                  }
                  <div style="font-size: 14px; line-height: 1.6; color: #374151;">
                    ${block.content}
                  </div>
                  ${
                    block.cta_text && block.cta_url
                      ? `<div style="margin-top: 12px;">
                        <a href="${block.cta_url}" style="display: inline-block; padding: 8px 16px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
                          ${block.cta_text}
                        </a>
                      </div>`
                      : ''
                  }
                </div>
              `
                )
                .join('')}
            </div>
          `}
          subjectLine={formState.subject_line || 'Subject line preview'}
          previewText={formState.preheader || 'Preview text'}
          isLoading={false}
        />
      </div>
    </div>
  );
}

NewsletterEditor.displayName = 'NewsletterEditor';

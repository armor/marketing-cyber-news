/**
 * ContentSourceForm Component
 *
 * Form for creating and editing content sources.
 *
 * Features:
 * - Form fields: Name, Feed URL, Type, Polling Interval
 * - Test Connection button with feed preview
 * - Form validation
 * - Save/Cancel buttons
 * - Loading states
 *
 * @example
 * ```tsx
 * <ContentSourceForm
 *   sourceId="src_123"  // Optional - for edit mode
 *   onSave={() => console.log('Saved')}
 *   onCancel={() => setShowForm(false)}
 * />
 * ```
 */

import { type ReactElement, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useCreateContentSource,
  useUpdateContentSource,
  useTestFeed,
} from '@/hooks/useContentMutations';
import type { SourceType } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

export interface ContentSourceFormProps {
  readonly sourceId?: string;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

interface FormData {
  name: string;
  url: string;
  sourceType: SourceType;
  fetchFrequencyHours: number;
}

interface FormErrors {
  name?: string;
  url?: string;
  sourceType?: string;
  fetchFrequencyHours?: string;
}

// ============================================================================
// Constants
// ============================================================================

const INITIAL_FORM_DATA: FormData = {
  name: '',
  url: '',
  sourceType: 'rss',
  fetchFrequencyHours: 24,
};

const SOURCE_TYPE_OPTIONS: readonly { value: SourceType; label: string }[] = [
  { value: 'rss', label: 'RSS Feed' },
  { value: 'api', label: 'API' },
  { value: 'manual', label: 'Manual' },
] as const;

const POLLING_INTERVAL_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 1, label: 'Every hour' },
  { value: 6, label: 'Every 6 hours' },
  { value: 12, label: 'Every 12 hours' },
  { value: 24, label: 'Daily' },
  { value: 48, label: 'Every 2 days' },
  { value: 168, label: 'Weekly' },
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Name is required';
  }

  if (!data.url.trim()) {
    errors.url = 'URL is required';
  } else {
    try {
      new URL(data.url);
    } catch {
      errors.url = 'Invalid URL format';
    }
  }

  if (data.fetchFrequencyHours < 1) {
    errors.fetchFrequencyHours = 'Polling interval must be at least 1 hour';
  }

  return errors;
}

// ============================================================================
// Component
// ============================================================================

export function ContentSourceForm({
  sourceId,
  onSave,
  onCancel,
}: ContentSourceFormProps): ReactElement {
  const isEditMode = Boolean(sourceId);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [testResult, setTestResult] = useState<{
    success: boolean;
    title?: string;
    itemCount?: number;
    error?: string;
  } | null>(null);

  const createMutation = useCreateContentSource();
  const updateMutation = useUpdateContentSource();
  const testMutation = useTestFeed();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleChange = (field: keyof FormData, value: string | number): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleTestConnection = (): void => {
    if (!formData.url.trim()) {
      setErrors((prev) => ({ ...prev, url: 'URL is required to test connection' }));
      return;
    }

    setTestResult(null);
    testMutation.mutate(
      { url: formData.url },
      {
        onSuccess: (data) => {
          setTestResult(data);
        },
        onError: (error) => {
          setTestResult({
            success: false,
            error: error.message || 'Failed to test connection',
          });
        },
      }
    );
  };

  const handleSubmit = (): void => {
    const validationErrors = validateForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const request = {
      name: formData.name,
      source_type: formData.sourceType,
      url: formData.url,
      fetch_frequency_hours: formData.fetchFrequencyHours,
    };

    if (isEditMode && sourceId) {
      updateMutation.mutate(
        { id: sourceId, request },
        {
          onSuccess: () => {
            onSave();
          },
        }
      );
    } else {
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

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Content Source' : 'Add Content Source'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-6)',
          }}
        >
          {/* Name Field */}
          <div>
            <label
              htmlFor="name"
              style={{
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Security Blog"
              disabled={isPending}
            />
            {errors.name && (
              <p
                style={{
                  marginTop: 'var(--spacing-1)',
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-destructive)',
                }}
              >
                {errors.name}
              </p>
            )}
          </div>

          {/* Source Type Field */}
          <div>
            <label
              htmlFor="sourceType"
              style={{
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Type
            </label>
            <Select
              value={formData.sourceType}
              onValueChange={(value) => handleChange('sourceType', value as SourceType)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* URL Field */}
          <div>
            <label
              htmlFor="url"
              style={{
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Feed URL
            </label>
            <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
              <div style={{ flex: 1 }}>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => handleChange('url', e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  disabled={isPending}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isPending || testMutation.isPending || !formData.url.trim()}
              >
                {testMutation.isPending ? (
                  <>
                    <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    <span style={{ marginLeft: 'var(--spacing-2)' }}>Testing...</span>
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
            </div>
            {errors.url && (
              <p
                style={{
                  marginTop: 'var(--spacing-1)',
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-destructive)',
                }}
              >
                {errors.url}
              </p>
            )}
            {testResult && (
              <div
                style={{
                  marginTop: 'var(--spacing-2)',
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: testResult.success
                    ? 'var(--color-success-bg)'
                    : 'var(--color-destructive-bg)',
                  border: `1px solid ${
                    testResult.success
                      ? 'var(--color-success)'
                      : 'var(--color-destructive)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  {testResult.success ? (
                    <CheckCircle
                      style={{
                        width: '16px',
                        height: '16px',
                        color: 'var(--color-success)',
                      }}
                    />
                  ) : (
                    <XCircle
                      style={{
                        width: '16px',
                        height: '16px',
                        color: 'var(--color-destructive)',
                      }}
                    />
                  )}
                  <div>
                    {testResult.success ? (
                      <>
                        <p
                          style={{
                            fontSize: 'var(--typography-font-size-sm)',
                            fontWeight: 'var(--typography-font-weight-medium)',
                            color: 'var(--color-success)',
                          }}
                        >
                          Connection successful
                        </p>
                        {testResult.title && (
                          <p
                            style={{
                              fontSize: 'var(--typography-font-size-sm)',
                              color: 'var(--color-text-secondary)',
                              marginTop: 'var(--spacing-1)',
                            }}
                          >
                            Feed: {testResult.title} ({testResult.itemCount} items)
                          </p>
                        )}
                      </>
                    ) : (
                      <p
                        style={{
                          fontSize: 'var(--typography-font-size-sm)',
                          color: 'var(--color-destructive)',
                        }}
                      >
                        {testResult.error || 'Connection failed'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Polling Interval Field */}
          <div>
            <label
              htmlFor="pollingInterval"
              style={{
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Polling Interval
            </label>
            <Select
              value={String(formData.fetchFrequencyHours)}
              onValueChange={(value) => handleChange('fetchFrequencyHours', Number(value))}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                {POLLING_INTERVAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-3)',
              justifyContent: 'flex-end',
              marginTop: 'var(--spacing-4)',
            }}
          >
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  <span style={{ marginLeft: 'var(--spacing-2)' }}>Saving...</span>
                </>
              ) : (
                isEditMode ? 'Update Source' : 'Add Source'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * NewsletterEditPage Component
 *
 * Newsletter issue editing page for AI Newsletter Automation system.
 * Allows editing of draft newsletters with live preview.
 *
 * Features:
 * - Loads issue data with useIssue hook
 * - Only allows editing if status is 'draft'
 * - Shows loading and error states
 * - Navigates back to preview page on save/cancel
 * - TypeScript strict mode with full type safety
 * - Design token-based styling
 *
 * @example
 * ```tsx
 * <Route path="/newsletter/edit/:id" element={<NewsletterEditPage />} />
 * ```
 */

import { type ReactElement, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, XCircle, AlertCircle } from 'lucide-react';
import { useIssue } from '@/hooks/useIssue';
import { useUpdateIssue, type UpdateIssueRequest } from '@/hooks/useUpdateIssue';
import { NewsletterEditor } from '@/components/newsletter/editor/NewsletterEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ============================================================================
// Constants
// ============================================================================

const PREVIEW_PATH_PREFIX = '/newsletter/preview';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if issue can be edited based on status
 */
function isEditable(status: string): boolean {
  return status === 'draft';
}

// ============================================================================
// Component
// ============================================================================

/**
 * Newsletter edit page component
 */
export function NewsletterEditPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const { data: issue, isLoading, isError, error } = useIssue({
    id: id || '',
    enabled: Boolean(id),
  });

  // ============================================================================
  // Mutations
  // ============================================================================

  const updateMutation = useUpdateIssue();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleBack = useCallback((): void => {
    if (!id) {
      return;
    }
    navigate(`${PREVIEW_PATH_PREFIX}/${id}`);
  }, [id, navigate]);

  const handleSave = useCallback(
    (data: UpdateIssueRequest): void => {
      if (!id) {
        return;
      }

      updateMutation.mutate(
        { id, data },
        {
          onSuccess: () => {
            navigate(`${PREVIEW_PATH_PREFIX}/${id}`);
          },
        }
      );
    },
    [id, updateMutation, navigate]
  );

  const handleCancel = useCallback((): void => {
    handleBack();
  }, [handleBack]);

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{
          backgroundColor: 'var(--color-background)',
        }}
      >
        <div
          className="text-center"
          style={{
            color: 'var(--color-text-secondary)',
          }}
        >
          <Mail
            className="mx-auto mb-4 animate-pulse"
            style={{
              width: 'var(--icon-size-2xl)',
              height: 'var(--icon-size-2xl)',
              color: 'var(--color-primary)',
            }}
          />
          <p
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Loading newsletter...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================

  if (isError || !issue) {
    return (
      <div
        className="min-h-screen"
        style={{
          backgroundColor: 'var(--color-background)',
          padding: 'var(--spacing-page-padding)',
        }}
      >
        <Card
          className="max-w-2xl mx-auto"
          style={{
            marginTop: 'var(--spacing-section-gap)',
          }}
        >
          <CardContent
            className="text-center"
            style={{
              padding: 'var(--spacing-component-xl)',
            }}
          >
            <XCircle
              className="mx-auto mb-4"
              style={{
                width: 'var(--icon-size-2xl)',
                height: 'var(--icon-size-2xl)',
                color: 'var(--color-destructive)',
              }}
            />
            <h2
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-gap-md)',
              }}
            >
              Newsletter Not Found
            </h2>
            <p
              style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-gap-lg)',
              }}
            >
              {error?.message || 'The requested newsletter could not be found.'}
            </p>
            <Button onClick={handleBack} variant="default">
              <ArrowLeft
                style={{
                  width: 'var(--icon-size-sm)',
                  height: 'var(--icon-size-sm)',
                  marginRight: 'var(--spacing-gap-sm)',
                }}
              />
              Back to Newsletter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Not Editable State
  // ============================================================================

  if (!isEditable(issue.status)) {
    return (
      <div
        className="min-h-screen"
        style={{
          backgroundColor: 'var(--color-background)',
          padding: 'var(--spacing-page-padding)',
        }}
      >
        <Card
          className="max-w-2xl mx-auto"
          style={{
            marginTop: 'var(--spacing-section-gap)',
          }}
        >
          <CardContent
            className="text-center"
            style={{
              padding: 'var(--spacing-component-xl)',
            }}
          >
            <AlertCircle
              className="mx-auto mb-4"
              style={{
                width: 'var(--icon-size-2xl)',
                height: 'var(--icon-size-2xl)',
                color: 'var(--color-warning)',
              }}
            />
            <h2
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-gap-md)',
              }}
            >
              Cannot Edit Newsletter
            </h2>
            <p
              style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-gap-lg)',
              }}
            >
              Only newsletters in draft status can be edited. This newsletter is currently{' '}
              <strong>{issue.status}</strong>.
            </p>
            <Button onClick={handleBack} variant="default">
              <ArrowLeft
                style={{
                  width: 'var(--icon-size-sm)',
                  height: 'var(--icon-size-sm)',
                  marginRight: 'var(--spacing-gap-sm)',
                }}
              />
              Back to Newsletter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--color-background)',
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: 'var(--border-width-thin) solid var(--color-border)',
          padding: 'var(--spacing-component-lg) var(--spacing-page-padding)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-[var(--spacing-gap-lg)]">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="sm"
              aria-label="Back to preview"
            >
              <ArrowLeft
                style={{
                  width: 'var(--icon-size-sm)',
                  height: 'var(--icon-size-sm)',
                  marginRight: 'var(--spacing-gap-sm)',
                }}
              />
              Back
            </Button>

            <div className="flex items-center gap-[var(--spacing-gap-md)]">
              <Mail
                style={{
                  width: 'var(--icon-size-lg)',
                  height: 'var(--icon-size-lg)',
                  color: 'var(--color-primary)',
                }}
              />
              <div>
                <h1
                  style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Edit Newsletter
                </h1>
                <p
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    marginTop: 'var(--spacing-gap-xs)',
                  }}
                >
                  {issue.subject_line}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <NewsletterEditor
          issue={issue}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={updateMutation.isPending}
        />
      </main>
    </div>
  );
}

NewsletterEditPage.displayName = 'NewsletterEditPage';

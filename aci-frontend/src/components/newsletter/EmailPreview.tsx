/**
 * EmailPreview Component
 *
 * Displays a newsletter HTML preview in an iframe with device viewport options.
 * Supports desktop, tablet, and mobile preview modes.
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ============================================================================
// Types
// ============================================================================

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

interface ViewportDimensions {
  readonly width: number;
  readonly label: string;
}

interface EmailPreviewProps {
  readonly htmlContent: string;
  readonly subjectLine?: string;
  readonly previewText?: string;
  readonly isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const VIEWPORT_DIMENSIONS: Record<ViewportMode, ViewportDimensions> = {
  desktop: { width: 700, label: 'Desktop' },
  tablet: { width: 600, label: 'Tablet' },
  mobile: { width: 375, label: 'Mobile' },
};

// ============================================================================
// Component
// ============================================================================

export function EmailPreview({
  htmlContent,
  subjectLine,
  previewText,
  isLoading = false,
}: EmailPreviewProps) {
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentViewport = VIEWPORT_DIMENSIONS[viewportMode];

  useEffect(() => {
    if (!iframeRef.current || !htmlContent) {
      return;
    }

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;

    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
    }
  }, [htmlContent]);

  if (isLoading) {
    return (
      <Card>
        <CardContent
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
          }}
        >
          <div
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--typography-font-size-sm)',
            }}
          >
            Loading preview...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <CardTitle>Email Preview</CardTitle>
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-2)',
          }}
        >
          {(Object.keys(VIEWPORT_DIMENSIONS) as ViewportMode[]).map((mode) => (
            <Button
              key={mode}
              variant={viewportMode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewportMode(mode)}
            >
              {VIEWPORT_DIMENSIONS[mode].label}
            </Button>
          ))}
        </div>
      </CardHeader>

      {(subjectLine || previewText) && (
        <div
          style={{
            padding: 'var(--spacing-4)',
            paddingTop: '0',
            borderBottom: 'var(--border-width-thin) solid var(--color-border-default)',
          }}
        >
          {subjectLine && (
            <div
              style={{
                marginBottom: 'var(--spacing-2)',
              }}
            >
              <span
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--typography-font-size-xs)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--typography-letter-spacing-wide)',
                }}
              >
                Subject:
              </span>
              <span
                style={{
                  marginLeft: 'var(--spacing-2)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                }}
              >
                {subjectLine}
              </span>
            </div>
          )}
          {previewText && (
            <div>
              <span
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--typography-font-size-xs)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--typography-letter-spacing-wide)',
                }}
              >
                Preview:
              </span>
              <span
                style={{
                  marginLeft: 'var(--spacing-2)',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--typography-font-size-sm)',
                }}
              >
                {previewText}
              </span>
            </div>
          )}
        </div>
      )}

      <CardContent>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: 'var(--color-bg-surface)',
            padding: 'var(--spacing-4)',
            borderRadius: 'var(--border-radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: currentViewport.width,
              maxWidth: '100%',
              transition: 'width var(--motion-duration-normal) var(--motion-easing-default)',
              backgroundColor: 'white',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: 'var(--shadow-elevated)',
              overflow: 'hidden',
            }}
          >
            <iframe
              ref={iframeRef}
              title="Email Preview"
              style={{
                width: '100%',
                minHeight: '600px',
                border: 'none',
                display: 'block',
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

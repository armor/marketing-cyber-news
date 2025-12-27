/**
 * NewsletterPreview Component
 *
 * Full newsletter preview with subject line variants, blocks, and approval actions.
 * Displays email-like layout with desktop/tablet/mobile viewport modes.
 *
 * Wave 4.8.1 - AI Newsletter Automation
 */

import { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { NewsletterIssue, NewsletterBlock, BlockType } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

interface ViewportDimensions {
  readonly width: number;
  readonly label: string;
}

interface NewsletterPreviewProps {
  readonly issue: NewsletterIssue;
  readonly onEdit?: () => void;
  readonly onApprove?: () => void;
  readonly onReject?: () => void;
  readonly brandVoiceViolations?: readonly string[];
  readonly isApproving?: boolean;
  readonly isRejecting?: boolean;
}

interface SubjectLineVariant {
  readonly id: string;
  readonly text: string;
  readonly style: string;
}

// ============================================================================
// Constants
// ============================================================================

const VIEWPORT_DIMENSIONS: Record<ViewportMode, ViewportDimensions> = {
  desktop: { width: 600, label: 'Desktop' },
  tablet: { width: 480, label: 'Tablet' },
  mobile: { width: 320, label: 'Mobile' },
};

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  hero: 'Hero',
  news: 'News',
  content: 'Content',
  events: 'Events',
  spotlight: 'Spotlight',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse subject line variants from the subject_line field
 * Format: "Variant A | Variant B | Variant C" or single subject line
 */
function parseSubjectLineVariants(subjectLine: string): readonly SubjectLineVariant[] {
  if (!subjectLine) {
    return [];
  }

  const variants = subjectLine.split('|').map((v) => v.trim()).filter(Boolean);

  if (variants.length === 0) {
    return [];
  }

  if (variants.length === 1) {
    return [
      { id: 'default', text: variants[0], style: 'default' },
    ];
  }

  const styles = ['pain_first', 'opportunity_first', 'visionary'];

  return variants.map((text, index) => ({
    id: `variant-${index}`,
    text,
    style: styles[index] || 'default',
  }));
}

/**
 * Sort blocks by position for display
 */
function sortBlocksByPosition(blocks: readonly NewsletterBlock[]): readonly NewsletterBlock[] {
  return [...blocks].sort((a, b) => a.position - b.position);
}

// ============================================================================
// Component
// ============================================================================

export function NewsletterPreview({
  issue,
  onEdit,
  onApprove,
  onReject,
  brandVoiceViolations = [],
  isApproving = false,
  isRejecting = false,
}: NewsletterPreviewProps): React.ReactElement {
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('variant-0');

  const currentViewport = VIEWPORT_DIMENSIONS[viewportMode];

  const subjectVariants = useMemo(
    () => parseSubjectLineVariants(issue.subject_line),
    [issue.subject_line]
  );

  const sortedBlocks = useMemo(
    () => sortBlocksByPosition(issue.blocks),
    [issue.blocks]
  );

  const selectedVariant = useMemo(
    () => subjectVariants.find((v) => v.id === selectedVariantId) || subjectVariants[0],
    [subjectVariants, selectedVariantId]
  );

  const hasBrandViolations = brandVoiceViolations.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)',
      }}
    >
      {/* Brand Voice Warnings */}
      {hasBrandViolations && (
        <Card
          style={{
            borderColor: 'var(--color-warning)',
            backgroundColor: 'var(--color-warning-bg)',
          }}
        >
          <CardHeader>
            <CardTitle
              style={{
                color: 'var(--color-warning)',
                fontSize: 'var(--typography-font-size-sm)',
              }}
            >
              Brand Voice Violations Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul
              style={{
                listStyleType: 'disc',
                paddingLeft: 'var(--spacing-6)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--typography-font-size-sm)',
              }}
            >
              {brandVoiceViolations.map((violation, index) => (
                <li key={index}>{violation}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Subject Line Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Line Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3)',
            }}
          >
            {subjectVariants.map((variant) => (
              <label
                key={variant.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--spacing-3)',
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--border-radius-md)',
                  border: 'var(--border-width-thin) solid var(--color-border-default)',
                  backgroundColor:
                    selectedVariantId === variant.id
                      ? 'var(--color-primary-bg)'
                      : 'transparent',
                  cursor: 'pointer',
                  transition: 'all var(--motion-duration-fast) var(--motion-easing-default)',
                }}
              >
                <input
                  type="radio"
                  name="subject-variant"
                  value={variant.id}
                  checked={selectedVariantId === variant.id}
                  onChange={() => setSelectedVariantId(variant.id)}
                  style={{
                    marginTop: 'var(--spacing-1)',
                    accentColor: 'var(--color-primary)',
                  }}
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
                      alignItems: 'center',
                      gap: 'var(--spacing-2)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--typography-font-size-sm)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {variant.text}
                    </span>
                    {variant.style !== 'default' && (
                      <Badge variant="outline">
                        {variant.style.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Controls */}
      <Card>
        <CardHeader
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <CardTitle>Newsletter Preview</CardTitle>
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

        {/* Preheader */}
        <div
          style={{
            padding: 'var(--spacing-4)',
            paddingTop: '0',
            borderBottom: 'var(--border-width-thin) solid var(--color-border-default)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
            }}
          >
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
                {selectedVariant?.text || issue.subject_line}
              </span>
            </div>
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
                Preheader:
              </span>
              <span
                style={{
                  marginLeft: 'var(--spacing-2)',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--typography-font-size-sm)',
                }}
              >
                {issue.preview_text}
              </span>
            </div>
          </div>
        </div>

        {/* Email Content */}
        <CardContent>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: 'var(--color-bg-surface)',
              padding: 'var(--spacing-4)',
              borderRadius: 'var(--border-radius-lg)',
              overflow: 'auto',
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
              {/* Newsletter Blocks */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {sortedBlocks.map((block) => (
                  <NewsletterBlockPreview
                    key={block.id}
                    block={block}
                    viewportWidth={currentViewport.width}
                  />
                ))}

                {sortedBlocks.length === 0 && (
                  <div
                    style={{
                      padding: 'var(--spacing-8)',
                      textAlign: 'center',
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--typography-font-size-sm)',
                    }}
                  >
                    No content blocks
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--spacing-3)',
          paddingTop: 'var(--spacing-4)',
        }}
      >
        {onEdit && (
          <Button
            variant="outline"
            onClick={onEdit}
            disabled={isApproving || isRejecting}
          >
            Edit
          </Button>
        )}
        {onReject && (
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isApproving || isRejecting}
          >
            {isRejecting ? 'Rejecting...' : 'Reject'}
          </Button>
        )}
        {onApprove && (
          <Button
            onClick={onApprove}
            disabled={isApproving || isRejecting || hasBrandViolations}
          >
            {isApproving ? 'Approving...' : 'Approve'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Block Preview Component
// ============================================================================

interface NewsletterBlockPreviewProps {
  readonly block: NewsletterBlock;
  readonly viewportWidth: number;
}

function NewsletterBlockPreview({
  block,
  viewportWidth,
}: NewsletterBlockPreviewProps): React.ReactElement {
  const isCompact = viewportWidth < 400;

  const blockStyles: React.CSSProperties = {
    padding: isCompact ? 'var(--spacing-4)' : 'var(--spacing-6)',
    borderBottom: 'var(--border-width-thin) solid var(--color-border-subtle)',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: isCompact
      ? 'var(--typography-font-size-lg)'
      : 'var(--typography-font-size-xl)',
    fontWeight: 'var(--typography-font-weight-bold)',
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--spacing-2)',
  };

  const subtitleStyles: React.CSSProperties = {
    fontSize: 'var(--typography-font-size-sm)',
    fontWeight: 'var(--typography-font-weight-medium)',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--spacing-3)',
  };

  const contentStyles: React.CSSProperties = {
    fontSize: 'var(--typography-font-size-sm)',
    lineHeight: 'var(--typography-line-height-relaxed)',
    color: 'var(--color-text-secondary)',
    marginBottom: block.cta_text ? 'var(--spacing-4)' : '0',
  };

  const ctaStyles: React.CSSProperties = {
    display: 'inline-block',
    padding: 'var(--spacing-2) var(--spacing-4)',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    fontSize: 'var(--typography-font-size-sm)',
    fontWeight: 'var(--typography-font-weight-semibold)',
    borderRadius: 'var(--border-radius-md)',
    textDecoration: 'none',
    transition: 'all var(--motion-duration-fast) var(--motion-easing-default)',
  };

  const blockTypeLabel = BLOCK_TYPE_LABELS[block.block_type] || block.block_type;

  return (
    <div style={blockStyles}>
      {/* Block Type Badge */}
      <div
        style={{
          marginBottom: 'var(--spacing-3)',
        }}
      >
        <Badge variant="secondary">
          {blockTypeLabel}
        </Badge>
      </div>

      {/* Title */}
      {block.title && (
        <h2 style={titleStyles}>
          {block.title}
        </h2>
      )}

      {/* Subtitle */}
      {block.subtitle && (
        <h3 style={subtitleStyles}>
          {block.subtitle}
        </h3>
      )}

      {/* Content - sanitized with DOMPurify to prevent XSS */}
      {block.content && (
        <div
          style={contentStyles}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }}
        />
      )}

      {/* CTA */}
      {block.cta_text && block.cta_url && (
        <a
          href={block.cta_url}
          style={ctaStyles}
          target="_blank"
          rel="noopener noreferrer"
        >
          {block.cta_text}
        </a>
      )}
    </div>
  );
}

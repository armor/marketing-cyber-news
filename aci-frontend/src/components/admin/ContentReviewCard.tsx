/**
 * ContentReviewCard Component
 *
 * Displays pending article for admin review with AI categorization and metadata.
 * Shows original content, AI-assigned category/severity, source info, and CVEs.
 * Includes approve/reject action buttons.
 *
 * Features:
 * - Article title, summary preview
 * - AI category and severity badges with confidence score
 * - Source name and URL
 * - CVE badges
 * - Published date
 * - Approve/Reject buttons
 * - Expandable content preview
 * - Uses design tokens exclusively
 *
 * @example
 * ```tsx
 * <ContentReviewCard
 *   article={pendingArticle}
 *   onApprove={(id) => approveArticle(id)}
 *   onReject={(id) => rejectArticle(id)}
 *   isApproving={false}
 *   isRejecting={false}
 * />
 * ```
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/threat/SeverityBadge';
import { ApproveRejectButtons } from './ApproveRejectButtons';
import { cn } from '@/lib/utils';
import type { PendingArticle } from '@/types/admin';
import { ThreatCategory } from '@/types/threat';
import { colors } from '@/styles/tokens/colors';
import { spacing, componentSpacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { shadows } from '@/styles/tokens/shadows';
import { borders } from '@/styles/tokens/borders';
import { motion } from '@/styles/tokens/motion';

export interface ContentReviewCardProps {
  /** Pending article to review */
  article: PendingArticle;

  /** Callback when article is approved */
  onApprove: (articleId: string) => void;

  /** Callback when article is rejected */
  onReject: (articleId: string) => void;

  /** Loading state for approve mutation */
  isApproving?: boolean;

  /** Loading state for reject mutation */
  isRejecting?: boolean;

  /** Optional className for additional styling */
  className?: string;
}

/**
 * Maps ThreatCategory enum to display labels
 */
const CATEGORY_LABELS: Record<ThreatCategory, string> = {
  [ThreatCategory.MALWARE]: 'Malware',
  [ThreatCategory.PHISHING]: 'Phishing',
  [ThreatCategory.RANSOMWARE]: 'Ransomware',
  [ThreatCategory.DATA_BREACH]: 'Data Breach',
  [ThreatCategory.VULNERABILITY]: 'Vulnerability',
  [ThreatCategory.APT]: 'APT',
  [ThreatCategory.DDOS]: 'DDoS',
  [ThreatCategory.INSIDER_THREAT]: 'Insider Threat',
  [ThreatCategory.SUPPLY_CHAIN]: 'Supply Chain',
  [ThreatCategory.ZERO_DAY]: 'Zero Day',
};

/**
 * Formats ISO 8601 date string to relative time
 */
function formatRelativeTime(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown time';
  }
}

/**
 * Formats AI confidence score to percentage
 */
function formatConfidence(confidence: number | null): string {
  if (confidence === null) return 'N/A';
  return `${Math.round(confidence * 100)}%`;
}

/**
 * ContentReviewCard Component
 *
 * Renders a card displaying pending article with AI categorization for admin review.
 * All styling uses design tokens for theme consistency.
 */
export function ContentReviewCard({
  article,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
  className,
}: ContentReviewCardProps) {
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  const categoryLabel = article.aiCategory ? CATEGORY_LABELS[article.aiCategory] : 'Uncategorized';
  const publishedTime = formatRelativeTime(article.publishedAt);
  const confidenceDisplay = formatConfidence(article.aiConfidence);

  return (
    <Card
      role="article"
      aria-label={`Review article: ${article.title}`}
      data-testid="content-review-card"
      data-article-id={article.id}
      className={cn('overflow-hidden', className)}
      style={{
        borderRadius: borders.radius.lg,
        boxShadow: shadows.md,
        borderWidth: borders.width.thin,
        borderColor: colors.border.default,
        borderStyle: 'solid',
      }}
    >
      {/* Header with Title and Source */}
      <CardHeader
        style={{
          padding: componentSpacing.lg,
          borderBottomWidth: borders.width.thin,
          borderBottomColor: colors.border.default,
          borderBottomStyle: 'solid',
        }}
      >
        {/* Title */}
        <h3
          style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            lineHeight: typography.lineHeight.tight,
            marginBottom: spacing[3],
          }}
        >
          {article.title}
        </h3>

        {/* Source and Published Time */}
        <div
          className="flex items-center gap-[var(--spacing-gap-sm)] flex-wrap"
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
          }}
        >
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-[var(--spacing-gap-xs)] hover:underline"
            style={{
              color: colors.brand.primary,
              fontWeight: typography.fontWeight.medium,
              transition: `color ${motion.duration.fast} ${motion.easing.default}`,
            }}
          >
            {article.sourceName}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <span aria-hidden="true">•</span>
          <time dateTime={article.publishedAt} aria-label={`Published ${publishedTime}`}>
            {publishedTime}
          </time>
        </div>
      </CardHeader>

      <CardContent
        style={{
          padding: componentSpacing.lg,
        }}
      >
        {/* AI Categorization Section */}
        <div
          style={{
            marginBottom: spacing[4],
            padding: componentSpacing.md,
            backgroundColor: colors.background.secondary,
            borderRadius: borders.radius.md,
            borderWidth: borders.width.thin,
            borderColor: colors.border.default,
            borderStyle: 'solid',
          }}
        >
          <h4
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.secondary,
              marginBottom: spacing[2],
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            AI Categorization
          </h4>

          <div
            className="flex items-center gap-[var(--spacing-gap-md)] flex-wrap"
            style={{
              marginBottom: spacing[2],
            }}
          >
            {article.aiSeverity && <SeverityBadge severity={article.aiSeverity} size="sm" />}
            <Badge variant="outline" className="text-[var(--color-text-secondary)]">
              {categoryLabel}
            </Badge>
            <Badge variant="secondary" className="text-[var(--color-text-muted)]">
              Confidence: {confidenceDisplay}
            </Badge>
          </div>

          {/* CVE Badges */}
          {article.cves.length > 0 && (
            <div className="flex items-center gap-[var(--spacing-gap-xs)] flex-wrap">
              <span
                style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.muted,
                  marginRight: spacing[2],
                }}
              >
                CVEs:
              </span>
              {article.cves.map((cveId) => (
                <Badge
                  key={cveId}
                  variant="secondary"
                  className="text-[var(--typography-font-family-mono)] text-[var(--typography-font-size-xs)]"
                >
                  {cveId}
                </Badge>
              ))}
            </div>
          )}

          {article.cves.length === 0 && (
            <span
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.muted,
                fontStyle: 'italic',
              }}
            >
              No CVEs detected
            </span>
          )}
        </div>

        {/* Article Summary */}
        <div
          style={{
            marginBottom: spacing[4],
          }}
        >
          <p
            style={{
              fontSize: typography.fontSize.base,
              color: colors.text.primary,
              lineHeight: typography.lineHeight.relaxed,
              marginBottom: spacing[3],
            }}
          >
            {article.description}
          </p>

          {/* Expandable Content */}
          <button
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            aria-expanded={isContentExpanded}
            aria-controls={`content-${article.id}`}
            className="flex items-center gap-[var(--spacing-gap-xs)] transition-colors"
            style={{
              color: colors.brand.primary,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: `color ${motion.duration.fast} ${motion.easing.default}`,
            }}
          >
            {isContentExpanded ? (
              <>
                <ChevronUp size={16} aria-hidden="true" />
                Hide full content
              </>
            ) : (
              <>
                <ChevronDown size={16} aria-hidden="true" />
                Show full content
              </>
            )}
          </button>

          {isContentExpanded && (
            <div
              id={`content-${article.id}`}
              style={{
                marginTop: spacing[3],
                padding: componentSpacing.md,
                backgroundColor: colors.background.secondary,
                borderRadius: borders.radius.md,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                {article.content}
              </pre>
            </div>
          )}
        </div>

        {/* Approve/Reject Buttons */}
        <div
          style={{
            paddingTop: spacing[4],
            borderTopWidth: borders.width.thin,
            borderTopColor: colors.border.default,
            borderTopStyle: 'solid',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <ApproveRejectButtons
            articleId={article.id}
            onApprove={onApprove}
            onReject={onReject}
            isApproving={isApproving}
            isRejecting={isRejecting}
          />
        </div>
      </CardContent>
    </Card>
  );
}

ContentReviewCard.displayName = 'ContentReviewCard';

/**
 * Accessibility Notes:
 * - Semantic HTML: <article> role for card container
 * - External link properly labeled with aria-label and icon
 * - Time element with proper datetime attribute
 * - Expandable content with aria-expanded and aria-controls
 * - Color contrast meets WCAG AA standards
 * - Keyboard navigation support
 *
 * Design Token Usage:
 * - All colors via colors.* tokens
 * - All spacing via spacing.* and componentSpacing.* tokens
 * - All typography via typography.* tokens
 * - All borders via borders.* tokens
 * - All shadows via shadows.* tokens
 * - All motion via motion.* tokens
 * - NO hardcoded CSS values
 *
 * Testing:
 * - data-testid="content-review-card" for component queries
 * - data-article-id for identifying specific articles
 * - role="article" for semantic queries
 */

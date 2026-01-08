/**
 * ArticleDetailPage Component
 *
 * Displays full article details with approval action buttons.
 * Shows article content, metadata, and approval progress.
 * Buttons (Approve, Reject, Release) are shown based on user role.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Globe, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { ApproveButton } from '@/components/approval/ApproveButton';
import { RejectButton } from '@/components/approval/RejectButton';
import { ReleaseButton } from '@/components/approval/ReleaseButton';
import { ApprovalProgress } from '@/components/approval/ApprovalProgress';
import { SeverityBadge } from '@/components/threat/SeverityBadge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  canApproveGate,
  canRelease,
  getStatusGate,
  isReadyForRelease,
  STATUS_LABELS,
  type ArticleForApproval,
  type UserRole,
} from '@/types/approval';

// ============================================================================
// Types
// ============================================================================

interface ArticleDetailResponse {
  success: boolean;
  data: ArticleForApproval;
}

// ============================================================================
// API Fetcher
// ============================================================================

async function fetchArticle(articleId: string): Promise<ArticleForApproval> {
  const response = await fetch(`/v1/articles/${articleId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.statusText}`);
  }
  const data: ArticleDetailResponse = await response.json();
  return data.data;
}

// ============================================================================
// Component
// ============================================================================

export function ArticleDetailPage(): React.ReactElement {
  const { id: articleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userRole = (user?.role as UserRole) || 'user';

  const {
    data: article,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => fetchArticle(articleId!),
    enabled: !!articleId,
  });

  // Handle back navigation
  const handleBack = (): void => {
    navigate(-1);
  };

  // Handle success callbacks (refetch article data)
  const handleActionSuccess = (): void => {
    refetch();
  };

  // Determine if user can approve current gate
  const currentGate = article ? getStatusGate(article.approvalStatus) : null;
  const canApprove = currentGate !== null && canApproveGate(userRole, currentGate);
  const canReject = currentGate !== null && canApproveGate(userRole, currentGate);
  const canReleaseArticle = article && isReadyForRelease(article.approvalStatus) && canRelease(userRole);
  const isFullyApproved = article?.approvalStatus === 'approved';

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="text-center">
          <Loader2
            className="mx-auto mb-4 animate-spin"
            style={{
              width: 'var(--spacing-12)',
              height: 'var(--spacing-12)',
              color: 'var(--color-brand-primary)',
            }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading article...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================

  if (isError) {
    return (
      <div
        className="min-h-screen"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          padding: 'var(--spacing-8)',
        }}
      >
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center" style={{ padding: 'var(--spacing-8)' }}>
            <AlertTriangle
              className="mx-auto mb-4"
              style={{
                width: 'var(--spacing-12)',
                height: 'var(--spacing-12)',
                color: 'var(--color-severity-high)',
              }}
            />
            <h2
              style={{
                fontSize: 'var(--typography-font-size-xl)',
                fontWeight: 'var(--typography-font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Failed to Load Article
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-4)',
              }}
            >
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
                Go Back
              </Button>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Not Found State
  // ============================================================================

  if (!article) {
    return (
      <div
        className="min-h-screen"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          padding: 'var(--spacing-8)',
        }}
      >
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center" style={{ padding: 'var(--spacing-8)' }}>
            <h2
              style={{
                fontSize: 'var(--typography-font-size-xl)',
                fontWeight: 'var(--typography-font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Article Not Found
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-4)',
              }}
            >
              The article you're looking for doesn't exist or has been removed.
            </p>
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  const createdTime = formatDistanceToNow(new Date(article.createdAt), { addSuffix: true });

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderBottom: '1px solid var(--color-border-default)',
          padding: 'var(--spacing-4) var(--spacing-6)',
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack} data-testid="back-button">
            <ArrowLeft style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
            Back
          </Button>

          {/* Action Buttons */}
          <div className="flex items-center gap-3" data-testid="action-buttons">
            {/* Release Button - Show for fully approved articles */}
            {canReleaseArticle && (
              <ReleaseButton
                articleId={article.id}
                articleTitle={article.title}
                isFullyApproved={isFullyApproved}
                onSuccess={handleActionSuccess}
                size="sm"
              />
            )}

            {/* Reject Button - Show when user can reject current gate */}
            {canReject && !article.rejected && (
              <RejectButton
                articleId={article.id}
                articleTitle={article.title}
                onSuccess={handleActionSuccess}
                size="sm"
              />
            )}

            {/* Approve Button - Show when user can approve current gate */}
            {canApprove && !article.rejected && (
              <ApproveButton
                articleId={article.id}
                articleTitle={article.title}
                onSuccess={handleActionSuccess}
                size="sm"
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: 'var(--spacing-6)' }}>
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardHeader style={{ padding: 'var(--spacing-6)' }}>
              {/* Status and Badges */}
              <div
                className="flex items-center gap-3 flex-wrap"
                style={{ marginBottom: 'var(--spacing-4)' }}
              >
                <SeverityBadge severity={article.severity} size="sm" />
                <Badge variant="outline">{article.category.name}</Badge>
                <Badge
                  variant={article.rejected ? 'destructive' : 'secondary'}
                  data-testid="article-status"
                >
                  {STATUS_LABELS[article.approvalStatus]}
                </Badge>
              </div>

              {/* Title */}
              <h1
                data-testid="article-title"
                style={{
                  fontSize: 'var(--typography-font-size-2xl)',
                  fontWeight: 'var(--typography-font-weight-bold)',
                  color: 'var(--color-text-primary)',
                  lineHeight: 'var(--typography-line-height-tight)',
                  marginBottom: 'var(--spacing-4)',
                }}
              >
                {article.title}
              </h1>

              {/* Meta Info */}
              <div
                className="flex items-center gap-4 flex-wrap"
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span className="flex items-center gap-1">
                  <Globe style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
                  {article.source.name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
                  <time dateTime={article.createdAt}>{createdTime}</time>
                </span>
              </div>
            </CardHeader>

            <CardContent style={{ padding: 'var(--spacing-6)', paddingTop: 0 }}>
              {/* Approval Progress */}
              <div
                style={{
                  marginBottom: 'var(--spacing-6)',
                  padding: 'var(--spacing-4)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                }}
              >
                <h3
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--spacing-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Approval Progress
                </h3>
                <ApprovalProgress
                  progress={article.approvalProgress}
                  isRejected={article.rejected}
                />
              </div>

              {/* Summary */}
              {article.summary && (
                <div style={{ marginBottom: 'var(--spacing-6)' }}>
                  <h3
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      marginBottom: 'var(--spacing-2)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Summary
                  </h3>
                  <p
                    data-testid="article-summary"
                    style={{
                      fontSize: 'var(--typography-font-size-base)',
                      color: 'var(--color-text-primary)',
                      lineHeight: 'var(--typography-line-height-relaxed)',
                    }}
                  >
                    {article.summary}
                  </p>
                </div>
              )}

              {/* Content */}
              {article.content && (
                <div style={{ marginBottom: 'var(--spacing-6)' }}>
                  <h3
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      marginBottom: 'var(--spacing-2)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Content
                  </h3>
                  <div
                    data-testid="article-content"
                    style={{
                      fontSize: 'var(--typography-font-size-base)',
                      color: 'var(--color-text-primary)',
                      lineHeight: 'var(--typography-line-height-relaxed)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {article.content}
                  </div>
                </div>
              )}

              {/* Tags and CVEs */}
              <div className="flex flex-wrap gap-4">
                {/* CVEs */}
                {article.cves.length > 0 && (
                  <div>
                    <h4
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--spacing-2)',
                      }}
                    >
                      CVEs
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {article.cves.map((cve: string) => (
                        <Badge key={cve} variant="secondary" className="font-mono text-xs">
                          {cve}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vendors */}
                {article.vendors.length > 0 && (
                  <div>
                    <h4
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--spacing-2)',
                      }}
                    >
                      Vendors
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {article.vendors.map((vendor) => (
                        <Badge key={vendor} variant="outline" className="text-xs">
                          {vendor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {article.tags.length > 0 && (
                  <div>
                    <h4
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--spacing-2)',
                      }}
                    >
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {article.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

ArticleDetailPage.displayName = 'ArticleDetailPage';

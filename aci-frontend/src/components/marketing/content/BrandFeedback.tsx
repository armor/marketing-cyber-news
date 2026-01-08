import {
  AlertCircle,
  AlertTriangle,
  Info,
  MessageSquare,
  FileText,
  Shield,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BrandIssue } from '@/types/content-studio';
import { Badge } from '@/components/ui/badge';

interface BrandFeedbackProps {
  issues: BrandIssue[];
  onApplyFix?: (issueId: string, fix: string) => void;
  className?: string;
}

/**
 * BrandFeedback - Display brand compliance issues with suggested fixes
 *
 * Features:
 * - Categorized issues (tone, voice, terminology, style, compliance)
 * - Severity-based color coding
 * - One-click fix application
 * - Accessible screen reader support
 */
export function BrandFeedback({
  issues,
  onApplyFix,
  className = '',
}: BrandFeedbackProps) {
  const getIssueIcon = (type: BrandIssue['type']) => {
    const iconMap = {
      tone: MessageSquare,
      voice: FileText,
      terminology: FileText,
      style: Zap,
      compliance: Shield,
    };
    return iconMap[type] || Info;
  };

  const getSeverityColor = (severity: BrandIssue['severity']) => {
    const colorMap = {
      high: 'var(--color-semantic-error)',
      medium: 'var(--color-semantic-warning)',
      low: 'var(--color-semantic-info)',
    };
    return colorMap[severity];
  };

  const getSeverityIcon = (severity: BrandIssue['severity']) => {
    const iconMap = {
      high: AlertCircle,
      medium: AlertTriangle,
      low: Info,
    };
    return iconMap[severity];
  };

  if (issues.length === 0) {
    return (
      <div
        className={`flex items-center gap-[var(--spacing-3)] rounded-lg ${className}`}
        style={{
          padding: 'var(--spacing-4)',
          background: 'var(--gradient-badge-success)',
          border: `var(--border-width-thin) solid var(--color-semantic-success)`,
        }}
      >
        <Shield
          style={{
            width: 'var(--spacing-5)',
            height: 'var(--spacing-5)',
            color: 'var(--color-semantic-success)',
          }}
          aria-hidden="true"
        />
        <span
          style={{
            fontSize: 'var(--typography-font-size-sm)',
            fontFamily: 'var(--typography-font-family-sans)',
            fontWeight: 'var(--typography-font-weight-medium)',
            color: 'var(--color-semantic-success)',
          }}
        >
          No brand issues detected
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`} style={{ gap: 'var(--spacing-3)' }}>
      <h3
        style={{
          fontSize: 'var(--typography-font-size-base)',
          fontFamily: 'var(--typography-font-family-sans)',
          fontWeight: 'var(--typography-font-weight-semibold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--spacing-1)',
        }}
      >
        Brand Feedback ({issues.length})
      </h3>

      <div
        className="flex flex-col"
        style={{ gap: 'var(--spacing-2)' }}
        role="list"
        aria-label="Brand issues"
      >
        {issues.map((issue) => {
          const IssueIcon = getIssueIcon(issue.type);
          const SeverityIcon = getSeverityIcon(issue.severity);
          const severityColor = getSeverityColor(issue.severity);

          return (
            <div
              key={issue.id}
              className="flex items-start rounded-lg"
              style={{
                padding: 'var(--spacing-3)',
                gap: 'var(--spacing-3)',
                background: 'var(--color-bg-elevated)',
                border: `var(--border-width-thin) solid var(--color-border-default)`,
                boxShadow: 'var(--shadow-sm)',
              }}
              role="listitem"
            >
              {/* Icon Section */}
              <div
                className="flex items-center justify-center rounded-lg shrink-0"
                style={{
                  width: 'var(--spacing-8)',
                  height: 'var(--spacing-8)',
                  background: 'var(--gradient-component)',
                }}
              >
                <IssueIcon
                  style={{
                    width: 'var(--spacing-4)',
                    height: 'var(--spacing-4)',
                    color: severityColor,
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* Content Section */}
              <div className="flex-1 flex flex-col" style={{ gap: 'var(--spacing-2)' }}>
                <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
                  <Badge
                    variant={issue.severity === 'high' ? 'destructive' : 'outline'}
                    className="text-xs"
                  >
                    <SeverityIcon
                      style={{
                        width: 'var(--spacing-3)',
                        height: 'var(--spacing-3)',
                        marginRight: 'var(--spacing-1)',
                      }}
                      aria-hidden="true"
                    />
                    {issue.severity}
                  </Badge>
                  <span
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      fontFamily: 'var(--typography-font-family-sans)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-muted)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {issue.type}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    fontFamily: 'var(--typography-font-family-sans)',
                    lineHeight: 'var(--typography-line-height-normal)',
                    color: 'var(--color-text-primary)',
                    margin: 0,
                  }}
                >
                  {issue.message}
                </p>

                {issue.suggestedFix && (
                  <div
                    className="flex items-center"
                    style={{
                      gap: 'var(--spacing-2)',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        fontFamily: 'var(--typography-font-family-mono)',
                        color: 'var(--color-text-secondary)',
                        padding: 'var(--spacing-1) var(--spacing-2)',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--border-radius-sm)',
                        flex: 1,
                      }}
                    >
                      Suggested: {issue.suggestedFix}
                    </span>
                    {onApplyFix && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onApplyFix(issue.id, issue.suggestedFix!)}
                        aria-label={`Apply suggested fix: ${issue.suggestedFix}`}
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

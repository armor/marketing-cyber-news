/**
 * BrandHealthScore Component
 *
 * Visual health score display with circular progress indicator and recommendations.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBrandHealth } from '@/hooks/useBrandStore';
import { AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface BrandHealthScoreProps {
  readonly brandVoiceId: string;
  readonly overallScore: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get color based on score (0-100)
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--color-semantic-success)';
  if (score >= 60) return 'var(--color-warning)';
  return 'var(--color-severity-high)';
}

/**
 * Get status text based on score
 */
function getScoreStatus(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}

// ============================================================================
// Component
// ============================================================================

export function BrandHealthScore({ brandVoiceId, overallScore }: BrandHealthScoreProps) {
  const { data: healthData, isLoading } = useBrandHealth({ id: brandVoiceId });

  const scoreColor = getScoreColor(overallScore);
  const scoreStatus = getScoreStatus(overallScore);

  // SVG circle dimensions
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (overallScore / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Health</CardTitle>
        <CardDescription>Overall voice consistency and training completeness</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Circular Progress */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--spacing-6)',
          }}
        >
          <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--color-border-default)"
                strokeWidth={strokeWidth}
              />
              {/* Progress circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={scoreColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset var(--motion-duration-slow) var(--motion-easing-default)',
                }}
              />
            </svg>
            {/* Score text */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--typography-font-size-4xl)',
                  fontWeight: 'var(--typography-font-weight-bold)',
                  color: scoreColor,
                  lineHeight: 'var(--typography-line-height-tight)',
                }}
              >
                {overallScore}
              </div>
              <div
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  marginTop: 'var(--spacing-1)',
                }}
              >
                {scoreStatus}
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {!isLoading && healthData && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Breakdown
              </div>

              {/* Examples Score */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  Content Examples
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  <div
                    style={{
                      width: '80px',
                      height: 'var(--spacing-2)',
                      backgroundColor: 'var(--color-border-default)',
                      borderRadius: 'var(--border-radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${healthData.examples_score}%`,
                        height: '100%',
                        backgroundColor: getScoreColor(healthData.examples_score),
                        transition: 'width var(--motion-duration-normal) var(--motion-easing-default)',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      minWidth: '32px',
                      textAlign: 'right',
                    }}
                  >
                    {healthData.examples_score}
                  </span>
                </div>
              </div>

              {/* Guidelines Score */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  Guidelines
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  <div
                    style={{
                      width: '80px',
                      height: 'var(--spacing-2)',
                      backgroundColor: 'var(--color-border-default)',
                      borderRadius: 'var(--border-radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${healthData.guidelines_score}%`,
                        height: '100%',
                        backgroundColor: getScoreColor(healthData.guidelines_score),
                        transition: 'width var(--motion-duration-normal) var(--motion-easing-default)',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      minWidth: '32px',
                      textAlign: 'right',
                    }}
                  >
                    {healthData.guidelines_score}
                  </span>
                </div>
              </div>

              {/* Terminology Score */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  Terminology
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  <div
                    style={{
                      width: '80px',
                      height: 'var(--spacing-2)',
                      backgroundColor: 'var(--color-border-default)',
                      borderRadius: 'var(--border-radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${healthData.terminology_score}%`,
                        height: '100%',
                        backgroundColor: getScoreColor(healthData.terminology_score),
                        transition: 'width var(--motion-duration-normal) var(--motion-easing-default)',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      minWidth: '32px',
                      textAlign: 'right',
                    }}
                  >
                    {healthData.terminology_score}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {!isLoading && healthData && healthData.recommendations.length > 0 && (
            <div
              style={{
                width: '100%',
                marginTop: 'var(--spacing-4)',
                padding: 'var(--spacing-4)',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--border-radius-lg)',
                borderLeft: `var(--border-width-thick) solid ${scoreColor}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                  marginBottom: 'var(--spacing-3)',
                }}
              >
                {overallScore >= 80 ? (
                  <CheckCircle2 size={16} style={{ color: scoreColor }} />
                ) : (
                  <TrendingUp size={16} style={{ color: scoreColor }} />
                )}
                <span
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {overallScore >= 80 ? 'You\'re doing great!' : 'Recommendations'}
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                {healthData.recommendations.map((rec, index) => (
                  <li
                    key={index}
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <AlertCircle
                      size={14}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '2px',
                        color: scoreColor,
                      }}
                    />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

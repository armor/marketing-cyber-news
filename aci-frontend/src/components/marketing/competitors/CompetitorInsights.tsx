/**
 * CompetitorInsights.tsx - Competitor Insights Component
 *
 * Displays analysis and insights for a competitor:
 * - Content count and posting frequency
 * - Top topics
 * - Best posting times and days
 */

import { BarChart3, Calendar, Clock, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CompetitorAnalysis } from '../../../types/marketing';

interface CompetitorInsightsProps {
  analysis: CompetitorAnalysis | undefined;
  isLoading?: boolean;
}

export function CompetitorInsights({ analysis, isLoading }: CompetitorInsightsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <BarChart3 style={{ width: 'var(--spacing-5)', height: 'var(--spacing-5)' }} />
          <span>Insights & Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p
            style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              padding: 'var(--spacing-4)',
            }}
          >
            Loading analysis...
          </p>
        )}

        {!isLoading && !analysis && (
          <p
            style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              padding: 'var(--spacing-4)',
            }}
          >
            No analysis available yet
          </p>
        )}

        {!isLoading && analysis && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-6)',
            }}
          >
            {/* Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--spacing-4)',
              }}
            >
              <div
                style={{
                  padding: 'var(--spacing-4)',
                  borderRadius: 'var(--border-radius-md)',
                  background: 'var(--color-surface-secondary)',
                }}
              >
                <p
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-muted)',
                    marginBottom: 'var(--spacing-2)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Total Content
                </p>
                <p
                  style={{
                    fontSize: 'var(--font-size-3xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {analysis.content_count}
                </p>
              </div>

              <div
                style={{
                  padding: 'var(--spacing-4)',
                  borderRadius: 'var(--border-radius-md)',
                  background: 'var(--color-surface-secondary)',
                }}
              >
                <p
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-muted)',
                    marginBottom: 'var(--spacing-2)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Posts Per Week
                </p>
                <p
                  style={{
                    fontSize: 'var(--font-size-3xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {analysis.avg_posting_frequency.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Top Topics */}
            {analysis.top_topics.length > 0 && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    marginBottom: 'var(--spacing-3)',
                  }}
                >
                  <Hash
                    style={{
                      width: 'var(--spacing-4)',
                      height: 'var(--spacing-4)',
                      color: 'var(--color-text-muted)',
                    }}
                  />
                  <h4
                    style={{
                      fontSize: 'var(--font-size-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Top Topics
                  </h4>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  {analysis.top_topics.slice(0, 10).map((topic, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      style={{
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      {topic.topic} ({topic.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Posting Schedule */}
            {analysis.posting_schedule && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    marginBottom: 'var(--spacing-3)',
                  }}
                >
                  <Calendar
                    style={{
                      width: 'var(--spacing-4)',
                      height: 'var(--spacing-4)',
                      color: 'var(--color-text-muted)',
                    }}
                  />
                  <h4
                    style={{
                      fontSize: 'var(--font-size-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Best Posting Times
                  </h4>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--spacing-4)',
                  }}
                >
                  {/* Best Days */}
                  {analysis.posting_schedule.best_days &&
                    analysis.posting_schedule.best_days.length > 0 && (
                      <div>
                        <p
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--color-text-muted)',
                            marginBottom: 'var(--spacing-2)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Best Days
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--spacing-2)',
                          }}
                        >
                          {analysis.posting_schedule.best_days.map((day) => (
                            <Badge key={day} variant="outline">
                              {day}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Best Times */}
                  {analysis.posting_schedule.best_times &&
                    analysis.posting_schedule.best_times.length > 0 && (
                      <div>
                        <p
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--color-text-muted)',
                            marginBottom: 'var(--spacing-2)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          <Clock
                            style={{
                              width: 'var(--spacing-3)',
                              height: 'var(--spacing-3)',
                              display: 'inline',
                              marginRight: 'var(--spacing-1)',
                            }}
                          />
                          Best Times
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--spacing-2)',
                          }}
                        >
                          {analysis.posting_schedule.best_times.map((time) => (
                            <Badge key={time} variant="outline">
                              {time}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

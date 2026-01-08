/**
 * CompetitorContentFeed.tsx - Competitor Content Feed Component
 *
 * Displays recent content from a competitor:
 * - Timeline of content items
 * - Channel badges
 * - Engagement metrics
 * - Links to original content
 */

import { ExternalLink, ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CompetitorContent } from '../../../types/marketing';

interface CompetitorContentFeedProps {
  content: CompetitorContent[];
  isLoading?: boolean;
}

const CHANNEL_COLORS: Record<string, string> = {
  linkedin: 'var(--color-brand-primary)',
  twitter: 'var(--color-info)',
  blog: 'var(--color-success)',
  facebook: 'var(--color-warning)',
  instagram: 'var(--color-error)',
};

export function CompetitorContentFeed({ content, isLoading }: CompetitorContentFeedProps) {
  if (isLoading) {
    return (
      <div
        style={{
          padding: 'var(--spacing-8)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-muted)',
          }}
        >
          Loading content...
        </p>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--spacing-8)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-muted)',
          }}
        >
          No content found for this competitor
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)',
      }}
    >
      {content.map((item) => (
        <Card key={item.id}>
          <CardContent
            style={{
              paddingTop: 'var(--spacing-4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-3)',
              }}
            >
              {/* Header with channel and date */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--spacing-3)',
                }}
              >
                <Badge
                  variant="outline"
                  style={{
                    borderColor: CHANNEL_COLORS[item.channel] || 'var(--color-border-default)',
                  }}
                >
                  {item.channel}
                </Badge>
                <span
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {new Date(item.published_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Title */}
              <h4
                style={{
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  lineHeight: '1.5',
                }}
              >
                {item.title}
              </h4>

              {/* Summary */}
              {item.summary && (
                <p
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: '1.6',
                  }}
                >
                  {item.summary}
                </p>
              )}

              {/* Engagement metrics */}
              {item.engagement && (
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--spacing-4)',
                    paddingTop: 'var(--spacing-2)',
                  }}
                >
                  {item.engagement.likes > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-1)',
                      }}
                    >
                      <ThumbsUp
                        style={{
                          width: 'var(--spacing-4)',
                          height: 'var(--spacing-4)',
                          color: 'var(--color-text-muted)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {item.engagement.likes.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {item.engagement.comments > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-1)',
                      }}
                    >
                      <MessageCircle
                        style={{
                          width: 'var(--spacing-4)',
                          height: 'var(--spacing-4)',
                          color: 'var(--color-text-muted)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {item.engagement.comments.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {item.engagement.shares > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-1)',
                      }}
                    >
                      <Share2
                        style={{
                          width: 'var(--spacing-4)',
                          height: 'var(--spacing-4)',
                          color: 'var(--color-text-muted)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {item.engagement.shares.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* View original link */}
              <div
                style={{
                  paddingTop: 'var(--spacing-2)',
                  borderTop: `var(--border-width-thin) solid var(--color-border-default)`,
                }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  style={{
                    padding: 0,
                  }}
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-2)',
                      textDecoration: 'none',
                    }}
                  >
                    <span>View original</span>
                    <ExternalLink
                      style={{
                        width: 'var(--spacing-4)',
                        height: 'var(--spacing-4)',
                      }}
                    />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

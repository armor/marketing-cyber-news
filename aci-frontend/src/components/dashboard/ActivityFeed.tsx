/**
 * ActivityFeed Component
 *
 * Displays recent threat activity with icons, severity badges, and timestamps.
 * Follows design token standards with NO hardcoded values.
 *
 * @module components/dashboard/ActivityFeed
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { colors } from '@/styles/tokens/colors';
import { spacing, componentSpacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { borders } from '@/styles/tokens/borders';
import { shadows } from '@/styles/tokens/shadows';
import { motion } from '@/styles/tokens/motion';

/**
 * Activity item type definitions
 */
export interface ActivityItem {
  id: string;
  type: 'new_threat' | 'updated_threat' | 'alert_triggered';
  title: string;
  description: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string; // ISO timestamp
  threatId?: string;
}

export interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number; // Default 10
  loading?: boolean;
  onItemClick?: (item: ActivityItem) => void;
}

/**
 * Icon mapping for activity types
 */
const ActivityIcon: React.FC<{ type: ActivityItem['type'] }> = ({ type }) => {
  const iconStyles: React.CSSProperties = {
    width: spacing[5],
    height: spacing[5],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borders.radius.full,
    flexShrink: 0,
  };

  switch (type) {
    case 'new_threat':
      return (
        <div
          style={{
            ...iconStyles,
            backgroundColor: colors.semantic.info,
            color: colors.text.primary,
          }}
          aria-label="New threat"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 2V8M8 8V14M8 8H14M8 8H2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );
    case 'updated_threat':
      return (
        <div
          style={{
            ...iconStyles,
            backgroundColor: colors.semantic.warning,
            color: colors.text.primary,
          }}
          aria-label="Updated threat"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C9.5 2 10.8 2.6 11.8 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d="M14 2L11.8 3.5L13 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    case 'alert_triggered':
      return (
        <div
          style={{
            ...iconStyles,
            backgroundColor: colors.severity.critical,
            color: colors.text.primary,
          }}
          aria-label="Alert triggered"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 2L2 14H14L8 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M8 6V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="8" cy="11.5" r="0.5" fill="currentColor"/>
          </svg>
        </div>
      );
  }
};

/**
 * Severity badge component
 */
const SeverityBadge: React.FC<{ severity: ActivityItem['severity'] }> = ({ severity }) => {
  if (!severity) return null;

  const severityConfig = {
    critical: { label: 'Critical', color: colors.severity.critical },
    high: { label: 'High', color: colors.severity.high },
    medium: { label: 'Medium', color: colors.severity.medium },
    low: { label: 'Low', color: colors.severity.low },
  };

  const config = severityConfig[severity];

  return (
    <Badge
      variant="outline"
      style={{
        borderColor: config.color,
        color: config.color,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
      }}
    >
      {config.label}
    </Badge>
  );
};

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(isoTimestamp: string): string {
  const now = new Date();
  const date = new Date(isoTimestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }

  // Format as date for older items
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Loading skeleton for activity items
 */
const ActivityItemSkeleton: React.FC = () => (
  <div
    style={{
      display: 'flex',
      gap: spacing[3],
      padding: spacing[3],
      borderBottom: `${borders.width.thin} solid ${colors.border.default}`,
    }}
  >
    <Skeleton style={{ width: spacing[5], height: spacing[5], borderRadius: borders.radius.full }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
      <Skeleton style={{ height: spacing[4], width: '70%' }} />
      <Skeleton style={{ height: spacing[3], width: '90%' }} />
      <Skeleton style={{ height: spacing[3], width: '40%' }} />
    </div>
  </div>
);

/**
 * ActivityFeed Component
 */
export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  items,
  maxItems = 10,
  loading = false,
  onItemClick,
}) => {
  const navigate = useNavigate();

  const displayItems = items.slice(0, maxItems);

  const handleItemClick = (item: ActivityItem) => {
    if (onItemClick) {
      onItemClick(item);
    } else if (item.threatId) {
      navigate(`/threats/${item.threatId}`);
    }
  };

  return (
    <Card
      data-testid="activity-feed"
      style={{
        backgroundColor: colors.background.elevated,
        border: `${borders.width.thin} solid ${colors.border.default}`,
        borderRadius: borders.radius.lg,
        boxShadow: shadows.sm,
      }}
    >
      <CardHeader
        style={{
          padding: componentSpacing.lg,
          borderBottom: `${borders.width.thin} solid ${colors.border.default}`,
        }}
      >
        <CardTitle
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            margin: spacing[0],
          }}
        >
          Recent Activity
        </CardTitle>
      </CardHeader>

      <CardContent
        style={{
          padding: spacing[0],
        }}
      >
        {loading ? (
          <div data-testid="activity-loading">
            {Array.from({ length: 5 }).map((_, index) => (
              <ActivityItemSkeleton key={index} />
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div
            data-testid="activity-empty-state"
            style={{
              padding: componentSpacing.xl,
            }}
          >
            <EmptyState
              title="No recent activity"
              description="Activity will appear here as threats are detected and updated"
            />
          </div>
        ) : (
          <ul
            data-testid="activity-list"
            style={{
              listStyle: 'none',
              margin: spacing[0],
              padding: spacing[0],
              maxHeight: spacing[64],
              overflowY: 'auto',
            }}
          >
            {displayItems.map((item, index) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  gap: spacing[3],
                  padding: componentSpacing.md,
                  borderBottom: index < displayItems.length - 1
                    ? `${borders.width.thin} solid ${colors.border.default}`
                    : 'none',
                  cursor: item.threatId || onItemClick ? 'pointer' : 'default',
                  transition: `background-color ${motion.duration.fast} ${motion.easing.default}`,
                  backgroundColor: 'transparent',
                }}
                onClick={() => handleItemClick(item)}
                onMouseEnter={(e) => {
                  if (item.threatId || onItemClick) {
                    e.currentTarget.style.backgroundColor = colors.background.secondary;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleItemClick(item);
                  }
                }}
                aria-label={`${item.type}: ${item.title}`}
              >
                <ActivityIcon type={item.type} />

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      marginBottom: spacing[1],
                    }}
                  >
                    <h3
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        margin: spacing[0],
                        lineHeight: typography.lineHeight.tight,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                    </h3>
                    {item.severity && <SeverityBadge severity={item.severity} />}
                  </div>

                  <p
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      margin: spacing[0],
                      marginBottom: spacing[1],
                      lineHeight: typography.lineHeight.normal,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {item.description}
                  </p>

                  <time
                    dateTime={item.timestamp}
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.muted,
                      lineHeight: typography.lineHeight.normal,
                    }}
                  >
                    {formatRelativeTime(item.timestamp)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;

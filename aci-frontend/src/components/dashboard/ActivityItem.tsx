import React from 'react';
import { Plus, RefreshCw, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { colors } from '@/styles/tokens/colors';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { cn } from '@/lib/utils';

export interface ActivityItemProps {
  id: string;
  type: 'new_threat' | 'updated_threat' | 'alert_triggered';
  title: string;
  description: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  onClick?: () => void;
}

/**
 * Format timestamp to relative time (e.g., "2m ago", "1h ago", "2d ago")
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Get icon component based on activity type
 */
function getActivityIcon(type: ActivityItemProps['type']) {
  const iconProps = {
    size: 16,
    'data-testid': 'activity-item-icon',
  };

  switch (type) {
    case 'new_threat':
      return <Plus {...iconProps} />;
    case 'updated_threat':
      return <RefreshCw {...iconProps} />;
    case 'alert_triggered':
      return <Bell {...iconProps} />;
  }
}

/**
 * Get severity badge variant and custom styles
 */
function getSeverityBadgeProps(severity: ActivityItemProps['severity']) {
  if (!severity) return null;

  const baseProps = {
    'data-testid': 'activity-item-severity',
  };

  switch (severity) {
    case 'critical':
      return {
        ...baseProps,
        variant: 'destructive' as const,
        children: 'Critical',
      };
    case 'high':
      return {
        ...baseProps,
        variant: 'default' as const,
        children: 'High',
        style: {
          backgroundColor: colors.severity.high,
          color: colors.text.primary,
          borderColor: 'transparent',
        },
      };
    case 'medium':
      return {
        ...baseProps,
        variant: 'secondary' as const,
        children: 'Medium',
      };
    case 'low':
      return {
        ...baseProps,
        variant: 'outline' as const,
        children: 'Low',
      };
  }
}

/**
 * ActivityItem Component
 *
 * Displays individual activity item in the activity feed with:
 * - Type-specific icon (new, updated, alert)
 * - Title and description (truncated)
 * - Optional severity badge
 * - Relative timestamp with full date tooltip
 * - Keyboard and click interaction support
 */
export function ActivityItem({
  type,
  title,
  description,
  severity,
  timestamp,
  onClick,
}: ActivityItemProps) {
  const isClickable = Boolean(onClick);
  const relativeTime = formatRelativeTime(timestamp);
  const fullTimestamp = new Date(timestamp).toLocaleString();
  const icon = getActivityIcon(type);
  const severityBadgeProps = getSeverityBadgeProps(severity);

  // Generate accessible label
  const ariaLabel = `${type.replace('_', ' ')}: ${title}. ${description}${
    severity ? `. Severity: ${severity}` : ''
  }. ${relativeTime}`;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role={isClickable ? 'button' : 'listitem'}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={ariaLabel}
      data-testid="activity-item"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-start gap-3 rounded-lg border transition-colors',
        isClickable &&
          'cursor-pointer hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      style={{
        padding: spacing[3],
        borderColor: colors.border.default,
      }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{
          width: spacing[8],
          height: spacing[8],
          backgroundColor: colors.background.secondary,
          color: colors.text.secondary,
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Title */}
        <h4
          data-testid="activity-item-title"
          className="truncate"
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            lineHeight: typography.lineHeight.tight,
            color: colors.text.primary,
          }}
        >
          {title}
        </h4>

        {/* Description */}
        <p
          className="truncate"
          style={{
            fontSize: typography.fontSize.xs,
            lineHeight: typography.lineHeight.normal,
            color: colors.text.muted,
          }}
        >
          {description}
        </p>

        {/* Severity Badge */}
        {severityBadgeProps && (
          <Badge
            variant={severityBadgeProps.variant}
            style={'style' in severityBadgeProps ? severityBadgeProps.style : undefined}
            data-testid={severityBadgeProps['data-testid']}
          >
            {severityBadgeProps.children}
          </Badge>
        )}
      </div>

      {/* Timestamp */}
      <div className="flex-shrink-0" title={fullTimestamp}>
        <time
          dateTime={timestamp}
          data-testid="activity-item-time"
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
          }}
        >
          {relativeTime}
        </time>
      </div>
    </div>
  );
}

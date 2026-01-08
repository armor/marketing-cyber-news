/**
 * CalendarEntry Component
 *
 * Custom event component for react-big-calendar.
 * Displays newsletter event with status indicator, channel icon, and content preview.
 */

import { Mail, Calendar, Clock } from 'lucide-react';
import type { IssueStatus } from '@/types/newsletter';
import type { CalendarEvent } from '@/hooks/useCalendar';

interface CalendarEntryProps {
  event: CalendarEvent;
}

/**
 * Get status color based on issue status
 */
function getStatusColor(status: IssueStatus): string {
  switch (status) {
    case 'draft':
      return 'var(--color-text-muted)';
    case 'pending_approval':
      return 'var(--color-warning)';
    case 'approved':
      return 'var(--color-success)';
    case 'scheduled':
      return 'var(--color-brand-primary)';
    case 'sent':
      return 'var(--color-text-secondary)';
    case 'failed':
      return 'var(--color-critical)';
    default:
      return 'var(--color-text-muted)';
  }
}

/**
 * Get status indicator style
 */
function getStatusStyle(status: IssueStatus): React.CSSProperties {
  const color = getStatusColor(status);
  return {
    width: '4px',
    height: '100%',
    backgroundColor: color,
    borderRadius: '2px 0 0 2px',
    position: 'absolute',
    left: 0,
    top: 0,
  };
}

export function CalendarEntry({ event }: CalendarEntryProps) {
  const { title, resource } = event;
  const { status, contentPreview } = resource;

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        padding: 'var(--spacing-2) var(--spacing-3)',
        paddingLeft: 'var(--spacing-3)',
        backgroundColor: 'var(--color-bg-elevated)',
        borderRadius: 'var(--border-radius-md)',
        border: '1px solid var(--color-border-default)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all var(--motion-duration-fast) var(--motion-easing-default)',
      }}
      className="calendar-entry hover:shadow-md"
    >
      {/* Status indicator */}
      <div style={getStatusStyle(status)} />

      {/* Event header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--spacing-2)',
          marginBottom: 'var(--spacing-1)',
        }}
      >
        {/* Channel icon */}
        <Mail
          size={14}
          style={{
            color: 'var(--color-brand-primary)',
            flexShrink: 0,
            marginTop: '2px',
          }}
        />

        {/* Title */}
        <div
          style={{
            flex: 1,
            fontSize: 'var(--typography-font-size-sm)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-primary)',
            lineHeight: 'var(--typography-line-height-tight)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </div>
      </div>

      {/* Content preview */}
      <div
        style={{
          fontSize: 'var(--typography-font-size-xs)',
          color: 'var(--color-text-muted)',
          lineHeight: 'var(--typography-line-height-tight)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginTop: 'var(--spacing-1)',
        }}
      >
        {contentPreview}
      </div>

      {/* Status badge */}
      <div
        style={{
          marginTop: 'var(--spacing-2)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--spacing-1)',
          padding: '2px var(--spacing-2)',
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: 'var(--typography-font-size-xs)',
          fontWeight: 'var(--typography-font-weight-medium)',
          color: getStatusColor(status),
          textTransform: 'capitalize',
        }}
      >
        {status === 'scheduled' && <Clock size={10} />}
        {status === 'sent' && <Calendar size={10} />}
        {status.replace(/_/g, ' ')}
      </div>
    </div>
  );
}

/**
 * Minimal event component for month view (shows only title and status dot)
 */
export function CalendarEntryMinimal({ event }: CalendarEntryProps) {
  const { title, resource } = event;
  const { status } = resource;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-1)',
        padding: '2px var(--spacing-2)',
        fontSize: 'var(--typography-font-size-xs)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Status dot */}
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(status),
          flexShrink: 0,
        }}
      />

      {/* Title */}
      <span
        style={{
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </span>
    </div>
  );
}

/**
 * ThreatTimeline Component
 * Displays attack timeline with phase color-coding
 *
 * Features:
 * - Vertical timeline with phase color-coding
 * - Date, event name, details
 * - Empty state handling
 *
 * Used in: DeepDiveSection
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/types/threat';
import { Badge } from '@/components/ui/badge';
import { colors } from '@/styles/tokens/colors';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';

export interface ThreatTimelineProps {
  /**
   * Array of timeline events to display
   */
  readonly timeline: readonly TimelineEvent[];
  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Maps timeline phases to badge variants and labels
 */
const PHASE_CONFIG: Record<
  TimelineEvent['phase'],
  { variant: 'critical' | 'warning' | 'info' | 'success'; label: string }
> = {
  initial_access: { variant: 'critical', label: 'Initial Access' },
  execution: { variant: 'critical', label: 'Execution' },
  persistence: { variant: 'warning', label: 'Persistence' },
  privilege_escalation: { variant: 'warning', label: 'Privilege Escalation' },
  defense_evasion: { variant: 'warning', label: 'Defense Evasion' },
  credential_access: { variant: 'warning', label: 'Credential Access' },
  discovery: { variant: 'info', label: 'Discovery' },
  lateral_movement: { variant: 'info', label: 'Lateral Movement' },
  collection: { variant: 'info', label: 'Collection' },
  exfiltration: { variant: 'critical', label: 'Exfiltration' },
  impact: { variant: 'critical', label: 'Impact' },
};

/**
 * Formats ISO date string to human-readable format with time
 */
function formatTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * ThreatTimeline - Vertical timeline of attack progression
 *
 * Features:
 * - Vertical timeline layout
 * - Phase color-coding
 * - Timestamp formatting
 * - Event details
 * - Empty state
 *
 * @example
 * ```tsx
 * const timeline: TimelineEvent[] = [
 *   {
 *     timestamp: '2024-01-15T10:30:00Z',
 *     event: 'Phishing email sent',
 *     phase: 'initial_access',
 *     details: 'Spearphishing attachment delivered to 50 users',
 *   },
 * ];
 *
 * <ThreatTimeline timeline={timeline} />
 * ```
 */
export function ThreatTimeline({
  timeline,
  className,
}: ThreatTimelineProps): React.JSX.Element {
  // Guard: Empty state
  if (timeline.length === 0) {
    return (
      <div
        data-testid="threat-timeline-empty"
        style={{
          padding: spacing[6],
          textAlign: 'center',
          color: colors.text.muted,
          fontSize: typography.fontSize.sm,
        }}
        className={className}
      >
        No timeline events available.
      </div>
    );
  }

  return (
    <div
      data-testid="threat-timeline"
      aria-label="Attack timeline"
      className={cn('flex flex-col', className)}
      style={{
        position: 'relative',
      }}
    >
      {/* Timeline Line */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '15px',
          top: spacing[6],
          bottom: spacing[6],
          width: '2px',
          backgroundColor: colors.border.default,
        }}
      />

      {/* Timeline Events */}
      <ul
        role="list"
        aria-label="Timeline events"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[6],
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {timeline.map((event, index) => {
          const phaseConfig = PHASE_CONFIG[event.phase];
          const formattedTime = formatTimestamp(event.timestamp);

          return (
            <li
              key={`${event.timestamp}-${index}`}
              role="listitem"
              data-testid="timeline-event"
              data-phase={event.phase}
              style={{
                position: 'relative',
                display: 'flex',
                gap: spacing[4],
                paddingLeft: spacing[10],
              }}
            >
              {/* Timeline Dot */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '7px',
                  top: spacing[1],
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: colors.background.primary,
                  border: `3px solid`,
                  borderColor:
                    phaseConfig.variant === 'critical'
                      ? colors.severity.critical
                      : phaseConfig.variant === 'warning'
                        ? colors.severity.high
                        : phaseConfig.variant === 'info'
                          ? colors.severity.medium
                          : colors.severity.low,
                }}
              />

              {/* Event Content */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing[2],
                  flex: 1,
                  minWidth: 0,
                  padding: spacing[4],
                  backgroundColor: colors.background.elevated,
                  borderRadius: 'var(--border-radius-md)',
                  border: `1px solid ${colors.border.default}`,
                }}
              >
                {/* Timestamp */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                  }}
                >
                  <Clock size={14} aria-hidden="true" style={{ color: colors.text.muted }} />
                  <time
                    dateTime={event.timestamp}
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.muted,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    {formattedTime}
                  </time>
                </div>

                {/* Event Name */}
                <h4
                  style={{
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                    margin: 0,
                  }}
                >
                  {event.event}
                </h4>

                {/* Phase Badge */}
                <Badge variant={phaseConfig.variant} style={{ alignSelf: 'flex-start' }}>
                  {phaseConfig.label}
                </Badge>

                {/* Event Details */}
                {event.details && (
                  <p
                    style={{
                      fontSize: typography.fontSize.sm,
                      lineHeight: typography.lineHeight.relaxed,
                      color: colors.text.secondary,
                      margin: 0,
                    }}
                  >
                    {event.details}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Accessibility Notes:
 * - Semantic <ul> and <li> elements
 * - role="list" for explicit list semantics
 * - aria-label on container and list
 * - <time> elements with datetime attributes
 * - Decorative elements (dots, lines) hidden from screen readers
 * - Proper heading hierarchy (h4)
 *
 * Performance Notes:
 * - Pure presentational component
 * - No state management
 * - Efficient rendering (single loop)
 * - Suitable for long timelines (50+ events)
 *
 * Design Token Usage:
 * - Colors: colors.text.*, colors.background.*, colors.border.*, colors.severity.*
 * - Spacing: spacing[1-10]
 * - Typography: typography.fontSize.*, typography.fontWeight.*, typography.lineHeight.*
 *
 * Testing:
 * - data-testid="threat-timeline" for container
 * - data-testid="threat-timeline-empty" for empty state
 * - data-testid="timeline-event" for individual events
 * - data-phase attribute for phase identification
 */

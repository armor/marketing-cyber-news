/**
 * DayDetail Component
 *
 * Sidebar/modal showing all events for a selected day with full content details.
 * Displays newsletter issues scheduled for the selected date.
 */

import { format } from 'date-fns';
import { Mail, Clock, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CalendarEvent } from '@/hooks/useCalendar';
import type { IssueStatus } from '@/types/newsletter';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface DayDetailProps {
  date: Date | null;
  events: CalendarEvent[];
  isOpen: boolean;
  onClose: () => void;
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
 * Format status label
 */
function formatStatus(status: IssueStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function DayDetail({ date, events, isOpen, onClose }: DayDetailProps) {
  const navigate = useNavigate();

  if (!date) return null;

  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

  const handleEventClick = (event: CalendarEvent) => {
    // Navigate to newsletter preview/edit page
    navigate(`/newsletter/issues/${event.id}`);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        style={{
          width: '480px',
          maxWidth: '90vw',
          backgroundColor: 'var(--color-bg-primary)',
          borderLeft: '1px solid var(--color-border-default)',
          padding: 0,
        }}
      >
        <SheetHeader
          style={{
            padding: 'var(--spacing-6)',
            borderBottom: '1px solid var(--color-border-default)',
            backgroundColor: 'var(--color-bg-elevated)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 'var(--spacing-4)',
            }}
          >
            <div style={{ flex: 1 }}>
              <SheetTitle
                style={{
                  fontSize: 'var(--typography-font-size-xl)',
                  fontWeight: 'var(--typography-font-weight-bold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-1)',
                }}
              >
                {formattedDate}
              </SheetTitle>
              <SheetDescription
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {events.length} {events.length === 1 ? 'event' : 'events'} scheduled
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Events list */}
        <div
          style={{
            padding: 'var(--spacing-6)',
            overflowY: 'auto',
            height: 'calc(100vh - 120px)',
          }}
        >
          {sortedEvents.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--spacing-12) 0',
                textAlign: 'center',
              }}
            >
              <CalendarIcon
                size={48}
                style={{
                  color: 'var(--color-text-muted)',
                  marginBottom: 'var(--spacing-4)',
                }}
              />
              <p
                style={{
                  fontSize: 'var(--typography-font-size-base)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                No events scheduled for this day
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-4)',
              }}
            >
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--border-radius-lg)',
                    cursor: 'pointer',
                    transition: 'all var(--motion-duration-fast) var(--motion-easing-default)',
                  }}
                  onClick={() => handleEventClick(event)}
                  className="hover:shadow-md"
                >
                  {/* Event header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--spacing-3)',
                      marginBottom: 'var(--spacing-3)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--border-radius-lg)',
                        backgroundColor: 'var(--color-bg-secondary)',
                        flexShrink: 0,
                      }}
                    >
                      <Mail size={20} style={{ color: 'var(--color-brand-primary)' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: 'var(--typography-font-size-base)',
                          fontWeight: 'var(--typography-font-weight-semibold)',
                          color: 'var(--color-text-primary)',
                          marginBottom: 'var(--spacing-1)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {event.title}
                      </h3>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--spacing-2)',
                          fontSize: 'var(--typography-font-size-sm)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <Clock size={14} />
                        {format(event.start, 'h:mm a')}
                      </div>
                    </div>
                  </div>

                  {/* Content preview */}
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 'var(--typography-line-height-normal)',
                      marginBottom: 'var(--spacing-3)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {event.resource.contentPreview}
                  </p>

                  {/* Meta info */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--spacing-3)',
                      paddingTop: 'var(--spacing-3)',
                      borderTop: '1px solid var(--color-border-default)',
                    }}
                  >
                    {/* Status badge */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-1)',
                        padding: '4px var(--spacing-2)',
                        fontSize: 'var(--typography-font-size-xs)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        color: getStatusColor(event.resource.status),
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--border-radius-sm)',
                      }}
                    >
                      {formatStatus(event.resource.status)}
                    </div>

                    {/* View details button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-1)',
                      }}
                    >
                      View details
                      <ExternalLink size={14} />
                    </Button>
                  </div>

                  {/* Additional issue metadata */}
                  {event.resource.issue.total_recipients > 0 && (
                    <div
                      style={{
                        marginTop: 'var(--spacing-2)',
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {event.resource.issue.total_recipients.toLocaleString()} recipients
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

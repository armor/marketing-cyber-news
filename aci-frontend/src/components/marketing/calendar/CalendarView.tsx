/**
 * CalendarView Component
 *
 * Main calendar component using react-big-calendar.
 * Features:
 * - Monthly/weekly view toggle
 * - Color-coded events by status
 * - Click to view content details
 * - Drag-drop to reschedule
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  dateFnsLocalizer,
  type View,
  type SlotInfo,
  type NavigateAction,
} from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarEntry, CalendarEntryMinimal } from './CalendarEntry';
import { DayDetail } from './DayDetail';
import { useCalendar, type CalendarEvent } from '@/hooks/useCalendar';
import type { IssueStatus } from '@/types/newsletter';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Configure date-fns localizer
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface CalendarViewProps {
  selectedStatuses?: IssueStatus[];
  selectedConfigId?: string;
}

export function CalendarView({
  selectedStatuses = [],
  selectedConfigId,
}: CalendarViewProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);

  // Fetch calendar events
  const { data: events = [], isLoading } = useCalendar({
    configurationId: selectedConfigId,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
  });

  // Filter events based on selected day
  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];

    const startOfDay = new Date(selectedDay);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDay);
    endOfDay.setHours(23, 59, 59, 999);

    return events.filter(
      (event) =>
        event.start >= startOfDay && event.start <= endOfDay
    );
  }, [events, selectedDay]);

  // Handle event click
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    const eventDate = new Date(event.start);
    eventDate.setHours(0, 0, 0, 0);
    setSelectedDay(eventDate);
    setDayDetailOpen(true);
  }, []);

  // Handle slot selection (day click)
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    const slotDate = new Date(slotInfo.start);
    slotDate.setHours(0, 0, 0, 0);
    setSelectedDay(slotDate);
    setDayDetailOpen(true);
  }, []);

  // Note: Drag-drop rescheduling requires react-big-calendar DnD addon
  // For now, users can reschedule via the day detail sidebar

  // Custom event style getter (color-code by status)
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const { status } = event.resource;

    let backgroundColor = 'var(--color-bg-elevated)';
    let borderColor = 'var(--color-border-default)';

    switch (status) {
      case 'draft':
        borderColor = 'var(--color-text-muted)';
        break;
      case 'pending_approval':
        borderColor = 'var(--color-warning)';
        break;
      case 'approved':
        borderColor = 'var(--color-success)';
        break;
      case 'scheduled':
        borderColor = 'var(--color-brand-primary)';
        break;
      case 'sent':
        borderColor = 'var(--color-text-secondary)';
        backgroundColor = 'var(--color-bg-secondary)';
        break;
      case 'failed':
        borderColor = 'var(--color-critical)';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 'var(--border-radius-md)',
        padding: 'var(--spacing-1)',
      },
    };
  }, []);

  // Custom toolbar
  interface CustomToolbarProps {
    label: string;
    onNavigate: (action: NavigateAction) => void;
    onView: (view: View) => void;
  }
  const CustomToolbar = ({ label, onNavigate, onView }: CustomToolbarProps) => {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-4)',
          padding: 'var(--spacing-4)',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--color-border-default)',
        }}
      >
        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
          }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('PREV')}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('TODAY')}
          >
            Today
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('NEXT')}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </Button>

          <h2
            style={{
              marginLeft: 'var(--spacing-4)',
              fontSize: 'var(--typography-font-size-xl)',
              fontWeight: 'var(--typography-font-weight-bold)',
              color: 'var(--color-text-primary)',
            }}
          >
            {label}
          </h2>
        </div>

        {/* View toggle */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-1)',
            padding: 'var(--spacing-1)',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--border-radius-md)',
          }}
        >
          <Button
            variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onView('month')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-1)',
            }}
          >
            <CalendarIcon size={16} />
            Month
          </Button>

          <Button
            variant={view === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onView('week')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-1)',
            }}
          >
            <List size={16} />
            Week
          </Button>

          <Button
            variant={view === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onView('day')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-1)',
            }}
          >
            <CalendarIcon size={16} />
            Day
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '600px',
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        height: 'calc(100vh - 200px)',
        minHeight: '600px',
      }}
      className="calendar-container"
    >
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        eventPropGetter={eventStyleGetter}
        components={{
          toolbar: CustomToolbar,
          event: view === 'month' ? CalendarEntryMinimal : CalendarEntry,
        }}
        selectable
        style={{
          height: '100%',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 'var(--border-radius-lg)',
          padding: 'var(--spacing-4)',
        }}
      />

      {/* Day detail sidebar */}
      <DayDetail
        date={selectedDay}
        events={dayEvents}
        isOpen={dayDetailOpen}
        onClose={() => setDayDetailOpen(false)}
      />

      {/* Custom styles for react-big-calendar */}
      <style>{`
        .calendar-container .rbc-calendar {
          font-family: var(--typography-font-family-body);
        }

        .calendar-container .rbc-header {
          padding: var(--spacing-3);
          font-weight: var(--typography-font-weight-semibold);
          color: var(--color-text-primary);
          border-bottom: 1px solid var(--color-border-default);
          background-color: var(--color-bg-secondary);
        }

        .calendar-container .rbc-month-view,
        .calendar-container .rbc-time-view {
          border: 1px solid var(--color-border-default);
          border-radius: var(--border-radius-md);
          overflow: hidden;
        }

        .calendar-container .rbc-day-bg {
          background-color: var(--color-bg-primary);
          border-left: 1px solid var(--color-border-default);
        }

        .calendar-container .rbc-today {
          background-color: var(--color-bg-elevated);
        }

        .calendar-container .rbc-off-range-bg {
          background-color: var(--color-bg-secondary);
          opacity: 0.5;
        }

        .calendar-container .rbc-date-cell {
          padding: var(--spacing-2);
          text-align: right;
        }

        .calendar-container .rbc-date-cell.rbc-now {
          font-weight: var(--typography-font-weight-bold);
          color: var(--color-brand-primary);
        }

        .calendar-container .rbc-event {
          background-color: transparent;
          border: none;
          padding: 0;
        }

        .calendar-container .rbc-event:hover {
          box-shadow: var(--shadow-md);
        }

        .calendar-container .rbc-event-label {
          display: none;
        }

        .calendar-container .rbc-show-more {
          color: var(--color-brand-primary);
          font-weight: var(--typography-font-weight-medium);
          font-size: var(--typography-font-size-xs);
          padding: var(--spacing-1) var(--spacing-2);
        }

        .calendar-container .rbc-time-slot {
          border-top: 1px solid var(--color-border-default);
        }

        .calendar-container .rbc-time-header-content {
          border-left: 1px solid var(--color-border-default);
        }

        .calendar-container .rbc-time-content {
          border-top: 1px solid var(--color-border-default);
        }

        .calendar-container .rbc-current-time-indicator {
          background-color: var(--color-brand-primary);
          height: 2px;
        }
      `}</style>
    </div>
  );
}

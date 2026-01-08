import * as React from 'react';
import { Calendar, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ContentChannel } from '@/types/content-studio';

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ContentChannel;
  onSchedule: (scheduledTime: string) => void;
  isScheduling?: boolean;
}

/**
 * ScheduleDialog - Schedule content for future publication
 *
 * Features:
 * - Date and time picker
 * - Channel confirmation
 * - Validation (no past dates)
 * - Accessible form controls
 */
export function ScheduleDialog({
  open,
  onOpenChange,
  channel,
  onSchedule,
  isScheduling = false,
}: ScheduleDialogProps) {
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');

  // Set default to tomorrow at 9 AM
  React.useEffect(() => {
    if (open) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const dateStr = tomorrow.toISOString().split('T')[0];
      const timeStr = '09:00';

      setDate(dateStr);
      setTime(timeStr);
    }
  }, [open]);

  const getChannelName = (channel: ContentChannel) => {
    const names = {
      linkedin: 'LinkedIn',
      twitter: 'Twitter',
      email: 'Email',
      blog: 'Blog',
    };
    return names[channel];
  };

  const handleSchedule = () => {
    if (!date || !time) return;

    // Combine date and time into ISO string
    const scheduledDateTime = new Date(`${date}T${time}`).toISOString();
    onSchedule(scheduledDateTime);
  };

  const isValidSchedule = () => {
    if (!date || !time) return false;

    const scheduledDateTime = new Date(`${date}T${time}`);
    const now = new Date();

    // Must be in the future
    return scheduledDateTime > now;
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="schedule-description">
        <DialogHeader>
          <DialogTitle>Schedule Content</DialogTitle>
          <DialogDescription id="schedule-description">
            Choose when to publish your content to {getChannelName(channel)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
          {/* Date Input */}
          <div className="flex flex-col" style={{ gap: 'var(--spacing-2)' }}>
            <label
              htmlFor="schedule-date"
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                fontFamily: 'var(--typography-font-family-sans)',
                fontWeight: 'var(--typography-font-weight-semibold)',
                color: 'var(--color-text-primary)',
              }}
            >
              Date
            </label>
            <div className="relative">
              <Calendar
                style={{
                  position: 'absolute',
                  left: 'var(--spacing-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 'var(--spacing-4)',
                  height: 'var(--spacing-4)',
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none',
                }}
                aria-hidden="true"
              />
              <Input
                id="schedule-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={getMinDate()}
                disabled={isScheduling}
                aria-required="true"
                style={{
                  paddingLeft: 'var(--spacing-10)',
                }}
              />
            </div>
          </div>

          {/* Time Input */}
          <div className="flex flex-col" style={{ gap: 'var(--spacing-2)' }}>
            <label
              htmlFor="schedule-time"
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                fontFamily: 'var(--typography-font-family-sans)',
                fontWeight: 'var(--typography-font-weight-semibold)',
                color: 'var(--color-text-primary)',
              }}
            >
              Time
            </label>
            <div className="relative">
              <Clock
                style={{
                  position: 'absolute',
                  left: 'var(--spacing-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 'var(--spacing-4)',
                  height: 'var(--spacing-4)',
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none',
                }}
                aria-hidden="true"
              />
              <Input
                id="schedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isScheduling}
                aria-required="true"
                style={{
                  paddingLeft: 'var(--spacing-10)',
                }}
              />
            </div>
          </div>

          {/* Confirmation Info */}
          <div
            className="rounded-lg"
            style={{
              padding: 'var(--spacing-3)',
              background: 'var(--gradient-badge-info)',
              border: `var(--border-width-thin) solid var(--color-brand-primary)`,
            }}
          >
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                fontFamily: 'var(--typography-font-family-sans)',
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              Your content will be published to{' '}
              <strong
                style={{
                  fontWeight: 'var(--typography-font-weight-semibold)',
                }}
              >
                {getChannelName(channel)}
              </strong>
              {date && time && (
                <>
                  {' '}
                  on{' '}
                  <strong
                    style={{
                      fontWeight: 'var(--typography-font-weight-semibold)',
                    }}
                  >
                    {new Date(`${date}T${time}`).toLocaleString(undefined, {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                  </strong>
                </>
              )}
            </p>
          </div>

          {!isValidSchedule() && date && time && (
            <div
              className="rounded-lg"
              style={{
                padding: 'var(--spacing-3)',
                background: 'var(--gradient-badge-critical)',
                border: `var(--border-width-thin) solid var(--color-semantic-error)`,
              }}
              role="alert"
            >
              <p
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  fontFamily: 'var(--typography-font-family-sans)',
                  color: 'var(--color-semantic-error)',
                  margin: 0,
                }}
              >
                Schedule time must be in the future
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isScheduling}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSchedule}
            disabled={!isValidSchedule() || isScheduling}
            aria-busy={isScheduling}
          >
            {isScheduling ? (
              <>
                <div
                  className="animate-spin rounded-full border-2 border-current border-t-transparent"
                  style={{
                    width: 'var(--spacing-4)',
                    height: 'var(--spacing-4)',
                  }}
                  aria-hidden="true"
                />
                Scheduling...
              </>
            ) : (
              'Schedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

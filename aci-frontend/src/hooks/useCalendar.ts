/**
 * useCalendar Hook
 *
 * Custom hook for fetching calendar events (newsletter issues scheduled for publication).
 * Transforms newsletter issues into calendar events for react-big-calendar.
 */

import { useQuery } from '@tanstack/react-query';
import { newsletterKeys } from './newsletterKeys';
import type { NewsletterIssue, IssueStatus } from '@/types/newsletter';
import { newsletterApi } from '@/services/api/newsletter';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    issue: NewsletterIssue;
    status: IssueStatus;
    channel: string; // Email/Newsletter
    contentPreview: string;
  };
}

interface UseCalendarOptions {
  startDate?: Date;
  endDate?: Date;
  configurationId?: string;
  status?: IssueStatus[];
}

/**
 * Transform newsletter issue to calendar event
 */
function issueToEvent(issue: NewsletterIssue): CalendarEvent {
  const scheduledDate = issue.scheduled_for
    ? new Date(issue.scheduled_for)
    : issue.issue_date
    ? new Date(issue.issue_date)
    : new Date();

  // Events last 1 hour by default
  const endDate = new Date(scheduledDate);
  endDate.setHours(endDate.getHours() + 1);

  // Build content preview from blocks
  const contentPreview = issue.blocks
    .slice(0, 2)
    .map((block) => block.title)
    .join(' • ') || 'No content';

  return {
    id: issue.id,
    title: issue.subject_line || `Newsletter #${issue.issue_number || 'Draft'}`,
    start: scheduledDate,
    end: endDate,
    resource: {
      issue,
      status: issue.status,
      channel: 'Email',
      contentPreview,
    },
  };
}

export function useCalendar(options: UseCalendarOptions = {}) {
  const { startDate, endDate, configurationId, status } = options;

  return useQuery({
    queryKey: newsletterKeys.calendar(startDate, endDate, configurationId, status),
    queryFn: async () => {
      // Fetch all issues (could be filtered by date range on backend)
      const response = await newsletterApi.getIssues({
        page: 1,
        page_size: 100, // Get all issues for calendar view
        configuration_id: configurationId,
        status: status?.join(',') as IssueStatus | undefined,
      });

      // Transform issues to calendar events
      const events = response.data
        .filter((issue) => {
          // Only show issues with scheduled dates
          if (!issue.scheduled_for && !issue.issue_date) return false;

          // Apply date range filter
          const issueDate = new Date(issue.scheduled_for || issue.issue_date || '');
          if (startDate && issueDate < startDate) return false;
          if (endDate && issueDate > endDate) return false;

          return true;
        })
        .map(issueToEvent);

      return events;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  });
}

/**
 * Get events for a specific day
 */
export function useCalendarDay(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: events = [], ...rest } = useCalendar({
    startDate: startOfDay,
    endDate: endOfDay,
  });

  return {
    events,
    ...rest,
  };
}

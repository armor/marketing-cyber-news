/**
 * useCalendarMutations Hook
 *
 * Custom hook for calendar event mutations (reschedule, update).
 * Handles drag-drop rescheduling and event updates.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { newsletterKeys } from './newsletterKeys';
import { newsletterApi } from '@/services/api/newsletter';

interface RescheduleEventParams {
  issueId: string;
  newDate: Date;
}

export function useCalendarMutations() {
  const queryClient = useQueryClient();

  /**
   * Reschedule a newsletter issue
   */
  const reschedule = useMutation({
    mutationFn: async ({ issueId, newDate }: RescheduleEventParams) => {
      // Format date to ISO string
      const scheduled_for = newDate.toISOString();

      return await newsletterApi.updateIssue(issueId, {
        scheduled_for,
      });
    },
    onSuccess: (data) => {
      toast.success('Event rescheduled successfully');

      // Invalidate all calendar queries
      queryClient.invalidateQueries({ queryKey: newsletterKeys.calendar() });

      // Also invalidate the specific issue
      queryClient.invalidateQueries({ queryKey: newsletterKeys.issue(data.id) });
    },
    onError: (error: Error) => {
      toast.error('Failed to reschedule event', {
        description: error.message,
      });
    },
  });

  /**
   * Delete a calendar event (newsletter issue)
   */
  const deleteEvent = useMutation({
    mutationFn: async (issueId: string) => {
      return await newsletterApi.deleteIssue(issueId);
    },
    onSuccess: () => {
      toast.success('Event deleted successfully');
      queryClient.invalidateQueries({ queryKey: newsletterKeys.calendar() });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete event', {
        description: error.message,
      });
    },
  });

  return {
    reschedule,
    deleteEvent,
  };
}

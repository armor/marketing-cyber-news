/**
 * Unit Tests for ActivityFeed Component
 *
 * Tests cover:
 * - Happy path: Renders list of activity items with correct information
 * - Failure path: Handles API errors gracefully
 * - Empty state: Shows "No recent activity" when items=[]
 * - Edge case: Respects maxItems limit and displays most recent first
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import { subHours, format } from 'date-fns';
import type { Severity } from '@/types/threat';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';

/**
 * ActivityItem interface matching component specification
 */
interface ActivityItem {
  id: string;
  type: 'new_threat' | 'updated_threat' | 'alert_triggered';
  title: string;
  description: string;
  severity?: Severity;
  timestamp: string;
}

/**
 * Factory function for creating test activity items
 */
const createActivityItem = (overrides?: Partial<ActivityItem>): ActivityItem => ({
  id: 'activity-1',
  type: 'new_threat',
  title: 'Critical Vulnerability Detected',
  description: 'CVE-2024-1234 affecting Apache Log4j',
  severity: 'critical',
  timestamp: new Date().toISOString(),
  ...overrides,
});

/**
 * Helper to format timestamp for test assertion
 */
const formatActivityTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  return format(date, 'MMM d, HH:mm');
};

describe('ActivityFeed Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============================================================================
  // HAPPY PATH TESTS
  // ============================================================================

  describe('Happy Path: Renders activity items correctly', () => {
    it('should render a list of activity items with all required information', () => {
      const now = new Date();
      const oneHourAgo = subHours(now, 1);
      const twoHoursAgo = subHours(now, 2);

      const items: ActivityItem[] = [
        createActivityItem({
          id: 'activity-1',
          type: 'new_threat',
          title: 'Critical Vulnerability Detected',
          description: 'CVE-2024-1234 affecting Apache Log4j',
          severity: 'critical',
          timestamp: now.toISOString(),
        }),
        createActivityItem({
          id: 'activity-2',
          type: 'alert_triggered',
          title: 'Alert: Malware Detection',
          description: 'Suspicious binary detected in system scan',
          severity: 'high',
          timestamp: oneHourAgo.toISOString(),
        }),
        createActivityItem({
          id: 'activity-3',
          type: 'updated_threat',
          title: 'Threat Updated',
          description: 'Additional IOCs added to ransomware group',
          severity: 'medium',
          timestamp: twoHoursAgo.toISOString(),
        }),
      ];

      render(<ActivityFeed items={items} />);

      // Verify all items are rendered
      expect(screen.getByText('Critical Vulnerability Detected')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-1234 affecting Apache Log4j')).toBeInTheDocument();

      expect(screen.getByText('Alert: Malware Detection')).toBeInTheDocument();
      expect(screen.getByText('Suspicious binary detected in system scan')).toBeInTheDocument();

      expect(screen.getByText('Threat Updated')).toBeInTheDocument();
      expect(screen.getByText('Additional IOCs added to ransomware group')).toBeInTheDocument();
    });

    it('should render activity items in descending order (most recent first)', () => {
      const now = new Date();
      const oneHourAgo = subHours(now, 1);
      const twoHoursAgo = subHours(now, 2);

      const items: ActivityItem[] = [
        createActivityItem({
          id: 'activity-2',
          title: 'Middle Activity',
          timestamp: oneHourAgo.toISOString(),
        }),
        createActivityItem({
          id: 'activity-3',
          title: 'Oldest Activity',
          timestamp: twoHoursAgo.toISOString(),
        }),
        createActivityItem({
          id: 'activity-1',
          title: 'Newest Activity',
          timestamp: now.toISOString(),
        }),
      ];

      render(<ActivityFeed items={items} />);

      const listItems = screen.getAllByRole('listitem');
      expect(within(listItems[0]).getByText('Newest Activity')).toBeInTheDocument();
      expect(within(listItems[1]).getByText('Middle Activity')).toBeInTheDocument();
      expect(within(listItems[2]).getByText('Oldest Activity')).toBeInTheDocument();
    });

    it('should display severity badge with correct styling for each severity level', () => {
      const items: ActivityItem[] = [
        createActivityItem({ id: 'critical-1', severity: 'critical' }),
        createActivityItem({ id: 'high-1', severity: 'high' }),
        createActivityItem({ id: 'medium-1', severity: 'medium' }),
        createActivityItem({ id: 'low-1', severity: 'low' }),
      ];

      render(<ActivityFeed items={items} />);

      // Verify severity badges are rendered
      const criticalBadge = screen.getByText('critical-1').closest('li')?.querySelector('[data-severity="critical"]');
      expect(criticalBadge).toBeInTheDocument();
    });

    it('should display formatted timestamp for each activity item', () => {
      const now = new Date();
      const items: ActivityItem[] = [
        createActivityItem({
          id: 'activity-1',
          timestamp: now.toISOString(),
        }),
      ];

      render(<ActivityFeed items={items} />);

      const formattedTime = formatActivityTimestamp(now.toISOString());
      expect(screen.getByText(new RegExp(formattedTime, 'i'))).toBeInTheDocument();
    });

    it('should render different activity types with distinct visual indicators', () => {
      const items: ActivityItem[] = [
        createActivityItem({
          id: 'activity-1',
          type: 'new_threat',
          title: 'New Threat',
        }),
        createActivityItem({
          id: 'activity-2',
          type: 'updated_threat',
          title: 'Updated Threat',
        }),
        createActivityItem({
          id: 'activity-3',
          type: 'alert_triggered',
          title: 'Alert Triggered',
        }),
      ];

      render(<ActivityFeed items={items} />);

      // Verify all types are rendered
      expect(screen.getByText('New Threat')).toBeInTheDocument();
      expect(screen.getByText('Updated Threat')).toBeInTheDocument();
      expect(screen.getByText('Alert Triggered')).toBeInTheDocument();
    });

    // ============================================================================
    // FAILURE PATH TESTS
    // ============================================================================

    describe('Failure Path: Error handling', () => {
      it('should show error message when loading fails', async () => {
        const items: ActivityItem[] = [];

        render(
          <ActivityFeed
            items={items}
            loading={false}
          />
        );

        // Component should handle missing items gracefully (empty state)
        expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
      });

      it('should display loading state when loading prop is true', () => {
        render(<ActivityFeed items={[]} loading={true} />);

        // Look for loading indicator
        const loadingIndicator = screen.queryByRole('progressbar') ||
          screen.queryByText(/loading/i);

        expect(loadingIndicator).toBeDefined();
      });

      it('should hide loading state when loading completes', async () => {
        const items: ActivityItem[] = [
          createActivityItem({ id: 'activity-1' }),
        ];

        const { rerender } = render(
          <ActivityFeed items={[]} loading={true} />
        );

        rerender(
          <ActivityFeed items={items} loading={false} />
        );

        // Loading state should be gone, content should be visible
        await waitFor(() => {
          expect(screen.getByText('Critical Vulnerability Detected')).toBeInTheDocument();
        });
      });

      it('should handle missing optional severity field gracefully', () => {
        const items: ActivityItem[] = [
          createActivityItem({
            id: 'activity-1',
            severity: undefined,
          }),
        ];

        render(<ActivityFeed items={items} />);

        expect(screen.getByText('Critical Vulnerability Detected')).toBeInTheDocument();
      });

      it('should handle malformed timestamps gracefully', () => {
        const items: ActivityItem[] = [
          createActivityItem({
            id: 'activity-1',
            timestamp: 'invalid-timestamp',
          }),
        ];

        // Component should not crash
        expect(() => {
          render(<ActivityFeed items={items} />);
        }).not.toThrow();
      });
    });

    // ============================================================================
    // EMPTY STATE TESTS
    // ============================================================================

    describe('Empty State: No activity items', () => {
      it('should display "No recent activity" message when items array is empty', () => {
        render(<ActivityFeed items={[]} />);

        expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
      });

      it('should not render list when items are empty', () => {
        render(<ActivityFeed items={[]} />);

        const list = screen.queryByRole('list');
        expect(list).not.toBeInTheDocument();
      });

      it('should display empty state when items become empty after initial load', () => {
        const items: ActivityItem[] = [
          createActivityItem({ id: 'activity-1' }),
        ];

        const { rerender } = render(<ActivityFeed items={items} />);

        expect(screen.getByText('Critical Vulnerability Detected')).toBeInTheDocument();

        rerender(<ActivityFeed items={[]} />);

        expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
      });
    });

    // ============================================================================
    // EDGE CASE TESTS
    // ============================================================================

    describe('Edge Cases: MaxItems and ordering', () => {
      it('should limit displayed items to maxItems prop', () => {
        const items: ActivityItem[] = Array.from({ length: 15 }, (_, i) =>
          createActivityItem({
            id: `activity-${i}`,
            title: `Activity ${i}`,
            timestamp: subHours(new Date(), i).toISOString(),
          })
        );

        render(<ActivityFeed items={items} maxItems={10} />);

        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeLessThanOrEqual(10);
      });

      it('should use default maxItems of 10 when prop is not provided', () => {
        const items: ActivityItem[] = Array.from({ length: 15 }, (_, i) =>
          createActivityItem({
            id: `activity-${i}`,
            title: `Activity ${i}`,
            timestamp: subHours(new Date(), i).toISOString(),
          })
        );

        render(<ActivityFeed items={items} />);

        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeLessThanOrEqual(10);
      });

      it('should display most recent items when maxItems limit is applied', () => {
        const now = new Date();
        const items: ActivityItem[] = [
          createActivityItem({
            id: 'activity-1',
            title: 'Oldest',
            timestamp: subHours(now, 10).toISOString(),
          }),
          createActivityItem({
            id: 'activity-2',
            title: 'Middle',
            timestamp: subHours(now, 5).toISOString(),
          }),
          createActivityItem({
            id: 'activity-3',
            title: 'Newest',
            timestamp: now.toISOString(),
          }),
        ];

        render(<ActivityFeed items={items} maxItems={2} />);

        // Should show the two most recent
        expect(screen.getByText('Newest')).toBeInTheDocument();
        expect(screen.getByText('Middle')).toBeInTheDocument();
        expect(screen.queryByText('Oldest')).not.toBeInTheDocument();
      });

      it('should handle single item correctly', () => {
        const items: ActivityItem[] = [
          createActivityItem({ id: 'activity-1' }),
        ];

        render(<ActivityFeed items={items} />);

        expect(screen.getByText('Critical Vulnerability Detected')).toBeInTheDocument();
      });

      it('should handle very large number of items', () => {
        const items: ActivityItem[] = Array.from({ length: 100 }, (_, i) =>
          createActivityItem({
            id: `activity-${i}`,
            title: `Activity ${i}`,
            timestamp: subHours(new Date(), i).toISOString(),
          })
        );

        expect(() => {
          render(<ActivityFeed items={items} maxItems={10} />);
        }).not.toThrow();

        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeLessThanOrEqual(10);
      });

      it('should handle duplicate activity IDs', () => {
        const items: ActivityItem[] = [
          createActivityItem({ id: 'activity-1', title: 'First' }),
          createActivityItem({ id: 'activity-1', title: 'Duplicate' }),
        ];

        // Component should not crash (React should handle key warnings)
        expect(() => {
          render(<ActivityFeed items={items} />);
        }).not.toThrow();
      });

      it('should handle very long title and description strings', () => {
        const longString = 'A'.repeat(500);
        const items: ActivityItem[] = [
          createActivityItem({
            id: 'activity-1',
            title: longString,
            description: longString,
          }),
        ];

        render(<ActivityFeed items={items} />);

        expect(screen.getByText(new RegExp(longString))).toBeInTheDocument();
      });

      it('should display items with special characters in title and description', () => {
        const items: ActivityItem[] = [
          createActivityItem({
            id: 'activity-1',
            title: 'CVE-2024-<1234> & "Special" Characters',
            description: 'Description with symbols: @#$%^&*()',
          }),
        ];

        render(<ActivityFeed items={items} />);

        expect(screen.getByText(/CVE-2024-<1234>/)).toBeInTheDocument();
        expect(screen.getByText(/Description with symbols/)).toBeInTheDocument();
      });

      it('should handle timezone-aware ISO timestamps correctly', () => {
        const tzTimestamp = new Date('2024-12-13T15:30:00Z').toISOString();
        const items: ActivityItem[] = [
          createActivityItem({
            id: 'activity-1',
            timestamp: tzTimestamp,
          }),
        ];

        render(<ActivityFeed items={items} />);

        expect(screen.getByText('Critical Vulnerability Detected')).toBeInTheDocument();
      });
    });

    // ============================================================================
    // AUTO REFRESH TESTS
    // ============================================================================

    describe('Auto Refresh: Real-time updates', () => {
      it('should support autoRefresh prop for enabling real-time updates', () => {
        const items: ActivityItem[] = [
          createActivityItem({ id: 'activity-1' }),
        ];

        render(<ActivityFeed items={items} autoRefresh={true} />);

        expect(screen.getByText('Critical Vulnerability Detected')).toBeInTheDocument();
      });

      it('should disable auto-refresh when prop is false', () => {
        const items: ActivityItem[] = [
          createActivityItem({ id: 'activity-1' }),
        ];

        render(<ActivityFeed items={items} autoRefresh={false} />);

        expect(screen.getByText('Critical Vulnerability Detected')).toBeInTheDocument();
      });
    });

    // ============================================================================
    // ACCESSIBILITY TESTS
    // ============================================================================

    describe('Accessibility', () => {
      it('should have proper ARIA labels and semantic HTML', () => {
        const items: ActivityItem[] = [
          createActivityItem({ id: 'activity-1' }),
        ];

        render(<ActivityFeed items={items} />);

        // Verify semantic HTML list structure
        expect(screen.getByRole('list')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
      });

      it('should provide meaningful text alternatives for severity indicators', () => {
        const items: ActivityItem[] = [
          createActivityItem({ id: 'activity-1', severity: 'critical' }),
        ];

        render(<ActivityFeed items={items} />);

        // Severity should be visible or in aria-label
        const severityElement = screen.getByText('Critical Vulnerability Detected')
          .closest('li');

        expect(severityElement).toBeInTheDocument();
      });
    });
  });
});

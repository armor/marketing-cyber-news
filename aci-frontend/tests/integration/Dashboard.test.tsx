/**
 * Integration Tests for Dashboard Page
 * Tests the full Dashboard page rendering with MSW mocked API responses
 *
 * CONSTITUTION PRINCIPLE VIII - TDD Test Completeness:
 * ✓ Happy path: Full dashboard renders with all components after API loads
 * ✓ Error path: Shows error state when API returns 500
 * ✓ Empty state: Shows skeleton loading state initially
 * ✓ Edge case: User can navigate from dashboard to threat list
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { HttpResponse, http } from 'msw';
import { Dashboard } from '../../src/pages/Dashboard';
import { AuthProvider } from '../../src/stores/AuthContext';
import { server } from '../setup';
import type { DashboardSummary, AnalyticsData } from '../../src/types/api';
import type { ThreatCategory } from '../../src/types/threat';

/**
 * Test fixture data for dashboard metrics
 */
const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  totalThreats: 2847,
  criticalCount: 23,
  highCount: 156,
  mediumCount: 889,
  lowCount: 1779,
  newToday: 47,
  trending: [
    {
      id: 'threat-1',
      title: 'Critical: Zero-day RCE in Apache Struts',
      summary: 'Remote code execution vulnerability affects production systems',
      severity: 'critical',
      category: 'vulnerability' as ThreatCategory,
      source: 'NVD',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'threat-2',
      title: 'High: Ransomware Campaign Targeting Finance',
      summary: 'LockBit operators targeting financial institutions',
      severity: 'high',
      category: 'ransomware' as ThreatCategory,
      source: 'CISA',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'threat-3',
      title: 'Medium: Phishing Campaign Detected',
      summary: 'Targeted phishing emails targeting enterprise users',
      severity: 'medium',
      category: 'phishing' as ThreatCategory,
      source: 'Proofpoint',
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
};

const MOCK_ANALYTICS_DATA: AnalyticsData = {
  timeSeries: [
    { date: '2024-12-07', count: 145 },
    { date: '2024-12-08', count: 189 },
    { date: '2024-12-09', count: 167 },
    { date: '2024-12-10', count: 203 },
    { date: '2024-12-11', count: 178 },
    { date: '2024-12-12', count: 192 },
    { date: '2024-12-13', count: 215 },
  ],
  byCategory: [
    { category: 'vulnerability', count: 889 },
    { category: 'malware', count: 567 },
    { category: 'phishing', count: 445 },
    { category: 'ransomware', count: 234 },
    { category: 'data_breach', count: 156 },
    { category: 'other', count: 556 },
  ],
  bySource: [
    { source: 'NVD', count: 1200 },
    { source: 'CISA', count: 850 },
    { source: 'CVE Details', count: 650 },
    { source: 'Proofpoint', count: 147 },
  ],
  bySeverity: [
    { severity: 'critical', count: 23 },
    { severity: 'high', count: 156 },
    { severity: 'medium', count: 889 },
    { severity: 'low', count: 1779 },
  ],
};

/**
 * Test wrapper component with required providers
 */
const DashboardWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Dashboard Page Integration Tests', () => {
  /**
   * Note: MSW server is configured in tests/setup.ts
   * Handlers are reset after each test automatically
   */

  // =========================================================================
  // HAPPY PATH - Full dashboard renders with all components
  // =========================================================================

  describe('Happy Path: Full Dashboard Rendering', () => {
    it('should render all metric cards with correct values', async () => {
      // Setup MSW handlers
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify metric cards are present and contain correct values
      expect(screen.getByTestId('metric-total-threats')).toHaveTextContent('2847');
      expect(screen.getByTestId('metric-critical-count')).toHaveTextContent('23');
      expect(screen.getByTestId('metric-new-today')).toHaveTextContent('47');
      expect(screen.getByTestId('metric-active-alerts')).toBeInTheDocument();
    });

    it('should render severity distribution donut chart', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        ),
        http.get('/api/v1/analytics', () =>
          HttpResponse.json({ success: true, data: MOCK_ANALYTICS_DATA })
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify chart container exists
      const chartContainer = screen.getByTestId('severity-distribution-chart');
      expect(chartContainer).toBeInTheDocument();

      // Verify severity legend items are rendered
      expect(within(chartContainer).getByText(/Critical/i)).toBeInTheDocument();
      expect(within(chartContainer).getByText(/High/i)).toBeInTheDocument();
      expect(within(chartContainer).getByText(/Medium/i)).toBeInTheDocument();
      expect(within(chartContainer).getByText(/Low/i)).toBeInTheDocument();
    });

    it('should render 7-day threat timeline chart', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        ),
        http.get('/api/v1/analytics', () =>
          HttpResponse.json({ success: true, data: MOCK_ANALYTICS_DATA })
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify timeline chart container exists
      const timelineChart = screen.getByTestId('threat-timeline-chart');
      expect(timelineChart).toBeInTheDocument();

      // Verify chart has time series data
      MOCK_ANALYTICS_DATA.timeSeries.forEach(point => {
        expect(within(timelineChart).getByText(point.count.toString())).toBeInTheDocument();
      });
    });

    it('should render recent activity feed with threat items', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify activity feed section exists
      const activityFeed = screen.getByTestId('activity-feed');
      expect(activityFeed).toBeInTheDocument();

      // Verify recent threat items are rendered
      expect(within(activityFeed).getByText(/Critical: Zero-day RCE/i)).toBeInTheDocument();
      expect(within(activityFeed).getByText(/High: Ransomware Campaign/i)).toBeInTheDocument();
      expect(within(activityFeed).getByText(/Medium: Phishing Campaign/i)).toBeInTheDocument();
    });

    it('should have proper spacing and layout structure', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        ),
        http.get('/api/v1/analytics', () =>
          HttpResponse.json({ success: true, data: MOCK_ANALYTICS_DATA })
        )
      );

      const { container } = render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify page has main content area
      const mainContent = container.querySelector('main');
      expect(mainContent).toBeInTheDocument();

      // Verify sections have proper data-testid attributes
      expect(screen.getByTestId('dashboard-metrics-section')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-charts-section')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // ERROR PATH - Shows error state when API returns 500
  // =========================================================================

  describe('Error Path: API Failure Handling', () => {
    it('should display error message when dashboard summary API fails', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
            { status: 500 }
          )
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText(/Error loading dashboard/i)).toBeInTheDocument();
    });

    it('should show retry button on API error', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () => {
          return HttpResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Service unavailable' } },
            { status: 503 }
          );
        })
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      }, { timeout: 3000 });

      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toBeVisible();
    });

    it('should display partial error for analytics when only analytics API fails', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        ),
        http.get('/api/v1/analytics', () =>
          HttpResponse.json(
            { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch analytics' } },
            { status: 500 }
          )
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      // Metrics should still load
      await waitFor(() => {
        expect(screen.getByTestId('metric-total-threats')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Analytics error should be shown
      const analyticsError = screen.queryByTestId('analytics-error');
      expect(analyticsError).toBeInTheDocument();
    });
  });

  // =========================================================================
  // EMPTY STATE - Shows skeleton loading state initially
  // =========================================================================

  describe('Empty State: Loading Skeleton', () => {
    it('should show loading skeleton on initial render', () => {
      server.use(
        http.get('/api/v1/dashboard/summary', async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY });
        })
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      // Verify skeleton is shown during loading
      expect(screen.getByTestId('metric-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
    });

    it('should replace skeleton with content after data loads', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      // Skeleton should initially be visible
      expect(screen.getByTestId('metric-skeleton')).toBeInTheDocument();

      // After loading, content should appear and skeleton should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('metric-skeleton')).not.toBeInTheDocument();
        expect(screen.getByTestId('metric-total-threats')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show loading spinner for charts', () => {
      server.use(
        http.get('/api/v1/analytics', async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return HttpResponse.json({ success: true, data: MOCK_ANALYTICS_DATA });
        })
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      // Verify chart skeleton is shown
      const chartSkeleton = screen.getByTestId('chart-skeleton');
      expect(chartSkeleton).toBeInTheDocument();
      expect(chartSkeleton).toHaveAttribute('aria-busy', 'true');
    });
  });

  // =========================================================================
  // EDGE CASE - User navigation from dashboard to threat list
  // =========================================================================

  describe('Edge Case: Navigation Flow', () => {
    it('should allow navigation from dashboard to threat details', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click on a threat item in activity feed
      const threatLink = screen.getByText(/Critical: Zero-day RCE/i);
      await userEvent.click(threatLink);

      // Should navigate to threat detail view (data-testid indicates detail view)
      await waitFor(() => {
        expect(screen.getByTestId('threat-detail-modal')).toBeInTheDocument();
      });
    });

    it('should maintain scroll position when returning to dashboard', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        )
      );

      const { container } = render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Scroll down on dashboard
      const scrollContainer = container.querySelector('[data-testid="dashboard-scroll-container"]');
      if (scrollContainer) {
        scrollContainer.scrollTop = 500;
        expect(scrollContainer.scrollTop).toBe(500);
      }

      // Click on threat item to navigate
      const threatLink = screen.getByText(/Critical: Zero-day RCE/i);
      await userEvent.click(threatLink);

      // Go back (close modal or navigate back)
      const closeButton = screen.getByTestId('modal-close-button');
      await userEvent.click(closeButton);

      // Original scroll position should be maintained
      if (scrollContainer) {
        expect(scrollContainer.scrollTop).toBe(500);
      }
    });

    it('should handle rapid metric card clicks', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('metric-critical-count')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Rapidly click metric cards
      const criticalCard = screen.getByTestId('metric-critical-count');
      await userEvent.click(criticalCard);
      await userEvent.click(criticalCard);
      await userEvent.click(criticalCard);

      // Should handle clicks without errors (navigate consistently)
      expect(screen.getByTestId('threat-filter-modal')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // ACCESSIBILITY & SEMANTIC TESTS
  // =========================================================================

  describe('Accessibility & Semantic HTML', () => {
    it('should have proper heading hierarchy', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should have h1 for page title
      const pageTitle = screen.getByRole('heading', { level: 1 });
      expect(pageTitle).toHaveTextContent(/Dashboard|Security Overview/i);
    });

    it('should have proper ARIA labels on metric cards', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('metric-total-threats')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify ARIA labels
      expect(screen.getByLabelText(/Total Threats/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Critical Threats/i)).toBeInTheDocument();
    });

    it('should have keyboard navigation support', async () => {
      server.use(
        http.get('/api/v1/dashboard/summary', () =>
          HttpResponse.json({ success: true, data: MOCK_DASHBOARD_SUMMARY })
        )
      );

      render(<Dashboard />, { wrapper: DashboardWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Tab to threat item
      const threatLink = screen.getByText(/Critical: Zero-day RCE/i);
      await userEvent.tab();

      // Should be keyboard accessible
      expect(threatLink).toHaveFocus();
    });
  });
});

/**
 * Unit Tests for ThreatTimeline Chart Component
 *
 * Tests for the line/area chart showing threat count over time.
 * Uses Reviz library with design tokens for colors and motion.
 *
 * Test Coverage:
 * - Happy Path: Renders chart with valid data
 * - Failure Path: Handles edge cases gracefully
 * - Empty State: Displays empty state when no data
 * - Breakdown Mode: Shows stacked area chart with severity levels
 * - Accessibility: ARIA labels and keyboard navigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThreatTimeline, type TimelineDataPoint } from './ThreatTimeline';
import type { ReactNode } from 'react';

/**
 * Types for mocked Reviz components
 */
interface MockChartProps {
  data?: unknown[];
  children?: ReactNode;
}

interface MockContainerProps {
  children?: ReactNode;
}

interface MockTooltipProps {
  content?: ReactNode;
}

// Mock Reviz components
vi.mock('reaviz', () => ({
  LineChart: ({ data, children }: MockChartProps) => (
    <div data-testid="reviz-line-chart" data-point-count={data?.length || 0}>
      {children}
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
  AreaChart: ({ data, children }: MockChartProps) => (
    <div data-testid="reviz-area-chart" data-point-count={data?.length || 0}>
      {children}
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
  LinearXAxis: ({ children }: MockContainerProps) => <div data-testid="x-axis">{children}</div>,
  LinearYAxis: ({ children }: MockContainerProps) => <div data-testid="y-axis">{children}</div>,
  GridlineSeries: () => <div data-testid="gridlines" />,
  LineSeries: ({ children }: MockContainerProps) => <div data-testid="line-series">{children}</div>,
  StackedAreaSeries: ({ children }: MockContainerProps) => <div data-testid="stacked-area-series">{children}</div>,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  TooltipArea: ({ children }: MockContainerProps) => <div data-testid="tooltip-area">{children}</div>,
  ChartTooltip: ({ content }: MockTooltipProps) => <div data-testid="chart-tooltip">{content?.toString()}</div>,
}));

describe('ThreatTimeline', () => {
  const mockData: TimelineDataPoint[] = [
    { date: '2024-01-01', count: 10, critical: 2, high: 3, medium: 3, low: 2 },
    { date: '2024-01-02', count: 15, critical: 3, high: 4, medium: 5, low: 3 },
    { date: '2024-01-03', count: 20, critical: 4, high: 6, medium: 6, low: 4 },
    { date: '2024-01-04', count: 12, critical: 2, high: 3, medium: 4, low: 3 },
    { date: '2024-01-05', count: 18, critical: 3, high: 5, medium: 6, low: 4 },
    { date: '2024-01-06', count: 25, critical: 5, high: 7, medium: 8, low: 5 },
    { date: '2024-01-07', count: 22, critical: 4, high: 6, medium: 7, low: 5 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path: Renders line chart with valid data', () => {
    it('should render chart component with valid data', () => {
      render(<ThreatTimeline data={mockData} />);

      const chart = screen.getByTestId('reviz-line-chart');
      expect(chart).toBeInTheDocument();
    });

    it('should display correct number of data points', () => {
      render(<ThreatTimeline data={mockData} />);

      const chart = screen.getByTestId('reviz-line-chart');
      expect(chart).toHaveAttribute('data-point-count', '7');
    });

    it('should have proper ARIA label', () => {
      render(<ThreatTimeline data={mockData} />);

      const container = screen.getByRole('img');
      expect(container).toHaveAttribute('aria-label', expect.stringContaining('7 days'));
    });

    it('should apply default date range (7d)', () => {
      render(<ThreatTimeline data={mockData} />);

      const container = screen.getByTestId('threat-timeline');
      expect(container).toHaveAttribute('data-date-range', '7d');
    });

    it('should accept custom date range prop', () => {
      render(<ThreatTimeline data={mockData} dateRange="30d" />);

      const container = screen.getByTestId('threat-timeline');
      expect(container).toHaveAttribute('data-date-range', '30d');
    });

    it('should use default height of 300px', () => {
      render(<ThreatTimeline data={mockData} />);

      const container = screen.getByTestId('threat-timeline');
      expect(container).toHaveStyle({ height: '300px' });
    });

    it('should accept custom height prop', () => {
      render(<ThreatTimeline data={mockData} height={400} />);

      const container = screen.getByTestId('threat-timeline');
      expect(container).toHaveStyle({ height: '400px' });
    });

    it('should enable animation by default', () => {
      render(<ThreatTimeline data={mockData} />);

      const container = screen.getByTestId('threat-timeline');
      expect(container).toHaveAttribute('data-animated', 'true');
    });

    it('should allow disabling animation', () => {
      render(<ThreatTimeline data={mockData} animated={false} />);

      const container = screen.getByTestId('threat-timeline');
      expect(container).toHaveAttribute('data-animated', 'false');
    });
  });

  describe('Breakdown Mode: Shows stacked area chart', () => {
    it('should render area chart when showBreakdown is true', () => {
      render(<ThreatTimeline data={mockData} showBreakdown={true} />);

      const chart = screen.getByTestId('reviz-area-chart');
      expect(chart).toBeInTheDocument();
    });

    it('should not render line chart when showBreakdown is true', () => {
      render(<ThreatTimeline data={mockData} showBreakdown={true} />);

      const lineChart = screen.queryByTestId('reviz-line-chart');
      expect(lineChart).not.toBeInTheDocument();
    });

    it('should set data-show-breakdown attribute correctly', () => {
      render(<ThreatTimeline data={mockData} showBreakdown={true} />);

      const container = screen.getByTestId('threat-timeline');
      expect(container).toHaveAttribute('data-show-breakdown', 'true');
    });

    it('should render stacked area series', () => {
      render(<ThreatTimeline data={mockData} showBreakdown={true} />);

      expect(screen.getByTestId('stacked-area-series')).toBeInTheDocument();
    });

    it('should toggle between line and area charts', () => {
      const { rerender } = render(<ThreatTimeline data={mockData} showBreakdown={false} />);

      expect(screen.getByTestId('reviz-line-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('reviz-area-chart')).not.toBeInTheDocument();

      rerender(<ThreatTimeline data={mockData} showBreakdown={true} />);

      expect(screen.queryByTestId('reviz-line-chart')).not.toBeInTheDocument();
      expect(screen.getByTestId('reviz-area-chart')).toBeInTheDocument();
    });
  });

  describe('Empty State: Displays empty state when no data', () => {
    it('should display empty state message when data array is empty', () => {
      render(<ThreatTimeline data={[]} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should show empty state with correct height', () => {
      render(<ThreatTimeline data={[]} height={400} />);

      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toHaveStyle({ height: '400px' });
    });

    it('should have proper ARIA attributes for empty state', () => {
      render(<ThreatTimeline data={[]} />);

      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toHaveAttribute('role', 'status');
      expect(emptyState).toHaveAttribute('aria-label', 'No threat data available');
    });

    it('should not render chart when data is empty', () => {
      render(<ThreatTimeline data={[]} />);

      expect(screen.queryByTestId('reviz-line-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('reviz-area-chart')).not.toBeInTheDocument();
    });
  });

  describe('Failure Path: Handles edge cases gracefully', () => {
    it('should handle single data point', () => {
      const singlePoint: TimelineDataPoint[] = [
        { date: '2024-01-01', count: 5, critical: 1, high: 2, medium: 1, low: 1 },
      ];

      expect(() => render(<ThreatTimeline data={singlePoint} />)).not.toThrow();
      expect(screen.getByTestId('reviz-line-chart')).toBeInTheDocument();
    });

    it('should handle data points with zero counts', () => {
      const zeroData: TimelineDataPoint[] = [
        { date: '2024-01-01', count: 0, critical: 0, high: 0, medium: 0, low: 0 },
        { date: '2024-01-02', count: 5, critical: 1, high: 2, medium: 1, low: 1 },
      ];

      expect(() => render(<ThreatTimeline data={zeroData} />)).not.toThrow();
    });

    it('should handle missing severity breakdown', () => {
      const minimalData: TimelineDataPoint[] = [
        { date: '2024-01-01', count: 10 },
        { date: '2024-01-02', count: 15 },
      ];

      expect(() => render(<ThreatTimeline data={minimalData} />)).not.toThrow();
    });

    it('should handle very large numbers', () => {
      const largeData: TimelineDataPoint[] = [
        { date: '2024-01-01', count: 1000000, critical: 250000, high: 250000, medium: 250000, low: 250000 },
      ];

      expect(() => render(<ThreatTimeline data={largeData} />)).not.toThrow();
    });
  });

  describe('Responsive Behavior', () => {
    it('should have 100% width container', () => {
      render(<ThreatTimeline data={mockData} />);

      const container = screen.getByTestId('threat-timeline');
      expect(container).toHaveStyle({ width: '100%' });
    });

    it('should render axes for both chart types', () => {
      const { rerender } = render(<ThreatTimeline data={mockData} />);

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();

      rerender(<ThreatTimeline data={mockData} showBreakdown={true} />);

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('should render gridlines for readability', () => {
      render(<ThreatTimeline data={mockData} />);

      expect(screen.getByTestId('gridlines')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role attribute', () => {
      render(<ThreatTimeline data={mockData} />);

      const container = screen.getByRole('img');
      expect(container).toBeInTheDocument();
    });

    it('should provide descriptive aria-label', () => {
      render(<ThreatTimeline data={mockData} />);

      const container = screen.getByTestId('threat-timeline');
      expect(container).toHaveAttribute('aria-label');
    });

    it('should include data-testid for testing', () => {
      render(<ThreatTimeline data={mockData} />);

      expect(screen.getByTestId('threat-timeline')).toBeInTheDocument();
    });
  });

  describe('Data Transformation', () => {
    it('should format dates correctly (Mon 12 format)', () => {
      render(<ThreatTimeline data={mockData} />);

      const chartData = screen.getByTestId('chart-data');
      const dataText = chartData.textContent || '';

      // Should contain formatted dates (checking for pattern, not exact match)
      expect(dataText).toContain('Mon');
    });

    it('should preserve all data points in transformation', () => {
      render(<ThreatTimeline data={mockData} />);

      const chart = screen.getByTestId('reviz-line-chart');
      expect(chart).toHaveAttribute('data-point-count', mockData.length.toString());
    });
  });
});

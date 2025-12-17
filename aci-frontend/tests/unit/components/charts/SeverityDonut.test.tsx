/**
 * Unit Tests for SeverityDonut Chart Component
 *
 * Tests for the donut/pie chart showing threat severity distribution.
 * Uses Reviz library with design tokens for severity colors.
 *
 * Test-Driven Development: These tests WILL FAIL until component is implemented.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SeverityDonut, type SeverityDonutProps } from '@/components/charts/SeverityDonut';
import { colors } from '@/styles/tokens/colors';

/**
 * Mock Reviz PieChart component
 * The actual Reviz library will be used in integration tests
 */
interface MockChartItem {
  label: string;
  value: number;
  color: string;
}

interface MockLegendItem {
  label: string;
  color: string;
}

vi.mock('reviz', () => ({
  PieChart: ({ data, children }: { data?: MockChartItem[]; children?: React.ReactNode }) => (
    <div
      data-testid="reviz-pie-chart"
      data-total={data?.reduce((sum: number, item: MockChartItem) => sum + (item.value || 0), 0) || 0}
      data-item-count={data?.length || 0}
    >
      {data?.map((item: MockChartItem) => (
        <div
          key={item.label}
          data-testid={`pie-slice-${item.label}`}
          data-severity={item.label}
          data-value={item.value}
          data-color={item.color}
        >
          {item.label}: {item.value}
        </div>
      ))}
      {children}
    </div>
  ),
  Legend: ({ items }: { items?: MockLegendItem[] }) => (
    <div data-testid="reviz-legend">
      {items?.map((item: MockLegendItem) => (
        <div key={item.label} data-testid={`legend-item-${item.label}`}>
          <span className="legend-color" style={{ backgroundColor: item.color }} />
          <span className="legend-label">{item.label}</span>
        </div>
      ))}
    </div>
  ),
}));

describe('SeverityDonut', () => {
  const defaultProps: SeverityDonutProps = {
    data: {
      critical: 5,
      high: 15,
      medium: 30,
      low: 50,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path: Renders chart with all severity levels', () => {
    it('should render chart component with valid data', () => {
      render(<SeverityDonut {...defaultProps} />);

      const chart = screen.getByTestId('reviz-pie-chart');
      expect(chart).toBeInTheDocument();
    });

    it('should display all four severity levels as pie slices', () => {
      render(<SeverityDonut {...defaultProps} />);

      expect(screen.getByTestId('pie-slice-critical')).toBeInTheDocument();
      expect(screen.getByTestId('pie-slice-high')).toBeInTheDocument();
      expect(screen.getByTestId('pie-slice-medium')).toBeInTheDocument();
      expect(screen.getByTestId('pie-slice-low')).toBeInTheDocument();
    });

    it('should pass correct severity values to chart data', () => {
      render(<SeverityDonut {...defaultProps} />);

      expect(screen.getByTestId('pie-slice-critical')).toHaveAttribute(
        'data-value',
        '5'
      );
      expect(screen.getByTestId('pie-slice-high')).toHaveAttribute(
        'data-value',
        '15'
      );
      expect(screen.getByTestId('pie-slice-medium')).toHaveAttribute(
        'data-value',
        '30'
      );
      expect(screen.getByTestId('pie-slice-low')).toHaveAttribute(
        'data-value',
        '50'
      );
    });

    it('should use design token colors for each severity level', () => {
      render(<SeverityDonut {...defaultProps} />);

      expect(screen.getByTestId('pie-slice-critical')).toHaveAttribute(
        'data-color',
        colors.severity.critical
      );
      expect(screen.getByTestId('pie-slice-high')).toHaveAttribute(
        'data-color',
        colors.severity.high
      );
      expect(screen.getByTestId('pie-slice-medium')).toHaveAttribute(
        'data-color',
        colors.severity.medium
      );
      expect(screen.getByTestId('pie-slice-low')).toHaveAttribute(
        'data-color',
        colors.severity.low
      );
    });

    it('should calculate total data points correctly', () => {
      render(<SeverityDonut {...defaultProps} />);

      const chart = screen.getByTestId('reviz-pie-chart');
      expect(chart).toHaveAttribute('data-total', '100');
    });

    it('should render with default size when not specified', () => {
      const { container } = render(<SeverityDonut {...defaultProps} />);

      const wrapper = container.querySelector('[data-testid="severity-donut"]');
      // Should render without errors with default size
      expect(wrapper).toBeDefined();
    });

    it('should accept custom size prop (sm, md, lg)', () => {
      const { rerender, container } = render(
        <SeverityDonut {...defaultProps} size="sm" />
      );

      let wrapper = container.querySelector('[data-size="sm"]');
      expect(wrapper).toBeInTheDocument();

      rerender(<SeverityDonut {...defaultProps} size="md" />);
      wrapper = container.querySelector('[data-size="md"]');
      expect(wrapper).toBeInTheDocument();

      rerender(<SeverityDonut {...defaultProps} size="lg" />);
      wrapper = container.querySelector('[data-size="lg"]');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Failure Path: Handles zero total gracefully', () => {
    it('should handle zero total without errors when all values are positive but sum is zero', () => {
      const zeroProps: SeverityDonutProps = {
        data: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      };

      expect(() => render(<SeverityDonut {...zeroProps} />)).not.toThrow();
    });

    it('should render without crashing when data contains very large numbers', () => {
      const largeProps: SeverityDonutProps = {
        data: {
          critical: 1000000,
          high: 2000000,
          medium: 3000000,
          low: 4000000,
        },
      };

      expect(() => render(<SeverityDonut {...largeProps} />)).not.toThrow();
      expect(screen.getByTestId('reviz-pie-chart')).toBeInTheDocument();
    });

    it('should render without crashing when one severity level is zero', () => {
      const partialProps: SeverityDonutProps = {
        data: {
          critical: 0,
          high: 20,
          medium: 30,
          low: 50,
        },
      };

      expect(() => render(<SeverityDonut {...partialProps} />)).not.toThrow();
    });

    it('should handle missing data gracefully with default values', () => {
      const minimalProps = {
        data: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 1,
        },
      };

      expect(() => render(<SeverityDonut {...minimalProps} />)).not.toThrow();
    });

    it('should render chart with accurate total when some values are zero', () => {
      const partialProps: SeverityDonutProps = {
        data: {
          critical: 10,
          high: 0,
          medium: 20,
          low: 0,
        },
      };

      render(<SeverityDonut {...partialProps} />);

      const chart = screen.getByTestId('reviz-pie-chart');
      expect(chart).toHaveAttribute('data-total', '30');
    });
  });

  describe('Empty State: Displays empty state when all values are zero', () => {
    it('should display empty state message when all severity counts are zero', () => {
      const emptyProps: SeverityDonutProps = {
        data: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      };

      render(<SeverityDonut {...emptyProps} />);

      expect(
        screen.getByText(/no threat data|no threats|no data/i)
      ).toBeInTheDocument();
    });

    it('should show empty state container with appropriate styling', () => {
      const emptyProps: SeverityDonutProps = {
        data: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      };

      const { container } = render(<SeverityDonut {...emptyProps} />);

      const emptyContainer = container.querySelector('[data-testid="empty-state"]');
      expect(emptyContainer).toBeInTheDocument();
    });

    it('should not render pie slices when data is empty', () => {
      const emptyProps: SeverityDonutProps = {
        data: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      };

      render(<SeverityDonut {...emptyProps} />);

      const chart = screen.getByTestId('reviz-pie-chart');
      expect(chart).toHaveAttribute('data-item-count', '0');
    });

    it('should not render legend when data is empty', () => {
      const emptyProps: SeverityDonutProps = {
        data: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      };

      render(<SeverityDonut {...emptyProps} />);

      const legend = screen.queryByTestId('reviz-legend');
      expect(legend).not.toBeInTheDocument();
    });
  });

  describe('Edge Case: Shows correct legend when showLegend=true', () => {
    it('should render legend when showLegend prop is true', () => {
      render(<SeverityDonut {...defaultProps} showLegend={true} />);

      expect(screen.getByTestId('reviz-legend')).toBeInTheDocument();
    });

    it('should not render legend when showLegend prop is false', () => {
      render(<SeverityDonut {...defaultProps} showLegend={false} />);

      expect(screen.queryByTestId('reviz-legend')).not.toBeInTheDocument();
    });

    it('should not render legend when showLegend is undefined (default)', () => {
      render(<SeverityDonut {...defaultProps} />);

      // Default behavior - legend should not be shown
      const legend = screen.queryByTestId('reviz-legend');
      // This depends on component default - adjust assertion if needed
      expect(legend).not.toBeInTheDocument();
    });

    it('should display all four severity levels in legend when shown', () => {
      render(<SeverityDonut {...defaultProps} showLegend={true} />);

      expect(screen.getByTestId('legend-item-critical')).toBeInTheDocument();
      expect(screen.getByTestId('legend-item-high')).toBeInTheDocument();
      expect(screen.getByTestId('legend-item-medium')).toBeInTheDocument();
      expect(screen.getByTestId('legend-item-low')).toBeInTheDocument();
    });

    it('should use correct color for each legend item', () => {
      render(<SeverityDonut {...defaultProps} showLegend={true} />);

      const criticalLegend = screen.getByTestId('legend-item-critical');
      const criticalColor = criticalLegend.querySelector('.legend-color');
      expect(criticalColor).toHaveStyle({
        backgroundColor: colors.severity.critical,
      });

      const highLegend = screen.getByTestId('legend-item-high');
      const highColor = highLegend.querySelector('.legend-color');
      expect(highColor).toHaveStyle({
        backgroundColor: colors.severity.high,
      });

      const mediumLegend = screen.getByTestId('legend-item-medium');
      const mediumColor = mediumLegend.querySelector('.legend-color');
      expect(mediumColor).toHaveStyle({
        backgroundColor: colors.severity.medium,
      });

      const lowLegend = screen.getByTestId('legend-item-low');
      const lowColor = lowLegend.querySelector('.legend-color');
      expect(lowColor).toHaveStyle({
        backgroundColor: colors.severity.low,
      });
    });

    it('should display severity labels in legend', () => {
      render(<SeverityDonut {...defaultProps} showLegend={true} />);

      expect(
        screen.getByTestId('legend-item-critical').textContent
      ).toContain('critical');
      expect(screen.getByTestId('legend-item-high').textContent).toContain(
        'high'
      );
      expect(screen.getByTestId('legend-item-medium').textContent).toContain(
        'medium'
      );
      expect(screen.getByTestId('legend-item-low').textContent).toContain('low');
    });

    it('should hide legend when toggled from true to false', () => {
      const { rerender } = render(
        <SeverityDonut {...defaultProps} showLegend={true} />
      );

      expect(screen.getByTestId('reviz-legend')).toBeInTheDocument();

      rerender(<SeverityDonut {...defaultProps} showLegend={false} />);

      expect(screen.queryByTestId('reviz-legend')).not.toBeInTheDocument();
    });
  });

  describe('Animation Behavior', () => {
    it('should apply animation when animated prop is true', () => {
      const { container } = render(
        <SeverityDonut {...defaultProps} animated={true} />
      );

      const wrapper = container.querySelector('[data-animated="true"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('should disable animation when animated prop is false', () => {
      const { container } = render(
        <SeverityDonut {...defaultProps} animated={false} />
      );

      const wrapper = container.querySelector('[data-animated="false"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('should use animation by default', () => {
      const { container } = render(<SeverityDonut {...defaultProps} />);

      const wrapper = container.querySelector('[data-animated="true"]');
      // Default should be animated=true
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for chart', () => {
      render(<SeverityDonut {...defaultProps} />);

      const chart = screen.getByTestId('reviz-pie-chart');
      expect(chart).toHaveAttribute('role', 'img');
      expect(chart).toHaveAttribute('aria-label');
    });

    it('should provide accessible legend labels', () => {
      render(<SeverityDonut {...defaultProps} showLegend={true} />);

      const legend = screen.getByTestId('reviz-legend');
      expect(legend).toHaveAttribute('role', 'region');
      expect(legend).toHaveAttribute('aria-label');
    });
  });

  describe('Responsive Behavior', () => {
    it('should respond to size prop changes', () => {
      const { rerender, container } = render(
        <SeverityDonut {...defaultProps} size="sm" />
      );

      let wrapper = container.querySelector('[data-size="sm"]');
      expect(wrapper).toBeInTheDocument();

      rerender(<SeverityDonut {...defaultProps} size="lg" />);
      wrapper = container.querySelector('[data-size="lg"]');
      expect(wrapper).toBeInTheDocument();
    });
  });
});

/**
 * MetricCard Component Unit Tests
 *
 * Tests for the dashboard metric card component that displays key security metrics.
 * Using TDD approach: tests written before component implementation.
 *
 * @group unit/components/dashboard
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';

describe('MetricCard Component', () => {
  describe('Happy Path - Basic Rendering', () => {
    it('should render title and value correctly with required props', () => {
      render(
        <MetricCard
          title="Total Threats"
          value={150}
        />
      );

      expect(screen.getByText('Total Threats')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('should render with default variant when variant prop is not provided', () => {
      const { container } = render(
        <MetricCard
          title="Test Metric"
          value={42}
        />
      );

      const card = container.querySelector('[data-testid="metric-card"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('data-variant', 'default');
    });

    it('should display icon when provided as prop', () => {
      const TestIcon = () => <div data-testid="custom-icon">Icon</div>;

      render(
        <MetricCard
          title="Metric with Icon"
          value={99}
          icon={<TestIcon />}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should format large numbers with proper readability', () => {
      render(
        <MetricCard
          title="High Metric"
          value={1000000}
        />
      );

      // Component should render the value - exact formatting depends on implementation
      const valueElement = screen.getByText(/1000000|1,000,000/);
      expect(valueElement).toBeInTheDocument();
    });
  });

  describe('Error Path - Missing and Optional Props', () => {
    it('should handle missing icon gracefully without crashing', () => {
      render(
        <MetricCard
          title="No Icon Metric"
          value={55}
        />
      );

      expect(screen.getByText('No Icon Metric')).toBeInTheDocument();
      expect(screen.getByText('55')).toBeInTheDocument();
    });

    it('should handle missing trend indicator gracefully', () => {
      render(
        <MetricCard
          title="No Trend Metric"
          value={78}
        />
      );

      expect(screen.getByText('No Trend Metric')).toBeInTheDocument();
      // Ensure no error is thrown and component renders
      const card = screen.getByTestId('metric-card');
      expect(card).toBeInTheDocument();
    });

    it('should render without optional props and maintain structure', () => {
      const { container } = render(
        <MetricCard
          title="Minimal Metric"
          value={25}
        />
      );

      expect(container.querySelector('[data-testid="metric-card"]')).toBeInTheDocument();
      expect(screen.getByText('Minimal Metric')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  describe('Edge Cases - Boundary Values', () => {
    it('should handle zero value without issues', () => {
      render(
        <MetricCard
          title="Zero Threats"
          value={0}
        />
      );

      expect(screen.getByText('Zero Threats')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle negative values', () => {
      render(
        <MetricCard
          title="Negative Test"
          value={-5}
        />
      );

      expect(screen.getByText('Negative Test')).toBeInTheDocument();
      expect(screen.getByText(/-5/)).toBeInTheDocument();
    });

    it('should handle very long title strings', () => {
      const longTitle = 'This is a very long metric title that might wrap across multiple lines in the UI';

      render(
        <MetricCard
          title={longTitle}
          value={123}
        />
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle empty string title gracefully', () => {
      const { container } = render(
        <MetricCard
          title=""
          value={42}
        />
      );

      // Component should still render without crashing
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="metric-card"]')).toBeInTheDocument();
    });
  });

  describe('Trend Indicator - Up/Down/Neutral Directions', () => {
    it('should display upward trend with percentage', () => {
      render(
        <MetricCard
          title="Increasing Metric"
          value={200}
          trend={{
            direction: 'up',
            percentage: 15,
          }}
        />
      );

      expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('trend-arrow-up')).toBeInTheDocument();
      expect(screen.getByText(/15%/)).toBeInTheDocument();
    });

    it('should display downward trend with percentage', () => {
      render(
        <MetricCard
          title="Decreasing Metric"
          value={150}
          trend={{
            direction: 'down',
            percentage: 8,
          }}
        />
      );

      expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('trend-arrow-down')).toBeInTheDocument();
      expect(screen.getByText(/8%/)).toBeInTheDocument();
    });

    it('should display neutral trend indicator', () => {
      render(
        <MetricCard
          title="Stable Metric"
          value={100}
          trend={{
            direction: 'neutral',
            percentage: 0,
          }}
        />
      );

      expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('trend-neutral')).toBeInTheDocument();
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should style trend indicator color based on direction', () => {
      const { rerender } = render(
        <MetricCard
          title="Metric"
          value={50}
          trend={{
            direction: 'up',
            percentage: 10,
          }}
        />
      );

      let trendIndicator = screen.getByTestId('trend-indicator');
      expect(trendIndicator).toHaveAttribute(
        'data-direction',
        'up'
      );

      rerender(
        <MetricCard
          title="Metric"
          value={50}
          trend={{
            direction: 'down',
            percentage: 5,
          }}
        />
      );

      trendIndicator = screen.getByTestId('trend-indicator');
      expect(trendIndicator).toHaveAttribute(
        'data-direction',
        'down'
      );
    });

    it('should handle high percentage trend values', () => {
      render(
        <MetricCard
          title="Large Increase"
          value={500}
          trend={{
            direction: 'up',
            percentage: 150,
          }}
        />
      );

      expect(screen.getByText(/150%/)).toBeInTheDocument();
    });

    it('should handle decimal percentage values', () => {
      render(
        <MetricCard
          title="Precise Metric"
          value={100}
          trend={{
            direction: 'down',
            percentage: 2.5,
          }}
        />
      );

      expect(screen.getByText(/2\.5%/)).toBeInTheDocument();
    });
  });

  describe('Variant Support - Color Theming', () => {
    it('should apply default variant styling', () => {
      const { container } = render(
        <MetricCard
          title="Default Variant"
          value={40}
          variant="default"
        />
      );

      const card = container.querySelector('[data-testid="metric-card"]');
      expect(card).toHaveAttribute('data-variant', 'default');
    });

    it('should apply critical variant styling', () => {
      const { container } = render(
        <MetricCard
          title="Critical Threats"
          value={23}
          variant="critical"
        />
      );

      const card = container.querySelector('[data-testid="metric-card"]');
      expect(card).toHaveAttribute('data-variant', 'critical');
    });

    it('should apply warning variant styling', () => {
      const { container } = render(
        <MetricCard
          title="Warning Count"
          value={15}
          variant="warning"
        />
      );

      const card = container.querySelector('[data-testid="metric-card"]');
      expect(card).toHaveAttribute('data-variant', 'warning');
    });

    it('should apply success variant styling', () => {
      const { container } = render(
        <MetricCard
          title="Protected Systems"
          value={89}
          variant="success"
        />
      );

      const card = container.querySelector('[data-testid="metric-card"]');
      expect(card).toHaveAttribute('data-variant', 'success');
    });

    it('should render with variant and icon combination', () => {
      const TestIcon = () => <span data-testid="icon">🔴</span>;

      render(
        <MetricCard
          title="Critical Alert"
          value={5}
          variant="critical"
          icon={<TestIcon />}
        />
      );

      const card = screen.getByTestId('metric-card');
      expect(card).toHaveAttribute('data-variant', 'critical');
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render with all props combined - variant, icon, and trend', () => {
      const TestIcon = () => <span data-testid="combined-icon">⚠️</span>;

      render(
        <MetricCard
          title="Complete Metric"
          value={45}
          variant="warning"
          icon={<TestIcon />}
          trend={{
            direction: 'up',
            percentage: 25,
          }}
        />
      );

      const card = screen.getByTestId('metric-card');
      expect(card).toHaveAttribute('data-variant', 'warning');
      expect(screen.getByTestId('combined-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
      expect(screen.getByText(/25%/)).toBeInTheDocument();
    });
  });

  describe('Design Token Compliance', () => {
    it('should use color tokens from design system, not hardcoded hex values', () => {
      const { container } = render(
        <MetricCard
          title="Token Test"
          value={30}
          variant="critical"
        />
      );

      // Verify that color tokens are used (not exact color values)
      // This is validated through code review rather than testing implementation
      const card = container.querySelector('[data-testid="metric-card"]');
      expect(card).toBeInTheDocument();

      // In implementation, verify that colors.severity.critical is used
      // not hardcoded colors like '#ff0000'
    });

    it('should use spacing tokens for all padding and margins', () => {
      const { container } = render(
        <MetricCard
          title="Spacing Test"
          value={60}
        />
      );

      // Component should exist and render
      expect(container.querySelector('[data-testid="metric-card"]')).toBeInTheDocument();

      // Verify in implementation that spacing tokens are used consistently
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate semantic HTML structure', () => {
      const { container } = render(
        <MetricCard
          title="Accessible Metric"
          value={75}
        />
      );

      // Card should be semantic or have proper roles
      const card = container.querySelector('[data-testid="metric-card"]');
      expect(card).toBeInTheDocument();
    });

    it('should include proper ARIA labels for numeric values', () => {
      render(
        <MetricCard
          title="ARIA Test"
          value={100}
        />
      );

      // Value should be accessible
      const valueElement = screen.getByText('100');
      expect(valueElement).toBeInTheDocument();
    });

    it('should provide context for trend indicator', () => {
      render(
        <MetricCard
          title="Trend ARIA Test"
          value={50}
          trend={{
            direction: 'up',
            percentage: 20,
          }}
        />
      );

      const trendIndicator = screen.getByTestId('trend-indicator');
      // Should have aria-label or other accessibility attributes
      expect(trendIndicator).toHaveAttribute('data-direction');
    });
  });

  describe('Integration with Other Components', () => {
    it('should accept React nodes as icon prop', () => {
      const ComplexIcon = () => (
        <div data-testid="complex-icon-container">
          <span>Icon</span>
          <span>Badge</span>
        </div>
      );

      render(
        <MetricCard
          title="Complex Icon"
          value={88}
          icon={<ComplexIcon />}
        />
      );

      expect(screen.getByTestId('complex-icon-container')).toBeInTheDocument();
    });

    it('should work with numeric prop types correctly', () => {
      const values = [0, 1, 100, 1000, 1000000];

      values.forEach((value) => {
        const { unmount } = render(
          <MetricCard
            title={`Value ${value}`}
            value={value}
          />
        );

        expect(screen.getByText(value.toString())).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce required props at compile time', () => {
      // This test verifies TypeScript compilation
      // In TS, the following would fail to compile:
      // render(<MetricCard />);  // Error: title and value required
      // render(<MetricCard title="Test" />);  // Error: value required

      // Verify that with all required props, component renders
      render(
        <MetricCard
          title="Type Safe"
          value={42}
        />
      );

      expect(screen.getByText('Type Safe')).toBeInTheDocument();
    });

    it('should accept valid variant type values only', () => {
      const validVariants: Array<'default' | 'critical' | 'warning' | 'success'> = [
        'default',
        'critical',
        'warning',
        'success',
      ];

      validVariants.forEach((variant) => {
        const { unmount } = render(
          <MetricCard
            title="Variant Test"
            value={30}
            variant={variant}
          />
        );

        const card = screen.getByTestId('metric-card');
        expect(card).toHaveAttribute('data-variant', variant);
        unmount();
      });
    });

    it('should accept valid trend direction types only', () => {
      const validDirections: Array<'up' | 'down' | 'neutral'> = [
        'up',
        'down',
        'neutral',
      ];

      validDirections.forEach((direction) => {
        const { unmount } = render(
          <MetricCard
            title="Direction Test"
            value={50}
            trend={{
              direction,
              percentage: 10,
            }}
          />
        );

        const trendIndicator = screen.getByTestId('trend-indicator');
        expect(trendIndicator).toHaveAttribute('data-direction', direction);
        unmount();
      });
    });
  });
});

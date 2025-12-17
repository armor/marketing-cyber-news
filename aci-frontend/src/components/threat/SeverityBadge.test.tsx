/**
 * SeverityBadge Component Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SeverityBadge } from './SeverityBadge';
import type { Severity } from '@/types/threat';

describe('SeverityBadge', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<SeverityBadge severity="high" />);

      const badge = screen.getByRole('status', { name: /severity: high/i });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('High');
    });

    it('should render all severity levels correctly', () => {
      const severities: Severity[] = ['critical', 'high', 'medium', 'low'];

      severities.forEach((severity) => {
        const { unmount } = render(<SeverityBadge severity={severity} />);

        const expectedLabel = severity.charAt(0).toUpperCase() + severity.slice(1);
        const badge = screen.getByRole('status');

        expect(badge).toHaveTextContent(expectedLabel);
        expect(badge).toHaveAttribute('data-severity', severity);

        unmount();
      });
    });

    it('should render without label when showLabel is false', () => {
      render(<SeverityBadge severity="critical" showLabel={false} />);

      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toBeEmptyDOMElement();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size styles', () => {
      render(<SeverityBadge severity="high" size="sm" />);

      const badge = screen.getByRole('status');
      expect(badge.style.paddingLeft).toBe('var(--spacing-2)');
      expect(badge.style.fontSize).toBe('var(--typography-font-size-xs)');
      expect(badge.style.fontWeight).toBe('var(--typography-font-weight-medium)');
    });

    it('should apply medium size styles (default)', () => {
      render(<SeverityBadge severity="high" />);

      const badge = screen.getByRole('status');
      expect(badge.style.paddingLeft).toBe('var(--spacing-3)');
      expect(badge.style.fontSize).toBe('var(--typography-font-size-sm)');
      expect(badge.style.fontWeight).toBe('var(--typography-font-weight-medium)');
    });

    it('should apply large size styles', () => {
      render(<SeverityBadge severity="high" size="lg" />);

      const badge = screen.getByRole('status');
      expect(badge.style.paddingLeft).toBe('var(--spacing-4)');
      expect(badge.style.fontSize).toBe('var(--typography-font-size-base)');
      expect(badge.style.fontWeight).toBe('var(--typography-font-weight-semibold)');
    });
  });

  describe('Severity Colors (Design Tokens)', () => {
    it('should apply critical severity colors', () => {
      render(<SeverityBadge severity="critical" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('data-severity', 'critical');
      expect(badge.style.borderColor).toBe('var(--color-severity-critical)');
      expect(badge.style.color).toBe('var(--color-severity-critical)');
      expect(badge.style.backgroundColor).toContain('var(--color-severity-critical)');
    });

    it('should apply high severity colors', () => {
      render(<SeverityBadge severity="high" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('data-severity', 'high');
      expect(badge.style.borderColor).toBe('var(--color-severity-high)');
      expect(badge.style.color).toBe('var(--color-severity-high)');
    });

    it('should apply medium severity colors', () => {
      render(<SeverityBadge severity="medium" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('data-severity', 'medium');
      expect(badge.style.borderColor).toBe('var(--color-severity-medium)');
      expect(badge.style.color).toBe('var(--color-severity-medium)');
    });

    it('should apply low severity colors', () => {
      render(<SeverityBadge severity="low" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('data-severity', 'low');
      expect(badge.style.borderColor).toBe('var(--color-severity-low)');
      expect(badge.style.color).toBe('var(--color-severity-low)');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" for screen readers', () => {
      render(<SeverityBadge severity="critical" />);

      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });

    it('should have descriptive aria-label', () => {
      render(<SeverityBadge severity="high" />);

      const badge = screen.getByRole('status', { name: /severity: high/i });
      expect(badge).toHaveAttribute('aria-label', 'Severity: High');
    });

    it('should maintain aria-label even when showLabel is false', () => {
      render(<SeverityBadge severity="critical" showLabel={false} />);

      const badge = screen.getByRole('status', { name: /severity: critical/i });
      expect(badge).toHaveAttribute('aria-label', 'Severity: Critical');
    });
  });

  describe('Custom Styling', () => {
    it('should accept and apply custom className', () => {
      render(<SeverityBadge severity="high" className="custom-class" />);

      const badge = screen.getByRole('status');
      expect(badge.className).toContain('custom-class');
    });

    it('should merge custom classes with default classes', () => {
      render(<SeverityBadge severity="medium" className="ml-2" />);

      const badge = screen.getByRole('status');
      expect(badge.className).toContain('ml-2');
      expect(badge.className).toContain('inline-flex');
    });
  });

  describe('Data Attributes for Testing', () => {
    it('should expose data-severity attribute for easy querying', () => {
      const { container } = render(<SeverityBadge severity="critical" />);

      const badge = container.querySelector('[data-severity="critical"]');
      expect(badge).toBeInTheDocument();
    });
  });
});

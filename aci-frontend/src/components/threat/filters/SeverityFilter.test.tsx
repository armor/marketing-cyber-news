/**
 * Tests for SeverityFilter Component
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeverityFilter } from './SeverityFilter';
import type { Severity } from '@/types/threat';

describe('SeverityFilter', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render all severity levels in correct order', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
      expect(buttons[0]).toHaveTextContent('Critical');
      expect(buttons[1]).toHaveTextContent('High');
      expect(buttons[2]).toHaveTextContent('Medium');
      expect(buttons[3]).toHaveTextContent('Low');
    });

    it('should have accessible group label', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const group = screen.getByRole('group', { name: /filter by severity level/i });
      expect(group).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SeverityFilter value={[]} onChange={mockOnChange} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Selection State', () => {
    it('should mark selected severities with aria-pressed=true', () => {
      render(<SeverityFilter value={['critical', 'high']} onChange={mockOnChange} />);

      const criticalButton = screen.getByRole('button', { name: /critical/i });
      const highButton = screen.getByRole('button', { name: /high/i });
      const mediumButton = screen.getByRole('button', { name: /medium/i });

      expect(criticalButton).toHaveAttribute('aria-pressed', 'true');
      expect(highButton).toHaveAttribute('aria-pressed', 'true');
      expect(mediumButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should show visual difference for selected items', () => {
      render(<SeverityFilter value={['critical']} onChange={mockOnChange} />);

      const criticalButton = screen.getByRole('button', { name: /critical/i });
      const lowButton = screen.getByRole('button', { name: /low/i });

      expect(criticalButton).toHaveAttribute('data-selected', 'true');
      expect(lowButton).toHaveAttribute('data-selected', 'false');
    });

    it('should handle empty selection', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed', 'false');
      });
    });

    it('should handle all severities selected', () => {
      const allSeverities: Severity[] = ['critical', 'high', 'medium', 'low'];
      render(<SeverityFilter value={allSeverities} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });

  describe('Interaction', () => {
    it('should add severity when clicked', async () => {
      const user = userEvent.setup();
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const criticalButton = screen.getByRole('button', { name: /add critical/i });
      await user.click(criticalButton);

      expect(mockOnChange).toHaveBeenCalledWith(['critical']);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should remove severity when clicked again', async () => {
      const user = userEvent.setup();
      render(<SeverityFilter value={['critical', 'high']} onChange={mockOnChange} />);

      const criticalButton = screen.getByRole('button', { name: /remove critical/i });
      await user.click(criticalButton);

      expect(mockOnChange).toHaveBeenCalledWith(['high']);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple selections', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      // Select critical
      await user.click(screen.getByRole('button', { name: /add critical/i }));
      expect(mockOnChange).toHaveBeenLastCalledWith(['critical']);

      // Rerender with new value
      rerender(<SeverityFilter value={['critical']} onChange={mockOnChange} />);

      // Select high
      await user.click(screen.getByRole('button', { name: /add high/i }));
      expect(mockOnChange).toHaveBeenLastCalledWith(['critical', 'high']);

      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });

    it('should preserve other selections when removing one', async () => {
      const user = userEvent.setup();
      render(<SeverityFilter value={['critical', 'high', 'medium']} onChange={mockOnChange} />);

      await user.click(screen.getByRole('button', { name: /remove high/i }));

      expect(mockOnChange).toHaveBeenCalledWith(['critical', 'medium']);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should toggle severity with Space key', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const criticalButton = screen.getByRole('button', { name: /add critical/i });
      criticalButton.focus();
      fireEvent.keyDown(criticalButton, { key: ' ', code: 'Space' });

      expect(mockOnChange).toHaveBeenCalledWith(['critical']);
    });

    it('should toggle severity with Enter key', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const highButton = screen.getByRole('button', { name: /add high/i });
      highButton.focus();
      fireEvent.keyDown(highButton, { key: 'Enter', code: 'Enter' });

      expect(mockOnChange).toHaveBeenCalledWith(['high']);
    });

    it('should work with Space key without scrolling the page', () => {
      // Note: preventDefault is called internally to prevent page scroll
      // This test verifies the behavior works (onChange is called)
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const button = screen.getByRole('button', { name: /add critical/i });
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });

      expect(mockOnChange).toHaveBeenCalledWith(['critical']);
    });

    it('should not trigger on other keys', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const button = screen.getByRole('button', { name: /add critical/i });
      fireEvent.keyDown(button, { key: 'a', code: 'KeyA' });

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable all buttons when disabled=true', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} disabled />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();
      render(<SeverityFilter value={[]} onChange={mockOnChange} disabled />);

      const button = screen.getByRole('button', { name: /critical/i });
      await user.click(button);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should have reduced opacity when disabled', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} disabled />);

      const button = screen.getByRole('button', { name: /critical/i });
      expect(button).toHaveClass('opacity-50');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for add action', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/add critical severity filter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add high severity filter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add medium severity filter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add low severity filter/i)).toBeInTheDocument();
    });

    it('should have proper ARIA labels for remove action', () => {
      render(<SeverityFilter value={['critical', 'high']} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/remove critical severity filter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/remove high severity filter/i)).toBeInTheDocument();
    });

    it('should be keyboard focusable', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        // Buttons are natively focusable, so they don't need explicit tabindex
        // Verify they can receive focus instead
        expect(button).toBeEnabled();
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should have focus ring styles', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const button = screen.getByRole('button', { name: /critical/i });
      expect(button).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Design Tokens', () => {
    it('should use design token CSS variables for spacing', () => {
      const { container } = render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('gap-[var(--spacing-gap-sm)]');
    });

    it('should apply severity colors via inline styles when selected', () => {
      render(<SeverityFilter value={['critical']} onChange={mockOnChange} />);

      const criticalButton = screen.getByRole('button', { name: /remove critical/i });
      const style = criticalButton.style;

      expect(style.backgroundColor).toBe('var(--color-severity-critical)');
      expect(style.borderColor).toBe('var(--color-severity-critical)');
    });

    it('should not have inline styles when not selected', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const button = screen.getByRole('button', { name: /add critical/i });
      expect(button.style.backgroundColor).toBe('');
    });

    it('should have data-severity attribute for CSS targeting', () => {
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      expect(screen.getByRole('button', { name: /critical/i })).toHaveAttribute('data-severity', 'critical');
      expect(screen.getByRole('button', { name: /high/i })).toHaveAttribute('data-severity', 'high');
      expect(screen.getByRole('button', { name: /medium/i })).toHaveAttribute('data-severity', 'medium');
      expect(screen.getByRole('button', { name: /low/i })).toHaveAttribute('data-severity', 'low');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicking', async () => {
      const user = userEvent.setup();
      render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      const button = screen.getByRole('button', { name: /add critical/i });

      // Click multiple times rapidly
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should toggle 3 times
      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it('should handle readonly array type', () => {
      const readonlyValue: readonly Severity[] = ['critical', 'high'];

      expect(() => {
        render(<SeverityFilter value={readonlyValue} onChange={mockOnChange} />);
      }).not.toThrow();
    });

    it('should maintain selection order when toggling', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<SeverityFilter value={['low']} onChange={mockOnChange} />);

      await user.click(screen.getByRole('button', { name: /add critical/i }));
      expect(mockOnChange).toHaveBeenLastCalledWith(['low', 'critical']);

      rerender(<SeverityFilter value={['low', 'critical']} onChange={mockOnChange} />);

      await user.click(screen.getByRole('button', { name: /add high/i }));
      expect(mockOnChange).toHaveBeenLastCalledWith(['low', 'critical', 'high']);
    });
  });

  describe('Component Lifecycle', () => {
    it('should handle value prop changes', () => {
      const { rerender } = render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      let button = screen.getByRole('button', { name: /add critical/i });
      expect(button).toHaveAttribute('aria-pressed', 'false');

      rerender(<SeverityFilter value={['critical']} onChange={mockOnChange} />);

      button = screen.getByRole('button', { name: /remove critical/i });
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should handle onChange prop changes', async () => {
      const user = userEvent.setup();
      const newOnChange = vi.fn();

      const { rerender } = render(<SeverityFilter value={[]} onChange={mockOnChange} />);

      rerender(<SeverityFilter value={[]} onChange={newOnChange} />);

      await user.click(screen.getByRole('button', { name: /add critical/i }));

      expect(mockOnChange).not.toHaveBeenCalled();
      expect(newOnChange).toHaveBeenCalledWith(['critical']);
    });
  });
});

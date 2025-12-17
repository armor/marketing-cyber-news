/**
 * CategoryFilter Component Tests
 * Tests for multi-select threat category filtering
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryFilter } from './CategoryFilter';
import { ThreatCategory } from '@/types/threat';

describe('CategoryFilter', () => {
  describe('Rendering', () => {
    it('should render trigger button with default label', () => {
      render(
        <CategoryFilter
          value={[]}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText('Categories')).toBeInTheDocument();
    });

    it('should show selected count in button label', () => {
      render(
        <CategoryFilter
          value={[ThreatCategory.MALWARE, ThreatCategory.PHISHING]}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText('Categories (2)')).toBeInTheDocument();
    });

    it('should render disabled state', () => {
      render(
        <CategoryFilter
          value={[]}
          onChange={vi.fn()}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Dropdown Interaction', () => {
    it('should open dropdown on button click', () => {
      render(
        <CategoryFilter
          value={[]}
          onChange={vi.fn()}
        />
      );

      const button = screen.getByRole('button', { name: /filter by threat category/i });
      fireEvent.click(button);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should display all category options', () => {
      render(
        <CategoryFilter
          value={[]}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Malware')).toBeInTheDocument();
      expect(screen.getByText('Phishing')).toBeInTheDocument();
      expect(screen.getByText('Data Breach')).toBeInTheDocument();
      expect(screen.getByText('Zero Day')).toBeInTheDocument();
    });

    it('should close dropdown on escape key', () => {
      render(
        <CategoryFilter
          value={[]}
          onChange={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const dropdown = screen.getByRole('listbox');
      fireEvent.keyDown(dropdown.parentElement!, { key: 'Escape' });

      // Dropdown should no longer be in document
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Selection Behavior', () => {
    it('should call onChange when category is selected', () => {
      const handleChange = vi.fn();
      render(
        <CategoryFilter
          value={[]}
          onChange={handleChange}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Malware'));

      expect(handleChange).toHaveBeenCalledWith([ThreatCategory.MALWARE]);
    });

    it('should call onChange when category is deselected', () => {
      const handleChange = vi.fn();
      render(
        <CategoryFilter
          value={[ThreatCategory.MALWARE, ThreatCategory.PHISHING]}
          onChange={handleChange}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Malware'));

      expect(handleChange).toHaveBeenCalledWith([ThreatCategory.PHISHING]);
    });

    it('should support multiple selections', () => {
      const handleChange = vi.fn();
      render(
        <CategoryFilter
          value={[ThreatCategory.MALWARE]}
          onChange={handleChange}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Phishing'));

      expect(handleChange).toHaveBeenCalledWith([
        ThreatCategory.MALWARE,
        ThreatCategory.PHISHING,
      ]);
    });
  });

  describe('Clear Functionality', () => {
    it('should show clear button when categories are selected', () => {
      render(
        <CategoryFilter
          value={[ThreatCategory.MALWARE]}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Clear category filter')).toBeInTheDocument();
    });

    it('should not show clear button when no categories selected', () => {
      render(
        <CategoryFilter
          value={[]}
          onChange={vi.fn()}
        />
      );

      expect(screen.queryByLabelText('Clear category filter')).not.toBeInTheDocument();
    });

    it('should call onChange with empty array when clear button clicked', () => {
      const handleChange = vi.fn();
      render(
        <CategoryFilter
          value={[ThreatCategory.MALWARE, ThreatCategory.PHISHING]}
          onChange={handleChange}
        />
      );

      fireEvent.click(screen.getByLabelText('Clear category filter'));

      expect(handleChange).toHaveBeenCalledWith([]);
    });

    it('should show "Clear All" in dropdown footer', () => {
      render(
        <CategoryFilter
          value={[ThreatCategory.MALWARE]}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <CategoryFilter
          value={[]}
          onChange={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    });

    it('should mark selected options with aria-selected', () => {
      render(
        <CategoryFilter
          value={[ThreatCategory.MALWARE]}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      const malwareOption = screen.getByText('Malware').closest('button');
      expect(malwareOption).toHaveAttribute('aria-selected', 'true');

      const phishingOption = screen.getByText('Phishing').closest('button');
      expect(phishingOption).toHaveAttribute('aria-selected', 'false');
    });

    it('should have accessible labels', () => {
      render(
        <CategoryFilter
          value={[]}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Filter by threat category')).toBeInTheDocument();
    });
  });

  describe('Display Names', () => {
    it('should show human-readable category names', () => {
      render(
        <CategoryFilter
          value={[]}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      // Verify human-readable names, not enum values
      expect(screen.getByText('Data Breach')).toBeInTheDocument();
      expect(screen.queryByText('data_breach')).not.toBeInTheDocument();

      expect(screen.getByText('Insider Threat')).toBeInTheDocument();
      expect(screen.queryByText('insider_threat')).not.toBeInTheDocument();

      expect(screen.getByText('DDoS')).toBeInTheDocument();
      expect(screen.queryByText('ddos')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty value array', () => {
      render(
        <CategoryFilter
          value={[]}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText('Categories')).toBeInTheDocument();
    });

    it('should handle all categories selected', () => {
      const allCategories = Object.values(ThreatCategory);
      render(
        <CategoryFilter
          value={allCategories}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText(`Categories (${allCategories.length})`)).toBeInTheDocument();
    });

    it('should not call onChange when disabled', () => {
      const handleChange = vi.fn();
      render(
        <CategoryFilter
          value={[]}
          onChange={handleChange}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should not open dropdown or call onChange
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(handleChange).not.toHaveBeenCalled();
    });
  });
});

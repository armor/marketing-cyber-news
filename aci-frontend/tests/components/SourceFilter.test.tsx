import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourceFilter } from '@/components/threat/filters/SourceFilter';

describe('SourceFilter', () => {
  const mockSources = ['cisa', 'cert-in', 'mitre', 'nist'];
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render with no selections', () => {
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      expect(screen.getByRole('button', { name: /filter by source/i })).toBeInTheDocument();
      expect(screen.getByText('Sources')).toBeInTheDocument();
    });

    it('should show count when sources are selected', () => {
      render(
        <SourceFilter
          value={['cisa', 'mitre']}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      expect(screen.getByText('Sources (2)')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={mockSources}
          disabled
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Dropdown Interaction', () => {
    it('should open dropdown when button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('CISA')).toBeInTheDocument();
      expect(screen.getByText('CERT IN')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <SourceFilter
            value={[]}
            onChange={mockOnChange}
            availableSources={mockSources}
          />
        </div>
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      fireEvent.click(button);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown on Escape key', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Press Escape
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Source Selection', () => {
    it('should toggle source selection on click', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      // Select a source
      const cisaOption = screen.getByText('CISA');
      await user.click(cisaOption);

      expect(mockOnChange).toHaveBeenCalledWith(['cisa']);
    });

    it('should deselect source when clicking selected item', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={['cisa']}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      // Deselect the source
      const cisaOption = screen.getByText('CISA');
      await user.click(cisaOption);

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('should handle keyboard navigation (Space key)', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      // Focus and select with Space
      const cisaOption = screen.getByText('CISA').closest('[role="option"]');
      cisaOption?.focus();
      await user.keyboard(' ');

      expect(mockOnChange).toHaveBeenCalledWith(['cisa']);
    });

    it('should handle keyboard navigation (Enter key)', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      // Focus and select with Enter
      const cisaOption = screen.getByText('CISA').closest('[role="option"]');
      cisaOption?.focus();
      await user.keyboard('{Enter}');

      expect(mockOnChange).toHaveBeenCalledWith(['cisa']);
    });
  });

  describe('Select All / Clear Actions', () => {
    it('should select all sources when "All" button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      // Click "All" button
      const allButton = screen.getByRole('button', { name: /^all$/i });
      await user.click(allButton);

      expect(mockOnChange).toHaveBeenCalledWith(mockSources);
    });

    it('should clear all selections when "Clear" button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={['cisa', 'mitre']}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      // Click "Clear" button
      const clearButton = screen.getByRole('button', { name: /^clear$/i });
      await user.click(clearButton);

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('should disable "All" button when all sources are selected', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={mockSources}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      const allButton = screen.getByRole('button', { name: /^all$/i });
      expect(allButton).toBeDisabled();
    });

    it('should disable "Clear" button when no sources are selected', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      const clearButton = screen.getByRole('button', { name: /^clear$/i });
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Selected Source Badges', () => {
    it('should show selected sources as badges in footer', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={['cisa', 'mitre']}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      // Check badges are displayed
      const badges = screen.getAllByRole('button', { name: /remove/i });
      expect(badges).toHaveLength(2);
    });

    it('should remove source when clicking badge X button', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={['cisa', 'mitre']}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      // Click remove button on CISA badge
      const removeButton = screen.getByRole('button', { name: /remove cisa/i });
      await user.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith(['mitre']);
    });

    it('should not show footer when no sources are selected', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      // No badges should be present
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no sources are available', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={[]}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      expect(screen.getByText('No sources available')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <SourceFilter
          value={['cisa']}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      const button = screen.getByRole('button', { name: /filter by source/i });
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when dropdown opens', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={[]}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-selected on options', async () => {
      const user = userEvent.setup();
      render(
        <SourceFilter
          value={['cisa']}
          onChange={mockOnChange}
          availableSources={mockSources}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /filter by source/i });
      await user.click(button);

      const cisaOption = screen.getByRole('option', { name: /cisa/i });
      expect(cisaOption).toHaveAttribute('aria-selected', 'true');
    });
  });
});

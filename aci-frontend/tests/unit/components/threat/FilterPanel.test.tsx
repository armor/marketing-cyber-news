/**
 * Unit Tests for FilterPanel Component
 *
 * Test-Driven Development: These tests are written BEFORE component implementation.
 * The FilterPanel component provides filtering controls for threats including:
 * - Severity filter (critical, high, medium, low)
 * - Category filter (malware, phishing, ransomware, etc.)
 * - Source filter (threat feed sources)
 * - Date range filter
 * - Search input
 *
 * Tests will FAIL until FilterPanel component is implemented.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FilterPanel, type FilterPanelProps } from '@/components/threat/FilterPanel';
import { type ThreatFilters, ThreatCategory } from '@/types/threat';

/**
 * Mock child filter components
 * These will be integrated in the real FilterPanel but are mocked for unit testing
 */
interface MockFilterProps {
  value?: string[] | string;
  onChange?: (value: string[] | string) => void;
  availableSources?: string[];
}

vi.mock('@/components/threat/SeverityFilter', () => ({
  SeverityFilter: ({ value, onChange }: MockFilterProps) => (
    <div data-testid="severity-filter">
      <label htmlFor="severity-select">Severity</label>
      <select
        id="severity-select"
        data-testid="severity-select"
        multiple
        value={value || []}
        onChange={(e) => {
          const selected = Array.from(e.currentTarget.selectedOptions, (opt) => opt.value);
          onChange(selected);
        }}
      >
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
  ),
}));

vi.mock('@/components/threat/CategoryFilter', () => ({
  CategoryFilter: ({ value, onChange }: MockFilterProps) => (
    <div data-testid="category-filter">
      <label htmlFor="category-select">Category</label>
      <select
        id="category-select"
        data-testid="category-select"
        multiple
        value={value || []}
        onChange={(e) => {
          const selected = Array.from(e.currentTarget.selectedOptions, (opt) => opt.value);
          onChange(selected);
        }}
      >
        <option value="malware">Malware</option>
        <option value="phishing">Phishing</option>
        <option value="ransomware">Ransomware</option>
        <option value="data_breach">Data Breach</option>
        <option value="vulnerability">Vulnerability</option>
        <option value="apt">APT</option>
        <option value="ddos">DDoS</option>
        <option value="insider_threat">Insider Threat</option>
        <option value="supply_chain">Supply Chain</option>
        <option value="zero_day">Zero Day</option>
      </select>
    </div>
  ),
}));

vi.mock('@/components/threat/SourceFilter', () => ({
  SourceFilter: ({ value, onChange, availableSources }: MockFilterProps) => (
    <div data-testid="source-filter">
      <label htmlFor="source-select">Source</label>
      <select
        id="source-select"
        data-testid="source-select"
        multiple
        value={value || []}
        onChange={(e) => {
          const selected = Array.from(e.currentTarget.selectedOptions, (opt) => opt.value);
          onChange(selected);
        }}
      >
        {(availableSources || []).map((source: string) => (
          <option key={source} value={source}>
            {source}
          </option>
        ))}
      </select>
    </div>
  ),
}));

vi.mock('@/components/threat/DateRangeFilter', () => ({
  DateRangeFilter: ({ value, onChange }: MockFilterProps) => (
    <div data-testid="date-range-filter">
      <label htmlFor="start-date">Date Range</label>
      <input
        id="start-date"
        type="date"
        data-testid="start-date-input"
        value={value?.start || ''}
        onChange={(e) => {
          const newRange = { ...value, start: e.target.value };
          onChange(newRange);
        }}
      />
      <input
        id="end-date"
        type="date"
        data-testid="end-date-input"
        value={value?.end || ''}
        onChange={(e) => {
          const newRange = { ...value, end: e.target.value };
          onChange(newRange);
        }}
      />
    </div>
  ),
}));

vi.mock('@/components/threat/SearchInput', () => ({
  SearchInput: ({ value, onChange }: MockFilterProps) => (
    <div data-testid="search-input-wrapper">
      <label htmlFor="threat-search">Search</label>
      <input
        id="threat-search"
        type="text"
        data-testid="search-input"
        placeholder="Search threats..."
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

describe('FilterPanel Component', () => {
  const defaultFilters: ThreatFilters = {
    severity: undefined,
    category: undefined,
    source: undefined,
    dateRange: undefined,
    search: undefined,
  };

  const defaultProps: FilterPanelProps = {
    filters: defaultFilters,
    onFiltersChange: vi.fn(),
    availableSources: ['NVD', 'CISA', 'Shodan', 'Censys'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path - Renders all filter controls', () => {
    it('should render all filter components', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByTestId('severity-filter')).toBeInTheDocument();
      expect(screen.getByTestId('category-filter')).toBeInTheDocument();
      expect(screen.getByTestId('source-filter')).toBeInTheDocument();
      expect(screen.getByTestId('date-range-filter')).toBeInTheDocument();
      expect(screen.getByTestId('search-input-wrapper')).toBeInTheDocument();
    });

    it('should render filter labels', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByLabelText('Severity')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Source')).toBeInTheDocument();
      expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
    });

    it('should call onFiltersChange when severity filter changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const props: FilterPanelProps = {
        ...defaultProps,
        onFiltersChange,
      };

      render(<FilterPanel {...props} />);

      const severitySelect = screen.getByTestId('severity-select') as HTMLSelectElement;
      await user.selectOptions(severitySelect, 'critical');

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalled();
      });

      const callArgs = onFiltersChange.mock.calls[0][0];
      expect(callArgs.severity).toContain('critical');
    });

    it('should call onFiltersChange when category filter changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const props: FilterPanelProps = {
        ...defaultProps,
        onFiltersChange,
      };

      render(<FilterPanel {...props} />);

      const categorySelect = screen.getByTestId('category-select') as HTMLSelectElement;
      await user.selectOptions(categorySelect, ThreatCategory.MALWARE);

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalled();
      });

      const callArgs = onFiltersChange.mock.calls[0][0];
      expect(callArgs.category).toContain(ThreatCategory.MALWARE);
    });

    it('should call onFiltersChange when source filter changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const props: FilterPanelProps = {
        ...defaultProps,
        onFiltersChange,
      };

      render(<FilterPanel {...props} />);

      const sourceSelect = screen.getByTestId('source-select') as HTMLSelectElement;
      await user.selectOptions(sourceSelect, 'NVD');

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalled();
      });

      const callArgs = onFiltersChange.mock.calls[0][0];
      expect(callArgs.source).toContain('NVD');
    });

    it('should call onFiltersChange when search input changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const props: FilterPanelProps = {
        ...defaultProps,
        onFiltersChange,
      };

      render(<FilterPanel {...props} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      await user.type(searchInput, 'ransomware');

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalled();
      });

      const callArgs = onFiltersChange.mock.calls[onFiltersChange.mock.calls.length - 1][0];
      expect(callArgs.search).toBe('ransomware');
    });

    it('should call onFiltersChange when date range changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const props: FilterPanelProps = {
        ...defaultProps,
        onFiltersChange,
      };

      render(<FilterPanel {...props} />);

      const startDateInput = screen.getByTestId('start-date-input') as HTMLInputElement;
      await user.type(startDateInput, '2024-01-01');

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalled();
      });

      const callArgs = onFiltersChange.mock.calls[onFiltersChange.mock.calls.length - 1][0];
      expect(callArgs.dateRange?.start).toBe('2024-01-01');
    });
  });

  describe('Failure Path - Clear filters button', () => {
    it('should render clear filters button', () => {
      render(<FilterPanel {...defaultProps} />);

      const clearButton = screen.getByRole('button', { name: /clear|reset|reset filters/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should reset all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const filtersWithData: ThreatFilters = {
        severity: ['critical', 'high'],
        category: [ThreatCategory.MALWARE, ThreatCategory.RANSOMWARE],
        source: ['NVD'],
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        search: 'test query',
      };

      const props: FilterPanelProps = {
        filters: filtersWithData,
        onFiltersChange,
        availableSources: ['NVD', 'CISA', 'Shodan', 'Censys'],
      };

      render(<FilterPanel {...props} />);

      const clearButton = screen.getByRole('button', { name: /clear|reset|reset filters/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          severity: undefined,
          category: undefined,
          source: undefined,
          dateRange: undefined,
          search: undefined,
        });
      });
    });

    it('should clear only affected filter when individual filter is cleared', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const filtersWithData: ThreatFilters = {
        severity: ['critical'],
        category: [ThreatCategory.MALWARE],
        search: 'ransomware',
      };

      const props: FilterPanelProps = {
        filters: filtersWithData,
        onFiltersChange,
        availableSources: ['NVD', 'CISA'],
      };

      render(<FilterPanel {...props} />);

      const severitySelect = screen.getByTestId('severity-select') as HTMLSelectElement;
      await user.deselectOptions(severitySelect, 'critical');

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalled();
      });

      const callArgs = onFiltersChange.mock.calls[onFiltersChange.mock.calls.length - 1][0];
      expect(callArgs.severity).toBeUndefined();
      expect(callArgs.category).toContain(ThreatCategory.MALWARE);
      expect(callArgs.search).toBe('ransomware');
    });
  });

  describe('Empty/Null State - No initial filters applied', () => {
    it('should render with empty filter state', () => {
      render(<FilterPanel {...defaultProps} />);

      const severitySelect = screen.getByTestId('severity-select') as HTMLSelectElement;
      const categorySelect = screen.getByTestId('category-select') as HTMLSelectElement;
      const sourceSelect = screen.getByTestId('source-select') as HTMLSelectElement;
      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      expect(severitySelect.value).toBe('');
      expect(categorySelect.value).toBe('');
      expect(sourceSelect.value).toBe('');
      expect(searchInput.value).toBe('');
    });

    it('should handle undefined availableSources gracefully', () => {
      const props: FilterPanelProps = {
        filters: defaultFilters,
        onFiltersChange: vi.fn(),
        // availableSources is optional
      };

      render(<FilterPanel {...props} />);

      expect(screen.getByTestId('source-filter')).toBeInTheDocument();
    });

    it('should handle undefined filter properties gracefully', () => {
      const propsWithPartialFilters: FilterPanelProps = {
        filters: {
          severity: ['critical'],
          // category, source, dateRange, search are all undefined
        },
        onFiltersChange: vi.fn(),
        availableSources: ['NVD'],
      };

      render(<FilterPanel {...propsWithPartialFilters} />);

      const categorySelect = screen.getByTestId('category-select') as HTMLSelectElement;
      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      expect(categorySelect.value).toBe('');
      expect(searchInput.value).toBe('');
    });

    it('should display empty message or placeholder when no filters are active', () => {
      render(<FilterPanel {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(searchInput).toHaveAttribute('placeholder', expect.stringContaining('Search'));
    });
  });

  describe('Edge Case - Multiple filters combined', () => {
    it('should apply multiple filters simultaneously', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const props: FilterPanelProps = {
        ...defaultProps,
        onFiltersChange,
      };

      render(<FilterPanel {...props} />);

      const severitySelect = screen.getByTestId('severity-select') as HTMLSelectElement;
      const categorySelect = screen.getByTestId('category-select') as HTMLSelectElement;
      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      // Apply severity filter
      await user.selectOptions(severitySelect, ['critical', 'high']);

      // Apply category filter
      await user.selectOptions(categorySelect, [ThreatCategory.MALWARE, ThreatCategory.RANSOMWARE]);

      // Apply search filter
      await user.type(searchInput, 'windows');

      await waitFor(() => {
        const lastCall = onFiltersChange.mock.calls[onFiltersChange.mock.calls.length - 1][0];
        expect(lastCall.severity).toContain('critical');
        expect(lastCall.category).toContain(ThreatCategory.MALWARE);
        expect(lastCall.search).toContain('windows');
      });
    });

    it('should maintain all filters when one is updated', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const filtersWithData: ThreatFilters = {
        severity: ['critical'],
        category: [ThreatCategory.MALWARE],
        source: ['NVD'],
        search: 'ransomware',
      };

      const props: FilterPanelProps = {
        filters: filtersWithData,
        onFiltersChange,
        availableSources: ['NVD', 'CISA'],
      };

      render(<FilterPanel {...props} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      await user.clear(searchInput);
      await user.type(searchInput, 'malware attack');

      await waitFor(() => {
        const lastCall = onFiltersChange.mock.calls[onFiltersChange.mock.calls.length - 1][0];
        expect(lastCall.severity).toContain('critical');
        expect(lastCall.category).toContain(ThreatCategory.MALWARE);
        expect(lastCall.source).toContain('NVD');
        expect(lastCall.search).toBe('malware attack');
      });
    });

    it('should handle multiple severity and category selections', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const props: FilterPanelProps = {
        ...defaultProps,
        onFiltersChange,
      };

      render(<FilterPanel {...props} />);

      const severitySelect = screen.getByTestId('severity-select') as HTMLSelectElement;
      const categorySelect = screen.getByTestId('category-select') as HTMLSelectElement;

      // Select multiple severities
      await user.selectOptions(severitySelect, ['critical', 'high', 'medium']);

      // Select multiple categories
      await user.selectOptions(categorySelect, [
        ThreatCategory.MALWARE,
        ThreatCategory.RANSOMWARE,
        ThreatCategory.PHISHING,
      ]);

      await waitFor(() => {
        const lastCall = onFiltersChange.mock.calls[onFiltersChange.mock.calls.length - 1][0];
        expect(lastCall.severity).toHaveLength(3);
        expect(lastCall.severity).toContain('critical');
        expect(lastCall.severity).toContain('high');
        expect(lastCall.severity).toContain('medium');
        expect(lastCall.category).toHaveLength(3);
        expect(lastCall.category).toContain(ThreatCategory.MALWARE);
        expect(lastCall.category).toContain(ThreatCategory.RANSOMWARE);
        expect(lastCall.category).toContain(ThreatCategory.PHISHING);
      });
    });

    it('should handle date range with severity and search', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const props: FilterPanelProps = {
        ...defaultProps,
        onFiltersChange,
      };

      render(<FilterPanel {...props} />);

      const severitySelect = screen.getByTestId('severity-select') as HTMLSelectElement;
      const startDateInput = screen.getByTestId('start-date-input') as HTMLInputElement;
      const endDateInput = screen.getByTestId('end-date-input') as HTMLInputElement;
      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      // Apply severity
      await user.selectOptions(severitySelect, 'critical');

      // Apply date range
      await user.type(startDateInput, '2024-01-01');
      await user.type(endDateInput, '2024-12-31');

      // Apply search
      await user.type(searchInput, 'vulnerability');

      await waitFor(() => {
        const lastCall = onFiltersChange.mock.calls[onFiltersChange.mock.calls.length - 1][0];
        expect(lastCall.severity).toContain('critical');
        expect(lastCall.dateRange?.start).toBe('2024-01-01');
        expect(lastCall.dateRange?.end).toBe('2024-12-31');
        expect(lastCall.search).toBe('vulnerability');
      });
    });
  });

  describe('Integration - Props updates', () => {
    it('should update filters when props change', () => {
      const onFiltersChange = vi.fn();
      const initialFilters: ThreatFilters = {
        severity: ['critical'],
      };

      const { rerender } = render(
        <FilterPanel
          filters={initialFilters}
          onFiltersChange={onFiltersChange}
          availableSources={['NVD']}
        />,
      );

      const updatedFilters: ThreatFilters = {
        severity: ['critical', 'high'],
        category: [ThreatCategory.MALWARE],
      };

      rerender(
        <FilterPanel
          filters={updatedFilters}
          onFiltersChange={onFiltersChange}
          availableSources={['NVD', 'CISA']}
        />,
      );

      const severitySelect = screen.getByTestId('severity-select') as HTMLSelectElement;
      expect(severitySelect.value).toContain('critical');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByLabelText('Severity')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Source')).toBeInTheDocument();
      expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
    });

    it('should have accessible clear button', () => {
      render(<FilterPanel {...defaultProps} />);

      const clearButton = screen.getByRole('button', { name: /clear|reset/i });
      expect(clearButton).toBeInTheDocument();
    });
  });
});
